<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('recruiters', function (Blueprint $table) {
            $table->char('id', 36)->primary()->default(DB::raw('(UUID())'));
            $table->char('user_id', 36)->unique();

            // Profile
            $table->string('display_name')->nullable();
            $table->string('phone')->nullable();
            $table->string('linkedin_url')->nullable();
            $table->text('bio')->nullable();
            $table->string('avatar_url')->nullable();
            $table->integer('years_experience')->nullable();
            $table->string('current_firm')->nullable();
            $table->string('ea_license_number')->nullable();
            $table->string('ea_certificate_url')->nullable();
            $table->boolean('profile_complete')->default(false);

            // Segmentation — 3 INDEPENDENT attributes
            $table->string('recruiter_group')->nullable();
            $table->string('recruiter_group_secondary')->nullable();
            $table->enum('tier', ['junior', 'senior', 'elite'])->default('junior');
            $table->enum('trust_level', ['standard', 'trusted'])->default('standard');

            // Focus
            $table->json('industries')->nullable();
            $table->json('seniority_focus')->nullable();
            $table->json('geographies')->nullable();
            $table->string('specialty')->nullable();

            // Stats (denormalized)
            $table->integer('total_placements')->default(0);
            $table->decimal('total_earnings', 12, 2)->default(0);
            $table->integer('active_mandates_count')->default(0);

            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->index('tier');
            $table->index('trust_level');
            $table->index('recruiter_group');
            $table->index('active_mandates_count');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('recruiters');
    }
};
