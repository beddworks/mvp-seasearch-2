# SeaSearch — GitHub Copilot Instructions
> File location: `.github/copilot-instructions.md`
> Copilot reads this automatically on every suggestion in this repo.

---

## What This Project Is

SeaSearch is an AI-powered executive recruitment platform for Southeast Asia.
B2B two-sided marketplace: companies post mandates, vetted recruiters pick and submit candidates, Sea Search takes a 20% platform fee on placements.

**Roles:** Admin · Recruiter (max 2 active roles) · Client (admin-created only) · Candidate (passive, no access)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Laravel 11 (PHP 8.2+) |
| Frontend | React 18 + Inertia.js — NOT a separate SPA |
| Database | **MySQL 8.0** — UUID as `CHAR(36)`, `ENUM()` columns, `JSON` type |
| Styling | Custom CSS variables in `app.css` — **never Tailwind classes** |
| Auth | Google SSO via Socialite (recruiters) · Email/password (admin only) |
| AI | Claude API `claude-sonnet-4-6` — server-side only, never in React |
| Kanban | `@dnd-kit/core` + `@dnd-kit/sortable` |
| Storage | S3-compatible (Supabase/AWS) |
| Queue | Laravel Queues — `ParseCvJob` · `SyncGSheetJob` · `SendClientEmailJob` |

---

## HTML Prototypes — Visual Source of Truth

**Always open the matching file in `docs/sample-html/` before writing any UI code.**
These are fully working HTML prototypes. Copy CSS classes and layout patterns exactly.

| File | Screen — open before writing |
|------|------------------------------|
| `docs/sample-html/design-system-sample.html` | **Read first for any UI work** — all CSS tokens + components |
| `docs/sample-html/00_platform-shell.html` | Master nav shell — dark sidebar + topbar layout |
| `docs/sample-html/01_recruiter-dashboard.html` | Recruiter dashboard — hero band, stat cards, active roles |
| `docs/sample-html/02_job-listings.html` | Job board — 8 filter tabs, role cards, pick flow |
| `docs/sample-html/03_role-workspace.html` | Role workspace — JD tabs, flags, AI matching panel |
| `docs/sample-html/04_candidate-profiles.html` | Candidate profiles — CV upload, AI overlay, 4 tabs, score ring |
| `docs/sample-html/05_kanban-pipeline.html` | **Kanban** — drag-drop, side panel, all modals |
| `docs/sample-html/06_client-portal.html` | Client portal — 6 screens, 3 response modals |
| `docs/sample-html/07_gap-fills-pick-submit-placement.html` | Pick/submit/placement screens |
| `docs/sample-html/08_pick-confirmation.html` | Pick confirmation modal |

---

## Documentation Files — Read Before Coding

| File | Read when |
|------|-----------|
| `docs/00_INDEX.md` | Start here — build order, 10 golden rules |
| `docs/01_TECH_STACK.md` | Folder structure, MySQL config, dependencies |
| `docs/02_DATABASE_SCHEMA.md` | **All 14 MySQL migrations** — exact column specs |
| `docs/03_DESIGN_SYSTEM.md` | CSS tokens, every component class, layout rules |
| `docs/11_FEATURE_KANBAN.md` | **Full kanban** — 7 controller methods, all React components |
| `docs/17_COPILOT_CONTEXT.md` | Master AI context — prepend to every prompt |

---

## MySQL — Non-Negotiable Rules

```php
// ✅ UUID — always CHAR(36) + UUID() in MySQL
$table->char('id', 36)->primary()->default(DB::raw('(UUID())'));

// ✅ Enum — use ENUM(), not CHECK constraints
$table->enum('status', ['active','pending','suspended'])->default('active');

// ✅ Arrays — use JSON column, not TEXT[]
$table->json('skills')->nullable();
$table->json('formula_fields');

// ✅ Boolean — TINYINT(1), Laravel handles automatically
$table->boolean('timer_b_active')->default(false);

// ✅ All tables
$table->engine = 'InnoDB';
$table->charset = 'utf8mb4';
$table->collation = 'utf8mb4_unicode_ci';

// ❌ Never PostgreSQL syntax
$table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()')); // WRONG
$table->jsonb('data');  // WRONG — MySQL has no JSONB
```

