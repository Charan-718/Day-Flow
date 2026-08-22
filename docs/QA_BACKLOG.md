# Dayflow — Unified QA Backlog

**Date** 2026-08-22 · **Commit** `6a8c491` · **Status** specification (no code modified)

**Merged from:** `files/01_PRD.md` · `files/02_TRD.md` · `docs/FUNCTIONAL_AUDIT.md` (71 findings) · `docs/UX_AUDIT.md` (73 findings) · `docs/DESIGN_SYSTEM.md` (remediation specs)

**144 raw findings → 82 backlog items.** 62 were duplicates across the two audits (the same defect seen functionally and visually) and are merged, with every source ID preserved in the **←** trace field. A coverage check confirming all 144 IDs are accounted for is in Appendix B.

---

## How this is prioritised

The requested ranking — business impact → user impact → functional correctness → accessibility → UX → visual polish — is applied as a **lexicographic sort**, not a score. An item with real business impact outranks every accessibility item regardless of how severe the latter is; among items with equal business impact, user impact decides; and so on.

| Band | Meaning | Gate |
|---|---|---|
| **P0** | Data loss, security exposure, or a core flow that silently produces a wrong outcome | Ship-blocking |
| **P1** | A PRD/TRD requirement is unmet, or data the business relies on is computed wrongly | Fix before demo/release |
| **P2** | WCAG violation, or a task a user cannot complete on their device | Fix in first hardening pass |
| **P3** | Friction, confusion, or robustness gap — the task completes, badly | Scheduled |
| **P4** | Polish, consistency, tech debt | Backlog |

Two items are **product decisions, not defects** — they cannot be actioned until someone chooses. They are flagged `DECISION` and listed in Appendix A.

### Category legend

`DATA` data integrity · `SEC` security · `FUNC` functional correctness · `A11Y` accessibility · `UX` user experience · `VIS` visual/consistency · `PERF` performance · `DEBT` tech debt

### Index

| Band | Items | IDs |
|---|---|---|
| P0 | 5 | DF-001 … DF-005 |
| P1 | 13 | DF-006 … DF-018 |
| P2 | 19 | DF-019 … DF-037 |
| P3 | 24 | DF-038 … DF-061 |
| P4 | 21 | DF-062 … DF-082 |

---

# P0 — Blocking

### DF-001 · Seed script destroys all live data on every backend restart
`P0` · `DATA` · Backend / Docker deployment · ← P0-3

- **Current:** `docker-entrypoint.sh:12` runs `npx tsx prisma/seed.ts` unconditionally on every container start, and `seed.ts:361-365` executes `deleteMany()` on `attendanceEvent`, `attendanceDaySummary`, `leaveRequest`, `notification` and `auditLog`. With `restart: unless-stopped`, any crash, `docker compose restart`, host reboot or redeploy wipes all attendance history, every leave request, and the entire audit log.
- **Expected:** Restarting a service never destroys production data. PRD §4 makes the audit trail a MUST-HAVE — an append-only table that a routine process truncates is not an audit trail.
- **Fix:** Gate seeding behind an explicit opt-in (`SEED_ON_BOOT=true`, default false) and refuse to run when `NODE_ENV=production`. Make the seed additive (`upsert`, no `deleteMany`) and move destructive reset to a separate `db:reset` script.
- **Validation:** Start the stack, check in, submit and approve a leave request, note the audit row count. `docker compose restart backend`. Audit rows, attendance and leave requests are all still present and counts are unchanged.
- **Status:** ✅ Resolved (`backend/prisma/seed.ts`, `backend/package.json`). Implemented as a data-presence guard rather than the literal `SEED_ON_BOOT`/`NODE_ENV=production` gate proposed above: `docker-compose.yml` sets `NODE_ENV=production` for the demo container, so a blanket production refusal would have broken the documented `docker compose up --build` first-boot seeding (README Quick Start) — a regression the task's "preserve existing functionality" constraint rules out. Instead, `main()` now checks whether `attendanceEvent`/`leaveRequest`/`notification`/`auditLog` already contain rows; if so, it upserts only reference data (departments, leave types, accounts, salaries — already non-destructive) and returns without touching activity data. The destructive fixture path was extracted into `seedDemoActivity()`, reachable only on a genuinely empty database or via the new explicit `npm run db:reset` (`tsx prisma/seed.ts --reset`). Validated end-to-end: real check-in + leave submit + approve via the running API, then re-ran `prisma:seed` (the exact command the entrypoint runs on every boot) — attendance/leave/notification/audit counts and the approved request were byte-identical before and after. A wipe-to-empty run confirmed the fresh-boot path still produces the full original demo dataset (8 users, 67 attendance events, 3 leave requests, 1 notification, 2 audit logs), and `db:reset` still force-reseeds on demand. `tsc --noEmit` and `npm run build` pass.

### DF-002 · Leave approve/reject fails with no feedback of any kind
`P0` · `FUNC` `UX` · Time Off (admin queue) · ← P0-1, UX-14, P2-13, UX-18

- **Current:** `TimeOffPage.tsx:78-98` — `approve.isError` and `reject.isError` are never rendered and neither mutation defines `onError`. `LEAVE_INVALID_STATE` (409), `LEAVE_INSUFFICIENT_BALANCE` (400), 404s, 500s and network failures all leave the row unchanged with no message. Neither button sets `disabled={isPending}`, so a double-click fires two requests and the second 409s invisibly.
- **Expected:** Every mutation resolves visibly. TRD §5 defines a stable `{ success:false, message, code }` envelope specifically so the client can surface it. An admin must never believe a leave request was approved when it was not.
- **Fix:** Per DESIGN_SYSTEM §18.3, add the toast provider and wire both mutations: success → `"Leave approved for {name}"`; failure → persistent error toast carrying the server `message`, mapped through the §21.4 code table. Add `loading` state to both buttons (§11.3) with locked width and `aria-busy`.
- **Validation:** Open the queue in two sessions. Approve a request in session A; in session B click Approve on the same row → a persistent error toast reads "This request was already reviewed by someone else" and the row refreshes to APPROVED. Double-clicking Approve issues exactly one request.

### DF-003 · Approved leave never reaches the employee without a manual reload
`P0` · `FUNC` `UX` · Time Off (employee) · ← P0-2, P3-34

- **Current:** `App.tsx:17` disables `refetchOnWindowFocus` globally and the only polling query in the app is the notification bell (30 s). After an admin approves, the employee's bell increments within 30 s but the Time Off table shows `PENDING` indefinitely and the balance strip stays stale.
- **Expected:** PRD §7.6 — *"Status changes reflect immediately in the employee's view."* PRD §9 AC#3 — *"employee sees the update without a page reload delay beyond a refetch."*
- **Fix:** Invalidate `['leave-requests']` and `['leave-balance']` when a notification of type `LEAVE_APPROVED`/`LEAVE_REJECTED` arrives, and add a `refetchInterval` to `['leave-requests']` as a floor. Websockets are not required — TRD §1 lists Socket.IO as optional.
- **Validation:** Split-screen employee and admin. Admin approves. Within one refetch cycle and with no user action, the employee's row flips to APPROVED and the balance decrements.

### DF-004 · Provisioned accounts are trivially impersonable
`P0` · `SEC` · Auth / employee provisioning · ← P1-1, P1-2, P1-12, P3-1

Four defects that only matter together, so they are fixed together.

- **Current:** (a) `auth.service.ts:99` defaults every temp password to `` `Welcome@${year}` `` and the Add Employee form never sends an override, so **every employee provisioned through the UI shares the password `Welcome@2026`**. (b) `auth.service.ts:55-64` silently promotes `PENDING_ACTIVATION` → `ACTIVE` on first successful login, so the state gates nothing. (c) There is no change-password endpoint or screen anywhere, so the generated password is permanent. (d) `POST /api/auth/verify-email` — the endpoint whose job this is — has no caller.
- **Expected:** Wireframe note: *"There password should be auto generated for the first time by the system… They can login and change the system generated password."* TRD §5.1 specifies `verify-email` as token-authenticated. Knowing a colleague's work email must not be sufficient to authenticate as them.
- **Fix:** Generate the temp password from `crypto.randomBytes` (≥12 chars), returned once to the admin as it already is. Require activation before the account is usable, or force a password change on first login. Add `PATCH /api/auth/password` plus a change-password screen. Add a token to `verify-email`.
- **Validation:** Two employees created via the UI receive different passwords. A `PENDING_ACTIVATION` account either cannot log in or is forced through a password change before reaching any other route. `verify-email` rejects a request with no valid token.

### DF-005 · Offboarded employees retain full system access
`P0` · `SEC` · Auth / employee lifecycle · ← P2-16

- **Current:** `login()` rejects `SUSPENDED` accounts, but **no endpoint can ever set that status**. `PATCH /employees/:id` exposes `employmentStatus` — a different, free-text `Employee` field with no effect on authentication. A terminated employee keeps login, check-in, leave-request and own-salary access indefinitely. Separately, `employmentStatus: 'INACTIVE'` employees are excluded from `headcount` (`dashboard.service.ts:12`) but still appear in the directory and admin attendance view, which apply no filter.
- **Expected:** HR must be able to revoke access at offboarding. Headcount, directory and attendance must agree on who is active.
- **Fix:** Add an admin action that sets `User.status = SUSPENDED` transactionally with an audit row. Filter `listEmployees` and `getAdminDayView` on employment status by default, with an "Include inactive" toggle. Render `SUSPENDED` with the §1.4 account badge.
- **Validation:** Suspend an employee → their existing JWT is rejected on next request and re-login returns `ACCOUNT_SUSPENDED`. They disappear from the default directory and today's attendance, and headcount matches the directory count.

