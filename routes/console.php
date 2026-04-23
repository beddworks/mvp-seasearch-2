<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// ─── SeaSearch Timer Engine ────────────────────────────────────────────────
// Runs every hour via Laravel's built-in scheduler.
// Add `* * * * * cd /path && php artisan schedule:run >> /dev/null 2>&1` to crontab.

Schedule::command('timers:check')->hourly()->withoutOverlapping()->runInBackground()
    ->appendOutputTo(storage_path('logs/timers.log'));

