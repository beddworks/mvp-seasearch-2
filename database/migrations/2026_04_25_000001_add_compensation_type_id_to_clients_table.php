<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->char('compensation_type_id', 36)->nullable()->after('contact_title');
            $table->foreign('compensation_type_id')->references('id')->on('compensation_types')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->dropForeign(['compensation_type_id']);
            $table->dropColumn('compensation_type_id');
        });
    }
};
