<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\CddSubmission;
use App\Models\Mandate;
use App\Models\MandateClaim;
use Illuminate\Http\Request;
use Inertia\Inertia;

class KanbanController extends Controller
{
    public function show(string $id)
    {
        $client = auth()->user()->client;
        abort_unless($client, 403);

        $mandate = Mandate::where('client_id', $client->id)->findOrFail($id);

        $claim = MandateClaim::where('mandate_id', $id)
            ->where('status', 'approved')
            ->first();

        // Clients only see approved / bypassed submissions
        $submissions = CddSubmission::with('candidate')
            ->where('mandate_id', $id)
            ->whereIn('admin_review_status', ['approved', 'bypassed'])
            ->get();

        return Inertia::render('Recruiter/Kanban/Show', [
            'mandate' => [
                'id'           => $mandate->id,
                'title'        => $mandate->title,
                'is_exclusive' => $mandate->is_exclusive ?? false,
                'client'       => [
                    'id'           => $client->id,
                    'company_name' => $client->company_name,
                ],
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
                'submitted'   => $submissions->count(),
            ],
            'viewOnly'    => false,
            'layoutRole'  => 'client',
            'backRoute'   => route('client.mandates.show', $mandate->id),
        ]);
    }

    public function move(Request $request)
    {
        $client = auth()->user()->client;
        abort_unless($client, 403);

        $request->validate([
            'submission_id' => 'required|string|exists:cdd_submissions,id',
            'new_stage'     => 'required|in:sourced,screened,interview,offered,hired,rejected,on_hold',
        ]);

        $sub = CddSubmission::with('mandate')->findOrFail($request->submission_id);

        // Ensure the submission belongs to this client's mandate
        abort_unless($sub->mandate?->client_id === $client->id, 403);
        // Only approved/bypassed submissions are moveable by client
        abort_unless(in_array($sub->admin_review_status, ['approved', 'bypassed']), 403);

        $sub->update([
            'client_status'            => $request->new_stage,
            'client_status_updated_at' => now(),
        ]);

        return response()->json(['success' => true, 'new_stage' => $request->new_stage]);
    }

    public function saveFeedback(Request $request)
    {
        $client = auth()->user()->client;
        abort_unless($client, 403);

        $request->validate([
            'submission_id'             => 'required|string|exists:cdd_submissions,id',
            'client_feedback'           => 'required|string|max:2000',
            'client_feedback_sentiment' => 'required|in:positive,neutral,negative',
        ]);

        $sub = CddSubmission::with('mandate')->findOrFail($request->submission_id);
        abort_unless($sub->mandate?->client_id === $client->id, 403);

        $sub->update([
            'client_feedback'           => $request->client_feedback,
            'client_feedback_sentiment' => $request->client_feedback_sentiment,
        ]);

        return response()->json(['success' => true]);
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
