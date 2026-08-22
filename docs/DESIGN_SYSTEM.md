# Dayflow Design System

**Version** 1.0 · **Date** 2026-08-22 · **Status** specification (no code changed)
**Stack** React 19 · TypeScript · Tailwind CSS v4 · React Router 7 · TanStack Query 5
**Sources** `files/01_PRD.md` · `files/02_TRD.md` · `Human Resource Management System - 8 hours.excalidraw` · `docs/UX_AUDIT.md` · `docs/FUNCTIONAL_AUDIT.md`

---

## 0. Principles & provenance

### 0.1 What this system is

Dayflow is an **internal HR operations tool** used daily by two people with opposite needs: an HR admin who lives in tables and clears queues, and an employee who visits twice a week to punch in and check a balance. It is not a marketing site and not an analytics product. Every decision below optimises for **the admin's scanning speed** and **the employee's certainty**, in that order.

Four principles, applied literally throughout:

1. **Clarity over decoration.** If a pixel is not carrying information, remove it. Status is never conveyed by colour alone.
2. **Hierarchy through structure, not size.** Dense tools cannot afford large type. Hierarchy comes from weight, colour, and spacing — with a small, deliberate size scale.
3. **Consistency is a token, not a habit.** Anything used twice becomes a variable. The audit found five ways to render an empty state and five ways to style an input; that happens when primitives are not extracted.
4. **Quiet by default, loud on exception.** In a directory of 200 employees, 195 are fine. Only the exceptions should draw the eye. This is why `ACTIVE` is grey, not green.

### 0.2 What this system evolves rather than replaces

The UX audit computed WCAG contrast for all 18 existing colour tokens and found **16 of 17 text pairs pass AA**, most with headroom. The IBM Plex pairing is a database-validated enterprise choice (`--domain typography` → *"Financial Trust… IBM Plex conveys trust and professionalism. Excellent for data"*). The light, dense, Odoo-adjacent direction matches the **Minimalism & Swiss Style** profile the tool returns for this product type.

**So this is not a restyle.** The existing palette, typeface and layout intent are kept and extended. What gets added is everything the codebase was missing: a spacing scale, a radius scale, an elevation scale, a real type scale, a focus system, a motion system, and component contracts.

> **A note on the palette search.** A `--domain color` query for HR/enterprise returned only generic SaaS schemes (indigo `#6366F1`, trust-blue `#2563EB`). None is HR-specific and none is better than what Dayflow has. Swapping a verified teal system for a generic blue one would be change for its own sake — exactly the "generic AI dashboard" outcome this document is meant to avoid. The existing brand is kept.

### 0.3 Verification

Every colour value in §1 has been computed against the WCAG 2.x relative-luminance formula. **All 32 token pairings pass their target ratio** — ratios are printed inline. Three candidate values were rejected during authoring for failing (`#AEB9C6` border at 1.99:1, `#7D8B9A` placeholder at 3.48:1, and pastel badge borders at 1.3–1.6:1) and replaced with passing values. No ratio in this document is an estimate.

---

## 1. Color

### 1.1 Architecture

Three layers. Components reference **semantic** tokens only — never a primitive, never a raw hex, never a Tailwind palette class.

```
primitive   --neutral-500: #5C6B7A
   ↓
semantic    --text-muted: var(--neutral-500)
   ↓
component   table header, field label, timestamp
```

This fixes UX audit **UI-11** (raw `text-red-300`, `bg-white`, `border-white/10` scattered through components).

### 1.2 Primitives

**Neutral** — the structural ramp. Built around the two greys already in the product (`#1A2332`, `#5C6B7A`) so nothing shifts perceptually.

| Token | Hex | Role |
|---|---|---|
| `--neutral-0` | `#FFFFFF` | Surface — cards, tables, modals |
| `--neutral-25` | `#F8FAFB` | Subtle surface — table header, hover row |
| `--neutral-50` | `#F3F5F7` | Canvas — app background |
| `--neutral-100` | `#E8ECF0` | Fill — skeletons, pressed states |
| `--neutral-200` | `#D8DEE6` | Divider — decorative rules |
| `--neutral-300` | `#7D8B9A` | **Control border** — 3.48:1 on white |
| `--neutral-400` | `#8492A1` | Disabled text, muted dot |
| `--neutral-500` | `#5C6B7A` | Secondary text, placeholder |
| `--neutral-700` | `#33414F` | Strong secondary |
| `--neutral-900` | `#1A2332` | Primary text |

> `--neutral-300` is deliberately darker than a conventional 300 step. It is the **UI-10 fix**: the old `#D8DEE6` input border sat at 1.35:1, below the 3:1 WCAG 1.4.11 requirement for a control's visual boundary. `#D8DEE6` survives as `--neutral-200` for decorative dividers, which are exempt.

**Brand** — teal, unchanged, extended with a pressed state and a dark-surface variant.

| Token | Hex | On white | Role |
|---|---|---|---|
| `--brand-50` | `#E6F4F2` | — | Soft fill, selected row |
| `--brand-100` | `#C7E6E2` | — | Soft fill hover |
| `--brand-300` | `#5EC5BA` | — | Brand on **dark nav** — 7.92:1 |
| `--brand-500` | `#0F766E` | **5.47:1** | Primary action, link, focus ring |
| `--brand-600` | `#0D5F59` | **7.50:1** | Hover |
| `--brand-700` | `#0A4A45` | **10.10:1** | Active / pressed |

**Status** — four semantic hues. `--info` is new.

| Token | Solid | On white | Soft | Text on soft |
|---|---|---|---|---|
| `--success` | `#067647` | 5.69:1 | `#ECFDF3` | **5.40:1** |
| `--warning` | `#B54708` | 5.43:1 | `#FFFAEB` | **5.20:1** |
| `--danger` | `#B42318` | 6.57:1 | `#FEF3F2` | **6.05:1** |
| `--info` | `#175CD3` | 5.99:1 | `#EFF4FF` | **5.43:1** |

> **Why `--info` is added.** The current build renders the `LEAVE` attendance status in `--accent` teal — the same colour as primary buttons and links. An employee on leave therefore looks like a clickable action. Introducing a blue `--info` frees teal to mean *"this is interactive"* everywhere, with no exceptions. That single separation is what makes the status system legible.

**Navigation** — dark chrome, values retained.

| Token | Hex | On nav | Role |
|---|---|---|---|
| `--nav-bg` | `#142033` | — | Header background |
| `--nav-text` | `#E8EEF5` | 14.00:1 | Active item |
| `--nav-muted` | `#9AABBD` | 6.96:1 | Inactive item |
| `--nav-hover` | `#C4D0DC` | 10.44:1 | Hover |
| `--nav-ring` | `#FFFFFF` | 16.35:1 | Focus ring on dark |

### 1.3 Semantic tokens

```css
:root {
  /* surface */
  --surface:            var(--neutral-0);
  --surface-subtle:     var(--neutral-25);
  --surface-canvas:     var(--neutral-50);
  --surface-fill:       var(--neutral-100);
  --surface-selected:   var(--brand-50);

  /* text */
  --text-primary:       var(--neutral-900);   /* 15.78:1 */
  --text-secondary:     var(--neutral-700);   /* 10.45:1 */
  --text-muted:         var(--neutral-500);   /*  5.47:1 */
  --text-placeholder:   var(--neutral-500);   /*  5.47:1 */
  --text-disabled:      var(--neutral-400);   /*  3.18:1 — WCAG-exempt */
  --text-link:          var(--brand-500);     /*  5.47:1 */
  --text-on-brand:      var(--neutral-0);     /*  5.47:1 */

  /* border */
  --border-divider:     var(--neutral-200);   /* decorative */
  --border-control:     var(--neutral-300);   /*  3.48:1 — inputs, selects */
  --border-strong:      var(--neutral-400);
  --border-focus:       var(--brand-500);

  /* focus — see §11 */
  --focus-ring:         0 0 0 2px var(--surface), 0 0 0 4px var(--brand-500);
  --focus-ring-dark:    0 0 0 2px var(--nav-bg),  0 0 0 4px var(--nav-ring);
  --focus-ring-danger:  0 0 0 2px var(--surface), 0 0 0 4px var(--danger);
}
```

