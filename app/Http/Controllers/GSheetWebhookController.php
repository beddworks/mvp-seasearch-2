<?php

namespace App\Http\Controllers;

use App\Models\Mandate;
use App\Services\GoogleSheetsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Receives Google Drive / Sheets push notifications.
 * Register the channel at: https://developers.google.com/drive/api/v3/push
 *
 * Google will POST to this endpoint with:
 *   X-Goog-Channel-Id     → our mandate_id (set when registering)
 *   X-Goog-Resource-State → 'sync', 'change', 'update'
 *
 * For local dev use the polling command instead:
 *   php artisan gsheet:sync
 */
class GSheetWebhookController extends Controller
{
    /**
     * Handle incoming push notification from Google.
     * Always return 200; if we return >=400 Google will stop pushing.
     */
    public function handle(Request $request, GoogleSheetsService $sheets)
    {
        $channelId     = $request->header('X-Goog-Channel-Id');
        $resourceState = $request->header('X-Goog-Resource-State');
        $token         = $request->header('X-Goog-Channel-Token');

        // Ignore sync handshake
        if ($resourceState === 'sync') {
            return response('', 200);
        }

        // Validate optional secret token
        $expectedToken = config('services.google_sheets.webhook_token');
        if ($expectedToken && $token !== $expectedToken) {
            Log::warning('GSheet webhook: invalid token', compact('channelId', 'token'));
            return response('', 200);
        }

        // The channel ID we set when registering = mandate_id
        if (!$channelId) {
            return response('', 200);
        }

        $mandate = Mandate::find($channelId);
        if (!$mandate) {
            Log::warning('GSheet webhook: unknown mandate channel', compact('channelId'));
            return response('', 200);
        }

        Log::info('GSheet webhook: change received', [
            'mandate_id'     => $mandate->id,
            'resource_state' => $resourceState,
        ]);

        try {
            $result = $sheets->syncFromSheet($mandate);
            Log::info('Inline GSheet webhook sync complete', $result);
        } catch (\Throwable $e) {
            Log::error('Inline GSheet webhook sync failed', [
                'mandate_id' => $mandate->id,
                'error' => $e->getMessage(),
            ]);
        }

        return response('', 200);
    }
}