Model UUID boot pattern for MySQL:
```php
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class Mandate extends Model
{
    use HasUuids;

    protected static function boot()
    {
        parent::boot();
        static::creating(fn($m) => $m->id ??= (string) Str::uuid());
    }
}
```

---

## Design System — Non-Negotiable Rules

### Never hardcode hex colors
```css
/* ✅ correct */          /* ❌ wrong */
var(--sea2)               #1A6DB5
var(--jade2)              #2E7D33
var(--ruby2)              #B52525
var(--mist2)              #F2F0EC
var(--wire)               #E0DDD6
```

### Key tokens
```
--ink: #0D0C0A    --ink2: #2A2926   --ink4: #6B6860
--mist: #F9F8F5   --mist2: #F2F0EC  --wire: #E0DDD6
--sea: #0B4F8A    --sea2: #1A6DB5   --sea3: #3589D4   --sea-pale: #E8F2FB
--jade2: #2E7D33  --jade3: #4CAF52  --jade-pale: #EAF4EB
--amber2: #B85C1A --ruby2: #B52525  --violet2: #4B3AA8 --gold2: #C49A00
--font-head: 'Syne',sans-serif   --font: 'DM Sans',sans-serif   --mono: 'DM Mono',monospace
--sidebar: 230px  --topbar: 56px   --r: 12px   --rsm: 7px   --rxs: 4px
```

### Layout rules
- Dark ink sidebar (230px) + dark topbar (56px) + light mist content area — fixed, no toggle
- Desktop only — no mobile breakpoints (~1200px min)
- **No `box-shadow` on cards** — use `border: 1px solid var(--wire)` instead
- Every stat card has: `position:absolute; top:0; left:0; right:0; height:3px` color accent bar
- Client portal uses separate tokens: `--paper:#FAFAF8`, `Instrument Serif` font, configurable accent

### CSS classes (defined in `app.css` — never recreate)
```
.btn .btn-primary .btn-secondary .btn-ghost .btn-sm .btn-danger .btn-success
.badge .badge-sea .badge-jade .badge-amber .badge-ruby .badge-violet .badge-gold
.cbadge .cb-sea .cb-jade .cb-amb .cb-vio .cb-rub .cb-gld
.dcard .dcard-head .dcard-title .dcard-ghost-btn
.sblock .sblock-head .sblock-body
.sbi .sbi.on .sbi-ico .sbi-lbl .sbadge .sbadge-a .sbadge-r
.sm .sm-bar .sm-num .sm-lbl
.form-input .form-label .form-error .form-group
.stat-row   → grid repeat(4,1fr) gap:10px
.g21        → grid 1fr 340px gap:14px
.g3         → grid 1fr 1fr 1fr gap:14px
.table-wrap → white card with wire border, rounded
```

### Stage colors
```js
sourced:'var(--mist4)'  screened:'var(--amber2)'  interview:'var(--sea2)'
offered:'var(--violet2)' hired:'var(--jade2)'     rejected:'var(--ruby2)'
```

---

## Inertia + Laravel Patterns

### Forms — always useForm, never raw fetch for mutations
```jsx
// ✅ correct
import { useForm } from '@inertiajs/react'
const { data, setData, post, processing, errors } = useForm({ name: '' })
<form onSubmit={e => { e.preventDefault(); post(route('recruiter.candidates.store')) }}>

// ❌ wrong
fetch('/recruiter/candidates', { method: 'POST', body: formData })
```

### Controllers are thin
```php
// ✅ controller delegates to service
public function approve(MandateClaim $claim) {
    $this->claimService->approve($claim, auth()->user());
    return redirect()->back()->with('success', 'Approved.');
}
```

### Queue heavy operations
```php
ParseCvJob::dispatch($candidate, $mandateId)->onQueue('ai');
SyncGSheetJob::dispatch($submission, 'add_row')->onQueue('sheets');
SendClientEmailJob::dispatch($submission)->onQueue('email');
```

### CSRF for fetch (AI + kanban endpoints only)
```js
headers: {
    'X-CSRF-TOKEN': document.querySelector('meta[name=csrf-token]').content,
    'Content-Type': 'application/json',
}
```