### 1.4 Domain status semantics

This is the part a generic dashboard system cannot supply. Dayflow has **three distinct status vocabularies**, and the audit found them conflated.

**Attendance** (`AttendanceStatus`, PRD §7.5 — four states):

| State | Colour | Icon | Label |
|---|---|---|---|
| `PRESENT` | success | `Check` | Present |
| `HALF_DAY` | warning | `CircleHalf` | Half day |
| `ABSENT` | danger | `X` | Absent |
| `LEAVE` | **info** | `AirplaneTilt` | On leave |
| `isException` | warning **outline** | `Warning` | overlay on any of the above |

**Leave request** (`LeaveStatus` — three states):

| State | Colour | Icon | Label |
|---|---|---|---|
| `PENDING` | warning | `Clock` | Pending |
| `APPROVED` | success | `CheckCircle` | Approved |
| `REJECTED` | danger | `XCircle` | Rejected |

**Account** (`AccountStatus` — three states):

| State | Colour | Icon | Label |
|---|---|---|---|
| `ACTIVE` | **neutral** | none | Active |
| `PENDING_ACTIVATION` | warning | `Hourglass` | Awaiting activation |
| `SUSPENDED` | danger | `Prohibit` | Suspended |

> **`ACTIVE` is grey on purpose.** Nearly every employee is active. Rendering that green makes a 200-row directory a field of green chips in which the two suspended accounts disappear. Quiet by default, loud on exception (§0.1).

**Presence dot** — the fix for audit **UI-25**. The wireframe specifies three indicators; the build has two and uses red for the most common evening state.

| State | Fill | Shape | Ratio | Tooltip **and** `aria-label` |
|---|---|---|---|---|
| In office | `--success` | filled circle | 5.69:1 | "In office since 09:15" |
| On leave | `--info` | circle + plane glyph | 5.99:1 | "On approved leave" |
| Absent | `--warning` | hollow ring, 2px | 5.43:1 | "Absent — no time off requested" |
| Checked out | `--neutral-400` | filled circle | 3.18:1 | "Checked out at 18:05" |

Four states, four fills, three shapes, always an accessible name. A person who worked all day and went home is **grey, not red** — they are not a problem.

> DB rule — *Accessibility / Color Only, severity High*: "Do: Use icons/text in addition to color. Don't: Red/green only."

---

## 2. Typography

### 2.1 Family

**IBM Plex Sans** (UI) · **IBM Plex Mono** (data). Retained — DB-validated for enterprise/finance/data.

Mono is not decorative. It is reserved for values where **character alignment aids verification**: Login IDs (`AS2026007`), employee codes, bank/PAN/UAN/IFSC, currency amounts, timestamps, and audit entity IDs. Never for prose, labels, or headings.

**Loading** — fixes audit **PQ-13**. Move out of the CSS `@import` (render-blocking, discovered only after stylesheet parse) into `index.html`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap">
```

### 2.2 Scale

The audit's finding (**UI-1**, **UI-4**) was not "the text is too small" — 14px is correct for a dense HR tool, and Linear, Odoo and Notion all sit at 13–14px in tables. The finding was that **93% of all text was 14px or smaller with no differentiation**, and that 10px was carrying meaning. This scale keeps the density and restores hierarchy.

| Token | Size / line-height | Weight | Use |
|---|---|---|---|
| `--text-display` | 30 / 36 | 600 | Health score number only |
| `--text-h1` | 24 / 32 | 600 | Page title (`PageHeader`) |
| `--text-h2` | 20 / 28 | 600 | Section heading, modal title |
| `--text-h3` | 16 / 24 | 600 | Card title, tab label |
| `--text-body-lg` | **16 / 24** | 400 | **Form inputs**, profile values, prose |
| `--text-body` | 14 / 20 | 400 | Table cells, dense UI, secondary |
| `--text-label` | 13 / 18 | 500 | Field labels, buttons, nav |
| `--text-caption` | 12 / 16 | 500 | Badges, metadata, timestamps |

**Two hard rules:**

1. **12px is the floor.** `text-[10px]` is removed everywhere (audit **UI-5**) — it currently carries workflow chips, audit IDs, the unread count and the check-in error, all of which are meaningful content.
2. **Form inputs are 16px minimum** (`--text-body-lg`). Below 16px, iOS Safari zooms the viewport on focus, which on a phone breaks the layout mid-entry. This is why the reading tier exists even in a dense product.

Line-height moves from `1.45` to **1.5** minimum (audit **UI-6**).

**Casing.** Sentence case everywhere. The current `uppercase tracking-wide` micro-labels (audit **UI-7**) on ~30 profile fields cost legibility for no hierarchy gain — weight and colour already separate label from value.

---

## 3. Spacing

4px base unit. Density tuned high (`--density 8`) for admin scanning.

| Token | px | Use |
|---|---|---|
| `--space-1` | 4 | Icon↔label, chip padding |
| `--space-2` | 8 | Related controls, badge x-padding |
| `--space-3` | 12 | Input padding-x, table cell padding-x |
| `--space-4` | 16 | Card padding (compact), field gap, page padding (mobile) |
| `--space-5` | 20 | Card padding (default) |
| `--space-6` | 24 | Section gap, page padding (tablet), grid gutter |
| `--space-8` | 32 | Page padding (desktop), major section gap |
| `--space-10` | 40 | Page header ↔ content |
| `--space-12` | 48 | Empty-state vertical padding |
| `--space-16` | 64 | Page bottom margin |

**Container padding rule** — fixes audit **UI-8** (padding currently ranges `p-2` → `p-8` with no logic):

| Container | Padding |
|---|---|
| Chip, badge | `--space-1` / `--space-2` |
| Table cell | `--space-2` y / `--space-3` x |
| Card, panel, table wrapper | `--space-5` |
| Card (compact — directory grid) | `--space-4` |
| Modal body | `--space-5` |
| Modal header / footer | `--space-4` y / `--space-5` x |
| Empty state | `--space-12` y / `--space-6` x |

One padding value per container class. No exceptions.

---

## 4. Border radius

| Token | px | Applies to |
|---|---|---|
| `--radius-sm` | 4 | Badges, chips, checkboxes, dots-as-squares |
| `--radius-md` | 6 | Buttons, inputs, selects, table wrapper inner |
| `--radius-lg` | 8 | Cards, panels, tables, dropdowns |
| `--radius-xl` | 12 | Modals |
| `--radius-full` | 9999 | Avatars, presence dots, unread count |

**Rule:** radius increases one step per elevation level. A button (`md`) inside a card (`lg`) inside a modal (`xl`) nests correctly. Fixes audit **UI-29** (`rounded-md` ×27 / `rounded-lg` ×18 / `rounded-xl` ×1 / bare `rounded` with no rule).

---

## 5. Shadows & elevation

Four levels, tinted with the navy ink rather than neutral black so shadows sit in the same colour family as the UI.

| Token | Value | Level | Use |
|---|---|---|---|
| `--shadow-xs` | `0 1px 2px rgba(20,32,51,.06)` | 0 — resting | Cards, panels, table wrapper |
| `--shadow-sm` | `0 2px 4px rgba(20,32,51,.08), 0 1px 2px rgba(20,32,51,.06)` | 1 — raised | Card hover, sticky table header |
| `--shadow-md` | `0 8px 16px rgba(20,32,51,.10), 0 2px 4px rgba(20,32,51,.06)` | 2 — floating | Dropdowns, popovers, toasts |
| `--shadow-lg` | `0 20px 32px rgba(20,32,51,.16), 0 4px 8px rgba(20,32,51,.08)` | 3 — overlay | Modals |

**Rule:** elevation is always **shadow + radius together**, never shadow alone. Fixes audit **UI-29** (tokenised `--shadow` used 6× beside raw `shadow-lg`/`shadow-xl` at exactly the three most visible moments).

---

## 6. Layout & grid

### 6.1 Page shell

```
┌──────────────────────────────────────────────┐
│ AppShell header — sticky, h-56px, --nav-bg   │
├──────────────────────────────────────────────┤
│  main   max-w-1280 · px responsive           │
│  ┌────────────────────────────────────────┐  │
│  │ PageHeader   title · subtitle · actions│  │
│  │ ── space-6 ──                          │  │
│  │ StatStrip    (optional)                │  │
│  │ ── space-6 ──                          │  │
│  │ Toolbar      search · filters          │  │
│  │ ── space-4 ──                          │  │
│  │ Content      table | grid | panel      │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