---

# P1 — Critical

### DF-006 · `daysRequested` is client-supplied and never reconciled with the date range
`P1` · `DATA` `SEC` · Leave service · ← P1-4

- **Current:** `leave.service.ts:78` — `const daysRequested = input.daysRequested ?? daysBetweenInclusive(startDate, endDate);`. The zod schema accepts any positive number and the service trusts it. A raw call with `2026-09-01 → 2026-09-30, daysRequested: 0.5` is accepted: the employee is absent a month, blocks the range against future overlap checks, and consumes half a day of balance. The approval path re-validates state and balance but not this relationship, so the bad value commits to `LeaveBalance.usedDays`.
- **Expected:** PRD §8 — *"never trust a client-supplied [value]."* Days requested must be consistent with the requested range.
- **Fix:** Derive server-side, or reject when `daysRequested > daysBetweenInclusive(start, end)`. Keep the field editable client-side only for sub-day requests, bounded by the range.
- **Validation:** `POST /api/leave/requests` with a 30-day range and `daysRequested: 0.5` returns 400. The UI's computed value still submits successfully.

### DF-007 · A second same-day check-in erases the first session's hours
`P1` · `DATA` · Attendance · ← P1-3

- **Current:** `attendance.service.ts:104-110` — the check-in upsert sets `update: { checkIn: now, checkOut: null, workedMinutes: null }`, and the later check-out computes `workedMinutes` only from the most recent `CHECK_IN`. In 09:00 / out 13:00 / in 14:00 / out 18:00 records as `checkIn 14:00, checkOut 18:00, workedMinutes 240` → **HALF_DAY**, against 8 hours actually worked. `isException` is recomputed from the second check-in, laundering a genuine late arrival.
- **Expected:** TRD §3 — the summary is a derived cache rebuilt from events. The `AttendanceEvent` log is correct; the derivation is not. TRD notes attendance is the basis for payable days, so this propagates to payroll.
- **Fix:** Recompute the summary from **all** closed event pairs for the day: earliest `CHECK_IN` as `checkIn`, latest `CHECK_OUT` as `checkOut`, `workedMinutes` as the sum of all pairs. Evaluate lateness against the first check-in only.
- **Validation:** Four events (in/out/in/out) across a day produce `workedMinutes = 480` and status `PRESENT`, with `checkIn` showing the morning time.

### DF-008 · Weekends are deducted from leave balances
`P1` · `FUNC` · Leave service · ← P1-5

- **Current:** `daysBetweenInclusive` counts calendar days and the approval loop (`leave.service.ts:317-337`) marks every calendar day as `LEAVE`. A Friday→Monday request consumes **4 days** of a 24-day allocation instead of 2, and paints two weekend rows as LEAVE which then enter the health-score denominator and the 360° leave count.
- **Expected:** Employees lose real entitlement to this. The codebase already defines working days correctly — `countWeekdays()` (`attendance.service.ts:249`) excludes weekends for the monthly total, so the two halves of the attendance model disagree.
- **Fix:** Compute requested and deducted days with `countWeekdays`, and skip non-working days in the LEAVE-marking loop. Surface the working-day count in the request modal so the employee sees what will be deducted before submitting.
- **Validation:** A Fri→Mon request shows "2 days" in the modal, deducts 2 on approval, and creates LEAVE summaries only for Friday and Monday.

### DF-009 · No salary editing UI, and the wireframe's calculation model is unimplemented
`P1` · `FUNC` · Payroll / Salary Info tab · ← P1-9

- **Current:** `PUT /api/employees/:id/salary` is fully built, transactional and audited — and nothing in the frontend calls it. The backend also diverges from the wireframe's explicit spec: Basic is `FIXED` rather than a % of wage; Fixed Allowance is never derived as `wage − Σ(others)`; the total is never validated against the wage; and the "Basic" component is located by `c.name.toLowerCase().includes('basic')` (`payroll.service.ts:87`), so renaming it to "Base Pay" silently zeroes every percentage-derived amount.
- **Expected:** PRD §7.7 — *"Admin: view all, update salary structure."* Wireframe: *"Salary component values should auto-update when the wage amount changes. The total of all components should not exceed the defined Wage."*
- **Fix:** Build the editor on the existing endpoint. Model the wage as the driver: Basic as % of wage, dependants as % of Basic, Fixed Allowance as the remainder, with a live total and a hard block when components exceed the wage. Reference the Basic component by a stable `role` field, not a name substring.
- **Validation:** Changing the monthly wage recomputes every dependent component live. Submitting components summing above the wage is rejected with a visible message. Renaming "Basic Salary" does not change any computed amount.

### DF-010 · Workforce Health Score rises as attendance collapses
`P1` · `FUNC` · Workforce Health · ← P1-7

- **Current:** `dashboard.service.ts:70-77` — `attendanceHealth = presentish / attendanceRows.length`. The denominator is *rows that exist*, and an absent employee creates no row, so absences are excluded from both numerator and denominator. The 40%-weighted term therefore approaches 1 as attendance worsens. With the seeded data (5 of 8 employees have rows) it reads near-perfect.
- **Expected:** PRD §10.5 requires a deterministic, explainable score, and the frontend shows the formula because *the transparency is the feature*. A published formula whose largest term is inverted is worse than omitting the screen.
- **Fix:** Denominator = active headcount × working days in the window. Treat a missing row for a working day as an absence.
- **Validation:** With 8 employees over a 30-day window, removing a week of attendance rows **lowers** the score. A day when nobody checks in moves the attendance term toward 0.

### DF-011 · Employee 360° "Recent activity" can never show attendance
`P1` · `FUNC` · Employee 360° · ← P1-6

- **Current:** `employees.service.ts:335` filters `{ entityType: 'AttendanceEvent', entityId: id }` where `id` is the **Employee** id, but attendance audit rows are written with `entityId: event.id` (the `AttendanceEvent` UUID). The predicate matches zero rows, always, silently.
- **Expected:** PRD §10.3 calls this the strongest admin screen and Execution Plan §3.9 makes it a demo step. Check-in history is permanently absent with no indication anything is missing.
- **Fix:** Either write attendance audits with `entityId: employeeId` (consistent with `SalaryStructure`, which already does this and works), or join through the event table. Prefer the former for consistency.
- **Validation:** Check in as an employee, open their 360° → the check-in appears in Recent activity with actor and timestamp.

### DF-012 · Seeded salary data contradicts what the UI displays
`P1` · `DATA` · Seed / Salary Info tab · ← P1-10

- **Current:** `seed.ts:96-99` computes `monthlyWage` as the sum of a *subset* of components (excluding employer PF and professional tax). For Rahul (`basic: 45000`) this gives `monthlyWage = 80,500` while the API's `computedTotal` (all components) is `86,100`, and Basic is 56% of the stated wage. The Salary tab renders "Monthly wage ₹80,500" above a table summing to ₹86,100 — components exceeding the wage, which the wireframe explicitly forbids.
- **Expected:** Seed data should demonstrate the model correctly. This is the first screen opened after the admin-only-tab talking point.
- **Fix:** Seed wage-first: set `monthlyWage`, derive Basic as 50% of wage, HRA as 50% of Basic, and Fixed Allowance as the remainder, matching the wireframe's worked example (wage ₹50,000 → Basic ₹25,000 → HRA ₹12,500).
- **Validation:** For every seeded employee, the sum of earning components equals `monthlyWage` exactly, and `yearlyWage = monthlyWage × 12`.

### DF-013 · Employees cannot see their own salary — `DECISION`
`P1` · `FUNC` · Profile / Salary Info tab · ← P1-8

- **Current:** The API permits self-access and returns `readOnly: true`, but `employees.service.ts:172` sets `canViewSalary: isAdmin` and `EmployeeProfile.tsx:34,49` gate both the tab and the query on `HR_ADMIN`. No employee can view their own pay.
- **Expected:** **Unresolved conflict between sources.** PRD §7.3/§7.7 says employees view their own salary read-only. The Excalidraw annotation says *"Salary Info tab Should only be visible to Admin."* `03_FRONTEND_PROMPT.md` §4 says admin-only, *"full stop."* The backend implements the PRD reading; the frontend implements the wireframe's.
- **Fix:** **Requires a product answer before any code changes** (Appendix A). If employees may see their own pay: set `canViewSalary = isAdmin || isSelf` and render the tab read-only. If not: remove the self-branch from `payroll.service.getSalary` so the dead code does not imply a capability that is denied.
- **Validation:** Whichever is chosen, API and UI agree, and the other path returns 403 with no salary in the payload.

### DF-014 · HR admins cannot use the HR system they administer
`P1` · `FUNC` `UX` · Attendance, Time Off, navigation · ← P1-11, UX-4

- **Current:** `AttendancePage.tsx:25-27` routes admins unconditionally to the org-wide view, and `TimeOffPage.tsx:118` hides the NEW button for admins. Priya has an `Employee` row, a salary structure, leave balances and the check-in widget in her nav — but she can never see her own attendance record, never see her own balances, and never file a leave request. Her check-ins write to a record she cannot read.
- **Expected:** PRD §6 defines `HR_ADMIN` as one merged role held by a real employee. In a single-admin organisation, HR staff are currently locked out of HR self-service.
- **Fix:** Add the "My" group to the avatar menu per DESIGN_SYSTEM §17.3 — My profile · My attendance · My time off — routing admins to the employee variants of screens they already have endpoints for.
- **Validation:** Logged in as Priya: her own attendance month renders, her balances render, and she can submit a leave request that appears in the admin queue.

