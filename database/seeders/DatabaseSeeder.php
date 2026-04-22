<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Super admin
        $adminId = (string) Str::uuid();
        DB::table('users')->insert([
            'id'                => $adminId,
            'name'              => 'Sea Search Admin',
            'email'             => 'admin@seasearch.asia',
            'password'          => Hash::make('change-me-now'),
            'role'              => 'super_admin',
            'status'            => 'active',
            'email_verified_at' => now(),
            'created_at'        => now(),
            'updated_at'        => now(),
        ]);

        // 2. Default compensation types
        $types = [
            [
                'name'              => 'Percentage of Salary',
                'formula_type'      => 'percentage',
                'formula_fields'    => json_encode(['reward_pct' => 0.15, 'platform_fee_pct' => 0.20]),
                'trigger_condition' => 'on_hire',
                'sort_order'        => 1,
            ],
            [
                'name'              => 'Hourly Rate',
                'formula_type'      => 'hourly',
                'formula_fields'    => json_encode(['hourly_rate' => 0, 'hours_billed' => 0, 'platform_fee_pct' => 0.20]),
                'trigger_condition' => 'on_invoice',
                'sort_order'        => 2,
            ],
            [
                'name'              => 'Fixed Fee',
                'formula_type'      => 'fixed',
                'formula_fields'    => json_encode(['fixed_amount' => 0, 'platform_fee_pct' => 0.20]),
                'trigger_condition' => 'on_hire',
                'sort_order'        => 3,
            ],
            [
                'name'              => 'Per Project',
                'formula_type'      => 'milestone',
                'formula_fields'    => json_encode(['milestones' => [], 'platform_fee_pct' => 0.20]),
                'trigger_condition' => 'on_milestone',
                'sort_order'        => 4,
            ],
        ];

        foreach ($types as $t) {
            DB::table('compensation_types')->insert(array_merge($t, [
                'id'               => (string) Str::uuid(),
                'platform_fee_pct' => 0.20,
                'is_active'        => true,
                'created_at'       => now(),
                'updated_at'       => now(),
            ]));
        }

        // 3. Default exception rule (inactive — admin enables when ready)
        DB::table('exception_rules')->insert([
            'id'          => (string) Str::uuid(),
            'name'        => 'Trusted recruiter bypass',
            'description' => 'Recruiters with trust_level=trusted skip admin CDD review',
            'is_active'   => false,
            'rule_type'   => 'recruiter_trust',
            'trust_level' => 'trusted',
            'created_by'  => $adminId,
            'created_at'  => now(),
            'updated_at'  => now(),
        ]);

        // 4. Default report templates
        DB::table('report_templates')->insert([
            [
                'id'         => (string) Str::uuid(),
                'name'       => 'Unassigned Role Notice',
                'type'       => 'unclaimed_role',
                'subject'    => 'Update on your role: {role_title}',
                'body'       => "Dear {client_name},\n\nWe are currently assigning the right recruiter to {role_title}. We expect to confirm within 24-48 hours.\n\nWarm regards,\nSea Search Team",
                'variables'  => json_encode(['role_title', 'client_name', 'company_name']),
                'is_active'  => true,
                'created_by' => $adminId,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id'         => (string) Str::uuid(),
                'name'       => 'Role Dropped Notice',
                'type'       => 'role_dropped',
                'subject'    => 'Important update on {role_title}',
                'body'       => "Dear {client_name},\n\nAfter multiple assignment attempts, we were unable to progress the {role_title} mandate. We would like to discuss next steps.\n\nWarm regards,\nSea Search Team",
                'variables'  => json_encode(['role_title', 'client_name', 'company_name', 'assignment_count']),
                'is_active'  => true,
                'created_by' => $adminId,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }
}
