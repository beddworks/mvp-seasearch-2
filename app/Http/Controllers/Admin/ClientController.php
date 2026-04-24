<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Inertia\Inertia;

class ClientController extends Controller
{
    public function index(Request $request)
    {
        $query = Client::with('user')->orderBy('created_at', 'desc');
        if ($request->filled('search')) {
            $query->where('company_name', 'like', '%' . $request->search . '%');
        }
        $clients = $query->paginate(20)->withQueryString();
        return Inertia::render('Admin/Clients/Index', [
            'clients' => $clients,
            'filters' => $request->only(['search']),
        ]);
    }

    public function create()
    {
        return Inertia::render('Admin/Clients/Form');
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'company_name'  => ['required', 'string', 'max:255'],
            'contact_name'  => ['required', 'string', 'max:255'],
            'contact_email' => ['required', 'email', 'unique:users,email'],
            'industry'      => ['nullable', 'string', 'max:100'],
            'accent_color'  => ['nullable', 'string', 'max:7'],
        ]);
        $user = User::create([
            'name'     => $data['contact_name'],
            'email'    => $data['contact_email'],
            'password' => Hash::make('password'),
            'role'     => 'client',
            'status'   => 'active',
        ]);
        Client::create([
            'user_id'       => $user->id,
            'company_name'  => $data['company_name'],
            'industry'      => $data['industry'] ?? null,
            'contact_name'  => $data['contact_name'],
            'contact_email' => $data['contact_email'],
            'accent_color'  => $data['accent_color'] ?? '#1A6DB5',
        ]);
        return redirect()->route('admin.clients.index')->with('success', 'Client created.');
    }

    public function show(string $id)
    {
        $client = Client::with(['user', 'mandates'])->findOrFail($id);
        return Inertia::render('Admin/Clients/Show', ['client' => $client]);
    }

    public function edit(string $id)
    {
        $client = Client::with('user')->findOrFail($id);
        return Inertia::render('Admin/Clients/Form', ['client' => $client]);
    }

    public function update(Request $request, string $id)
    {
        $client = Client::with('user')->findOrFail($id);
        $data = $request->validate([
            'company_name' => ['required', 'string', 'max:255'],
            'contact_name' => ['required', 'string', 'max:255'],
            'industry'     => ['nullable', 'string', 'max:100'],
            'accent_color' => ['nullable', 'string', 'max:7'],
        ]);
        $client->update([
            'company_name' => $data['company_name'],
            'contact_name' => $data['contact_name'],
            'industry'     => $data['industry'] ?? null,
            'accent_color' => $data['accent_color'] ?? null,
        ]);
        $client->user->update(['name' => $data['contact_name']]);
        return redirect()->route('admin.clients.index')->with('success', 'Client updated.');
    }

    public function destroy(string $id)
    {
        $client = Client::findOrFail($id);
        $client->user?->delete();
        $client->delete();
        return back()->with('success', 'Client deleted.');
    }
}