### DF-015 · No file uploads anywhere in the product
`P1` · `FUNC` · Leave requests, profile, documents · ← P3-12, P3-13, P3-6

- **Current:** Sick-leave certificates, resumes and profile pictures are all URL text inputs. There is no multipart middleware and no storage. `EmployeeDocument` is modelled and returned by the profile endpoint but has no routes and no UI. Because the attachment input carries `required` + `type="url"`, the browser blocks submission before the server's `LEAVE_ATTACHMENT_REQUIRED` rule can ever fire — the exact validation Execution Plan §3.4 asks to demonstrate.
- **Expected:** Wireframe: *"Attachment: (For sick leave certificate)"* as a file upload. PRD §7.6 makes it mandatory for Sick Leave.
- **Fix:** Add upload handling (multipart → local volume or S3-compatible), an `EmployeeDocument` route pair, and the drop-zone control from DESIGN_SYSTEM §12.5. Render the Resume field on the profile Info tab.
- **Validation:** A sick-leave request accepts a PDF, stores it, and links it from the admin review drawer. Submitting without one surfaces the server's `LEAVE_ATTACHMENT_REQUIRED` message.

### DF-016 · Admin profile editing exposes 2 of ~20 editable fields
`P1` · `FUNC` · Employee profile · ← (Functional Audit Part 1 Flow 2 / P1-9 context)

- **Current:** `PATCH /api/employees/:id` accepts ~20 admin-editable fields, but the profile Edit mode renders inputs only for `phone` and `address` — identical to what an employee can edit. Department, designation, manager, DOB, gender, nationality and the entire Bank Details block are read-only in practice.
- **Expected:** PRD §7.4 — *"Everything else is Admin-editable only,"* and `03_FRONTEND_PROMPT.md` §4 — *"`HR_ADMIN` can edit everything."*
- **Fix:** Render role-aware editable fields across all tabs using the `Field` primitive (DESIGN_SYSTEM §12), driven by the `editableFields` value the API already returns.
- **Validation:** As admin, edit department, IFSC and date of birth and save; values persist and an audit row records both previous and new values (see DF-050).

### DF-017 · Approve/Reject commit irreversibly on a single click
`P1` · `FUNC` `UX` · Time Off (admin queue) · ← UX-17

- **Current:** Both actions commit immediately with no confirmation and no undo. Rejection is unrecoverable in the data model — `LEAVE_INVALID_STATE` blocks any re-review — so a misclick permanently denies an employee's leave.
- **Expected:** Irreversible actions are confirmed. This sits directly beside a 160px comment input in a dense table (DF-057), which maximises misclick probability.
- **Fix:** Route both through the review drawer (DF-057) and require the confirmation dialog from DESIGN_SYSTEM §18.2 for Reject: `role="alertdialog"`, focus defaults to Cancel, confirm button labelled "Reject".
- **Validation:** Clicking Reject opens a confirmation naming the employee and dates; Escape or Cancel aborts with no state change.

### DF-018 · Neither of the two service behaviours TRD names as judge-probes has a test
`P1` · `DEBT` · Backend test suite · ← P3-35

- **Current:** No tests and no test runner in `backend/package.json`.
- **Expected:** TRD §10 asks specifically for service-level tests on **leave-overlap validation** and **the salary access guard**, on the stated grounds that those are the two things most likely to be probed live.
- **Fix:** Add Vitest plus service-level tests covering: overlap rejection, balance exhaustion, attachment requirement, `daysRequested` reconciliation (DF-006), approve-on-non-pending, and Employee A → Employee B salary returning 403 with no salary key anywhere in the body.
- **Validation:** `npm test` passes; the salary test fails if `assertCanViewSalary` is removed (proving it tests the guard, not the middleware).

---

# P2 — High

### DF-019 · The application defines no focus styling at all
`P2` · `A11Y` · Global · ← UI-14, UI-15

- **Current:** Zero `focus:` or `focus-visible:` utilities exist in the codebase. Three inputs (`Login.tsx:43,54`, `EmployeeDirectory.tsx:94`) actively strip the browser outline with `outline-none` and replace it with a 1px border-**colour** shift on a border that itself fails contrast (DF-022). Every other control — buttons, `NavLink`s, tabs, table links, dropdown items, the modal close — relies on the UA default, which is near-invisible against the dark navy nav.
- **Expected:** WCAG 2.4.7. A keyboard user must always be able to see where they are.
- **Fix:** Apply the DESIGN_SYSTEM §10 focus system: a global `:focus-visible` two-layer ring (2px surface spacer + 4px brand), with `--focus-ring-dark` on the nav and `--focus-ring-danger` on destructive controls. Delete all three `outline-none`.
- **Validation:** Tab through every screen — every stop shows a visible ring at ≥3:1 against its background, including on the dark header. Mouse clicks show no ring.

### DF-020 · Every button shows the arrow cursor
`P2` · `A11Y` `VIS` · Global · ← UI-13

- **Current:** Tailwind **v4** changed Preflight so `<button>` no longer receives `cursor: pointer`, and the codebase contains zero `cursor-pointer`. Every button, tab, dropdown item and icon control shows an arrow on hover, reading as "not clickable".
- **Expected:** Interactive elements indicate interactivity.
- **Fix:** Global rule per DESIGN_SYSTEM §10: `cursor: pointer` on enabled buttons, `[role="button"]` and `a[href]`; `not-allowed` on disabled.
- **Validation:** Hovering any button, tab or menu item shows the hand cursor; disabled controls show `not-allowed`.

### DF-021 · No navigation exists below 768px
`P2` · `UX` `A11Y` · AppShell · ← UX-5, PQ-1, P3-14

- **Current:** `AppShell.tsx:31` — `hidden items-center gap-1 md:flex` with no hamburger, drawer or bottom-bar fallback. Under 768px the header holds a logo, the check-in widget, a bell and an avatar; Employees, Attendance, Time Off, Audit and Health are unreachable except by typing URLs. The elapsed timer and user name are also `hidden … sm:inline`, degrading the header to four unlabeled glyphs.
- **Expected:** Mobile-first. An employee checking in from a phone must be able to reach Time Off.
- **Fix:** DESIGN_SYSTEM §17.2 — `List` icon opening a 280px left drawer with all role-appropriate items at 48px height, focus trapped, closing on select/outside/Escape/swipe. Check-in widget and bell stay in the header at all breakpoints.
- **Validation:** At 375px every nav destination is reachable in two taps; the drawer traps focus and returns it to the trigger on close.

### DF-022 · Control borders fail non-text contrast
`P2` · `A11Y` · All form controls · ← UI-10

- **Current:** `--line: #d8dee6` at **1.35:1** on white is the border of every text input, select, date picker and secondary button.
- **Expected:** WCAG 1.4.11 requires **3:1** for the visual boundary of a user-interface component.
- **Fix:** Introduce `--border-control: #7D8B9A` (**3.48:1** on white, 3.19:1 on canvas — verified in DESIGN_SYSTEM Appendix B) for controls, keeping `#D8DEE6` as `--border-divider` for decorative rules, which are exempt.
- **Validation:** Every input, select and secondary button boundary measures ≥3:1 against both surface and canvas.

### DF-023 · Errors are never announced to assistive technology
`P2` · `A11Y` · Global · ← PQ-6

- **Current:** Every error surface — the login panel, form error lines, `ErrorState`, the check-in widget — is a plain styled `<p>`/`<span>` inserted into the DOM with no `role="alert"`, no `aria-live`, and no `aria-describedby` linking it to a field.
- **Expected:** A screen-reader user must learn that their submission failed.
- **Fix:** `role="alert"` on all transient error surfaces; `aria-live="assertive"` on the error toast region and `polite` on status; `aria-invalid` + `aria-describedby` on invalid fields (DESIGN_SYSTEM §12.4, §21.3).
- **Validation:** With a screen reader, submitting an invalid form announces the error without moving focus manually.

### DF-024 · Placeholder-only labels on the two admin forms
`P2` · `A11Y` `UX` · Add Employee, search inputs, approval comment · ← UX-11

- **Current:** All six Add Employee fields (`EmployeeDirectory.tsx:158-215`) carry a `placeholder` and no label; once filled, the label is gone and screen readers get no accessible name. A bare `<input type="date">` gives no indication it means "joining date". Same for both search inputs and the per-row comment field.
- **Expected:** Every input has a persistent visible label.
- **Fix:** Adopt the `Field` primitive (DESIGN_SYSTEM §12.1) — label above control, helper below, placeholder as a supplementary example only.
- **Validation:** Every input has a visible label and a programmatic accessible name; filling a field does not remove its label.

### DF-025 · The modal is not an accessible dialog
`P2` · `A11Y` · Modal (Add Employee, Time Off request) · ← PQ-5, P3-16

- **Current:** `Modal.tsx` has no `role="dialog"`, no `aria-modal`, no `aria-labelledby`, no focus trap, no focus restoration, no Escape handler and no backdrop dismissal. Keyboard focus tabs straight out into the page behind the overlay; closing returns focus to the top of the document.
- **Expected:** Standard dialog semantics.
- **Fix:** Rebuild on a headless dialog primitive meeting the DESIGN_SYSTEM §16 contract, including body scroll lock and a sticky footer.
- **Validation:** Tab cycles only within the dialog; Escape closes; focus returns to the element that opened it.

### DF-026 · Touch targets below the WCAG minimum
`P2` · `A11Y` · Approval table, month navigation · ← UI-16, UI-17

