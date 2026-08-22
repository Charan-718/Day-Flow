# Dayflow — Functional Audit

**Date:** 2026-08-22
**Commit audited:** `6a8c491` (Initial commit: DayFlow full-stack app)
**Sources of truth:** `files/01_PRD.md`, `files/02_TRD.md`, `Human Resource Management System - 8 hours.excalidraw`
**Supporting specs:** `files/03_FRONTEND_PROMPT.md`, `files/04_BACKEND_PROMPT.md`, `files/05_EXECUTION_PLAN.md`

## Method & limitations

Every finding below comes from static end-to-end tracing of the source: UI component → service wrapper → axios → Express route → middleware chain → controller → service → Prisma → Postgres → response envelope → React Query cache → rendered UI state.

**No code was executed.** `node_modules` is absent in both `frontend/` and `backend/`, so nothing was type-checked, run, or exercised against a live database. Findings marked **[unverified-runtime]** are the ones where execution would materially change confidence; everything else is determinable from source. No implementation files were modified.

## Executive summary

| Priority | Count | Meaning |
|---|---|---|
| **P0** | 3 | Core functionality broken — a documented MUST-HAVE flow does not work as specified |
| **P1** | 12 | Important functionality issue — feature is wrong, silently fails, or contradicts PRD/TRD |
| **P2** | 21 | Edge case, race, or degraded behaviour under non-happy-path input |
| **P3** | 35 | Improvement / polish / spec drift with low functional impact |
| **Total** | **71** | |

The build is architecturally faithful to the TRD — every endpoint in §5.1 exists, the schema matches §3 essentially line-for-line, controllers are thin, services own the transactions, and the salary access guard is genuinely two-layered as §4 requires. The defects are concentrated in three places: **(a)** the write-path UI (silent mutation failures, no salary editor), **(b)** cross-session data freshness, and **(c)** trusted-client inputs on the leave service.

### The three P0s at a glance

1. **P0-1** — Admin leave approve/reject failures are completely invisible in the UI. The single most important admin action fails silently.
2. **P0-2** — Approved leave status never propagates to the employee's Time Off table without a manual page reload, breaking PRD §7.6 and Acceptance Criterion #3.
3. **P0-3** — The seed script runs `deleteMany()` on attendance, leave, notifications and audit logs on **every backend container start**, destroying all live data on any restart.

---

# Part 1 — End-to-end flow traces

## Flow 1: Login → role-aware landing

```
Login.tsx onSubmit
  → useAuth.login(email, password)
  → services/auth.login → POST /api/auth/login
  → loginLimiter → validate(loginSchema) → auth.controller.login
  → auth.service.login: findFirst({OR:[{email},{loginId}]}) + include employee
  → bcrypt.compare
  → if PENDING_ACTIVATION: UPDATE User SET status=ACTIVE, emailVerifiedAt=now()
  → signToken({userId, role, employeeId})
  → { success, data: { token, user } }
  → localStorage.setItem('dayflow_token') + setUser()
  → navigate(role === 'HR_ADMIN' ? '/employees' : '/profile')
```

**Working correctly:** generic `Invalid credentials` for both wrong-email and wrong-password (`auth.service.ts:44,52`) — no user enumeration via message. Accepts either email or Login ID. JWT payload carries nothing sensitive. Rate limiter present. `RoleLanding` (`guards.tsx:24`) redirects rather than hides. On page reload, `useAuth.refresh()` re-hydrates from `GET /auth/me` and clears the token on failure.

**Findings:** P1-2, P2-1, P2-2, P3-29, P3-30, P3-31, P3-32.

## Flow 2: Admin provisions a new employee

```
EmployeeDirectory "NEW" → Modal form (6 fields)
  → services/employees.createEmployee → POST /api/auth/employees
  → requireAuth → requireRole(HR_ADMIN) → validate(createEmployeeSchema)
  → auth.service.createEmployee:
      pre-check email uniqueness → EMAIL_EXISTS 409
      generateLoginId()      // findMany startsWith(initials+year), max+1, pad(3)
      generateEmployeeCode() // findMany startsWith("EMP"+year), max+1, pad(3)
      tempPassword = input.temporaryPassword || `Welcome@${year}`   ← P1-1
      $transaction: create User(PENDING_ACTIVATION) → create Employee
                    → ensureDefaultLeaveBalances (24/7/30) → writeAuditLog
  → 201 { loginId, temporaryPassword, employee }
  → modal swaps to credentials panel; invalidate ['employees'], ['dashboard-summary']
```

**Working correctly:** the PRD §7.1 resolution is honoured — there is no public sign-up route anywhere in the router, and the Login page has no "Sign Up" link. The Login ID format matches PRD §7.1 (`AS2026007`). Account provisioning, leave-balance seeding and the audit row all commit in one transaction.

**Findings:** P1-1, P1-2, P2-3, P2-4, P2-5, P3-2, P3-3.

## Flow 3: Check in / check out

```
CheckInWidget (nav, rendered only when user.employeeId)
  → useQuery ['attendance-today'] → GET /api/attendance/today
  → click → POST /api/attendance/check-in
  → requireAuth → requireEmployeeProfile → attendance.service.checkIn
  → $transaction:
      SELECT events for [startOfDayUTC, +1d) ordered asc
      fold CHECK_IN/CHECK_OUT → `open` boolean
      if open → ATTENDANCE_ALREADY_CHECKED_IN 409
      INSERT AttendanceEvent(CHECK_IN)
      UPSERT AttendanceDaySummary { checkIn: now, checkOut: null,
                                    workedMinutes: null, PRESENT, isException: late }   ← P1-3
      writeAuditLog(ATTENDANCE_CHECK_IN)
  → invalidate ['attendance-today'], ['attendance-me'], ['dashboard-summary']
  → dot red→green, elapsed timer starts (30s tick)
```

**Working correctly:** the event log is genuinely append-only; the summary is derived, never hand-edited by a client; timestamps are server-set (`new Date()` in the service, never read from the request body). Duplicate check-in is rejected inside the transaction that performs the insert, so the guard and the write cannot diverge. Check-out symmetrically requires an open check-in.

**Findings:** P1-3, P1-11, P2-7, P2-8, P2-21, P3-9.

## Flow 4: Employee requests leave

