<?php

namespace App\Console\Commands;

use App\Models\Mandate;
use App\Services\GoogleSheetsService;
use Illuminate\Console\Command;

class SyncGoogleSheets extends Command
{
    protected $signature   = 'gsheet:sync {--mandate= : Only sync a specific mandate ID}';
    protected $description = 'Poll Google Sheets and sync stage changes back into the kanban (Sheet → DB)';

    public function handle(GoogleSheetsService $sheets): int
    {
        $mandateId = $this->option('mandate');

        if ($mandateId) {
            $mandates = Mandate::whereNotNull('gsheet_tab_name')
                ->where('id', $mandateId)
                ->get();
        } else {
            $mandates = Mandate::whereNotNull('gsheet_tab_name')
                ->whereIn('status', ['active', 'paused'])
                ->get();
        }

        if ($mandates->isEmpty()) {
            $this->info('No mandates with GSheet tabs found.');
            return self::SUCCESS;
        }

        $this->info("Syncing {$mandates->count()} mandate(s) from Google Sheets...");

        foreach ($mandates as $mandate) {
            $sheets->syncFromSheet($mandate);
            $this->line("  ✓ Mandate: {$mandate->title} [{$mandate->id}]");
        }

        $this->info('Done.');
        return self::SUCCESS;
    }
}
