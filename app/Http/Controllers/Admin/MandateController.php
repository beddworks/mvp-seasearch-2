<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Mandate;
use App\Models\Client;
use App\Models\CompensationType;
use App\Models\Candidate;
use App\Models\MandateClaim;
use App\Models\Recruiter;
use App\Services\ClaudeService;
use App\Services\CvTextExtractor;
use App\Services\GoogleSheetsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;

class MandateController extends Controller
{
    public function index(Request $request)
    {
        $query = Mandate::with(['client'])->orderBy('created_at', 'desc');
        if ($request->filled('status')) $query->where('status', $request->status);
        if ($request->filled('search')) $query->where('title', 'like', '%' . $request->search . '%');
        $mandates = $query->paginate(20)->withQueryString();
        return Inertia::render('Admin/Mandates/Index', [
            'mandates' => $mandates,
            'filters'  => $request->only(['status', 'search']),
            'stats'    => [
                'total'   => Mandate::count(),
                'active'  => Mandate::where('status', 'active')->count(),
                'filled'  => Mandate::where('status', 'filled')->count(),
                'dropped' => Mandate::where('status', 'dropped')->count(),
            ],
        ]);
    }

    public function create()
    {
        return Inertia::render('Admin/Mandates/Form', [
            'clients'            => Client::orderBy('company_name')->get(['id', 'company_name']),
            'compensation_types' => CompensationType::where('is_active', true)->get(['id', 'name', 'formula_type']),
        ]);
    }

    public function store(Request $request, GoogleSheetsService $sheets)
    {
        $data = $request->validate([
            'title'                => ['required', 'string', 'max:255'],
            'client_id'            => ['required', 'exists:clients,id'],
            'compensation_type_id' => ['nullable', 'exists:compensation_types,id'],
            'location'             => ['nullable', 'string', 'max:255'],
            'seniority'            => ['nullable', 'in:c_suite,vp_director,manager,ic'],
            'industry'             => ['nullable', 'string', 'max:100'],
            'salary_min'           => ['nullable', 'numeric'],
            'salary_max'           => ['nullable', 'numeric'],
            'salary_currency'      => ['nullable', 'string', 'max:3'],
            'description'          => ['nullable', 'string'],
            'is_fast_track'        => ['boolean'],
            'timer_b_active'       => ['boolean'],
            'timer_c_active'       => ['boolean'],
        ]);
        $data['status'] = 'draft';
        $mandate = Mandate::create($data);

        // $sheets->createMandateTab($mandate->load('client'));

        return redirect()->route('admin.mandates.index')->with('success', 'Mandate created.');
    }

    public function show(string $id)
    {
        $mandate = Mandate::with([
            'client',
            'compensationType',
            'claims.recruiter.user',
            'submissions.candidate',
            'submissions.recruiter.user',
        ])->findOrFail($id);
        return Inertia::render('Admin/Mandates/Show', ['mandate' => $mandate]);
    }

    public function edit(string $id)
    {
        return Inertia::render('Admin/Mandates/Form', [
            'mandate'            => Mandate::findOrFail($id),
            'clients'            => Client::orderBy('company_name')->get(['id', 'company_name']),
            'compensation_types' => CompensationType::where('is_active', true)->get(['id', 'name', 'formula_type']),
        ]);
    }

    public function update(Request $request, string $id)
    {
        $mandate = Mandate::findOrFail($id);
        $data = $request->validate([
            'title'                => ['required', 'string', 'max:255'],
            'client_id'            => ['required', 'exists:clients,id'],
            'compensation_type_id' => ['nullable', 'exists:compensation_types,id'],
            'location'             => ['nullable', 'string', 'max:255'],
            'seniority'            => ['nullable', 'in:c_suite,vp_director,manager,ic'],
            'industry'             => ['nullable', 'string', 'max:100'],
            'salary_min'           => ['nullable', 'numeric'],
            'salary_max'           => ['nullable', 'numeric'],
            'salary_currency'      => ['nullable', 'string', 'max:3'],
            'description'          => ['nullable', 'string'],
            'requirements'         => ['nullable', 'string'],
            'status'               => ['in:draft,active,paused,closed,filled,dropped'],
            'is_fast_track'        => ['boolean'],
            'timer_b_active'       => ['boolean'],
            'timer_c_active'       => ['boolean'],
        ]);
        $mandate->update($data);
        return redirect()->route('admin.mandates.index')->with('success', 'Mandate updated.');
    }

    public function destroy(string $id)
    {
        Mandate::findOrFail($id)->delete();
        return back()->with('success', 'Mandate deleted.');
    }

    public function addCandidatePage($id)
    {
        $mandate = Mandate::with('client')->findOrFail($id);
        $approvedClaim = MandateClaim::with('recruiter.user')
            ->where('mandate_id', $id)
            ->where('status', 'approved')
            ->first();

        $candidates = Candidate::orderByDesc('created_at')
            ->get([
                'id',
                'recruiter_id',
                'first_name',
                'last_name',
                'email',
                'linkedin_url',
                'current_role',
                'current_company',
                'cv_url',
                'skills',
                'years_experience',
                'parsed_profile',
            ]);

        $recruiters = Recruiter::with('user')
            ->orderByDesc('active_mandates_count')
            ->get()
            ->map(fn($recruiter) => [
                'id' => $recruiter->id,
                'name' => $recruiter->user?->name ?? 'Unknown recruiter',
                'email' => $recruiter->user?->email,
                'tier' => $recruiter->tier,
                'active_mandates_count' => $recruiter->active_mandates_count,
            ])
            ->values();

        return Inertia::render('Admin/Mandates/AddCandidate', [
            'mandate' => $mandate,
            'candidates' => $candidates,
            'approvedClaim' => $approvedClaim ? [
                'id' => $approvedClaim->id,
                'recruiter_id' => $approvedClaim->recruiter_id,
                'recruiter_name' => $approvedClaim->recruiter?->user?->name,
            ] : null,
            'recruiters' => $recruiters,
        ]);
    }

    public function candidateAiPreview(Request $request, $id, ClaudeService $claude, CvTextExtractor $extractor): JsonResponse
    {
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
            $candidate = Candidate::findOrFail($request->candidate_id);

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

    public function aiPreview(Request $request, ClaudeService $claude, CvTextExtractor $extractor): JsonResponse
    {
        $request->validate([
            'jd_file' => ['required', 'file', 'mimes:pdf,doc,docx', 'max:10240'],
        ]);

        try {
            $text = $extractor->extractFromUploadedFile($request->file('jd_file'));
            if (!$text || trim($text) === '') {
                return response()->json([
                    'success' => false,
                    'message' => 'Could not extract text from document.',
                ], 422);
            }

            $parsed = $claude->parseMandateFromDocumentText($text);
            if (empty($parsed)) {
                return response()->json([
                    'success' => false,
                    'message' => 'AI could not parse this document. Please fill manually.',
                ], 422);
            }

            return response()->json([
                'success' => true,
                'mandate' => [
                    'title'           => $parsed['title'] ?? null,
                    'location'        => $parsed['location'] ?? null,
                    'seniority'       => $parsed['seniority'] ?? null,
                    'industry'        => $parsed['industry'] ?? null,
                    'salary_min'      => $parsed['salary_min'] ?? null,
                    'salary_max'      => $parsed['salary_max'] ?? null,
                    'salary_currency' => $parsed['salary_currency'] ?? null,
                    'description'     => $parsed['description'] ?? null,
                ],
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error while parsing mandate file.',
            ], 500);
        }
    }
}
