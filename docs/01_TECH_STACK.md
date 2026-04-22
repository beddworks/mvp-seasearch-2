# 01 — Tech Stack & Environment
> SeaSearch PRD v3.0 · MySQL 8.0 Edition

---

## Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Backend | Laravel 11 | PHP 8.2+ |
| Frontend bridge | Inertia.js 1.x | SSR optional |
| Frontend | React 18 + JSX | No TypeScript |
| Styling | Custom CSS (`app.css`) | No Tailwind classes |
| Database | **MySQL 8.0** | UUIDs via `CHAR(36)` + `UUID()` |
| Auth | Laravel Breeze + Google Socialite | SSO for recruiters, email for admin |
| AI | Claude API `claude-sonnet-4-6` | Server-side only |
| File storage | S3-compatible (Supabase/AWS) | CVs, EA certs |
| Email | Resend via Laravel Mail | |
| Payments | Stripe Connect | Recruiter payouts |
| Queue | Laravel Queues — database driver | or Redis |
| Scheduler | Laravel Scheduler | cron every minute |
| Kanban drag-drop | `@dnd-kit/core` + `@dnd-kit/sortable` | |

---

## MySQL vs PostgreSQL — Key Differences

| Feature | PostgreSQL (old) | MySQL 8.0 (new) |
|---------|-----------------|-----------------|
| UUID default | `gen_random_uuid()` | `UUID()` |
| UUID storage | `UUID` type | `CHAR(36)` |
| JSON | `JSONB` | `JSON` |
| String default | `TEXT` | `VARCHAR(n)` or `TEXT` |
| Array columns | `TEXT[]` | JSON array column |
| Enum | `CHECK` constraint | `ENUM('a','b')` |
| Boolean | `BOOLEAN` | `TINYINT(1)` |
| Auto-timestamp | `DEFAULT now()` | `DEFAULT CURRENT_TIMESTAMP` |
| Full-text search | `tsvector` | `FULLTEXT INDEX` |

---

## Folder Structure

```
app/
├── Http/
│   ├── Controllers/
│   │   ├── Auth/
│   │   │   ├── GoogleSsoController.php
│   │   │   ├── LoginController.php
│   │   │   └── ProfileController.php
│   │   ├── Admin/
│   │   │   ├── DashboardController.php
│   │   │   ├── MandateManagementController.php
│   │   │   ├── ClaimApprovalController.php
│   │   │   ├── CddApprovalController.php
│   │   │   ├── RecruiterManagementController.php
│   │   │   ├── ClientManagementController.php
│   │   │   ├── CompensationTypeController.php
│   │   │   ├── ExceptionRuleController.php
│   │   │   ├── TimerConfigController.php
│   │   │   ├── ReportTemplateController.php
│   │   │   └── AnalyticsController.php
│   │   ├── Recruiter/
│   │   │   ├── DashboardController.php
│   │   │   ├── MandateController.php
│   │   │   ├── CandidateController.php
│   │   │   ├── CddSubmissionController.php
│   │   │   ├── KanbanController.php        ← 7 methods
│   │   │   ├── EarningsController.php
│   │   │   └── AiController.php
│   │   ├── Client/
│   │   │   ├── PortalController.php
│   │   │   └── SubmissionFeedbackController.php
│   │   └── NotificationController.php
│   ├── Middleware/
│   │   ├── EnsureRole.php
│   │   └── EnsureProfileComplete.php
│   └── Requests/
│       ├── StoreMandateRequest.php
│       ├── StoreCandidateRequest.php
│       └── StoreCddSubmissionRequest.php
├── Models/
│   ├── User.php
│   ├── Recruiter.php
│   ├── Client.php
│   ├── Mandate.php
│   ├── MandateClaim.php
│   ├── Candidate.php
│   ├── CddSubmission.php
│   ├── Placement.php
│   ├── CompensationType.php
│   ├── ExceptionRule.php
│   ├── ExceptionRuleAudit.php
│   ├── Notification.php
│   ├── GsheetSyncLog.php
│   └── ReportTemplate.php
├── Services/
│   ├── ClaudeService.php
│   ├── GoogleSheetsService.php
│   ├── TimerService.php
│   ├── CommissionService.php
│   ├── NotificationService.php
│   ├── TokenService.php
│   ├── ExceptionService.php
│   └── SlotService.php
├── Jobs/
│   ├── ParseCvJob.php
│   ├── SyncGSheetJob.php
│   ├── SendClientEmailJob.php
│   └── TimerCheckJob.php
└── Console/Commands/
    └── DailyDigestCommand.php

resources/js/
├── app.jsx
├── Pages/
│   ├── Auth/
│   │   ├── Login.jsx
│   │   ├── ProfileComplete.jsx
│   │   └── Feedback/
│   │       ├── Show.jsx
│   │       └── Confirmed.jsx
│   ├── Admin/
│   │   ├── Dashboard.jsx
│   │   ├── Claims/Index.jsx
│   │   ├── Submissions/Index.jsx
│   │   ├── Mandates/{Index,Show,Form}.jsx
│   │   ├── Recruiters/{Index,Show}.jsx
│   │   ├── Clients/{Index,Form}.jsx
│   │   └── Settings/{CompensationTypes,ExceptionRules,TimerConfig,ReportTemplates}.jsx
│   └── Recruiter/
│       ├── Dashboard.jsx
│       ├── Mandates/{Index,Show,Workspace}.jsx
│       ├── Candidates/{Index,Show}.jsx
│       ├── Kanban/Show.jsx              ← full kanban board
│       ├── Earnings/Index.jsx
│       └── Notifications/Index.jsx
├── Components/
│   ├── layout/
│   │   ├── RecruiterLayout.jsx
│   │   ├── AdminLayout.jsx
│   │   └── ClientLayout.jsx
│   ├── kanban/                          ← kanban sub-components
│   │   ├── KanbanBoard.jsx
│   │   ├── KanbanColumn.jsx
│   │   ├── KanbanCard.jsx
│   │   ├── KanbanSidePanel.jsx
│   │   ├── RejectionModal.jsx
│   │   ├── AddCandidateModal.jsx
│   │   └── SubmitToClientModal.jsx
│   └── ui/
│       ├── Badge.jsx
│       ├── Button.jsx
│       ├── Card.jsx
│       ├── CollapseBlock.jsx
│       └── FlashMessages.jsx
└── lib/
    └── utils.js      ← initials, fmt, fmtCurrency, fmtDate, fmtRelative, stageColor

resources/css/
└── app.css           ← ALL styles — never Tailwind classes
```