| Region | Value |
|---|---|
| Header height | 56px |
| Content max-width | 1280px (`--layout-max`) |
| Wide max-width | 1536px (`--layout-max-wide`) — data tables only |
| Page padding | 16 / 24 / 32 (mobile / tablet / desktop) |
| Grid | 12 columns, 24px gutter |

`scroll-padding-top: 72px` on `:root` so anchors and programmatic focus clear the sticky header — fixes audit **UX-8** (WCAG 2.2 *Focus Not Obscured*).

### 6.2 Content grids

| Surface | Mobile | `sm` 640 | `lg` 1024 | `xl` 1280 |
|---|---|---|---|---|
| Employee directory | 1 col | 2 | 3 | 4 |
| Stat strip | 2 | auto-fit | auto-fit | auto-fit |
| Employee 360° | 1 | 1 | 2 | 2 |
| Profile field grid | 1 | 2 | 2 | 3 |

**`StatStrip` uses `repeat(auto-fit, minmax(180px, 1fr))`, not a fixed column count** — fixes audit **UI-2**, where a hard-coded `lg:grid-cols-4` fed 3 items leaves a permanent empty cell on the admin landing screen.

---

## 7. Responsive breakpoints

Tailwind defaults, with a defined behaviour at every step — the audit found **UX-5** (no nav below `md`) and **PQ-4** (nothing between `sm` and `lg`).

| Token | Min-width | Primary change |
|---|---|---|
| base | 0 | Single column · **drawer nav** · card-list tables |
| `sm` | 640 | 2-col grids · inline toolbars |
| `md` | 768 | **Horizontal nav appears** · tables become tables |
| `lg` | 1024 | 3-col grids · 2-col 360° · side-by-side detail |
| `xl` | 1280 | 4-col directory · max-width reached |
| `2xl` | 1536 | Wide tables only |

**Mobile-first, always.** Base styles are the phone; breakpoints add.

### 7.1 Table responsive strategy

An 8-column leave table cannot be a table on a 375px screen. Audit **PQ-2** found the Approve/Reject buttons — the reason the screen exists — off-screen behind horizontal scroll.

| Breakpoint | Rendering |
|---|---|
| `< md` | **Card list.** Each row becomes a stacked card: primary identifier as title, 2–3 key fields as label/value pairs, status badge top-right, actions as a full-width button row. |
| `≥ md` | Real `<table>` in an `overflow-x-auto` wrapper with a sticky header. |

Priority columns for the card view, by screen:

- **Leave queue** → Employee · Type · Dates · Status · Actions
- **Attendance (admin)** → Employee · In · Out · Status
- **Attendance (self)** → Date · Hours · Status
- **Audit log** → Action · Actor · When

---

## 8. Motion

The audit found 5 transitions and 1 animation in the whole product (**PQ-10**), with no `prefers-reduced-motion` (**PQ-7**).

| Token | Value | Use |
|---|---|---|
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | Enter, expand |
| `--ease-in-out` | `cubic-bezier(0.4, 0, 0.2, 1)` | Move, morph |
| `--duration-instant` | 100ms | Colour, background, border |
| `--duration-fast` | 150ms | Hover, focus, small state change |
| `--duration-base` | 200ms | Dropdown, tooltip, toast |
| `--duration-slow` | 300ms | Modal, drawer |

**Rules**
- Animate `transform` and `opacity` only. Never `width`, `height`, or `margin` — they force layout on every frame.
- Hover displacement ≤ 2px so it reads as feedback, not movement.
- Exit is faster than enter (typically 2/3).
- Every transition sits inside the guard below — no exceptions.

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

> DB rule — *Hover Micro-interaction, Subtle tier*: 150–200ms, `power1.out`, "Keep displacement under 2px so it reads as feedback not motion. Don't animate layout-affecting props." The skeleton's `animate-pulse` currently runs indefinitely for reduced-motion users; the guard above stops it.

---

## 9. Iconography

**Library:** Phosphor Icons (React), `weight="regular"`, 16 / 20 / 24px. Heroicons as fallback. One family per surface.

This replaces audit **UI-31** — `🔔`, `✕`, `←`, `→` used as UI controls. Emoji render differently per OS, cannot inherit colour, and do not scale with the type system. An unused SVG sprite (`public/icons.svg`) already sits in the repo.

| Size | Use |
|---|---|
| 16px | Inline with `--text-body`, badges, table cells |
| 20px | Buttons, nav, form affordances |
| 24px | Empty states, page-level affordances |

**Domain icon map**

| Concept | Icon | Concept | Icon |
|---|---|---|---|
| Employees | `Users` | Notifications | `Bell` |
| Attendance | `Clock` | Add employee | `UserPlus` |
| Time off | `CalendarBlank` | Check in | `SignIn` |
| Audit log | `ClipboardText` | Check out | `SignOut` |
| Health | `Pulse` | On leave | `AirplaneTilt` |
| Profile | `User` | Mobile menu | `List` |
| Approve | `CheckCircle` | Close | `X` |
| Reject | `XCircle` | Exception | `Warning` |

**Accessibility contract** — applied per usage, not per icon:

- Decorative (beside visible text) → `aria-hidden="true"`
- Meaningful (no adjacent text) → text alternative
- Inside a control → the **control** gets the accessible name, and exposes state (`aria-expanded`, `aria-pressed`)

> DB rule — *icon-context-accessibility*: "Context is chosen by use… if inside an interactive control, give the control an accessible name and expose applicable state."

---

## 10. Focus system

**The single highest-priority item in this document.** The audit (**UI-14**, **UI-15**) found the codebase defines *zero* `focus:` or `focus-visible:` styles, and that three inputs actively strip the browser outline (`outline-none focus:border-…`), replacing it with a colour shift on a border that itself failed contrast.

```css
:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
  border-radius: inherit;
}
.on-dark :focus-visible      { box-shadow: var(--focus-ring-dark); }
[data-variant="danger"]:focus-visible { box-shadow: var(--focus-ring-danger); }
```

The two-layer ring — 2px surface-coloured spacer, then 4px brand — reads on any background, including directly against a control's own border.

| Rule | |
|---|---|
| `:focus-visible`, never `:focus` | keyboard users get the ring; mouse users don't |
| `outline: none` **only** with `box-shadow` replacement | never bare |
| Applies to every operable control | buttons, links, tabs, inputs, selects, menu items, table row actions, close buttons |
| Ring contrast | 5.47:1 on white · 5.01:1 on canvas · 16.35:1 on nav |
| Focus is never obscured | `scroll-padding-top: 72px` (§6.1) |

