<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class PlatformNotification extends Model
{
    protected $table = 'notifications';

    public $incrementing = false;
    protected $keyType   = 'string';
    const UPDATED_AT     = null;  // notifications table has no updated_at column

    protected $fillable = [
        'id', 'user_id', 'type', 'title', 'body', 'action_url',
        'is_read', 'read_at', 'metadata',
    ];

    protected $casts = [
        'is_read'  => 'boolean',
        'read_at'  => 'datetime',
        'metadata' => 'array',
    ];

    protected static function boot(): void
    {
        parent::boot();
        static::creating(fn($m) => $m->id ??= (string) Str::uuid());
    }

    public function user() { return $this->belongsTo(User::class); }
}
