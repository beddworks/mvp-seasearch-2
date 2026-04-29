<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->string('agreement_file_url', 500)->nullable()->after('logo_url');
            $table->string('agreement_file_name', 255)->nullable()->after('agreement_file_url');
        });

        Schema::table('mandates', function (Blueprint $table) {
            $table->string('jd_file_url', 500)->nullable()->after('published_at');
            $table->string('jd_file_name', 255)->nullable()->after('jd_file_url');
        });
    }

    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->dropColumn(['agreement_file_url', 'agreement_file_name']);
        });

        Schema::table('mandates', function (Blueprint $table) {
            $table->dropColumn(['jd_file_url', 'jd_file_name']);
        });
    }
};
