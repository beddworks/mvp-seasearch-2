<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Placement extends Model
{
    public $incrementing = false;
    protected $keyType   = 'string';

    protected $fillable = [
        'id', 'mandate_id', 'recruiter_id', 'candidate_id',
        'submission_id', 'gross_reward', 'platform_fee_pct',
        'platform_fee', 'tier_modifier', 'net_payout',
        'penalty_amount', 'final_payout', 'placed_at',
        'payout_status', 'payout_at',
    ];

    protected $casts = [
        'gross_reward'    => 'decimal:2',
        'platform_fee_pct'=> 'decimal:2',
        'platform_fee'    => 'decimal:2',
        'tier_modifier'   => 'decimal:2',
        'net_payout'      => 'decimal:2',
        'penalty_amount'  => 'decimal:2',
        'final_payout'    => 'decimal:2',
        'placed_at'       => 'datetime',
        'payout_at'       => 'datetime',
    ];

    protected static function boot(): void
    {
        parent::boot();
        static::creating(fn($m) => $m->id ??= (string) Str::uuid());
    }

    public function mandate()   { return $this->belongsTo(Mandate::class); }
    public function recruiter() { return $this->belongsTo(Recruiter::class); }
    public function candidate() { return $this->belongsTo(Candidate::class); }
}
