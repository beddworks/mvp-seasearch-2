<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Candidate extends Model
{
    public $incrementing = false;
    protected $keyType   = 'string';

    protected $fillable = [
        'id', 'recruiter_id', 'first_name', 'last_name', 'email',
        'phone', 'linkedin_url', 'current_role', 'current_company',
        'location', 'years_experience',
        'cv_url', 'cv_original_name', 'cv_uploaded_at', 'cv_parsed_at',
        'parsed_profile', 'skills', 'notes',
        'ai_score', 'score_breakdown', 'green_flags', 'red_flags', 'ai_summary',
    ];

    protected $casts = [
        'skills'         => 'array',
        'parsed_profile' => 'array',
        'score_breakdown' => 'array',
        'green_flags'    => 'array',
        'red_flags'      => 'array',
        'cv_uploaded_at' => 'datetime',
        'cv_parsed_at'   => 'datetime',
    ];

    protected static function boot(): void
    {
        parent::boot();
        static::creating(fn($m) => $m->id ??= (string) Str::uuid());
    }

    public function recruiter()   { return $this->belongsTo(Recruiter::class); }
    public function submissions() { return $this->hasMany(CddSubmission::class); }
}
