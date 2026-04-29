<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\Mandate;
use App\Models\MandateClaim;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class RolesController extends Controller
{
    public function index(Request $request)
    {
        $tab  = $request->get('tab', 'all');
        $q    = $request->get('q', '');
        $co   = $request->get('co', '');
        $sort = $request->get('sort', 'featured');

        $query = Mandate::with(['client.compensationType', 'compensationType'])
            ->where('status', 'active')
            ->withCount('submissions');

        // Tab filters
        if ($tab === 'exclusive')    $query->where('is_exclusive', true);
        if ($tab === 'remote')       $query->where('is_remote', true);
        if ($tab === 'multi')        $query->where('openings_count', '>', 1);
        if ($tab === 'high_reward')  $query->where('reward_pct', '>=', 0.18);
        if ($tab === 'new')          $query->where('published_at', '>=', now()->subDays(7));
        if ($tab === 'low_pipeline') $query->has('submissions', '<', 3);

        // Keyword search
        if ($q) {
            $query->where(function ($q2) use ($q) {
                $q2->where('title', 'like', "%$q%")
                   ->orWhere('industry', 'like', "%$q%")
                   ->orWhereHas('client', fn($c) => $c->where('company_name', 'like', "%$q%"));
            });
        }

        // Company search
        if ($co) {
            $query->whereHas('client', fn($c) => $c->where('company_name', 'like', "%$co%"));
        }

        // Dropdown filters
        if ($request->industry)      $query->where('industry', $request->industry);
        if ($request->location)      $query->where('location', $request->location);
        if ($request->contract_type) $query->where('contract_type', $request->contract_type);
        if ($request->seniority)     $query->where('seniority', $request->seniority);
        if ($request->openings === '1')  $query->where('openings_count', 1);
        if ($request->openings === '2+') $query->where('openings_count', '>', 1);

        // Sort
        match ($sort) {
            'newest'         => $query->orderByDesc('published_at'),
            'highest_reward' => $query->orderByDesc('reward_pct'),
            'highest_salary' => $query->orderByDesc('salary_max'),
            default          => $query->orderByDesc('is_featured')->orderByDesc('created_at'),
        };

        $mandates = $query->paginate(20)->withQueryString();

        $totalActive    = Mandate::where('status', 'active')->count();
        $totalExclusive = Mandate::where('status', 'active')->where('is_exclusive', true)->count();

        // Auth-aware: pass pick capability if recruiter is logged in
        $myClaimIds = [];
        $atCapacity = false;

        $user = Auth::user();
        if ($user && $user->role === 'recruiter') {
            $recruiter  = $user->recruiter;
            if ($recruiter) {
                $myClaimIds = MandateClaim::where('recruiter_id', $recruiter->id)
                    ->pluck('status', 'mandate_id')->all(); // ['mandate_id' => 'status']
                $atCapacity = $recruiter->active_mandates_count >= 2;
            }
        }

        return Inertia::render('Public/Roles', [
            'mandates'       => $mandates,
            'tab'            => $tab,
            'q'              => $q,
            'co'             => $co,
            'sort'           => $sort,
            'filters'        => $request->only('industry', 'location', 'contract_type', 'seniority', 'openings'),
            'totalActive'    => $totalActive,
            'totalExclusive' => $totalExclusive,
            'myClaims'       => $myClaimIds,
            'atCapacity'     => $atCapacity,
        ]);
    }

    public function show(string $id)
    {
        $mandate = Mandate::with(['client.compensationType', 'compensationType'])
            ->where('status', 'active')
            ->findOrFail($id);

        $atCapacity  = false;
        $claimStatus = null;

        $user = Auth::user();
        if ($user && $user->role === 'recruiter') {
            $recruiter = $user->recruiter;
            if ($recruiter) {
                $atCapacity  = $recruiter->active_mandates_count >= 2;
                $claimStatus = MandateClaim::where('recruiter_id', $recruiter->id)
                    ->where('mandate_id', $id)
                    ->value('status'); // null | 'pending' | 'approved' | 'rejected'
            }
        }

        return Inertia::render('Public/RoleDetail', [
            'mandate'     => $mandate,
            'claimStatus' => $claimStatus,
            'atCapacity'  => $atCapacity,
        ]);
    }
}
