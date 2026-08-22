# Dayflow — Product Requirements Document (PRD)

**Product:** Dayflow — Human Resource Management System
**Context:** Odoo Hackathon 2026 (~12-hour build window)
**Sources used:** `Dayflow_HRMS.pdf` (functional spec, cited as **[PDF]**), `Human_Resource_Management_System_-_8_hours.excalidraw` (UI wireframe, cited as **[WIREFRAME]**)

### How to read this document
Every requirement below is tagged:
- **[Source — PDF]** — stated explicitly in the spec PDF
- **[Source — Wireframe]** — stated or shown explicitly in the Excalidraw design
- **[Recommendation]** — my architectural addition, not in either source
- **[Hackathon Enhancement]** — differentiator, optional but high judging value
- **[Future Scope]** — explicitly out of the 12-hour build

---

## 1. Executive Summary

Dayflow digitizes four core HR loops for a single organization: **who someone is** (profile), **when they worked** (attendance), **when they were away** (time off), and **what they're paid** (payroll visibility) — wrapped in role-based approval workflows and a permanent audit trail. It is scoped as an Odoo-style internal HR tool (Employees / Attendance / Time Off apps), not a public-facing product.

## 2. Product Vision

> A role-based, workflow-driven HRMS giving every employee a single place to manage their own work record, and giving HR/Admin a single place to manage everyone else's — with every state change (approval, edit, check-in) captured for audit.

Core data spine: **Employee → Attendance → Leave → Payroll (visibility) → Approvals → Notifications → Audit Log.**

## 3. Business Problem & Pain Points **[Source — PDF §1.1]**

HR operations (onboarding, attendance, leave, payroll visibility, approvals) are currently manual/fragmented. Dayflow centralizes them into one authenticated, role-based system.

## 4. Goals

- Give every employee self-service access to their profile, attendance, and leave. **[PDF]**
- Give Admin/HR a single console to manage employees, approve leave, and control payroll. **[PDF]**
- Enforce that no employee can ever see another employee's salary or attendance via the API, not just the UI. **[Recommendation]**
- Every approval and edit is auditable after the fact. **[Recommendation, elevated to MUST-HAVE for judging]**

## 5. Non-Goals

- Multi-company / multi-tenant support — **[Future Scope]**
- Full payroll *engine* (tax computation, statutory filings, payslip generation as PDFs) — **[Future Scope]**, see §18
- Recruitment, performance reviews, shift scheduling, biometric integration — **[Future Scope]**
- Sales / Purchase / Manufacturing / Inventory / any non-HR Odoo module — explicitly excluded per hackathon scope rule.

## 6. Target Users & Personas **[Source — PDF §2]**

| Persona | Role | Needs |
|---|---|---|
| **Priya, HR Officer** | Admin / HR Officer | Onboard employees fast, see who's late/absent today, clear leave queue, keep salary data locked down |
| **Rahul, Software Engineer** | Employee | Check in/out in one tap, see how much leave he has left, request leave, see his own payslip-equivalent |

Note: the spec uses **Admin** and **HR Officer** somewhat interchangeably as one privileged role class **[PDF §1.3, §2]**. Dayflow implements this as a single `HR_ADMIN` role for the hackathon, with the schema designed so it can be split into `ADMIN` and `HR_OFFICER` later without a migration rewrite (see TRD §Role Design).

## 7. Functional Requirements

### 7.1 Authentication **[Source — PDF §3.1]**
- Register with Employee ID, Email, Password, Role (Employee/HR) **[PDF §3.1.1]**
- Password must meet security rules; email verification required **[PDF §3.1.1]**
- Login via email + password; incorrect credentials show an error; success redirects to the landing view **[PDF §3.1.2]**