```
TimeOffPage "NEW" → Modal
  → POST /api/leave/requests
  → requireAuth → requireEmployeeProfile → validate(createLeaveSchema)
  → leave.service.createLeaveRequest  (all pre-checks OUTSIDE the transaction ← P2-9)
      endDate >= startDate                            → VALIDATION_ERROR 400
      leaveType.requiresAttachment && !attachmentUrl   → LEAVE_ATTACHMENT_REQUIRED 400
      daysRequested = input.daysRequested ?? inclusive-calendar-days   ← P1-4
      findMany(PENDING|APPROVED) → in-memory overlap scan → LEAVE_OVERLAP 409
      available = allocated - used; days > available   → LEAVE_INSUFFICIENT_BALANCE 400
  → $transaction: create LeaveRequest(PENDING)
                  → notification fan-out to all HR_ADMIN users
                  → writeAuditLog(LEAVE_REQUESTED)
  → 201 → invalidate ['leave-requests'], ['leave-balance'], ['notifications']
```

**Working correctly:** all four validations named in `04_BACKEND_PROMPT.md` §Leave Module are implemented with the exact specified error codes. Sick Leave's `requiresAttachment` is seeded `true` and enforced server-side, not just in the form.

**Findings:** P1-4, P1-5, P2-6, P2-9, P2-10, P2-11, P3-8, P3-12, P3-13, P3-19.

## Flow 5: Admin approves leave — the critical path

```
TimeOffPage row → comment input → "Approve"
  → PATCH /api/leave/requests/:id/approve   body { comment }
  → requireAuth → requireRole(HR_ADMIN) → validate(reviewLeaveSchema)
  → leave.service.approveLeave — ALL inside one $transaction:
      1. re-fetch request; status !== PENDING → LEAVE_INVALID_STATE 409
      2. re-fetch balance; days > available   → LEAVE_INSUFFICIENT_BALANCE 400
      3. UPDATE LeaveRequest {APPROVED, reviewedById, reviewComment, reviewedAt}
      4. UPDATE LeaveBalance usedDays += days
      5. loop startDate..endDate: UPSERT AttendanceDaySummary status=LEAVE   ← P1-5, P2-12
      6. INSERT Notification(LEAVE_APPROVED) for request.employee.userId
      7. writeAuditLog(LEAVE_APPROVED, previous={PENDING}, new={APPROVED,...})
  → response includes buildWorkflow() step trail
  → admin: invalidate ['leave-requests'], ['dashboard-summary'], ['notifications']
  → employee (separate session): ??? ← P0-2
```

This is the flow the Execution Plan calls the demo's centrepiece, and the transaction itself is exactly what TRD §6 specifies — status, balance, notification and audit commit together or not at all. The state re-validation inside the transaction correctly closes the double-approve race at the database level.

Two things go wrong on either side of that transaction: the admin never sees it fail (**P0-1**), and the employee never sees it succeed (**P0-2**).

**Findings:** P0-1, P0-2, P1-5, P2-8, P2-12, P2-13, P2-14.

## Flow 6: Salary access control — the security demo

```
EmployeeProfile → "Salary Info" tab (rendered only if data.canViewSalary)
  → GET /api/employees/:id/salary
  → requireAuth → requireSelfOrAdmin('id')          [layer 1: route]
  → payroll.service.getSalary → assertCanViewSalary [layer 2: service]
  → structure + components, or null
```

**Verified correct — this is the strongest part of the codebase.** PRD Acceptance Criterion #4 holds: Employee A calling `/api/employees/{B}/salary` is rejected by `requireSelfOrAdmin` (`requireAuth.ts:52`) before the controller runs, and if that middleware were ever removed, `assertCanViewSalary` (`payroll.service.ts:11`) throws `FORBIDDEN` before any Prisma query is issued. There is no path by which salary data enters a response body for an unauthorised requester. The live "steal a coworker's salary" demo in Execution Plan §3.12 will behave as advertised.

The defects here are on the **product** side, not the security side: employees cannot see their *own* salary (P1-8), and there is no salary editor at all (P1-9).

**Findings:** P1-8, P1-9, P1-10, P2-15.

## Flow 7: Employee 360° / Audit / Health Score

```
GET /api/employees/:id/360   (HR_ADMIN)
  → profile + attendanceSnapshot(current month) + leaveSnapshot
  + salarySnapshot + recentActivity(auditLog, take 20)   ← P1-6 (filter never matches)

GET /api/audit-logs          (HR_ADMIN) — entityType/actorId/date filters, paginated
GET /api/dashboard/health-score (HR_ADMIN) — 0.4/0.2/0.2/0.2 formula + breakdown  ← P1-7
```

**Working correctly:** the audit trail is real and queryable — every mutation path (`EMPLOYEE_CREATED`, `EMPLOYEE_UPDATED`, `ATTENDANCE_CHECK_IN`, `ATTENDANCE_CHECK_OUT`, `LEAVE_REQUESTED`, `LEAVE_APPROVED`, `LEAVE_REJECTED`, `SALARY_UPDATED`) funnels through the shared `writeAuditLog(tx, …)` helper inside the caller's transaction, so an audit row can never be orphaned from the change it describes. The health score is genuinely deterministic and its formula is surfaced in the UI, satisfying the "no AI" constraint in PRD §12.

**Findings:** P1-6, P1-7, P2-18, P2-20, P3-5.

---

# Part 2 — Findings register

## P0 — Core functionality broken

### P0-1 · Leave approve/reject failures are silent — no error is ever shown
**Files:** `frontend/src/pages/leave/TimeOffPage.tsx:78-98, 186-216`

`create.isError` is rendered in the request modal (line 318), but `approve.isError` and `reject.isError` are **never referenced anywhere in the component**, and neither mutation defines `onError`. The `useMutation` results are used only for `.mutate()`.

Every server rejection therefore produces **zero UI feedback** — the row does not change, no toast appears, nothing is logged for the user:

| Server response | What the admin sees |
|---|---|
| `LEAVE_INVALID_STATE` 409 (already actioned elsewhere) | nothing |
| `LEAVE_INSUFFICIENT_BALANCE` 400 (balance consumed since submission) | nothing |
| `NOT_FOUND` 404 | nothing |
| 500 / network failure | nothing |

**Impact:** this is the demo's centrepiece action (Execution Plan §3.7) and the PRD's highest-value workflow. An admin who clicks Approve on a request that another admin already approved gets a UI indistinguishable from success, and will believe the leave is approved when it is not.

**Repro:** open the Time Off queue in two tabs as `priya@dayflow.local`; approve Rahul's pending request in tab A; click Approve on the same row in tab B. Tab B returns 409 and renders no change.

**Contrast:** `03_FRONTEND_PROMPT.md` §State — *"always handle and surface the server's validation error too, using the `{ success:false, message, code }` envelope."*

---

