<?php

namespace App\Jobs;

use App\Models\Mandate;
use App\Services\GoogleSheetsService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Sync FROM Google Sheets back into the DB (Sheet → DB).
 * Reads Stage column (F) and updates cdd_submissions.client_status on mismatch.
 */
class SyncFromSheetJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 2;
    public int $timeout = 60;

    public function __construct(public Mandate $mandate)
    {
    }

    public function handle(GoogleSheetsService $sheets): void
    {
        try {
            $result = $sheets->syncFromSheet($this->mandate);
            Log::info('SyncFromSheetJob complete', $result);
        } catch (\Throwable $e) {
            Log::error('SyncFromSheetJob failed', [
                'mandate_id' => $this->mandate->id,
                'error'      => $e->getMessage(),
            ]);
            throw $e;
        }
    }
}
