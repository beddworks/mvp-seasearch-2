<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Add sourced, screened to client_status enum for kanban pipeline
        DB::statement("ALTER TABLE cdd_submissions MODIFY COLUMN client_status ENUM('sourced','screened','pending','shortlisted','interview','offered','offer_made','hired','rejected','on_hold') DEFAULT 'pending'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE cdd_submissions MODIFY COLUMN client_status ENUM('pending','shortlisted','interview','offer_made','hired','rejected','on_hold') DEFAULT 'pending'");
    }
};
