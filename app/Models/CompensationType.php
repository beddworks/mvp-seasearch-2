<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Support\Str;

class CompensationType extends Model
{
    use HasUuids;

    protected $table = 'compensation_types';

    protected $fillable = [
        'name',
        'is_active',
        'formula_type',
        'formula_fields',
        'trigger_condition',
        'platform_fee_pct',
        'notes',
        'sort_order',
        'description',
    ];

    protected $casts = [
        'formula_fields' => 'array',
        'is_active'      => 'boolean',
        'platform_fee_pct' => 'decimal:4',
    ];

    protected static function boot()
    {
        parent::boot();
        static::creating(fn($m) => $m->id ??= (string) Str::uuid());
    }

    public function mandates()
    {
        return $this->hasMany(Mandate::class);
    }
}
