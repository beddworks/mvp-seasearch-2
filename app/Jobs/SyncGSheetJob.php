<?php

namespace App\Jobs;

use App\Models\CddSubmission;
use App\Services\GoogleSheetsService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Sync a single CddSubmission row TO Google Sheets (DB → Sheet).
 * Dispatched after kanban drag, stage change, or feedback update.
 */
class SyncGSheetJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 3;
    public int $timeout = 30;

    public function __construct(public CddSubmission $submission)
    {
    }

    public function handle(GoogleSheetsService $sheets): void
    {
        try {
            $sheets->addOrUpdateRow($this->submission);
        } catch (\Throwable $e) {
            Log::error('SyncGSheetJob failed', [
                'submission_id' => $this->submission->id,
                'error'         => $e->getMessage(),
            ]);
            throw $e;
        }
    }
}
