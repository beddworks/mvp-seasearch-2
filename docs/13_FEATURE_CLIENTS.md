# 13 — Feature: Client Management
> SeaSearch · Laravel 11 + React 18 + Inertia.js · MySQL 8.0  
> Admin-only feature · April 2026

---

## Overview

Clients are companies that post hiring mandates. Only admins can create or manage client accounts. Clients never self-register — they receive a portal invite after the admin sets them up.

---

## Business Rules

| Rule | Detail |
|------|--------|
| Admin-only creation | No self-signup for clients — admin creates all accounts |
| User account | Each client gets a linked `users` row (role = `client`) |
| Password | Set to a random 24-char string on creation — client logs in via invite/SSO |
| Fee agreement | Each client is linked to one `compensation_types` row (nullable) |
| Inline creation | Admin can create a new compensation type inline from the client form |
| AI parsing | Admin can upload a PDF/DOC/DOCX (fee agreement, LOE) and AI auto-fills the form |
| Portal accent | `accent_color` (hex) is applied to the client portal header and UI |
| GSheet | `gsheet_id` + `gsheet_url` are populated automatically when the first mandate is created |

---

## Database

### `clients` table

| Column | Type | Notes |
|--------|------|-------|
| `id` | `CHAR(36)` PK | UUID auto-generated |
| `user_id` | `CHAR(36)` FK → `users` | nullable — nullOnDelete |
| `company_name` | `VARCHAR(255)` | required |
| `industry` | `VARCHAR(100)` | nullable |
| `contact_name` | `VARCHAR(255)` | nullable |
| `contact_email` | `VARCHAR(255)` | required |
| `contact_title` | `VARCHAR(255)` | nullable |
| `website` | `VARCHAR(255)` | nullable |
| `logo_url` | `VARCHAR(255)` | nullable |
| `accent_color` | `VARCHAR(7)` | hex, default `#0B4F8A` |
| `gsheet_id` | `VARCHAR(255)` | populated by GSheetService |
| `gsheet_url` | `TEXT` | full Google Sheets URL |
| `status` | `ENUM(active,inactive)` | default `active` |
| `compensation_type_id` | `CHAR(36)` FK → `compensation_types` | nullable |
| `notes` | `TEXT` | nullable, internal admin notes |
| `created_at` / `updated_at` | timestamps | |

### `compensation_types` table (relevant columns)

| Column | Type | Notes |
|--------|------|-------|
| `id` | `CHAR(36)` PK | |
| `name` | `VARCHAR(255)` | display name |
| `formula_type` | `ENUM(percentage,hourly,fixed,milestone)` | |
| `platform_fee_pct` | `DECIMAL(5,4)` | e.g. `0.2000` = 20% |
| `formula_fields` | `JSON` | formula-specific fields (see below) |
| `is_active` | `TINYINT(1)` | default `true` |

#### `formula_fields` shapes

```json
// percentage
{ "reward_pct": 0.15, "platform_fee_pct": 0.20 }

// hourly
{ "hourly_rate": 250, "hours_billed": 160, "platform_fee_pct": 0.20 }

// fixed
{ "fixed_amount": 50000, "platform_fee_pct": 0.20 }

// milestone
{ "milestones": [{"name": "Shortlist", "amount": 5000}, {"name": "Hire", "amount": 45000}], "platform_fee_pct": 0.20 }
```

---

## Model

```php
// app/Models/Client.php
class Client extends Model
{
    use HasUuids;  // auto UUID on create

    protected $fillable = [
        'user_id', 'company_name', 'industry',
        'contact_name', 'contact_email', 'contact_title',
        'website', 'logo_url', 'gsheet_id', 'gsheet_url',
        'accent_color', 'status', 'compensation_type_id', 'notes',
    ];

    public function user()              { return $this->belongsTo(User::class); }
    public function mandates()          { return $this->hasMany(Mandate::class); }
    public function compensationType()  { return $this->belongsTo(CompensationType::class); }
}
```

---

## Controller

**File:** `app/Http/Controllers/Admin/ClientController.php`

| Method | Route | Description |
|--------|-------|-------------|
| `index` | `GET /admin/clients` | Paginated list with search |
| `create` | `GET /admin/clients/create` | Show create form |
| `aiPreview` | `POST /admin/clients/ai-preview` | AI extraction from uploaded document |
| `store` | `POST /admin/clients` | Create client (+ optional inline fee) |
| `show` | `GET /admin/clients/{client}` | View client detail |
| `edit` | `GET /admin/clients/{client}/edit` | Edit form |
| `update` | `PUT /admin/clients/{client}` | Update client |
| `destroy` | `DELETE /admin/clients/{client}` | Delete client + user |