### P0-2 · Approved leave never reaches the employee's view without a manual reload
**Files:** `frontend/src/App.tsx:17`, `frontend/src/pages/leave/TimeOffPage.tsx:42-45`, `frontend/src/components/NotificationBell.tsx:15`

`refetchOnWindowFocus` is disabled **globally** (`App.tsx:17`), and the only query in the entire app with a `refetchInterval` is the notification bell (30 s). The `['leave-requests']` query has no polling, no focus refetch, and no invalidation trigger reachable from another browser session.

Consequence, in the employee's session after an admin approves:
- the bell badge updates within ≤30 s;
- the Time Off table **keeps showing `PENDING` indefinitely**;
- the leave-balance stat strip keeps showing the pre-approval figure;
- clicking the notification marks it read but invalidates only `['notifications']`.

**Violates:**
- PRD §7.6 — *"Status changes reflect immediately in the employee's view [PDF §3.5.2]"*
- PRD §9, Acceptance Criterion #3 — *"employee sees the update without a page reload delay beyond a refetch"*
- Execution Plan §3.8 — *"show the notification arrived and the leave status flipped to Approved instantly"*

**Repro:** split-screen Rahul and Priya. Priya approves. Rahul's bell increments; Rahul's table stays `PENDING` until F5.

**Note:** TRD §1 lists Socket.IO as an *optional* side-channel, so websockets are not required — but some refetch path (interval, focus refetch, or invalidate-on-notification) is required to meet the stated acceptance criterion, and none exists.

---

### P0-3 · The seed script destroys live data on every backend restart
**Files:** `backend/docker-entrypoint.sh:11-12`, `backend/prisma/seed.ts:361-365`

The container entrypoint runs `npx tsx prisma/seed.ts` unconditionally on every start, and the seed's `main()` executes:

```ts
await prisma.attendanceEvent.deleteMany();
await prisma.attendanceDaySummary.deleteMany();
await prisma.leaveRequest.deleteMany();
await prisma.notification.deleteMany();
await prisma.auditLog.deleteMany();
```

Combined with `restart: unless-stopped` in `docker-compose.yml`, **any** backend crash, `docker compose restart`, host reboot, or redeploy silently wipes all attendance history, every leave request, every notification, and **the entire audit log** — then repopulates fixtures.

**Impact:** the audit trail is described in PRD §4 as *"Every approval and edit is auditable after the fact"* and elevated to MUST-HAVE for judging. An append-only audit table that a routine process truncates is not an audit trail. In demo terms: a restart between the demo run and the judges' questions erases exactly the rows Execution Plan §3.10 says to point at.

**Repro:** `docker compose up -d`, log in, check in, request leave, note the audit rows → `docker compose restart backend` → audit log contains only the two seeded fixture rows.

---

## P1 — Important functionality issues

### P1-1 · Temporary passwords are predictable and identical across all hires
**File:** `backend/src/modules/auth/auth.service.ts:99`

```ts
const tempPassword = input.temporaryPassword || `Welcome@${joiningDate.getFullYear()}`;
```

The Add Employee form (`EmployeeDirectory.tsx:52-60`) never sends `temporaryPassword`, so **every employee provisioned through the UI receives the same password**, `Welcome@2026`, derived entirely from public information. Combined with P1-2 (accounts self-activate on first login) and the absence of any password-change flow (P1-12), knowing a colleague's work email is sufficient to authenticate as them until they happen to log in first.

**Expected:** cryptographically random temp password (e.g. 12+ chars from `crypto.randomBytes`), returned once to the admin as it already is.

---

### P1-2 · `PENDING_ACTIVATION` is not an access gate
**File:** `backend/src/modules/auth/auth.service.ts:55-64`

`login()` accepts `PENDING_ACTIVATION` accounts and silently promotes them to `ACTIVE`. Only `SUSPENDED` is rejected. The state therefore records nothing and gates nothing.

PRD §9 Acceptance Criterion #5 requires the account be created *"in a `PENDING_ACTIVATION`-equivalent state"* — it is created there, but the state has no behavioural meaning, so the criterion is satisfied only nominally. Related: `POST /api/auth/verify-email` (the endpoint whose job this is) has no UI caller at all (P3-3).

---

### P1-3 · A second check-in on the same day silently erases the first session's hours
**File:** `backend/src/modules/attendance/attendance.service.ts:104-110`

`checkIn` upserts the day summary with `update: { checkIn: now, checkOut: null, workedMinutes: null, … }`.

The event fold permits a second check-in once the first pair is closed (`open` is false after a `CHECK_OUT`), which is correct for a lunch-break workflow. But the summary update **nulls `checkOut` and `workedMinutes`**, and the subsequent `checkOut` computes `workedMinutes` only from the most recent `CHECK_IN` (`:171-174`).

Worked example — in 09:00, out 13:00, in 14:00, out 18:00:
- `AttendanceEvent`: 4 rows, fully correct.
- `AttendanceDaySummary`: `checkIn 14:00, checkOut 18:00, workedMinutes 240` → **HALF_DAY**.
- Actual worked time: 8 h. Reported: 4 h, and the day is misclassified.

`isException` is also recomputed from the *second* check-in, so a genuine late arrival is laundered by any later re-entry. Everything downstream (monthly totals, admin day view, health score, 360°) reads the summary, so the error propagates everywhere.

**Expected:** accumulate `workedMinutes` across all closed pairs for the day rather than overwriting; preserve the earliest `checkIn` of the day.

---

### P1-4 · `daysRequested` is client-supplied and never reconciled with the date range
**File:** `backend/src/modules/leave/leave.service.ts:78`

```ts
const daysRequested = input.daysRequested ?? daysBetweenInclusive(startDate, endDate);
```

`createLeaveSchema` accepts any positive number and the service trusts it verbatim. There is no check that it is consistent with `startDate`/`endDate`.

A raw API call with `startDate: 2026-09-01`, `endDate: 2026-09-30`, `daysRequested: 0.5` is accepted: the employee is absent for a month, blocks the whole range against future overlap checks, and consumes **half a day** of balance. The mirror case (`daysRequested: 25` over a 2-day range) over-deducts.

The `PATCH …/approve` path re-validates state and balance but **not** this relationship, so the bad value is committed to `LeaveBalance.usedDays`.

**Expected:** derive server-side, or validate `daysRequested <= daysBetweenInclusive(start, end)` and reject the mismatch.

**Note:** this is the clearest instance of the pattern PRD §8 warns against — *"never trust a client-supplied [value]"*.

---

### P1-5 · Weekends are deducted from leave balances
**File:** `backend/src/modules/leave/leave.service.ts:78, 317-337`