> ⚠️ **Contradiction to resolve — Self-registration vs. Admin-provisioned accounts.**
> The PDF describes a public Sign Up flow. The wireframe includes a Sign Up screen but also contains an explicit design note: *"Normal user cannot register, so when the HR officer or Admin creates a new user/employee, their ID should also be [auto-generated]"* **[WIREFRAME]**. This matches real Odoo behavior (HR never has public self-signup) and is the safer default for an internal HR tool.
> **Resolution (adopted for this build):** There is no public self-service registration. The "Sign Up" screen is repurposed as the **Admin's "Add Employee" form** — Admin/HR fills it in, the system auto-generates the Login ID and a temporary password, and the account is provisioned immediately (email verification becomes "activate your account" rather than a public gate). This is called out explicitly so it doesn't get built two contradictory ways.

- **Login ID auto-generation** **[Source — Wireframe]**: `[Initials][YearOfJoining][SerialNumber]` — first letter of first name + first letter of last name, uppercased, followed by 4-digit joining year, followed by a zero-padded sequence number for that year. Example: Aditi Sharma, 7th person hired in 2026 → `AS2026007`.

### 7.2 Landing / Dashboard

**[PDF §3.2]** specifies dashboard *cards*: Employee sees Profile / Attendance / Leave Requests / Logout shortcuts + recent activity; Admin sees Employee list / Attendance records / Leave approvals + ability to switch between employees.

> ⚠️ **Discrepancy to resolve — Dashboard vs. direct navigation.**
> The wireframe has **no separate "dashboard with cards" screen**. Instead it uses a persistent top nav — `Company Logo | Employees | Attendance | Time Off | Avatar⌄` — present on every screen, and an explicit note that after login the user lands directly on a working screen (Employees list, for Admin) **[WIREFRAME]**.
> **Resolution (adopted):** Build the wireframe's nav-bar pattern as the actual navigation (it's what's demo-ready and matches Odoo). Satisfy the PDF's "dashboard" requirement by making the **landing screen itself dashboard-aware**: Admin lands on Employees (with a small stats strip — headcount, pending leave, today's attendance %); Employee lands on their own Profile or Attendance (with today's status + leave balance visible at a glance). No separate empty "dashboard" page is built. This keeps one coherent screen instead of two competing home experiences.

### 7.3 Role-Based Access Control **[Source — PDF §2, §3.3, §3.4, §3.5, §3.6]**

**Admin / HR Officer can:** manage employees, view/edit all employee records, view all attendance, approve/reject leave with comments, view all payroll, update salary structure.
**Employee can:** view/edit limited own-profile fields, view own attendance, check in/out, apply for leave, view own leave status, view own payroll (read-only).
**Employee explicitly cannot:** edit another employee, approve leave, modify salary structure, view others' attendance, access HR admin data. **[PDF §3.3]**

This must be enforced **server-side on every request**, independent of what the UI shows **[Recommendation — see TRD Security]**.

### 7.4 Employee Profile Management **[Source — PDF §3.3, Wireframe]**

Self-view (`My Profile`) shows, per the wireframe: Company, Login ID, Department, Email, Manager, Mobile, Location, Resume, tabs for **Private Info**, **Salary Info** (Admin-only visibility, confirmed by an explicit wireframe annotation **[WIREFRAME]**), **About** (bio, "what I love about my job", skills, interests, certifications).

Admin's view of *another* employee's profile shows everything above **plus**: Job Position, Date of Joining, Emp Code, and a **Security / Bank Details** tab — Date of Birth, Residing Address, Nationality, Gender, Marital Status, Personal Email, Bank Name, Account Number, IFSC Code, PAN No, UAN No **[WIREFRAME]**.

Editable-by-employee fields: Address (Location), Phone (Mobile), Profile Picture **[PDF §3.3.2]**. Everything else is Admin-editable only.

Admin's Employees directory: search bar, "NEW" (add employee) button, a grid of employee cards (photo + basic info + an attendance-status indicator dot in the corner); clicking a card opens that employee's profile in **view-only mode** — editing is a separate explicit action **[WIREFRAME]**.

