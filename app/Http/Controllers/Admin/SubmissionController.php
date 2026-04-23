<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\CddSubmission;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SubmissionController extends Controller
{
    public function index(Request $request)
    {
        $query = CddSubmission::with(['mandate.client', 'recruiter.user', 'candidate'])
            ->orderBy('created_at', 'desc');
        if ($request->filled('status')) $query->where('admin_review_status', $request->status);
        $submissions = $query->paginate(20)->withQueryString();
        return Inertia::render('Admin/Submissions/Index', [
            'submissions' => $submissions,
            'filters'     => $request->only(['status']),
            'stats'       => [
                'pending'  => CddSubmission::where('admin_review_status', 'pending')->count(),
                'approved' => CddSubmission::where('admin_review_status', 'approved')->count(),
                'rejected' => CddSubmission::where('admin_review_status', 'rejected')->count(),
            ],
        ]);
    }

    public function approve(string $id)
    {
        $submission = CddSubmission::with(['mandate', 'recruiter'])->findOrFail($id);
        $bypass = $submission->recruiter->trust_level === 'trusted'
            || $submission->mandate->is_fast_track;
        $submission->update([
            'admin_review_status' => 'approved',
            'admin_reviewed_at'   => now(),
            'exception_bypass'    => $bypass,
            'client_status'       => 'pending',
        ]);
        return back()->with('success', 'Submission approved' . ($bypass ? ' (bypass applied)' : '') . '.');
    }

    public function reject(Request $request, string $id)
    {
        $submission = CddSubmission::findOrFail($id);
        $submission->update([
            'admin_review_status' => 'rejected',
            'admin_reviewed_at'   => now(),
            'rejection_reason'    => $request->input('reason'),
        ]);
        return back()->with('success', 'Submission rejected.');
    }
}
