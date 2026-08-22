# Dayflow — Frontend Build Prompt

*Paste this whole file as the opening prompt to Claude Code (or another coding agent) in your `frontend/` repo. It is self-contained — it does not assume the agent has read the PRD/TRD, though you should keep those alongside for reference if questions come up.*

---

You are building the **frontend for Dayflow**, an internal HR Management System, for a 12-hour hackathon. Build for **correctness and a clean live demo**, not maximal feature count. Ship a working vertical slice before adding polish.

## Stack (fixed — do not substitute)
React 18 + TypeScript + Vite, TailwindCSS, React Router v6, React Query (TanStack Query) for all server state, `axios` for the HTTP client. No Redux — React Query + local component state is sufficient for this scope.

## Design Direction

Clean, dense, Odoo-inspired enterprise UI — **not** a marketing-site aesthetic. Prioritize scanability over decoration: real information density in tables, generous whitespace only where it aids reading, not for its own sake.

**Persistent top navigation on every authenticated screen** (this is a real requirement from the design, not optional): `Company Logo | Employees | Attendance | Time Off` on the left, an **avatar with a dropdown** (`My Profile`, `Log Out`) on the right. `Employees` only renders for `HR_ADMIN`. Route-highlight the active nav item.

Color/status conventions to keep consistent everywhere they appear:
- Attendance status dot: **green = checked in, red = checked out/not present**.
- Leave status badges: Pending = amber/neutral, Approved = green, Rejected = red.
- Keep one accent color for primary actions (Submit, Approve, Check In) and a distinct neutral for secondary/destructive (Discard, Reject).

## Screens to build (grounded in the actual wireframe — build these, not a generic dashboard)

