<?php

namespace App\Http\Controllers\Recruiter;

use App\Http\Controllers\Controller;
use App\Models\Mandate;
use App\Models\MandateClaim;
use App\Models\Candidate;
use App\Models\CddSubmission;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class MandateController extends Controller
{
    public function index(Request $request)
    {
        $recruiter = Auth::user()->recruiter;
        $tab = $request->get('tab', 'all');
        $q   = $request->get('q', '');

        $query = Mandate::with('client')
            ->where('status', 'active');

        // Tab filters
        if ($tab === 'exclusive')   $query->where('is_exclusive', true);
        if ($tab === 'remote')      $query->where('is_remote', true);
        if ($tab === 'multi')       $query->where('openings_count', '>', 1);
        if ($tab === 'featured')    $query->where('is_featured', true);

        // Search
        if ($q) {
            $query->where(function ($q2) use ($q) {
                $q2->where('title', 'like', "%$q%")
                   ->orWhere('industry', 'like', "%$q%")
                   ->orWhereHas('client', fn($c) => $c->where('company_name', 'like', "%$q%"));
            });
        }

        // Industry / location filters
        if ($request->industry) $query->where('industry', $request->industry);
        if ($request->seniority) $query->where('seniority', $request->seniority);

        $mandates = $query->orderByDesc('is_featured')->orderByDesc('created_at')->paginate(20)->withQueryString();

        // IDs the recruiter already claimed
        $myClaimIds = $recruiter
            ? MandateClaim::where('recruiter_id', $recruiter->id)->pluck('mandate_id')->all()
            : [];

        return Inertia::render('Recruiter/Mandates/Index', [
            'mandates'    => $mandates,
            'myClaimIds'  => $myClaimIds,
            'tab'         => $tab,
            'q'           => $q,
            'filters'     => $request->only('industry', 'seniority'),
            'atCapacity'  => $recruiter ? $recruiter->active_mandates_count >= 2 : true,
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

        $recruiter->increment('active_mandates_count');

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

        return Inertia::render('Recruiter/Mandates/Workspace', [
            'mandate'     => $claim->mandate,
            'claim'       => $claim,
            'candidates'  => $candidates,
            'submissions' => $submissions,
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
