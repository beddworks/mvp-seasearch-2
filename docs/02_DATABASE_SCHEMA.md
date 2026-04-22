# 02 — Database Schema (MySQL 8.0)
> SeaSearch PRD v3.0  
> All tables: InnoDB · utf8mb4 · UUID as CHAR(36) · timestamps included

---

## Migration Order (FK-safe)

```
001_create_users_table
002_create_compensation_types_table
003_create_clients_table
004_create_recruiters_table
005_create_mandates_table
006_create_mandate_claims_table
007_create_candidates_table
008_create_cdd_submissions_table
009_create_placements_table
010_create_exception_rules_table
011_create_exception_rule_audit_table
012_create_notifications_table
013_create_gsheet_sync_log_table
014_create_report_templates_table
```

---

## Migrations

### 001 — users

```php
Schema::create('users', function (Blueprint $table) {
    $table->uuid('id')->primary()->default(DB::raw('(UUID())'));
    $table->string('name');
    $table->string('email')->unique();
    $table->timestamp('email_verified_at')->nullable();
    $table->string('password')->nullable();          // nullable — SSO users have no password
    $table->string('google_id')->unique()->nullable();
    $table->string('avatar_url')->nullable();
    $table->enum('role', ['super_admin','admin','recruiter','client'])->default('recruiter');
    $table->enum('status', ['active','pending','suspended'])->default('active');
    $table->rememberToken();
    $table->timestamps();

    $table->index('role');
    $table->index('status');
});
```

### 002 — compensation_types

```php
Schema::create('compensation_types', function (Blueprint $table) {
    $table->uuid('id')->primary()->default(DB::raw('(UUID())'));
    $table->string('name');
    $table->boolean('is_active')->default(true);
    $table->enum('formula_type', ['percentage','hourly','fixed','milestone']);
    // formula_fields JSON examples:
    // percentage: {"reward_pct": 0.15, "platform_fee_pct": 0.20}
    // hourly:     {"hourly_rate": 0, "hours_billed": 0, "platform_fee_pct": 0.20}
    // fixed:      {"fixed_amount": 0, "platform_fee_pct": 0.20}
    // milestone:  {"milestones": [], "platform_fee_pct": 0.20}
    $table->json('formula_fields');
    $table->enum('trigger_condition', ['on_hire','on_invoice','on_milestone'])->default('on_hire');
    $table->decimal('platform_fee_pct', 5, 4)->default(0.2000);
    $table->text('notes')->nullable();
    $table->integer('sort_order')->default(0);
    $table->timestamps();
});
```

### 003 — clients

```php
Schema::create('clients', function (Blueprint $table) {
    $table->uuid('id')->primary()->default(DB::raw('(UUID())'));
    $table->uuid('user_id')->nullable();           // nullable — may not have portal login yet
    $table->string('company_name');
    $table->string('industry')->nullable();
    $table->string('logo_url')->nullable();
    $table->string('accent_color', 7)->default('#0B4F8A');  // hex for client portal
    $table->string('website')->nullable();
    $table->string('contact_name')->nullable();
    $table->string('contact_email');
    $table->string('contact_title')->nullable();
    $table->text('gsheet_url')->nullable();        // master GSheet — sent once
    $table->string('gsheet_id')->nullable();       // Google Sheets ID for API
    $table->enum('status', ['active','inactive'])->default('active');
    $table->timestamps();

    $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();
    $table->index('company_name');
    $table->index('status');
});
```

### 004 — recruiters

