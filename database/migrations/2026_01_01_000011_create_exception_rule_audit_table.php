<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('exception_rule_audit', function (Blueprint $table) {
            $table->char('id', 36)->primary()->default(DB::raw('(UUID())'));
            $table->char('rule_id', 36)->nullable();
            $table->char('changed_by', 36)->nullable();
            $table->enum('action', ['created', 'updated', 'deleted', 'toggled']);
            $table->json('old_value')->nullable();
            $table->json('new_value')->nullable();
            $table->timestamp('changed_at')->useCurrent();

            $table->foreign('rule_id')->references('id')->on('exception_rules')->nullOnDelete();
            $table->foreign('changed_by')->references('id')->on('users')->nullOnDelete();
            $table->index('rule_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('exception_rule_audit');
    }
};
