<?php

namespace App\Mail;

use App\Models\CddSubmission;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ClientCandidateReviewMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public CddSubmission $submission,
        public string $reviewLink,
        public string $exportLink,
    ) {}

    public function envelope(): Envelope
    {
        $candidateName = trim(($this->submission->candidate->first_name ?? '') . ' ' . ($this->submission->candidate->last_name ?? ''));

        return new Envelope(subject: 'Candidate review ready — ' . $candidateName);
    }

    public function content(): Content
    {
        return new Content(view: 'emails.client-candidate-review');
    }
}