`daysBetweenInclusive` counts calendar days, and the approval loop marks every calendar day in the range as `AttendanceDaySummary.status = LEAVE` — Saturdays and Sundays included.

A Friday→Monday request consumes **4 days** of a 24-day allocation instead of 2, and paints two weekend rows as LEAVE. Those weekend LEAVE rows then enter the health-score denominator and the 360° `leaveDays` count.

This contradicts the codebase's own definition of a working day — `countWeekdays()` (`attendance.service.ts:249`) already excludes weekends for the monthly total, so the two halves of the attendance model disagree.

---

### P1-6 · Employee 360° "Recent activity" can never show attendance events
**Files:** `backend/src/modules/employees/employees.service.ts:333-336` vs `backend/src/modules/attendance/attendance.service.ts:119-126, 195-202`

The 360° query filters:

```ts
{ entityType: 'AttendanceEvent', entityId: id }   // id = Employee.id
```

but attendance audit rows are written with `entityId: event.id` — the `AttendanceEvent` UUID, not the employee's. **The predicate matches zero rows, always.**

The check-in/check-out history is therefore permanently absent from the screen the PRD calls the strongest admin surface (§10.3) and the Execution Plan schedules as demo step 9. The section renders as a short list of employee/leave/salary events with no indication anything is missing.

The sibling predicates are inconsistent in the same block: `SalaryStructure` audit rows *do* use `entityId: employeeId` (`payroll.service.ts:139`) and match; `LeaveRequest` matches but only across the 10 most recent requests loaded into `employee.leaveRequests`.

**Expected:** either store `entityId: employeeId` for attendance audits, or filter on `newValue.employeeId` / join through the event table.

---

### P1-7 · Workforce Health Score inflates as attendance worsens
**File:** `backend/src/modules/dashboard/dashboard.service.ts:70-77`

```ts
const attendanceRows = await prisma.attendanceDaySummary.findMany({ where: { date: {…} } });
const presentish   = attendanceRows.filter(PRESENT || HALF_DAY).length;
const expected     = Math.max(attendanceRows.length, 1);
const attendanceHealth = Math.min(1, presentish / expected);
```

The denominator is *rows that exist*. An absent employee produces **no** `AttendanceDaySummary` row (rows are only created by check-in or leave approval), so absences are excluded from both numerator and denominator.

The metric therefore measures "of the days someone showed up or was on leave, what fraction were present" — it rises toward 100 as attendance collapses. With the seeded data (only 5 of 8 employees have attendance rows) the 40%-weighted component reads near-perfect.

**Impact:** the health score's transparency *is* the feature (PRD §10.5, frontend prompt §10 — *"Show the formula, not just the number"*). Presenting a formula whose largest term is inverted is worse than omitting the screen. A judge who asks "what happens to this number if nobody comes in tomorrow?" gets the wrong answer.

**Expected:** denominator = active headcount × working days in window.

---

### P1-8 · Employees cannot see their own salary
**Files:** `backend/src/modules/employees/employees.service.ts:172`, `frontend/src/pages/employees/EmployeeProfile.tsx:34, 49`

The API is correct — `payroll.service.getSalary` permits self-access and returns `readOnly: true`. But `getEmployeeById` sets `canViewSalary: isAdmin`, and the tab list (`:49`) plus the query gate (`:34`, `user?.role === 'HR_ADMIN'`) both hard-code admin-only. **No employee can ever view their own pay in the UI.**

This is a genuine three-way spec conflict, not a simple bug:

| Source | Says |
|---|---|
| PRD §7.3, §7.7 | *"Employee can … view own payroll (read-only)"* — Employee: **read-only view of own salary** |
| Excalidraw annotation (x≈1138) | *"Salary Info tab Should only be visible to Admin"* |
| `03_FRONTEND_PROMPT.md` §4 | *"visible to `HR_ADMIN` only, full stop"* |
| Implementation | follows the wireframe + frontend prompt |

**This needs a product decision, not a patch.** The PRD is nominated as product source of truth and says employees see their own pay; the wireframe and the derived build prompt say otherwise. Flagging rather than assuming. Note the backend already implements the PRD reading, so whichever way it resolves, one side is currently dead code.

---

### P1-9 · Salary structure cannot be edited, and the wireframe's calculation model is unimplemented
**Files:** `backend/src/modules/payroll/payroll.service.ts:64-155`; no frontend caller

`PUT /api/employees/:id/salary` is fully built, transactional and audited — and **nothing in the frontend calls it**. `services/employees.ts` exposes only `getSalary`. PRD §7.7 requires *"Admin: view all, update salary structure"*; Execution Plan Phase 3 lists "salary edit" as MUST-HAVE-adjacent.

The backend's calculation model also diverges from the wireframe's explicit specification (Excalidraw note at x≈2347):

| Wireframe requires | Implementation |
|---|---|
| Basic = % **of Wage** (50% of 50,000 = 25,000) | `FIXED` only; wage never drives Basic |
| HRA = 50% **of Basic** | ✅ `PERCENT_OF_BASIC` |
| Fixed Allowance = wage − Σ(all other components) | plain `FIXED`, never derived |
| *"total of all components should not exceed the defined Wage"* | **not validated** |
| *"values should auto-update when the wage amount changes"* | recompute happens only on `PUT`, never from wage |

Additionally the "Basic" component is located by `c.name.toLowerCase().includes('basic')` (`:87`) — renaming it to "Base Pay" silently zeroes every percentage-derived amount, since `basicAmount` falls back to `0`.

---

### P1-10 · Seeded salary data is internally inconsistent with what the UI displays
**File:** `backend/prisma/seed.ts:96-99`

```ts
const monthlyWage = components
  .filter(c => !c.name.includes('Employer') && c.name !== 'Professional Tax')
  .reduce((s, c) => s + c.amount, 0);
```

For Rahul (`basic: 45000`) this yields `monthlyWage = 80,500` while `computedTotal` returned by the API (sum of *all* components, `payroll.service.ts:59`) is `86,100`, and Basic is 56% of the stated wage.

The Salary Info tab renders "Monthly wage ₹80,500" above a component table summing to ₹86,100 — components exceed the wage, which the wireframe explicitly forbids. This is the first screen a judge opens after the admin-only-tab talking point.

---

### P1-11 · Admins have no employee-side surface for attendance or leave
**Files:** `frontend/src/pages/attendance/AttendancePage.tsx:25-27`, `frontend/src/pages/leave/TimeOffPage.tsx:112-122`

