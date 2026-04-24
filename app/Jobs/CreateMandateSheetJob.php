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

class CreateMandateSheetJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 3;
    public int $timeout = 60;

    public function __construct(public Mandate $mandate)
    {
    }

    public function handle(GoogleSheetsService $sheets): void
    {
        try {
            $sheets->createMandateTab($this->mandate);
        } catch (\Throwable $e) {
            Log::error('CreateMandateSheetJob failed', [
                'mandate_id' => $this->mandate->id,
                'error'      => $e->getMessage(),
            ]);
            throw $e;
        }
    }
}