> Stack rule (`html-tailwind` 4.3) — *Forms / Focus states, severity High*: "Bad: `focus:outline-none` (no replacement)." *Accessibility / Focus visible*: "Do: `focus-visible:ring-2`."

**Cursor.** Tailwind v4's Preflight no longer sets `cursor: pointer` on `<button>`. The codebase has zero `cursor-pointer`, so every button currently shows an arrow (audit **UI-13**). Add globally:

```css
button:not(:disabled), [role="button"]:not([aria-disabled="true"]), a[href] { cursor: pointer; }
button:disabled, [aria-disabled="true"] { cursor: not-allowed; }
```

---

## 11. Buttons

### 11.1 Variants

| Variant | Background | Text | Border | Use |
|---|---|---|---|---|
| `primary` | `--brand-500` | white 5.47:1 | none | One per view — Submit, Approve, Save |
| `secondary` | `--surface` | `--text-primary` | `--border-control` | Cancel, Discard, secondary nav |
| `danger` | `--danger` | white 6.57:1 | none | Reject, Suspend |
| `ghost` | transparent | `--text-secondary` | none | Tertiary, icon-only, table row actions |
| `link` | none | `--text-link` | none | Inline in prose |

### 11.2 Sizes

Replaces the `!important` overrides the audit found (**UI-17**) with a real `size` prop.

| Size | Height | Padding-x | Type | Icon | Use |
|---|---|---|---|---|---|
| `sm` | **32px** | 12 | `--text-label` | 16 | Table row actions, toolbars |
| `md` | 40px | 16 | `--text-label` | 20 | Default |
| `lg` | 48px | 20 | `--text-body-lg` | 20 | Primary form submit, mobile |

**32px is the floor.** WCAG 2.2 AA requires ≥24×24 CSS px; 32 gives comfortable margin and keeps dense toolbars usable. The current `!px-2 !py-1` approve/reject buttons measure ~20px (audit **UI-16**). Adjacent targets get ≥8px separation.

### 11.3 States

| State | Treatment |
|---|---|
| Default | per variant |
| Hover | `--brand-600` / `--surface-canvas`, 150ms |
| Active | `--brand-700`, `translateY(1px)` |
| **Focus** | `--focus-ring` (§10) |
| Disabled | `opacity: .5`, `cursor: not-allowed`, `aria-disabled` |
| **Loading** | spinner replaces leading icon · label persists · `disabled` · `aria-busy="true"` · **width locked** to prevent reflow |

The loading state is mandatory on every mutation. Audit **UX-18** found Approve/Reject fire with no pending feedback and no `disabled`, so a double-click sends two requests.

### 11.4 Rules

- **One `primary` per view.** Two primaries means neither is primary.
- Icon-only buttons require `aria-label` and a tooltip.
- Destructive actions never sit adjacent to their primary without ≥16px separation.
- Label with a verb + object: "Approve request", not "OK".

---

## 12. Inputs & forms

### 12.1 Anatomy

Every field is the same five-part structure. There is one `Field` primitive; no screen hand-rolls this. Fixes audit **UI-18** (five different input stylings) and **UX-11** (placeholder-only labels on two forms).

```
┌ Label            (required *)     ← always visible, --text-label
│ ┌─────────────────────────────┐
│ │ Control                     │   ← 40px, 16px text, --border-control
│ └─────────────────────────────┘
│ Helper text                       ← --text-muted, --text-caption
└ ⚠ Error message                   ← --danger, role="alert", replaces helper
```

### 12.2 Specification

| Property | Value |
|---|---|
| Height | 40px (`md`) · 48px (`lg`, mobile) |
| Padding | 12px x · 10px y |
| Font | **16px** — `--text-body-lg` (prevents iOS zoom, §2.2) |
| Border | 1px `--border-control` (3.48:1) |
| Radius | `--radius-md` |
| Background | `--surface`; disabled `--surface-canvas` |
| Placeholder | `--text-placeholder` (5.47:1) — **supplements the label, never replaces it** |

### 12.3 States

| State | Border | Extra |
|---|---|---|
| Default | `--border-control` | |
| Hover | `--border-strong` | |
| **Focus** | `--border-focus` | + `--focus-ring` |
| Error | `--danger` | + message, `aria-invalid="true"`, `aria-describedby` |
| Disabled | `--border-divider` | `--surface-canvas`, `--text-disabled`, `cursor: not-allowed` |
| Read-only | none | canvas fill, no border — visually distinct from disabled |

### 12.4 Validation

Fixes audit **UX-12** (no inline validation) and **UX-13** (invalid ranges give no feedback).

1. **Validate on blur**, not on every keystroke — mid-typing errors are noise.
2. Once a field has errored, **re-validate on change** so the user sees it clear.
3. Never validate on submit only.
4. Every error is **inline, below its own field**, linked via `aria-describedby`.
5. A form with 2+ errors also gets a summary at the top: `role="alert"`, `tabindex="-1"`, focus moved to it on failed submit, each item an anchor to its field. **Inline errors are retained** — the summary supplements, never replaces.
6. Server errors from the `{ success:false, message, code }` envelope map to the offending field where `code` identifies one (`LEAVE_ATTACHMENT_REQUIRED` → attachment field), otherwise to the summary.

> DB rules — *Forms / Input Labels* (High): "Every input needs a visible label… Don't: Placeholder as only label." *Forms / Error Placement* (High): "Each invalid field needs an inline error connected to that field." *Forms / Focusable Error Summary* (High): "move focus to its heading after failed submit; link each item to its invalid field; **retain inline errors**."

### 12.5 Domain input types

| Type | Treatment |
|---|---|
| Currency (₹) | Mono, right-aligned, `en-IN` grouping (₹12,50,000 — not 1,250,000) |
| Date range | Paired pickers, `end >= start` enforced on blur with an inline message, day count shown live |
| Attachment | Drop zone + file picker + filename + size + remove. Required state stated in the label, not only enforced by `required` |
| Login ID / codes | Mono, uppercase-normalised on blur |
| Search | Leading `MagnifyingGlass`, clear button when non-empty, **250ms debounce** (audit **PQ-14**) |

---

## 13. Dropdowns & menus

Fixes audit **UX-6** — neither existing dropdown closes on outside click or Escape, and two can be open at once.

| Property | Value |
|---|---|
| Background | `--surface` |
| Border / radius / shadow | `--border-divider` · `--radius-lg` · `--shadow-md` |
| Min width | 200px (menu) · trigger width (select) |
| Item height | 36px · 8px y / 12px x padding |
| Item hover | `--surface-subtle` |
| Item selected | `--surface-selected` + `Check` icon |
| Max height | 320px, scroll, sticky search above 10 items |
| Animation | fade + 4px rise, 200ms `--ease-out` |

**Behaviour contract — all mandatory**

| | |
|---|---|
| Trigger | `aria-haspopup="menu"`, `aria-expanded`, `aria-controls` |
| Container | `role="menu"`; items `role="menuitem"` |
| Open | focus first item (keyboard) or none (mouse) |
| `↑` `↓` | move between items, wrapping |
| `Home` / `End` | first / last |
| `Esc` | close, **return focus to trigger** |
| Outside click | close |
| `Tab` | close and continue past the trigger |
| Only one open | opening one closes any other |

---

## 14. Tables

The core admin surface. Fixes audit **UI-20** (no sort/filter/bulk), **UI-21** (form inside a cell), **UI-22** (no semantic scaffolding), **UI-23** (seconds in cells).

### 14.1 Structure

```
┌ Toolbar   search · filters · bulk-action bar (on selection) · count ┐
├ Header    sticky · --surface-subtle · sortable · scope="col"        ┤
│ Rows      48px · zebra off · hover --surface-subtle                 │
├ Footer    pagination · "1–25 of 143"                                ┤
└─────────────────────────────────────────────────────────────────────┘
```

