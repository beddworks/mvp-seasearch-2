<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mandates', function (Blueprint $table) {
            $table->char('id', 36)->primary()->default(DB::raw('(UUID())'));
            $table->char('client_id', 36);
            $table->char('posted_by_user_id', 36)->nullable();
            $table->char('compensation_type_id', 36)->nullable();

            // Role details
            $table->string('title');
            $table->longText('description')->nullable();
            $table->string('location')->nullable();
            $table->enum('seniority', ['c_suite', 'vp_director', 'manager', 'ic'])->nullable();
            $table->string('industry')->nullable();
            $table->enum('contract_type', ['full_time', 'contract', 'part_time'])->default('full_time');
            $table->integer('openings_count')->default(1);
            $table->boolean('is_remote')->default(false);

            // Compensation
            $table->decimal('salary_min', 12, 2)->nullable();
            $table->decimal('salary_max', 12, 2)->nullable();
            $table->string('salary_currency', 3)->default('SGD');
            $table->decimal('reward_min', 12, 2)->nullable();
            $table->decimal('reward_max', 12, 2)->nullable();
            $table->decimal('reward_pct', 5, 4)->nullable();

            // Screening
            $table->json('must_haves')->nullable();
            $table->json('nice_to_haves')->nullable();
            $table->json('green_flags')->nullable();
            $table->json('red_flags')->nullable();
            $table->json('screening_questions')->nullable();
            $table->json('ideal_candidates')->nullable();
            $table->json('ideal_source_companies')->nullable();

            // Status
            $table->enum('status', ['draft', 'active', 'paused', 'closed', 'filled', 'dropped'])->default('draft');
            $table->boolean('is_exclusive')->default(false);
            $table->char('exclusive_recruiter_id', 36)->nullable();
            $table->timestamp('exclusive_expires_at')->nullable();
            $table->boolean('is_featured')->default(false);
            $table->boolean('is_fast_track')->default(false);

            // Timer config
            $table->integer('timer_a_days')->default(3);
            $table->boolean('timer_b_active')->default(false);
            $table->integer('timer_b_days')->default(5);
            $table->decimal('timer_b_penalty_d6', 5, 4)->default(0.1000);
            $table->decimal('timer_b_penalty_d7', 5, 4)->default(0.2000);
            $table->decimal('timer_b_penalty_d8plus', 5, 4)->default(0.3000);
            $table->boolean('timer_c_active')->default(false);
            $table->integer('timer_c_sla_days')->default(5);

            // GSheet
            $table->string('gsheet_tab_name')->nullable();

            // Tracking
            $table->timestamp('published_at')->nullable();
            $table->timestamp('original_post_date')->nullable();
            $table->integer('assignment_count')->default(0);

            $table->timestamps();

            $table->foreign('client_id')->references('id')->on('clients')->cascadeOnDelete();
            $table->foreign('posted_by_user_id')->references('id')->on('users')->nullOnDelete();
            $table->foreign('compensation_type_id')->references('id')->on('compensation_types')->nullOnDelete();

            $table->index('status');
            $table->index('client_id');
            $table->index('seniority');
            $table->index('industry');
            $table->index('is_exclusive');
            $table->index('original_post_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mandates');
    }
};
