<?php

namespace App\Services;

use App\Models\CddSubmission;
use App\Models\Client;
use App\Models\Mandate;
use Google\Client as GoogleClient;
use Google\Service\Drive;
use Google\Service\Sheets;
use Google\Service\Sheets\BatchUpdateSpreadsheetRequest;
use Google\Service\Sheets\CellData;
use Google\Service\Sheets\CellFormat;
use Google\Service\Sheets\Color;
use Google\Service\Sheets\ExtendedValue;
use Google\Service\Sheets\GridRange;
use Google\Service\Sheets\RepeatCellRequest;
use Google\Service\Sheets\Request as SheetsRequest;
use Google\Service\Sheets\RowData;
use Google\Service\Sheets\Spreadsheet;
use Google\Service\Sheets\SpreadsheetProperties;
use Google\Service\Sheets\TextFormat;
use Google\Service\Sheets\ValueRange;
use Illuminate\Support\Facades\Log;

class GoogleSheetsService
{
    // Column layout (1-indexed for humans, 0-indexed for API)
    const COL_ROW_NUM    = 0; // A - internal row marker (submission id)
    const COL_CANDIDATE  = 1; // B
    const COL_EMAIL      = 2; // C
    const COL_PHONE      = 3; // D
    const COL_LINKEDIN   = 4; // E
    const COL_STAGE      = 5; // F  ← sync back on change
    const COL_AI_SCORE   = 6; // G
    const COL_RECRUITER  = 7; // H
    const COL_ADMIN_STATuS = 8; // I
    const COL_FEEDBACK   = 9; // J
    const COL_SUBMITTED  = 10; // K
    const COL_UPDATED    = 11; // L

    const HEADER = [
        'Submission ID', 'Candidate Name', 'Email', 'Phone', 'LinkedIn',
        'Stage', 'AI Score', 'Recruiter', 'Admin Status', 'Client Feedback',
        'Submitted At', 'Updated At',
    ];

    const STAGE_COLORS = [
        'sourced'   => ['red' => 0.95, 'green' => 0.95, 'blue' => 0.95],
        'screened'  => ['red' => 1.0,  'green' => 0.87, 'blue' => 0.71],
        'interview' => ['red' => 0.67, 'green' => 0.84, 'blue' => 0.90],
        'offered'   => ['red' => 0.82, 'green' => 0.73, 'blue' => 0.92],
        'hired'     => ['red' => 0.71, 'green' => 0.89, 'blue' => 0.72],
        'rejected'  => ['red' => 0.95, 'green' => 0.60, 'blue' => 0.60],
        'on_hold'   => ['red' => 0.95, 'green' => 0.95, 'blue' => 0.60],
    ];

    // -------------------------------------------------------------------------

    private function getClient(): GoogleClient
    {
        $client = new GoogleClient();
        $client->setApplicationName('SeaSearch');
        $client->setScopes([Sheets::SPREADSHEETS, Drive::DRIVE]);
        $client->setAuthConfig($this->resolveCredentials());
        return $client;
    }

    public function driveService(): Drive
    {
        return new Drive($this->getClient());
    }

    private function resolveCredentials(): array
    {
        // Option 1: JSON string stored in env (Base64-encoded)
        $json = config('services.google_sheets.credentials_json');
        if ($json) {
            $decoded = base64_decode($json, true);
            if ($decoded) {
                return json_decode($decoded, true);
            }
            return json_decode($json, true);
        }

        // Option 2: Path to credentials file
        $path = config('services.google_sheets.credentials_path');
        if ($path && file_exists($path)) {
            return json_decode(file_get_contents($path), true);
        }

        throw new \RuntimeException('Google Sheets credentials not configured. Set GOOGLE_SHEETS_CREDENTIALS_JSON or GOOGLE_SHEETS_CREDENTIALS_PATH in .env');
    }

    private function sheetsService(): Sheets
    {
        return new Sheets($this->getClient());
    }

    // -------------------------------------------------------------------------
    // 1. Create / ensure client master spreadsheet
    // -------------------------------------------------------------------------

