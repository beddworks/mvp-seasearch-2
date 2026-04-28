<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Mail\CandidateMovedMail;
use App\Models\Candidate;
use App\Models\CddSubmission;
use App\Models\Mandate;
use App\Models\MandateClaim;
use App\Models\Recruiter;
use App\Services\ClaudeService;
use App\Services\CvTextExtractor;
use App\Services\GoogleSheetsService;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
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

    public function move(Request $request, GoogleSheetsService $sheets)
    {
        $request->validate([
            'submission_id' => 'required|string|exists:cdd_submissions,id',
            'new_stage'     => 'required|in:sourced,screened,interview,offered,hired,rejected,on_hold',
        ]);

        $sub = CddSubmission::findOrFail($request->submission_id);
        $oldStage = $sub->client_status;

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

            // Keep admin-kanban notifications aligned with recruiter-kanban behavior.
            (new NotificationService())->candidateMoved(
                $sub->fresh(['candidate', 'mandate', 'recruiter.user']),
                $oldStage ?: 'sourced',
                $request->new_stage
            );

        try {
            // $sheets->addOrUpdateRow($sub->fresh(['candidate', 'mandate.client', 'recruiter.user']));
        } catch (\Throwable $e) {
            Log::error('Inline Google Sheets sync failed', [
                'submission_id' => $sub->id,
                'error' => $e->getMessage(),
            ]);
        }

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

        (new NotificationService())->candidateSubmitted($sub->fresh(['candidate', 'mandate', 'recruiter.user']));

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

    public function addCandidate(Request $request, CvTextExtractor $extractor, ClaudeService $claude)
    {
        $request->validate([
            'mandate_id'      => 'required|string|exists:mandates,id',
            'existing_candidate_id' => 'nullable|string|exists:candidates,id',
            'recruiter_id'    => 'nullable|string|exists:recruiters,id',
            'first_name'      => 'required_without:existing_candidate_id|string|max:100',
            'last_name'       => 'required_without:existing_candidate_id|string|max:100',
            'email'           => 'nullable|email',
            'linkedin_url'    => 'nullable|url',
            'current_role'    => 'nullable|string|max:200',
            'current_company' => 'nullable|string|max:200',
            'initial_stage'   => 'required|in:sourced,screened',
            'cv_file'         => 'nullable|file|mimes:pdf,doc,docx|max:10240',
            'ai_data'         => 'nullable|json',
        ]);

        $mandate = Mandate::findOrFail($request->mandate_id);
        $claim = MandateClaim::where('mandate_id', $request->mandate_id)
            ->where('status', 'approved')
            ->first();

        if (!$claim) {
            if (!$request->filled('recruiter_id')) {
                return response()->json([
                    'success' => false,
                    'needs_recruiter_selection' => true,
                    'message' => 'No approved recruiter assigned to this mandate yet.',
                ], 422);
            }

            $recruiter = Recruiter::findOrFail($request->recruiter_id);
            $claim = MandateClaim::firstOrNew([
                'mandate_id' => $request->mandate_id,
                'recruiter_id' => $recruiter->id,
            ]);

            $wasApproved = $claim->status === 'approved';

            $claim->status = 'approved';
            $claim->assigned_at = $claim->assigned_at ?? now();
            $claim->save();

            if (!$wasApproved) {
                $recruiter->increment('active_mandates_count');
                $mandate->increment('assignment_count');
                (new NotificationService())->claimApproved($claim->fresh(['mandate', 'recruiter.user']));
            }
        }

        $candidate = null;
        $cvUrl = null;
        $parsedProfile = [];
        $aiDataFromForm = [];
        $submissionRecruiterId = $claim->recruiter_id;

        if ($request->filled('ai_data')) {
            $aiDataFromForm = json_decode($request->ai_data, true) ?? [];
        }

        if ($request->filled('existing_candidate_id')) {
            $candidate = Candidate::findOrFail($request->existing_candidate_id);
            $cvUrl = $candidate->cv_url;
            $parsedProfile = $candidate->parsed_profile ?? [];
            $submissionRecruiterId = $candidate->recruiter_id ?: $claim->recruiter_id;
        } else {
            $cvOriginalName = null;

            if ($request->hasFile('cv_file')) {
                $file = $request->file('cv_file');
                $cvOriginalName = $file->getClientOriginalName();
                $path = $file->store('cvs', 'public');
                $cvUrl = Storage::url($path);

                $cvText = $extractor->extractFromUploadedFile($file);
                if (!empty($cvText)) {
                    $parsedProfile = $claude->parseCV($cvText, $mandate);
                }
            }

            $candidate = Candidate::create([
                'recruiter_id'     => $claim->recruiter_id,
                'first_name'       => $request->first_name,
                'last_name'        => $request->last_name,
                'email'            => $request->email,
                'linkedin_url'     => $request->linkedin_url,
                'current_role'     => $request->current_role,
                'current_company'  => $request->current_company,
                'cv_url'           => $cvUrl,
                'cv_original_name' => $cvOriginalName,
                'cv_uploaded_at'   => $cvUrl ? now() : null,
                'parsed_profile'   => !empty($parsedProfile) ? $parsedProfile : null,
                'skills'           => $parsedProfile['skills'] ?? null,
                'years_experience' => $parsedProfile['years_experience'] ?? null,
            ]);
        }

        $count = CddSubmission::where('mandate_id', $request->mandate_id)
            ->where('recruiter_id', $submissionRecruiterId)
            ->count() + 1;

        $submissionData = [
            'mandate_id'          => $request->mandate_id,
            'recruiter_id'        => $submissionRecruiterId,
            'candidate_id'        => $candidate->id,
            'submission_number'   => $count,
            'client_status'       => $request->initial_stage,
            'admin_review_status' => 'pending',
            'submitted_at'        => now(),
        ];

        if (!empty($aiDataFromForm)) {
            $submissionData['ai_score'] = $aiDataFromForm['ai_score'] ?? null;
            $submissionData['score_breakdown'] = $aiDataFromForm['score_breakdown'] ?? null;
            $submissionData['green_flags'] = $aiDataFromForm['green_flags'] ?? null;
            $submissionData['red_flags'] = $aiDataFromForm['red_flags'] ?? null;
            $submissionData['ai_summary'] = $aiDataFromForm['ai_summary'] ?? null;
        }

        $submission = CddSubmission::create($submissionData);

        if (!empty($aiDataFromForm)) {
            $candidate->update([
                'ai_score' => $aiDataFromForm['ai_score'] ?? null,
                'score_breakdown' => $aiDataFromForm['score_breakdown'] ?? null,
                'green_flags' => $aiDataFromForm['green_flags'] ?? null,
                'red_flags' => $aiDataFromForm['red_flags'] ?? null,
                'ai_summary' => $aiDataFromForm['ai_summary'] ?? null,
            ]);
        }

        if ($cvUrl && empty($aiDataFromForm)) {
            $this->scoreCandidateSubmission($candidate, $mandate, $submission, $claude, $extractor);
            $submission->refresh();
        }

        $submission->load(['candidate', 'mandate.client.user', 'recruiter.user']);

        (new NotificationService())->candidateAdded($submission);

        return response()->json([
            'success'    => true,
            'submission' => $this->formatSubmission($submission),
        ]);
    }

    private function scoreCandidateSubmission(Candidate $candidate, Mandate $mandate, CddSubmission $submission, ClaudeService $claude, CvTextExtractor $extractor): void
    {
        try {
            $cvText = $extractor->extractFromStoredUrl($candidate->cv_url, (string) $candidate->id);

            if (empty($cvText)) {
                Log::warning('Inline CV scoring skipped: no CV text', ['candidate_id' => $candidate->id]);
                return;
            }

            $parsed = $claude->parseCV($cvText, $mandate);

            if (!empty($parsed)) {
                $candidate->update([
                    'parsed_profile'   => $parsed,
                    'skills'           => $parsed['skills'] ?? $candidate->skills,
                    'years_experience' => $parsed['years_experience'] ?? $candidate->years_experience,
                    'cv_parsed_at'     => now(),
                ]);
            }

            $candidate->refresh();
            $scoring = $claude->scoreCandidate($candidate, $mandate);

            if (empty($scoring['ai_score'])) {
                return;
            }

            $candidate->update([
                'ai_score'        => $scoring['ai_score'],
                'score_breakdown' => $scoring['score_breakdown'],
                'green_flags'     => $scoring['green_flags'],
                'red_flags'       => $scoring['red_flags'],
                'ai_summary'      => $scoring['ai_summary'],
            ]);

            $submission->update([
                'ai_score'        => $scoring['ai_score'],
                'score_breakdown' => $scoring['score_breakdown'],
                'green_flags'     => $scoring['green_flags'],
                'red_flags'       => $scoring['red_flags'],
                'ai_summary'      => $scoring['ai_summary'],
            ]);
        } catch (\Throwable $e) {
            Log::error('Inline CV scoring failed', [
                'candidate_id' => $candidate->id,
                'mandate_id' => $mandate->id,
                'submission_id' => $submission->id,
                'error' => $e->getMessage(),
            ]);
        }
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
