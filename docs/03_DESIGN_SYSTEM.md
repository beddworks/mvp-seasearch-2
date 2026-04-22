# 03 — Design System
> SeaSearch Production Documentation · v1.0  
> Source of truth for all UI. Never deviate from these tokens.

---

## Dual-Zone Design

SeaSearch uses a **fixed dual-zone layout** — not a switchable dark mode:

| Zone | Background | Usage |
|------|-----------|-------|
| **Shell zone** | `--ink` (`#0D0C0A`) | Topbar, sidebar, hero band |
| **Content zone** | `--mist2` (`#F2F0EC`) | Page body, cards, forms |
| **Client portal** | `--paper` (`#FAFAF8`) | Separate design system entirely |

---

## Color Tokens

### app.css :root — Recruiter/Admin Portal
```css
:root {
  /* Ink — Dark neutrals */
  --ink:         #0D0C0A;   /* body text, dark sidebar bg */
  --ink2:        #2A2926;   /* sidebar dividers, secondary borders */
  --ink3:        #454340;   /* muted labels (in dark zones) */
  --ink4:        #6B6860;   /* secondary text (in light zones) */

  /* Mist — Light neutrals */
  --mist:        #F9F8F5;   /* card backgrounds */
  --mist2:       #F2F0EC;   /* page background, hover states */
  --mist3:       #E8E5DF;   /* hover bg for ghost buttons */
  --mist4:       #D4D0C8;   /* sidebar text, disabled states */

  /* Wire — Borders */
  --wire:        #E0DDD6;   /* default borders */
  --wire2:       #C8C4BC;   /* stronger borders */

  /* Sea — Primary Blue */
  --sea:         #0B4F8A;   /* active nav, brand */
  --sea2:        #1A6DB5;   /* primary buttons, links */
  --sea3:        #3589D4;   /* accent, chart color */
  --sea-pale:    #E8F2FB;   /* badge/chip backgrounds */
  --sea-soft:    #C5DFF5;   /* badge borders */

  /* Jade — Success/Green */
  --jade:        #1A4D1E;   /* strong success text */
  --jade2:       #2E7D33;   /* success badges, positive trends */
  --jade3:       #4CAF52;   /* sidebar earnings number */
  --jade-pale:   #EAF4EB;   /* success chip backgrounds */
  --jade-soft:   #B8DFB9;   /* success badge borders */

  /* Amber — Warning/Orange */
  --amber:       #7A3B0A;   /* strong warning text */
  --amber2:      #B85C1A;   /* warning badges */
  --amber3:      #E07C3A;   /* pending/in-progress tags */
  --amber-pale:  #FDF0E8;   /* warning chip backgrounds */

  /* Ruby — Error/Red */
  --ruby:        #7A1A1A;   /* error text */
  --ruby2:       #B52525;   /* danger badges, rejected stage */
  --ruby-pale:   #FBE8E8;   /* error chip backgrounds */

  /* Violet — Purple */
  --violet:      #2D1F6E;   /* VP/Director seniority, Consulting */
  --violet2:     #4B3AA8;   /* AI/Claude accent */
  --violet-pale: #EEE9FB;   /* violet chip backgrounds */

  /* Gold — Exclusive/Premium */
  --gold:        #6B4F00;   /* strong gold text */
  --gold2:       #C49A00;   /* exclusive badges, gold rank */
  --gold-pale:   #FDF8E1;   /* gold chip backgrounds */

  /* Typography */
  --font-head:   'Syne', sans-serif;
  --font:        'DM Sans', sans-serif;
  --mono:        'DM Mono', monospace;

  /* Layout */
  --sidebar:     230px;
  --topbar:      56px;

  /* Border radius */
  --r:           12px;      /* default cards */
  --rsm:         7px;       /* inputs, small elements */
  --rxs:         4px;       /* chips, micro elements */
}
```

### Client Portal :root (separate CSS block)
```css
/* Client portal uses paper tones + Instrument Serif */
.client-portal-root {
  --paper:       #FAFAF8;   /* page background */
  --paper2:      #F4F3F0;   /* secondary bg */
  --paper3:      #ECEAE6;   /* hover states */
  --line:        #D8D5CF;   /* borders */
  --line2:       #C8C5BE;   /* stronger borders */
  --ink4:        #6A6760;   /* secondary text */
  --ink5:        #9A9895;   /* muted text */
  --serif:       'Instrument Serif', serif;
  --font:        'DM Sans', sans-serif;
  --mono:        'DM Mono', monospace;
  /* Sea, Jade, Amber, Ruby, Violet tokens same as recruiter portal */
  /* Accent color configurable per client: --client-accent: #CC0000 (DBS example) */
}
```

---

## Typography

### Font loading (Google Fonts — in `<head>`)
```html
<!-- Recruiter/Admin portal -->
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,400&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">

<!-- Client portal (add Instrument Serif) -->
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@300;400;500&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
```

