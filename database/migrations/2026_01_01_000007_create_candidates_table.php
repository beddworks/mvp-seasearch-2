<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('candidates', function (Blueprint $table) {
            $table->char('id', 36)->primary()->default(DB::raw('(UUID())'));
            $table->char('recruiter_id', 36);

            $table->string('first_name');
            $table->string('last_name');
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->string('linkedin_url')->nullable();
            $table->string('current_role')->nullable();
            $table->string('current_company')->nullable();
            $table->string('location')->nullable();
            $table->integer('years_experience')->nullable();

            $table->string('cv_url')->nullable();
            $table->string('cv_original_name')->nullable();
            $table->timestamp('cv_uploaded_at')->nullable();
            $table->timestamp('cv_parsed_at')->nullable();
            $table->json('parsed_profile')->nullable();
            $table->json('skills')->nullable();
            $table->text('notes')->nullable();

            $table->timestamps();

            $table->foreign('recruiter_id')->references('id')->on('recruiters')->cascadeOnDelete();
            $table->index('recruiter_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('candidates');
    }
};