| Property | Value |
|---|---|
| Row height | 48px (default) · 40px (compact) |
| Cell padding | 12px x · 8px y |
| Type | `--text-body` (14px) |
| Header | `--text-label`, `--text-muted`, sentence case, **not** uppercase |
| Divider | 1px `--border-divider` between rows |
| Hover | `--surface-subtle`, 100ms |
| Selected | `--surface-selected` + 2px left `--brand-500` |

### 14.2 Column conventions

| Content | Alignment | Format |
|---|---|---|
| Text, names | left | — |
| Numbers, currency | **right** | mono, `en-IN` |
| Dates | left | `22 Aug 2026` |
| Times | left | mono, **`HH:mm` — no seconds** |
| Status | left | badge |
| Actions | right | `sm` ghost buttons |

Primary identifier column is `font-medium` `--text-primary`; everything else is `--text-body`.

### 14.3 Required behaviours

- **Sortable headers** — click to sort, `aria-sort="ascending|descending|none"`, arrow indicator.
- **Filters in the toolbar**, not buried. The leave queue **defaults to `PENDING`** (audit **UX-10**/**P2-14**: actionable rows currently interleave with history).
- **Bulk select** — checkbox column, header select-all, action bar replaces the toolbar on selection showing "3 selected". An approval queue is the textbook case.
- **Row actions never contain a form.** Approve/Reject open a **review drawer** (§15.2). This single change resolves UI-21, UX-10, PQ-2 and UI-16 together.
- **Pagination always rendered** when `totalPages > 1` — the API already returns the envelope and the UI discards it (audit **UI-20**/**P2-18**).
- Semantics: `<caption class="sr-only">`, `scope="col"` on every `<th>`, `aria-sort`, `aria-expanded` on expanders.
- Wrapper is `overflow-x-auto`; below `md` the table becomes a card list (§7.1).

---

## 15. Cards, panels & drawers

### 15.1 Card

| Property | Value |
|---|---|
| Background / border / radius / shadow | `--surface` · `--border-divider` · `--radius-lg` · `--shadow-xs` |
| Padding | `--space-5` (compact `--space-4`) |
| Hover (interactive only) | `--shadow-sm`, `--border-control`, `translateY(-1px)`, 150ms |
| Focus | `--focus-ring` |

**Employee card** — the wireframe's directory unit, restored (audit **UI-24**, **UI-25**):

```
┌────────────────────────────────┐
│ ●                        ⌄     │  ← presence dot (4 states, §1.4)
│ ┌────┐  Rahul Verma            │  ← 40px AVATAR — photo, initials fallback
│ │ RV │  Software Engineer      │
│ └────┘  Engineering            │
│         EMP2026002             │  ← mono
└────────────────────────────────┘
```

`profilePictureUrl` exists in the schema, the DTO and the self-edit allowlist and is rendered nowhere. Cards must render it, with an initials avatar as fallback — not as the only state.

### 15.2 Review drawer

**New component**, and the most consequential structural change here. Slides from the right (`480px`, full-width below `md`) to host any row-level decision — replacing the input-and-two-buttons crammed into a `<td>`.

```
┌─────────────────────────────────┐
│ Review time off        [X]      │
├─────────────────────────────────┤
│ Rahul Verma · EMP2026002        │
│ Sick Leave · 25–26 Aug · 2 days │
│ Balance after: 5 of 7 days      │  ← consequence, before the decision
│                                 │
│ Certificate.pdf          [View] │
│ Workflow trail                  │
│ ┌ Reason for decision ────────┐ │
│ │                             │ │  ← required for reject
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│         [Reject]     [Approve]  │  ← sticky footer, loading states
└─────────────────────────────────┘
```

It shows the **consequence before the decision** ("Balance after: 5 of 7") — the thing a queue-clearing admin actually needs and the current table cannot show.

---

## 16. Modals

Fixes audit **PQ-5** — the current `Modal` has no `role`, no focus trap, no Escape, no focus restoration, and its submit falls below the fold on a phone (**PQ-3**).

| Property | Value |
|---|---|
| Overlay | `rgba(20,32,51,.48)`, fade 200ms |
| Panel | `--surface` · `--radius-xl` · `--shadow-lg` |
| Width | `sm` 400 · `md` 560 · `lg` 720 · full-screen below `md` |
| Header | 56px, `--text-h2`, close button right |
| Body | `--space-5`, `max-height: 70vh`, scrolls |
| **Footer** | **sticky**, `--space-4`, right-aligned, secondary then primary |
| Animation | fade + scale `.98→1`, 300ms `--ease-out`; exit 200ms |

**Accessibility contract — all mandatory**

| | |
|---|---|
| `role="dialog"` `aria-modal="true"` | |
| `aria-labelledby` → header `<h2>` | |
| Focus moves to the panel (or first field) on open | |
| **Focus trapped** while open | Tab cycles inside |
| `Esc` closes | |
| Backdrop click closes | unless the form is dirty → confirm |
| **Focus returns to the trigger** on close | |
| Body scroll locked | |

Modals are for **focused creation** (Add employee, Request time off). Row decisions use the drawer (§15.2); confirmations use the alert dialog (§18.2).

---

## 17. Navigation

### 17.1 Desktop (`≥ md`)

```
┌──────────────────────────────────────────────────────────────┐
│ ◆ Dayflow │ Employees Attendance Time off Audit Health │ ⏱ 🔔 ▾│
└──────────────────────────────────────────────────────────────┘
```

| Property | Value |
|---|---|
| Height / background | 56px · `--nav-bg` |
| Item | `--text-label`, `--nav-muted` (6.96:1) |
| Hover | `--nav-hover` (10.44:1) |
| Active | `--nav-text` + 2px `--brand-300` bottom border |
| Focus | `--focus-ring-dark` (16.35:1) |

Full labels — "Time off", "Audit log", "Workforce health". No truncation (audit **UX-2**).

### 17.2 Mobile (`< md`) — the critical gap

Audit **UX-5**/**PQ-1**: below 768px the app currently has *no navigation at all*.

```
┌──────────────────────────────┐
│ ☰  Dayflow          ⏱ 🔔 ▾  │
└──────────────────────────────┘
```

`List` icon → left drawer (280px, overlay, slide 300ms) containing every nav item at 48px height with icon + label, the user identity block at top, and Log out at bottom. Closes on: item select, outside tap, Escape, swipe-left. Focus trapped while open, returned to the trigger on close.

The check-in widget and bell **stay in the header** at all breakpoints — they are the two things an employee opens the app on a phone to do.

### 17.3 Role-aware structure

`Employees`, `Audit log` and `Workforce health` render only for `HR_ADMIN` — role-aware nav, not disabled items.

**A "My" group is added for `HR_ADMIN`** — the fix for audit **UX-4**/**P1-11**. An HR admin is also an employee: they check in via the widget, hold leave balances, and can file requests, but the current IA gives them no route to any of it. Their check-ins write to a record they cannot read.

| | Employee | HR Admin |
|---|---|---|
| Primary nav | Attendance · Time off | Employees · Attendance · Time off · Audit log · Health |
| Avatar menu | My profile · Log out | **My profile · My attendance · My time off** · Log out |

### 17.4 Avatar menu

Avatar + name + **`CaretDown`** — the wireframe specifies the caret and the build omits it, leaving the menu undiscoverable (audit **UI-27**). Below `sm` the avatar alone remains, with `aria-label`.

### 17.5 Check-in widget

The signature control. Persistent in the header, systray-scale.

```
[ ● 3:42  Check out ]     in office
[ ○ ——    Check in  ]     out
```

