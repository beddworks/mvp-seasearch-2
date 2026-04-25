<?php

namespace App\Services;

use App\Mail\ClaimApprovedMail;
use App\Mail\ClaimRejectedMail;
use App\Mail\ClientCandidateReviewMail;
use App\Mail\SubmissionApprovedMail;
use App\Mail\SubmissionRejectedMail;
use App\Mail\MandatePickedMail;
use App\Mail\CandidateAddedMail;
use App\Mail\CandidateMovedMail;
use App\Mail\CandidateSubmittedMail;
use App\Models\Client;
use App\Models\PlatformNotification;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class NotificationService
{
    /**
     * Create an in-app notification + send email.
     */
    public function notify(User $user, string $type, string $title, string $body, ?string $link = null, array $meta = []): PlatformNotification
    {
        $notification = PlatformNotification::create([
            'user_id'    => $user->id,
            'type'       => $type,
            'title'      => $title,
            'body'       => $body,
            'action_url' => $link,
            'is_read'    => false,
            'metadata'   => $meta,
        ]);

        // Send email synchronously
        try {
            $mailable = $this->resolveMailable($type, $title, $body, $link, $meta);
            if ($mailable) {
                Mail::to($user->email, $user->name)->send($mailable);
            }
        } catch (\Throwable $e) {
            Log::warning('NotificationService: email failed', ['error' => $e->getMessage()]);
        }

        return $notification;
    }

    // ── Convenience methods ─────────────────────────────────────────────────

    public function claimApproved(\App\Models\MandateClaim $claim): void
    {
        $user  = $claim->recruiter->user;
        $title = 'Claim approved — ' . $claim->mandate->title;
        $body  = 'Your claim for "' . $claim->mandate->title . '" has been approved. Day 0 starts today.';
        $link  = route('recruiter.kanban.show', $claim->mandate_id);

        $this->notify($user, 'claim_approved', $title, $body, $link, [
            'mandate_id' => $claim->mandate_id,
            'claim_id'   => $claim->id,
        ]);
    }

    public function claimRejected(\App\Models\MandateClaim $claim): void
    {
        $user  = $claim->recruiter->user;
        $title = 'Claim rejected — ' . $claim->mandate->title;
        $body  = 'Your claim for "' . $claim->mandate->title . '" was not approved. You may pick another role.';
        $link  = route('recruiter.mandates.index');

        $this->notify($user, 'claim_rejected', $title, $body, $link, [
            'mandate_id' => $claim->mandate_id,
            'claim_id'   => $claim->id,
        ]);
    }

    public function submissionApproved(\App\Models\CddSubmission $sub): void
    {
        $user  = $sub->recruiter->user;
        $cName = optional($sub->candidate)->first_name . ' ' . optional($sub->candidate)->last_name;
        $title = 'CDD approved — ' . trim($cName);
        $body  = trim($cName) . ' has been approved and is now visible to the client.';
        $link  = route('recruiter.kanban.show', $sub->mandate_id);

        $this->notify($user, 'submission_approved', $title, $body, $link, [
            'submission_id' => $sub->id,
            'mandate_id'    => $sub->mandate_id,
        ]);
    }

    public function submissionRejected(\App\Models\CddSubmission $sub): void
    {
        $user  = $sub->recruiter->user;
        $cName = optional($sub->candidate)->first_name . ' ' . optional($sub->candidate)->last_name;
        $title = 'CDD rejected — ' . trim($cName);
        $body  = trim($cName) . ' was not approved by admin. Please review and re-submit or find a new candidate.';
        $link  = route('recruiter.kanban.show', $sub->mandate_id);

        $this->notify($user, 'submission_rejected', $title, $body, $link, [
            'submission_id' => $sub->id,
            'mandate_id'    => $sub->mandate_id,
        ]);
    }

    public function mandatePicked(\App\Models\MandateClaim $claim): void
    {
        // Notify all admins
        $admins = User::whereIn('role', ['admin', 'super_admin'])->get();
        $title  = 'New claim — ' . $claim->mandate->title;
        $body   = ($claim->recruiter->user->name ?? 'A recruiter') . ' has picked "' . $claim->mandate->title . '" and is awaiting approval.';
        $link   = route('admin.claims.index');

        foreach ($admins as $admin) {
            $this->notify($admin, 'mandate_picked', $title, $body, $link, [
                'mandate_id' => $claim->mandate_id,
                'claim_id'   => $claim->id,
            ]);
        }
    }

    public function candidateAdded(\App\Models\CddSubmission $sub): void
    {
        $admins    = User::whereIn('role', ['admin', 'super_admin'])->get();
        $cName     = trim(optional($sub->candidate)->first_name . ' ' . optional($sub->candidate)->last_name);
        $recruiter = $sub->recruiter->user->name ?? 'A recruiter';
        $title     = 'Candidate added — ' . $cName;
        $body      = $recruiter . ' added ' . $cName . ' to "' . optional($sub->mandate)->title . '".';
        $link      = route('admin.mandates.kanban', ['id' => $sub->mandate_id]);

        foreach ($admins as $admin) {
            $this->notify($admin, 'candidate_added', $title, $body, $link, [
                'submission_id' => $sub->id,
                'mandate_id'    => $sub->mandate_id,
            ]);
        }

        // Notify mandate client as soon as a candidate is added.
        $sub->loadMissing('candidate', 'mandate.client.user', 'recruiter.user');
        /** @var Client|null $client */
        $client = optional($sub->mandate)->client;

        if (!$client) {
            return;
        }

        $token = $this->ensureClientReviewToken($sub);
        $reviewLink = route('feedback.show', $token);
        $exportLink = route('feedback.export', $token);
        $clientTitle = 'New candidate added — ' . $cName;
        $clientBody = $recruiter . ' added ' . $cName . ' to role "' . optional($sub->mandate)->title . '".';

        if ($client->user) {
            PlatformNotification::create([
                'user_id'    => $client->user->id,
                'type'       => 'candidate_added_client',
                'title'      => $clientTitle,
                'body'       => $clientBody,
                'action_url' => $reviewLink,
                'is_read'    => false,
                'metadata'   => [
                    'submission_id' => $sub->id,
                    'mandate_id' => $sub->mandate_id,
                    'review_token' => $token,
                ],
            ]);

            $this->sendClientCandidateReviewEmail($sub, $client->user->email, $client->user->name ?: $client->company_name, $reviewLink, $exportLink);
        }

        if (!empty($client->contact_email) && strtolower((string) $client->contact_email) !== strtolower((string) optional($client->user)->email)) {
            $this->sendClientCandidateReviewEmail($sub, $client->contact_email, $client->contact_name ?: $client->company_name, $reviewLink, $exportLink);
        }
    }

    public function candidateMoved(\App\Models\CddSubmission $sub, string $oldStage, string $newStage): void
    {
        $admins = User::whereIn('role', ['admin', 'super_admin'])->get();
        $cName  = trim(optional($sub->candidate)->first_name . ' ' . optional($sub->candidate)->last_name);
        $title  = 'Stage update — ' . $cName;
        $body   = $cName . ' moved from ' . ucfirst($oldStage) . ' → ' . ucfirst($newStage) . ' in "' . optional($sub->mandate)->title . '".';
        $link   = route('admin.mandates.kanban', ['id' => $sub->mandate_id]);

        foreach ($admins as $admin) {
            $this->notify($admin, 'candidate_moved', $title, $body, $link, [
                'submission_id' => $sub->id,
                'mandate_id'    => $sub->mandate_id,
                'old_stage'     => $oldStage,
                'new_stage'     => $newStage,
            ]);
        }
    }

    public function candidateSubmitted(\App\Models\CddSubmission $sub): void
    {
        $admins    = User::whereIn('role', ['admin', 'super_admin'])->get();
        $cName     = trim(optional($sub->candidate)->first_name . ' ' . optional($sub->candidate)->last_name);
        $recruiter = $sub->recruiter->user->name ?? 'A recruiter';
        $title     = 'CDD submitted for review — ' . $cName;
        $body      = $recruiter . ' submitted ' . $cName . ' for admin review on "' . optional($sub->mandate)->title . '".';
        $link      = route('admin.submissions.index');

        foreach ($admins as $admin) {
            $this->notify($admin, 'candidate_submitted', $title, $body, $link, [
                'submission_id' => $sub->id,
                'mandate_id'    => $sub->mandate_id,
            ]);
        }
    }

    // ── Private helpers ─────────────────────────────────────────────────────

    private function resolveMailable(string $type, string $title, string $body, ?string $link, array $meta): ?\Illuminate\Mail\Mailable
    {
        return match ($type) {
            'claim_approved'      => new ClaimApprovedMail($title, $body, $link),
            'claim_rejected'      => new ClaimRejectedMail($title, $body, $link),
            'submission_approved' => new SubmissionApprovedMail($title, $body, $link),
            'submission_rejected' => new SubmissionRejectedMail($title, $body, $link),
            'mandate_picked'      => new MandatePickedMail($title, $body, $link),
            'candidate_added'     => new CandidateAddedMail($title, $body, $link),
            'candidate_added_client' => new CandidateAddedMail($title, $body, $link),
            'candidate_moved'     => new CandidateMovedMail($title, $body, $link),
            'candidate_submitted' => new CandidateSubmittedMail($title, $body, $link),
            default               => null,
        };
    }

    private function ensureClientReviewToken(\App\Models\CddSubmission $sub): string
    {
        if (!empty($sub->token)) {
            return $sub->token;
        }

        $token = Str::random(40);
        $sub->forceFill([
            'token' => $token,
            'token_created_at' => now(),
        ])->save();

        return $token;
    }

    private function sendClientCandidateReviewEmail(\App\Models\CddSubmission $sub, string $email, string $name, string $reviewLink, string $exportLink): void
    {
        try {
            Mail::to($email, $name)->send(new ClientCandidateReviewMail($sub, $reviewLink, $exportLink));
        } catch (\Throwable $e) {
            Log::warning('NotificationService: client candidate review email failed', [
                'submission_id' => $sub->id,
                'email' => $email,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
