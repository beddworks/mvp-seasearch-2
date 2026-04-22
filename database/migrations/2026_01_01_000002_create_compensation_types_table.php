<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('compensation_types', function (Blueprint $table) {
            $table->char('id', 36)->primary()->default(DB::raw('(UUID())'));
            $table->string('name');
            $table->boolean('is_active')->default(true);
            $table->enum('formula_type', ['percentage', 'hourly', 'fixed', 'milestone']);
            $table->json('formula_fields');
            $table->enum('trigger_condition', ['on_hire', 'on_invoice', 'on_milestone'])->default('on_hire');
            $table->decimal('platform_fee_pct', 5, 4)->default(0.2000);
            $table->text('notes')->nullable();
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('compensation_types');
    }
};
