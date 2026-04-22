<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('gsheet_sync_log', function (Blueprint $table) {
            $table->char('id', 36)->primary()->default(DB::raw('(UUID())'));
            $table->char('client_id', 36)->nullable();
            $table->char('mandate_id', 36)->nullable();
            $table->char('cdd_submission_id', 36)->nullable();
            $table->enum('action', ['row_added', 'row_updated', 'tab_created']);
            $table->string('gsheet_id')->nullable();
            $table->string('tab_name')->nullable();
            $table->integer('row_index')->nullable();
            $table->boolean('success')->default(true);
            $table->text('error_message')->nullable();
            $table->timestamp('synced_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('gsheet_sync_log');
    }
};
