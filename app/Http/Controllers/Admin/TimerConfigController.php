<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Mandate;
use App\Services\TimerService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class TimerConfigController extends Controller
{
    public function __construct(protected TimerService $timerService) {}

    /**
     * Show the timer configuration dashboard + live status.
     */
    public function index()
    {
        $mandates = Mandate::with(['claims' => function ($q) {
                $q->where('status', 'approved')->whereNotNull('assigned_at')->with('recruiter.user');
            }, 'client'])
            ->whereIn('status', ['active', 'paused', 'dropped'])
            ->orderBy('created_at', 'desc')
            ->get();

        $timerRows = $mandates->map(function ($mandate) {
            $activeClaims = $mandate->claims->map(function ($claim) use ($mandate) {
                $assignedAt     = \Carbon\Carbon::parse($claim->assigned_at);
                $daysElapsed    = (int) $assignedAt->diffInDays(now());
                $timerADeadline = $assignedAt->copy()->addDays($mandate->timer_a_days ?? 3);
                $timerAStatus   = now()->gt($timerADeadline) ? 'overdue' : 'ok';
                $timerADaysLeft = max(0, (int) now()->diffInDays($timerADeadline, false));

                $timerBStatus  = null;
                $timerBPenalty = 0;
                if ($mandate->timer_b_active) {
                    $penalty       = $this->timerService->calculatePenalty($claim, $mandate);
                    $timerBPenalty = $penalty;
                    $timerBStatus  = $penalty > 0 ? 'penalty' : ($daysElapsed > ($mandate->timer_b_days ?? 5) ? 'late' : 'ok');
                }

                return [
                    'claim_id'          => $claim->id,
                    'recruiter_name'    => optional(optional($claim->recruiter)->user)->name ?? '—',
                    'assigned_at'       => $claim->assigned_at,
                    'days_elapsed'      => $daysElapsed,
                    'timer_a_status'    => $timerAStatus,
                    'timer_a_days_left' => $timerADaysLeft,
                    'timer_b_status'    => $timerBStatus,
                    'timer_b_penalty'   => $timerBPenalty,
                ];
            });

            return [
                'id'               => $mandate->id,
                'title'            => $mandate->title,
                'client'           => optional($mandate->client)->company_name,
                'status'           => $mandate->status,
                'timer_a_days'     => $mandate->timer_a_days,
                'timer_b_active'   => $mandate->timer_b_active,
                'timer_b_days'     => $mandate->timer_b_days,
                'timer_c_active'   => $mandate->timer_c_active,
                'timer_c_sla_days' => $mandate->timer_c_sla_days,
                'active_claims'    => $activeClaims,
            ];
        });

        return Inertia::render('Admin/TimerConfig/Index', [
            'timerRows' => $timerRows,
            'stats'     => [
                'timer_b_active' => Mandate::where('timer_b_active', true)->where('status', 'active')->count(),
                'timer_c_active' => Mandate::where('timer_c_active', true)->where('status', 'active')->count(),
                'overdue_a'      => $this->countOverdueTimerA(),
                'sla_breached'   => $this->countTimerCBreaches(),
            ],
        ]);
    }

    /**
     * Update timer config on a specific mandate.
     */
    public function update(Request $request, string $id)
    {
        $mandate = Mandate::findOrFail($id);

        $data = $request->validate([
            'timer_a_days'     => ['sometimes', 'integer', 'min:1', 'max:30'],
            'timer_b_active'   => ['sometimes', 'boolean'],
            'timer_b_days'     => ['sometimes', 'integer', 'min:1', 'max:30'],
            'timer_c_active'   => ['sometimes', 'boolean'],
            'timer_c_sla_days' => ['sometimes', 'integer', 'min:1', 'max:30'],
        ]);

        $mandate->update($data);

        return back()->with('success', "Timer config updated for \"{$mandate->title}\".");
    }

    /**
     * Manually run all timer checks (admin-triggered).
     */
    public function runNow()
    {
        try {
            $this->timerService->checkTimerA();
            $this->timerService->checkTimerB();
            $this->timerService->checkTimerC();
            $this->timerService->checkAndFreeSlots();

            return back()->with('success', 'Timer checks completed successfully.');
        } catch (\Exception $e) {
            return back()->with('error', 'Timer check failed: ' . $e->getMessage());
        }
    }

    // ─── Helpers ────────────────────────────────────────────────────────────

    private function countOverdueTimerA(): int
    {
        $count  = 0;
        $claims = \App\Models\MandateClaim::with('mandate')
            ->where('status', 'approved')
            ->whereNotNull('assigned_at')
            ->get();

        foreach ($claims as $claim) {
            if (!$claim->mandate) continue;
            $deadline = \Carbon\Carbon::parse($claim->assigned_at)->addDays($claim->mandate->timer_a_days ?? 3);
            if (now()->gt($deadline)) {
                $hasSub = \App\Models\CddSubmission::where('mandate_id', $claim->mandate_id)
                    ->where('recruiter_id', $claim->recruiter_id)
                    ->exists();
                if (!$hasSub) $count++;
            }
        }
        return $count;
    }

    private function countTimerCBreaches(): int
    {
        $count    = 0;
        $mandates = Mandate::where('timer_c_active', true)->get();
        foreach ($mandates as $mandate) {
            $subs = \App\Models\CddSubmission::where('mandate_id', $mandate->id)
                ->where('admin_review_status', 'approved')
                ->whereNull('token_used_at')
                ->whereNotNull('admin_reviewed_at')
                ->get();
            foreach ($subs as $sub) {
                $deadline = \Carbon\Carbon::parse($sub->admin_reviewed_at)->addDays($mandate->timer_c_sla_days ?? 5);
                if (now()->gt($deadline)) $count++;
            }
        }
        return $count;
    }
}