```ts
if (user?.role === 'HR_ADMIN') return <AdminAttendance />;   // unconditional
…
actions={ !isAdmin ? <Button>NEW</Button> : undefined }      // no request button for admins
```

`HR_ADMIN` merges "Admin" and "HR Officer" (PRD §6) — Priya is a real employee with an `Employee` row, a salary structure, leave balances, and the check-in widget in her nav. But she can:

- check in and out — yet **never see her own attendance record** (`GET /attendance/me` supports her; no UI route reaches it);
- hold leave balances — yet **never see them** (`GET /leave/balance` works; nothing renders it for admins);
- **never file a leave request** for herself (no NEW button; the endpoint would accept it).

Her check-ins accumulate in a summary table she cannot read. With a single-admin organisation, HR staff are entirely unable to use the HR system.

---

### P1-12 · No password change anywhere in the system
**Files:** none — absent from `auth.routes.ts` and the frontend

The wireframe states this as a requirement (note at x≈−2389): *"There password should be auto generated for the first time by the system … They can login and change the system generated password."*

There is no `PATCH /api/auth/password`, no self-service change form, and no forced rotation on first login. Combined with P1-1 (`Welcome@2026`) and P1-2 (auto-activation), the system-generated password is permanent for every account.

---

## P2 — Edge cases

### P2-1 · Rate limiter and audit IPs are broken behind the nginx proxy
**Files:** `backend/src/app.ts` (no `trust proxy`), `backend/src/middleware/requireAuth.ts:26-29`, `frontend/nginx.conf:12-15`

Express is never configured with `app.set('trust proxy', …)`, and nginx forwards only `X-Real-IP` — not `X-Forwarded-For`. Two consequences in the Docker topology (the documented deployment):

1. **Rate limiting collapses to a single global bucket.** `express-rate-limit` keys on `req.ip`, which is the nginx container's address for every user. 30 failed logins from *anyone* locks out *everyone* for 15 minutes.
2. **Every audit row records the wrong IP.** `req.clientIp` reads `x-forwarded-for` (absent) then falls back to `req.socket.remoteAddress` = the nginx container IP. `AuditLog.ipAddress` is uniformly the proxy's address, making the field worthless for the auditability story.

`express-rate-limit` v7 also emits a `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR`-class validation warning in this configuration. **[unverified-runtime]**

---

### P2-2 · Login ID lookup is case-sensitive while email is not
**File:** `backend/src/modules/auth/auth.service.ts:34-36`

`identifier` is lower-cased for the email comparison, but the `loginId` branch uses `input.email.trim()` un-normalised. `AS2026007` authenticates; `as2026007` returns `Invalid credentials`. Login IDs are always displayed uppercase, so users will type them either way.

### P2-3 · Concurrent employee creation produces an opaque 500
**Files:** `backend/src/utils/loginIdGenerator.ts:19-31`, `backend/src/middleware/errorHandler.ts`

`generateLoginId` reads all matching IDs, takes max+1, and inserts — a classic read-modify-write race with no unique-violation retry. Two simultaneous hires in the same year collide on `User.loginId`.

More broadly, `errorHandler` has **no Prisma error mapping at all**: `AppError` and `ZodError` are handled, everything else becomes `500 INTERNAL_ERROR`. Every `P2002` (unique), `P2003` (FK), and `P2025` (record not found) surfaces to the client as an unexplained server error. Only the email collision is caught, because it is pre-checked explicitly.

### P2-4 · Login ID year is read in local time from a UTC date
**File:** `backend/src/utils/loginIdGenerator.ts:15`

`parseDateOnly('2026-01-01')` returns UTC midnight; `joiningDate.getFullYear()` reads it in the **host's local zone**. On any negative-UTC-offset host, a 1 January joining date yields `…2025…`. `generateEmployeeCode` (`:38`) has the identical defect.

### P2-5 · New leave types orphan existing employees
**File:** `backend/src/modules/auth/auth.service.ts:19-33`

Balances are created only at employee-creation time. Adding a fourth `LeaveType` later leaves every existing employee without a balance row, and `createLeaveRequest` then throws `Leave balance not configured` (404) — an error the UI surfaces as a raw message with no remedy.

### P2-6 · `parseDateOnly` accepts impossible calendar dates and silently rolls them over
**File:** `backend/src/utils/dates.ts:6-14`

The regex validates *shape*, not validity. `Date.UTC` then rolls over:
- `2026-02-31` → **2026-03-03**
- `2026-13-45` → **2027-02-14**

Zod guards every call site with the same shape-only regex, so garbage dates reach the database as plausible-looking wrong dates in leave ranges, joining dates and attendance queries — with no error at any layer.

### P2-7 · Attendance day boundaries and the lateness threshold are UTC-only
**Files:** `backend/src/utils/dates.ts:2-4`, `backend/src/modules/attendance/attendance.service.ts:47-51`

`startOfDay`/`todayUtc` define the attendance day in UTC, and `isLateCheckIn` compares `getUTCHours()` to the `LATE_CHECKIN_THRESHOLD` wall-clock string. For the product's stated locale (₹/INR, IST +05:30):

- the attendance day rolls over at **05:30 IST**, so an early-shift check-in books to the previous day;
- the "10:30" lateness threshold actually fires at **16:00 IST**, so no normal late arrival is ever flagged — while every check-in after 16:00 IST is.

The UI compounds the mismatch by rendering the same values with `toLocaleTimeString()` in browser-local time. The code comment at `:49` acknowledges the shortcut (*"treat as UTC for hackathon consistency"*), but the exception rule is consequently inert.

### P2-8 · Nothing prevents checking in on approved leave, and either write clobbers the other
**Files:** `attendance.service.ts:96-111`, `leave.service.ts:317-337`

`AttendanceDaySummary.status` is a single field written by two independent paths with no reconciliation:
- check-in on a `LEAVE` day overwrites the status to `PRESENT`, erasing the leave marking;
- approving backdated leave over a worked day overwrites `PRESENT` → `LEAVE` while retaining that day's `checkIn`/`checkOut`/`workedMinutes`, producing a row that reads "on leave, worked 8 h".

Neither path validates against the other.

### P2-9 · Leave validation runs outside the transaction that commits
**File:** `backend/src/modules/leave/leave.service.ts:85-125` vs `:127`

Overlap and balance checks execute as separate queries *before* `prisma.$transaction`. Two concurrent submissions from the same employee can both pass validation and both insert. The approval path re-checks balance inside its transaction (so the balance cannot actually go negative), but overlapping `PENDING` rows can exist in the database despite `LEAVE_OVERLAP` being the documented guarantee.