- **Current:** Approve/Reject are overridden to `!px-2 !py-1 text-xs` (~20px tall) stacked with `gap-1` (4px). Month arrows are ~24×22px. The `!important` overrides exist because `Button` has no `size` prop.
- **Expected:** WCAG 2.2 AA — targets ≥24×24 CSS px; adjacent targets ≥8px apart.
- **Fix:** Add `size` to `Button` (`sm` 32px / `md` 40px / `lg` 48px, DESIGN_SYSTEM §11.2), remove all `!important`, set gaps to ≥8px.
- **Validation:** No interactive target measures under 32px in any direction; adjacent controls have ≥8px separation.

### DF-027 · Emoji stand in for an icon system
`P2` · `A11Y` `VIS` · Global · ← UI-31, P3-26

- **Current:** `🔔` (`NotificationBell.tsx:38`), `✕` (`Modal.tsx:32`), `←`/`→` (`AttendancePage.tsx:73,83`), `→` in workflow chips and the 360° link. Emoji render per-OS, cannot inherit colour, and do not scale with the type system — the bell is a full-colour glyph in an otherwise monochrome nav. An unused SVG sprite already sits at `public/icons.svg`.
- **Expected:** A single icon family with controllable colour, size and semantics.
- **Fix:** Adopt Phosphor per DESIGN_SYSTEM §9 with the domain icon map, applying the per-usage accessibility contract (decorative → `aria-hidden`; meaningful → text alternative; in a control → the control is named).
- **Validation:** No emoji remain in `.tsx`; every icon inherits `currentColor` and renders identically across OSes.

### DF-028 · Icon-only controls missing accessible names
`P2` · `A11Y` · Avatar menu, month arrows, audit expander, bell · ← PQ-8

- **Current:** `aria-label` is present on the bell and the modal close, and missing on the avatar menu trigger, both month arrows and the audit "Diff" expander. The bell's label omits the unread count, so screen-reader users hear "Notifications" whether there are 0 or 12, and the count badge has no `aria-live`.
- **Expected:** Every control has an accessible name; dynamic counts are announced.
- **Fix:** Add labels to all four; include the count in the bell's name ("Notifications, 3 unread") with `aria-live="polite"` (DESIGN_SYSTEM §22.4). Add `aria-expanded`/`aria-controls` to the expander and menu triggers.
- **Validation:** Every interactive element has a non-empty accessible name; changing the unread count is announced once.

### DF-029 · Dropdowns do not close on outside click or Escape
`P2` · `A11Y` `UX` · Avatar menu, notification panel · ← UX-6, P3-15

- **Current:** Neither the avatar menu (`AppShell.tsx:71`) nor the notification panel (`NotificationBell.tsx:44`) has an outside-click handler, Escape handler, `aria-expanded`, `aria-haspopup` or roving focus. Both can be open simultaneously and stay open over content.
- **Expected:** Standard menu behaviour.
- **Fix:** Single `Menu` primitive implementing the DESIGN_SYSTEM §13 behaviour contract — arrow-key navigation, Home/End, Escape returning focus to trigger, outside-click close, only one open at a time.
- **Validation:** Escape and outside clicks close the menu and return focus to the trigger; arrow keys move between items; opening one closes the other.

### DF-030 · The workflow trail labels a pending request "Approved"
`P2` · `UX` `FUNC` · Time Off (both views) · ← UX-9

- **Current:** `leave.service.ts:236-247` builds the third step as `label: status === 'REJECTED' ? 'Rejected' : 'Approved'`. A **PENDING** request therefore renders `Submitted → Pending HR Review → Approved`, with the third chip merely styled grey. Styling alone carries the distinction between "approved" and "not yet decided".
- **Expected:** PRD §10.4 — a visible status trail. It must not name an outcome that has not occurred.
- **Fix:** Label the unresolved final step with a neutral noun — "Decision" — resolving to "Approved"/"Rejected" with timestamp and reviewer only once decided (DESIGN_SYSTEM §22.3). Raise chip type from 10px to 12px.
- **Validation:** A pending request's trail contains neither the word "Approved" nor "Rejected".

### DF-031 · Presence dot has two states where the domain has four
`P2` · `UX` `A11Y` · Employee directory, check-in widget · ← UI-25, P3-9

- **Current:** `AttendanceDot` renders only green (checked in) or red (not). "On leave", "absent", and "worked and went home" are indistinguishable — and the most common evening state for a present employee is **red**, reading as absent. Colour is the sole carrier of meaning; the only affordance is a hover-only `title`.
- **Expected:** Wireframe specifies 🟢 present · ✈️ on leave · 🟡 absent-without-leave.
- **Fix:** Four-state indicator per DESIGN_SYSTEM §1.4/§22.2 — in office (green fill), on leave (blue + plane glyph), absent (amber hollow ring), checked out (grey fill) — each with shape differentiation and an accessible name, never hover-only.
- **Validation:** Four distinct renderings exist; each has an accessible name; a checked-out employee is grey, not red.

### DF-032 · No success feedback exists anywhere in the product
`P2` · `UX` · Global · ← UX-15

- **Current:** No toast, snackbar or inline confirmation layer. Saving a profile closes the edit bar; approving re-renders a row; marking read dims text. Success is always inferred from a side effect.
- **Expected:** Completed actions are confirmed.
- **Fix:** Toast provider per DESIGN_SYSTEM §18.3 with the mandatory coverage table — check in/out, submit request, approve/reject, create employee (with a Copy action for the generated Login ID), profile and salary updates.
- **Validation:** Every mutation produces a visible confirmation; success toasts auto-dismiss in 4 s, error toasts persist, and the timer pauses on hover and focus.

### DF-033 · A failed salary request renders as a factual claim about pay
`P2` · `UX` `FUNC` · Salary Info tab · ← UX-24, P2-15

- **Current:** `EmployeeProfile.tsx:195` — `{salary.data == null && !salary.isLoading && (<p>No salary structure configured.</p>)}`. `salary.isError` is never checked, so a 403, 500 or dropped connection displays a confident assertion that the employee has no compensation on file.
- **Expected:** Errors and emptiness are distinct states.
- **Fix:** Branch `isError` before `isEmpty` here and audit every other query for the same pattern (DESIGN_SYSTEM §21.3 rule 1). Render `ErrorState` with the server message and Retry.
- **Validation:** Forcing a 500 on the salary endpoint shows an error with a Retry affordance, not the empty-state copy.

### DF-034 · The approval queue has no status filter and no default scoping
`P2` · `UX` `PERF` · Time Off (admin) · ← P2-14, UI-20 (partial)

- **Current:** `listLeaveRequests({ status: undefined })` fetches every request in every state, unpaginated in the UI, ordered by `createdAt desc`. The backend supports `?status=` and `?employeeId=` that the UI never exposes. Actionable PENDING rows interleave with historical approvals and rejections.
- **Expected:** A queue shows what needs action first.
- **Fix:** Default the filter to `PENDING`, add status tabs with counts in the toolbar (DESIGN_SYSTEM §14.3), and treat an empty PENDING result as the "cleared" empty state — "All caught up" — not an absence (§20.2).
- **Validation:** The queue opens on PENDING; switching tabs refetches with the server filter; clearing the queue shows the success-toned empty state.

### DF-035 · Pagination exists server-side and nowhere in the UI
`P2` · `FUNC` `UX` · Directory, audit log, leave list, admin attendance · ← P2-18, P2-19, P3-5, UI-20 (partial)

- **Current:** Every list requests a large `pageSize` (50) and discards the returned `pagination` envelope; `page` is accepted by the service wrapper but never passed. Employee 51 is invisible with no indication. `getAdminDayView` has no server-side pagination at all (`findMany` with no `take`).
- **Expected:** PRD §8 requires pagination on the employee, attendance and leave lists.
- **Fix:** Render the pagination footer whenever `totalPages > 1` (DESIGN_SYSTEM §14.3) with "1–25 of 143"; add `take`/`skip` to `getAdminDayView`; expose the audit log's actor and date-range filters.
- **Validation:** With 60 seeded employees, page 2 is reachable and the count reads correctly; the admin attendance endpoint accepts pagination parameters.

### DF-036 · Tables lack semantic scaffolding
`P2` · `A11Y` · All four data tables · ← UI-22

- **Current:** No `<caption>`, no `scope="col"` on any `<th>`, no `aria-sort`. `AuditLogPage.tsx:70` has an empty `<th />`; its expander is a bare button toggling "Diff"/"Hide" with no `aria-expanded` or `aria-controls`.
- **Expected:** Screen-reader users can identify columns and sort state.
- **Fix:** `Table` primitive supplying `sr-only` caption, `scope="col"`, `aria-sort`, and labelled expanders (DESIGN_SYSTEM §14.3).
- **Validation:** Screen-reader table navigation announces column headers for each cell; sortable columns announce their sort state.

### DF-037 · Rate limiting and audit IPs are broken behind the proxy
`P2` · `SEC` `DATA` · Backend / nginx · ← P2-1

- **Current:** Express is never configured with `app.set('trust proxy', …)` and `nginx.conf` forwards only `X-Real-IP`, not `X-Forwarded-For`. So (a) `express-rate-limit` keys on the nginx container IP for every user — 30 failed logins from anyone locks out everyone for 15 minutes; (b) `requireAuth.ts:26-29` falls back to `req.socket.remoteAddress`, so **every `AuditLog.ipAddress` records the proxy's address**, making the field worthless.
- **Expected:** Per-client rate limiting; audit rows record the actual client IP.
- **Fix:** `app.set('trust proxy', 1)` and add `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;` to `nginx.conf`.
- **Validation:** Two clients from different IPs have independent login-attempt budgets; audit rows show distinct client addresses.

