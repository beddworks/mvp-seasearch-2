<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clients', function (Blueprint $table) {
            $table->char('id', 36)->primary()->default(DB::raw('(UUID())'));
            $table->char('user_id', 36)->nullable();
            $table->string('company_name');
            $table->string('industry')->nullable();
            $table->string('logo_url')->nullable();
            $table->string('accent_color', 7)->default('#0B4F8A');
            $table->string('website')->nullable();
            $table->string('contact_name')->nullable();
            $table->string('contact_email');
            $table->string('contact_title')->nullable();
            $table->text('gsheet_url')->nullable();
            $table->string('gsheet_id')->nullable();
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();
            $table->index('company_name');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('clients');
    }
};