### Shared props (always available)
```js
usePage().props.auth.user          // {id, name, email, role}
usePage().props.auth.recruiter     // {id, tier, trust_level, recruiter_group, active_mandates_count}
usePage().props.flash              // {success, error}
usePage().props.unread_notifications
```

---

## Kanban — Key Knowledge

Built with `@dnd-kit/core` + `@dnd-kit/sortable`. Reference `docs/sample-html/05_kanban-pipeline.html`.

```
6 columns:   sourced → screened → interview → offered → hired → rejected
DndContext:  wraps the whole board
Columns:     useDroppable({ id: stage })  ← droppable target
Cards:       useSortable({ id: submission.id })  ← draggable item
DragOverlay: ghost card shown while dragging
dragEnd:     1) optimistic state update  2) POST recruiter.kanban.move
Side panel:  310px fixed right, opens on card click (NOT a new page)
```

7 controller methods → 7 routes:
```
recruiter.kanban.show               GET  /recruiter/kanban/{mandate}
recruiter.kanban.move               POST /recruiter/kanban/move
recruiter.kanban.schedule-interview POST /recruiter/kanban/schedule-interview
recruiter.kanban.save-feedback      POST /recruiter/kanban/save-feedback
recruiter.kanban.submit-to-client   POST /recruiter/kanban/submit-to-client
recruiter.kanban.reject             POST /recruiter/kanban/reject
recruiter.kanban.add-candidate      POST /recruiter/kanban/add-candidate
```

Component file locations:
```
Pages/Recruiter/Kanban/Show.jsx              ← main board
Components/kanban/KanbanColumn.jsx           ← useDroppable column
Components/kanban/KanbanCard.jsx             ← useSortable card
Components/kanban/KanbanSidePanel.jsx        ← 310px side panel
Components/kanban/RejectionModal.jsx         ← 4 rejection reasons
Components/kanban/AddCandidateModal.jsx      ← add + CV upload
Components/kanban/SubmitToClientModal.jsx    ← recruiter note + submit
```

---

## Business Rules — Never Violate

1. **Max 2 active mandates per recruiter** — check `active_mandates_count < 2` before pick
2. **Admin approves claim** → sets `assigned_at` = Day 0, Timer A starts
3. **Admin approves CDD** before client sees it — UNLESS exception rule:
   - `recruiter.trust_level = 'trusted'` OR `mandate.is_fast_track = true`
4. **Max 2 CDD rejections** — 2nd = slot burned, recruiter must find new candidate
5. **Day 0 = `claim.assigned_at`** — never Day 1, never changeable after set
6. **Timer A fail** → reassign to new recruiter (fresh Day 0). After 3 fails → **role DROPPED**
7. **Timer B** (default OFF) — 3 profiles in 5 days. Late: Day 6 = −10%, Day 7 = −20%, Day 8+ = −30%
8. **Timer C** (default OFF) — client SLA 5 days. Breach = admin alerted, manual slot free
9. **Slot cycle ends** when 3rd CDD submitted OR client gives final feedback (whichever first)
10. **Client feedback** = tokenized one-time email link — never email reply parsing
11. **GSheet auto-updates** on every CDD approval and every status change
12. **Client NOT auto-notified** on unclaimed roles — admin sends report manually via template
13. **No auto-assign** when all at capacity — admin manually assigns only
14. **Timer state is computed** from timestamps — never store `is_overdue` as boolean
15. **Recruiter group** (Dwikar/Emma/BTI/Jiebei) = reporting only — **zero workflow impact**

---

## Shared Utilities — Always Import, Never Redefine

```js
import { initials, fmt, fmtCurrency, fmtDate, fmtRelative, stageColor } from '@/lib/utils'

initials('John Smith')      // → 'JS'
fmt(12500)                  // → '12.5k'
fmtCurrency(5000, 'SGD')   // → 'SGD 5,000'
fmtDate('2026-04-20')      // → '20 Apr 2026'
fmtRelative('2026-04-20')  // → '2h ago'
stageColor('hired')         // → 'var(--jade2)'
```

---

## Services — All Business Logic Lives Here