```php
Schema::create('recruiters', function (Blueprint $table) {
    $table->uuid('id')->primary()->default(DB::raw('(UUID())'));
    $table->uuid('user_id')->unique();

    // Profile
    $table->string('display_name')->nullable();
    $table->string('phone')->nullable();
    $table->string('linkedin_url')->nullable();
    $table->text('bio')->nullable();
    $table->string('avatar_url')->nullable();
    $table->integer('years_experience')->nullable();
    $table->string('current_firm')->nullable();
    $table->string('ea_license_number')->nullable();
    $table->string('ea_certificate_url')->nullable();
    $table->boolean('profile_complete')->default(false);

    // Segmentation — 3 INDEPENDENT attributes, never merge
    // Group: reporting/dashboard filter only — ZERO workflow impact
    $table->string('recruiter_group')->nullable();             // Dwikar / Emma / BTI / Jiebei / custom — chosen at signup
    $table->string('recruiter_group_secondary')->nullable();   // optional secondary tag — admin adds
    // Tier: commission modifier — admin sets
    $table->enum('tier', ['junior','senior','elite'])->default('junior');
    // Trust: CDD gate bypass eligibility — admin sets
    $table->enum('trust_level', ['standard','trusted'])->default('standard');

    // Focus
    $table->json('industries')->nullable();
    $table->json('seniority_focus')->nullable();
    $table->json('geographies')->nullable();
    $table->string('specialty')->nullable();

    // Stats (denormalized)
    $table->integer('total_placements')->default(0);
    $table->decimal('total_earnings', 12, 2)->default(0);
    $table->integer('active_mandates_count')->default(0);   // HARD LIMIT: <= 2

    $table->timestamps();

    $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
    $table->index('tier');
    $table->index('trust_level');
    $table->index('recruiter_group');
    $table->index('active_mandates_count');
});
```

### 005 — mandates

```php
Schema::create('mandates', function (Blueprint $table) {
    $table->uuid('id')->primary()->default(DB::raw('(UUID())'));
    $table->uuid('client_id');
    $table->uuid('posted_by_user_id')->nullable();
    $table->uuid('compensation_type_id')->nullable();

    // Role details
    $table->string('title');
    $table->longText('description')->nullable();        // full JD, HTML from TipTap
    $table->string('location')->nullable();
    $table->enum('seniority', ['c_suite','vp_director','manager','ic'])->nullable();
    $table->string('industry')->nullable();
    $table->enum('contract_type', ['full_time','contract','part_time'])->default('full_time');
    $table->integer('openings_count')->default(1);
    $table->boolean('is_remote')->default(false);

    // Compensation
    $table->decimal('salary_min', 12, 2)->nullable();
    $table->decimal('salary_max', 12, 2)->nullable();
    $table->string('salary_currency', 3)->default('SGD');
    $table->decimal('reward_min', 12, 2)->nullable();
    $table->decimal('reward_max', 12, 2)->nullable();
    $table->decimal('reward_pct', 5, 4)->nullable();

    // Screening (JSON arrays)
    $table->json('must_haves')->nullable();
    $table->json('nice_to_haves')->nullable();
    $table->json('green_flags')->nullable();
    $table->json('red_flags')->nullable();
    $table->json('screening_questions')->nullable();
    $table->json('ideal_candidates')->nullable();       // reference profiles — do not contact
    $table->json('ideal_source_companies')->nullable();

    // Status
    $table->enum('status', ['draft','active','paused','closed','filled','dropped'])->default('draft');
    $table->boolean('is_exclusive')->default(false);
    $table->uuid('exclusive_recruiter_id')->nullable();
    $table->timestamp('exclusive_expires_at')->nullable();
    $table->boolean('is_featured')->default(false);
    $table->boolean('is_fast_track')->default(false);   // exception: bypass admin CDD review

    // Timer config (per mandate — overrides global)
    $table->integer('timer_a_days')->default(3);        // days to submit 1st profile
    $table->boolean('timer_b_active')->default(false);  // 3 profiles in N days
    $table->integer('timer_b_days')->default(5);
    $table->decimal('timer_b_penalty_d6', 5, 4)->default(0.1000);   // -10%
    $table->decimal('timer_b_penalty_d7', 5, 4)->default(0.2000);   // -20%
    $table->decimal('timer_b_penalty_d8plus', 5, 4)->default(0.3000); // -30%
    $table->boolean('timer_c_active')->default(false);  // capacity lock
    $table->integer('timer_c_sla_days')->default(5);

    // GSheet
    $table->string('gsheet_tab_name')->nullable();

    // Tracking
    $table->timestamp('published_at')->nullable();
    $table->timestamp('original_post_date')->nullable();  // global age across reassignments
    $table->integer('assignment_count')->default(0);       // max 3 before DROP

    $table->timestamps();

    $table->foreign('client_id')->references('id')->on('clients')->cascadeOnDelete();
    $table->foreign('posted_by_user_id')->references('id')->on('users')->nullOnDelete();
    $table->foreign('compensation_type_id')->references('id')->on('compensation_types')->nullOnDelete();

    $table->index('status');
    $table->index('client_id');
    $table->index('seniority');
    $table->index('industry');
    $table->index('is_exclusive');
    $table->index('original_post_date');
});
```

