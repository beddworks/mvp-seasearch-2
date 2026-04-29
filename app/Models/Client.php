<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Client extends Model
{
    public $incrementing = false;
    protected $keyType   = 'string';

    protected $fillable = [
        'id', 'user_id', 'company_name', 'industry',
        'contact_name', 'contact_email', 'contact_title',
        'website', 'logo_url', 'gsheet_id', 'gsheet_url',
        'accent_color', 'status', 'compensation_type_id',
        'agreement_file_url', 'agreement_file_name',
        'notes',
    ];

    protected static function boot(): void
    {
        parent::boot();
        static::creating(fn($m) => $m->id ??= (string) Str::uuid());
    }

    public function user() { return $this->belongsTo(User::class); }
    public function mandates() { return $this->hasMany(Mandate::class); }
    public function compensationType() { return $this->belongsTo(\App\Models\CompensationType::class); }
}
