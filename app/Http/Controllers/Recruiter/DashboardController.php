<?php

namespace App\Http\Controllers\Recruiter;

use App\Http\Controllers\Controller;
use App\Models\Mandate;
use App\Models\MandateClaim;
use App\Models\Placement;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index()
    {
        $user      = Auth::user();
        $recruiter = $user->recruiter;

        $activeClaims = MandateClaim::where('recruiter_id', $recruiter?->id)
            ->where('status', 'approved')
            ->with('mandate.client')
            ->get();

        $recentPlacements = Placement::where('recruiter_id', $recruiter?->id)
            ->with('mandate.client', 'candidate')
            ->orderByDesc('placed_at')
            ->limit(5)
            ->get();

        $totalEarnings = Placement::where('recruiter_id', $recruiter?->id)
            ->sum('final_payout');

        $openMandatesCount = Mandate::where('status', 'active')->count();

        return Inertia::render('Recruiter/Dashboard', [
            'recruiter'        => $recruiter,
            'activeClaims'     => $activeClaims,
            'recentPlacements' => $recentPlacements,
            'totalEarnings'    => (float) $totalEarnings,
            'openMandatesCount'=> $openMandatesCount,
        ]);
    }
}
