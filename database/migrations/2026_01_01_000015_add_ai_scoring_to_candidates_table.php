<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('candidates', function (Blueprint $table) {
            // AI scoring fields (cached from ClaudeService.scoreCandidate())
            $table->integer('ai_score')->nullable()->after('cv_parsed_at');
            $table->json('score_breakdown')->nullable()->after('ai_score');
            $table->json('green_flags')->nullable()->after('score_breakdown');
            $table->json('red_flags')->nullable()->after('green_flags');
            $table->text('ai_summary')->nullable()->after('red_flags');
        });
    }

    public function down(): void
    {
        Schema::table('candidates', function (Blueprint $table) {
            $table->dropColumn(['ai_score', 'score_breakdown', 'green_flags', 'red_flags', 'ai_summary']);
        });
    }
};
