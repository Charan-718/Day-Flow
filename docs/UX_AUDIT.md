# Dayflow — UX / UI Audit

**Date:** 2026-08-22
**Commit:** `6a8c491`
**Stack detected:** React 19.2 · TypeScript · Vite 8 · Tailwind CSS **v4**.3 · React Router 7 · TanStack Query 5 (from `frontend/package.json`)
**Product type:** internal enterprise HR tool (single tenant, Odoo-inspired IA), not a public-facing product

**Inputs:** `files/01_PRD.md` · `files/02_TRD.md` · `files/03_FRONTEND_PROMPT.md` · `Human Resource Management System - 8 hours.excalidraw` (574 elements, 299 text labels) · `docs/FUNCTIONAL_AUDIT.md`

**Method.** Static review of all 20 frontend source files against the wireframe and the PRD/TRD, cross-referenced with the UI/UX Pro Max guideline database (`--domain ux`, `--domain icons`, `--stack react`, `--stack html-tailwind`) and a computed WCAG contrast pass over every design token in `index.css`. Where a finding is backed by a database rule, the rule is cited. Where it is my judgement, it is marked as such. No code was modified and nothing was executed.

**Reference direction.** A `--design-system` query for "internal HR admin dashboard enterprise" (variance 3, density 8) returns **Minimalism & Swiss Style** — *"Best For: Enterprise apps, dashboards, documentation sites, SaaS platforms, professional tools"* — which is precisely the direction Dayflow already takes. The tool's suggested palette was a dark "Real-Time Operations" scheme; that is a landing-page pattern and I am **not** recommending it here. Dayflow's light, dense, Odoo-adjacent direction is the correct call for the product, and this audit judges the execution against that intent rather than proposing a restyle.

---

## Scorecard

| Area | Grade | One-line verdict |
|---|---|---|
| Information architecture | **B** | Correct nav model, but two roles share one URL and admins lose their own employee surface |
| Navigation | **D** | No navigation at all below 768px |
| User journeys | **C** | Employee journey is coherent; admin approval journey dead-ends on failure |
| Task completion | **C−** | Core tasks complete; the two highest-value admin tasks (approve, edit salary) are blocked or silent |
| Forms | **C** | Real labels and inline errors on the modal; placeholder-only labels on the two admin forms |
| Feedback | **D+** | No toast layer anywhere; success and failure are both frequently silent |
| Loading states | **C+** | Skeletons exist (good) but are one generic shape reused for every content type |
| Empty states | **B−** | Good component, applied to 4 of 9 lists |
| Visual hierarchy | **B−** | Clean and scannable; weakened by a flat 14px-everywhere type scale |
| Typography | **C** | No 16px body tier; 10px chips below the legibility floor |
| Spacing | **B** | Consistent rhythm, inconsistent container padding (p-2 → p-8) |
| Color | **A−** | **Genuinely well built** — 16 of 18 token pairs pass WCAG AA on computation |
| Buttons | **C+** | Good variant system; no focus ring, no cursor, no loading state on the critical ones |
| Tables | **C** | Correct overflow handling; no sort/filter/bulk, forms crammed into cells |
| Cards | **B−** | Clean, but photo-less and status-ambiguous vs. the wireframe |
| Consistency | **C** | Same rhythm everywhere — which is also the problem (see §4.4) |
| Responsive | **D** | Desktop-only in practice |
| Accessibility | **D+** | Strong color foundation undone by zero focus styling and emoji icons |
| Mobile UX | **F** | Unusable: no nav, no reachable primary actions |
| Interaction design | **D+** | 5 transitions, 1 animation, 0 reduced-motion, 0 optimistic updates |
| Perceived performance | **C** | Skeletons help; per-keystroke search and render-blocking `@import` hurt |

**Counts:** 5 Critical · 16 High · 30 Medium · 22 Low = **73 findings** (UX-1…26 · UI-1…31 · PQ-1…16)

---

# Part 1 — UX

## 1.1 Information architecture

The IA is **right in principle**. The wireframe's persistent `Logo | Employees | Attendance | Time Off | Avatar⌄` nav is implemented as specified, `Employees` renders only for `HR_ADMIN`, and the PRD §7.2 decision to skip a separate dashboard page in favour of a dashboard-aware landing is honoured for the admin. Route-highlighting works. This part was thought about.

Three structural problems:

**UX-1 · One URL, two entirely different applications** — *High*
`/attendance` and `/time-off` each render a completely different screen depending on role (`AttendancePage.tsx:25-27`, `TimeOffPage.tsx`). The frontend prompt explicitly asked for this ("two different components behind one route… do not build one generic table"), and the components are correctly separate — but nothing in the UI tells you which variant you are looking at. Both are titled "Attendance"; the admin's says "Organization check-in for a selected day" only in the subtitle. Support and training for a tool like this depends on "go to /attendance and click X" being a stable instruction, and here it is not.

**UX-2 · Admin nav labels are truncated inconsistently** — *Low*
Nav reads `Audit` and `Health`; the pages are titled "Audit Log" and "Workforce Health". Two of five admin nav items use a shortened form and three do not. Cheap to fix, and it currently reads as unfinished.

**UX-3 · Employee 360° has no route into it** — *Medium*
The PRD calls it "your strongest single admin screen" (§10.3). It has no nav entry, no directory-card affordance, and is reachable only via a secondary button on another employee's profile — which is additionally hidden when `self` is true (`EmployeeProfile.tsx:88`). A screen this central should not be three clicks deep and undiscoverable.

**UX-4 · Admins have no employee-side surface** — *High* (= functional **P1-11**)
The check-in widget sits in Priya's nav and writes attendance rows she can never read; she holds leave balances she cannot see and cannot file a request. From an IA standpoint the app assumes "admin" and "employee" are different people, but PRD §6 defines `HR_ADMIN` as one merged role held by a real employee. The nav has no "My …" section to hold these.

## 1.2 Navigation

