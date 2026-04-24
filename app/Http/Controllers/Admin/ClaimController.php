<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\MandateClaim;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ClaimController extends Controller
{
    public function index(Request $request)
    {
        $query = MandateClaim::with(['mandate.client', 'recruiter.user'])
            ->orderBy('created_at', 'desc');
        if ($request->filled('status')) $query->where('status', $request->status);
        $claims = $query->paginate(20)->withQueryString();
        return Inertia::render('Admin/Claims/Index', [
            'claims'  => $claims,
            'filters' => $request->only(['status']),
            'stats'   => [
                'pending'  => MandateClaim::where('status', 'pending')->count(),
                'approved' => MandateClaim::where('status', 'approved')->count(),
                'rejected' => MandateClaim::where('status', 'rejected')->count(),
            ],
        ]);
    }

    public function approve(string $id)
    {
        $claim = MandateClaim::with(['mandate', 'recruiter'])->findOrFail($id);
        if ($claim->status !== 'pending') {
            return back()->withErrors(['error' => 'Claim is not pending.']);
        }
        $claim->update([
            'status'      => 'approved',
            'assigned_at' => now(),
        ]);
        $claim->recruiter->increment('active_mandates_count');
        $claim->mandate->increment('assignment_count');
        (new NotificationService())->claimApproved($claim->fresh(['mandate','recruiter.user']));
        return back()->with('success', 'Claim approved. Day 0 set to ' . now()->format('d M Y') . '.');
    }

    public function reject(Request $request, string $id)
    {
        $claim = MandateClaim::findOrFail($id);
        if ($claim->status !== 'pending') {
            return back()->withErrors(['error' => 'Claim is not pending.']);
        }
        $claim->update([
            'status'         => 'rejected',
            'rejection_note' => $request->input('note'),
        ]);
        (new NotificationService())->claimRejected($claim->fresh(['mandate','recruiter.user']));
        return back()->with('success', 'Claim rejected.');
    }
}
