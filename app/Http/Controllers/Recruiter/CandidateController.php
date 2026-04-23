<?php

namespace App\Http\Controllers\Recruiter;

use App\Http\Controllers\Controller;
use App\Models\Candidate;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class CandidateController extends Controller
{
    public function index(Request $request)
    {
        $recruiter = Auth::user()->recruiter;
        $q = $request->input('q', '');

        $candidates = Candidate::where('recruiter_id', $recruiter->id)
            ->when($q, fn($query) => $query->where(function ($sub) use ($q) {
                $sub->where('first_name', 'like', "%$q%")
                    ->orWhere('last_name', 'like', "%$q%")
                    ->orWhere('current_role', 'like', "%$q%")
                    ->orWhere('current_company', 'like', "%$q%");
            }))
            ->orderByDesc('created_at')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Recruiter/Candidates/Index', [
            'candidates' => $candidates,
            'filters'    => ['q' => $q],
        ]);
    }

    public function show($id)
    {
        $recruiter = Auth::user()->recruiter;
        $candidate = Candidate::where('recruiter_id', $recruiter->id)->findOrFail($id);

        return Inertia::render('Recruiter/Candidates/Show', [
            'candidate' => $candidate,
        ]);
    }

    public function store(Request $request)
    {
        $recruiter = Auth::user()->recruiter;

        $data = $request->validate([
            'first_name'       => 'required|string|max:100',
            'last_name'        => 'required|string|max:100',
            'email'            => 'nullable|email|max:255',
            'phone'            => 'nullable|string|max:50',
            'linkedin_url'     => 'nullable|string|max:255',
            'current_role'     => 'nullable|string|max:200',
            'current_company'  => 'nullable|string|max:200',
            'location'         => 'nullable|string|max:200',
            'years_experience' => 'nullable|integer|min:0|max:60',
            'notes'            => 'nullable|string',
        ]);

        $candidate = Candidate::create([
            ...$data,
            'recruiter_id' => $recruiter->id,
        ]);

        // Handle optional CV file in same form
        if ($request->hasFile('cv_file')) {
            $this->handleCvUpload($request, $candidate);
        }

        return redirect()->route('recruiter.candidates.show', $candidate->id)
            ->with('success', 'Candidate added successfully.');
    }

    public function update(Request $request, $id)
    {
        $recruiter = Auth::user()->recruiter;
        $candidate = Candidate::where('recruiter_id', $recruiter->id)->findOrFail($id);

        $data = $request->validate([
            'first_name'       => 'required|string|max:100',
            'last_name'        => 'required|string|max:100',
            'email'            => 'nullable|email|max:255',
            'phone'            => 'nullable|string|max:50',
            'linkedin_url'     => 'nullable|string|max:255',
            'current_role'     => 'nullable|string|max:200',
            'current_company'  => 'nullable|string|max:200',
            'location'         => 'nullable|string|max:200',
            'years_experience' => 'nullable|integer|min:0|max:60',
            'notes'            => 'nullable|string',
        ]);

        $candidate->update($data);

        return redirect()->route('recruiter.candidates.show', $candidate->id)
            ->with('success', 'Candidate updated.');
    }

    public function uploadCv(Request $request, $id)
    {
        $recruiter = Auth::user()->recruiter;
        $candidate = Candidate::where('recruiter_id', $recruiter->id)->findOrFail($id);

        $request->validate([
            'cv_file' => 'required|file|mimes:pdf,doc,docx|max:10240',
        ]);

        $this->handleCvUpload($request, $candidate);

        return response()->json([
            'success'         => true,
            'cv_url'          => $candidate->cv_url,
            'cv_original_name'=> $candidate->cv_original_name,
            'cv_uploaded_at'  => $candidate->cv_uploaded_at,
        ]);
    }

    private function handleCvUpload(Request $request, Candidate $candidate): void
    {
        $file = $request->file('cv_file');
        $path = $file->store("cvs/{$candidate->recruiter_id}", 'local');

        $candidate->update([
            'cv_url'           => $path,
            'cv_original_name' => $file->getClientOriginalName(),
            'cv_uploaded_at'   => now(),
        ]);
    }

    public function saveNote(Request $request, $id)
    {
        $recruiter = Auth::user()->recruiter;
        $candidate = Candidate::where('recruiter_id', $recruiter->id)->findOrFail($id);

        $request->validate(['notes' => 'nullable|string']);
        $candidate->update(['notes' => $request->input('notes')]);

        return response()->json(['success' => true]);
    }

    // Remaining stubs — not used in Phase 5
    public function create()  { return Inertia::render('Recruiter/Candidates/Index'); }
    public function edit($id) { return Inertia::render('Recruiter/Candidates/Show', ['candidate' => Candidate::findOrFail($id)]); }
    public function destroy($id) { return back()->with('success', 'Deleted.'); }
    public function approve($id) { return back()->with('success', 'Approved.'); }
    public function reject($id)  { return back()->with('success', 'Rejected.'); }
    public function pick($id)    { return Inertia::render('Stub'); }
    public function confirmPick(Request $request, $id) { return back()->with('success', 'Picked.'); }
    public function workspace($id) { return Inertia::render('Stub'); }
    public function move(Request $request) { return response()->json(['success' => true]); }
    public function scheduleInterview(Request $request) { return response()->json(['success' => true]); }
    public function saveFeedback(Request $request) { return response()->json(['success' => true]); }
    public function submitToClient(Request $request) { return response()->json(['success' => true]); }
    public function addCandidate(Request $request) { return response()->json(['success' => true]); }
    public function payoutRequest(Request $request) { return back()->with('success', 'Request submitted.'); }
    public function read($id)  { return response()->json(['success' => true]); }
    public function readAll()  { return back(); }
    public function brief(Request $request)    { return response()->json(['result' => 'stub']); }
    public function outreach(Request $request) { return response()->json(['result' => 'stub']); }
    public function questions(Request $request){ return response()->json(['result' => 'stub']); }
    public function matching(Request $request) { return response()->json(['result' => 'stub']); }
}
