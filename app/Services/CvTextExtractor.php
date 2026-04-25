<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Smalot\PdfParser\Parser as PdfParser;

class CvTextExtractor
{
    private int $maxChars = 6000;

    public function extractFromUploadedFile(UploadedFile $file, ?string $candidateId = null): string
    {
        return $this->extractFromPath(
            $file->getRealPath(),
            strtolower((string) $file->getClientOriginalExtension()),
            $candidateId
        );
    }

    public function extractFromStoredUrl(?string $cvUrl, ?string $candidateId = null): string
    {
        if (empty($cvUrl)) {
            return '';
        }

        $path = $this->resolveStoredPath($cvUrl);
        if (!$path || !file_exists($path)) {
            return '';
        }

        return $this->extractFromPath($path, null, $candidateId);
    }

    public function extractFromPath(?string $path, ?string $ext = null, ?string $candidateId = null): string
    {
        if (empty($path) || !file_exists($path)) {
            return '';
        }

        $extension = strtolower((string) ($ext ?: pathinfo($path, PATHINFO_EXTENSION)));

        if ($extension === 'pdf') {
            return $this->extractPdfText($path, $candidateId);
        }

        if ($extension === 'docx') {
            return $this->extractDocxText($path);
        }

        if ($extension === 'doc') {
            $text = $this->extractLegacyDocText($path);
            if ($text !== '') {
                return $text;
            }

            Log::warning('CvTextExtractor: unsupported .doc extraction', [
                'candidate_id' => $candidateId,
                'path' => $path,
            ]);
            return '';
        }

        // Text files or unknown formats as best-effort fallback.
        $text = @file_get_contents($path);
        return $text ? $this->limitText($text) : '';
    }

    private function extractPdfText(string $path, ?string $candidateId = null): string
    {
        try {
            $parser = new PdfParser();
            $pdf = $parser->parseFile($path);
            return $this->limitText($pdf->getText());
        } catch (\Throwable $e) {
            Log::warning('CvTextExtractor: PDF parse failed', [
                'candidate_id' => $candidateId,
                'path' => $path,
                'error' => $e->getMessage(),
            ]);
            return '';
        }
    }

    private function extractDocxText(string $path): string
    {
        if (!class_exists('\\ZipArchive')) {
            return '';
        }

        $zip = new \ZipArchive();
        if ($zip->open($path) !== true) {
            return '';
        }

        $xml = $zip->getFromName('word/document.xml');
        $zip->close();

        if ($xml === false) {
            return '';
        }

        $text = strip_tags(str_replace(['</w:p>', '</w:r>'], "\n", $xml));
        $text = html_entity_decode($text, ENT_QUOTES | ENT_XML1, 'UTF-8');

        return $this->limitText($text);
    }

    private function extractLegacyDocText(string $path): string
    {
        $out = [];
        exec('which antiword 2>/dev/null', $out);
        if (!empty($out)) {
            $text = shell_exec('antiword ' . escapeshellarg($path) . ' 2>/dev/null');
            return $text ? $this->limitText($text) : '';
        }

        $out = [];
        exec('which catdoc 2>/dev/null', $out);
        if (!empty($out)) {
            $text = shell_exec('catdoc ' . escapeshellarg($path) . ' 2>/dev/null');
            return $text ? $this->limitText($text) : '';
        }

        return '';
    }

    private function resolveStoredPath(string $cvUrl): ?string
    {
        $path = $cvUrl;

        if (str_starts_with($path, '/storage/')) {
            return storage_path('app/public/' . ltrim(substr($path, 9), '/'));
        }

        if (str_starts_with($path, 'storage/')) {
            return storage_path('app/public/' . ltrim(substr($path, 8), '/'));
        }

        if (!str_starts_with($path, 'http')) {
            return $path;
        }

        $diskPath = 'cvs/' . basename((string) parse_url($path, PHP_URL_PATH));

        if (Storage::disk('public')->exists($diskPath)) {
            return Storage::disk('public')->path($diskPath);
        }

        if (!config('filesystems.disks.s3')) {
            return null;
        }

        if (Storage::disk('s3')->exists($diskPath)) {
            $tmp = tempnam(sys_get_temp_dir(), 'cv_') . '.' . pathinfo($diskPath, PATHINFO_EXTENSION);
            file_put_contents($tmp, Storage::disk('s3')->get($diskPath));
            return $tmp;
        }

        return null;
    }

    private function limitText(string $text): string
    {
        $text = trim(preg_replace('/\n{3,}/', "\n\n", $text) ?? '');
        return function_exists('mb_substr')
            ? mb_substr($text, 0, $this->maxChars)
            : substr($text, 0, $this->maxChars);
    }
}
