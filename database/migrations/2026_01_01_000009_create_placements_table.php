<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('placements', function (Blueprint $table) {
            $table->char('id', 36)->primary()->default(DB::raw('(UUID())'));
            $table->char('cdd_submission_id', 36)->unique();
            $table->char('mandate_id', 36);
            $table->char('recruiter_id', 36);
            $table->char('client_id', 36);

            $table->decimal('gross_reward', 12, 2);
            $table->decimal('platform_fee', 12, 2);
            $table->decimal('net_payout', 12, 2);
            $table->decimal('penalty_amount', 12, 2)->default(0);
            $table->decimal('final_payout', 12, 2);
            $table->string('currency', 3)->default('SGD');

            $table->enum('payout_status', ['pending', 'processing', 'paid', 'on_hold', 'failed'])->default('pending');
            $table->timestamp('payout_date')->nullable();
            $table->string('stripe_transfer_id')->nullable();
            $table->date('candidate_start_date')->nullable();
            $table->timestamp('placed_at')->useCurrent();

            $table->timestamps();

            $table->foreign('cdd_submission_id')->references('id')->on('cdd_submissions');
            $table->foreign('mandate_id')->references('id')->on('mandates');
            $table->foreign('recruiter_id')->references('id')->on('recruiters');
            $table->foreign('client_id')->references('id')->on('clients');

            $table->index('recruiter_id');
            $table->index('payout_status');
            $table->index('placed_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('placements');
    }
};