### 1. Auth
- **Login** — Login ID/Email + Password, "Don't have an account? Sign Up" link **hidden by default** (see note below), inline error on bad credentials, redirect to role-aware landing on success.
- There is **no public Sign Up**. Employee accounts are created by `HR_ADMIN` from inside the Employees screen (see #3). If you're tempted to build a public registration form, don't — it directly contradicts how this system provisions accounts. If asked to reconsider this, treat it as a real product decision to confirm with the user, not something to silently rebuild.

### 2. Landing (role-aware — there is no separate empty "Dashboard" page)
- **Employee** lands on their own **Profile** or **Attendance** view, with today's check-in status and current leave balance visible immediately (small stat strip at the top).
- **HR_ADMIN** lands on the **Employees** directory, with a small stats strip (headcount, pending leave count, today's attendance %).

### 3. Employees (HR_ADMIN only)
- Search bar + **"NEW"** button (opens the Add Employee form — this *is* the account-provisioning flow; on submit it shows the system-generated Login ID, e.g. `AS2026007`, back to the admin).
- Grid of employee cards: photo, name, role/department, a small colored dot for today's attendance status.
- Clicking a card opens that employee's profile in **view-only mode** first — editing is a separate explicit "Edit" action, not the default state of the click-through.

### 4. Employee Profile (`/employees/:id` for Admin, `/profile` for self)
Tabbed layout. Build tabs conditionally based on viewer role + whether it's the viewer's own profile:
- **Info** (always visible): Name, Company, Login ID, Department, Email, Manager, Mobile, Location, Resume link/upload, Job Position, Date of Joining, Emp Code.
- **Private Info** (Admin viewing anyone, or self viewing own): DOB, Gender, Marital Status, Nationality, Residing Address, Personal Email, Bank Name, Account Number, IFSC Code, PAN No, UAN No.
- **Salary Info** — **visible to `HR_ADMIN` only, full stop, even when viewing your own profile as an admin viewing someone else's.** An `EMPLOYEE` role must never render this tab, and the frontend must not rely on hiding it as the only protection — the API won't return the data to them either (see backend prompt), but don't skip the UI-level check as a UX courtesy.
- **About**: bio, "What I love about my job", skills (tag list, "+ Add Skills"), interests, certifications.
- Editable fields differ by viewer: an `EMPLOYEE` viewing their own profile can edit only Address, Phone, Profile Picture. `HR_ADMIN` can edit everything. Enforce this by disabling/hiding fields — but remember the backend is the real gate, not this.

### 5. Attendance
Two different components behind one route, switched by role — do not build one generic table and hope it fits both:
- **Employee view**: monthly summary cards (Days Present / Total Working Days / Leave Count) + a day-by-day table (Date, Check In, Check Out, Work Hours, Extra Hours) for the current month, with month navigation (`<-` `->`).
- **Admin view**: a date-picker-driven table of *every* employee's Check In / Check Out / Work Hours / Extra Hours for the selected date, with search.
- **Check-In/Check-Out widget**: a small persistent control (top nav area is a reasonable spot) — one button that toggles between "Check In" and "Check Out" depending on current state, a colored status dot, and an elapsed-time display once checked in. This should feel like a systray widget, not a full-page action.
- **Attendance Timeline** (differentiator): a chronological list per employee — Date → Check-in time → Check-out time → duration → status (Present/Half-day/Leave), including leave days inline so the story of a week reads in one scroll.

### 6. Time Off / Leave
- **Employee view**: balance cards ("Paid Time Off: 24 Days Available", "Sick Time Off: 07 Days Available"), a **"NEW"** button opening the request modal, and a personal request table (Start Date, End Date, Type, Status) — own records only.
- **Admin/HR view**: the same table shape but for *all* employees, with visible **Approve** / **Reject** buttons per row and a comment field on approve/reject.
- **Time Off Request modal** (exact fields from the design — build this precisely): Employee (read-only, self), Time Off Type (dropdown: Paid / Sick / Unpaid), Validity Period (date range picker), Allocation (days — can auto-calculate from the date range but leave editable), Attachment upload (**only shown/required when Type = Sick**), Submit / Discard.
- Approval workflow visualization (differentiator): show `Submitted → Pending HR Review → Approved/Rejected` as a small status trail on each request's detail view, with approver name + timestamp + comment once resolved.

### 7. Notifications
A bell icon in the nav with an unread-count badge; dropdown or side-panel list; mark-as-read on open/click. Content: leave approved/rejected (employee), new leave request / attendance exception (admin).

### 8. Employee 360° (Admin only, differentiator)
One consolidated screen per employee: Profile summary + Attendance snapshot + Recent leave requests + Salary snapshot + Recent activity (from audit log) — this is your strongest single admin screen, treat it as such visually.

### 9. Audit Log (Admin only)
Filterable table: Actor, Action, Entity, Timestamp, expandable row for before/after values.

### 10. Workforce Health Dashboard (Admin only, differentiator)
A score (0–100) with a visible breakdown of the four inputs (Attendance 40%, Leave Workflow 20%, Attendance Exceptions 20%, Pending HR Actions 20%). Show the formula, not just the number — that transparency *is* the feature (explicitly rule-based, no AI language anywhere in the UI copy).

## State, Data Fetching, and Error Handling

- All server data through React Query: `useQuery` for reads, `useMutation` for writes, invalidate the relevant query keys on mutation success (e.g. approving a leave request invalidates both the admin's leave list and that employee's balance).
- Every list view needs three explicit states beyond the happy path: **loading** (skeleton, not a spinner-only blank screen), **empty** ("No leave requests yet" — not a blank table), **error** (retry affordance, not a silent failure).
- Form validation client-side for UX (immediate feedback on bad date ranges, missing required attachment), but never treat client validation as the source of truth — always handle and surface the server's validation error too, using the `{ success: false, message, code }` envelope from the API (see TRD §5).
- Auth: store the JWT (memory + refresh-on-load via a `/me` call, or httpOnly cookie if the backend supports it — don't put it in `localStorage` if you can avoid it, but for a 12-hour hackathon a clearly-labeled localStorage token is an acceptable, explicitly-noted shortcut). Attach it via an axios interceptor. On 401, redirect to Login and clear state.
- Protected routes: a `<RequireAuth>` wrapper, and a `<RequireRole role="HR_ADMIN">` wrapper for admin-only routes — redirect (not just hide) unauthorized access attempts.

## Folder Structure

```
frontend/src/
├── components/       # Button, StatusBadge, DataTable, EmptyState, LoadingSkeleton, Modal, DateRangePicker, AttendanceStatusDot
├── layouts/          # AppShell (top nav + outlet), AuthLayout
├── pages/
│   ├── auth/          Login.tsx
│   ├── employees/      EmployeeDirectory.tsx  EmployeeProfile.tsx  AddEmployeeForm.tsx  Employee360.tsx
│   ├── attendance/    MyAttendance.tsx  AdminAttendance.tsx  AttendanceTimeline.tsx
│   ├── leave/          MyLeave.tsx  AdminLeave.tsx  LeaveRequestModal.tsx
│   ├── payroll/        SalaryTab.tsx
│   └── admin/          AuditLog.tsx  WorkforceHealth.tsx
├── hooks/             useAuth.ts  useCurrentUser.ts
├── services/          api client wrappers per module (employees.ts, attendance.ts, leave.ts, ...)
├── api/               axios instance + interceptor
├── routes/            RequireAuth.tsx  RequireRole.tsx  router.tsx
├── types/             mirror the backend's DTOs — do not redefine shapes ad hoc per component
└── App.tsx
```

## API Contract

Consume the endpoints exactly as defined in the TRD (`02_TRD.md` §5) and the backend prompt — same response envelope (`{ success, message, data }` / `{ success: false, message, code }`), same routes, same role gates. If the backend isn't ready yet for a given screen, build against a typed mock that matches the documented shape exactly, so swapping in the real API later is a one-line change in `services/`, not a rewrite.

## Build Order (match the backend's phases — see Execution Plan for the full 12-hour schedule)

1. Auth shell: Login page, AppShell nav, protected routing, role-aware landing redirect.
2. Employees directory + profile (view-only first, then edit) + Add Employee form.
3. Attendance: check-in/out widget + both list views.
4. Leave: request modal + both list views + approve/reject.
5. Salary tab (Admin-gated) + Notifications.
6. Differentiators in priority order: Audit Log → Attendance Timeline → Employee 360° → Approval workflow visualization → Workforce Health Score.
7. Pass over every screen for loading/empty/error states and responsive behavior — do this last, deliberately, not screen-by-screen, so it doesn't eat time you need for core flows.

Do not start on any item in step 6 before steps 1–4 work end-to-end against the real (or accurately mocked) API. A judge will forgive a missing health-score widget; they will not forgive a leave-approval flow that doesn't actually work live.