### 7.5 Attendance Management **[Source — PDF §3.4, Wireframe]**

Statuses: Present, Absent, Half-day, Leave **[PDF §3.4.1]**.

Two distinct attendance UIs, confirmed by the wireframe:
1. **Employee self-view** — monthly summary (days present, total working days, leave count) + a day-by-day table (Date, Check In, Check Out, Work Hours, Extra Hours) **[WIREFRAME]**.
2. **Admin/HR view** — a date-scoped list of *all* employees' check-in/check-out/work-hours for that day, with a date-picker and search **[WIREFRAME]**.

A **Check-In/Check-Out widget** (a small persistent "systray" control, not a full page) lets an employee punch in/out with a status dot (red = out, green = in) and shows elapsed time since check-in **[WIREFRAME]**. Employee can view own attendance only; Admin/HR can view everyone's **[PDF §3.4.2]**.

### 7.6 Leave / Time-Off Management **[Source — PDF §3.5, Wireframe]**

Leave types: **Paid Time Off, Sick Leave, Unpaid Leave** **[PDF §3.5.1, WIREFRAME]**.

Employee flow (matches the wireframe's "Time off Type Request" modal exactly): open request → Leave Type (dropdown) → Validity Period (date range) → Allocation (days) → Attachment (optional — explicitly required for Sick Leave certificates **[WIREFRAME]**) → Submit / Discard.

Employee's Time Off screen shows a running balance ("Paid Time Off: 24 Days Available", "Sick Time Off: 07 Days Available") and a personal request table (Name, Start Date, End Date, Type, Status) — own records only **[WIREFRAME]**.

Admin/HR's Time Off screen shows the same table for **all employees**, with visible **Approve / Reject** actions and comments **[PDF §3.5.2, WIREFRAME]**. Status changes reflect immediately in the employee's view **[PDF §3.5.2]**.

Must prevent: invalid/overlapping date ranges, approval by non-Admin roles, requesting more days than are allocated. **[Recommendation, standard workflow integrity]**

### 7.7 Payroll / Salary Visibility **[Source — PDF §3.6, Wireframe]**

Employee: **read-only** view of own salary. Admin: view all, update salary structure, "ensure payroll accuracy" **[PDF §3.6]**.

The wireframe's Salary Info tab (Admin-only) shows the *shape* of a salary structure worth modeling: Month/Year wage, working days/week, break time, and a components table — Basic Salary, House Rent Allowance, Provident Fund (split Employee %/Employer %), Standard Allowance, Professional Tax, Performance Bonus, Leave Travel Allowance, Fixed Allowance — each with a name, an amount, and a formula basis (fixed ₹ or % of Basic) **[WIREFRAME]**. These specific figures read as **Odoo default Indian salary-structure demo data**, not a hard requirement — Dayflow should model salary as a **flexible list of named components** rather than hardcoding this exact set, and can seed demo data using these exact values for a realistic demo.

Do **not** build a real payroll engine (tax slabs, statutory compliance, payslip PDF generation) in 12 hours — model salary structure + components as data, computed as simple arithmetic (sum of components), and leave true payroll processing as **[Future Scope]**.

## 8. Non-Functional Requirements

- **Security:** JWT auth, bcrypt/Argon2 password hashing, RBAC enforced server-side, salary/attendance access checked against the requester's own ID or Admin role on every request — never trust a client-supplied employee ID. **[Recommendation]**
- **Auditability:** every create/update/approve on Employee, Attendance, Leave, Salary produces an audit record (actor, action, entity, before/after, timestamp). **[Recommendation]**
- **Consistency:** leave approval and attendance check-in are transactional — either the whole state change (status + notification + audit) commits, or none of it does. **[Recommendation]**
- **Performance:** employee list, attendance list, and leave list must be paginated and indexed for search — even though the hackathon demo dataset is small, the schema shouldn't force a rewrite past ~1,000 employees. **[Recommendation]**
- **Usability:** loading/empty/error states on every list view; role-aware navigation (nobody sees a nav item or button they can't use). **[Recommendation]**

## 9. Key User Stories & Acceptance Criteria

| # | Story | Acceptance Criteria |
|---|---|---|
| 1 | As an Employee, I check in for the day | Check-in creates one attendance event with server timestamp; duplicate check-in same day without a prior check-out is rejected; status dot turns green |
| 2 | As an Employee, I apply for Sick Leave | Cannot submit without an attachment; cannot submit overlapping an existing Pending/Approved request; request appears as "Pending" in my Time Off list instantly |
| 3 | As Admin, I approve a leave request | Status flips to Approved atomically with a stored comment, actor, and timestamp; employee's leave balance decreases; employee sees the update without a page reload delay beyond a refetch |
| 4 | As Employee, I try to view a coworker's salary by editing the URL/employee-id param | API returns 403; no salary data is returned in the payload at all (not just hidden in UI) |
| 5 | As Admin, I add a new employee | Login ID is auto-generated in the `AS2026007` pattern; account is created in a `PENDING_ACTIVATION`-equivalent state; no public sign-up path exists |

## 10. Hackathon Differentiators **[Hackathon Enhancement]**

Ranked by judging leverage relative to build cost — full detail in the Execution Plan doc:
1. **Complete audit trail** — cheap to build (one service call per mutation), disproportionately impresses judges on "logical thinking" and "database design."
2. **Attendance Timeline** — a chronological per-employee view (check-in → check-out → duration → status), reuses data already being captured; strong visual demo moment.
3. **Employee 360° view** — one consolidated Admin screen (Profile + Attendance + Leave + Salary + Recent Activity) — natural extension of the profile page you're already building.
4. **Approval workflow visualization** — Submitted → Pending → Approved/Rejected as a visible status trail on the leave request, not just a database field.
5. **Deterministic Workforce Health Score** (Attendance 40% / Leave workflow health 20% / Attendance exceptions 20% / Pending HR actions 20%, 0–100) — explicitly **rule-based, not AI**, per hackathon constraint.
6. **Attendance anomaly detection** (missing checkout, repeated late check-in) — same rule-based constraint.
7. **Notification Center** — persisted in Postgres, surfaced for leave approvals/rejections and new requests.

## 11. Assumptions **[Recommendation]**

- Single company/tenant.
- "Admin" and "HR Officer" are one combined role (`HR_ADMIN`) for this build; see TRD for the future 2-role split path.
- Currency is ₹ (INR), consistent with the wireframe's salary mockups — configurable, not hardcoded in logic.
- Manager field on Employee is informational for this build (no manager-approval-chain logic); leave approval authority is any `HR_ADMIN`, not necessarily the employee's direct manager.

## 12. Constraints

- ~12-hour build window; single modular-monolith codebase; mandated stack: React/TS/Tailwind frontend, Node/Express/Prisma/PostgreSQL backend, JWT auth.
- No AI/ML anywhere in the health score or anomaly detection — must be explainable, deterministic business rules.

## 13. Success Metrics (for the demo, not production)

- Full login → check-in → apply leave → admin approve → notification → audit-log-entry loop works live, end to end, without a manual DB edit.
- Zero client-trust security holes demonstrable on stage (an employee genuinely cannot fetch another's salary).
- Every "Source Requirement" in the PDF is satisfied by a real screen, not just described.

## 14. Future Scope **[Future Scope]**

Full payroll engine (statutory tax, payslip PDFs, payroll runs/periods), Recruitment, Performance Management, Shift Management, Biometric integration, Mobile app, Multi-company, Employee documents as first-class uploaded/versioned files, manager-approval-chain workflows, splitting `HR_ADMIN` into distinct `ADMIN`/`HR_OFFICER` roles with different privilege scopes.
