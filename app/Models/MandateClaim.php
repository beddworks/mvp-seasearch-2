<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class MandateClaim extends Model
{
    public $incrementing = false;
    protected $keyType   = 'string';

    protected $fillable = [
        'id', 'mandate_id', 'recruiter_id', 'status',
        'assigned_at', 'dropped_at', 'rejection_reason',
        'submissions_count',
    ];

    protected $casts = [
        'assigned_at'       => 'datetime',
        'dropped_at'        => 'datetime',
        'submissions_count' => 'integer',
    ];

    protected static function boot(): void
    {
        parent::boot();
        static::creating(fn($m) => $m->id ??= (string) Str::uuid());
    }

    public function mandate()   { return $this->belongsTo(Mandate::class); }
    public function recruiter() { return $this->belongsTo(Recruiter::class); }
}
