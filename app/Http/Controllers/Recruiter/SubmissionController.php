<?php

namespace App\Http\Controllers\Recruiter;

use App\Http\Controllers\Controller;
use App\Models\Candidate;
use App\Models\CddSubmission;
use App\Models\Mandate;
use App\Models\MandateClaim;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Inertia\Inertia;

class SubmissionController extends Controller
{
    /**
     * Store a new CDD submission.
     * Route: POST /recruiter/submissions
     */
    public function store(Request $request)
    {
        $recruiter = Auth::user()->recruiter;

        $data = $request->validate([
            'mandate_id'     => 'required|string|exists:mandates,id',
            'candidate_id'   => 'required|string|exists:candidates,id',
            'recruiter_note' => 'nullable|string|max:3000',
        ]);

        // Ensure recruiter has an approved claim on this mandate
        $claim = MandateClaim::where('mandate_id', $data['mandate_id'])
            ->where('recruiter_id', $recruiter->id)
            ->where('status', 'approved')
            ->first();

        if (!$claim) {
            return back()->withErrors(['mandate_id' => 'You do not have an approved claim on this mandate.']);
        }

        // Ensure candidate belongs to this recruiter
        $candidate = Candidate::where('id', $data['candidate_id'])
            ->where('recruiter_id', $recruiter->id)
            ->first();

        if (!$candidate) {
            return back()->withErrors(['candidate_id' => 'Candidate not found in your pool.']);
        }

        // Calculate submission number (max 3 per mandate/recruiter)
        $existingCount = CddSubmission::where('mandate_id', $data['mandate_id'])
            ->where('recruiter_id', $recruiter->id)
            ->count();

        if ($existingCount >= 3) {
            return back()->withErrors(['mandate_id' => 'Maximum 3 submissions allowed per mandate.']);
        }

        // Check for bypass rule (trust_level=trusted or mandate is_fast_track)
        $mandate = Mandate::findOrFail($data['mandate_id']);
        $bypass = $recruiter->trust_level === 'trusted' || $mandate->is_fast_track;

        $submission = CddSubmission::create([
            'mandate_id'         => $data['mandate_id'],
            'recruiter_id'       => $recruiter->id,
            'candidate_id'       => $data['candidate_id'],
            'recruiter_note'     => $data['recruiter_note'] ?? null,
            'submission_number'  => $existingCount + 1,
            'token'              => Str::random(64),
            'admin_review_status'=> $bypass ? 'bypassed' : 'pending',
            'exception_bypass'   => $bypass,
        ]);

        return redirect()->route('recruiter.mandates.workspace', $data['mandate_id'])
            ->with('success', 'Candidate submitted successfully. ' . ($bypass ? 'Auto-approved (trusted/fast-track).' : 'Awaiting admin review.'));
    }
}