### 006 — mandate_claims

```php
Schema::create('mandate_claims', function (Blueprint $table) {
    $table->uuid('id')->primary()->default(DB::raw('(UUID())'));
    $table->uuid('mandate_id');
    $table->uuid('recruiter_id');

    $table->enum('status', ['pending','approved','rejected','withdrawn'])->default('pending');
    $table->uuid('reviewed_by')->nullable();
    $table->text('admin_note')->nullable();
    $table->timestamp('reviewed_at')->nullable();
    $table->integer('rejection_count')->default(0);
    $table->boolean('is_retry')->default(false);
    $table->timestamp('assigned_at')->nullable();    // Day 0 — set when approved

    $table->timestamps();

    $table->foreign('mandate_id')->references('id')->on('mandates')->cascadeOnDelete();
    $table->foreign('recruiter_id')->references('id')->on('recruiters')->cascadeOnDelete();
    $table->foreign('reviewed_by')->references('id')->on('users')->nullOnDelete();

    $table->unique(['mandate_id','recruiter_id']);   // one claim per recruiter per mandate
    $table->index('status');
    $table->index('assigned_at');
});
```

### 007 — candidates

```php
Schema::create('candidates', function (Blueprint $table) {
    $table->uuid('id')->primary()->default(DB::raw('(UUID())'));
    $table->uuid('recruiter_id');

    $table->string('first_name');
    $table->string('last_name');
    $table->string('email')->nullable();
    $table->string('phone')->nullable();
    $table->string('linkedin_url')->nullable();
    $table->string('current_role')->nullable();
    $table->string('current_company')->nullable();
    $table->string('location')->nullable();
    $table->integer('years_experience')->nullable();

    $table->string('cv_url')->nullable();
    $table->string('cv_original_name')->nullable();
    $table->timestamp('cv_uploaded_at')->nullable();
    $table->timestamp('cv_parsed_at')->nullable();
    $table->json('parsed_profile')->nullable();     // full Claude-parsed CV data
    $table->json('skills')->nullable();             // extracted skills array
    $table->text('notes')->nullable();

    $table->timestamps();

    $table->foreign('recruiter_id')->references('id')->on('recruiters')->cascadeOnDelete();
    $table->index('recruiter_id');
});
```

### 008 — cdd_submissions

```php
Schema::create('cdd_submissions', function (Blueprint $table) {
    $table->uuid('id')->primary()->default(DB::raw('(UUID())'));
    $table->uuid('mandate_id');
    $table->uuid('recruiter_id');
    $table->uuid('candidate_id');

    $table->timestamp('submitted_at')->useCurrent();
    $table->text('recruiter_note')->nullable();
    $table->tinyInteger('submission_number')->nullable(); // 1, 2, or 3

    // AI scoring
    $table->integer('ai_score')->nullable();              // 0–100
    $table->json('score_breakdown')->nullable();
    // {"experience":85,"industry":90,"scope":75,"leadership":80,"digital":70}
    $table->text('ai_summary')->nullable();
    $table->json('green_flags')->nullable();
    $table->json('red_flags')->nullable();

    // Admin review gate
    $table->enum('admin_review_status', ['pending','approved','rejected','bypassed'])->default('pending');
    $table->uuid('admin_reviewed_by')->nullable();
    $table->timestamp('admin_reviewed_at')->nullable();
    $table->text('admin_note')->nullable();
    $table->tinyInteger('admin_rejection_count')->default(0);  // max 2; 2nd = slot burned
    $table->boolean('exception_bypass')->default(false);

    // Client status (updated via tokenized link or portal)
    $table->enum('client_status', ['pending','shortlisted','interview','offer_made','hired','rejected','on_hold'])->default('pending');
    $table->timestamp('client_status_updated_at')->nullable();
    $table->text('client_rejection_reason')->nullable();

    // Interview
    $table->timestamp('interview_date')->nullable();
    $table->enum('interview_format', ['in_person','video','panel'])->nullable();
    $table->text('interview_notes')->nullable();
    $table->text('interview_feedback')->nullable();
    $table->tinyInteger('interview_feedback_stars')->nullable(); // 1-5
    $table->enum('interview_verdict', ['strong_yes','yes','uncertain','no'])->nullable();

    // Client feedback from recruiter kanban
    $table->text('client_feedback')->nullable();
    $table->enum('client_feedback_sentiment', ['positive','neutral','negative'])->nullable();

    // Tokenized link
    $table->string('token')->unique()->nullable();
    $table->timestamp('token_created_at')->nullable();
    $table->timestamp('token_used_at')->nullable();

    // GSheet
    $table->integer('gsheet_row_index')->nullable();

    // Penalty record
    $table->decimal('penalty_applied', 5, 4)->default(0);
    $table->integer('days_late')->default(0);

    $table->timestamps();

    $table->foreign('mandate_id')->references('id')->on('mandates')->cascadeOnDelete();
    $table->foreign('recruiter_id')->references('id')->on('recruiters')->cascadeOnDelete();
    $table->foreign('candidate_id')->references('id')->on('candidates')->cascadeOnDelete();
    $table->foreign('admin_reviewed_by')->references('id')->on('users')->nullOnDelete();

    $table->index('mandate_id');
    $table->index('recruiter_id');
    $table->index('admin_review_status');
    $table->index('client_status');
    $table->index('token');
    $table->index('submitted_at');
});
```

