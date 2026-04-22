# 17 — AI Vibe Coding Master Context (MySQL Edition)
> SeaSearch PRD v3.0  
> Prepend this ENTIRE block to every AI coding prompt. No exceptions.

---

```
=== SEASEARCH MASTER CONTEXT v3.0 — MYSQL EDITION ===

WHAT IS THIS:
SeaSearch is an AI-powered executive recruitment platform for Southeast Asia.
B2B two-sided marketplace. Companies post mandates. Vetted recruiters pick mandates,
source and submit candidates (CDDs), Sea Search takes 20% platform fee on placements.

ROLES:
1. Admin — full control, approves everything, manages all CRUD
2. Recruiter — picks roles (max 2), submits candidates (max 3 per role), earns commissions
3. Client — admin-created only (no self-register), reviews candidates via email/GSheet/portal
4. Candidate — passive, never accesses the platform

TECH STACK:
Backend:     Laravel 11 (PHP 8.2+)
Frontend:    React 18 + Inertia.js (NOT a separate SPA)
Database:    MySQL 8.0 — UUID as CHAR(36), DEFAULT (UUID()), JSON type (not JSONB)
Styling:     Custom CSS variables in app.css — NEVER use Tailwind classes
Auth:        Google SSO via Socialite (recruiters) · Email/password (admin only)
AI:          Claude API claude-sonnet-4-6 — SERVER-SIDE ONLY, never in React
Storage:     S3-compatible (Supabase/AWS) — CVs, EA certificates
Queue:       Laravel Queues — ParseCvJob · SyncGSheetJob · SendClientEmailJob
Kanban:      @dnd-kit/core + @dnd-kit/sortable (drag-drop between columns)

MYSQL-SPECIFIC RULES:
- UUIDs: CHAR(36) with DEFAULT (UUID()) in migrations
- All models: HasUuids trait + boot() fallback with Str::uuid()
- No JSONB — use JSON type for parsed_profile, formula_fields, skills arrays
- No TEXT[] arrays — use JSON columns for array data
- No gen_random_uuid() — use UUID() function or Str::uuid() in PHP
- No CHECK constraints for enums — use ENUM('a','b','c') column type
- BOOLEAN = TINYINT(1) in MySQL (Laravel handles this automatically)
- String collation: utf8mb4_unicode_ci on all tables
- engine: InnoDB on all tables

DESIGN SYSTEM — NEVER HARDCODE COLORS:
--ink: #0D0C0A        --ink2: #2A2926      --ink4: #6B6860
--mist: #F9F8F5       --mist2: #F2F0EC     --wire: #E0DDD6
--sea: #0B4F8A        --sea2: #1A6DB5      --sea3: #3589D4   --sea-pale: #E8F2FB
--jade: #1A4D1E       --jade2: #2E7D33     --jade3: #4CAF52  --jade-pale: #EAF4EB
--amber2: #B85C1A     --amber-pale: #FDF0E8
--ruby2: #B52525      --ruby-pale: #FBE8E8
--violet2: #4B3AA8    --violet-pale: #EEE9FB
--gold2: #C49A00      --gold-pale: #FDF8E1
--font-head: 'Syne',sans-serif    --font: 'DM Sans',sans-serif    --mono: 'DM Mono',monospace
--sidebar: 230px  --topbar: 56px  --r: 12px  --rsm: 7px  --rxs: 4px

LAYOUT: Dark ink sidebar + dark topbar + light mist content. No dark mode. Desktop only.
Cards: border: 1px solid var(--wire) — NO box-shadow EVER.
Stat cards: always have position:absolute; top:0; left:0; right:0; height:3px accent bar.

CSS CLASSES (defined in app.css — never recreate):
.btn .btn-primary .btn-secondary .btn-ghost .btn-sm .btn-danger
.badge .badge-sea .badge-jade .badge-amber .badge-ruby .badge-violet .badge-gold
.cbadge .cb-sea .cb-jade .cb-amb .cb-vio .cb-rub .cb-gld
.dcard .dcard-head .dcard-title .sblock .sblock-head .sblock-body
.sbi .sbi.on .sbadge .sm .sm-bar .sm-num .sm-lbl
.form-input .form-label .form-error .form-group
.stat-row (4-col) .g21 (1fr 340px) .g3 (1fr 1fr 1fr) .table-wrap

INERTIA RULES:
- All forms: useForm from @inertiajs/react — NEVER raw fetch for mutations
- All data from controller via Inertia::render() props
- Shared props: auth.user · auth.recruiter · flash · unread_notifications
- Flash: return redirect()->back()->with('success','Done.')

LARAVEL RULES:
- Controllers thin — business logic in Services
- Heavy ops always queued: ParseCvJob / SyncGSheetJob / SendClientEmailJob
- Route middleware: role:admin · role:recruiter · role:client
- All models use HasUuids + boot() fallback for MySQL UUID generation

KANBAN — KEY KNOWLEDGE:
- 6 columns: sourced · screened · interview · offered · hired · rejected
- Drag-drop: @dnd-kit/core DndContext + @dnd-kit/sortable SortableContext
- Droppable columns: useDroppable({ id: stage })
- Sortable cards: useSortable({ id: submission.id })
- DragOverlay for ghost card while dragging
- On dragEnd: optimistic state update → POST recruiter.kanban.move
- Side panel (310px): opens on card click, stage mover + interview + feedback + actions
- 7 controller methods: show · move · scheduleInterview · saveClientFeedback · submitToClient · reject · addCandidate

DATABASE — KEY TABLES:
users            role: super_admin|admin|recruiter|client · status: active|pending|suspended
recruiters       tier: junior|senior|elite · trust_level: standard|trusted
                 recruiter_group: Dwikar|Emma|BTI|Jiebei|custom (ZERO workflow impact — reporting only)
                 active_mandates_count ≤ 2
clients          contact_email · gsheet_id · gsheet_url · accent_color
                 ADMIN-CREATED ONLY — no self-register
mandates         status: draft|active|paused|closed|filled|dropped · assignment_count ≤ 3
                 timer_a_days · timer_b_active(bool,default:false) · timer_c_active(bool,default:false)
                 is_fast_track · compensation_type_id
mandate_claims   status: pending|approved|rejected · assigned_at = Day 0
cdd_submissions  admin_review_status: pending|approved|rejected|bypassed
                 client_status: pending|shortlisted|interview|offer_made|hired|rejected|on_hold
                 token (one-time) · exception_bypass · submission_number 1-3
placements       gross_reward · platform_fee · net_payout · penalty_amount · final_payout
compensation_types formula_type: percentage|hourly|fixed|milestone · formula_fields: JSON

PLATFORM FEE TYPES (CRUD — 4 types):
① Percentage — reward_pct × salary_max
② Hourly — hourly_rate × hours_billed
③ Fixed Rate — fixed_amount
④ Per Project — sum of milestones[]

RECRUITER SEGMENTATION (3 INDEPENDENT ATTRIBUTES):
Group:       Dwikar / Emma / BTI / Jiebei / custom — selected at signup — ZERO workflow impact
Tier:        Junior(base) / Senior(+5%) / Elite(+10%) — commission modifier — admin sets
Trust Level: Standard / Trusted — CDD gate bypass — admin sets

BUSINESS RULES — NEVER VIOLATE:
1. Recruiter max 2 active mandates — check active_mandates_count < 2 to pick
2. Admin MUST approve claim → sets Day 0 (assigned_at)
3. Admin MUST approve CDD before client sees it — UNLESS exception rule (trusted OR fast_track)
4. Max 2 CDD rejections — 2nd = slot burned
5. Day 0 = assigned_at — Timer A starts immediately (default 3 days to submit 1st profile)
6. Timer A fail: reassign to new recruiter (fresh Day 0). After 3 fails: role DROPPED
7. Timer B (default OFF): 3 profiles in 5 days. Late: Day6=-10%, Day7=-20%, Day8+=-30%
8. Timer C (default OFF): client SLA 5 days. Breach = admin alerted, manual slot free
9. Slot cycle ends: when 3rd CDD submitted OR client gives final feedback (whichever first)
10. Client feedback = tokenized one-time email link — never email reply parsing
11. GSheet auto-updates on every CDD approval and status change
12. Client NOT auto-notified on unclaimed roles — admin sends report manually via template
13. No auto-assign at capacity — admin manually assigns
14. Timer state ALWAYS computed from timestamps — never stored as boolean
15. Recruiter group = ZERO workflow impact — pure reporting/dashboard filter

SERVICES:
ClaudeService       parseCV() · scoreCandidate() · generateBrief() · draftOutreach() · generateInterviewQuestions()
GoogleSheetsService createClientSheet() · createMandateTab() · addCddRow() · updateStatusCell()
TimerService        checkTimerA/B/C() · calculatePenalty() · checkAndFreeSlot()
CommissionService   calculate() · settle()
NotificationService all event types (see 14_FEATURE_NOTIFICATIONS.md)
TokenService        generate() · validate() · markUsed()
ExceptionService    shouldBypass(recruiter, mandate) → bool
SlotService         checkAndFreeSlot() · adminFreeSlot()

QUEUED JOBS:
ParseCvJob::dispatch($candidate, $mandateId)->onQueue('ai')
SyncGSheetJob::dispatch($entity, 'add_row|update_status|create_tab')->onQueue('sheets')
SendClientEmailJob::dispatch($submission)->onQueue('email')

SHARED UTILITIES (lib/utils.js — always import, never redefine):
initials(name)       "John Smith" → "JS"
fmt(n)               12500 → "12.5k"
fmtCurrency(n, cur)  5000 → "SGD 5,000"
fmtDate(ts)          ISO → "15 Apr 2026"
fmtRelative(ts)      ISO → "2h ago"
stageColor(stage)    'hired' → 'var(--jade2)'

STAGE COLORS:
sourced:   var(--mist4)   screened: var(--amber2)  interview: var(--sea2)
offered:   var(--violet2) hired:    var(--jade2)   rejected:  var(--ruby2)

ROUTE NAMES:
admin.dashboard · admin.mandates.* · admin.claims.approve|reject
admin.submissions.approve|reject · admin.clients.* · admin.recruiters.*
admin.compensation-types.* · admin.exception-rules.* · admin.timer-config.*
admin.report-templates.* · admin.analytics.index
recruiter.dashboard · recruiter.mandates.index|show|pick|workspace
recruiter.candidates.index|show|store|update|upload-cv|save-note
recruiter.submissions.store · recruiter.earnings.index|payout-request
recruiter.kanban.show|move|schedule-interview|save-feedback|submit-to-client|reject|add-candidate
recruiter.ai.brief|outreach|questions|matching
recruiter.notifications.index|read|read-all
feedback.show|feedback.update (public — no auth)
auth.google · login · logout · profile.complete · profile.skip

Now build: [DESCRIBE YOUR TASK HERE]
=== END CONTEXT ===
```

