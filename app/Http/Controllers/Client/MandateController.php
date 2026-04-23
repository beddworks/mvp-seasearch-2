<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\Mandate;
use Illuminate\Http\Request;
use Inertia\Inertia;

class MandateController extends Controller
{
    private function clientOrAbort()
    {
        $client = auth()->user()->client;
        abort_unless($client, 403, 'No client profile found for this account.');
        return $client;
    }

    public function index()
    {
        $client = $this->clientOrAbort();

        $mandates = Mandate::with([
            'claims.recruiter.user',
            'submissions.candidate',
        ])
        ->where('client_id', $client->id)
        ->orderBy('created_at', 'desc')
        ->get()
        ->map(function ($m) {
            return [
                'id'               => $m->id,
                'title'            => $m->title,
                'status'           => $m->status,
                'location'         => $m->location,
                'seniority'        => $m->seniority,
                'openings_count'   => $m->openings_count ?? 1,
                'is_fast_track'    => $m->is_fast_track,
                'created_at'       => $m->created_at,
                'published_at'     => $m->published_at,
                'claims_count'     => $m->claims->count(),
                'approved_claim'   => $m->claims->firstWhere('status', 'approved') ? [
                    'recruiter_name' => $m->claims->firstWhere('status', 'approved')->recruiter?->user?->name,
                    'assigned_at'    => $m->claims->firstWhere('status', 'approved')->assigned_at,
                ] : null,
                'submissions_count'  => $m->submissions->count(),
                'hired_count'        => $m->submissions->where('client_status', 'hired')->count(),
                'pending_review'     => $m->submissions->where('admin_review_status', 'pending')->count(),
            ];
        });

        return Inertia::render('Client/Mandates/Index', [
            'mandates' => $mandates,
            'client'   => $client,
            'stats'    => [
                'total'  => $mandates->count(),
                'active' => $mandates->where('status', 'active')->count(),
                'filled' => $mandates->where('status', 'filled')->count(),
            ],
        ]);
    }

    public function show(string $id)
    {
        $client = $this->clientOrAbort();

        $mandate = Mandate::with([
            'claims.recruiter.user',
            'submissions.candidate',
            'submissions.recruiter.user',
            'compensationType',
        ])
        ->where('client_id', $client->id)
        ->findOrFail($id);

        return Inertia::render('Client/Mandates/Show', [
            'mandate' => $mandate,
            'client'  => $client,
        ]);
    }
}