---

## composer.json (key packages)

```json
{
  "require": {
    "laravel/framework": "^11.0",
    "inertiajs/inertia-laravel": "^1.0",
    "laravel/socialite": "^5.0",
    "google/apiclient": "^2.0",
    "stripe/stripe-php": "^13.0",
    "league/flysystem-aws-s3-v3": "^3.0"
  }
}
```

## package.json (key packages)

```json
{
  "dependencies": {
    "react": "^18.0",
    "@inertiajs/react": "^1.0",
    "@dnd-kit/core": "^6.0",
    "@dnd-kit/sortable": "^7.0",
    "@dnd-kit/utilities": "^3.0",
    "@tiptap/react": "^2.0",
    "@tiptap/starter-kit": "^2.0"
  }
}
```

---

## MySQL .env

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=seasearch
DB_USERNAME=root
DB_PASSWORD=

# MySQL-specific: strict mode, timezone
DB_OPTIONS='{"PDO::MYSQL_ATTR_INIT_COMMAND":"SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"}'
```

## config/database.php MySQL options

```php
'mysql' => [
    'driver'    => 'mysql',
    'host'      => env('DB_HOST', '127.0.0.1'),
    'port'      => env('DB_PORT', '3306'),
    'database'  => env('DB_DATABASE', 'seasearch'),
    'username'  => env('DB_USERNAME', 'root'),
    'password'  => env('DB_PASSWORD', ''),
    'charset'   => 'utf8mb4',
    'collation' => 'utf8mb4_unicode_ci',
    'prefix'    => '',
    'strict'    => true,
    'engine'    => 'InnoDB',
    'options'   => [
        PDO::ATTR_EMULATE_PREPARES => true,   // required for UUID() in defaults
    ],
],
```

---

## Inertia Conventions

### Always useForm for mutations
```jsx
import { useForm } from '@inertiajs/react'
const { data, setData, post, processing, errors } = useForm({ field: '' })
```

### Data from controller only
```php
return Inertia::render('Recruiter/Kanban/Show', [
    'mandate'     => MandateResource::make($mandate),
    'submissions' => CddSubmissionResource::collection($subs),
    'stages'      => ['sourced','screened','interview','offered','hired','rejected'],
]);
```

### Flash messages
```php
return redirect()->back()->with('success', 'Done.');
```
```jsx
// FlashMessages.jsx reads usePage().props.flash automatically
```

### Shared props (always available)
```js
usePage().props.auth.user       // {id, name, email, role}
usePage().props.auth.recruiter  // {id, tier, trust_level, active_mandates_count, recruiter_group}
usePage().props.flash           // {success, error}
usePage().props.unread_notifications // int
```
