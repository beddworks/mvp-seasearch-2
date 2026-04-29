<?php

namespace App\Http\Controllers\Recruiter;

use App\Http\Controllers\Controller;
use App\Models\Mandate;
use App\Models\MandateClaim;
use App\Models\Candidate;
use App\Models\CddSubmission;
use App\Services\ClaudeService;
use App\Services\CvTextExtractor;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Http\JsonResponse;
use Inertia\Inertia;

class MandateController extends Controller
{
    public function index(Request $request)
    {
        $recruiter = Auth::user()->recruiter;
        if (!$recruiter) abort(403);

        $tab = $request->get('tab', 'all');

        $query = MandateClaim::with(['mandate.client.compensationType', 'mandate.compensationType'])
            ->where('recruiter_id', $recruiter->id);

        if ($tab === 'pending')  $query->where('status', 'pending');
        if ($tab === 'approved') $query->where('status', 'approved');
        if ($tab === 'rejected') $query->where('status', 'rejected');

        $claims = $query->orderByDesc('created_at')->paginate(20)->withQueryString();

        return Inertia::render('Recruiter/Mandates/Index', [
            'claims'     => $claims,
            'tab'        => $tab,
            'atCapacity' => $recruiter->active_mandates_count >= 2,
        ]);
    }

    public function show($id)
    {
        $mandate  = Mandate::with('client')->where('status', 'active')->findOrFail($id);
        $recruiter = Auth::user()->recruiter;
        $alreadyClaimed = $recruiter
            ? MandateClaim::where('recruiter_id', $recruiter->id)->where('mandate_id', $id)->exists()
            : false;
        return Inertia::render('Recruiter/Mandates/Show', [
            'mandate'       => $mandate,
            'alreadyClaimed'=> $alreadyClaimed,
            'atCapacity'    => $recruiter ? $recruiter->active_mandates_count >= 2 : true,
        ]);
    }

    public function pick($id)
    {
        $mandate  = Mandate::with('client')->where('status', 'active')->findOrFail($id);
        $recruiter = Auth::user()->recruiter;

        if (!$recruiter) abort(403);

        // Business rule: max 2 active mandates
        if ($recruiter->active_mandates_count >= 2) {
            return redirect()->route('recruiter.mandates.index')
                ->with('error', 'You already have 2 active roles. Complete or drop one first.');
        }

        $alreadyClaimed = MandateClaim::where('recruiter_id', $recruiter->id)
            ->where('mandate_id', $id)->exists();

        return Inertia::render('Recruiter/Mandates/Pick', [
            'mandate'       => $mandate,
            'alreadyClaimed'=> $alreadyClaimed,
        ]);
    }

    public function confirmPick(Request $request, $id)
    {
        $mandate  = Mandate::where('status', 'active')->findOrFail($id);
        $recruiter = Auth::user()->recruiter;

        if (!$recruiter) abort(403);
        if ($recruiter->active_mandates_count >= 2) {
            return back()->with('error', 'You are already at capacity (2 active roles).');
        }

        $exists = MandateClaim::where('recruiter_id', $recruiter->id)
            ->where('mandate_id', $id)->exists();
        if ($exists) {
            return redirect()->route('recruiter.mandates.workspace', $id)
                ->with('error', 'You have already picked this role.');
        }

        MandateClaim::create([
            'mandate_id'   => $id,
            'recruiter_id' => $recruiter->id,
            'status'       => 'pending',
        ]);

        $claim = MandateClaim::with(['mandate','recruiter.user'])
            ->where('recruiter_id', $recruiter->id)
            ->where('mandate_id', $id)
            ->latest()->first();
        (new NotificationService())->mandatePicked($claim);

        return redirect()->route('recruiter.mandates.index')
            ->with('success', 'Role claimed! Awaiting admin approval.');
    }