---

# P3 — Medium

### DF-038 · Impossible calendar dates are silently rolled over
`P3` · `DATA` · Date handling (leave, attendance, audit) · ← P2-6

- **Current:** `dates.ts:6-14` validates shape, not validity, then `Date.UTC` rolls over: `2026-02-31` → **2026-03-03**; `2026-13-45` → **2027-02-14**. Zod guards every call site with the same shape-only regex, so garbage dates reach the database as plausible-looking wrong dates.
- **Expected:** Invalid dates are rejected with a 400.
- **Fix:** After parsing, verify the constructed date's components round-trip to the input; throw `AppError('…','VALIDATION_ERROR',400)` otherwise.
- **Validation:** `startDate: '2026-02-31'` returns 400, not a request starting 3 March.

### DF-039 · Attendance day boundaries and lateness are UTC-only
`P3` · `DATA` `FUNC` · Attendance · ← P2-7

- **Current:** `startOfDay`/`todayUtc` define the attendance day in UTC and `isLateCheckIn` compares `getUTCHours()` to the `LATE_CHECKIN_THRESHOLD` wall-clock string. For the product's stated locale (₹/INR, IST +05:30) the attendance day rolls at **05:30 IST**, and the "10:30" threshold fires at **16:00 IST** — so no normal late arrival is ever flagged while every post-16:00 check-in is. The UI compounds this by rendering with browser-local `toLocaleTimeString()`.
- **Expected:** Attendance days and lateness follow the organisation's timezone.
- **Fix:** Introduce an `ORG_TIMEZONE` env value; compute day boundaries and the lateness comparison in that zone; render consistently.
- **Validation:** With `Asia/Kolkata`, a 09:15 IST check-in books to the correct local day and is not flagged late; an 11:00 IST check-in is.

### DF-040 · Check-in and leave approval overwrite each other's status
`P3` · `DATA` · Attendance / leave interaction · ← P2-8

- **Current:** `AttendanceDaySummary.status` is written by two independent paths with no reconciliation. Checking in on a LEAVE day overwrites it to PRESENT, erasing the leave marking; approving backdated leave over a worked day sets LEAVE while retaining `checkIn`/`checkOut`/`workedMinutes`, producing "on leave, worked 8 h".
- **Expected:** One coherent status per employee-day.
- **Fix:** Define precedence explicitly (approved leave wins for the day unless a check-in exists, in which case flag it as an exception for HR review) and apply it in both paths.
- **Validation:** Checking in on an approved leave day produces a single defensible status and raises an exception flag rather than silently discarding either fact.

### DF-041 · Leave validation runs outside the transaction that commits
`P3` · `DATA` · Leave service · ← P2-9, P2-10

- **Current:** Overlap and balance checks execute as separate queries *before* `prisma.$transaction` (`leave.service.ts:85-125` vs `:127`). Two concurrent submissions can both pass and both insert. Separately, pending requests do not reserve balance, so two non-overlapping requests can each fit the allocation while jointly exceeding it — the second **approval** then fails, surfacing the conflict in the admin's queue.
- **Expected:** `LEAVE_OVERLAP` is a guarantee, not a race.
- **Fix:** Move both checks inside the transaction. Consider reserving balance on submission (a `pendingDays` column) so over-allocation is caught at request time, not approval time.
- **Validation:** Two simultaneous overlapping requests result in exactly one insert and one `LEAVE_OVERLAP`.

### DF-042 · Long leave approvals risk exceeding the transaction timeout
`P3` · `PERF` `DATA` · Leave approval · ← P2-12, P2-11

- **Current:** The approval transaction loops one `upsert` per calendar day (`leave.service.ts:317-337`) — ~36 sequential round-trips for a 30-day leave, against Prisma's 5 s default interactive-transaction timeout. Separately, the overlap check loads an employee's entire `PENDING`/`APPROVED` history into memory and scans it in JS instead of using the existing `@@index([startDate, endDate])`.
- **Expected:** Approval completes in constant round-trips regardless of leave length.
- **Fix:** Replace the loop with `createMany`/`updateMany` over a generated date list; replace the in-memory overlap scan with a date-range `WHERE` predicate.
- **Validation:** Approving a 30-day leave issues a bounded number of queries and completes well inside the timeout.

### DF-043 · Prisma errors surface as opaque 500s, and login-ID generation races
`P3` · `FUNC` · Error handling / provisioning · ← P2-3, P2-4

- **Current:** `errorHandler` maps `AppError` and `ZodError` only; every `P2002` (unique), `P2003` (FK) and `P2025` becomes `500 INTERNAL_ERROR`. `generateLoginId` reads all matching IDs, takes max+1 and inserts — a read-modify-write race, so two simultaneous same-year hires collide and produce that opaque 500. It also reads `getFullYear()` (local) off a UTC-midnight date, yielding the wrong year on negative-offset hosts.
- **Expected:** Predictable, coded errors; collision-safe ID generation.
- **Fix:** Map Prisma error codes to envelope codes in `errorHandler`. Generate login IDs inside a transaction with a retry on unique violation, or use a per-year sequence. Use `getUTCFullYear()`.
- **Validation:** A duplicate `employeeCode` returns a 409 with a meaningful code; concurrent creations produce distinct sequential IDs.

### DF-044 · New leave types orphan existing employees
`P3` · `FUNC` · Leave balances · ← P2-5

- **Current:** Balances are created only at employee-creation time (`auth.service.ts:19-33`). Adding a fourth `LeaveType` leaves every existing employee without a balance row, and `createLeaveRequest` then throws `Leave balance not configured` (404).
- **Expected:** Adding a leave type does not break existing employees.
- **Fix:** Resolve balances lazily — upsert a zero-allocation balance on first reference — and add a backfill for new types.
- **Validation:** Adding a leave type post-seed lets an existing employee open the request modal without error.

### DF-045 · Login ID matching is case-sensitive while email is not
`P3` · `UX` · Login · ← P2-2

- **Current:** `auth.service.ts:34-36` lower-cases the identifier for the email comparison but uses `input.email.trim()` un-normalised for `loginId`. `AS2026007` authenticates; `as2026007` returns `Invalid credentials`.
- **Expected:** Login IDs are always displayed uppercase; users will type either.
- **Fix:** Uppercase-normalise the `loginId` branch of the lookup.
- **Validation:** Both casings authenticate successfully.

### DF-046 · Monthly attendance compares present days against the whole month
`P3` · `UX` `FUNC` · My Attendance · ← P2-21

- **Current:** `totalWorkingDays = countWeekdays(monthStart, monthEnd)` counts the full month including future dates. On 5 August an employee with perfect attendance sees "Days present 3 / Working days 21".
- **Expected:** A mid-month comparison is to date, or is labelled as a month total.
- **Fix:** Count working days elapsed to date for the current month, and label the metric ("21 working days this month · 3 elapsed").
- **Validation:** Mid-month, a perfect-attendance employee sees matching present and elapsed working-day counts.

### DF-047 · Audit `previousValue` captures three fields regardless of what changed
`P3` · `DATA` · Employee updates · ← P2-20

- **Current:** `employees.service.ts:276-280` hard-codes `previousValue: { phone, address, designation }` while `newValue` is the full request body. Editing a bank account, PAN or department records the new value with no prior value.
- **Expected:** TRD §3 specifies before/after capture; the sensitive fields are exactly where it matters.
- **Fix:** Snapshot the previous values of the keys actually present in the update.
- **Validation:** Changing IFSC produces an audit row whose diff shows both old and new IFSC.

### DF-048 · `/profile` renders an error for an admin with no employee record
`P3` · `FUNC` · Profile · ← P2-17

- **Current:** `employeeId` resolves to `''`, the query is disabled, and in TanStack Query v5 `isLoading` is `false` with `data === undefined` — falling through to `ErrorState "Failed to load profile"`. Reachable for any `HR_ADMIN` created without an `Employee` row, which the schema permits.
- **Expected:** A meaningful state, not a false error.
- **Fix:** Branch on the missing employee profile and render an explanatory empty state.
- **Validation:** An admin user with no employee record sees an explanation, not a load failure.

### DF-049 · One URL renders two entirely different applications, unlabeled
`P3` · `UX` · Attendance, Time Off · ← UX-1

- **Current:** `/attendance` and `/time-off` render completely different screens by role. The components are correctly separate (as the frontend prompt requires), but nothing indicates which variant is shown — both are titled "Attendance".
- **Expected:** Support and training depend on "go to /attendance and click X" being stable.
- **Fix:** Distinguish in the page header — "Attendance · Organisation" vs "Attendance · Mine" — and pair with the "My" routes from DF-014.
- **Validation:** Each variant is identifiable from its header alone.

### DF-050 · Employee 360° is undiscoverable
`P3` · `UX` · Employee 360° · ← UX-3

- **Current:** No nav entry, no directory-card affordance; reachable only via a secondary button on another employee's profile, which is additionally hidden when `self` is true (`EmployeeProfile.tsx:88`).
- **Expected:** PRD §10.3 calls it the strongest admin screen.
- **Fix:** Add a row/card action in the directory and make it the default admin landing for a selected employee, with the profile as a tab within it.
- **Validation:** 360° is reachable in one action from the directory.

### DF-051 · A native `alert()` is the only validation dialog in the product
`P3` · `UX` `A11Y` · Time Off (admin) · ← UX-16, P3-17