### 009 — placements

```php
Schema::create('placements', function (Blueprint $table) {
    $table->uuid('id')->primary()->default(DB::raw('(UUID())'));
    $table->uuid('cdd_submission_id')->unique();
    $table->uuid('mandate_id');
    $table->uuid('recruiter_id');
    $table->uuid('client_id');

    $table->decimal('gross_reward', 12, 2);
    $table->decimal('platform_fee', 12, 2);
    $table->decimal('net_payout', 12, 2);
    $table->decimal('penalty_amount', 12, 2)->default(0);
    $table->decimal('final_payout', 12, 2);
    $table->string('currency', 3)->default('SGD');

    $table->enum('payout_status', ['pending','processing','paid','on_hold','failed'])->default('pending');
    $table->timestamp('payout_date')->nullable();
    $table->string('stripe_transfer_id')->nullable();
    $table->date('candidate_start_date')->nullable();
    $table->timestamp('placed_at')->useCurrent();

    $table->timestamps();

    $table->foreign('cdd_submission_id')->references('id')->on('cdd_submissions');
    $table->foreign('mandate_id')->references('id')->on('mandates');
    $table->foreign('recruiter_id')->references('id')->on('recruiters');
    $table->foreign('client_id')->references('id')->on('clients');

    $table->index('recruiter_id');
    $table->index('payout_status');
    $table->index('placed_at');
});
```

### 010 — exception_rules

```php
Schema::create('exception_rules', function (Blueprint $table) {
    $table->uuid('id')->primary()->default(DB::raw('(UUID())'));
    $table->string('name');
    $table->text('description')->nullable();
    $table->boolean('is_active')->default(false);   // OFF by default
    $table->enum('rule_type', ['recruiter_trust','role_type','both']);
    // Rule A: trust_level = trusted → bypass admin CDD gate
    $table->string('trust_level')->nullable();       // 'trusted'
    // Rule B: mandate is_fast_track = true → bypass admin CDD gate
    $table->string('role_type')->nullable();         // 'fast_track'
    $table->uuid('created_by')->nullable();
    $table->timestamps();

    $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
});
```

### 011 — exception_rule_audit

```php
Schema::create('exception_rule_audit', function (Blueprint $table) {
    $table->uuid('id')->primary()->default(DB::raw('(UUID())'));
    $table->uuid('rule_id')->nullable();
    $table->uuid('changed_by')->nullable();
    $table->enum('action', ['created','updated','deleted','toggled']);
    $table->json('old_value')->nullable();
    $table->json('new_value')->nullable();
    $table->timestamp('changed_at')->useCurrent();

    $table->foreign('rule_id')->references('id')->on('exception_rules')->nullOnDelete();
    $table->foreign('changed_by')->references('id')->on('users')->nullOnDelete();
    $table->index('rule_id');
});
```

### 012 — notifications

