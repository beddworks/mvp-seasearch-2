# SeaSearch — Production Documentation Suite
> **Version:** 3.0 · **Stack:** Laravel 11 + React 18 + Inertia.js + MySQL 8.0  
> **Based on:** SeaSearch Enhanced Flowchart v3.0  
> **April 2026**

---

## What Changed from v2.0

| # | Change | Detail |
|---|--------|--------|
| 1 | Database | PostgreSQL → **MySQL 8.0** (UUID via `CHAR(36)`, ENUM columns, JSON type) |
| 2 | Kanban | Fully documented with `@dnd-kit` drag-drop, side panel, all 7 controller methods |
| 3 | Recruiter groups | Dwikar / Emma / BTI / Jiebei selected at signup — zero workflow impact |
| 4 | Platform fee types | 4 CRUD types: Percentage / Hourly / Fixed Rate / Per Project |
| 5 | Client model | Admin-only creation confirmed · GSheet-only pipeline view |
| 6 | Timer A | 3-attempt reassignment loop + role DROPPED on 3rd failure fully documented |
| 7 | Timer B | 3 profiles in 5 days · Day 6/7/8+ penalty scale |
| 8 | Slot cycle | Ends on 3rd CDD submitted OR client final feedback |
| 9 | Exception rules | 3 rule types (A/B/C) with full audit log |
| 10 | Edge cases | Unclaimed role 24/48/72h escalation · all-at-capacity handling |

---

## Document Index

| # | File | Purpose |
|---|------|---------|
| 00 | `00_INDEX.md` | This file |
| 01 | `01_TECH_STACK.md` | Stack, folder structure, MySQL conventions, all dependencies |
| 02 | `02_DATABASE_SCHEMA.md` | Full MySQL 8.0 schema — all 14 tables, migrations, indexes |
| 03 | `03_DESIGN_SYSTEM.md` | CSS tokens, components, kanban styles, layout rules |
| 04 | `04_ARCHITECTURE.md` | All routes, middleware, Inertia patterns, shared props |
| 05 | `05_AUTH_ONBOARDING.md` | SSO, profile, group selection, all model definitions |
| 06 | `06_FEATURE_MANDATES.md` | Mandate lifecycle — post, pick, claim, reassign, drop |
| 07 | `07_FEATURE_CANDIDATES.md` | Candidate model, CV upload, AI parsing, 4-tab page |
| 08 | `08_FEATURE_CDD_SUBMISSION.md` | CDD flow, exception rules, admin gate, slot cycle |
| 09 | `09_FEATURE_TIMERS.md` | Timer A/B/C engine — full implementation |
| 10 | `10_FEATURE_GSHEET.md` | GSheet auto-sync, client email, tokenized links |
| 11 | `11_FEATURE_KANBAN.md` | **Full kanban** — 6 columns, side panel, all modals, dnd-kit |
| 12 | `12_FEATURE_COMMISSION.md` | 4 formula types, earnings, payout, Stripe |
| 13 | `13_FEATURE_ADMIN.md` | Admin panel, report templates, analytics |
| 14 | `14_FEATURE_NOTIFICATIONS.md` | All notification types, daily digest |
| 15 | `15_AI_CLAUDE.md` | All 5 Claude prompts |
| 16 | `16_API_REFERENCE.md` | All routes, request shapes, validation |
| 17 | `17_COPILOT_CONTEXT.md` | Master AI coding context (prepend to every prompt) |

---

## Golden Rules

1. **Never hardcode hex colors** — always `var(--sea2)` not `#1A6DB5`
2. **All forms use `useForm`** from `@inertiajs/react` — never raw fetch for mutations
3. **Controllers are thin** — all business logic in Services
4. **Timer state is computed** — never store `is_overdue` as boolean
5. **Admin approval gates always run** — claim + CDD are non-negotiable
6. **Claude API calls server-side only** — never in React
7. **MySQL UUIDs** — use `CHAR(36)` + `DEFAULT (UUID())` — no `gen_random_uuid()`
8. **Recruiter group = reporting only** — zero workflow impact on claims/CDD/commission
9. **Day 0 = `assigned_at`** — set exactly when admin approves claim
10. **Slot freed** when 3rd CDD submitted OR client gives final feedback (whichever first)

---

## Build Priority

| # | Build | Doc |
|---|-------|-----|
| 1 | Migrations + seed | `02_DATABASE_SCHEMA.md` |
| 2 | Auth — SSO + login + profile | `05_AUTH_ONBOARDING.md` |
| 3 | Admin panel — CRUD for all config | `13_FEATURE_ADMIN.md` |
| 4 | Job board + pick flow + claim queue | `06_FEATURE_MANDATES.md` |
| 5 | Candidate profiles + CV + AI | `07_FEATURE_CANDIDATES.md` |
| 6 | CDD submission + admin review | `08_FEATURE_CDD_SUBMISSION.md` |
| 7 | GSheet + tokenized client feedback | `10_FEATURE_GSHEET.md` |
| 8 | **Kanban pipeline** | `11_FEATURE_KANBAN.md` |
| 9 | Timer engine + cron | `09_FEATURE_TIMERS.md` |
| 10 | Earnings + payout | `12_FEATURE_COMMISSION.md` |
| 11 | Notifications + digest | `14_FEATURE_NOTIFICATIONS.md` |
| 12 | Client portal (deferred) | — |
