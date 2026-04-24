<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\GoogleSheetsService;

class CleanupGSheetFiles extends Command
{
    protected $signature = 'gsheet:cleanup
                            {--dry-run : List files without deleting}
                            {--all : Delete ALL files in service account Drive, not just SeaSearch ones}';

    protected $description = 'Free up Google Drive storage quota by trashing old spreadsheets owned by the service account';

    public function __construct(private GoogleSheetsService $sheetsService)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $dryRun = $this->option('dry-run');
        $all    = $this->option('all');

        $drive = $this->sheetsService->driveService();

        $query   = $all
            ? "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false"
            : "name contains 'SeaSearch' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false";

        $this->info("Listing files in service account Drive...");

        $pageToken = null;
        $files     = [];

        do {
            $params = ['q' => $query, 'fields' => 'nextPageToken,files(id,name,createdTime)', 'pageSize' => 100];
            if ($pageToken) {
                $params['pageToken'] = $pageToken;
            }
            $result    = $drive->files->listFiles($params);
            $files     = array_merge($files, $result->getFiles());
            $pageToken = $result->getNextPageToken();
        } while ($pageToken);

        if (empty($files)) {
            $this->info('No files found. Drive is clean.');
            return 0;
        }

        $this->table(['ID', 'Name', 'Created At'], array_map(fn($f) => [
            $f->getId(), $f->getName(), $f->getCreatedTime(),
        ], $files));

        $this->info(count($files) . ' file(s) found.');

        if ($dryRun) {
            $this->warn('--dry-run: no files deleted.');
            return 0;
        }

        if (!$this->confirm('Permanently delete (trash) all listed files?')) {
            $this->info('Aborted.');
            return 0;
        }

        $deleted = 0;
        foreach ($files as $file) {
            try {
                $drive->files->delete($file->getId());
                $this->line("  Deleted: {$file->getName()} ({$file->getId()})");
                $deleted++;
            } catch (\Throwable $e) {
                $this->error("  Failed to delete {$file->getId()}: {$e->getMessage()}");
            }
        }

        $this->info("Done. {$deleted} file(s) deleted. Retry creating sheets now.");
        return 0;
    }
}
