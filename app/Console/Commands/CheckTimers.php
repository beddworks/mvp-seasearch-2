<?php

namespace App\Console\Commands;

use App\Services\TimerService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class CheckTimers extends Command
{
    protected $signature   = 'timers:check {--timer= : Run only a specific timer: a, b, c, slots}';
    protected $description = 'Run the SeaSearch timer engine — Timer A/B/C + slot freeing';

    public function __construct(protected TimerService $timerService)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $only = $this->option('timer');

        $this->info('[SeaSearch] Timer check started at ' . now()->toDateTimeString());

        if (!$only || $only === 'a') {
            $this->line('  → Timer A (submission deadline)...');
            try {
                $this->timerService->checkTimerA();
                $this->line('     ✓ done');
            } catch (\Exception $e) {
                $this->error('     ✗ ' . $e->getMessage());
                Log::error('CheckTimers Timer A failed: ' . $e->getMessage());
            }
        }

        if (!$only || $only === 'b') {
            $this->line('  → Timer B (late penalties)...');
            try {
                $this->timerService->checkTimerB();
                $this->line('     ✓ done');
            } catch (\Exception $e) {
                $this->error('     ✗ ' . $e->getMessage());
                Log::error('CheckTimers Timer B failed: ' . $e->getMessage());
            }
        }

        if (!$only || $only === 'c') {
            $this->line('  → Timer C (client SLA)...');
            try {
                $this->timerService->checkTimerC();
                $this->line('     ✓ done');
            } catch (\Exception $e) {
                $this->error('     ✗ ' . $e->getMessage());
                Log::error('CheckTimers Timer C failed: ' . $e->getMessage());
            }
        }

        if (!$only || $only === 'slots') {
            $this->line('  → Slot freeing check...');
            try {
                $this->timerService->checkAndFreeSlots();
                $this->line('     ✓ done');
            } catch (\Exception $e) {
                $this->error('     ✗ ' . $e->getMessage());
                Log::error('CheckTimers slot freeing failed: ' . $e->getMessage());
            }
        }

        $this->info('[SeaSearch] Timer check completed at ' . now()->toDateTimeString());
        return Command::SUCCESS;
    }
}
