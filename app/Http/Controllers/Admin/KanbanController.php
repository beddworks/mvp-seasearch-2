<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Jobs\SyncGSheetJob;
use App\Mail\CandidateMovedMail;
use App\Models\Candidate;
use App\Models\CddSubmission;
use App\Models\Mandate;
use App\Models\MandateClaim;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;

class KanbanController extends Controller
{
    public function show(string $id)
    {
        $mandate = Mandate::with('client')->findOrFail($id);

        $claim = MandateClaim::where('mandate_id', $id)
            ->where('status', 'approved')
            ->first();

        $submissions = CddSubmission::with('candidate')
            ->where('mandate_id', $id)
            ->get();

        return Inertia::render('Recruiter/Kanban/Show', [
            'mandate' => [
                'id'           => $mandate->id,
                'title'        => $mandate->title,
                'is_exclusive' => $mandate->is_exclusive ?? false,
                'client'       => $mandate->client ? [
                    'id'           => $mandate->client->id,
                    'company_name' => $mandate->client->company_name,
                ] : null,
            ],
            'claim' => $claim ? [
                'id'          => $claim->id,
                'status'      => $claim->status,
                'assigned_at' => $claim->assigned_at,
            ] : null,
            'submissions' => $submissions->map(fn($s) => $this->formatSubmission($s))->values(),
            'stages'      => ['sourced', 'screened', 'interview', 'offered', 'hired', 'rejected'],
            'stats'       => [
                'total'       => $submissions->count(),
                'top_score'   => $submissions->max('ai_score') ?? 0,
                'days_active' => $claim?->assigned_at ? (int) now()->diffInDays($claim->assigned_at) : 0,
                'submitted'   => $submissions->whereIn('admin_review_status', ['approved', 'bypassed'])->count(),
            ],
            'viewOnly'    => false,
            'layoutRole'  => 'admin',
            'backRoute'   => route('admin.mandates.show', $mandate->id),
        ]);
    }

    public function move(Request $request)
    {
        $request->validate([
            'submission_id' => 'required|string|exists:cdd_submissions,id',
            'new_stage'     => 'required|in:sourced,screened,interview,offered,hired,rejected,on_hold',
        ]);

        $sub = CddSubmission::findOrFail($request->submission_id);
        $sub->update([
            'client_status'            => $request->new_stage,
            'client_status_updated_at' => now(),
        ]);

        $sub->load('candidate', 'mandate', 'recruiter.user');

        // Notify recruiter by email when admin moves their candidate
        $recruiterUser = $sub->recruiter?->user;
        if ($recruiterUser?->email) {
            $candidateName = trim(($sub->candidate->first_name ?? '') . ' ' . ($sub->candidate->last_name ?? ''));
            $mandateTitle  = $sub->mandate?->title ?? 'the mandate';
            $stageLabel    = ucfirst(str_replace('_', ' ', $request->new_stage));
            $kanbanUrl     = route('admin.mandates.kanban', $sub->mandate_id);

            Mail::to($recruiterUser->email)
                ->send(new CandidateMovedMail(
                    title: "Candidate stage updated — {$candidateName}",
                    body:  "Admin moved <strong>{$candidateName}</strong> to <strong>{$stageLabel}</strong> on the pipeline for <em>{$mandateTitle}</em>.",
                    link:  $kanbanUrl,
                ));
        }

        // Async: sync row to Google Sheets
        SyncGSheetJob::dispatch($sub->fresh(['candidate', 'mandate.client', 'recruiter.user']))->onQueue('sheets');

        return response()->json(['success' => true, 'new_stage' => $request->new_stage]);
    }

    public function scheduleInterview(Request $request)
    {
        $request->validate([
            'submission_id'    => 'required|string|exists:cdd_submissions,id',
            'interview_date'   => 'required|date',
            'interview_format' => 'nullable|in:in_person,video,panel',
            'interview_notes'  => 'nullable|string|max:1000',
        ]);

        $sub = CddSubmission::findOrFail($request->submission_id);
        $sub->update([
            'interview_date'           => $request->interview_date,
            'interview_format'         => $request->interview_format,
            'interview_notes'          => $request->interview_notes,
            'client_status'            => 'interview',
            'client_status_updated_at' => now(),
        ]);

        return response()->json(['success' => true, 'submission' => $this->formatSubmission($sub->fresh()->load('candidate'))]);
    }

    public function saveFeedback(Request $request)
    {
        $request->validate([
            'submission_id'             => 'required|string',
            'client_feedback'           => 'required|string|max:2000',
            'client_feedback_sentiment' => 'required|in:positive,neutral,negative',
        ]);

        $sub = CddSubmission::findOrFail($request->submission_id);
        $sub->update([
            'client_feedback'           => $request->client_feedback,
            'client_feedback_sentiment' => $request->client_feedback_sentiment,
        ]);

        return response()->json(['success' => true]);
    }

