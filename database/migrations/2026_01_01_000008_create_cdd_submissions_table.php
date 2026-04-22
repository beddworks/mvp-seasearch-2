<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cdd_submissions', function (Blueprint $table) {
            $table->char('id', 36)->primary()->default(DB::raw('(UUID())'));
            $table->char('mandate_id', 36);
            $table->char('recruiter_id', 36);
            $table->char('candidate_id', 36);

            $table->timestamp('submitted_at')->useCurrent();
            $table->text('recruiter_note')->nullable();
            $table->tinyInteger('submission_number')->nullable();

            // AI scoring
            $table->integer('ai_score')->nullable();
            $table->json('score_breakdown')->nullable();
            $table->text('ai_summary')->nullable();
            $table->json('green_flags')->nullable();
            $table->json('red_flags')->nullable();

            // Admin review gate
            $table->enum('admin_review_status', ['pending', 'approved', 'rejected', 'bypassed'])->default('pending');
            $table->char('admin_reviewed_by', 36)->nullable();
            $table->timestamp('admin_reviewed_at')->nullable();
            $table->text('admin_note')->nullable();
            $table->tinyInteger('admin_rejection_count')->default(0);
            $table->boolean('exception_bypass')->default(false);

            // Client status
            $table->enum('client_status', ['pending', 'shortlisted', 'interview', 'offer_made', 'hired', 'rejected', 'on_hold'])->default('pending');
            $table->timestamp('client_status_updated_at')->nullable();
            $table->text('client_rejection_reason')->nullable();

            // Interview
            $table->timestamp('interview_date')->nullable();
            $table->enum('interview_format', ['in_person', 'video', 'panel'])->nullable();
            $table->text('interview_notes')->nullable();
            $table->text('interview_feedback')->nullable();
            $table->tinyInteger('interview_feedback_stars')->nullable();
            $table->enum('interview_verdict', ['strong_yes', 'yes', 'uncertain', 'no'])->nullable();

            // Client feedback from recruiter kanban
            $table->text('client_feedback')->nullable();
            $table->enum('client_feedback_sentiment', ['positive', 'neutral', 'negative'])->nullable();

            // Tokenized link
            $table->string('token')->unique()->nullable();
            $table->timestamp('token_created_at')->nullable();
            $table->timestamp('token_used_at')->nullable();

            // GSheet
            $table->integer('gsheet_row_index')->nullable();

            // Penalty
            $table->decimal('penalty_applied', 5, 4)->default(0);
            $table->integer('days_late')->default(0);

            $table->timestamps();

            $table->foreign('mandate_id')->references('id')->on('mandates')->cascadeOnDelete();
            $table->foreign('recruiter_id')->references('id')->on('recruiters')->cascadeOnDelete();
            $table->foreign('candidate_id')->references('id')->on('candidates')->cascadeOnDelete();
            $table->foreign('admin_reviewed_by')->references('id')->on('users')->nullOnDelete();

            $table->index('mandate_id');
            $table->index('recruiter_id');
            $table->index('admin_review_status');
            $table->index('client_status');
            $table->index('token');
            $table->index('submitted_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cdd_submissions');
    }
};
