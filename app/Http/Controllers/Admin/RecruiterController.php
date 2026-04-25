<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Recruiter;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
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

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'            => ['required', 'string', 'max:255'],
            'email'           => ['required', 'email', 'unique:users,email'],
            'password'        => ['required', 'string', 'min:8'],
            'tier'            => ['required', 'in:junior,senior,elite'],
            'trust_level'     => ['required', 'in:standard,trusted'],
            'recruiter_group' => ['nullable', 'in:Dwikar,Emma,BTI,Jiebei'],
        ]);

        $user = User::create([
            'name'     => $data['name'],
            'email'    => $data['email'],
            'password' => Hash::make($data['password']),
            'role'     => 'recruiter',
            'status'   => 'active',
        ]);

        Recruiter::create([
            'user_id'         => $user->id,
            'tier'            => $data['tier'],
            'trust_level'     => $data['trust_level'],
            'recruiter_group' => $data['recruiter_group'] ?? null,
        ]);

        return redirect()->route('admin.recruiters.index')->with('success', 'Recruiter created.');
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

    public function destroy(string $id)
    {
        $recruiter = Recruiter::with('user')->findOrFail($id);
        $user = $recruiter->user;
        $recruiter->delete();
        if ($user) $user->delete();
        return redirect()->route('admin.recruiters.index')->with('success', 'Recruiter deleted.');
    }
}
