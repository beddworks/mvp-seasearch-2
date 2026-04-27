<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('mandates', function (Blueprint $table) {
            $table->json('job_responsibilities')->nullable()->after('nice_to_haves');
            $table->json('key_skills')->nullable()->after('job_responsibilities');
        });
    }

    public function down(): void
    {
        Schema::table('mandates', function (Blueprint $table) {
            $table->dropColumn(['job_responsibilities', 'key_skills']);
        });
    }
};