```
ClaudeService        parseCV() · scoreCandidate() · generateBrief() · draftOutreach() · generateInterviewQuestions()
GoogleSheetsService  createClientSheet() · createMandateTab() · addCddRow() · updateStatusCell()
TimerService         checkTimerA/B/C() · calculatePenalty() · checkAndFreeSlot()
CommissionService    calculate() · settle()
NotificationService  all event types
TokenService         generate() · validate() · markUsed()
ExceptionService     shouldBypass(recruiter, mandate) → bool
SlotService          checkAndFreeSlot() · adminFreeSlot()
```

---

## Platform Fee Types (CRUD — 4 types)

| Type | Formula |
|------|---------|
| Percentage | `reward_pct × salary_max` |
| Hourly | `hourly_rate × hours_billed` |
| Fixed Rate | `fixed_amount` |
| Per Project | `sum(milestones[].amount)` |

All stored in `compensation_types` table with `formula_fields` JSON column.
Platform fee default 20%. Tier modifier: Senior +5%, Elite +10%.

---

## Route Names

```
admin.dashboard · admin.mandates.* · admin.claims.approve|reject
admin.submissions.approve|reject · admin.clients.* · admin.recruiters.*
admin.compensation-types.* · admin.exception-rules.* · admin.timer-config.*
admin.report-templates.* · admin.analytics.index

recruiter.dashboard
recruiter.mandates.index|show|pick|workspace
recruiter.candidates.index|show|store|update|upload-cv|save-note
recruiter.submissions.store
recruiter.kanban.show|move|schedule-interview|save-feedback|submit-to-client|reject|add-candidate
recruiter.earnings.index|payout-request
recruiter.ai.brief|outreach|questions|matching
recruiter.notifications.index|read|read-all

feedback.show|feedback.update   ← public, no auth required
auth.google · login · logout · profile.complete · profile.skip
```

---

## Key Database Tables (Quick Reference)

```
users            role:super_admin|admin|recruiter|client · status:active|pending|suspended
recruiters       tier:junior|senior|elite · trust_level:standard|trusted
                 recruiter_group:Dwikar|Emma|BTI|Jiebei (reporting only, zero workflow impact)
                 active_mandates_count ≤ 2
clients          admin-created only · gsheet_id · gsheet_url · accent_color
mandates         status:draft|active|paused|closed|filled|dropped · assignment_count ≤ 3
mandate_claims   status:pending|approved|rejected · assigned_at = Day 0
cdd_submissions  admin_review_status:pending|approved|rejected|bypassed
                 client_status:pending|shortlisted|interview|offer_made|hired|rejected|on_hold
                 token(one-time) · exception_bypass · submission_number:1-3
placements       gross_reward · platform_fee · net_payout · penalty_amount · final_payout
compensation_types formula_type:percentage|hourly|fixed|milestone · formula_fields:JSON
exception_rules  rule_type:recruiter_trust|role_type|both · is_active:false(default)
```

---

## Migration Order (FK-safe — run in this exact order)

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

## Build Order

| Phase | What | Key doc |
|-------|------|---------|
| 1 | Migrations + seed | `docs/02_DATABASE_SCHEMA.md` |
| 2 | Auth — SSO + login + profile + groups | `docs/05_AUTH_ONBOARDING.md` |
| 3 | Admin panel | `docs/13_FEATURE_ADMIN.md` |
| 4 | Job board + pick + claim queue | `docs/06_FEATURE_MANDATES.md` |
| 5 | Candidate profiles + CV + AI | `docs/07_FEATURE_CANDIDATES.md` |
| 6 | CDD submission + admin review | `docs/08_FEATURE_CDD_SUBMISSION.md` |
| 7 | GSheet + tokenized client feedback | `docs/10_FEATURE_GSHEET.md` |
| 8 | **Kanban pipeline** | `docs/11_FEATURE_KANBAN.md` |
| 9 | Timer engine + cron | `docs/09_FEATURE_TIMERS.md` |
| 10 | Earnings + payout | `docs/12_FEATURE_COMMISSION.md` |
| 11 | Notifications + digest | `docs/14_FEATURE_NOTIFICATIONS.md` |
| 12 | Client portal (deferred) | — |
