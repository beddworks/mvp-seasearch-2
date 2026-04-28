<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\CddSubmission;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Response;
use App\Services\GoogleSheetsService;
use Symfony\Component\HttpFoundation\StreamedResponse;

class FeedbackController extends Controller
{
    public function show(string $token)
    {
        [$submission, $mandate, $submissions] = $this->resolveReviewContext($token);

        $this->touchToken($submission);

        return response()->view('feedback.review', [
            'token' => $token,
            'mandate' => $mandate,
            'client' => $mandate->client,
            'submissions' => $submissions,
            'stageOptions' => ['sourced', 'screened', 'interview', 'offered', 'hired', 'rejected', 'on_hold'],
            'flashMessage' => session('success'),
        ]);
    }

    public function update(Request $request, string $token, GoogleSheetsService $sheets)
    {
        [$submission, $mandate] = $this->resolveReviewContext($token);

        $data = $request->validate([
            'submission_id' => 'required|string|exists:cdd_submissions,id',
            'client_status' => 'required|in:sourced,screened,interview,offered,hired,rejected,on_hold',
            'client_feedback' => 'nullable|string|max:2000',
        ]);

        if ($data['client_status'] === 'rejected' && blank($data['client_feedback'] ?? null)) {
            return redirect()->route('feedback.show', $token)->withErrors([
                'client_feedback' => 'Please provide a reason when marking a candidate as rejected.',
            ]);
        }

        $target = CddSubmission::where('id', $data['submission_id'])
            ->where('mandate_id', $mandate->id)
            ->firstOrFail();

        $target->update([
            'client_status' => $data['client_status'],
            'client_status_updated_at' => now(),
            'client_feedback' => $data['client_feedback'] ?: $target->client_feedback,
        ]);

        $sheets->addOrUpdateRow($target->fresh(['candidate', 'mandate.client', 'recruiter.user']));

        $this->touchToken($submission);

        return redirect()->route('feedback.show', $token)->with('success', 'Candidate status updated.');
    }

    public function quickUpdate(Request $request, string $token, GoogleSheetsService $sheets)
    {
        [$submission, $mandate] = $this->resolveReviewContext($token);

        $data = $request->validate([
            'submission_id' => 'required|string|exists:cdd_submissions,id',
            'client_status' => 'required|in:sourced,screened,interview,offered,hired,rejected,on_hold',
            'client_feedback' => 'nullable|string|max:2000',
        ]);

        if ($data['client_status'] === 'rejected' && blank($data['client_feedback'] ?? null)) {
            return redirect()->route('feedback.show', $token)->withErrors([
                'client_feedback' => 'Please provide a reason when marking a candidate as rejected.',
            ]);
        }

        $target = CddSubmission::where('id', $data['submission_id'])
            ->where('mandate_id', $mandate->id)
            ->firstOrFail();

        $target->update([
            'client_status' => $data['client_status'],
            'client_status_updated_at' => now(),
            'client_feedback' => $data['client_feedback'] ?: $target->client_feedback,
        ]);

        $sheets->addOrUpdateRow($target->fresh(['candidate', 'mandate.client', 'recruiter.user']));

        $this->touchToken($submission);

        return redirect()->route('feedback.show', $token)->with('success', 'Candidate stage updated from email action.');
    }

    public function export(string $token): StreamedResponse
    {
        [$submission, $mandate, $submissions] = $this->resolveReviewContext($token);

        $this->touchToken($submission);

        $filename = 'seasearch-' . str($mandate->title)->slug('-') . '-candidates.csv';

        return Response::streamDownload(function () use ($submissions) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['Candidate', 'Role', 'Company', 'Email', 'LinkedIn', 'AI Score', 'Stage', 'Recruiter Note', 'AI Summary', 'Green Flags', 'Red Flags', 'Submitted At']);

            foreach ($submissions as $row) {
                fputcsv($handle, [
                    trim(($row->candidate->first_name ?? '') . ' ' . ($row->candidate->last_name ?? '')),
                    $row->candidate->current_role,
                    $row->candidate->current_company,
                    $row->candidate->email,
                    $row->candidate->linkedin_url,
                    $row->ai_score,
                    $row->client_status,
                    $row->recruiter_note,
                    $row->ai_summary,
                    implode(' | ', $row->green_flags ?? []),
                    implode(' | ', $row->red_flags ?? []),
                    optional($row->submitted_at)->toDateTimeString(),
                ]);
            }

            fclose($handle);
        }, $filename, ['Content-Type' => 'text/csv']);
    }

    private function resolveReviewContext(string $token): array
    {
        $submission = CddSubmission::with(['mandate.client', 'candidate', 'recruiter.user'])
            ->where('token', $token)
            ->firstOrFail();

        $mandate = $submission->mandate;

        $submissions = CddSubmission::with(['candidate', 'recruiter.user'])
            ->where('mandate_id', $mandate->id)
            ->orderByDesc('submitted_at')
            ->get();

        return [$submission, $mandate, $submissions];
    }

    private function touchToken(CddSubmission $submission): void
    {
        if (!$submission->token_used_at) {
            $submission->forceFill(['token_used_at' => now()])->save();
        }
    }
}
