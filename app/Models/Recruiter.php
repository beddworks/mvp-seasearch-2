<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class Recruiter extends Model
{
    public $incrementing = false;
    protected $keyType   = 'string';

    protected $fillable = [
        'id', 'user_id', 'tier', 'trust_level', 'recruiter_group',
        'bank_details', 'active_mandates_count', 'total_placements',
        'avg_days_to_place', 'total_earnings', 'profile_complete',
    ];

    protected $casts = [
        'bank_details'          => 'array',
        'active_mandates_count' => 'integer',
        'total_placements'      => 'integer',
        'avg_days_to_place'     => 'integer',
        'total_earnings'        => 'decimal:2',
        'profile_complete'      => 'boolean',
    ];

    protected static function boot(): void
    {
        parent::boot();
        static::creating(fn($m) => $m->id ??= (string) Str::uuid());
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