> ⚠️ Route `admin.clients.ai-preview` is declared **before** `Route::resource('clients',...)` in `web.php` to prevent the `{client}` parameter from capturing the `/ai-preview` segment.

### `aiPreview` logic

```php
public function aiPreview(Request $request)
{
    // 1. Validate file (pdf/doc/docx, max 10MB)
    // 2. Extract text via CvTextExtractor
    // 3. Load all active compensation_types from DB
    // 4. Call ClaudeService::parseClientFromDocument($text, $existingTypes)
    // 5. Return JSON — client fields + fee_agreement object
}
```

### Inline fee creation (store / update)

When `fee_mode = 'new'`, a new `CompensationType` record is created on the fly and linked to the client:

```php
if ($data['fee_mode'] === 'new' && !empty($data['fee_name'])) {
    $ct = CompensationType::create([
        'name'             => $data['fee_name'],
        'formula_type'     => $data['fee_formula_type'],
        'platform_fee_pct' => $data['fee_pct'] ?? 0.20,
        'formula_fields'   => $data['fee_formula_fields'] ?? [],
        'is_active'        => true,
        'sort_order'       => 99,
    ]);
    $compensationTypeId = $ct->id;
}
```

---

## AI Service — `ClaudeService::parseClientFromDocument()`

**File:** `app/Services/ClaudeService.php`

Takes the extracted document text + array of existing compensation types. Returns:

```json
{
  "company_name":   "Acme Holdings",
  "industry":       "FinTech",
  "contact_name":   "Jane Lim",
  "contact_email":  "jane@acme.com",
  "website":        "https://acme.com",
  "notes":          "Preferred billing in SGD. 30-day guarantee clause.",
  "ai_summary":     "Fee agreement for executive placement at Acme Holdings. Standard 20% contingency on first-year salary with a 30-day guarantee period.",
  "confidence":     "high",
  "fee_agreement": {
    "reasoning":                "Document states '20% of first-year salary' with a standard contingency model.",
    "recommended_formula_type": "percentage",
    "platform_fee_pct":         0.20,
    "formula_fields":           {},
    "suggested_name":           "Standard 20% Contingency",
    "key_terms":                ["20% of first-year salary", "30-day guarantee", "contingency basis"],
    "confidence":               "high",
    "matched_type_id":          "uuid-of-existing-type-if-match",
    "matched_type_name":        "Standard 20% Contingency"
  }
}
```

- `matched_type_id` — non-null if Claude found a close match in the existing `compensation_types`. In this case the form switches to `fee_mode = 'existing'` automatically.
- `confidence` — `high / medium / low` based on how clearly the document states the fee terms.
- `key_terms` — verbatim phrases extracted from the document shown as chips in the summary modal.

---

## Routes

```php
// web.php — inside admin middleware group

// ⚠️ Must be BEFORE the resource route
Route::post('clients/ai-preview', [ClientController::class, 'aiPreview'])
     ->name('admin.clients.ai-preview');

Route::resource('clients', ClientController::class)
     ->names('admin.clients');
```

**Named routes:**

```
admin.clients.index
admin.clients.create
admin.clients.store
admin.clients.show
admin.clients.edit
admin.clients.update
admin.clients.destroy
admin.clients.ai-preview   ← POST only, not part of resource
```

---

## React Pages

### `resources/js/Pages/Admin/Clients/Index.jsx`

- Paginated table: company name, industry, contact, fee type, status badges
- Search bar (GET filter)
- "New client" button → `admin.clients.create`
- Row actions: Edit · Delete (confirm modal)

### `resources/js/Pages/Admin/Clients/Form.jsx`

Two-column layout: main form (left) + live preview panel (right, sticky).

#### Drop zone (top of form)

```
┌─────────────────────────────────────────────────────────┐
│ 📄  Drop a fee agreement, LOE, or company document here  │
│     PDF, DOC, DOCX · AI will auto-fill the form          │
│                                              [Browse file]│
└─────────────────────────────────────────────────────────┘
```

- On file select → `POST /admin/clients/ai-preview`
- Loading state: animated bounce dots
- On success → AI Summary Modal opens automatically

#### AI Summary Modal (right-side slide-in panel)