```php
Schema::create('notifications', function (Blueprint $table) {
    $table->uuid('id')->primary()->default(DB::raw('(UUID())'));
    $table->uuid('user_id');
    $table->string('type');
    $table->string('title');
    $table->text('body')->nullable();
    $table->string('action_url')->nullable();
    $table->boolean('is_read')->default(false);
    $table->timestamp('read_at')->nullable();
    $table->json('metadata')->nullable();
    $table->timestamp('created_at')->useCurrent();

    $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
    $table->index('user_id');
    $table->index(['user_id','is_read']);
});
```

### 013 — gsheet_sync_log

```php
Schema::create('gsheet_sync_log', function (Blueprint $table) {
    $table->uuid('id')->primary()->default(DB::raw('(UUID())'));
    $table->uuid('client_id')->nullable();
    $table->uuid('mandate_id')->nullable();
    $table->uuid('cdd_submission_id')->nullable();
    $table->enum('action', ['row_added','row_updated','tab_created']);
    $table->string('gsheet_id')->nullable();
    $table->string('tab_name')->nullable();
    $table->integer('row_index')->nullable();
    $table->boolean('success')->default(true);
    $table->text('error_message')->nullable();
    $table->timestamp('synced_at')->useCurrent();
});
```

### 014 — report_templates

```php
Schema::create('report_templates', function (Blueprint $table) {
    $table->uuid('id')->primary()->default(DB::raw('(UUID())'));
    $table->string('name');
    $table->enum('type', ['unclaimed_role','role_dropped','role_update','general']);
    $table->string('subject');
    $table->longText('body');               // supports {role_title}, {client_name} etc
    $table->json('variables')->nullable();  // list of available variable names
    $table->boolean('is_active')->default(true);
    $table->uuid('created_by')->nullable();
    $table->timestamps();

    $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
});
```

---

## DatabaseSeeder

```php
// database/seeders/DatabaseSeeder.php
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
            ['name' => 'Percentage of Salary', 'formula_type' => 'percentage',
             'formula_fields' => '{"reward_pct":0.15,"platform_fee_pct":0.20}',
             'trigger_condition' => 'on_hire', 'sort_order' => 1],
            ['name' => 'Hourly Rate', 'formula_type' => 'hourly',
             'formula_fields' => '{"hourly_rate":0,"hours_billed":0,"platform_fee_pct":0.20}',
             'trigger_condition' => 'on_invoice', 'sort_order' => 2],
            ['name' => 'Fixed Fee', 'formula_type' => 'fixed',
             'formula_fields' => '{"fixed_amount":0,"platform_fee_pct":0.20}',
             'trigger_condition' => 'on_hire', 'sort_order' => 3],
            ['name' => 'Per Project', 'formula_type' => 'milestone',
             'formula_fields' => '{"milestones":[],"platform_fee_pct":0.20}',
             'trigger_condition' => 'on_milestone', 'sort_order' => 4],
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
                'body'       => "Dear {client_name},\n\nWe are currently assigning the right recruiter to {role_title}. We expect to confirm within 24–48 hours.\n\nWarm regards,\nSea Search Team",
                'variables'  => '["role_title","client_name","company_name"]',
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
                'variables'  => '["role_title","client_name","company_name","assignment_count"]',
                'is_active'  => true,
                'created_by' => $adminId,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }
}
```

---

## Key Enums Reference

| Table | Column | Values |
|-------|--------|--------|
| users | role | super_admin, admin, recruiter, client |
| users | status | active, pending, suspended |
| recruiters | tier | junior, senior, elite |
| recruiters | trust_level | standard, trusted |
| mandates | status | draft, active, paused, closed, filled, dropped |
| mandates | seniority | c_suite, vp_director, manager, ic |
| mandate_claims | status | pending, approved, rejected, withdrawn |
| cdd_submissions | admin_review_status | pending, approved, rejected, bypassed |
| cdd_submissions | client_status | pending, shortlisted, interview, offer_made, hired, rejected, on_hold |
| placements | payout_status | pending, processing, paid, on_hold, failed |
| compensation_types | formula_type | percentage, hourly, fixed, milestone |

---

## MySQL UUID Pattern for All Models

```php
// In every model
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class Mandate extends Model
{
    use HasUuids;

    // HasUuids auto-generates UUID on create
    // For MySQL: add this to boot() if UUID() default doesn't work
    protected static function boot()
    {
        parent::boot();
        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
        });
    }
}
```
