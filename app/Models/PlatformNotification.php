<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class PlatformNotification extends Model
{
    protected $table = 'notifications';

    public $incrementing = false;
    protected $keyType   = 'string';

    protected $fillable = [
        'id', 'user_id', 'type', 'title', 'body', 'link',
        'read_at', 'meta',
    ];

    protected $casts = [
        'read_at' => 'datetime',
        'meta'    => 'array',
    ];

    protected static function boot(): void
    {
        parent::boot();
        static::creating(fn($m) => $m->id ??= (string) Str::uuid());
    }

    public function user() { return $this->belongsTo(User::class); }
}