    public function createClientSheet(Client $client): void
    {
        if ($client->gsheet_id) {
            return; // already has a sheet
        }

        try {
            $title    = 'SeaSearch | ' . $client->company_name;
            $folderId = config('services.google_sheets.folder_id');

            if ($folderId) {
                // Create directly inside the target Drive folder via Drive API
                $drive    = $this->driveService();
                $metadata = new \Google\Service\Drive\DriveFile([
                    'name'     => $title,
                    'mimeType' => 'application/vnd.google-apps.spreadsheet',
                    'parents'  => [$folderId],
                ]);
                $file = $drive->files->create($metadata, ['fields' => 'id,webViewLink']);
                $spreadsheetId  = $file->getId();
                $spreadsheetUrl = $file->getWebViewLink();
            } else {
                // No folder configured — create in service account's Drive
                $service     = $this->sheetsService();
                $spreadsheet = new Spreadsheet([
                    'properties' => new SpreadsheetProperties(['title' => $title]),
                ]);
                $result = $service->spreadsheets->create($spreadsheet, ['fields' => 'spreadsheetId,spreadsheetUrl']);
                $spreadsheetId  = $result->getSpreadsheetId();
                $spreadsheetUrl = $result->getSpreadsheetUrl();
            }

            $client->update([
                'gsheet_id'  => $spreadsheetId,
                'gsheet_url' => $spreadsheetUrl,
            ]);

            Log::info('GSheet: created master spreadsheet for client', [
                'client_id'   => $client->id,
                'gsheet_id'   => $spreadsheetId,
            ]);
        } catch (\Throwable $e) {
            Log::error('GSheet: failed to create client sheet', ['error' => $e->getMessage(), 'client_id' => $client->id]);
            throw $e;
        }
    }

    // -------------------------------------------------------------------------
    // 2. Create tab for mandate inside client's spreadsheet
    // -------------------------------------------------------------------------

    public function createMandateTab(Mandate $mandate): void
    {
        $mandate->loadMissing('client');
        $client = $mandate->client;

        if (!$client) {
            Log::warning('GSheet: mandate has no client, skipping tab creation', ['mandate_id' => $mandate->id]);
            return;
        }

        // Ensure client has a spreadsheet
        $this->createClientSheet($client);
        $client->refresh();

        if (!$client->gsheet_id) {
            Log::warning('GSheet: client still has no gsheet_id after createClientSheet, skipping', ['client_id' => $client->id]);
            return;
        }

        // Derive a safe tab name  (max 100 chars, no special chars)
        $tabName = $this->safeTabName($mandate->title . ' (' . substr($mandate->id, 0, 8) . ')');

        if ($mandate->gsheet_tab_name) {
            // Tab already created — verify it still exists; if not, re-create
            $existingTabs = $this->getTabNames($client->gsheet_id);
            if (in_array($mandate->gsheet_tab_name, $existingTabs)) {
                return;
            }
        }

        try {
            $service = $this->sheetsService();

            // Add new sheet tab
            $addSheet = new SheetsRequest();
            $addSheet->setAddSheet(new \Google\Service\Sheets\AddSheetRequest([
                'properties' => [
                    'title' => $tabName,
                ],
            ]));

            $batchRequest = new BatchUpdateSpreadsheetRequest(['requests' => [$addSheet]]);
            $response = $service->spreadsheets->batchUpdate($client->gsheet_id, $batchRequest);

            // Save tab name on mandate
            $mandate->update(['gsheet_tab_name' => $tabName]);

            // Write header row
            $this->writeHeaderRow($service, $client->gsheet_id, $tabName);

            Log::info('GSheet: created mandate tab', [
                'mandate_id' => $mandate->id,
                'tab_name'   => $tabName,
                'gsheet_id'  => $client->gsheet_id,
            ]);
        } catch (\Throwable $e) {
            Log::error('GSheet: failed to create mandate tab', ['error' => $e->getMessage(), 'mandate_id' => $mandate->id]);
            throw $e;
        }
    }

    // -------------------------------------------------------------------------
    // 3. Add or update a candidate row
    // -------------------------------------------------------------------------