### Type scale
| Usage | Size | Weight | Family | Color |
|-------|------|--------|--------|-------|
| Hero earnings number | 36px | 700 | Syne | #fff |
| Stat number large | 28px | 700 | Syne | --ink |
| Profile score ring | 32px | 700 | Syne | dynamic |
| Section heading | 24px | 700 | Syne | --ink |
| Hero metric | 22px | 600 | Syne | #fff |
| Sidebar earnings | 20px | 600 | Syne | --jade3 |
| Card number | 22–24px | 600–700 | Syne | dynamic |
| Card title | 15px | 500 | DM Sans | --ink |
| Body default | 13px | 400 | DM Sans | --ink |
| Label | 12px | 400–500 | DM Sans | --ink |
| Secondary | 11px | 400–500 | DM Sans | --ink4 |
| Meta/caption | 10px | 400–500 | DM Sans | --ink4 |
| Badge | 9–11px | 500–600 | DM Mono | various |
| Micro label | 9px | 500 | DM Mono | --ink3 |

### Letter spacing
- Section labels: `0.05–0.1em`
- Badge/mono: `0.05em`
- Stat labels: `0.4px`
- Uppercase labels: `0.08–0.1em`

---

## Component Library

### Button
```css
.btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 14px; border-radius: var(--rsm);
  font-family: var(--font); font-size: 12px; font-weight: 500;
  cursor: pointer; border: none; transition: all .15s;
}
.btn-primary { background: var(--sea2); color: #fff; }
.btn-primary:hover { background: var(--sea); }
.btn-secondary { background: var(--mist2); color: var(--ink); border: 1px solid var(--wire); }
.btn-secondary:hover { background: var(--mist3); border-color: var(--wire2); }
.btn-ghost { background: transparent; color: var(--ink3); border: 1px solid var(--wire2); }
.btn-ghost:hover { background: var(--mist3); }
.btn-sm { padding: 4px 10px; font-size: 11px; }
.btn-danger { background: var(--ruby2); color: #fff; }
.btn-success { background: var(--jade2); color: #fff; }
```

React component:
```jsx
// components/ui/Button.jsx
export function Button({ variant = 'primary', size, className, children, ...props }) {
  return (
    <button
      className={`btn btn-${variant}${size ? ` btn-${size}` : ''} ${className || ''}`}
      {...props}
    >
      {children}
    </button>
  )
}
```

---

### Badge / Chip
```css
.badge {
  display: inline-flex; align-items: center;
  padding: 2px 8px; border-radius: 999px;
  font-size: 11px; font-weight: 600; font-family: var(--mono);
  letter-spacing: .3px;
}
/* Color variants */
.badge-sea    { background: var(--sea-pale);   color: var(--sea);   border: 1px solid var(--sea-soft); }
.badge-jade   { background: var(--jade-pale);  color: var(--jade2); border: 1px solid var(--jade-soft); }
.badge-amber  { background: var(--amber-pale); color: var(--amber2); border: 1px solid #F5C9A0; }
.badge-ruby   { background: var(--ruby-pale);  color: var(--ruby2); border: 1px solid #F7C1C1; }
.badge-violet { background: var(--violet-pale);color: var(--violet); border: 1px solid #C4B8F0; }
.badge-gold   { background: var(--gold-pale);  color: var(--gold);  border: 1px solid #E8D88A; }

/* Inline chip (smaller, no border) */
.cbadge { font-size: 9px; font-weight: 500; padding: 2px 7px; border-radius: 20px; font-family: var(--mono); }
.cb-sea  { background: #E8F2FB; color: #0B4F8A; }
.cb-jade { background: #EAF4EB; color: #1A4D1E; }
.cb-amb  { background: #FDF0E8; color: #7A3B0A; }
.cb-vio  { background: #EEE9FB; color: #2D1F6E; }
.cb-rub  { background: #FBE8E8; color: #7A1A1A; }
.cb-gld  { background: #FDF8E1; color: #6B4F00; }
```

React component:
```jsx
// components/ui/Badge.jsx
const variantMap = {
  sea: 'badge-sea', jade: 'badge-jade', amber: 'badge-amber',
  ruby: 'badge-ruby', violet: 'badge-violet', gold: 'badge-gold',
}
export function Badge({ variant = 'sea', children }) {
  return <span className={`badge ${variantMap[variant]}`}>{children}</span>
}
```

---

### Card (dcard)
```css
.dcard { background: var(--mist); border: 1px solid var(--wire); border-radius: var(--r); overflow: hidden; }
.dcard-head { padding: 12px 16px; border-bottom: 1px solid var(--wire); display: flex; justify-content: space-between; align-items: center; }
.dcard-title { font-size: 12px; font-weight: 500; color: var(--ink); display: flex; align-items: center; gap: 6px; }
.dcard-ghost-btn { font-size: 10px; padding: 3px 9px; border-radius: 20px; border: 1px solid var(--wire2); background: transparent; color: var(--ink3); cursor: pointer; }
.dcard-ghost-btn:hover { background: var(--mist3); }
```