### P2-10 · Pending requests do not reserve balance
**File:** `backend/src/modules/leave/leave.service.ts:114-125`

`usedDays` increments only on approval. Two non-overlapping pending requests can each individually fit the allocation while jointly exceeding it. Both are accepted; the second **approval** then fails with `LEAVE_INSUFFICIENT_BALANCE` — surfacing the conflict at the worst possible moment, in the admin's queue, and (per P0-1) with no error displayed.

### P2-11 · Overlap scan loads an employee's entire leave history into memory
**File:** `backend/src/modules/leave/leave.service.ts:85-100`

`findMany` retrieves **all** `PENDING`/`APPROVED` requests ever recorded for the employee, then loops in JS. A date-range predicate (`startDate <= newEnd AND endDate >= newStart`) would let Postgres use the existing `@@index([startDate, endDate])`. Unbounded growth per employee-year.

### P2-12 · Long leave approvals risk exceeding the Prisma transaction timeout
**File:** `backend/src/modules/leave/leave.service.ts:317-337`

The approval transaction performs `N` sequential `upsert` round-trips inside the loop, one per calendar day. For a 30-day unpaid leave that is ~36 round-trips within a single interactive transaction against Prisma's 5 s default timeout. On a slow or contended connection the transaction aborts and the approval fails — correctly rolled back, but with no visible error (P0-1). **[unverified-runtime]**

**Expected:** `createMany`/`updateMany` over the generated date list rather than a per-day loop.

### P2-13 · Approve/Reject buttons are not disabled while in flight
**File:** `frontend/src/pages/leave/TimeOffPage.tsx:188-215`

Neither button sets `disabled={approve.isPending}`. Double-clicking fires two requests; the second returns `LEAVE_INVALID_STATE` 409 and is swallowed (P0-1). The transaction prevents a double-decrement, so this is a UX defect rather than a data defect.

### P2-14 · The admin leave queue has no status filter and no default scoping
**File:** `frontend/src/pages/leave/TimeOffPage.tsx:42-45`

`listLeaveRequests({ status: undefined })` fetches every request in every state, unpaginated in the UI, ordered by `createdAt desc`. The backend supports `?status=` and `?employeeId=` filters that the UI never exposes. Pending items — the only actionable ones — are interleaved with historical approvals and rejections. At any realistic volume the approval queue becomes unusable.

### P2-15 · A failed salary request renders as "No salary structure configured"
**File:** `frontend/src/pages/employees/EmployeeProfile.tsx:195`

```tsx
{salary.data == null && !salary.isLoading && (<p>No salary structure configured.</p>)}
```

`salary.isError` is never checked. A 403, 500 or network failure produces `data === undefined` and therefore renders as a confident statement of fact about the employee's compensation. An error state masquerading as data is worse than a visible failure — an admin could reasonably conclude payroll was never set up.

### P2-16 · `SUSPENDED` is unreachable — offboarded employees keep full access
**Files:** `backend/prisma/schema.prisma:17`, `auth.service.ts:47-49`, `employees.schema.ts:19`

`login()` rejects `SUSPENDED` accounts, but **no endpoint can ever set that status**. `PATCH /employees/:id` exposes `employmentStatus` (a different, free-text `Employee` field) which has no effect on authentication.

A terminated employee retains login, check-in, leave-request and own-salary access indefinitely. `employmentStatus: 'INACTIVE'` also produces an inconsistency: such employees are excluded from `headcount` (`dashboard.service.ts:12`) but still appear in the directory and the admin attendance day view, which apply no filter (`employees.service.ts:38`).

### P2-17 · `/profile` renders an error when an admin has no employee record
**File:** `frontend/src/pages/employees/EmployeeProfile.tsx:22, 28, 62`

`employeeId` resolves to `''`, the query is disabled, and in TanStack Query v5 `isLoading` (`isPending && isFetching`) is therefore `false` with `data === undefined` — falling through to `ErrorState "Failed to load profile"`. Not reachable with seeded data (Priya has an `Employee` row) but reachable for any `HR_ADMIN` user created without one, which the schema permits (`User.employee` is optional).

### P2-18 · Employee directory silently truncates at 50
**Files:** `frontend/src/services/employees.ts:7`, `frontend/src/pages/employees/EmployeeDirectory.tsx:36`

`pageSize: 50` is hard-coded, `page` is accepted by the service wrapper but never passed, and the returned `pagination` envelope is discarded. Employee 51 is invisible with no indication that results were cut. The same pattern applies to the audit log (page 1, `pageSize: 50`) and the leave list. PRD §8 requires pagination on exactly these three views.

### P2-19 · Admin attendance day view is unpaginated server-side
**File:** `backend/src/modules/attendance/attendance.service.ts:281-289`

`findMany` with no `take` loads every employee plus a second unbounded query for their summaries. The only list endpoint in the API without pagination.

### P2-20 · Audit `previousValue` captures three fields regardless of what changed
**File:** `backend/src/modules/employees/employees.service.ts:276-280`

```ts
previousValue: { phone, address, designation }
```

`newValue` is the full request body, but the "before" snapshot is hard-coded to three fields. Editing a bank account number, PAN or department records the new value with no prior value — the diff view in the audit UI shows a change appearing from nowhere. TRD §3 specifies before/after capture; the audit's usefulness for exactly the sensitive fields is lost.

### P2-21 · Monthly attendance compares present days against the whole month
**File:** `backend/src/modules/attendance/attendance.service.ts:225-227`

`totalWorkingDays = countWeekdays(monthStart, monthEnd)` counts the full month including future dates. On 5 August an employee with perfect attendance sees **"Days present 3 / Working days 21"**, which reads as a 14% attendance rate. The wireframe's intent ("Count of days present" beside "Total working days") is ambiguous, but presenting the pair without an as-of qualifier is actively misleading mid-month.

---

## P3 — Improvements / polish

### Missing UI against implemented backends
- **P3-1** — `POST /api/auth/verify-email` has no caller anywhere in the frontend.
- **P3-2** — The Add Employee form omits the role selector; every hire is hard-coded `role: 'EMPLOYEE'` (`EmployeeDirectory.tsx:59`), though the API accepts `HR_ADMIN` and PRD §7.1 lists Role as a registration field. A second HR admin can only be created by editing the seed.
- **P3-3** — The form also omits phone, address, DOB, gender, nationality, manager and the About fields, all accepted by `createEmployeeSchema`.
- **P3-4** — `GET /attendance/:id/timeline` returns 120 `events` alongside `days`; the UI renders only `days` and discards the events payload.
- **P3-5** — Audit log filters by `actorId` and date range exist server-side; the UI exposes only `entityType`.

