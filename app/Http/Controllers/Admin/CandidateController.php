<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Candidate;
use App\Models\Recruiter;
use App\Services\ClaudeService;
use App\Services\CvTextExtractor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class CandidateController extends Controller
{
    public function index(Request $request)
    {
        $q = (string) $request->input('q', '');
        $recruiterId = (string) $request->input('recruiter_id', '');

        $candidates = Candidate::with('recruiter.user')
            ->when($recruiterId, fn ($query) => $query->where('recruiter_id', $recruiterId))
            ->when($q, fn ($query) => $query->where(function ($sub) use ($q) {
                $sub->where('first_name', 'like', "%{$q}%")
                    ->orWhere('last_name', 'like', "%{$q}%")
                    ->orWhere('current_role', 'like', "%{$q}%")
                    ->orWhere('current_company', 'like', "%{$q}%");
            }))
            ->orderByDesc('created_at')
            ->paginate(20)
            ->withQueryString();

        $recruiters = Recruiter::with('user')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (Recruiter $r) => [
                'id' => $r->id,
                'name' => $r->user?->name ?? 'Unknown',
                'email' => $r->user?->email,
            ]);

        return Inertia::render('Admin/Candidates/Index', [
            'candidates' => $candidates,
            'recruiters' => $recruiters,
            'filters' => [
                'q' => $q,
                'recruiter_id' => $recruiterId,
            ],
        ]);
    }

    public function show(string $id)
    {
        $candidate = Candidate::with('recruiter.user')->findOrFail($id);

        return Inertia::render('Admin/Candidates/Show', [
            'candidate' => $candidate,
        ]);
    }

    public function store(Request $request, ClaudeService $claude, CvTextExtractor $extractor)
    {
        $data = $request->validate([
            'recruiter_id' => 'required|exists:recruiters,id',
            'first_name' => 'required|string|max:100',
            'last_name' => 'required|string|max:100',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:50',
            'linkedin_url' => 'nullable|string|max:255',
            'current_role' => 'nullable|string|max:200',
            'current_company' => 'nullable|string|max:200',
            'location' => 'nullable|string|max:200',
            'years_experience' => 'nullable|integer|min:0|max:60',
            'notes' => 'nullable|string',
            'cv_file' => 'nullable|file|mimes:pdf,doc,docx|max:10240',
            'ai_data' => 'nullable|string',
        ]);

        $candidate = Candidate::create($data);

        if ($request->hasFile('cv_file')) {
            $this->handleCvUpload($request, $candidate);
        }

        $aiData = $this->parseAiData($request->input('ai_data'));

        if (empty($aiData) && $request->hasFile('cv_file')) {
            $cvText = $extractor->extractFromUploadedFile($request->file('cv_file'));
            if (!empty($cvText)) {
                $parsed = $claude->parseCV($cvText);
                if (!empty($parsed)) {
                    $aiData = [
                        'parsed_profile' => $parsed,
                        'skills' => $parsed['skills'] ?? [],
                        'years_experience' => $parsed['years_experience'] ?? null,
                        'ai_summary' => $parsed['summary'] ?? null,
                    ];
                }
            }
        }

        if (!empty($aiData)) {
            $this->hydrateCandidateFromAiData($candidate, $aiData);
        }

        return redirect()->route('admin.candidates.show', $candidate->id)
            ->with('success', 'Candidate added successfully.');
    }

    public function aiPreview(Request $request, ClaudeService $claude, CvTextExtractor $extractor): JsonResponse
    {
        $request->validate([
            'first_name' => 'nullable|string|max:100',
            'last_name' => 'nullable|string|max:100',
            'current_role' => 'nullable|string|max:200',
            'current_company' => 'nullable|string|max:200',
            'cv_file' => 'required|file|mimes:pdf,doc,docx|max:10240',
        ]);

        $cvText = $extractor->extractFromUploadedFile($request->file('cv_file'));
        if (empty($cvText)) {
            return response()->json([
                'success' => false,
                'message' => 'Unable to extract text from this CV. Try another file.',
            ], 422);
        }

        $parsed = $claude->parseCV($cvText);
        if (empty($parsed)) {
            return response()->json([
                'success' => false,
                'message' => 'Could not parse this CV right now. Please try again.',
            ], 422);
        }

        $name = trim((string) ($parsed['name'] ?? ''));
        $nameParts = preg_split('/\s+/', $name, -1, PREG_SPLIT_NO_EMPTY);

        $firstName = $request->input('first_name')
            ?: ($nameParts[0] ?? '');
        $lastName = $request->input('last_name')
            ?: (count($nameParts) > 1 ? implode(' ', array_slice($nameParts, 1)) : '');

        $role = $request->input('current_role') ?: ($parsed['current_role'] ?? null);
        $company = $request->input('current_company') ?: ($parsed['current_company'] ?? null);

        return response()->json([
            'success' => true,
            'candidate' => [
                'first_name' => $firstName,
                'last_name' => $lastName,
                'email' => $parsed['email'] ?? '',
                'linkedin_url' => $parsed['linkedin_url'] ?? '',
                'current_role' => $role,
                'current_company' => $company,
                'location' => $parsed['location'] ?? '',
                'years_experience' => $parsed['years_experience'] ?? null,
                'skills' => $parsed['skills'] ?? [],
            ],
            'ai_data' => [
                'parsed_profile' => $parsed,
                'skills' => $parsed['skills'] ?? [],
                'years_experience' => $parsed['years_experience'] ?? null,
                'ai_summary' => $parsed['summary'] ?? null,
            ],
        ]);
    }

    public function update(Request $request, string $id)
    {
        $candidate = Candidate::findOrFail($id);

        $data = $request->validate([
            'first_name' => 'required|string|max:100',
            'last_name' => 'required|string|max:100',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:50',
            'linkedin_url' => 'nullable|string|max:255',
            'current_role' => 'nullable|string|max:200',
            'current_company' => 'nullable|string|max:200',
            'location' => 'nullable|string|max:200',
            'years_experience' => 'nullable|integer|min:0|max:60',
            'notes' => 'nullable|string',
            'recruiter_id' => 'nullable|exists:recruiters,id',
        ]);

        $candidate->update($data);

        return redirect()->route('admin.candidates.show', $candidate->id)
            ->with('success', 'Candidate updated.');
    }

    public function uploadCv(Request $request, string $id)
    {
        $candidate = Candidate::findOrFail($id);

        $request->validate([
            'cv_file' => 'required|file|mimes:pdf,doc,docx|max:10240',
        ]);

        $this->handleCvUpload($request, $candidate);

        return response()->json([
            'success' => true,
            'cv_url' => $candidate->cv_url,
            'cv_original_name' => $candidate->cv_original_name,
            'cv_uploaded_at' => $candidate->cv_uploaded_at,
        ]);
    }

    public function downloadCv(string $id)
    {
        $candidate = Candidate::findOrFail($id);
        abort_unless($candidate->cv_url && Storage::disk('local')->exists($candidate->cv_url), 404);
        return Storage::disk('local')->download($candidate->cv_url, $candidate->cv_original_name ?: 'cv');
    }

    public function saveNote(Request $request, string $id)
    {
        $candidate = Candidate::findOrFail($id);

        $request->validate(['notes' => 'nullable|string']);
        $candidate->update(['notes' => $request->input('notes')]);

        return response()->json(['success' => true]);
    }

    private function handleCvUpload(Request $request, Candidate $candidate): void
    {
        $file = $request->file('cv_file');
        $path = $file->store("cvs/{$candidate->recruiter_id}", 'local');

        $candidate->update([
            'cv_url' => $path,
            'cv_original_name' => $file->getClientOriginalName(),
            'cv_uploaded_at' => now(),
        ]);
    }

    private function parseAiData(?string $value): array
    {
        if (empty($value)) {
            return [];
        }

        $decoded = json_decode($value, true);
        return is_array($decoded) ? $decoded : [];
    }

    private function hydrateCandidateFromAiData(Candidate $candidate, array $aiData): void
    {
        $parsedProfile = is_array($aiData['parsed_profile'] ?? null)
            ? $aiData['parsed_profile']
            : [];

        $update = [
            'parsed_profile' => !empty($parsedProfile) ? $parsedProfile : null,
            'skills' => is_array($aiData['skills'] ?? null) ? $aiData['skills'] : null,
            'years_experience' => $aiData['years_experience'] ?? $candidate->years_experience,
            'ai_score' => $aiData['ai_score'] ?? null,
            'score_breakdown' => is_array($aiData['score_breakdown'] ?? null) ? $aiData['score_breakdown'] : null,
            'green_flags' => is_array($aiData['green_flags'] ?? null) ? $aiData['green_flags'] : null,
            'red_flags' => is_array($aiData['red_flags'] ?? null) ? $aiData['red_flags'] : null,
            'ai_summary' => $aiData['ai_summary'] ?? null,
        ];

        if (!empty($parsedProfile)) {
            $update['cv_parsed_at'] = now();
            $update['current_role'] = $candidate->current_role ?: ($parsedProfile['current_role'] ?? null);
            $update['current_company'] = $candidate->current_company ?: ($parsedProfile['current_company'] ?? null);
            $update['location'] = $candidate->location ?: ($parsedProfile['location'] ?? null);
            $update['email'] = $candidate->email ?: ($parsedProfile['email'] ?? null);
            $update['linkedin_url'] = $candidate->linkedin_url ?: ($parsedProfile['linkedin_url'] ?? null);
        }

        $candidate->update($update);
    }
}
