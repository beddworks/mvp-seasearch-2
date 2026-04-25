<?php

namespace App\Jobs;

use App\Models\Candidate;
use App\Models\CddSubmission;
use App\Models\Mandate;
use App\Services\ClaudeService;
use App\Services\CvTextExtractor;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Parse a candidate's CV text + score them against a mandate.
 * Dispatched after addCandidate when a CV file is uploaded.
 *
 * Updates:
 *  - candidates.parsed_profile, skills, years_experience, cv_parsed_at
 *  - cdd_submissions.ai_score, score_breakdown, green_flags, red_flags, ai_summary
 */
class ParseCvJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 2;
    public int $timeout = 90;

    public function __construct(
        public Candidate $candidate,
        public string    $mandateId,
    ) {
    }

    public function handle(ClaudeService $claude, CvTextExtractor $extractor): void
    {
        try {
            // ── 1. Extract CV text ──────────────────────────────────────────
            $cvText = $extractor->extractFromStoredUrl($this->candidate->cv_url, (string) $this->candidate->id);

            if (empty($cvText)) {
                Log::warning('ParseCvJob: no CV text', ['candidate_id' => $this->candidate->id]);
                return;
            }

            // ── 2. Parse CV into structured profile ─────────────────────────
            $mandate = Mandate::find($this->mandateId);
            $parsed  = $claude->parseCV($cvText, $mandate);

            if (!empty($parsed)) {
                $this->candidate->update([
                    'parsed_profile'  => $parsed,
                    'skills'          => $parsed['skills']           ?? $this->candidate->skills,
                    'years_experience'=> $parsed['years_experience'] ?? $this->candidate->years_experience,
                    'cv_parsed_at'    => now(),
                ]);
            }

            // ── 3. Score candidate against mandate ──────────────────────────
            if (!$mandate) {
                Log::warning('ParseCvJob: mandate not found', ['mandate_id' => $this->mandateId]);
                return;
            }

            $this->candidate->refresh();
            $scoring = $claude->scoreCandidate($this->candidate, $mandate);

            if (!empty($scoring['ai_score'])) {
                // Save scores to candidates table for quick reference
                $this->candidate->update([
                    'ai_score'        => $scoring['ai_score'],
                    'score_breakdown' => $scoring['score_breakdown'],
                    'green_flags'     => $scoring['green_flags'],
                    'red_flags'       => $scoring['red_flags'],
                    'ai_summary'      => $scoring['ai_summary'],
                ]);

                // Save scores to submission record for mandate tracking
                CddSubmission::where('mandate_id', $this->mandateId)
                    ->where('candidate_id', $this->candidate->id)
                    ->orderByDesc('created_at')
                    ->first()
                    ?->update([
                        'ai_score'        => $scoring['ai_score'],
                        'score_breakdown' => $scoring['score_breakdown'],
                        'green_flags'     => $scoring['green_flags'],
                        'red_flags'       => $scoring['red_flags'],
                        'ai_summary'      => $scoring['ai_summary'],
                    ]);
            }
        } catch (\Throwable $e) {
            Log::error('ParseCvJob failed', [
                'candidate_id' => $this->candidate->id,
                'mandate_id'   => $this->mandateId,
                'error'        => $e->getMessage(),
            ]);
            throw $e;
        }
    }
}