### Wireframe elements not built
- **P3-6** — **Resume** field on the profile Info tab. `EmployeeDocument` is modelled and returned by `getEmployeeById`, but has no routes and is never rendered.
- **P3-7** — **Certifications** section on the About tab (`certifications` is fetched and dropped) and the **"+ Add Skills"** affordance — skills are read-only in the UI.
- **P3-8** — **Employee** field (read-only, self) as the first row of the Time Off Request modal.
- **P3-9** — Employee card **status semantics**: the wireframe specifies 🟢 present / ✈️ on leave / 🟡 absent-without-leave. `AttendanceDot` renders only green (checked in) / red (not), so "on leave", "absent", and "went home for the day" are indistinguishable.
- **P3-10** — **Profile photos**. `profilePictureUrl` is in the schema, the DTO and the self-edit allowlist, but no `<img>` is rendered anywhere; cards show initials. The wireframe's directory is photo-first.
- **P3-11** — **Employee landing stat strip**. PRD §7.2's resolution requires today's status + leave balance visible on the employee's landing screen; `/profile` shows neither, and `GET /dashboard/summary` returns exactly that payload for employees but is consumed only by the admin directory.

### No file uploads
- **P3-12** — Sick-leave certificates, resumes and profile pictures are all URL text inputs. No multipart middleware, no storage. Demo step §3.4 ("attach a file") can only be performed by pasting a URL.
- **P3-13** — Because the attachment input carries `required` + `type="url"`, the browser blocks submission first, so the server-side `LEAVE_ATTACHMENT_REQUIRED` rule can never be demonstrated through the UI — which is precisely what Execution Plan §3.4 asks to show.

### Frontend robustness
- **P3-14** — **No mobile navigation.** `AppShell.tsx:31` is `hidden … md:flex` with no hamburger fallback. Below 768 px the app has a logo, check-in widget, bell and avatar — and no route to Employees, Attendance or Time Off.
- **P3-15** — Neither the avatar menu (`AppShell.tsx:71`) nor the notification panel closes on outside click or Escape.
- **P3-16** — `Modal.tsx` has no focus trap, no Escape handler, no backdrop dismissal, no `role="dialog"`/`aria-modal`, and no focus restoration.
- **P3-17** — `alert('Comment required to reject')` (`TimeOffPage.tsx:207`) is the only native dialog in the app and bypasses the design system's inline error pattern.
- **P3-18** — Missing empty states: `Employee360` renders bare `<ul>`s for empty `recentRequests`/`recentActivity`; `NotificationBell` has no loading or error state; `WorkforceHealth` has no empty state.
- **P3-19** — Invalid date ranges give no client feedback: `onDateChange` (`TimeOffPage.tsx:100-103`) falls back to `1` when `end < start`, so the Allocation field shows "1" beside an inverted range until the server rejects it.
- **P3-20** — Clicking Edit on the Private Info / Salary / About tabs shows a Save/Cancel bar with no editable fields; Save submits an unchanged `{phone, address}` and writes an audit row for a no-op.
- **P3-21** — Search fires one request per keystroke (`['employees', search]`, `['attendance-admin', date, search]`) with no debounce.
- **P3-22** — Unlocalised formatting: `toLocaleDateString()`/`toLocaleTimeString()` with no locale or options (times render with seconds in dense table cells); `₹` amounts use `toLocaleString()` without `en-IN`, so ₹12,50,000 renders as `1,250,000`.
- **P3-23** — Profile tab state is local `useState` — lost on reload, not linkable, and the salary fetch is gated on `tab === 'salary'` so tab switching is the only trigger.

### Type safety and hygiene
- **P3-24** — `getEmployee` returns `Record<string, unknown>`; `EmployeeProfile` casts with `String(...)` throughout. `03_FRONTEND_PROMPT.md` §Folder Structure asks types to *"mirror the backend's DTOs — do not redefine shapes ad hoc per component"*.
- **P3-25** — Dead code: the `access: 'directory'` branch (`employees.service.ts:165-172`) and its matching UI branch (`EmployeeProfile.tsx:69`) are unreachable — `requireSelfOrAdmin('id')` 403s first, and `GET /employees` is admin-only, so employees have no coworker directory at all. `04_BACKEND_PROMPT.md` flagged this ambiguity and asked for confirmation; both answers were half-built.
- **P3-26** — Unused assets: `src/App.css`, `public/icons.svg`, `src/assets/hero.png`, `react.svg`, `vite.svg`.
- **P3-27** — `README.md` documents a `frontend/src/pages/payroll/` directory that does not exist.
- **P3-28** — `Unpaid Leave` is allocated a finite 30 days, which PRD §7.6 implies it should not have.
- **P3-29** — JWT lives in `localStorage`. The frontend prompt permits this as *"a clearly-labeled, explicitly-noted shortcut"* — it is nowhere labelled.
- **P3-30** — The 401 interceptor uses `window.location.href = '/login'`, a full reload that discards React state and shows no session-expired message.
- **P3-31** — Login credentials are hard-coded into component state (`Login.tsx:11-12`), so the form can never render empty without a code change.
- **P3-32** — `bcrypt.compare` is skipped entirely when the user is not found (`auth.service.ts:43`), leaving a timing side-channel for user enumeration.
- **P3-33** — `/health` is mounted outside `/api`, so nginx does not proxy it; the frontend container cannot health-check the backend.
- **P3-34** — Notification delivery is a 30 s poll, described as "instantly" in the demo script.

### Testing
- **P3-35** — **No tests and no test runner.** TRD §10 asks specifically for service-level tests on *leave-overlap validation* and *the salary access guard*, on the stated grounds that those are the two things a judge will probe live. Neither exists. Given P1-4 (unvalidated `daysRequested`) and P2-9 (validation outside the transaction), the leave service is exactly where tests would have paid.

---

# Part 3 — PRD/TRD coverage matrix

## Functional requirements (PRD §7)