    public function workspace($id)
    {
        $recruiter = Auth::user()->recruiter;
        $claim = MandateClaim::with(['mandate.client'])
            ->where('recruiter_id', $recruiter?->id)
            ->where('mandate_id', $id)
            ->firstOrFail();

        $candidates = Candidate::where('recruiter_id', $recruiter->id)
            ->orderByDesc('created_at')
            ->get(['id', 'first_name', 'last_name', 'current_role', 'current_company', 'cv_url']);

        $submissions = CddSubmission::with('candidate')
            ->where('mandate_id', $id)
            ->where('recruiter_id', $recruiter->id)
            ->orderByDesc('submitted_at')
            ->get();

        // All submissions across all recruiters — for the shared pipeline view
        $allSubmissions = CddSubmission::with(['candidate', 'recruiter.user'])
            ->where('mandate_id', $id)
            ->orderByDesc('submitted_at')
            ->get();

        return Inertia::render('Recruiter/Mandates/Workspace', [
            'mandate'         => $claim->mandate,
            'claim'           => $claim,
            'candidates'      => $candidates,
            'submissions'     => $submissions,
            'all_submissions' => $allSubmissions,
        ]);
    }

    public function addCandidatePage($id)
    {
        $recruiter = Auth::user()->recruiter;
        $claim = MandateClaim::with(['mandate.client'])
            ->where('recruiter_id', $recruiter?->id)
            ->where('mandate_id', $id)
            ->firstOrFail();

        return Inertia::render('Recruiter/Mandates/AddCandidate', [
            'mandate' => $claim->mandate,
            'claim' => $claim,
        ]);
    }

    public function aiPreview(Request $request, $id, ClaudeService $claude, CvTextExtractor $extractor): JsonResponse
    {
        $recruiter = Auth::user()->recruiter;

        MandateClaim::where('recruiter_id', $recruiter?->id)
            ->where('mandate_id', $id)
            ->firstOrFail();

        $mandate = Mandate::findOrFail($id);

        $request->validate([
            'candidate_id' => 'nullable|string|exists:candidates,id',
            'first_name' => 'nullable|string|max:100',
            'last_name' => 'nullable|string|max:100',
            'current_role' => 'nullable|string|max:200',
            'current_company' => 'nullable|string|max:200',
            'cv_file' => 'nullable|file|mimes:pdf,doc,docx|max:10240',
        ]);

        if (!$request->candidate_id && !$request->hasFile('cv_file')) {
            return response()->json([
                'success' => false,
                'message' => 'Upload a CV or select an existing candidate first.',
            ], 422);
        }

        if ($request->candidate_id) {
            $candidate = Candidate::where('id', $request->candidate_id)
                ->where('recruiter_id', $recruiter->id)
                ->firstOrFail();

            $working = new Candidate($candidate->toArray());

            if (empty($working->parsed_profile) && !empty($working->cv_url)) {
                $cvText = $extractor->extractFromStoredUrl($working->cv_url, (string) $candidate->id);
                if (!empty($cvText)) {
                    $parsed = $claude->parseCV($cvText, $mandate);
                    if (!empty($parsed)) {
                        $working->parsed_profile = $parsed;
                        $working->skills = $parsed['skills'] ?? $working->skills;
                        $working->years_experience = $parsed['years_experience'] ?? $working->years_experience;
                        $working->current_role = $parsed['current_role'] ?? $working->current_role;
                        $working->current_company = $parsed['current_company'] ?? $working->current_company;
                    }
                }
            }

            $score = $claude->scoreCandidate($working, $mandate);

            return response()->json([
                'success' => true,
                'source' => 'existing',
                'candidate' => [
                    'id' => $candidate->id,
                    'first_name' => $candidate->first_name,
                    'last_name' => $candidate->last_name,
                    'email' => $candidate->email,
                    'linkedin_url' => $candidate->linkedin_url,
                    'current_role' => $working->current_role,
                    'current_company' => $working->current_company,
                ],
                'parsed_profile' => $working->parsed_profile ?? [],
                'score' => $score,
            ]);
        }

        $working = new Candidate([
            'first_name' => $request->first_name ?: 'New',
            'last_name' => $request->last_name ?: 'Candidate',
            'current_role' => $request->current_role,
            'current_company' => $request->current_company,
        ]);

        $cvText = '';
        $parsed = [];

        if ($request->hasFile('cv_file')) {
            $cvText = $extractor->extractFromUploadedFile($request->file('cv_file'));
        }

        if (!empty($cvText ?? '')) {
            $parsed = $claude->parseCV($cvText, $mandate);
            if (!empty($parsed)) {
                $working->parsed_profile = $parsed;
                $working->skills = $parsed['skills'] ?? [];
                $working->years_experience = $parsed['years_experience'] ?? null;
                if (empty($working->current_role)) $working->current_role = $parsed['current_role'] ?? null;
                if (empty($working->current_company)) $working->current_company = $parsed['current_company'] ?? null;
            }
        }

        $score = $claude->scoreCandidate($working, $mandate);

        return response()->json([
            'success' => true,
            'source' => 'upload',
            'candidate' => [
                'first_name' => $working->first_name,
                'last_name' => $working->last_name,
                'email' => $parsed['email'] ?? '',
                'linkedin_url' => $parsed['linkedin_url'] ?? '',
                'current_role' => $working->current_role,
                'current_company' => $working->current_company,
                'years_experience' => $parsed['years_experience'] ?? null,
                'skills' => $parsed['skills'] ?? [],
            ],
            'parsed_profile' => $parsed,
            'score' => $score,
        ]);
    }

