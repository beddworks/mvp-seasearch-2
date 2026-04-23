<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Mandate;
use App\Models\MandateClaim;
use App\Models\Placement;
use App\Models\Recruiter;
use App\Models\User;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index()
    {
        return Inertia::render('Admin/Dashboard', [
            'stats' => [
                'total_recruiters'  => User::where('role', 'recruiter')->count(),
                'active_mandates'   => Mandate::where('status', 'active')->count(),
                'pending_claims'    => MandateClaim::where('status', 'pending')->count(),
                'total_placements'  => Placement::count(),
                'revenue_ytd'       => (float) Placement::whereYear('placed_at', now()->year)->sum('platform_fee'),
            ],
        ]);
    }
}