    public function addOrUpdateRow(CddSubmission $submission): void
    {
        $submission->loadMissing(['candidate', 'mandate.client', 'recruiter.user']);
        $mandate = $submission->mandate;
        $client  = $mandate?->client;

        if (!$client?->gsheet_id || !$mandate?->gsheet_tab_name) {
            Log::warning('GSheet: cannot update row — mandate tab not set up', ['submission_id' => $submission->id]);
            return;
        }

        try {
            $service  = $this->sheetsService();
            $sheetId  = $client->gsheet_id;
            $tabName  = $mandate->gsheet_tab_name;

            $candidate = $submission->candidate;
            $recruiter = $submission->recruiter?->user;

            $rowValues = [
                $submission->id,
                $candidate?->full_name ?? $candidate?->name ?? '—',
                $candidate?->email ?? '—',
                $candidate?->phone ?? '—',
                $candidate?->linkedin_url ?? '—',
                $submission->client_status ?? 'sourced',
                $submission->ai_score ?? '',
                $recruiter?->name ?? '—',
                $submission->admin_review_status ?? 'pending',
                $submission->client_feedback ?? '',
                $submission->submitted_at ? \Carbon\Carbon::parse($submission->submitted_at)->format('Y-m-d H:i') : '',
                now()->format('Y-m-d H:i'),
            ];

            if ($submission->gsheet_row_index) {
                // Update existing row
                $range  = $tabName . '!' . 'A' . $submission->gsheet_row_index . ':L' . $submission->gsheet_row_index;
                $body   = new ValueRange(['values' => [$rowValues]]);
                $service->spreadsheets_values->update(
                    $sheetId, $range, $body,
                    ['valueInputOption' => 'USER_ENTERED']
                );

                // Color-code the stage cell
                $this->colorStageCellByRowIndex($service, $sheetId, $tabName, $submission->gsheet_row_index, $submission->client_status);

                Log::info('GSheet: updated row', ['submission_id' => $submission->id, 'row' => $submission->gsheet_row_index]);
            } else {
                // Append new row
                $range  = $tabName . '!A:L';
                $body   = new ValueRange(['values' => [$rowValues]]);
                $result = $service->spreadsheets_values->append(
                    $sheetId, $range, $body,
                    ['valueInputOption' => 'USER_ENTERED', 'insertDataOption' => 'INSERT_ROWS']
                );

                // Determine which row was written
                $updatedRange = $result->getUpdates()->getUpdatedRange();
                $rowIndex = $this->extractRowIndex($updatedRange);

                // Save row index on submission
                $submission->update(['gsheet_row_index' => $rowIndex]);

                // Color the stage cell
                $this->colorStageCellByRowIndex($service, $sheetId, $tabName, $rowIndex, $submission->client_status);

                Log::info('GSheet: appended row', ['submission_id' => $submission->id, 'row' => $rowIndex]);
            }
        } catch (\Throwable $e) {
            Log::error('GSheet: failed to add/update row', ['error' => $e->getMessage(), 'submission_id' => $submission->id]);
            throw $e;
        }
    }

    // -------------------------------------------------------------------------
    // 4. Sync FROM sheet → update DB (called by polling command / webhook)
    //    Reads col F (Stage) and updates cdd_submissions.client_status if changed.
    // -------------------------------------------------------------------------