    public function aiStatus($id): JsonResponse
    {
        $recruiter = Auth::user()->recruiter;

        MandateClaim::where('recruiter_id', $recruiter?->id)
            ->where('mandate_id', $id)
            ->firstOrFail();

        $submissions = CddSubmission::with('candidate')
            ->where('mandate_id', $id)
            ->where('recruiter_id', $recruiter->id)
            ->orderByDesc('submitted_at')
            ->get()
            ->map(function (CddSubmission $s) {
                $candidate = $s->candidate;
                return [
                    'id' => $s->id,
                    'submission_number' => $s->submission_number,
                    'client_status' => $s->client_status,
                    'admin_review_status' => $s->admin_review_status,
                    'ai_score' => $s->ai_score,
                    'ai_summary' => $s->ai_summary,
                    'score_breakdown' => $s->score_breakdown,
                    'green_flags' => $s->green_flags,
                    'red_flags' => $s->red_flags,
                    'submitted_at' => $s->submitted_at,
                    'updated_at' => $s->updated_at,
                    'client_status_updated_at' => $s->client_status_updated_at,
                    'ai_processing' => false,
                    'candidate' => $candidate ? [
                        'id' => $candidate->id,
                        'first_name' => $candidate->first_name,
                        'last_name' => $candidate->last_name,
                        'current_role' => $candidate->current_role,
                        'current_company' => $candidate->current_company,
                        'cv_url' => $candidate->cv_url,
                        'cv_original_name' => $candidate->cv_original_name,
                    ] : null,
                ];
            })
            ->values();

        return response()->json([
            'success' => true,
            'submissions' => $submissions,
            'processing_count' => $submissions->where('ai_processing', true)->count(),
        ]);
    }

    // Stub methods kept for route resolution
    public function create() { abort(404); }
    public function store(Request $request) { abort(404); }
    public function edit($id) { abort(404); }
    public function update(Request $request, $id) { abort(404); }
    public function destroy($id) { abort(404); }
    public function approve($id) { return back(); }
    public function reject($id) { return back(); }
    public function uploadCv(Request $request, $id) { return response()->json(['success' => true]); }
    public function saveNote(Request $request, $id) { return response()->json(['success' => true]); }
    public function move(Request $request) { return response()->json(['success' => true]); }
    public function scheduleInterview(Request $request) { return response()->json(['success' => true]); }
    public function saveFeedback(Request $request) { return response()->json(['success' => true]); }
    public function submitToClient(Request $request) { return response()->json(['success' => true]); }
    public function addCandidate(Request $request) { return response()->json(['success' => true]); }
    public function payoutRequest(Request $request) { return back()->with('success', 'Request submitted.'); }
    public function read($id) { return response()->json(['success' => true]); }
    public function readAll() { return back(); }
    public function brief(Request $request) { return response()->json(['result' => 'stub']); }
    public function outreach(Request $request) { return response()->json(['result' => 'stub']); }
    public function questions(Request $request) { return response()->json(['result' => 'stub']); }
    public function matching(Request $request) { return response()->json(['result' => 'stub']); }
}