    public function submitToClient(Request $request)
    {
        $request->validate([
            'submission_id'  => 'required|string|exists:cdd_submissions,id',
            'recruiter_note' => 'nullable|string|max:1000',
        ]);

        $sub = CddSubmission::findOrFail($request->submission_id);

        if (in_array($sub->admin_review_status, ['approved', 'bypassed'])) {
            return response()->json(['error' => 'Already submitted to client.'], 422);
        }

        // Admin directly approves — no review gate needed
        $sub->update([
            'recruiter_note'      => $request->recruiter_note ?? $sub->recruiter_note,
            'admin_review_status' => 'approved',
            'exception_bypass'    => false,
        ]);

        return response()->json([
            'success'  => true,
            'bypassed' => false,
            'message'  => 'Approved and visible to client.',
        ]);
    }

    public function reject(Request $request)
    {
        $request->validate([
            'submission_id'    => 'required|string|exists:cdd_submissions,id',
            'rejection_reason' => 'required|in:client,withdrew,unsuitable,compensation',
            'rejection_note'   => 'nullable|string|max:500',
        ]);

        $sub = CddSubmission::findOrFail($request->submission_id);
        $sub->update([
            'client_status'           => 'rejected',
            'client_rejection_reason' => $request->rejection_reason,
            'client_status_updated_at' => now(),
        ]);

        return response()->json(['success' => true]);
    }

    public function addCandidate(Request $request)
    {
        $request->validate([
            'mandate_id'      => 'required|string|exists:mandates,id',
            'first_name'      => 'required|string|max:100',
            'last_name'       => 'required|string|max:100',
            'email'           => 'nullable|email',
            'linkedin_url'    => 'nullable|url',
            'current_role'    => 'nullable|string|max:200',
            'current_company' => 'nullable|string|max:200',
            'initial_stage'   => 'required|in:sourced,screened',
        ]);

        // Use the approved claim's recruiter, or null if no claim yet
        $claim = MandateClaim::where('mandate_id', $request->mandate_id)
            ->where('status', 'approved')
            ->first();

        abort_unless($claim, 422, 'No approved recruiter assigned to this mandate yet.');

        $candidate = Candidate::create([
            'recruiter_id'    => $claim->recruiter_id,
            'first_name'      => $request->first_name,
            'last_name'       => $request->last_name,
            'email'           => $request->email,
            'linkedin_url'    => $request->linkedin_url,
            'current_role'    => $request->current_role,
            'current_company' => $request->current_company,
        ]);

        $count = CddSubmission::where('mandate_id', $request->mandate_id)
            ->where('recruiter_id', $claim->recruiter_id)
            ->count() + 1;

        $submission = CddSubmission::create([
            'mandate_id'          => $request->mandate_id,
            'recruiter_id'        => $claim->recruiter_id,
            'candidate_id'        => $candidate->id,
            'submission_number'   => $count,
            'client_status'       => $request->initial_stage,
            'admin_review_status' => 'pending',
            'submitted_at'        => now(),
        ]);

        $submission->load('candidate');

        return response()->json([
            'success'    => true,
            'submission' => $this->formatSubmission($submission),
        ]);
    }

    private function formatSubmission(CddSubmission $s): array
    {
        $c = $s->candidate;
        return [
            'id'                        => $s->id,
            'submission_number'         => $s->submission_number,
            'client_status'             => $s->client_status ?? 'sourced',
            'admin_review_status'       => $s->admin_review_status,
            'exception_bypass'          => $s->exception_bypass,
            'recruiter_note'            => $s->recruiter_note,
            'ai_score'                  => $s->ai_score,
            'score_breakdown'           => $s->score_breakdown,
            'green_flags'               => $s->green_flags,
            'red_flags'                 => $s->red_flags,
            'interview_date'            => $s->interview_date,
            'interview_format'          => $s->interview_format,
            'interview_notes'           => $s->interview_notes,
            'client_feedback'           => $s->client_feedback,
            'client_feedback_sentiment' => $s->client_feedback_sentiment,
            'client_rejection_reason'   => $s->client_rejection_reason,
            'submitted_at'              => $s->submitted_at,
            'candidate'                 => $c ? [
                'id'               => $c->id,
                'first_name'       => $c->first_name,
                'last_name'        => $c->last_name,
                'current_role'     => $c->current_role,
                'current_company'  => $c->current_company,
                'cv_url'           => $c->cv_url,
                'cv_original_name' => $c->cv_original_name,
            ] : null,
        ];
    }
}
