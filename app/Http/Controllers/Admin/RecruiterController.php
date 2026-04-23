<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Recruiter;
use Illuminate\Http\Request;
use Inertia\Inertia;

class RecruiterController extends Controller
{
    public function index(Request $request)
    {
        $query = Recruiter::with('user')->orderBy('created_at', 'desc');
        if ($request->filled('tier')) $query->where('tier', $request->tier);
        if ($request->filled('group')) $query->where('recruiter_group', $request->group);
        if ($request->filled('search')) {
            $query->whereHas('user', fn($q) => $q->where('name', 'like', '%' . $request->search . '%'));
        }
        $recruiters = $query->paginate(20)->withQueryString();
        return Inertia::render('Admin/Recruiters/Index', [
            'recruiters' => $recruiters,
            'filters'    => $request->only(['tier', 'group', 'search']),
            'stats'      => [
                'total'   => Recruiter::count(),
                'junior'  => Recruiter::where('tier', 'junior')->count(),
                'senior'  => Recruiter::where('tier', 'senior')->count(),
                'elite'   => Recruiter::where('tier', 'elite')->count(),
                'trusted' => Recruiter::where('trust_level', 'trusted')->count(),
            ],
        ]);
    }

    public function show(string $id)
    {
        $recruiter = Recruiter::with(['user', 'claims.mandate.client'])->findOrFail($id);
        return Inertia::render('Admin/Recruiters/Show', ['recruiter' => $recruiter]);
    }

    public function update(Request $request, string $id)
    {
        $recruiter = Recruiter::findOrFail($id);
        $data = $request->validate([
            'tier'            => ['in:junior,senior,elite'],
            'trust_level'     => ['in:standard,trusted'],
            'recruiter_group' => ['nullable', 'in:Dwikar,Emma,BTI,Jiebei'],
            'status'          => ['in:active,pending,suspended'],
        ]);
        $recruiter->update($data);
        if ($request->filled('status') && $recruiter->user) {
            $recruiter->user->update(['status' => $data['status']]);
        }
        return back()->with('success', 'Recruiter updated.');
    }
}
