<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\CompensationType;
use App\Models\User;
use App\Services\ClaudeService;
use App\Services\CvTextExtractor;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
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
        return Inertia::render('Admin/Clients/Form', [
            'compensationTypes' => CompensationType::where('is_active', true)->orderBy('sort_order')->get(['id', 'name', 'formula_type', 'platform_fee_pct', 'formula_fields']),
        ]);
    }

    /**
     * AI preview: parse an uploaded document and return extracted client + fee data.
     */
    public function aiPreview(Request $request)
    {
        $request->validate(['document' => ['required', 'file', 'mimes:pdf,doc,docx', 'max:10240']]);

        $extractor   = app(CvTextExtractor::class);
        $claude      = app(ClaudeService::class);

        $text = $extractor->extractFromUploadedFile($request->file('document'));

        if (empty(trim($text))) {
            return response()->json(['error' => 'Could not extract text from this document. Please try a different file.'], 422);
        }

        $existingTypes = CompensationType::where('is_active', true)
            ->get(['id', 'name', 'formula_type', 'platform_fee_pct', 'formula_fields'])
            ->map(fn($ct) => [
                'id'               => $ct->id,
                'name'             => $ct->name,
                'formula_type'     => $ct->formula_type,
                'platform_fee_pct' => $ct->platform_fee_pct,
                'formula_fields'   => $ct->formula_fields,
            ])
            ->toArray();

        $parsed = $claude->parseClientFromDocument($text, $existingTypes);

        return response()->json($parsed);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'company_name'         => ['required', 'string', 'max:255'],
            'contact_name'         => ['required', 'string', 'max:255'],
            'contact_email'        => ['required', 'email', 'unique:users,email'],
            'industry'             => ['nullable', 'string', 'max:100'],
            'accent_color'         => ['nullable', 'string', 'max:7'],
            'compensation_type_id' => ['nullable', 'exists:compensation_types,id'],
            'website'              => ['nullable', 'url', 'max:255'],
            'notes'                => ['nullable', 'string', 'max:1000'],
            // Inline new fee agreement
            'fee_mode'             => ['nullable', 'in:existing,new'],
            'fee_name'             => ['nullable', 'required_if:fee_mode,new', 'string', 'max:255'],
            'fee_formula_type'     => ['nullable', 'required_if:fee_mode,new', 'in:percentage,hourly,fixed,milestone'],
            'fee_pct'              => ['nullable', 'numeric', 'min:0', 'max:1'],
            'fee_formula_fields'   => ['nullable', 'array'],
            'agreement_file'       => ['nullable', 'file', 'mimes:pdf,doc,docx', 'max:10240'],
        ]);

        // Create inline fee agreement if requested
        $compensationTypeId = $data['compensation_type_id'] ?? null;
        if (($data['fee_mode'] ?? 'existing') === 'new' && !empty($data['fee_name'])) {
            $ct = CompensationType::create([
                'name'             => $data['fee_name'],
                'formula_type'     => $data['fee_formula_type'] ?? 'percentage',
                'platform_fee_pct' => $data['fee_pct'] ?? 0.20,
                'formula_fields'   => $data['fee_formula_fields'] ?? [],
                'is_active'        => true,
                'sort_order'       => 99,
            ]);
            $compensationTypeId = $ct->id;
        }

        $user = User::create([
            'name'     => $data['contact_name'],
            'email'    => $data['contact_email'],
            'password' => Hash::make(Str::random(24)),
            'role'     => 'client',
            'status'   => 'active',
        ]);

        $client = Client::create([
            'user_id'              => $user->id,
            'company_name'         => $data['company_name'],
            'industry'             => $data['industry'] ?? null,
            'contact_name'         => $data['contact_name'],
            'contact_email'        => $data['contact_email'],
            'accent_color'         => $data['accent_color'] ?? '#1A6DB5',
            'compensation_type_id' => $compensationTypeId,
            'website'              => $data['website'] ?? null,
            'notes'                => $data['notes'] ?? null,
        ]);

        if ($request->hasFile('agreement_file')) {
            $file = $request->file('agreement_file');
            $path = $file->store("agreements/{$client->id}", 'local');
            $client->update([
                'agreement_file_url'  => $path,
                'agreement_file_name' => $file->getClientOriginalName(),
            ]);
        }

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
        return Inertia::render('Admin/Clients/Form', [
            'client'            => $client,
            'compensationTypes' => CompensationType::where('is_active', true)->orderBy('sort_order')->get(['id', 'name', 'formula_type', 'platform_fee_pct', 'formula_fields']),
        ]);
    }

    public function update(Request $request, string $id)
    {
        $client = Client::with('user')->findOrFail($id);
        $data = $request->validate([
            'company_name'         => ['required', 'string', 'max:255'],
            'contact_name'         => ['required', 'string', 'max:255'],
            'industry'             => ['nullable', 'string', 'max:100'],
            'accent_color'         => ['nullable', 'string', 'max:7'],
            'compensation_type_id' => ['nullable', 'exists:compensation_types,id'],
            'website'              => ['nullable', 'url', 'max:255'],
            'notes'                => ['nullable', 'string', 'max:1000'],
            // Inline new fee agreement
            'fee_mode'             => ['nullable', 'in:existing,new'],
            'fee_name'             => ['nullable', 'required_if:fee_mode,new', 'string', 'max:255'],
            'fee_formula_type'     => ['nullable', 'required_if:fee_mode,new', 'in:percentage,hourly,fixed,milestone'],
            'fee_pct'              => ['nullable', 'numeric', 'min:0', 'max:1'],
            'fee_formula_fields'   => ['nullable', 'array'],
            'agreement_file'       => ['nullable', 'file', 'mimes:pdf,doc,docx', 'max:10240'],
        ]);

        $compensationTypeId = $data['compensation_type_id'] ?? null;
        if (($data['fee_mode'] ?? 'existing') === 'new' && !empty($data['fee_name'])) {
            $ct = CompensationType::create([
                'name'             => $data['fee_name'],
                'formula_type'     => $data['fee_formula_type'] ?? 'percentage',
                'platform_fee_pct' => $data['fee_pct'] ?? 0.20,
                'formula_fields'   => $data['fee_formula_fields'] ?? [],
                'is_active'        => true,
                'sort_order'       => 99,
            ]);
            $compensationTypeId = $ct->id;
        }

        $updatePayload = [
            'company_name'         => $data['company_name'],
            'contact_name'         => $data['contact_name'],
            'industry'             => $data['industry'] ?? null,
            'accent_color'         => $data['accent_color'] ?? null,
            'compensation_type_id' => $compensationTypeId,
            'website'              => $data['website'] ?? null,
            'notes'                => $data['notes'] ?? null,
        ];

        if ($request->hasFile('agreement_file')) {
            if ($client->agreement_file_url) {
                Storage::disk('local')->delete($client->agreement_file_url);
            }
            $file = $request->file('agreement_file');
            $updatePayload['agreement_file_url']  = $file->store("agreements/{$client->id}", 'local');
            $updatePayload['agreement_file_name'] = $file->getClientOriginalName();
        }

        $client->update($updatePayload);
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

    public function downloadAgreement(string $id)
    {
        $client = Client::findOrFail($id);
        abort_unless($client->agreement_file_url && Storage::disk('local')->exists($client->agreement_file_url), 404);
        return Storage::disk('local')->download($client->agreement_file_url, $client->agreement_file_name ?: 'agreement');
    }
}