- **Current:** `TimeOffPage.tsx:207` — `alert('Comment required to reject')`. Unstyled, blocking, unlocalisable, and inconsistent with the inline-error pattern six lines away.
- **Expected:** One feedback system.
- **Fix:** Inline field error in the review drawer (DF-057) per DESIGN_SYSTEM §12.4.
- **Validation:** No `alert()`/`confirm()` remains in the codebase.

### DF-052 · No inline validation anywhere
`P3` · `UX` `A11Y` · All forms · ← UX-12

- **Current:** Every form validates on submit only via HTML `required`. Nothing validates on blur; no field shows a per-field message; errors appear as a single line at the bottom.
- **Expected:** Errors attach to the field that caused them.
- **Fix:** DESIGN_SYSTEM §12.4 — validate on blur, re-validate on change once errored, inline message per field linked by `aria-describedby`, plus a focusable summary for 2+ errors that retains the inline errors.
- **Validation:** Blurring an invalid field shows a message beneath it; a failed multi-error submit moves focus to a summary linking each field.

### DF-053 · Invalid date ranges give no feedback and produce a wrong number
`P3` · `UX` · Time Off request modal · ← UX-13, P3-19

- **Current:** `TimeOffPage.tsx:100-103` — when `end < start`, `daysRequested` silently falls back to `1`. The user sees an inverted range with "1" in Allocation and no warning, then a generic server error.
- **Expected:** Immediate, specific feedback.
- **Fix:** Validate the range on blur with an inline message; display the computed working-day count live (see DF-008).
- **Validation:** Setting end before start shows an inline error and blocks submission.

### DF-054 · One generic skeleton stands in for every content type
`P3` · `UX` `PERF` · All loading states · ← UX-20, UX-21, UX-22

- **Current:** `ui.tsx:13-24` renders N identical 40px bars with a decorative opacity ramp (`1 - i*0.1`), used for card grids, tab forms, tables and the 360° dashboard. Every load reflows when real content arrives. No `aria-busy`. No route-level pending state, and the salary tab re-skeletons on every visit.
- **Expected:** Skeletons reserve the shape of what they replace (CLS).
- **Fix:** Per-surface skeleton variants per DESIGN_SYSTEM §19.1; `aria-busy` on containers; prefetch salary on tab hover; suppress indicators under 300ms.
- **Validation:** Real content replaces each skeleton with no visible layout shift.

### DF-055 · Empty states cover 4 of 9 lists, in 5 different renderings
`P3` · `UX` · All lists · ← UX-23, P3-18

- **Current:** `EmptyState` is used on the directory, leave list, timeline and audit log (3 of 4 with no `hint`). Missing or bespoke elsewhere: an inline `<td colSpan>` in My Attendance, an empty `<tbody>` in admin attendance, custom markup in the notification panel, and bare `<ul>`s in both 360° sections.
- **Expected:** One component, one pattern, always with a next step.
- **Fix:** Apply the DESIGN_SYSTEM §20.3 copy table across all nine surfaces, using the three distinct kinds (first-use / filtered / cleared).
- **Validation:** Every list renders `EmptyState`; each has a title, a hint, and an action where one exists.

### DF-056 · Session expiry is a silent full-page reload
`P3` · `UX` · Global · ← UX-25, P3-30

- **Current:** `api/client.ts:24-27` — `window.location.href = '/login'` on any 401, discarding React state and any unsaved form with no explanation.
- **Expected:** The user is told what happened and returns to where they were.
- **Fix:** Client-side navigation with a "Your session expired — sign in to continue" message, preserving the attempted route for post-login return.
- **Validation:** Expiring a token mid-form shows the message and, after re-login, returns to the same route.

### DF-057 · A form is embedded in a table cell
`P3` · `UX` · Time Off (admin queue) · ← UI-21, UX-10, PQ-2

- **Current:** The last column of every pending row holds a 160px comment input stacked over two buttons inside a `<td>`, forcing `align-top` on the whole table and pushing 8 columns into horizontal scroll. On mobile the buttons sit off-screen. Status is also encoded twice — a `StatusBadge` plus a workflow trail whose last chip repeats it.
- **Expected:** Row decisions happen in a dedicated surface.
- **Fix:** Build the review drawer (DESIGN_SYSTEM §15.2), which shows the consequence before the decision ("Balance after: 5 of 7 days"). Reduce the table to one status column. This single change also resolves DF-017 and DF-026's crowding.
- **Validation:** The queue table fits without horizontal scroll at 1280px; approve/reject happen in the drawer, on mobile too.

### DF-058 · No error boundary and no 404
`P3` · `UX` · Global · ← UX-26

- **Current:** `App.tsx:49` routes `*` to `<Navigate to="/" replace />`, so stale or mistyped URLs bounce silently. Any render exception takes the tree to a blank white page.
- **Expected:** Failures are explained and recoverable.
- **Fix:** Add a root error boundary with a reload affordance and a real 404 route.
- **Validation:** A thrown render error shows a recoverable screen; an unknown URL shows a 404 with a route home.

### DF-059 · The check-in error is truncated to 120px in the nav
`P3` · `UX` · Check-in widget · ← UX-19

- **Current:** `CheckInWidget.tsx:59-63` — `max-w-[120px] truncate text-[10px] text-red-300`, with the full text only in a hover `title`. "Already checked in today. Check out first." truncates to about "Already check…".
- **Expected:** Errors are legible, and available on touch.
- **Fix:** Route widget errors to the error toast (DESIGN_SYSTEM §18.3).
- **Validation:** Attempting a duplicate check-in shows the full message in a persistent toast.

### DF-060 · Edit mode appears on tabs with nothing editable
`P3` · `UX` · Employee profile · ← P3-20

- **Current:** The Edit button is available on every tab, but editable inputs exist only on Info. Clicking Edit on Private Info shows a Save/Cancel bar over read-only text; Save submits an unchanged `{phone, address}` and writes an audit row for a no-op.
- **Expected:** Edit affordances appear only where editing is possible.
- **Fix:** Scope edit mode per tab (resolved together with DF-016), and suppress no-op submissions.
- **Validation:** Edit is unavailable or functional on every tab; saving with no changes writes no audit row.

### DF-061 · Search fires a request per keystroke
`P3` · `PERF` `UX` · Directory, admin attendance · ← PQ-14, P3-21

- **Current:** `queryKey: ['employees', search]` and `['attendance-admin', date, search]` with no debounce. Typing "Rahul" issues five requests and flashes the list five times.
- **Expected:** One request per settled query.
- **Fix:** 250ms debounce per DESIGN_SYSTEM §12.5, retaining previous results during the fetch.
- **Validation:** Typing a five-character term issues one request after typing stops; the list does not flash.

---

# P4 — Low

### DF-062 · Type scale is flat with no reading tier and sub-12px content
`P4` · `VIS` `A11Y` · Global · ← UI-1, UI-4, UI-5, UI-6, UI-7

- **Current:** `text-sm` ×60, `text-xs` ×29, `text-[10px]` ×4, and one instance each of `base`/`lg`/`xl`/`2xl`/`5xl` — ~93% of text is ≤14px. No base size is set; `line-height: 1.45`. The four 10px usages all carry meaningful content (workflow chips, audit IDs, unread count, check-in error). ~30 profile labels are uppercase with tracking.
- **Expected:** Density is correct for this product; the absence of differentiation is not.
- **Fix:** Adopt the DESIGN_SYSTEM §2.2 scale — 14px stays the dense/table tier, 16px becomes the reading tier (form inputs, profile values), 12px is the floor, line-height 1.5, sentence case.
- **Validation:** No `text-[10px]` remains; every form input is ≥16px (no iOS zoom on focus).

### DF-063 · No spacing, radius or elevation scale
`P4` · `VIS` `DEBT` · Global · ← UI-8, UI-9, UI-29

- **Current:** `index.css` defines 18 colour variables and zero spacing/radius/type tokens. Container padding ranges `p-2`→`p-8` with no rule (directory `p-4`, profile `p-5`, health `p-6`, login `p-8`). Radius mixes `rounded-md` ×27 / `lg` ×18 / `xl` ×1 / bare. Elevation mixes tokenised `--shadow` ×6 with raw `shadow-lg`/`shadow-xl` at the three most visible moments.
- **Expected:** Anything used twice is a token.
- **Fix:** Adopt DESIGN_SYSTEM §3–§5 including the container-padding table and the "radius increases one step per elevation level" rule.
- **Validation:** No arbitrary spacing/radius/shadow values remain outside the token set.

### DF-064 · Raw colours bypass the token system
`P4` · `VIS` `DEBT` · Global · ← UI-11

- **Current:** `text-red-300`, `bg-white/5`, `border-white/10`, `bg-black/40`, and literal `bg-white` ~20 times.
- **Expected:** Components reference semantic tokens only.
- **Fix:** Define tokens in Tailwind v4 `@theme` (DESIGN_SYSTEM §22.1) so utilities generate from them; replace all raw values.
- **Validation:** No hex, no Tailwind palette class, and no `bg-white` in component files.

### DF-065 · No form primitives — inputs styled five different ways
`P4` · `VIS` `DEBT` · All forms · ← UI-18, UI-19

- **Current:** No `Input`/`Select`/`Field` component. The same control is hand-written per screen with differing font size, focus behaviour and padding. No disabled, readonly or error field styling exists; profile edit swaps a `<dd>` for a bare `rounded` input.
- **Expected:** One primitive.
- **Fix:** Extract `Field` first (DESIGN_SYSTEM §22.2 sequence) — it resolves DF-024, DF-052 and part of DF-063.
- **Validation:** Every form control renders through the shared primitive.

