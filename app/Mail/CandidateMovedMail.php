<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class CandidateMovedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $title,
        public string $body,
        public ?string $link = null,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: $this->title);
    }

    public function content(): Content
    {
        return new Content(view: 'emails.notification', with: [
            'title'    => $this->title,
            'body'     => $this->body,
            'link'     => $this->link,
            'ctaLabel' => 'View Pipeline',
            'color'    => '#4B3AA8',
        ]);
    }
}