- Dot uses the §1.4 presence colours — **grey when checked out, not red**.
- Elapsed time in mono, `mm` precision, ticking each minute.
- Button shows a loading state during the mutation.
- Errors go to a **toast** (§18.3), never the 120px truncated span the audit found (**UX-19**).
- Full state in `aria-label`: "Checked in at 09:15, 3 hours 42 minutes elapsed. Activate to check out."

---

## 18. Feedback: alerts, dialogs, toasts

The audit's most systemic finding: **no toast layer exists**, so success is silent and the product's most important action fails invisibly (**UX-14**/**P0-1**, **UX-15**).

### 18.1 Inline alert

Persistent, contextual, in the content flow.

| Variant | Border-left | Background | Icon |
|---|---|---|---|
| `info` | `--info` | `--info-soft` | `Info` |
| `success` | `--success` | `--success-soft` | `CheckCircle` |
| `warning` | `--warning` | `--warning-soft` | `Warning` |
| `danger` | `--danger` | `--danger-soft` | `XCircle` |

3px left border · `--space-4` · `--radius-md` · optional title + body + action link · `role="alert"` when it appears in response to an action.

Use for: form-level errors, "This account is awaiting activation", "3 requests need review".

### 18.2 Confirmation dialog

Fixes audit **UX-17** — Approve and Reject commit on a single click with no confirm and no undo, and rejection is irreversible in the data model.

Required before any irreversible action: reject leave, suspend account, replace a salary structure.

```
┌──────────────────────────────────┐
│ ⚠  Reject this request?          │
│                                  │
│ Rahul Verma's sick leave for     │
│ 25–26 Aug will be rejected.      │
│ This cannot be undone.           │
│                                  │
│           [Cancel]  [Reject]     │
└──────────────────────────────────┘
```

`role="alertdialog"` · `sm` width · focus defaults to **Cancel** · confirm button carries the verb ("Reject"), never "OK" · destructive confirm uses the `danger` variant.

### 18.3 Toast

Transient confirmation of a completed action.

| Property | Value |
|---|---|
| Position | Bottom-right desktop · top, full-width, below header on mobile |
| Width | 360px · `--radius-lg` · `--shadow-md` |
| Structure | icon · message · optional action · dismiss |
| Duration | **success 4s · info 5s · error persistent until dismissed** |
| Stack | max 3, newest bottom, older collapse |
| Animation | slide 8px + fade, 200ms; exit 150ms |
| A11y | container `role="status"` `aria-live="polite"`; errors `role="alert"` `aria-live="assertive"`. Timer **pauses on hover and focus** |

> DB rule — *Feedback / Toast Notifications*: "Auto-dismiss after 3-5 seconds. Don't: Toasts that never disappear." Errors are the deliberate exception — a failure the user must act on cannot expire.

**Mandatory toast coverage** — every mutation in the product:

| Action | Success | Failure |
|---|---|---|
| Check in / out | "Checked in at 09:15" | error toast, persistent |
| Submit leave request | "Request submitted for review" | inline + toast |
| **Approve / reject leave** | **"Leave approved for Rahul Verma"** | **persistent error toast with the server `message`** |
| Create employee | "Employee created — `AS2026007`" with **Copy** action | inline |
| Update profile / salary | "Profile updated" | inline + toast |

The Approve/Reject row is the direct fix for **P0-1**.

### 18.4 Notification centre

Distinct from toasts: toasts are *this session's actions*, the bell is *durable events for you*.

Bell with unread badge · panel 380px · grouped Today / Earlier · unread carries a 6px `--brand-500` left dot · click marks read **optimistically** and navigates to the subject · "Mark all read".

Badge is `aria-live="polite"` with the count in the accessible name ("Notifications, 3 unread") — audit **PQ-8** found the label omits the count entirely.

---

## 19. Loading states

Fixes audit **UX-20** — one generic skeleton of N identical 40px bars currently stands in for card grids, tab forms, tables and dashboards, so every load reflows.

### 19.1 Principle

**Skeletons mirror the shape of what they replace.** A skeleton that does not match its content is a layout shift with extra steps.

| Surface | Skeleton |
|---|---|
| Table | Header + N rows at true row height, cell-width blocks matching the real column widths |
| Card grid | N cards at true card dimensions with avatar circle + 2 text bars |
| Profile | Tab bar + 2-col field grid, label bar + value bar per field |
| Stat strip | N stat cards at true height |
| 360° | Stat strip + 2×2 panel grid |
| Detail panel | Title bar + 3 field rows |

### 19.2 Specification

| Property | Value |
|---|---|
| Fill | `--surface-fill` |
| Radius | matches the element it replaces |
| Animation | `pulse` 1.5s ease-in-out infinite, opacity `1 → .6 → 1` — **no opacity ramp per row** (the current `1 - i*0.1` decorative fade matches no real content) |
| Reduced motion | static fill, no pulse |
| Container | `aria-busy="true"` |

### 19.3 Other loading affordances

| Context | Treatment |
|---|---|
| Button | inline spinner replacing the leading icon, label persists, width locked |
| Inline refetch | 2px top progress bar, existing data stays visible and dimmed to 60% |
| Route change | top progress bar |
| Optimistic | apply immediately, roll back with an error toast on failure — mark-as-read and check-in are the archetypes (audit **PQ-11**) |
| < 300ms | **no indicator** — a flashed spinner is worse than none |

---

## 20. Empty states

Fixes audit **UX-23** — the component exists and is good, but is applied to 4 of 9 lists in 5 different renderings, and 3 of the 4 pass no `hint`.

### 20.1 Anatomy

```
┌─────────────────────────────────────┐
│              ⌾                      │  ← 24px icon, --text-muted
│      No pending requests            │  ← --text-h3
│  New time off requests will         │  ← --text-body, --text-muted
│  appear here for review.            │
│         [ Request time off ]        │  ← action when one exists
└─────────────────────────────────────┘
```

`--space-12` vertical · `--space-6` horizontal · centred · dashed `--border-divider` inside a table, borderless as a page-level state.

### 20.2 Three distinct kinds — never interchangeable

| Kind | Message shape | Action |
|---|---|---|
| **First use** — nothing exists yet | "No employees yet" · explain what appears here | primary: create the first one |
| **Filtered** — data exists, filters exclude it | "No employees match 'zzz'" · **echo the query** | secondary: clear filters |
| **Cleared** — the good outcome | "All caught up" · affirm | none |

The distinction matters most on the leave queue: an empty **PENDING** filter means *the queue is clear*, which is a success, not an absence.

### 20.3 Required copy

Every list in the product, replacing the five ad-hoc renderings:

| Surface | Title | Hint |
|---|---|---|
| Directory (first use) | No employees yet | Add your first employee to get started. |
| Directory (filtered) | No employees match "{q}" | Try a different name, code, or department. |
| Leave queue (admin) | All caught up | No requests are waiting for review. |
| My time off | No time off requests | Request time off and track its status here. |
| My attendance | No attendance this month | Check in from the header to start recording. |
| Attendance (admin) | No records for {date} | Nobody has checked in on this date yet. |
| Audit log | No matching activity | Adjust the filters or widen the date range. |
| 360° — recent leave | No requests yet | — |
| 360° — recent activity | No recorded activity | — |
| Notifications | You're all caught up | — |

---

## 21. Error states

### 21.1 Levels

| Level | Treatment |
|---|---|
| **Field** | Inline below the field · `--danger` · `aria-describedby` · `aria-invalid` (§12.4) |
| **Form** | Summary alert at top · `role="alert"` · `tabindex="-1"` · focused on failed submit · links to each field |
| **Section** | `ErrorState` inside the panel, rest of the page intact |
| **Page** | Full-page error with retry |
| **Global** | Error boundary — never a white screen (audit **UX-26**) |

### 21.2 `ErrorState`

Icon `WarningCircle` in `--danger` · title · the server `message` from the `{ success:false, message, code }` envelope · **Retry** as primary. Copy states what failed and what to do — never a bare status code.

### 21.3 Rules

1. **Never render an error as an empty state.** Audit **UX-24**/**P2-15**: a failed salary request currently displays "No salary structure configured" — an error masquerading as a fact about someone's pay. Every query must branch `isError` before `isEmpty`.
2. **Never fail silently.** Every mutation resolves to a toast or an inline message (§18.3). This is **P0-1**.
3. **Always announce.** `role="alert"` on every error surface — audit **PQ-6** found none in the product.
4. **Always offer a way forward** — Retry, Cancel, or a contact route.
5. **Session expiry is explained, not silent.** A 401 shows "Your session expired — sign in to continue" and preserves the attempted route for post-login return, rather than the current bare `window.location.href` reload (audit **UX-25**).

### 21.4 Error code → message map

The API's `code` field is stable (TRD §5). Map it to human copy; never surface the raw code.

| Code | Message |
|---|---|
| `INVALID_CREDENTIALS` | Email or password is incorrect. |
| `LEAVE_OVERLAP` | These dates overlap a request you've already submitted. |
| `LEAVE_INSUFFICIENT_BALANCE` | Not enough balance — {n} days available. |
| `LEAVE_ATTACHMENT_REQUIRED` | Sick leave needs a medical certificate attached. |
| `LEAVE_INVALID_STATE` | This request was already reviewed by someone else. |
| `ATTENDANCE_ALREADY_CHECKED_IN` | You're already checked in — check out first. |
| `ATTENDANCE_NOT_CHECKED_IN` | You're not checked in yet. |
| `FORBIDDEN` | You don't have access to this. |
| `RATE_LIMITED` | Too many attempts. Try again in a few minutes. |
| `VALIDATION_ERROR` | map to the field where identifiable, else summary |

---

## 22. Badges & status indicators

The semantic maps — which colour and icon each domain state uses — live in **§1.4**. This section defines the components that render them.

### 22.1 Badge

A non-interactive label for a discrete state. Never a button; never the only way to reach an action.

| Property | Value |
|---|---|
| Height | 22px (`sm`) · 24px (`md`) |
| Padding | `--space-1` y · `--space-2` x |
| Type | `--text-caption` (12px), weight 500, **sentence case** |
| Radius | `--radius-sm` |
| Icon | 12px leading, `aria-hidden="true"` |
| Gap | `--space-1` between icon and label |

**Variants**

| Variant | Fill | Text | Border | Use |
|---|---|---|---|---|
| `soft` *(default)* | `--{status}-soft` | `--{status}` 5.20–6.05:1 | **none** | Tables, cards, lists |
| `outline` | `--surface` | `--{status}` 5.43–6.57:1 | 1px `--{status}` | Dense tables where soft fills add too much colour |
| `neutral` | `--surface-fill` | `--text-secondary` | none | `ACTIVE`, counts, non-semantic tags |

Soft badges carry no border by design — see the documented exemption in Appendix B.

**Rules**

1. **Label always present.** No icon-only badges, and never colour alone.
2. **Sentence case** — "Half day", not "HALF_DAY" or "HALF DAY". Enum values are mapped for display; the raw `_` form never reaches the screen.
3. **One badge per state dimension.** A leave row shows its `LeaveStatus` badge once — the current build renders `StatusBadge` *and* a workflow trail whose last chip repeats it (audit **UX-10**).
4. Never truncate or wrap. A badge that cannot fit its label needs a shorter label, not an ellipsis.

### 22.2 Presence dot

The compact indicator on directory cards and the check-in widget. Four states, specified in **§1.4** — filled circle, hollow ring, and glyph variants so shape distinguishes states independently of colour.

| Property | Value |
|---|---|
| Size | 8px (card corner) · 10px (widget) |
| Shape | `--radius-full`; `absent` is a 2px ring, not a fill |
| Accessible name | Always — "In office since 09:15", not "green" |
| Tooltip | Supplements the accessible name; never the only carrier (touch has no hover) |

This replaces the current two-state green/red dot, in which an employee who worked a full day and went home renders identically to one who never arrived (audit **UI-25**).

### 22.3 Workflow trail

The approval-visualisation differentiator (PRD §10.4). A horizontal sequence of steps for one leave request.

```
● Submitted ─── ● Pending review ─── ○ Decision
  22 Aug          22 Aug
```

| State | Marker | Label | Text |
|---|---|---|---|
| Complete | filled `--brand-500` | past tense | `--text-secondary` |
| Current | ringed `--warning` | present tense | `--text-primary`, weight 500 |
| Upcoming | hollow `--border-control` | **neutral noun** | `--text-muted` |

**The final step is labelled "Decision" until it resolves**, then becomes "Approved" or "Rejected" with its timestamp and reviewer. The current build hard-codes the third label to "Approved" for every non-rejected request, so a **pending** request displays `Submitted → Pending HR Review → Approved` with the outcome carried only by grey styling (audit **UX-9**). A status trail that names an outcome that has not happened is worse than no trail.

Type is `--text-caption` (12px) — not the `text-[10px]` the audit found (**UI-5**). Below `md` the trail stacks vertically.

### 22.4 Count badge

Numeric indicator on the notification bell and filter tabs.

| Property | Value |
|---|---|
| Size | 16px min, `--radius-full`, grows with digits |
| Fill / text | `#D92D20` / white — **4.83:1** |
| Type | 11px, weight 600, mono |
| Overflow | `99+` |
| Zero | **render nothing** — an empty badge is noise |
| A11y | count in the parent's accessible name ("Notifications, 3 unread"); `aria-live="polite"` |
| Layout | fixed slot so appearance does not shift the toolbar |

---

## 23. Implementation notes

### 22.1 Token layer

Define all primitives and semantics in `@theme` (Tailwind v4's CSS-first config) so they generate utilities. Components then use `bg-surface`, `text-muted`, `border-control` — never `bg-[var(--surface)]` and never `bg-white`.

### 22.2 Primitives to extract first

The audit's inconsistency findings (**UI-18**, **UI-19**, **UI-29**, **UX-23**) all trace to missing primitives. In dependency order:

1. `Field` — label + control + helper + error (kills 5 input variants)
2. `Button` — add `size`, `loading`, `iconLeft/Right` (kills `!important`)
3. `Table` — header, sort, selection, pagination, responsive card fallback
4. `Badge` — soft and outline, driven by the §1.4 status maps
5. `Toast` + provider (nothing to refactor — it does not exist)
6. `Modal` — rebuild on a headless dialog primitive for the §16 contract
7. `Drawer` — new, §15.2
8. `Menu` — replaces both hand-rolled dropdowns
9. `Skeleton` variants — §19.1
10. `EmptyState` / `ErrorState` — extend with `kind` and `action`

### 22.3 Sequence

| Phase | Work | Resolves |
|---|---|---|
| **1 — Foundations** | Tokens · focus system · cursor · reduced-motion · font preload | UI-13, UI-14, UI-15, PQ-7, PQ-13 |
| **2 — Feedback** | Toast provider · wire every mutation · error boundary · `role="alert"` | **P0-1**, UX-14, UX-15, UX-16, PQ-6, UX-26 |
| **3 — Primitives** | `Field`, `Button`, `Badge`, `Menu`, `Modal` | UI-17, UI-18, UI-19, UX-6, UX-11, PQ-5 |
| **4 — Navigation** | Mobile drawer · full labels · "My" group · caret | **UX-5**, UX-2, UX-4, UI-27 |
| **5 — Data surfaces** | `Table` (sort/filter/bulk/paginate/responsive) · review drawer · avatars · presence dot | UI-20, UI-21, UI-24, UI-25, PQ-2 |
| **6 — Polish** | Content skeletons · empty-state copy · type scale · icon swap | UX-20, UX-23, UI-1, UI-5, UI-31 |

### 22.4 Definition of done

Per component:

- [ ] Semantic tokens only — no raw hex, no `bg-white`, no Tailwind palette classes
- [ ] `:focus-visible` ring on every operable control
- [ ] `cursor-pointer` on everything clickable
- [ ] Keyboard-operable end to end; Escape closes anything that opens
- [ ] Text ≥ 4.5:1, control boundaries ≥ 3:1, targets ≥ 32px, adjacent gaps ≥ 8px
- [ ] Loading, empty, and error states all defined and distinguishable
- [ ] Status never conveyed by colour alone
- [ ] Renders correctly at 375 / 768 / 1024 / 1440
- [ ] Motion inside the `prefers-reduced-motion` guard
- [ ] No `text-[10px]`; inputs ≥ 16px

---

## Appendix A — Complete token reference

```css
@theme {
  /* ── neutral ─────────────────────────────── */
  --color-neutral-0:   #FFFFFF;  --color-neutral-25:  #F8FAFB;
  --color-neutral-50:  #F3F5F7;  --color-neutral-100: #E8ECF0;
  --color-neutral-200: #D8DEE6;  --color-neutral-300: #7D8B9A;
  --color-neutral-400: #8492A1;  --color-neutral-500: #5C6B7A;
  --color-neutral-700: #33414F;  --color-neutral-900: #1A2332;

  /* ── brand ───────────────────────────────── */
  --color-brand-50:  #E6F4F2;  --color-brand-100: #C7E6E2;
  --color-brand-300: #5EC5BA;  --color-brand-500: #0F766E;
  --color-brand-600: #0D5F59;  --color-brand-700: #0A4A45;

  /* ── status ──────────────────────────────── */
  --color-success: #067647;  --color-success-soft: #ECFDF3;
  --color-warning: #B54708;  --color-warning-soft: #FFFAEB;
  --color-danger:  #B42318;  --color-danger-soft:  #FEF3F2;
  --color-info:    #175CD3;  --color-info-soft:    #EFF4FF;

  /* ── navigation ──────────────────────────── */
  --color-nav-bg:    #142033;  --color-nav-text:  #E8EEF5;
  --color-nav-muted: #9AABBD;  --color-nav-hover: #C4D0DC;

  /* ── type ────────────────────────────────── */
  --font-sans: 'IBM Plex Sans', system-ui, sans-serif;
  --font-mono: 'IBM Plex Mono', ui-monospace, monospace;
  --text-display: 1.875rem;  --text-display--line-height: 2.25rem;
  --text-h1:      1.5rem;    --text-h1--line-height:      2rem;
  --text-h2:      1.25rem;   --text-h2--line-height:      1.75rem;
  --text-h3:      1rem;      --text-h3--line-height:      1.5rem;
  --text-body-lg: 1rem;      --text-body-lg--line-height: 1.5rem;
  --text-body:    0.875rem;  --text-body--line-height:    1.25rem;
  --text-label:   0.8125rem; --text-label--line-height:   1.125rem;
  --text-caption: 0.75rem;   --text-caption--line-height: 1rem;

  /* ── spacing ─────────────────────────────── */
  --spacing-1: 4px;   --spacing-2: 8px;   --spacing-3: 12px;
  --spacing-4: 16px;  --spacing-5: 20px;  --spacing-6: 24px;
  --spacing-8: 32px;  --spacing-10: 40px; --spacing-12: 48px;
  --spacing-16: 64px;

  /* ── radius ──────────────────────────────── */
  --radius-sm: 4px;  --radius-md: 6px;  --radius-lg: 8px;
  --radius-xl: 12px; --radius-full: 9999px;

  /* ── elevation ───────────────────────────── */
  --shadow-xs: 0 1px 2px rgba(20,32,51,.06);
  --shadow-sm: 0 2px 4px rgba(20,32,51,.08), 0 1px 2px rgba(20,32,51,.06);
  --shadow-md: 0 8px 16px rgba(20,32,51,.10), 0 2px 4px rgba(20,32,51,.06);
  --shadow-lg: 0 20px 32px rgba(20,32,51,.16), 0 4px 8px rgba(20,32,51,.08);

  /* ── motion ──────────────────────────────── */
  --ease-out:    cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
  --duration-instant: 100ms; --duration-fast: 150ms;
  --duration-base:    200ms; --duration-slow: 300ms;

  /* ── layout ──────────────────────────────── */
  --layout-max: 1280px;  --layout-max-wide: 1536px;
  --layout-header: 56px; --layout-drawer: 280px;
  --layout-side-panel: 480px;
}
```

## Appendix B — Contrast verification

All values computed with the WCAG 2.x relative-luminance formula. **32 of 32 pass.**

| Pairing | Ratio | Target | |
|---|---|---|---|
| `text-primary` / surface | 15.78 | 4.5 | ✅ |
| `text-secondary` / surface | 10.45 | 4.5 | ✅ |
| `text-muted` / surface | 5.47 | 4.5 | ✅ |
| `text-muted` / canvas | 5.00 | 4.5 | ✅ |
| `text-disabled` / surface | 3.18 | exempt | ✅ |
| **`border-control` / surface** | **3.48** | **3.0** | ✅ |
| **`border-control` / canvas** | **3.19** | **3.0** | ✅ |
| `border-divider` / surface | 1.35 | decorative | ✅ |
| `brand-500` text & ring / surface | 5.47 | 4.5 | ✅ |
| `brand-500` ring / canvas | 5.01 | 3.0 | ✅ |
| white / `brand-500` · `600` · `700` | 5.47 · 7.50 · 10.10 | 4.5 | ✅ |
| `success` / surface · soft · dot | 5.69 · 5.40 · 5.69 | 4.5 / 4.5 / 3.0 | ✅ |
| `warning` / surface · soft · dot | 5.43 · 5.20 · 5.43 | 4.5 / 4.5 / 3.0 | ✅ |
| `danger` / surface · soft · dot | 6.57 · 6.05 · 6.57 | 4.5 / 4.5 / 3.0 | ✅ |
| `info` / surface · soft · dot | 5.99 · 5.43 · 5.99 | 4.5 / 4.5 / 3.0 | ✅ |
| `neutral-400` dot / surface | 3.18 | 3.0 | ✅ |
| `nav-text` / `nav-bg` | 14.00 | 4.5 | ✅ |
| `nav-muted` / `nav-bg` | 6.96 | 4.5 | ✅ |
| `nav-hover` / `nav-bg` | 10.44 | 4.5 | ✅ |
| **focus ring white / `nav-bg`** | **16.35** | **3.0** | ✅ |
| `brand-300` / `nav-bg` | 7.92 | 4.5 | ✅ |
| unread badge white / `#D92D20` | 4.83 | 4.5 | ✅ |

**Badge borders — documented exemption.** Pastel borders on soft-fill badges reach only 1.3–1.6:1 against their own background. Rather than forcing saturated rings that would look wrong, **soft badges carry no border** — their text meets 5.20–6.05:1 and identifies the state. The `outline` badge variant uses the full-strength status colour as its border (5.43–6.57:1 on white). Both are accessible; neither relies on a decorative border to convey meaning.

---

*Produced with the UI/UX Pro Max skill (v2.13.0): `--design-system` (variance 3 · density 8), `--domain color`, `--domain typography`, `--domain ux`, `--domain icons`, `--domain gsap`, `--stack react`, `--stack html-tailwind`. Contrast computed from candidate values during authoring; three failing candidates were rejected and replaced. No frontend code was modified.*