### DF-066 · Tables have no sort or bulk actions
`P4` · `UX` · All data tables · ← UI-20 (remainder)

- **Current:** Four data tables, none sortable, none with multi-select.
- **Expected:** An approval queue is the textbook bulk-action case.
- **Fix:** Add sortable headers with `aria-sort` and a selection column with a bulk action bar (DESIGN_SYSTEM §14.3).
- **Validation:** Columns sort; selecting rows reveals a bulk bar showing the count.

### DF-067 · Employee cards show initials, never photographs
`P4` · `VIS` · Directory · ← UI-24, P3-10

- **Current:** `profilePictureUrl` is in the schema, the DTO and the self-edit allowlist; no `<img>` is rendered anywhere. Eight identical teal initial-circles.
- **Expected:** Wireframe: *"Each card should display the employee's profile picture."*
- **Fix:** Render the photo with an initials avatar as fallback (DESIGN_SYSTEM §15.1); depends on DF-015 for upload.
- **Validation:** An employee with a photo shows it; one without shows initials.

### DF-068 · Seed data is identical across all eight employees
`P4` · `UX` · Seed / demo quality · ← UX §4.5

- **Current:** All eight share phone `+91 98765 43210`, address `Bengaluru, Karnataka`, DOB `1995-05-15`, gender `Other`, IFSC `HDFC0001234`, job-love note, interests `Reading, Cricket, Coffee` and skills `['Communication','Problem Solving']`. Any two profiles are the same person renamed.
- **Expected:** The About tab exists to make profiles feel human; uniform filler demonstrates the opposite.
- **Fix:** Vary all personal fields across the seed. Content work, no code.
- **Validation:** No two seeded employees share a phone, DOB, IFSC, bio, interests or skill set.

### DF-069 · Login form ships with credentials hard-coded in state
`P4` · `SEC` `VIS` · Login · ← UX §4.4, P3-31

- **Current:** `Login.tsx:11-12` initialises state to `rahul@dayflow.local` / `Password@123`, plus a panel listing both demo accounts. The form can never render empty.
- **Expected:** Demo convenience should be opt-in, not compiled in.
- **Fix:** Move behind an env flag (`VITE_DEMO_MODE`), default off.
- **Validation:** With the flag unset, the form renders empty and no credentials appear.

### DF-070 · Almost nothing moves, and reduced motion is unhandled
`P4` · `VIS` `A11Y` · Global · ← PQ-10, PQ-7

- **Current:** Five `transition` declarations and one `animate-` in the whole codebase; tab switches, modal and dropdown open/close and row changes are instant 0ms swaps. Zero `prefers-reduced-motion` — the skeleton's `animate-pulse` runs indefinitely for users who requested reduced motion.
- **Expected:** Motion conveys state change; reduced motion is respected.
- **Fix:** Adopt DESIGN_SYSTEM §8 duration/easing tokens with the global reduced-motion guard; transform/opacity only.
- **Validation:** With reduced motion enabled, no animation plays and the skeleton is static.

### DF-071 · No optimistic updates on any mutation
`P4` · `PERF` `UX` · Global · ← PQ-11

- **Current:** Every write waits for the round trip then invalidates and refetches. Check-in, mark-as-read and approval all show a dead window. `onMutate` is unused.
- **Expected:** Actions whose outcome is near-certain feel instant; the round trip happens behind the confirmed state.
- **Fix:** Apply optimistic updates with rollback-on-error for mark-as-read and check-in first (DESIGN_SYSTEM §19.3).
- **Validation:** Marking a notification read updates instantly and reverts with an error toast if the request fails.

### DF-072 · Google Fonts loaded via render-blocking CSS `@import`
`P4` · `PERF` · Global · ← PQ-13

- **Current:** `index.css:1` is an `@import` to fonts.googleapis.com — discovered only after the stylesheet parses, serialising the font request behind CSS download. No `preconnect` in `index.html`. (`display=swap` is correctly present.)
- **Expected:** Font requests start in the initial waterfall rather than blocking behind CSS parse.
- **Fix:** Move to `<link rel="preconnect">` + `<link rel="stylesheet">` in `index.html` (DESIGN_SYSTEM §2.1).
- **Validation:** The font request starts in the initial waterfall, not after CSS parse.

### DF-073 · `StatStrip` is a 4-column grid that never receives 4 items
`P4` · `VIS` · Directory, attendance · ← UI-2

- **Current:** `ui.tsx:70` declares `lg:grid-cols-4`; both callers pass 3 items, leaving a permanent empty cell in the most prominent position on the admin landing screen.
- **Expected:** The strip is sized by its content, not by a hard-coded column count.
- **Fix:** `repeat(auto-fit, minmax(180px, 1fr))` (DESIGN_SYSTEM §6.2).
- **Validation:** Three items fill the row at every breakpoint.

### DF-074 · Nav labels truncated inconsistently; avatar has no caret
`P4` · `VIS` `UX` · AppShell · ← UX-2, UI-27, UI-28

- **Current:** Nav reads `Audit` and `Health` while the pages are "Audit Log" and "Workforce Health" — two of five items shortened. The avatar trigger has no caret (the wireframe shows `Avatar⌄`), making the menu undiscoverable; below `sm` only a bare circle remains. The logo is a teal square containing "Df", duplicated in two files.
- **Expected:** Nav labels match the page titles they lead to, and every menu advertises that it opens.
- **Fix:** Full labels; add `CaretDown`; replace the placeholder mark (DESIGN_SYSTEM §17.1, §17.4).
- **Validation:** Nav labels match page titles; the avatar shows a caret at all sizes.

### DF-075 · Times show seconds; currency is unlocalised
`P4` · `VIS` · Tables, salary · ← UI-23, P3-22

- **Current:** `toLocaleTimeString()` with no options yields "10:15:32 AM" in every attendance cell; `toLocaleString()` without `en-IN` renders ₹12,50,000 as `1,250,000`. All dates use the browser locale with no explicit format.
- **Expected:** Formats are explicit and locale-correct for an INR product, and dense cells carry no redundant precision.
- **Fix:** `HH:mm` in tables, `en-IN` grouping for ₹, explicit date format (DESIGN_SYSTEM §14.2).
- **Validation:** Attendance cells show `10:15`; salary shows `₹12,50,000`.

### DF-076 · The "NEW" button label
`P4` · `VIS` `UX` · Directory, Time Off · ← UI-3

- **Current:** All-caps `NEW` transcribed literally from the wireframe, beside sentence-case actions ("Approve", "Discard", "Save"), and it does not say what it creates.
- **Expected:** A button states the action it performs, in the same casing as every other action.
- **Fix:** "New employee" / "Request time off" — verb + object (DESIGN_SYSTEM §11.4).
- **Validation:** No all-caps button labels remain.

### DF-077 · Card hover is border-colour only
`P4` · `VIS` · Directory · ← UI-26

- **Current:** `hover:border-[var(--accent)]` with no elevation, background or transform change; combined with DF-020 the cards do not read as clickable.
- **Expected:** An interactive card is visibly interactive before it is clicked.
- **Fix:** Shadow + 1px lift over 150ms (DESIGN_SYSTEM §15.1).
- **Validation:** Hover produces a visible elevation change and a pointer cursor.

### DF-078 · Add Employee form omits role and most accepted fields
`P4` · `FUNC` `UX` · Add Employee · ← P3-2, P3-3

- **Current:** Role is hard-coded `'EMPLOYEE'` (`EmployeeDirectory.tsx:59`) though the API accepts `HR_ADMIN` and PRD §7.1 lists Role as a registration field — a second admin can only be created by editing the seed. Phone, address, DOB, gender, nationality, manager and the About fields are all omitted.
- **Expected:** PRD §7.1 lists Role among the fields captured at provisioning; the API already accepts it and the full field set.
- **Fix:** Add a role selector and a progressively-disclosed "More details" section.
- **Validation:** An `HR_ADMIN` can be provisioned through the UI.

### DF-079 · Wireframe profile elements not rendered
`P4` · `VIS` · Profile, Time Off modal · ← P3-7, P3-8, P3-11

- **Current:** Certifications are fetched and dropped; there is no "+ Add Skills" affordance (skills are read-only); the Time Off modal omits the read-only Employee field the wireframe shows as its first row; and the employee landing has no stat strip, though `GET /dashboard/summary` returns exactly that payload for employees and only the admin directory consumes it.
- **Expected:** PRD §7.2 resolution — employee landing shows today's status and leave balance at a glance.
- **Fix:** Render all four.
- **Validation:** An employee sees their check-in status and balances on landing.

### DF-080 · Payload and asset waste
`P4` · `PERF` `DEBT` · Various · ← P3-4, PQ-16, PQ-15, P3-26, P3-27, P3-33

- **Current:** `/attendance/:id/timeline` returns 120 event records the UI never renders. No prefetch on any navigation. Unused assets: `src/App.css`, `public/icons.svg`, `assets/hero.png`, `react.svg`, `vite.svg`. `README.md` documents a `frontend/src/pages/payroll/` directory that does not exist. `/health` is mounted outside `/api`, so nginx does not proxy it.
- **Expected:** Responses carry only what is rendered, documentation matches the tree, and the health endpoint is reachable through the proxy that serves the app.
- **Fix:** Trim the timeline response; prefetch on card hover; delete unused assets (except `icons.svg`, needed by DF-027); correct the README; move `/health` under `/api`.
- **Validation:** No unused asset ships; the timeline response contains only rendered data.

