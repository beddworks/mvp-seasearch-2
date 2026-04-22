<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mandate_claims', function (Blueprint $table) {
            $table->char('id', 36)->primary()->default(DB::raw('(UUID())'));
            $table->char('mandate_id', 36);
            $table->char('recruiter_id', 36);

            $table->enum('status', ['pending', 'approved', 'rejected', 'withdrawn'])->default('pending');
            $table->char('reviewed_by', 36)->nullable();
            $table->text('admin_note')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->integer('rejection_count')->default(0);
            $table->boolean('is_retry')->default(false);
            $table->timestamp('assigned_at')->nullable();

            $table->timestamps();

            $table->foreign('mandate_id')->references('id')->on('mandates')->cascadeOnDelete();
            $table->foreign('recruiter_id')->references('id')->on('recruiters')->cascadeOnDelete();
            $table->foreign('reviewed_by')->references('id')->on('users')->nullOnDelete();

            $table->unique(['mandate_id', 'recruiter_id']);
            $table->index('status');
            $table->index('assigned_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mandate_claims');
    }
};