React component:
```jsx
// components/ui/Card.jsx
export function Card({ title, icon, action, children, className }) {
  return (
    <div className={`dcard ${className || ''}`}>
      {title && (
        <div className="dcard-head">
          <span className="dcard-title">{icon && <span>{icon}</span>}{title}</span>
          {action}
        </div>
      )}
      {children}
    </div>
  )
}
```

---

### Stat Mini Card (sm)
```css
.sm { background: var(--mist); border: 1px solid var(--wire); border-radius: var(--r); padding: 14px 16px; position: relative; overflow: hidden; }
.sm-bar { position: absolute; top: 0; left: 0; right: 0; height: 3px; }
.sm-num { font-size: 24px; font-weight: 700; color: var(--ink); font-family: var(--font-head); letter-spacing: -.02em; line-height: 1; }
.sm-lbl { font-size: 11px; color: var(--ink4); }
```

Top color bar pattern (used on ALL stat cards):
```css
/* Always: position absolute, top 0, full width, height 3px */
.sm-bar { position: absolute; top: 0; left: 0; right: 0; height: 3px; background: {accentColor}; }
```

---

### Sidebar Nav Item (sbi)
```css
.sbi { display: flex; align-items: center; gap: 10px; padding: 7px 8px; border-radius: var(--rxs); cursor: pointer; color: var(--mist4); font-size: 12px; transition: all .15s; }
.sbi:hover { background: var(--ink2); color: #fff; }
.sbi.on { background: var(--sea); color: #fff; }
.sbi-ico { font-size: 13px; width: 20px; text-align: center; flex-shrink: 0; }
.sbi-lbl { flex: 1; }
.sbadge { font-size: 9px; font-weight: 500; background: var(--sea2); color: #fff; border-radius: 10px; padding: 1px 6px; font-family: var(--mono); }
.sbadge-a { background: var(--amber2) !important; }
.sbadge-r { background: var(--ruby2) !important; }
.sb-sec-lbl { font-size: 9px; color: var(--ink3); text-transform: uppercase; letter-spacing: 0.1em; padding: 0 8px; margin-bottom: 6px; }
```

---

### Collapsible Section Block (sblock)
```css
.sblock { background: #fff; border: 1px solid var(--wire); border-radius: var(--r); margin-bottom: 10px; }
.sblock-head { padding: 11px 16px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; }
.sblock-head:hover { background: var(--mist2); }
.sblock-body { padding: 12px 16px; border-top: 1px solid var(--wire); }
```

React component:
```jsx
// components/ui/CollapseBlock.jsx
import { useState } from 'react'
export function CollapseBlock({ title, icon, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="sblock">
      <div className="sblock-head" onClick={() => setOpen(!open)}>
        <span style={{ fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
          {icon} {title}
        </span>
        <span style={{ fontSize: 10, color: 'var(--ink4)' }}>{open ? '▲' : '▼'}</span>
      </div>
      {open && <div className="sblock-body">{children}</div>}
    </div>
  )
}
```

---

### Table
```css
.table-wrap { background: #fff; border: 1px solid var(--wire); border-radius: 10px; overflow: hidden; }
table { width: 100%; border-collapse: collapse; }
thead th { background: var(--mist2); font-size: 11px; font-weight: 500; text-transform: uppercase; letter-spacing: .05em; color: var(--ink4); padding: 9px 14px; text-align: left; }
tbody td { font-size: 12px; color: var(--ink); padding: 10px 14px; border-top: 1px solid var(--wire); }
tbody tr:hover td { background: var(--mist2); }
```

---

### Avatar (initials-based)
```jsx
// lib/utils.js
export function initials(name) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

// Usage
<div style={{
  width: 32, height: 32, borderRadius: '50%',
  background: 'var(--sea)', color: '#E8F2FB',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 11, fontWeight: 500
}}>
  {initials(recruiter.name)}
</div>
```

---

### Input / Form
```css
.form-input {
  width: 100%; background: #fff; border: 1px solid var(--wire);
  border-radius: var(--rsm); padding: 8px 11px;
  font-size: 13px; font-family: var(--font); color: var(--ink);
  outline: none; transition: border-color .15s;
}
.form-input:focus { border-color: var(--sea2); }
.form-input::placeholder { color: var(--mist4); }
.form-label { font-size: 11px; font-weight: 500; color: var(--ink4); margin-bottom: 4px; display: block; }
.form-error { font-size: 11px; color: var(--ruby2); margin-top: 4px; }
.form-group { margin-bottom: 14px; }
```

