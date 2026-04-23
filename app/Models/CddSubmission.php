<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class CddSubmission extends Model
{
    public $incrementing = false;
    protected $keyType   = 'string';

    protected $fillable = [
        'id', 'mandate_id', 'recruiter_id', 'candidate_id',
        'submission_number', 'recruiter_note',
        'ai_score', 'score_breakdown', 'ai_summary',
        'green_flags', 'red_flags',
        'admin_review_status', 'admin_reviewed_by', 'admin_reviewed_at',
        'admin_note', 'admin_rejection_count', 'exception_bypass',
        'client_status', 'client_status_updated_at', 'client_rejection_reason',
        'interview_date', 'interview_format', 'interview_notes',
        'interview_feedback', 'interview_feedback_stars', 'interview_verdict',
        'client_feedback', 'client_feedback_sentiment',
        'token', 'token_created_at', 'token_used_at',
        'gsheet_row_index', 'penalty_applied', 'days_late', 'submitted_at',
    ];

    protected $casts = [
        'score_breakdown'           => 'array',
        'green_flags'               => 'array',
        'red_flags'                 => 'array',
        'exception_bypass'          => 'boolean',
        'submitted_at'              => 'datetime',
        'admin_reviewed_at'         => 'datetime',
        'client_status_updated_at'  => 'datetime',
        'interview_date'            => 'datetime',
        'token_created_at'          => 'datetime',
        'token_used_at'             => 'datetime',
        'ai_score'                  => 'integer',
        'submission_number'         => 'integer',
        'admin_rejection_count'     => 'integer',
        'interview_feedback_stars'  => 'integer',
        'gsheet_row_index'          => 'integer',
        'days_late'                 => 'integer',
        'penalty_applied'           => 'decimal:4',
    ];

    protected static function boot(): void
    {
        parent::boot();
        static::creating(fn($m) => $m->id ??= (string) Str::uuid());
    }

    public function mandate()    { return $this->belongsTo(Mandate::class); }
    public function recruiter()  { return $this->belongsTo(Recruiter::class); }
    public function candidate()  { return $this->belongsTo(Candidate::class); }
    public function claim()      { return $this->belongsTo(MandateClaim::class, 'mandate_claim_id'); }
}