| Requirement | Status | Ref |
|---|---|---|
| §7.1 No public registration | ✅ | — |
| §7.1 Login ID auto-generation `AS2026007` | ✅ | P2-3, P2-4 (races/TZ) |
| §7.1 Password security rules | ❌ | P1-1 |
| §7.1 Email verification / activation | ⚠️ nominal | P1-2, P3-1 |
| §7.2 Role-aware landing (no separate dashboard) | ⚠️ admin only | P3-11 |
| §7.3 RBAC enforced server-side on every request | ✅ | — |
| §7.4 Profile tabs (Info/Private/Salary/About) | ⚠️ | P1-8, P3-6, P3-7 |
| §7.4 Self-editable = address/phone/photo only | ✅ | — |
| §7.4 Admin edits everything | ❌ UI exposes 2 fields | P1-9 (salary), §Part 2 |
| §7.4 Directory: search, NEW, cards, view-only click-through | ✅ | P3-9, P3-10 |
| §7.5 Statuses Present/Absent/Half-day/Leave | ⚠️ ABSENT absent from self view | P2-21 |
| §7.5 Employee monthly view + day table | ✅ | P2-21 |
| §7.5 Admin date-scoped all-employee view | ✅ | P2-19 |
| §7.5 Check-in/out systray widget | ✅ | P1-3 |
| §7.6 Leave types Paid/Sick/Unpaid | ✅ | P3-28 |
| §7.6 Request modal per wireframe | ⚠️ | P3-8, P3-12 |
| §7.6 Balances + own-records table | ✅ | — |
| §7.6 Admin approve/reject with comments | ⚠️ works, fails silently | **P0-1** |
| §7.6 Status reflects immediately in employee view | ❌ | **P0-2** |
| §7.6 Prevent overlap / non-admin approval / over-allocation | ⚠️ | P1-4, P2-9, P2-10 |
| §7.7 Employee read-only own salary | ❌ | P1-8 |
| §7.7 Admin view all / update structure | ⚠️ view only | P1-9 |

## Non-functional requirements (PRD §8)

| Requirement | Status | Ref |
|---|---|---|
| JWT + bcrypt + server-side RBAC | ✅ | — |
| Salary/attendance checked against requester on every request | ✅ | verified two-layer |
| Auditability: every create/update/approve audited | ⚠️ | **P0-3**, P2-1, P2-20 |
| Consistency: approval & check-in transactional | ✅ | P2-12 (timeout risk) |
| Performance: paginated + indexed lists | ⚠️ server yes, UI no | P2-18, P2-19 |
| Usability: loading/empty/error on every list; role-aware nav | ⚠️ | P2-15, P3-14, P3-18 |

## Acceptance criteria (PRD §9)

| # | Criterion | Verdict |
|---|---|---|
| 1 | Check-in: server timestamp, duplicate rejected, dot green | ✅ Pass |
| 2 | Sick leave: attachment required, overlap blocked, appears Pending instantly | ✅ Pass |
| 3 | Approve: atomic + balance decrements + **employee sees update without reload** | ❌ **Fail (P0-2)** |
| 4 | Employee fetching a coworker's salary gets 403, no payload | ✅ **Pass** — verified two-layer |
| 5 | Add employee: Login ID generated, `PENDING_ACTIVATION`, no public signup | ⚠️ Partial (P1-2) |

## TRD conformance

| Section | Status |
|---|---|
| §1 Modular monolith, thin controllers / fat services | ✅ faithful |
| §2 Two-role model, roles declared per route | ✅ |
| §3 Prisma schema | ✅ matches spec essentially line-for-line |
| §4 `requireAuth` / `requireRole` / `requireSelfOrAdmin` | ✅ |
| §5 Response envelope + all 24 endpoints | ✅ all present |
| §6 Transaction strategy | ✅ leave approval and check-in both correct |
| §7 Security (bcrypt 12, 2h JWT, zod, helmet, CORS, rate limit) | ⚠️ P1-1, P2-1 |
| §8 Indexes for list-view queries | ✅ |
| §10 Service tests for overlap + salary guard | ❌ P3-35 |
| §11 `migrate deploy` + seed on the demo DB | ⚠️ **P0-3** |

---

# Part 4 — Verified working

Recorded so a later pass does not re-litigate these:

- **Salary authorization (PRD AC#4)** — two independent layers; no code path returns salary data to an unauthorised requester. The live security demo will work as scripted.
- **Leave approval transaction (TRD §6)** — status, balance, notification and audit commit atomically; the in-transaction `status === PENDING` re-check genuinely closes the double-approve race.
- **Check-in transaction** — duplicate detection and the event insert share one transaction, so the guard cannot drift from the write. Timestamps are server-set and never client-supplied.
- **Event-sourced attendance** — `AttendanceEvent` is append-only and correct in every case, including the multi-session day that P1-3 mis-summarises. The raw history is intact and the summary is rebuildable.
- **Self-edit field allowlist** — disallowed fields are **rejected** with a 400 naming them, not silently dropped, exactly as `04_BACKEND_PROMPT.md` specifies.
- **Audit writer** — one shared helper, always called with the caller's `tx`, so audit rows cannot orphan from their mutations.
- **Response envelope** — `{ success, message, data }` / `{ success, message, code }` is used uniformly; error codes match the TRD's published set exactly.
- **Prisma schema** — every model, enum, `@@index` and `@@unique` from TRD §3 is present, with one benign addition (`onDelete: Cascade` on `SalaryComponent`).
- **Route guards** — `RequireAuth` and `RequireRole` redirect rather than hide; admin routes are unreachable by URL for employees.
- **Zod validation at the controller boundary** — every mutating endpoint validates before reaching a service.

---

# Part 5 — Suggested remediation order

Nothing below has been implemented; this is sequencing advice only.

**Before anything else (data integrity):**
1. **P0-3** — guard the seed behind `SEED_ON_BOOT` / `NODE_ENV !== 'production'`, or make it additive. One line in `docker-entrypoint.sh` stops ongoing data loss.

**Then the demo-critical write path:**
2. **P0-1** — render `approve.isError` / `reject.isError`; add `disabled={isPending}` (P2-13) in the same edit.
3. **P0-2** — add `refetchInterval` to `['leave-requests']`, or invalidate it when a notification arrives.

**Then correctness of what is displayed:**
4. **P1-4** — validate `daysRequested` against the date range (highest-value single validation fix).
5. **P1-3** — accumulate `workedMinutes` across same-day pairs.
6. **P1-7** — fix the health-score denominator.
7. **P1-6** — fix the 360° attendance audit predicate.
8. **P1-5** — exclude weekends from leave-day counting.

**Then product decisions (need an answer before code):**
9. **P1-8** — can employees see their own salary? PRD says yes, wireframe and frontend prompt say no.
10. **P3-25** — do employees get a coworker directory? Both answers are currently half-built.

**Then completeness:**
11. **P1-11** (admin employee-side views), **P1-9** (salary editor), **P1-12** (password change), **P1-1** (random temp passwords), **P3-14** (mobile nav).

---

*End of audit. No implementation files were modified.*