---

## Phase Prompts

### Phase 1 — Migrations + Seed
```
[PASTE CONTEXT ABOVE]

Create all Laravel migrations for MySQL 8.0 in this exact order:
001_create_users_table → 002_create_compensation_types_table → 003_create_clients_table
→ 004_create_recruiters_table → 005_create_mandates_table → 006_create_mandate_claims_table
→ 007_create_candidates_table → 008_create_cdd_submissions_table → 009_create_placements_table
→ 010_create_exception_rules_table → 011_create_exception_rule_audit_table
→ 012_create_notifications_table → 013_create_gsheet_sync_log_table → 014_create_report_templates_table

Use CHAR(36) for all UUID columns with DEFAULT (UUID()).
Use ENUM() for status fields — no CHECK constraints.
Use JSON type for all array/object data (not JSONB).
All tables: InnoDB engine, utf8mb4 charset.

Then create DatabaseSeeder with: 1 super_admin user, 4 compensation types, 1 exception rule (inactive), 2 report templates.

Reference docs/02_DATABASE_SCHEMA.md for exact column specs.
```

### Phase 2 — Auth + Onboarding
```
[PASTE CONTEXT ABOVE]

Build the full auth system following docs/05_AUTH_ONBOARDING.md:

1. GoogleSsoController — redirect() + callback()
   - Creates user + recruiter on first login
   - Assigns recruiter_group from signup form
   - Auto-approved, role-based redirect

2. LoginController — admin email/password only (reject if role=recruiter)

3. ProfileController — skippable profile completion page
   - Group selection: Dwikar / Emma / BTI / Jiebei / custom (dropdown at signup)
   - Industry multi-select, geography multi-select, EA license upload

4. EnsureRole middleware + EnsureProfileComplete middleware

5. All 7 model files with MySQL-compatible relationships and scopes:
   User · Recruiter · Mandate · MandateClaim · CddSubmission · Candidate · Placement

Key MySQL note: use Str::uuid() in model boot() for UUID generation.
```

### Phase 8 — Kanban Pipeline
```
[PASTE CONTEXT ABOVE]

Build the full Kanban pipeline following docs/11_FEATURE_KANBAN.md.

KanbanController with all 7 methods:
show() · move() · scheduleInterview() · saveClientFeedback()
submitToClient() · reject() · addCandidate()

All 7 routes registered in web.php.

React components:
- Pages/Recruiter/Kanban/Show.jsx — main board with DndContext
- Components/kanban/KanbanColumn.jsx — useDroppable column
- Components/kanban/KanbanCard.jsx — useSortable card with 3px accent bar
- Components/kanban/KanbanSidePanel.jsx — 310px panel, all sections
- Components/kanban/RejectionModal.jsx — 4 reasons
- Components/kanban/AddCandidateModal.jsx — fields + CV upload + AI note
- Components/kanban/SubmitToClientModal.jsx — recruiter note + submit

Reference docs/sample-html/05_kanban-pipeline.html for exact UI patterns.
Use stageColor() from @/lib/utils for all stage-based colors.
Optimistic updates on drag — POST to kanban.move after UI update.
Side panel opens on card click — NOT a new page.
```
