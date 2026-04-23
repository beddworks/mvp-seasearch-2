<?php

namespace App\Services;

use App\Models\Mandate;
use App\Models\MandateClaim;
use App\Models\CddSubmission;
use App\Models\PlatformNotification;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class TimerService
{
    // ─── Timer A ────────────────────────────────────────────────────────────
    // Recruiter must submit first CDD within mandate.timer_a_days of assigned_at
    // On fail: reassign to next recruiter. After 3 failures → mandate DROPPED.

    public function checkTimerA(): void
    {
        // Find approved claims where assigned_at is set, timer hasn't fired yet,
        // and recruiter has not submitted any CDD within timer_a_days
        $claims = MandateClaim::with(['mandate', 'recruiter.user'])
            ->where('status', 'approved')
            ->whereNotNull('assigned_at')
            ->get();

        foreach ($claims as $claim) {
            $mandate = $claim->mandate;
            if (!$mandate) continue;

            $deadline = Carbon::parse($claim->assigned_at)->addDays($mandate->timer_a_days ?? 3);
            if (now()->lt($deadline)) continue; // not expired yet

            // Check if any submission exists for this claim's recruiter on this mandate
            $hasSubmission = CddSubmission::where('mandate_id', $mandate->id)
                ->where('recruiter_id', $claim->recruiter_id)
                ->exists();

            if ($hasSubmission) continue; // recruiter did submit — OK

            Log::info("TimerA expired", [
                'claim_id'    => $claim->id,
                'mandate_id'  => $mandate->id,
                'recruiter_id'=> $claim->recruiter_id,
                'assigned_at' => $claim->assigned_at,
                'deadline'    => $deadline,
            ]);

            $this->handleTimerAFail($claim);
        }
    }

    protected function handleTimerAFail(MandateClaim $claim): void
    {
        DB::transaction(function () use ($claim) {
            $mandate = $claim->mandate;

            // Drop the claim
            $claim->update(['status' => 'withdrawn']);

            // Decrement recruiter's active_mandates_count
            if ($claim->recruiter) {
                $claim->recruiter->decrement('active_mandates_count');
            }

            $assignmentCount = $mandate->assignment_count ?? 0;

            if ($assignmentCount >= 3) {
                // 3rd failure → DROPPED
                $mandate->update(['status' => 'dropped']);
                Log::warning("Mandate DROPPED after 3 Timer A failures", ['mandate_id' => $mandate->id]);

                $this->notify(
                    null,
                    'timer_a_role_dropped',
                    "Role \"{$mandate->title}\" dropped after 3 failed assignment attempts.",
                    ['mandate_id' => $mandate->id],
                    'admin'
                );
            } else {
                // Return mandate to active/unassigned for re-pickup
                $mandate->update(['status' => 'active']);

                $this->notify(
                    null,
                    'timer_a_expired',
                    "Timer A expired for \"{$mandate->title}\" — recruiter did not submit on time.",
                    ['mandate_id' => $mandate->id, 'claim_id' => $claim->id],
                    'admin'
                );
            }
        });
    }

    // ─── Timer B ────────────────────────────────────────────────────────────
    // Recruiter must submit 3 CDDs within timer_b_days of assigned_at
    // Late penalty: Day 6 = -10%, Day 7 = -20%, Day 8+ = -30%

    public function checkTimerB(): void
    {
        $mandates = Mandate::where('timer_b_active', true)
            ->where('status', 'active')
            ->get();

        foreach ($mandates as $mandate) {
            $claims = MandateClaim::where('mandate_id', $mandate->id)
                ->where('status', 'approved')
                ->whereNotNull('assigned_at')
                ->get();

            foreach ($claims as $claim) {
                $this->applyTimerBPenalty($claim, $mandate);
            }
        }
    }

    protected function applyTimerBPenalty(MandateClaim $claim, Mandate $mandate): void
    {
        $assignedAt = Carbon::parse($claim->assigned_at);
        $daysElapsed = (int) $assignedAt->diffInDays(now());
        $deadlineDays = $mandate->timer_b_days ?? 5;

        if ($daysElapsed <= $deadlineDays) return; // still within window

        // Count approved submissions for this recruiter on this mandate
        $submissionsCount = CddSubmission::where('mandate_id', $mandate->id)
            ->where('recruiter_id', $claim->recruiter_id)
            ->where('admin_review_status', '!=', 'rejected')
            ->count();

        if ($submissionsCount >= 3) return; // already submitted 3 — no penalty

        // Days late = daysElapsed - deadlineDays
        $daysLate = $daysElapsed - $deadlineDays;

        $penalty = match (true) {
            $daysLate >= 3 => $mandate->timer_b_penalty_d8plus ?? 0.30,
            $daysLate == 2 => $mandate->timer_b_penalty_d7     ?? 0.20,
            $daysLate == 1 => $mandate->timer_b_penalty_d6     ?? 0.10,
            default        => 0,
        };

        if ($penalty <= 0) return;

        // Apply penalty to any pending/unpenalised submissions late
        CddSubmission::where('mandate_id', $mandate->id)
            ->where('recruiter_id', $claim->recruiter_id)
            ->where('penalty_applied', 0)
            ->where('days_late', 0)
            ->update([
                'penalty_applied' => $penalty,
                'days_late'       => $daysLate,
            ]);

        Log::info("TimerB penalty applied", [
            'mandate_id'   => $mandate->id,
            'recruiter_id' => $claim->recruiter_id,
            'days_late'    => $daysLate,
            'penalty'      => $penalty,
        ]);
    }

    // ─── Timer C ────────────────────────────────────────────────────────────
    // Client must respond within timer_c_sla_days of CDD being submitted/approved
    // Breach → admin alerted, manual slot free option

    public function checkTimerC(): void
    {
        $mandates = Mandate::where('timer_c_active', true)->get();

        foreach ($mandates as $mandate) {
            $submissions = CddSubmission::where('mandate_id', $mandate->id)
                ->where('admin_review_status', 'approved')
                ->whereNull('token_used_at')  // client hasn't responded
                ->whereNotNull('admin_reviewed_at')
                ->get();

            foreach ($submissions as $submission) {
                $slaDays    = $mandate->timer_c_sla_days ?? 5;
                $reviewedAt = Carbon::parse($submission->admin_reviewed_at);
                $deadline   = $reviewedAt->copy()->addDays($slaDays);

                if (now()->lt($deadline)) continue;

                $daysOverdue = (int) $deadline->diffInDays(now());

                Log::warning("TimerC SLA breached", [
                    'submission_id' => $submission->id,
                    'mandate_id'    => $mandate->id,
                    'reviewed_at'   => $submission->admin_reviewed_at,
                    'deadline'      => $deadline,
                    'days_overdue'  => $daysOverdue,
                ]);

                $this->notify(
                    null,
                    'timer_c_breached',
                    "Client SLA breached for \"{$mandate->title}\" (submission #{$submission->submission_number}) — {$daysOverdue} day(s) overdue.",
                    [
                        'mandate_id'    => $mandate->id,
                        'submission_id' => $submission->id,
                        'days_overdue'  => $daysOverdue,
                    ],
                    'admin'
                );
            }
        }
    }

    // ─── Slot freeing ───────────────────────────────────────────────────────
    // Check if any approved claim's slot cycle has ended:
    // - 3rd CDD submitted OR
    // - Client gave final feedback (hired/rejected on CDD submission)

    public function checkAndFreeSlots(): void
    {
        $claims = MandateClaim::where('status', 'approved')
            ->whereNotNull('assigned_at')
            ->with(['mandate'])
            ->get();

        foreach ($claims as $claim) {
            $shouldFree = false;

            // Condition 1: 3 non-rejected CDDs submitted by this recruiter for this mandate
            $cddCount = CddSubmission::where('mandate_id', $claim->mandate_id)
                ->where('recruiter_id', $claim->recruiter_id)
                ->where('admin_review_status', '!=', 'rejected')
                ->count();

            if ($cddCount >= 3) {
                $shouldFree = true;
                Log::info("Slot freed: 3 CDDs submitted", ['claim_id' => $claim->id]);
            }

            // Condition 2: Any CDD has final client decision (hired or client rejected with final flag)
            if (!$shouldFree) {
                $finalFeedback = CddSubmission::where('mandate_id', $claim->mandate_id)
                    ->where('recruiter_id', $claim->recruiter_id)
                    ->whereIn('client_status', ['hired', 'rejected'])
                    ->whereNotNull('client_feedback')
                    ->exists();

                if ($finalFeedback) {
                    $shouldFree = true;
                    Log::info("Slot freed: final client feedback received", ['claim_id' => $claim->id]);
                }
            }

            if ($shouldFree) {
                $this->freeSlot($claim);
            }
        }
    }

    public function freeSlot(MandateClaim $claim): void
    {
        DB::transaction(function () use ($claim) {
            // Mark claim as completed (different from withdrawn which is failure)
            $claim->update(['status' => 'withdrawn']);

            if ($claim->recruiter) {
                $dec = max(0, ($claim->recruiter->active_mandates_count ?? 1) - 1);
                $claim->recruiter->update(['active_mandates_count' => $dec]);
            }

            Log::info("Slot freed for recruiter", [
                'recruiter_id' => $claim->recruiter_id,
                'mandate_id'   => $claim->mandate_id,
            ]);
        });
    }

    // ─── Penalty calculator ─────────────────────────────────────────────────
    // Called when computing final payout, not stored until commission settled

    public function calculatePenalty(MandateClaim $claim, Mandate $mandate): float
    {
        if (!$mandate->timer_b_active) return 0.0;

        $assignedAt  = Carbon::parse($claim->assigned_at);
        $daysElapsed = (int) $assignedAt->diffInDays(now());
        $deadlineDays = $mandate->timer_b_days ?? 5;

        if ($daysElapsed <= $deadlineDays) return 0.0;

        $daysLate = $daysElapsed - $deadlineDays;

        return match (true) {
            $daysLate >= 3 => (float) ($mandate->timer_b_penalty_d8plus ?? 0.30),
            $daysLate == 2 => (float) ($mandate->timer_b_penalty_d7     ?? 0.20),
            $daysLate == 1 => (float) ($mandate->timer_b_penalty_d6     ?? 0.10),
            default        => 0.0,
        };
    }

    // ─── Helpers ────────────────────────────────────────────────────────────

    protected function notify(?string $userId, string $type, string $message, array $data = [], string $targetRole = 'admin'): void
    {
        try {
            if ($userId) {
                PlatformNotification::create([
                    'user_id' => $userId,
                    'type'    => $type,
                    'message' => $message,
                    'data'    => $data,
                    'is_read' => false,
                ]);
            } else {
                // Notify all admins/super_admins
                $admins = \App\Models\User::whereIn('role', ['admin', 'super_admin'])
                    ->where('status', 'active')
                    ->get();

                foreach ($admins as $admin) {
                    PlatformNotification::create([
                        'user_id' => $admin->id,
                        'type'    => $type,
                        'message' => $message,
                        'data'    => $data,
                        'is_read' => false,
                    ]);
                }
            }
        } catch (\Exception $e) {
            Log::error("TimerService notify failed: " . $e->getMessage());
        }
    }
}