**UX-5 · There is no navigation below 768px** — *Critical*
`AppShell.tsx:31` — `<nav className="ml-4 hidden items-center gap-1 md:flex">` with no hamburger, drawer, or bottom-bar fallback. Under 768px the header contains a logo, the check-in widget, a bell and an avatar; Employees, Attendance, Time Off, Audit and Health are unreachable except by typing URLs. The avatar dropdown offers only "My Profile" and "Log Out".

Combined with `AppShell.tsx:59` (`hidden text-xs … sm:inline` on the elapsed timer) and `:66` (`hidden … sm:inline` on the user's name), the mobile header degrades to four unlabeled glyphs.

> DB rule — *Responsive / Mobile First, severity Medium*: "Do: Start with mobile styles then add breakpoints. Don't: Desktop-first causing mobile issues." This is the desktop-first failure mode in its purest form.

**UX-6 · Dropdowns do not close on outside click or Escape** — *High*
Neither the avatar menu (`AppShell.tsx:71`) nor the notification panel (`NotificationBell.tsx:44`) has an outside-click handler, an Escape handler, `aria-expanded`, `aria-haspopup`, or roving focus. Open the bell, click into the page, and it stays open over the content. Two open at once is possible.

**UX-7 · No breadcrumbs or back affordance on detail screens** — *Low*
`/employees/:id` and `/employees/:id/360` are two levels deep with no path back to the directory except the browser button or the nav item. The DB rule rates breadcrumbs *Low* and scopes them to "sites with 3+ levels of depth", so this is genuinely minor — but the 360° page's only escape is a small text link ("Open profile →") that goes *deeper*, not back.

**UX-8 · Sticky header with no scroll-padding** — *Medium*
The header is `sticky top-0 z-30` (`AppShell.tsx:20`) and `<main>` has no compensating `scroll-padding-top`. Any in-page anchor or programmatic focus near the top scrolls the target under the header.

> DB rule — *Accessibility / Focus Not Obscured (Minimum), WCAG 2.2 AA, severity High*: "Do: Offset sticky UI with scroll-padding… Don't: Let headers… fully cover focus. Good: `scroll-padding-top: var(--header-height)`."

## 1.3 User journeys & task completion

I traced the five journeys the Execution Plan's demo script depends on.

| Journey | Completes? | Blocking UX issue |
|---|---|---|
| Employee: log in → check in → view attendance | ✅ | — |
| Employee: request sick leave | ✅ | Attachment is a URL field, not a file picker (functional P3-12) |
| Admin: provision an employee | ✅ | Placeholder-only labels (UX-11); no role selector |
| **Admin: approve leave** | ⚠️ | **Fails silently** (UX-14) |
| **Employee: see the approval** | ❌ | **Never updates without F5** (functional P0-2) |
| Admin: edit a salary structure | ❌ | **No UI exists** (functional P1-9) |
| Admin: correct an employee's department / bank details | ❌ | Edit mode exposes only phone + address (functional P1-9 context) |

**UX-9 · The workflow trail labels a pending request "Approved"** — *High*
`leave.service.ts:236-247` builds the third step as `label: status === 'REJECTED' ? 'Rejected' : 'Approved'` — so a **PENDING** request renders the chip sequence `Submitted → Pending HR Review → Approved`, with the third chip merely styled grey/not-done. The differentiator the PRD asks for (§10.4, "a visible status trail, not just a database field") currently tells an employee their pending request says "Approved". Styling alone is carrying a semantic distinction, which is exactly the failure the accessibility guidance warns about.

**UX-10 · Status is encoded twice, in two adjacent columns** — *Medium*
Each leave row shows a `StatusBadge` and then a `WorkflowTrail` whose last chip repeats the same state, consuming two of eight columns to say one thing. On the admin view (8 columns + an inline form cell) this is what pushes the table into horizontal scroll on a 1440px screen.

## 1.4 Forms

The Time Off request modal is the **best-built form in the app**: real `<label>` elements wrapping their inputs, visible label text above each field, conditional disclosure of the attachment field only when the selected type requires it, an auto-computed Allocation that stays editable, and a server-error line rendered from the API envelope. That is close to the guidance.

The other two forms are not built to that standard.

**UX-11 · The Add Employee form is placeholder-only** — *High*
`EmployeeDirectory.tsx:158-215`: all six fields (`First name`, `Last name`, `Work email`, `Job position`, department `<select>`, joining date) carry a `placeholder` and **no label**. Once a field is filled the label is gone; screen readers get no accessible name; the bare `<input type="date">` has no indication it means "joining date".

> DB rule — *Forms / Input Labels, severity **High***: "Every input needs a visible label. Do: Always show label above or beside input. Don't: Placeholder as only label."
> DB rule — *Accessibility / Form Labels, severity **High***: "Inputs must have associated labels… Bad: `placeholder='Email'` only."

The same applies to both search inputs (`EmployeeDirectory.tsx:92`, `AttendancePage.tsx:236`) and the per-row `Comment` input in the approval table (`TimeOffPage.tsx:190`).

**UX-12 · No inline validation anywhere** — *Medium*
Every form validates on submit only, via HTML `required`. Nothing validates on blur, and no field ever shows a per-field message — errors surface as a single line at the bottom of the form, not attached to the offending input.

> DB rule — *Forms / Error Placement, severity High*: "Each invalid field needs an inline error connected to that field… reference it with `aria-describedby`. Don't: Show only a top-level error without identifying each invalid field."
> DB rule — *Forms / Inline Validation, severity Medium*: "Do: Validate on blur for most fields. Don't: Validate only on submit."

**UX-13 · Invalid date ranges give no feedback and quietly produce a wrong number** — *Medium*
`TimeOffPage.tsx:100-103`: when `end < start`, `daysRequested` silently falls back to `1`. The user sees an inverted range with "1" in the Allocation field and no warning, submits, and gets a generic server error. (The server-side twin of this is functional **P1-4**.)

## 1.5 Feedback

**UX-14 · Leave approve/reject fails with zero feedback** — *Critical* (= functional **P0-1**)
`TimeOffPage.tsx:78-98` — `approve.isError` and `reject.isError` are never rendered and neither mutation defines `onError`. `LEAVE_INVALID_STATE`, `LEAVE_INSUFFICIENT_BALANCE`, 404s, 500s and network failures all produce an unchanged row and no message. This is the single most important action in the product.

> DB rule — *Forms / Submit Feedback, severity **High***: "Confirm form submission status. Do: Show loading then success/error state. Don't: No feedback after submit. Bad: Button click with no response."

**UX-15 · There is no success feedback anywhere in the application** — *High*
No toast layer, no snackbar, no inline confirmation. Saving a profile closes the edit bar; approving a leave request re-renders a row; marking notifications read just dims them. In every case the user must infer success from a side effect.

> DB rule — *Feedback / Confirmation Messages, severity Medium*: "Do: Brief success message. Don't: Silent success."

**UX-16 · A native `alert()` is the only validation dialog in the product** — *Medium*
`TimeOffPage.tsx:207` — `alert('Comment required to reject')`. It is unstyled, blocking, unlocalisable, and inconsistent with the inline-error pattern used ~6 lines away in the same file.

**UX-17 · Destructive and irreversible actions have no confirmation** — *Medium*
Approve and Reject both commit immediately on a single click, with no confirm step and no undo. Rejecting a leave request is not reversible in the data model (`LEAVE_INVALID_STATE` blocks re-review), so a misclick is permanent.

> DB rule — *Interaction / Confirmation Dialogs, severity **High***: "Prevent accidental destructive actions. Do: Confirm before delete/irreversible actions."

**UX-18 · Approve/Reject stay enabled while in flight** — *Medium* (= functional P2-13)
No `disabled={approve.isPending}`, no spinner, no label change. The primary `Button` component supports `disabled` styling (`Button.tsx:24`) and `create`/`save` use it correctly — these two do not. Double-click fires two requests; the second 409s into the void (UX-14).

**UX-19 · The check-in widget renders errors as a 120px truncated span in the nav** — *Low*
`CheckInWidget.tsx:59-63` — `max-w-[120px] truncate text-[10px] text-red-300`, with the full message only in a `title` tooltip (hover-only, so unavailable on touch). "Already checked in today. Check out first." truncates to roughly "Already check…".

## 1.6 Loading states

The `LoadingSkeleton` component exists and is used on 6 screens — better than most projects at this stage, and it satisfies the baseline rule.

**UX-20 · One generic skeleton shape stands in for every content type** — *Medium*
`ui.tsx:13-24` renders `N` identical 40px full-width bars with a computed opacity ramp (`1 - i * 0.1`). It is used for the employee **card grid** (`rows={6}`), the profile **tab form** (`rows={8}`), **tables**, and the **360° dashboard** (`rows={10}`). None of those look like stacked 40px bars, so every load produces a visible reflow when real content replaces the placeholder.

> DB rule — *Layout / Content Jumping, severity **High***: "Do: Reserve appropriate space or keep async states in a stable content-driven container. Don't: Insert compact text or media without a layout strategy."
> DB rule — *Feedback / Loading Indicators, severity **High***: "Do: Follow platform and component guidance; preserve layout focus and accessible busy status. Don't: Apply one timing threshold to every operation."

No `aria-busy` is set on any loading container.

**UX-21 · Route transitions have no loading affordance** — *Low*
No `Suspense` boundary, no route-level pending state. Clicking an employee card shows the old page until the new page's query resolves into a skeleton.

**UX-22 · The salary tab re-shows a skeleton on every visit** — *Low*
The query is gated on `tab === 'salary'` (`EmployeeProfile.tsx:34`), so the fetch begins only on click and there is no prefetch on tab hover. Switching away and back re-triggers the loading state.

## 1.7 Empty states

`EmptyState` (`ui.tsx:3-11`) is a good component — title plus optional hint, dashed border, correct tone — and the directory's usage ("No employees found" / "Try a different search or add a new hire.") is exactly right.

**UX-23 · Applied to 4 of 9 lists** — *Medium*

| Surface | Empty state |
|---|---|
| Employee directory | ✅ with actionable hint |
| Leave requests | ✅ title only, no hint |
| Attendance timeline | ✅ title only |
| Audit log | ✅ title only |
| My attendance table | ⚠️ inline `<td colSpan={6}>` text — a fifth, different pattern |
| Admin attendance table | ❌ renders an empty `<tbody>` |
| Notification panel | ⚠️ its own bespoke "No notifications" markup |
| Employee 360° — recent leave | ❌ bare heading over an empty `<ul>` |
| Employee 360° — recent activity | ❌ bare heading over an empty `<ul>` (and this list is *always* missing attendance — functional P1-6) |

Three of the four that do use the component pass no `hint`, so they state a fact without offering a next step.

> DB rule — *Feedback / Empty States, severity Medium*: "Do: Show helpful message **and action**. Don't: Blank empty screens."

## 1.8 Error states

`ErrorState` (`ui.tsx:26-49`) with a Retry affordance is well designed and correctly wired to `refetch()` on 5 screens. Read-path errors are handled respectably. Write-path errors are where it collapses (UX-14, UX-15).

**UX-24 · A failed salary request renders as a factual claim about pay** — *High* (= functional P2-15)
`EmployeeProfile.tsx:195`: `{salary.data == null && !salary.isLoading && (<p>No salary structure configured.</p>)}`. `salary.isError` is never checked, so a 403, 500 or dropped connection displays a confident assertion that this employee has no compensation on file. An error state that masquerades as data is worse than a visible failure.

**UX-25 · Session expiry is a silent full-page reload** — *Medium*
`api/client.ts:24-27` does `window.location.href = '/login'` on any 401 — discarding React state, any unsaved form, and offering no "your session expired" message. The user's half-finished leave request vanishes with no explanation.

**UX-26 · No error boundary and no 404 page** — *Medium*
`App.tsx:49` routes `*` to `<Navigate to="/" replace />`, so a typo'd or stale URL silently bounces to the landing page rather than saying anything. Any render-time exception takes down the whole tree to a blank white page.

---

# Part 2 — UI

## 2.1 Visual hierarchy

The page skeleton is sound: sticky dark nav, `PageHeader` with title + subtitle + right-aligned actions, optional `StatStrip`, then content. It scans well, and the dark navy nav against the light-grey canvas gives a clear frame.

**UI-1 · The type scale is nearly flat** — *High*
Measured across all `.tsx`: `text-sm` ×60, `text-xs` ×29, `text-[10px]` ×4, and exactly one instance each of `text-base`, `text-lg`, `text-xl`, `text-2xl`, `text-5xl`. Roughly 93% of all text is 14px or smaller. With so little size differentiation, hierarchy is carried almost entirely by weight and colour, which is why dense screens (360°, the leave table) read as an undifferentiated field.

**UI-2 · `StatStrip` is a 4-column grid that never receives 4 items** — *Low*
`ui.tsx:70` declares `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`; the directory passes 3 items and attendance passes 3. At `lg` and above there is a permanent empty fourth cell in the most prominent position on the admin landing screen.

**UI-3 · The primary action on the landing screen is labelled "NEW"** — *Low*
All-caps `NEW` (`EmployeeDirectory.tsx:83`, `TimeOffPage.tsx:118`) is transcribed literally from the wireframe, and sits beside sentence-case buttons ("Approve", "Discard", "Save", "Done"). It also fails to say what it creates — "New employee" / "Request time off" would carry the same width budget.

## 2.2 Typography

`IBM Plex Sans` + `IBM Plex Mono` is a **good, considered choice** for this product — it is a genuine enterprise/technical pairing, and using the mono face for Login IDs, employee codes, currency and timestamps is exactly right.

**UI-4 · No 16px body tier exists** — *High*
`:root` sets `line-height: 1.45` but never a base size, so body copy inherits the browser's 16px only where no utility class applies — and `text-sm` (14px) is applied to essentially everything. Table cells, form inputs, profile field values and card text are all 14px.

> DB rule — *Typography / Font Size Scale, severity Medium*: "Do: Use consistent modular scale (12 14 16 18 24 32)." Priority-6 anti-pattern: "text < 12px body."

**UI-5 · 10px text is used for meaningful content** — *Medium*
`text-[10px]` appears 4 times, all carrying real information: workflow trail chips (`TimeOffPage.tsx:350`), audit entity IDs (`AuditLogPage.tsx:88`), the notification unread count (`NotificationBell.tsx:41`), and the check-in error (`CheckInWidget.tsx:61`). At 10px these fall below the legibility floor, and the workflow chips are the *primary* representation of a differentiator feature.

**UI-6 · `line-height: 1.45` is below the recommended 1.5** — *Low*
Set once on `:root` (`index.css:24`). Minor on its own; compounds with 14px-everywhere in the dense tables.

**UI-7 · Uppercase micro-labels at 12px with tracking** — *Low*
`Field`'s `<dt>` and `StatStrip`'s label both use `text-xs font-medium uppercase tracking-wide`. Uppercase costs legibility at small sizes; used across ~30 profile fields it makes the Info tab harder to skim than sentence case would.

## 2.3 Spacing

Broadly consistent: `py-2` (×80) and `px-3` (×76) dominate, giving tables and inputs a coherent rhythm.

**UI-8 · Container padding has no rule** — *Medium*
Card and panel padding ranges across `p-2`, `p-3` (×13), `p-4` (×11), `p-5`, `p-6`, `p-8` with no evident logic — directory cards `p-4`, profile panel `p-5`, 360° sections `p-4`, health hero `p-6`, login card `p-8`, modal body `px-5 py-4`. Four different container paddings are visible on a single admin session.

**UI-9 · No spacing scale is defined as tokens** — *Low*
`index.css` defines 18 colour custom properties and zero spacing/radius/type tokens, so every spacing decision is an ad-hoc utility. This is the mechanism behind UI-8 and UI-10.

## 2.4 Colors

**This is the strongest part of the UI.** I computed WCAG contrast for all 18 meaningful token pairings:

| Pair | Used for | Ratio | AA |
|---|---|---|---|
| `--ink` / `--surface` | body text | **15.78** | ✅ |
| `--ink` / `--bg` | body on canvas | **14.44** | ✅ |
| `--muted` / `--surface` | secondary text, table headers | **5.47** | ✅ |
| `--muted` / `--bg` | muted on canvas | **5.00** | ✅ |
| `--accent` / `--surface` | links, active tab | **5.47** | ✅ |
| white / `--accent` | primary button label | **5.47** | ✅ |
| white / `--accent-hover` | primary button hover | **7.50** | ✅ |
| `--accent` / `--accent-soft` | LEAVE badge, workflow chips | **4.84** | ✅ |
| `--warning` / `--warning-soft` | PENDING, HALF_DAY | **5.20** | ✅ |
| `--success` / `--success-soft` | APPROVED, PRESENT | **5.40** | ✅ |
| `--danger` / `--danger-soft` | REJECTED, ABSENT | **6.05** | ✅ |
| `--danger` / `--surface` | inline form errors | **6.57** | ✅ |
| `--nav-text` / `--nav` | active nav link | **14.00** | ✅ |
| `--nav-muted` / `--nav` | inactive nav links | **6.96** | ✅ |
| `--muted` / `--surface` @10px | timestamps, entity IDs | 5.47 | ✅ |
| red-300 / `--nav` | check-in widget error | 8.62 | ✅ |
| **`--line` / `--surface`** | **input & control borders** | **1.35** | ❌ |

Sixteen of seventeen pass, most with real headroom. Someone chose these deliberately — the teal/navy/amber system is coherent, semantically consistent, and the `*-soft` background pairings are a proper token structure rather than arbitrary Tailwind picks. **Do not regress this in any restyle.**

**UI-10 · `--line` at 1.35:1 fails non-text contrast for control boundaries** — *High*
`#d8dee6` on white is the border of every text input, select, date picker and secondary button. WCAG 1.4.11 requires **3:1** for the visual boundary of a user-interface component. As a decorative table rule or card edge it is fine; as the only thing delineating an input from the page, it is not. A darker `--line-strong` for controls (keeping `--line` for dividers) resolves it without touching the aesthetic.

**UI-11 · Raw Tailwind colours bypass the token system** — *Low*
`text-red-300` (`CheckInWidget.tsx:61`), `bg-white/5`, `border-white/10`, `bg-black/40`, and `bg-white` written literally ~20 times instead of `var(--surface)`. Small, but it is the seam where the token system starts leaking.

**UI-12 · No dark mode, and no `prefers-color-scheme` handling** — *Low*
Reasonable to omit for an internal tool on a 12-hour budget; noting it because the nav is already dark and half the palette work is done. Not a defect.

## 2.5 Buttons

`Button.tsx` is a proper variant component (`primary` / `secondary` / `danger` / `ghost`) with consistent padding, radius, disabled opacity and a `transition`. Good foundation.

**UI-13 · Buttons show the arrow cursor, not the pointer** — *High*
Tailwind **v4** changed Preflight so `button` no longer receives `cursor: pointer` — it inherits `cursor: default`. The codebase contains **zero** occurrences of `cursor-pointer`. Every button, tab, dropdown item and icon control in the app therefore shows an arrow on hover, which reads as "not clickable" and is one of the most immediate perceived-quality tells.

> Pre-delivery checklist (skill, Priority 4): "`cursor-pointer` on all clickable elements."

**UI-14 · Three form controls remove their focus outline and replace it with a colour change only** — *Critical*
`Login.tsx:43`, `Login.tsx:54`, `EmployeeDirectory.tsx:94` all carry `outline-none focus:border-[var(--accent)]`. The replacement is a 1px border **colour** shift on a border that already fails contrast (UI-10). There is no ring, no offset, no width change. This is the canonical Priority-1 anti-pattern.

> DB rule — *Interaction / Focus States, severity **High***: "Do: Use a visible focus ring on every interactive control. Don't: Remove focus outline without replacement. Good: `focus:ring-2 focus:ring-blue-500`. **Bad: `outline-none` without alternative.**"
> Stack rule (`html-tailwind` 4.3), *Forms / Focus states, severity High*: "Bad: `focus:outline-none` (no replacement)." And *Accessibility / Focus visible*: "Do: `focus-visible:ring-2`."

**UI-15 · The app defines no focus style at all** — *Critical*
Beyond those three inputs there are **zero** `focus:` or `focus-visible:` utilities in the entire codebase. Buttons, `NavLink`s, tabs, table links, dropdown items and the modal close button rely entirely on the browser default outline — which varies by engine and is close to invisible against the dark navy nav. A keyboard user cannot reliably tell where they are anywhere in the product.

> DB rule — *Accessibility / Keyboard Navigation, severity **High***: "Web users need complete keyboard navigation with visible focus on **every operable control**."

**UI-16 · Sub-24px touch targets in the approval table** — *Medium*
The inline Approve/Reject buttons are overridden to `!px-2 !py-1 text-xs` (`TimeOffPage.tsx:188`, `:202`), yielding roughly 20px of height, stacked with `gap-1` (4px). The month-navigation arrows (`AttendancePage.tsx:70-85`) are `px-2 py-1` — about 24×22px.

> DB rule — *Accessibility / Target Size (Minimum), WCAG 2.2 AA, severity **High***: "Use at least 24 by 24 CSS px… Bad: tiny adjacent icon buttons."
> DB rule — *Touch / Touch Spacing, severity Medium*: "Minimum 8px gap between touch targets. Bad: `gap-0` or `gap-1`."

**UI-17 · `!important` overrides on a variant component** — *Low*
`className="!px-2 !py-1 text-xs"` forces a size the component does not offer. The need for a `size` prop is being met with specificity escalation.

## 2.6 Forms (visual)

Covered functionally in §1.4. Visually:

**UI-18 · Inputs are styled inline, five different ways** — *Medium*
There is no `Input`, `Select`, `Textarea` or `Field` primitive. The same control is hand-written with different classes per screen: Login inputs get `px-3 py-2 outline-none focus:border-…` but no `text-sm`; the directory search adds `text-sm` and `bg-white`; modal inputs add `text-sm` but drop the focus style; the leave modal's inputs drop `text-sm` entirely; the approval comment input is `w-40 … px-2 py-1 text-xs`. Font size, focus behaviour and padding all differ.

**UI-19 · No disabled, readonly, or error field styling exists** — *Medium*
The profile edit mode simply swaps a `<dd>` for a bare bordered `<input>` with a different border radius (`rounded` vs the `rounded-md` used everywhere else) and no visual connection to the field label above it.

## 2.7 Tables

Correctly wrapped in `overflow-x-auto` containers — the DB rule for mobile table handling is satisfied.

**UI-20 · No sort, filter, bulk-select, or column control on any table** — *Medium*
Four data tables, none sortable. The audit log has a single entity-type `<select>`; the backend supports actor and date-range filters the UI never exposes (functional P3-5). The admin leave queue has no status filter at all, so actionable PENDING rows sit interleaved with historical ones (functional P2-14).

> DB rule — *Data Entry / Bulk Actions, severity Low*: "Do: Allow multi-select and bulk edit. Bad: Repeated actions per row." An HR approval queue is the textbook case for this.

**UI-21 · A form is embedded in a table cell** — *Medium*
The admin leave table's last column contains a 160px text input stacked over two buttons, inside a `<td>`, for every pending row (`TimeOffPage.tsx:186-216`). It breaks row rhythm, forces `align-top` on the whole table, and is what pushes an 8-column table into horizontal scroll on a standard laptop. A row-click drawer or review modal is the conventional pattern.

**UI-22 · Tables lack semantic scaffolding** — *Medium*
No `<caption>`, no `scope="col"` on any `<th>`, no `aria-sort`. `AuditLogPage.tsx:70` has an empty `<th />` for the expander column. The expand control (`:91`) is a bare button toggling text between "Diff" and "Hide" with no `aria-expanded` and no `aria-controls`.

**UI-23 · Times render with seconds in dense cells** — *Low*
`toLocaleTimeString()` with no options yields "10:15:32 AM" in every check-in/check-out cell. Seconds are noise in an attendance table and cost roughly 25% of the column width.

## 2.8 Cards

**UI-24 · Employee cards show initials, never photographs** — *Medium* (= functional P3-10)
`profilePictureUrl` exists in the schema, the DTO and the self-edit allowlist, but no `<img>` is rendered anywhere in the app. The wireframe's directory is explicitly photo-first ("Each card should display the employee's profile picture"). A grid of 8 identical teal initial-circles is the most visible gap between the wireframe and the build.

**UI-25 · The card status dot cannot express the states the wireframe defines** — *High*
The wireframe specifies three indicators: 🟢 present · ✈️ on leave · 🟡 absent-without-leave. `AttendanceDot` renders only green (checked in) or red (not). "On leave", "absent", and "worked and went home" are therefore indistinguishable — and the most common end-of-day state for a present employee is a **red** dot, which reads as absent. The only affordance is a `title` tooltip (hover-only; unavailable on touch).

Colour is also the *sole* carrier of meaning here, with no shape, icon or text alternative.

**UI-26 · Card hover changes border colour only** — *Low*
`hover:border-[var(--accent)]` with no elevation, background or transform change, and combined with UI-13 (no pointer cursor) the cards do not read as clickable.

## 2.9 Navigation (visual)

**UI-27 · The avatar "dropdown" has no dropdown affordance** — *Low*
The wireframe shows `Avatar⌄` with an explicit chevron. The implementation renders avatar + name with no caret (`AppShell.tsx:60-68`), so the menu is undiscoverable — and on mobile the name is hidden too, leaving a bare circle.

**UI-28 · The logo is placeholder branding** — *Low*
A teal rounded square containing the text "Df", duplicated in `AppShell.tsx:26` and `Login.tsx:33`. There is an unused `public/icons.svg` and a `favicon.svg` in the repo.

## 2.10 Consistency

**UI-29 · Radius and elevation are unsystematised** — *Medium*
`rounded-md` ×27, `rounded-lg` ×18, `rounded-xl` ×1, `rounded` (bare) ×several, `rounded-full` ×5, with no rule about which surface gets which. Elevation: `shadow-[var(--shadow)]` ×6 (tokenised, good) alongside raw `shadow-lg` ×1 and `shadow-xl` ×2 — the modal and the two dropdowns each pick a different unrelated depth.

**UI-30 · Five different empty-state renderings** — *Medium*
The `EmptyState` component, an inline `<td colSpan>`, the notification panel's bespoke `<li>`, a bare `<ul>`, and a plain `<p>` ("No salary structure configured"). See §1.7.

**UI-31 · Unicode glyphs stand in for an icon system** — *High*
`🔔` (`NotificationBell.tsx:38`), `✕` (`Modal.tsx:32`), `←` / `→` (`AttendancePage.tsx:73,83`), `→` in workflow chips and the 360° link. Emoji render differently on every OS, cannot be colour-controlled, do not scale with the type system, and the bell in particular is a full-colour glyph inside an otherwise flat monochrome nav.

> Priority-4 anti-pattern (skill): "**Emoji as icons**." Pre-delivery checklist: "No emojis as icons (use SVG: Heroicons/Lucide)."
> DB rule — *icon-context-accessibility*: "if decorative beside visible text, set `aria-hidden="true"`; if meaningful without equivalent visible text, provide a text alternative; if inside an interactive control, give the control an accessible name."

`public/icons.svg` — an SVG sprite — exists in the repo and is imported nowhere.

---

# Part 3 — Product quality

## 3.1 Responsive design

The viewport meta tag is present and correct (`index.html:6`), and tables are properly wrapped for overflow. Beyond that the app is desktop-only.

**PQ-1 · Below 768px the product loses its navigation** — *Critical* — see UX-5.

**PQ-2 · The admin leave table is unusable on a phone** — *High*
Eight columns plus an embedded form (UI-21) inside a horizontally scrolling container. The Approve/Reject buttons — the reason the screen exists — sit in the last column, off-screen by default, at ~20px tall (UI-16), reachable only by horizontal scroll.

**PQ-3 · The modal is not sized for small screens** — *Medium*
`Modal.tsx:20` — `fixed inset-0 … p-4 pt-16` with `max-w-lg`. The 64px top offset plus a two-column field grid inside the Add Employee form leaves the Submit/Discard row below the fold on a 375×667 viewport, with no sticky footer.

**PQ-4 · No breakpoints between `sm` and `lg` on primary layouts** — *Low*
The directory grid goes `1 → sm:2 → lg:3`; the 360° page is `1 → lg:2`. Tablet-width (768–1023px) sessions get either a very wide two-column grid or a single stretched column.

## 3.2 Accessibility

The colour foundation is genuinely strong (§2.4). Almost everything else in this category is unaddressed.

| Check | Status |
|---|---|
| Text contrast 4.5:1 | ✅ 16/17 pairs pass |
| Non-text contrast 3:1 (control borders) | ❌ UI-10 (1.35:1) |
| Visible focus on every control | ❌ **UI-15** — none defined |
| Focus outline not removed | ❌ **UI-14** — removed on 3 inputs |
| Keyboard operability | ⚠️ dropdowns and modal are mouse-oriented |
| Focus trap in modal | ❌ PQ-5 |
| Escape closes overlays | ❌ UX-6, PQ-5 |
| Form labels | ❌ UX-11 — placeholder-only on 2 forms + 3 inputs |
| Errors announced (`role="alert"` / `aria-live`) | ❌ PQ-6 |
| Icon controls have accessible names | ⚠️ partial |
| Target size ≥24px | ❌ UI-16 |
| Heading hierarchy | ✅ clean h1 → h2, no skips |
| `lang` attribute | ✅ `<html lang="en">` |
| Table semantics | ❌ UI-22 |
| Reduced motion | ⚠️ PQ-7 |

**PQ-5 · The modal is not an accessible dialog** — *High*
`Modal.tsx` has no `role="dialog"`, no `aria-modal="true"`, no `aria-labelledby` pointing at its `<h2>`, no focus trap, no focus restoration on close, no Escape handler, and no backdrop click-to-dismiss. Keyboard focus tabs straight out of the dialog into the page behind it while the overlay is still up, and on close returns to the top of the document.

**PQ-6 · No error is announced to assistive technology** — *High*
Every error surface in the app — the login error panel, the form error lines, `ErrorState`, the check-in widget error — is a plain styled `<p>` or `<span>` inserted into the DOM. None has `role="alert"`, `aria-live`, or `aria-describedby` linking it to a field.

> DB rule — *Accessibility / Error Messages, severity **High***: "Error messages must be announced. Do: Use `aria-live` or `role=alert`. **Don't: Visual-only error indication.**"
> DB rule — *Forms / Focusable Error Summary, severity High*: "Place it at the top of the form; move focus to its heading after failed submit; link each item to its invalid field."

**PQ-7 · No `prefers-reduced-motion` handling** — *Low*
Zero occurrences. Currently low-impact because the app has almost no motion (PQ-9) — the single `animate-pulse` skeleton is the only continuous animation, and it does run indefinitely for users who have requested reduced motion.

**PQ-8 · Partial accessible naming on icon controls** — *Medium*
`aria-label` is present on the bell (`NotificationBell.tsx:39`) and the modal close (`Modal.tsx:31`) — good. Missing on: the avatar menu trigger, both month-navigation arrows, and the audit "Diff" expander. The bell's label also omits the unread count, so screen-reader users hear "Notifications" whether there are 0 or 12, and the count badge has no `aria-live`.

## 3.3 Mobile UX

Rated **F** — not because of polish, but because the primary tasks cannot be completed. No navigation (PQ-1), the approval queue is off-screen (PQ-2), the modal's submit is below the fold (PQ-3), touch targets are undersized (UI-16), and the only affordances for two status systems are hover tooltips (UI-25, UX-19) which do not exist on touch.

**PQ-9 · Hover-only information on touch devices** — *Medium*
`title` attributes carry the *only* full text for: the attendance dot's meaning, the truncated check-in error, and (via `AttendanceDot`) the card status. Touch users get none of it.

## 3.4 Interaction design

**PQ-10 · Almost nothing moves** — *Medium*
5 `transition` declarations and 1 `animate-` in the entire codebase. Tab switches, modal open/close, dropdown open/close, badge updates and row state changes are all instant 0ms swaps.

> Priority-2 anti-pattern (skill): "Instant state changes (0ms)."
> DB rule — *Style / Minimalism & Swiss*, key effects: "Subtle hover (200-250ms), smooth transitions… clear type hierarchy."

**PQ-11 · No optimistic updates on any mutation** — *Medium*
Every write waits for the round trip, then invalidates and refetches. Check-in, mark-as-read and leave approval all show a brief nothing-happening window. TanStack Query's `onMutate` is available and unused; mark-as-read in particular is the archetypal optimistic update.

**PQ-12 · Profile tab state is neither persistent nor linkable** — *Low*
Local `useState` (`EmployeeProfile.tsx:23`), so a refresh drops you back to Info and "look at this employee's salary tab" cannot be sent as a URL.

## 3.5 Perceived performance

**PQ-13 · Google Fonts loaded via CSS `@import`** — *Medium*
`index.css:1` — `@import url('https://fonts.googleapis.com/…')` as the first line. A CSS `@import` is discovered only after the stylesheet is parsed, serialising the font request behind CSS download and blocking first paint. There is no `<link rel="preconnect">` to `fonts.gstatic.com` in `index.html`. The URL does correctly include `&display=swap`, which avoids invisible text — that part is right.

> DB rule — *Performance / Font Loading, severity Medium* and *Performance / Render Blocking, severity Medium*: "Do: Inline critical CSS, defer non-critical. Don't: Large blocking CSS files."

**PQ-14 · Search fires a request per keystroke** — *Medium*
`queryKey: ['employees', search]` (`EmployeeDirectory.tsx:35`) and `['attendance-admin', date, search]` (`AttendancePage.tsx:222`) with no debounce. Typing "Rahul" issues five requests and flashes the list five times.

**PQ-15 · No prefetch on any navigation** — *Low*
Hovering an employee card could `prefetchQuery` the profile; the tab bar could prefetch the salary structure. Neither happens, so every navigation starts from a cold skeleton.

**PQ-16 · Payload waste** — *Low*
`/attendance/:id/timeline` returns 120 event records the UI never renders (functional P3-4); the directory requests `pageSize: 50` and discards the pagination envelope.

---

# Part 4 — Where it feels wrong

The user asked specifically for this. These are judgement calls, flagged as such.

## 4.1 Inconsistent

- **Five ways to say "nothing here"** (§1.7) and **five ways to style a text input** (UI-18) — both symptoms of building screen-by-screen without extracting primitives after the second repetition.
- Nav labels shortened for two of five admin items (UX-2).
- `shadow-[var(--shadow)]` used six times beside raw `shadow-lg` / `shadow-xl` (UI-29): the token system exists and is then bypassed at exactly the three moments (modal, two dropdowns) where consistency is most visible.
- `NEW` in caps beside sentence-case actions (UI-3).
- Profile edit inputs use `rounded` while every other input uses `rounded-md`.

## 4.2 Confusing

- **A pending request whose status trail says "Approved"** (UX-9). This is the one I would fix first on pure comprehension grounds.
- **A red dot on an employee who worked a full day and went home** (UI-25). The most common evening state renders identically to "absent".
- **Two different apps at `/attendance`** with nothing naming which one you are in (UX-1).
- **An "Edit" button on tabs with nothing editable** (functional P3-20) — press it on Private Info and you get a Save/Cancel bar over read-only text.
- **A check-in widget that writes to a record its user cannot open** (UX-4).
- **"No salary structure configured"** appearing when the request actually failed (UX-24).

## 4.3 Outdated

- Emoji and text arrows instead of an icon set — while an unused SVG sprite sits in `public/` (UI-31).
- `window.alert()` as a validation surface (UX-16).
- A full-page `window.location.href` redirect on session expiry (UX-25).
- Static tables with no sort, filter, or bulk action (UI-20) — the 2010 admin-panel baseline.
- No toast layer at all (UX-15). Every modern app of this shape has one; its absence is why so many findings here reduce to "nothing tells the user anything".

## 4.4 Generic / template-like

The strongest signal is **rhythmic sameness**: every single page is `PageHeader` → optional `StatStrip` → bordered white card or table. The approval queue, the employee directory, the audit log and the 360° dashboard are four fundamentally different tasks rendered with one layout. Nothing about the shape of the approval screen says "there are 3 decisions waiting for you"; it looks exactly like a log of past events.

Concrete tells:

- **A 4-column stat grid that only ever receives 3 items** (UI-2) — a layout written for a generic case and never reconciled with its actual content. Permanently visible on the admin landing screen.
- **A skeleton of N identical 40px bars** standing in for card grids, tab forms, tables and dashboards alike (UX-20), with a decorative `opacity: 1 - i * 0.1` ramp that no real content matches.
- **"Df" in a rounded square** as the logo, twice (UI-28).
- **Demo credentials hard-coded into the login form's initial state** (`Login.tsx:11-12`) plus a "Demo accounts" panel listing both passwords. Convenient for a hackathon; it means the form can never render empty, and it is the first thing anyone sees.
- **`text-lg` on an emoji** as the notification icon (UI-31).

## 4.5 Seed data undermines the demo

Worth separating out, because it is cheap to fix and disproportionately affects perceived quality. Every one of the 8 seeded employees has:

| Field | Value — identical for all 8 |
|---|---|
| Phone | `+91 98765 43210` |
| Address | `Bengaluru, Karnataka` |
| Date of birth | `1995-05-15` |
| Gender / marital status | `Other` / `Single` |
| IFSC | `HDFC0001234` |
| "What I love about my job" | `Building great products with great people.` |
| Interests | `Reading, Cricket, Coffee` |
| Skills | `['Communication', 'Problem Solving']` |

Open any two profiles side by side and they are the same person with a different name. The About tab — a wireframe feature built specifically to make profiles feel human — actively demonstrates the opposite. The directory's initials-only avatars (UI-24) compound it into eight interchangeable teal circles.

> DB rule — *Content / Placeholder Content*: "Do: Use realistic sample content. Don't: Lorem ipsum everywhere." The data is not lorem ipsum, but uniform filler produces the same effect.

## 4.6 Unnecessarily complicated

- **A form inside a table cell** (UI-21) where a row-click drawer would be simpler to build *and* to use.
- **`EmployeeProfile` serves two routes via a `self` prop plus a `:id` param**, then casts everything through `Record<string, unknown>` with `String(...)` at ~30 call sites — 323 lines carrying four tabs, an edit mode, a role-gated tab list and a separate salary query.
- **Status shown twice per row** in two columns (UX-10).
- **`!important` overrides** to obtain a button size the variant system does not expose (UI-17).

---

# Part 5 — Prioritised remediation

Sequenced by (user impact × visibility) ÷ effort. Nothing here has been implemented.

### Tier 1 — half a day, disproportionate payoff

1. **UI-15 / UI-14** — add one global focus style (`focus-visible:ring-2 ring-offset-2 ring-[var(--accent)]`) and delete the three `outline-none`. Single highest-value accessibility fix in the audit.
2. **UI-13** — add `cursor-pointer` to `Button` and every clickable element (Tailwind v4 no longer supplies it). One-line change per component; immediately changes how the whole product feels.
3. **UX-14 / UX-18** — render `approve.isError` / `reject.isError` and add `disabled={isPending}`. Unblocks the demo's centrepiece.
4. **UX-9** — label the third workflow step "Pending decision" until resolved.
5. **UI-2** — make `StatStrip` columns content-derived.
6. **§4.5** — vary the seed data. Pure content work, no code, visible on every screen.

### Tier 2 — one to two days

7. **UX-5 / PQ-1** — mobile nav (drawer or bottom bar). Currently the difference between "responsive" and "desktop-only".
8. **UI-31** — replace emoji with the SVG sprite already sitting in `public/icons.svg`.
9. **PQ-5** — make `Modal` a real dialog: `role`, `aria-modal`, `aria-labelledby`, focus trap, Escape, focus restoration.
10. **UX-11** — visible labels on the Add Employee form and both search inputs.
11. **UX-15** — introduce a toast layer; wire success and failure into it.
12. **PQ-6** — `role="alert"` on every error surface.
13. **UI-10** — a `--line-strong` token at ≥3:1 for control borders.
14. **UX-6** — outside-click and Escape on both dropdowns.

### Tier 3 — structural, schedule deliberately

15. **UI-18 / UI-19** — extract `Input` / `Select` / `Field` primitives; this removes UI-18, UI-19 and half of UI-29 at once.
16. **UI-21** — move approve/reject into a review drawer; resolves UX-10, PQ-2 and UI-16 together.
17. **UX-4** — a "My …" section so admins can use the HR system they administer.
18. **UI-25 / UI-24** — three-state status indicator plus real avatars, per the wireframe.
19. **UX-20** — content-shaped skeletons per surface.
20. **UI-1 / UI-4 / UI-5** — establish a real type scale with a 16px body tier and retire `text-[10px]`.
21. **UI-20** — sortable columns and a status filter on the approval queue.

### Explicitly do not change

- The colour token system (§2.4) — 16/17 pairs pass AA; this is the best-engineered part of the UI.
- IBM Plex Sans/Mono, and mono for IDs, codes, currency and timestamps.
- The light, dense, Odoo-adjacent direction — it matches the **Minimalism & Swiss Style** profile the design-system query returns for this product type. The tool's dark "Real-Time Operations" palette is a landing-page pattern and would be wrong here.
- `EmptyState` and `ErrorState` as components — the problem is coverage, not design.
- The role-switched component split behind shared routes — correct per the frontend prompt; it needs labelling (UX-1), not merging.

---

*Audit produced with the UI/UX Pro Max skill (v2.13.0): `--design-system`, `--domain ux`, `--domain icons`, `--stack react`, `--stack html-tailwind`. Contrast ratios computed from `frontend/src/index.css` tokens using the WCAG 2.x relative-luminance formula. One search (`"accessible dropdown menu keyboard" --stack react`) returned no database match and was retried; findings UX-6 and PQ-8 rest on the general `--domain ux` keyboard-navigation and icon-accessibility rules cited inline. No code was modified.*