    public function syncFromSheet(Mandate $mandate): array
    {
        $mandate->loadMissing('client');
        $client = $mandate->client;

        if (!$client?->gsheet_id || !$mandate->gsheet_tab_name) {
            return ['skipped' => true, 'reason' => 'no_gsheet'];
        }

        try {
            $service = $this->sheetsService();
            $range   = $mandate->gsheet_tab_name . '!A2:L';

            $response = $service->spreadsheets_values->get($client->gsheet_id, $range);
            $rows = $response->getValues() ?? [];

            $validStages = ['sourced', 'screened', 'interview', 'offered', 'hired', 'rejected', 'on_hold'];
            $updated = 0;

            foreach ($rows as $rowIndex => $row) {
                $submissionId = $row[self::COL_ROW_NUM] ?? null;
                $sheetStage   = strtolower(trim($row[self::COL_STAGE] ?? ''));

                if (!$submissionId || !in_array($sheetStage, $validStages)) {
                    continue;
                }

                $sub = CddSubmission::find($submissionId);
                if (!$sub) continue;

                if ($sub->client_status !== $sheetStage) {
                    $sub->update([
                        'client_status'            => $sheetStage,
                        'client_status_updated_at' => now(),
                    ]);

                    // Notify via existing NotificationService
                    try {
                        (new NotificationService())->candidateMoved(
                            $sub->fresh(['candidate', 'mandate', 'recruiter.user']),
                            $sub->getOriginal('client_status'),
                            $sheetStage
                        );
                    } catch (\Throwable $e) {
                        Log::warning('GSheet syncFromSheet: notification failed', ['error' => $e->getMessage()]);
                    }

                    $updated++;
                }
            }

            Log::info('GSheet: synced from sheet', ['mandate_id' => $mandate->id, 'updated' => $updated]);
            return ['mandate_id' => $mandate->id, 'rows_synced' => count($rows), 'updated' => $updated];
        } catch (\Throwable $e) {
            Log::error('GSheet: syncFromSheet failed', ['error' => $e->getMessage(), 'mandate_id' => $mandate->id]);
            return ['error' => $e->getMessage()];
        }
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private function writeHeaderRow(Sheets $service, string $spreadsheetId, string $tabName): void
    {
        $range = $tabName . '!A1:L1';
        $body  = new ValueRange(['values' => [self::HEADER]]);
        $service->spreadsheets_values->update(
            $spreadsheetId, $range, $body,
            ['valueInputOption' => 'RAW']
        );

        // Bold + background the header using batchUpdate
        $sheetId = $this->getSheetIdByName($service, $spreadsheetId, $tabName);
        if ($sheetId === null) return;

        $headerFormat = new SheetsRequest([
            'repeatCell' => new RepeatCellRequest([
                'range' => new GridRange([
                    'sheetId'          => $sheetId,
                    'startRowIndex'    => 0,
                    'endRowIndex'      => 1,
                    'startColumnIndex' => 0,
                    'endColumnIndex'   => 12,
                ]),
                'cell' => new CellData([
                    'userEnteredFormat' => new CellFormat([
                        'backgroundColor' => new Color(['red' => 0.067, 'green' => 0.31, 'blue' => 0.54]),
                        'textFormat'      => new TextFormat(['bold' => true, 'foregroundColor' => new Color(['red' => 1, 'green' => 1, 'blue' => 1])]),
                    ]),
                ]),
                'fields' => 'userEnteredFormat(backgroundColor,textFormat)',
            ]),
        ]);

        $batchRequest = new BatchUpdateSpreadsheetRequest(['requests' => [$headerFormat]]);
        $service->spreadsheets->batchUpdate($spreadsheetId, $batchRequest);
    }

    private function colorStageCellByRowIndex(Sheets $service, string $spreadsheetId, string $tabName, int $rowIndex, ?string $stage): void
    {
        if (!$stage || !isset(self::STAGE_COLORS[$stage])) return;

        $sheetId = $this->getSheetIdByName($service, $spreadsheetId, $tabName);
        if ($sheetId === null) return;

        $color = self::STAGE_COLORS[$stage];
        $request = new SheetsRequest([
            'repeatCell' => new RepeatCellRequest([
                'range' => new GridRange([
                    'sheetId'          => $sheetId,
                    'startRowIndex'    => $rowIndex - 1,
                    'endRowIndex'      => $rowIndex,
                    'startColumnIndex' => self::COL_STAGE,
                    'endColumnIndex'   => self::COL_STAGE + 1,
                ]),
                'cell' => new CellData([
                    'userEnteredFormat' => new CellFormat([
                        'backgroundColor' => new Color($color),
                    ]),
                ]),
                'fields' => 'userEnteredFormat.backgroundColor',
            ]),
        ]);

        $batchRequest = new BatchUpdateSpreadsheetRequest(['requests' => [$request]]);
        $service->spreadsheets->batchUpdate($spreadsheetId, $batchRequest);
    }

    private function getSheetIdByName(Sheets $service, string $spreadsheetId, string $tabName): ?int
    {
        $spreadsheet = $service->spreadsheets->get($spreadsheetId);
        foreach ($spreadsheet->getSheets() as $sheet) {
            if ($sheet->getProperties()->getTitle() === $tabName) {
                return $sheet->getProperties()->getSheetId();
            }
        }
        return null;
    }

    private function getTabNames(string $spreadsheetId): array
    {
        $service     = $this->sheetsService();
        $spreadsheet = $service->spreadsheets->get($spreadsheetId);
        return array_map(
            fn($s) => $s->getProperties()->getTitle(),
            $spreadsheet->getSheets()
        );
    }

    private function extractRowIndex(string $range): int
    {
        // e.g. 'Mandate Tab!A5:L5' → 5
        if (preg_match('/[A-Za-z](\d+)/', $range, $m)) {
            return (int) $m[1];
        }
        return 2; // fallback
    }

    private function safeTabName(string $name): string
    {
        $name = preg_replace('/[\/\\\?\*\[\]:]+/', '-', $name);
        return substr($name, 0, 100);
    }
}