### DF-081 · Responsive gaps below the primary breakpoints
`P4` · `UX` · Modal, grids, touch surfaces · ← PQ-3, PQ-4, PQ-9

- **Current:** `Modal.tsx:20` uses `p-4 pt-16` with `max-w-lg`, so the Add Employee submit row sits below the fold at 375×667 with no sticky footer. Layouts jump `sm`→`lg` with nothing for tablet (768–1023px). Hover-only `title` attributes carry the *only* full text for the attendance dot, the truncated check-in error and card status — unavailable on touch.
- **Expected:** Every breakpoint has defined behaviour, and no information is reachable only by hovering — touch devices have no hover.
- **Fix:** Full-screen modal below `md` with a sticky footer; define `md` behaviour for primary grids; replace hover-only information (DESIGN_SYSTEM §7, §16).
- **Validation:** At 375px the modal submit is always reachable; no information is hover-exclusive.

### DF-082 · Assorted hygiene
`P4` · `DEBT` · Various · ← P3-24, P3-28, P3-29, P3-32, PQ-12, P3-23, UX-7, UI-30

- **Current:** `getEmployee` returns `Record<string, unknown>` with `String(...)` casts at ~30 call sites, against the frontend prompt's "mirror the backend's DTOs". `Unpaid Leave` carries a finite 30-day allocation PRD §7.6 implies it should not have. The JWT sits in `localStorage` — permitted as a "clearly-labeled shortcut" but labelled nowhere. `bcrypt.compare` is skipped when the user is not found, leaving a timing enumeration channel. Profile tab state is local `useState`, so it is neither persistent nor linkable. Detail screens have no breadcrumb. Five different empty-state renderings (tracked in DF-055).
- **Expected:** Type safety holds at the API boundary, deliberate security trade-offs are recorded, and view state is addressable.
- **Fix:** Type the profile DTO; make unpaid leave unbounded; document the token decision; compare against a dummy hash on miss; move tab state to a URL param; add breadcrumbs on `/employees/:id`.
- **Validation:** No `Record<string, unknown>` at the API boundary; a salary tab URL is shareable; login timing is constant for existing and non-existing users.

---

# Appendix A — Product decisions required

Neither is a defect. Both block implementation until answered.

| # | Question | Options | Blocks |
|---|---|---|---|
| **PD-1** | May an employee view their own salary? | **(a)** Yes — PRD §7.3/§7.7 says so, and the backend already permits it; set `canViewSalary = isAdmin \|\| isSelf`. **(b)** No — the wireframe annotation and `03_FRONTEND_PROMPT.md` §4 say admin-only; remove the self-branch from `payroll.service.getSalary`. Either way one side is currently dead code. | DF-013 |
| **PD-2** | Do employees get a coworker directory? | **(a)** Yes — open `GET /employees` to all roles returning the directory-safe subset; the service branch already exists. **(b)** No — delete the unreachable `access: 'directory'` branch and its UI. `04_BACKEND_PROMPT.md` flagged this ambiguity and asked for confirmation; both answers are currently half-built. | DF-082 (partial), dead code in `employees.service.ts:165-172` |

---

# Appendix B — Source coverage

All **144** source findings map to a backlog item. Duplicates merged where the same defect appeared in both audits.

**Functional audit (71):** P0-1 → DF-002 · P0-2 → DF-003 · P0-3 → DF-001 · P1-1 → DF-004 · P1-2 → DF-004 · P1-3 → DF-007 · P1-4 → DF-006 · P1-5 → DF-008 · P1-6 → DF-011 · P1-7 → DF-010 · P1-8 → DF-013 · P1-9 → DF-009 · P1-10 → DF-012 · P1-11 → DF-014 · P1-12 → DF-004 · P2-1 → DF-037 · P2-2 → DF-045 · P2-3 → DF-043 · P2-4 → DF-043 · P2-5 → DF-044 · P2-6 → DF-038 · P2-7 → DF-039 · P2-8 → DF-040 · P2-9 → DF-041 · P2-10 → DF-041 · P2-11 → DF-042 · P2-12 → DF-042 · P2-13 → DF-002 · P2-14 → DF-034 · P2-15 → DF-033 · P2-16 → DF-005 · P2-17 → DF-048 · P2-18 → DF-035 · P2-19 → DF-035 · P2-20 → DF-047 · P2-21 → DF-046 · P3-1 → DF-004 · P3-2 → DF-078 · P3-3 → DF-078 · P3-4 → DF-080 · P3-5 → DF-035 · P3-6 → DF-015 · P3-7 → DF-079 · P3-8 → DF-079 · P3-9 → DF-031 · P3-10 → DF-067 · P3-11 → DF-079 · P3-12 → DF-015 · P3-13 → DF-015 · P3-14 → DF-021 · P3-15 → DF-029 · P3-16 → DF-025 · P3-17 → DF-051 · P3-18 → DF-055 · P3-19 → DF-053 · P3-20 → DF-060 · P3-21 → DF-061 · P3-22 → DF-075 · P3-23 → DF-082 · P3-24 → DF-082 · P3-25 → PD-2 · P3-26 → DF-080 · P3-27 → DF-080 · P3-28 → DF-082 · P3-29 → DF-082 · P3-30 → DF-056 · P3-31 → DF-069 · P3-32 → DF-082 · P3-33 → DF-080 · P3-34 → DF-003 · P3-35 → DF-018

**UX audit (73):** UX-1 → DF-049 · UX-2 → DF-074 · UX-3 → DF-050 · UX-4 → DF-014 · UX-5 → DF-021 · UX-6 → DF-029 · UX-7 → DF-082 · UX-8 → DF-021 · UX-9 → DF-030 · UX-10 → DF-057 · UX-11 → DF-024 · UX-12 → DF-052 · UX-13 → DF-053 · UX-14 → DF-002 · UX-15 → DF-032 · UX-16 → DF-051 · UX-17 → DF-017 · UX-18 → DF-002 · UX-19 → DF-059 · UX-20 → DF-054 · UX-21 → DF-054 · UX-22 → DF-054 · UX-23 → DF-055 · UX-24 → DF-033 · UX-25 → DF-056 · UX-26 → DF-058 · UI-1 → DF-062 · UI-2 → DF-073 · UI-3 → DF-076 · UI-4 → DF-062 · UI-5 → DF-062 · UI-6 → DF-062 · UI-7 → DF-062 · UI-8 → DF-063 · UI-9 → DF-063 · UI-10 → DF-022 · UI-11 → DF-064 · UI-12 → *deliberate, no action* · UI-13 → DF-020 · UI-14 → DF-019 · UI-15 → DF-019 · UI-16 → DF-026 · UI-17 → DF-026 · UI-18 → DF-065 · UI-19 → DF-065 · UI-20 → DF-035 + DF-066 · UI-21 → DF-057 · UI-22 → DF-036 · UI-23 → DF-075 · UI-24 → DF-067 · UI-25 → DF-031 · UI-26 → DF-077 · UI-27 → DF-074 · UI-28 → DF-074 · UI-29 → DF-063 · UI-30 → DF-055 · UI-31 → DF-027 · PQ-1 → DF-021 · PQ-2 → DF-057 · PQ-3 → DF-081 · PQ-4 → DF-081 · PQ-5 → DF-025 · PQ-6 → DF-023 · PQ-7 → DF-070 · PQ-8 → DF-028 · PQ-9 → DF-081 · PQ-10 → DF-070 · PQ-11 → DF-071 · PQ-12 → DF-082 · PQ-13 → DF-072 · PQ-14 → DF-061 · PQ-15 → DF-080 · PQ-16 → DF-080

**Not carried forward:** UI-12 (no dark mode) — assessed in the UX audit as a deliberate, reasonable omission for an internal tool on this budget, not a defect.

---

# Appendix C — Suggested execution order

Dependency-aware, so shared primitives land before their consumers.

| Wave | Items | Rationale |
|---|---|---|
| **0 — Stop the bleeding** | DF-001, DF-004, DF-005, DF-037 | Data loss and security. DF-001 is one line and prevents ongoing loss. |
| **1 — Core flow correctness** | DF-002, DF-003, DF-006, DF-007, DF-008 | The approve→notify loop plus the three calculations that corrupt balances and attendance. DF-002 needs the toast layer (DF-032) — build them together. |
| **2 — Foundations** | DF-019, DF-020, DF-022, DF-070, DF-072, DF-063, DF-064 | Token layer, focus, cursor, motion. Cheap, global, and every later item inherits them. |
| **3 — Feedback & primitives** | DF-032, DF-023, DF-025, DF-029, DF-065, DF-024, DF-052 | `Field`, `Menu`, `Modal`, toasts. Unblocks most P3 UX items. |
| **4 — Remaining correctness** | DF-009, DF-010, DF-011, DF-012, DF-016, DF-018 | Salary editor, health score, 360°, seed, tests. **PD-1 must be answered before DF-013.** |
| **5 — Navigation & data surfaces** | DF-021, DF-014, DF-057, DF-034, DF-035, DF-036, DF-066, DF-031 | Mobile drawer, "My" routes, review drawer, table primitive. |
| **6 — States & polish** | DF-054, DF-055, DF-033, DF-058, DF-030, DF-062, DF-027, DF-067, DF-068 | Skeletons, empty/error states, icons, type scale, seed variety. |
| **7 — Remainder** | all other P3/P4 | Scheduled normally. |

---

*82 items merged from 144 findings across five documents. No implementation files were modified.*