---

## Layout Templates

### Recruiter/Admin Shell
```jsx
// components/layout/RecruiterLayout.jsx
export default function RecruiterLayout({ recruiter, children }) {
  return (
    <div style={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', fontFamily: 'var(--font)' }}>
      <Topbar recruiter={recruiter} />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar recruiter={recruiter} />
        <main style={{ flex: 1, overflowY: 'auto', background: 'var(--mist2)' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
```

### Topbar
```css
.topbar { height: var(--topbar); background: var(--ink); display: flex; align-items: center; padding: 0 20px 0 0; border-bottom: 1px solid var(--ink2); flex-shrink: 0; }
.tb-logo-wrap { width: var(--sidebar); flex-shrink: 0; display: flex; align-items: center; padding: 0 20px; border-right: 1px solid var(--ink2); height: 100%; }
.logo { font-family: var(--font-head); font-size: 16px; font-weight: 700; color: #fff; }
.logo span { color: var(--sea3); }          /* Sea Search — "Sea" in blue */
.logo-sub { font-size: 10px; color: var(--jade3); display: flex; align-items: center; gap: 4px; }
```

### Hero Band (dark stats band)
```css
.hero { background: var(--ink); padding: 20px 28px; display: flex; border-bottom: 1px solid var(--ink2); flex-shrink: 0; }
.h-earn { flex: 1; padding-right: 28px; border-right: 1px solid var(--ink2); }
.h-earn-num { font-size: 36px; font-weight: 700; color: #fff; font-family: var(--font-head); letter-spacing: -.03em; line-height: 1; }
.h-metrics { display: flex; padding-left: 28px; flex: 1.4; }
.h-met { flex: 1; padding: 0 18px; border-right: 1px solid var(--ink2); display: flex; flex-direction: column; justify-content: center; }
.h-met:last-child { border-right: none; }
.h-met-num { font-size: 22px; font-weight: 600; color: #fff; font-family: var(--font-head); letter-spacing: -.02em; }
```

### Grid layouts
```css
.stat-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.g21 { display: grid; grid-template-columns: 1fr 340px; gap: 14px; }
.g3  { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; }
```

---

## Kanban Stage Colors
| Stage | Color token | Hex |
|-------|------------|-----|
| Sourced | `--mist4` | `#D4D0C8` |
| Screened | `--amber2` | `#B85C1A` |
| Interview | `--sea2` | `#1A6DB5` |
| Offered | `--violet2` | `#4B3AA8` |
| Hired | `--jade2` | `#2E7D33` |
| Rejected | `--ruby2` | `#B52525` |

---

## Industry Colors (consistent mapping)
```js
const INDUSTRY_COLORS = {
  'Finance & Banking': { bg: '#E8F2FB', text: '#0B4F8A', border: '#C5DFF5' },
  'Technology':        { bg: '#EEE9FB', text: '#2D1F6E', border: '#C4B8F0' },
  'Healthcare':        { bg: '#FBE8E8', text: '#7A1A1A', border: '#F7C1C1' },
  'FMCG':              { bg: '#FDF0E8', text: '#7A3B0A', border: '#F5C9A0' },
  'Consulting':        { bg: '#EEE9FB', text: '#2D1F6E', border: '#C4B8F0' },
  'Real Estate':       { bg: '#FDF8E1', text: '#6B4F00', border: '#E8D88A' },
  'Supply Chain':      { bg: '#EAF4EB', text: '#1A4D1E', border: '#B8DFB9' },
}
```

---

## Shared Utilities (lib/utils.js)
```js
export const initials = (name) => {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

export const fmt = (n) => {
  if (!n) return '0'
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return n.toLocaleString()
}

export const fmtCurrency = (n, currency = 'SGD') =>
  `${currency} ${Number(n).toLocaleString('en-SG', { minimumFractionDigits: 0 })}`

export const fmtDate = (ts) =>
  new Date(ts).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })

export const fmtRelative = (ts) => {
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export const stageColor = (stage) => ({
  sourced: 'var(--mist4)', screened: 'var(--amber2)',
  interview: 'var(--sea2)', offered: 'var(--violet2)',
  hired: 'var(--jade2)', rejected: 'var(--ruby2)'
}[stage] || 'var(--wire)')
```

---

## Scrollbar Style
```css
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--mist4); border-radius: 2px; }
```

---

## What NOT to do
- ❌ Never use `box-shadow` — use `border: 1px solid var(--wire)` instead
- ❌ Never hardcode hex colors in JSX — always use CSS variables
- ❌ Never use Tailwind color classes (`bg-blue-500`) — use custom tokens
- ❌ No dark mode toggle — dual-zone is fixed
- ❌ No mobile breakpoints — desktop-first only (min ~1200px)
- ❌ Never define `initials()`, `fmt()` inline — import from `lib/utils.js`