| Section | Content |
|---------|---------|
| Header | 🤖 icon, title, close button |
| Confidence badge | `high` = jade · `medium` = amber · `low` = ruby |
| Document summary | Plain-text executive summary from Claude |
| Extracted client fields | Company name, industry, contact, email, website, notes — each shows "Not found" if missing |
| Fee agreement | Match banner (jade if existing match, amber if new) + formula type + platform fee % + suggested name |
| Key terms | Verbatim phrases from document as chips |
| AI reasoning | Claude's explanation of fee structure recommendation |
| Footer | "✓ Apply all to form" + "Dismiss" |

#### Left form sections

1. **Company details** — name (full width), industry + website (2-col), notes (textarea), accent_color (color picker)
2. **Contact person** — contact_name + contact_email (2-col). Email is disabled on edit.
3. **Fee agreement** — toggle `Use existing | Define custom`
   - **Use existing** → dropdown of `compensation_types`
   - **Define custom** → inline fields that change by formula type:
     - `percentage` → platform fee % field (shows human % next to input)
     - `hourly` → hourly rate + hours billed
     - `fixed` → fixed amount
     - `milestone` → dynamic add/remove milestone rows (name + amount)

#### Right live preview panel

```
┌──── Preview ──────────────────────────┐
│ [accent bar — client accent_color]    │
│                                       │
│  [AB]  Acme Holdings                  │  ← initials colored with accent
│        FinTech                        │
│                                       │
│  Contact  Jane Lim                    │
│  Email    jane@acme.com               │
│  Website  https://acme.com            │
│  ─────────────────────                │
│  Fee agreement                        │
│  Standard 20% Contingency             │
│  [Percentage] [20%]                   │
│  ─────────────────────                │
│  Notes                                │
│  Preferred billing in SGD…            │
└───────────────────────────────────────┘
```

After AI applied — shows below the preview card:
```
✓ AI data applied
[ai_summary text]
View full AI summary →
```

#### `applyAiResult()` logic

```js
function applyAiResult() {
    // 1. Map text fields: company_name, industry, contact_name, contact_email, website, notes
    // 2. If fee_agreement.matched_type_id:
    //      → fee_mode = 'existing', compensation_type_id = matched_type_id
    // 3. Else:
    //      → fee_mode = 'new'
    //      → fee_formula_type = recommended_formula_type
    //      → fee_pct = platform_fee_pct (as string)
    //      → fee_name = suggested_name
    //      → fee_formula_fields = formula_fields (hourly/fixed/milestone sub-fields)
    // 4. Close modal
}
```

---

## Request Validation (store / update)

```php
'company_name'         => ['required', 'string', 'max:255'],
'contact_name'         => ['required', 'string', 'max:255'],
'contact_email'        => ['required', 'email', 'unique:users,email'],  // unique on store only
'industry'             => ['nullable', 'string', 'max:100'],
'accent_color'         => ['nullable', 'string', 'max:7'],
'website'              => ['nullable', 'url', 'max:255'],
'notes'                => ['nullable', 'string', 'max:1000'],
'compensation_type_id' => ['nullable', 'exists:compensation_types,id'],
'fee_mode'             => ['nullable', 'in:existing,new'],
'fee_name'             => ['nullable', 'required_if:fee_mode,new', 'string', 'max:255'],
'fee_formula_type'     => ['nullable', 'required_if:fee_mode,new', 'in:percentage,hourly,fixed,milestone'],
'fee_pct'              => ['nullable', 'numeric', 'min:0', 'max:1'],
'fee_formula_fields'   => ['nullable', 'array'],
```

---

## Shared Props (passed to Form.jsx)

```js
// create / edit
{
    client: null | { ...client, user: { name, email } },   // null on create
    compensationTypes: [
        { id, name, formula_type, platform_fee_pct, formula_fields }
    ]
}
```

---

## Delete flow

```php
public function destroy(string $id)
{
    $client = Client::findOrFail($id);
    $client->user?->delete();   // cascade deletes the linked user account
    $client->delete();
    return back()->with('success', 'Client deleted.');
}
```

> The `?->delete()` null-safe call handles clients that were created without a user account.

---

## CSS / Design notes

- Use `var(--sea2)` / `var(--jade2)` / `var(--ruby2)` — never hardcode hex
- Card borders: `border: 1px solid var(--wire)` — no `box-shadow`
- Accent color preview: apply inline via `style={{ background: data.accent_color }}`
- Modal slide-in: `position:fixed; right:0; width:520px; height:100vh` — same pattern as Kanban side panel
- Loading dots: CSS `@keyframes bounce` — `scaleY` pulse, staggered 0 / 0.2s / 0.4s delays
