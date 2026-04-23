<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Mandate;
use App\Models\Client;
use App\Models\CompensationType;
use Illuminate\Http\Request;
use Inertia\Inertia;

class MandateController extends Controller
{
    public function index(Request $request)
    {
        $query = Mandate::with(['client'])->orderBy('created_at', 'desc');
        if ($request->filled('status')) $query->where('status', $request->status);
        if ($request->filled('search')) $query->where('title', 'like', '%' . $request->search . '%');
        $mandates = $query->paginate(20)->withQueryString();
        return Inertia::render('Admin/Mandates/Index', [
            'mandates' => $mandates,
            'filters'  => $request->only(['status', 'search']),
            'stats'    => [
                'total'   => Mandate::count(),
                'active'  => Mandate::where('status', 'active')->count(),
                'filled'  => Mandate::where('status', 'filled')->count(),
                'dropped' => Mandate::where('status', 'dropped')->count(),
            ],
        ]);
    }

    public function create()
    {
        return Inertia::render('Admin/Mandates/Form', [
            'clients'            => Client::orderBy('company_name')->get(['id', 'company_name']),
            'compensation_types' => CompensationType::where('is_active', true)->get(['id', 'name', 'formula_type']),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'title'                => ['required', 'string', 'max:255'],
            'client_id'            => ['required', 'exists:clients,id'],
            'compensation_type_id' => ['nullable', 'exists:compensation_types,id'],
            'location'             => ['nullable', 'string', 'max:255'],
            'seniority'            => ['nullable', 'in:c_suite,vp_director,manager,ic'],
            'industry'             => ['nullable', 'string', 'max:100'],
            'salary_min'           => ['nullable', 'numeric'],
            'salary_max'           => ['nullable', 'numeric'],
            'salary_currency'      => ['nullable', 'string', 'max:3'],
            'description'          => ['nullable', 'string'],
            'is_fast_track'        => ['boolean'],
            'timer_b_active'       => ['boolean'],
            'timer_c_active'       => ['boolean'],
        ]);
        $data['status'] = 'draft';
        Mandate::create($data);
        return redirect()->route('admin.mandates.index')->with('success', 'Mandate created.');
    }

    public function show(string $id)
    {
        $mandate = Mandate::with([
            'client',
            'compensationType',
            'claims.recruiter.user',
            'submissions.candidate',
            'submissions.recruiter.user',
        ])->findOrFail($id);
        return Inertia::render('Admin/Mandates/Show', ['mandate' => $mandate]);
    }

    public function edit(string $id)
    {
        return Inertia::render('Admin/Mandates/Form', [
            'mandate'            => Mandate::findOrFail($id),
            'clients'            => Client::orderBy('company_name')->get(['id', 'company_name']),
            'compensation_types' => CompensationType::where('is_active', true)->get(['id', 'name', 'formula_type']),
        ]);
    }

    public function update(Request $request, string $id)
    {
        $mandate = Mandate::findOrFail($id);
        $data = $request->validate([
            'title'                => ['required', 'string', 'max:255'],
            'client_id'            => ['required', 'exists:clients,id'],
            'compensation_type_id' => ['nullable', 'exists:compensation_types,id'],
            'location'             => ['nullable', 'string', 'max:255'],
            'seniority'            => ['nullable', 'in:c_suite,vp_director,manager,ic'],
            'industry'             => ['nullable', 'string', 'max:100'],
            'salary_min'           => ['nullable', 'numeric'],
            'salary_max'           => ['nullable', 'numeric'],
            'salary_currency'      => ['nullable', 'string', 'max:3'],
            'description'          => ['nullable', 'string'],
            'requirements'         => ['nullable', 'string'],
            'status'               => ['in:draft,active,paused,closed,filled,dropped'],
            'is_fast_track'        => ['boolean'],
            'timer_b_active'       => ['boolean'],
            'timer_c_active'       => ['boolean'],
        ]);
        $mandate->update($data);
        return redirect()->route('admin.mandates.index')->with('success', 'Mandate updated.');
    }

    public function destroy(string $id)
    {
        Mandate::findOrFail($id)->delete();
        return back()->with('success', 'Mandate deleted.');
    }
}
