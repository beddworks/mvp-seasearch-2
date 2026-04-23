<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\CompensationType;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CompensationTypeController extends Controller
{
    public function index()
    {
        return Inertia::render('Admin/CompensationTypes/Index', [
            'types' => CompensationType::orderBy('created_at', 'desc')->get(),
        ]);
    }

    public function create()
    {
        return Inertia::render('Admin/CompensationTypes/Form');
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'           => ['required', 'string', 'max:255'],
            'formula_type'   => ['required', 'in:percentage,hourly,fixed,milestone'],
            'notes'          => ['nullable', 'string'],
            'formula_fields' => ['required', 'array'],
            'is_active'      => ['boolean'],
        ]);
        CompensationType::create($data);
        return redirect()->route('admin.compensation-types.index')->with('success', 'Compensation type created.');
    }

    public function edit(string $id)
    {
        return Inertia::render('Admin/CompensationTypes/Form', [
            'type' => CompensationType::findOrFail($id),
        ]);
    }

    public function update(Request $request, string $id)
    {
        $type = CompensationType::findOrFail($id);
        $data = $request->validate([
            'name'           => ['required', 'string', 'max:255'],
            'formula_type'   => ['required', 'in:percentage,hourly,fixed,milestone'],
            'notes'          => ['nullable', 'string'],
            'formula_fields' => ['required', 'array'],
            'is_active'      => ['boolean'],
        ]);
        $type->update($data);
        return redirect()->route('admin.compensation-types.index')->with('success', 'Updated.');
    }

    public function destroy(string $id)
    {
        CompensationType::findOrFail($id)->delete();
        return back()->with('success', 'Deleted.');
    }
}
