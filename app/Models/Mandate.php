<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Mandate extends Model
{
    public $incrementing = false;
    protected $keyType   = 'string';

    protected $fillable = [
        'id', 'client_id', 'posted_by_user_id', 'compensation_type_id',
        'title', 'description', 'location', 'seniority', 'industry',
        'contract_type', 'openings_count', 'is_remote',
        'salary_min', 'salary_max', 'salary_currency', 'reward_min', 'reward_max', 'reward_pct',
        'must_haves', 'nice_to_haves', 'green_flags', 'red_flags',
        'screening_questions', 'ideal_candidates', 'ideal_source_companies',
        'status', 'is_exclusive', 'is_featured', 'is_fast_track',
        'timer_a_days', 'timer_b_active', 'timer_b_days',
        'timer_c_active', 'timer_c_sla_days',
        'gsheet_tab_name', 'published_at', 'original_post_date', 'assignment_count',
        'jd_file_url', 'jd_file_name',
    ];

    protected $casts = [
        'must_haves'           => 'array',
        'nice_to_haves'        => 'array',
        'green_flags'          => 'array',
        'red_flags'            => 'array',
        'screening_questions'  => 'array',
        'ideal_candidates'     => 'array',
        'ideal_source_companies' => 'array',
        'salary_min'           => 'decimal:2',
        'salary_max'           => 'decimal:2',
        'reward_min'           => 'decimal:2',
        'reward_max'           => 'decimal:2',
        'reward_pct'           => 'decimal:4',
        'is_exclusive'         => 'boolean',
        'is_featured'          => 'boolean',
        'is_fast_track'        => 'boolean',
        'is_remote'            => 'boolean',
        'timer_b_active'       => 'boolean',
        'timer_c_active'       => 'boolean',
        'openings_count'       => 'integer',
        'assignment_count'     => 'integer',
        'published_at'         => 'datetime',
        'original_post_date'   => 'datetime',
    ];

    protected static function boot(): void
    {
        parent::boot();
        static::creating(fn($m) => $m->id ??= (string) Str::uuid());
    }

    public function client() { return $this->belongsTo(Client::class); }
    public function claims()  { return $this->hasMany(MandateClaim::class); }
    public function submissions() { return $this->hasMany(CddSubmission::class); }
    public function compensationType() { return $this->belongsTo(CompensationType::class); }
}
