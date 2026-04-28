<?php

namespace App\Services;

use App\Models\Candidate;
use App\Models\Mandate;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * AI service powered by OpenRouter (claude-sonnet-4-5 via openai-compatible API).
 *
 * Methods:
 *  parseCV()                 → extract structured data from raw CV text
 *  scoreCandidate()          → score candidate 0-100 against a mandate
 *  generateBrief()           → AI mandate brief
 *  draftOutreach()           → outreach email draft
 *  generateInterviewQuestions() → interview questions for a candidate
 */
class ClaudeService
{
    private string $apiKey;
    private string $model;
    private string $baseUrl = 'https://openrouter.ai/api/v1';

    public function __construct()
    {
        $this->apiKey = config('services.openrouter.api_key', '');
        $this->model  = config('services.openrouter.model', 'anthropic/claude-sonnet-4-5');
    }

    // ── Core HTTP call ───────────────────────────────────────────────────────

    private function chat(string $system, string $user, int $maxTokens = 1500): ?string
    {
        if (empty($this->apiKey)) {
            Log::warning('ClaudeService: OPENROUTER_API_KEY is not set.');
            return null;
        }

        try {
            $system = $this->sanitizeUtf8($system);
            $user   = $this->sanitizeUtf8($user);

            $response = Http::timeout(60)
                ->withHeaders([
                    'Authorization' => 'Bearer ' . $this->apiKey,
                    'Content-Type'  => 'application/json',
                    'HTTP-Referer'  => config('app.url', 'https://seasearch.asia'),
                    'X-Title'       => 'Sea Search',
                ])
                ->post($this->baseUrl . '/chat/completions', [
                    'model'      => $this->model,
                    'max_tokens' => $maxTokens,
                    'messages'   => [
                        ['role' => 'system', 'content' => $system],
                        ['role' => 'user',   'content' => $user],
                    ],
                ]);

            if ($response->failed()) {
                Log::error('ClaudeService HTTP error', [
                    'status' => $response->status(),
                    'body'   => $response->body(),
                ]);
                return null;
            }

            return $response->json('choices.0.message.content');
        } catch (\Throwable $e) {
            Log::error('ClaudeService exception', ['error' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * Ensure strings sent to JSON payloads are valid UTF-8.
     * CV extraction can contain binary/control bytes from PDFs/DOCs.
     */
    private function sanitizeUtf8(string $text): string
    {
        if ($text === '') {
            return $text;
        }

        // Drop NUL bytes and normalize line endings early.
        $text = str_replace("\0", ' ', $text);
        $text = str_replace(["\r\n", "\r"], "\n", $text);

        // If input is not valid UTF-8, try common source encodings first.
        if (function_exists('mb_check_encoding') && !mb_check_encoding($text, 'UTF-8')) {
            if (function_exists('mb_convert_encoding')) {
                $text = mb_convert_encoding($text, 'UTF-8', 'UTF-8, ISO-8859-1, Windows-1252, ASCII');
            } elseif (function_exists('iconv')) {
                $text = @iconv('UTF-8', 'UTF-8//IGNORE', $text) ?: '';
            }
        } elseif (function_exists('iconv')) {
            // Keep valid text but strip occasional illegal bytes quietly.
            $text = @iconv('UTF-8', 'UTF-8//IGNORE', $text) ?: $text;
        }

        // Remove non-printable control chars except tab/newline/carriage return.
        $text = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', ' ', $text) ?? '';
        $text = preg_replace('/\n{3,}/', "\n\n", $text) ?? '';

        return trim($text);
    }

    /** Safely decode JSON from model output, stripping markdown fences if present. */
    private function decodeJson(string $text): ?array
    {
        $text = trim($text);
        // Strip ```json ... ``` or ``` ... ``` fences
        $text = preg_replace('/^```(?:json)?\s*/i', '', $text);
        $text = preg_replace('/\s*```$/', '', $text);

        $decoded = json_decode(trim($text), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            Log::warning('ClaudeService: JSON decode failed', ['raw' => substr($text, 0, 300)]);
            return null;
        }
        return $decoded;
    }

    // ── Public methods ───────────────────────────────────────────────────────

    /**
     * Parse raw CV text into a structured profile.
     * Returns array with keys: name, current_role, current_company,
     *   years_experience, skills, education, summary.
     */
    public function parseCV(string $cvText, ?Mandate $mandate = null): array
    {
        $context = $mandate
            ? "\n\nRole being considered: {$mandate->title} at a {$mandate->industry} company."
            : '';

        $system = 'You are a professional executive recruiter assistant. Extract structured data from CV text. Always respond with valid JSON only — no prose, no markdown fences.';

        $user = "Parse the following CV and return a JSON object with these keys:
- name (string)
- current_role (string)
- current_company (string)
- years_experience (integer)
- location (string)
- skills (array of strings, max 15)
- education (array of objects with: degree, institution, year)
- career_history (array of objects with: title, company, years)
- summary (string, 2-3 sentences, executive-level tone)
{$context}

CV:
{$cvText}";

        $raw = $this->chat($system, $user, 1200);
        if (!$raw) return [];

        return $this->decodeJson($raw) ?? [];
    }

    /**
     * Parse JD / mandate text into admin mandate form fields.
     * Returns array with keys: title, location, seniority, industry,
     *   salary_min, salary_max, salary_currency, description.
     */
    public function parseMandateFromDocumentText(string $jdText): array
    {
        $system = 'You are a professional executive search analyst. Extract structured mandate fields from job description text. Always respond with valid JSON only - no prose, no markdown fences.';

        $user = "Parse this job description and return a JSON object with these exact keys:
- title (string)
- location (string)
- seniority (one of: c_suite, vp_director, manager, ic, or null)
- industry (string)
- salary_min (number or null)
- salary_max (number or null)
- salary_currency (3-letter currency code like SGD, USD, MYR, or null)
- contract_type (one of: full_time, contract, part_time, or null)
- openings_count (integer, default 1, or null)
- description (string — a comprehensive, well-structured role overview formatted as plain text with section headers):

  ROLE OVERVIEW
  [2-3 sentence summary of the role, company context, and key purpose]

  KEY RESPONSIBILITIES
  • [responsibility 1]
  • [add all responsibilities found]

  COMPENSATION
  [Salary range and benefits details]

  Rules for description: plain text only, no markdown, no asterisks, no #.

- must_haves (array of strings — hard must-have requirements, max 8 items, each a concise bullet like \"20+ years HR leadership\")
- nice_to_haves (array of strings — preferred but not required qualifications, max 6 items)
- green_flags (array of strings — positive candidate signals to look for, max 6 items, starting with the positive trait e.g. \"Regional SEA experience across 5+ markets\")
- red_flags (array of strings — disqualifying candidate signals, max 6 items, e.g. \"No board-level stakeholder exposure\")
- screening_questions (array of strings — questions recruiters must ask candidates before submission, max 8 items, e.g. \"Confirm your right to work in Singapore\")
- ideal_candidates (array of objects with keys \"name\" and \"title\" — reference benchmark candidates mentioned or strongly implied in the JD, max 5; use empty array [] if none mentioned or implied)
- ideal_source_companies (array of strings — companies to source candidates from based on the role requirements, max 10 items)

Rules:
- If a field is not present or cannot be inferred, return null for scalars or [] for arrays.
- Keep seniority strictly to the allowed values.
- Output JSON object only.

JOB DESCRIPTION:
{$jdText}";

        $raw = $this->chat($system, $user, 2000);
        if (!$raw) return [];

        return $this->decodeJson($raw) ?? [];
    }

    /**
     * Score a candidate against a mandate.
     * Returns: { ai_score: int, score_breakdown: array, green_flags: array, red_flags: array, ai_summary: string }
     */
    public function scoreCandidate(Candidate $candidate, Mandate $mandate): array
    {
        $profile = $candidate->parsed_profile ?? [];
        $skills  = $candidate->skills ?? [];

        $cvSummary = implode("\n", array_filter([
            "Name: {$candidate->first_name} {$candidate->last_name}",
            "Current role: {$candidate->current_role}",
            "Company: {$candidate->current_company}",
            "Experience: " . ($candidate->years_experience ?? 'Unknown') . ' years',
            "Skills: " . implode(', ', $skills),
            "Summary: " . ($profile['summary'] ?? ''),
        ]));

        $mustHaves  = implode("\n- ", $mandate->must_haves   ?? []);
        $niceHaves  = implode("\n- ", $mandate->nice_to_haves ?? []);
        $greenFlags = implode("\n- ", $mandate->green_flags   ?? []);
        $redFlags   = implode("\n- ", $mandate->red_flags     ?? []);

        $system = 'You are a senior executive search consultant. Score candidates against job mandates. Always respond with valid JSON only — no prose, no markdown fences.';

        $user = "Score this candidate against the mandate and return a JSON object with these exact keys:
- ai_score (integer 0–100, weighted average of breakdown dimensions)
- score_breakdown (object with integer values 0–100): { experience, industry_fit, scope_match, leadership }
- green_flags (array of strings, max 5, each starting with \"✓\")
- red_flags (array of strings, max 5, each starting with \"⚠\")
- ai_summary (string, 3–4 sentences, executive tone, explaining the fit)

MANDATE: {$mandate->title}
Industry: {$mandate->industry}
Seniority: {$mandate->seniority}
Must-haves:
- {$mustHaves}
Nice-to-haves:
- {$niceHaves}
Green flags to look for:
- {$greenFlags}
Red flags to watch:
- {$redFlags}

CANDIDATE:
{$cvSummary}";

        $raw = $this->chat($system, $user, 1000);

        $defaults = [
            'ai_score'        => 0,
            'score_breakdown' => ['experience' => 0, 'industry_fit' => 0, 'scope_match' => 0, 'leadership' => 0],
            'green_flags'     => [],
            'red_flags'       => [],
            'ai_summary'      => '',
        ];

        if (!$raw) return $defaults;

        $data = $this->decodeJson($raw);
        return $data ? array_merge($defaults, $data) : $defaults;
    }

    /**
     * Generate a recruiter-facing mandate brief.
     * Returns a formatted markdown string.
     */
    public function generateBrief(Mandate $mandate): string
    {
        $system = 'You are a senior executive search consultant. Write compelling, concise mandate briefs for recruiters.';

        $must  = implode(', ', $mandate->must_haves   ?? []);
        $desc  = $mandate->description ?? '';
        $ind   = $mandate->industry    ?? '';
        $sen   = $mandate->seniority   ?? '';

        $user = "Write a recruiter-facing brief for this mandate (300–400 words, professional tone, no headers):

Title: {$mandate->title}
Industry: {$ind}
Seniority: {$sen}
Salary: {$mandate->salary_currency} {$mandate->salary_min}–{$mandate->salary_max}
Description: {$desc}
Must-haves: {$must}";

        return $this->chat($system, $user, 800) ?? '';
    }

    /**
     * Draft a candidate outreach email.
     * Returns the email body as a string.
     */
    public function draftOutreach(Candidate $candidate, Mandate $mandate): string
    {
        $system = 'You are a professional executive recruiter. Write concise, personalised candidate outreach emails (150–200 words). Do not include a subject line, just the email body.';

        $user = "Draft an outreach email to this candidate for the following role:

Candidate: {$candidate->first_name} {$candidate->last_name}, {$candidate->current_role} at {$candidate->current_company}
Role: {$mandate->title}
Industry: {$mandate->industry}
Location: {$mandate->location}
Compensation: {$mandate->salary_currency} {$mandate->salary_min}–{$mandate->salary_max}

Keep it professional, personalised, and concise. Do not name the client company.";

        return $this->chat($system, $user, 600) ?? '';
    }

    /**
     * Parse a client document (fee agreement, company profile, LOE, proposal, etc.)
     * into structured client form fields + a fee agreement recommendation.
     *
     * @param  string  $docText         Full extracted text from the PDF/DOC
     * @param  array   $existingTypes   Existing compensation types [{id, name, formula_type, platform_fee_pct, formula_fields}]
     * @return array
     */
    public function parseClientFromDocument(string $docText, array $existingTypes = []): array
    {
        $typesJson = json_encode($existingTypes, JSON_UNESCAPED_SLASHES);

        $system = 'You are a senior executive search analyst specialising in fee agreements and client onboarding. Extract structured client data from documents (fee agreements, LOEs, proposals, company briefs, contracts). Always respond with valid JSON only — no prose, no markdown fences.';

        $user = "Analyse the following document and return a JSON object with these exact keys:

CLIENT INFO:
- company_name (string or null)
- industry (string or null — e.g. Finance, Technology, Healthcare, FMCG, Consulting)
- contact_name (string or null — primary contact person)
- contact_email (string or null)
- website (string or null)
- notes (string or null — any important onboarding notes, special terms, or context)
- ai_summary (string — 2-3 sentence executive summary of this document and what it implies about the client)
- confidence (\"high\"|\"medium\"|\"low\" — overall confidence in extracted data)

FEE AGREEMENT:
- fee_agreement (object with these keys):
  - reasoning (string — explain exactly what fee terms were found in the document and why you recommend this structure)
  - recommended_formula_type (\"percentage\"|\"hourly\"|\"fixed\"|\"milestone\" — which formula type best matches the document)
  - platform_fee_pct (number 0-1 or null — e.g. 0.20 for 20%; only if percentage type)
  - formula_fields (object — for hourly: {hourly_rate, hours_billed}; for fixed: {fixed_amount}; for milestone: {milestones: [{name, amount}]})
  - suggested_name (string — a short name for this fee agreement, e.g. \"Standard 20% Contingency\")
  - key_terms (array of strings — 3-5 key fee terms extracted from the document, e.g. \"20% of first year salary\", \"30-day replacement guarantee\")
  - confidence (\"high\"|\"medium\"|\"low\")
  - matched_type_id (string or null — if one of the existing types below is a close match, return its id; otherwise null)
  - matched_type_name (string or null — name of matched type if matched_type_id is set)

EXISTING FEE STRUCTURES TO MATCH AGAINST:
{$typesJson}

If the document doesn't contain fee terms, set fee_agreement.confidence to \"low\" and still recommend the most suitable formula type based on the industry/context.

DOCUMENT:
{$docText}";

        $defaults = [
            'company_name'  => null,
            'industry'      => null,
            'contact_name'  => null,
            'contact_email' => null,
            'website'       => null,
            'notes'         => null,
            'ai_summary'    => '',
            'confidence'    => 'medium',
            'fee_agreement' => [
                'reasoning'                => 'Unable to determine fee terms from document.',
                'recommended_formula_type' => 'percentage',
                'platform_fee_pct'         => 0.20,
                'formula_fields'           => [],
                'suggested_name'           => 'Standard 20% Contingency',
                'key_terms'                => [],
                'confidence'               => 'low',
                'matched_type_id'          => null,
                'matched_type_name'        => null,
            ],
        ];

        $raw = $this->chat($system, $user, 1800);
        if (!$raw) return $defaults;

        $data = $this->decodeJson($raw);
        if (!$data) return $defaults;

        // Deep merge fee_agreement
        if (isset($data['fee_agreement']) && is_array($data['fee_agreement'])) {
            $data['fee_agreement'] = array_merge($defaults['fee_agreement'], $data['fee_agreement']);
        } else {
            $data['fee_agreement'] = $defaults['fee_agreement'];
        }

        return array_merge($defaults, $data);
    }

    /**
     * Generate interview questions tailored to the candidate + mandate.
     * Returns an array of question strings.
     */
    public function generateInterviewQuestions(Candidate $candidate, Mandate $mandate): array
    {
        $system = 'You are a senior executive search consultant. Generate sharp, targeted interview questions. Always respond with valid JSON only — no prose, no markdown fences.';

        $user = "Generate 8 interview questions for this candidate for the following role. Return a JSON array of strings only.

Candidate: {$candidate->first_name} {$candidate->last_name}, {$candidate->current_role} at {$candidate->current_company}
Mandate: {$mandate->title} ({$mandate->industry}, {$mandate->seniority})
Must-haves: " . implode(', ', $mandate->must_haves ?? []) . "
Red flags to probe: " . implode(', ', $mandate->red_flags ?? []);

        $raw = $this->chat($system, $user, 800);
        if (!$raw) return [];

        $result = $this->decodeJson($raw);
        return is_array($result) ? $result : [];
    }
}
