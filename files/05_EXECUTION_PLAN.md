# Dayflow — 12-Hour Execution Plan & Demo Strategy

Read this alongside `01_PRD.md` / `02_TRD.md`. This is the "how do we actually spend the day" document.

## 1. MVP Priority

**MUST HAVE** (the demo doesn't work without these):
Login (no public sign-up), Admin adds employee with auto-generated Login ID, employee profile view (Info/Private/Salary tabs with correct role gating), check-in/check-out, employee's own attendance view, admin's all-employees attendance view, leave request creation with validation, admin approve/reject leave (transactional), server-side salary access control.

**SHOULD HAVE** (materially increases judging score, build after MUST HAVE works end-to-end):
Audit log (cheap, high judge-appeal), notifications on leave approve/reject, attendance timeline, Employee 360° view.

**NICE TO HAVE** (only if time remains after SHOULD HAVE):
Approval workflow visualization (status trail UI), Workforce Health Score, attendance anomaly detection.

**FUTURE** (explicitly do not attempt): real payroll engine/payslip PDFs, recruitment, performance reviews, shift scheduling, biometric integration, mobile app, multi-company.

Do not let a NICE TO HAVE item consume time budgeted for a MUST HAVE. If you're at hour 8 and the leave-approval transaction isn't solid, stop building differentiators and fix that.

## 2. Phased Schedule (~12 hours)

| Phase | Time budget | Deliverable |
|---|---|---|
| **1 — Foundation** | Hours 0–2 | Prisma schema migrated + seeded; JWT auth; login works; RBAC middleware; frontend AppShell + protected routing |
| **2 — Core HR** | Hours 2–5 | Employee profile (all tabs, correct role gating), attendance check-in/out + both views, leave request + both views |
| **3 — Admin workflows** | Hours 5–7 | Admin add-employee flow, leave approve/reject (transactional), salary edit, employee directory + search |
| **4 — Differentiators** | Hours 7–10 | Audit log, notifications, attendance timeline, Employee 360°, (time permitting) approval visualization + health score |
| **5 — Polish** | Hours 10–12 | Loading/empty/error states everywhere, responsive pass, seed data cleanup for a coherent demo story, dry-run the demo script twice |

## 3. Demo Script (5–8 minutes, one coherent story — not a feature tour)

1. **Login as Employee** ("Rahul") → land on own profile/attendance, note the check-in status dot is red.
2. **Check in** → dot turns green, elapsed timer starts.
3. **Open Attendance** → show the monthly summary + the timeline (differentiator) for context.
4. **Apply for Sick Leave** → try submitting without an attachment first (show the validation catches it), then attach a file and submit — request appears as Pending.
5. **Log out, log in as Admin** ("Priya").
6. **Land on Employees directory** — click Rahul's card → opens view-only profile → point out the Salary Info tab is Admin-only.
7. **Open Time Off queue** → find Rahul's pending Sick Leave request → **Approve it with a comment**.
8. **Log back in as Rahul (or split-screen)** → show the notification arrived and the leave status flipped to Approved instantly.
9. **Back to Admin** → open **Employee 360°** for Rahul (profile + attendance + leave + salary in one screen).
10. **Open Audit Log** → point to the exact rows this demo just created (leave approved, attendance check-in) — this is the moment that lands "auditability" with judges.
11. **Open Workforce Health Score** (if built) → show the four-part breakdown, explicitly state it's rule-based, no AI.
12. Close by trying (live, on stage) to fetch another employee's salary as the Employee-role user via the browser dev tools / a raw API call, and showing it's rejected server-side — this single moment directly answers the security judging criterion better than any slide would.

## 4. Judging Criteria — What to Point To

| Criterion | What to show |
|---|---|
| **Database design** | Prisma schema: normalized tables, FKs, `@@index`, `@@unique`, event-sourced attendance |
| **Logical thinking** | Leave-overlap validation, balance checks, transactional approval, RBAC ownership checks |
| **Modularity** | `modules/` folder structure, thin controllers / fat services, one service per domain |
| **Scalability** | TRD §8 scaling path (100 → 100,000 employees) — talk through it, don't just claim it |
| **Performance** | Indexes tied to actual list-view queries, pagination, React Query caching |
| **Security** | The live "steal another employee's salary" demo moment above |
| **Usability** | Role-aware nav, status badges everywhere, timeline, loading/empty/error states |

## 5. Judge Q&A — Prepared Answers

- **Why PostgreSQL?** Relational integrity matters for HR data — leave balances, salary components, and approval chains all depend on foreign-key correctness and transactional guarantees that a document store would make you reimplement by hand.
- **Why Prisma?** Type-safe queries end-to-end with TypeScript, migrations as code, and it makes SQL injection structurally hard to introduce by accident.
- **Why JWT?** Stateless auth fits a modular monolith with no session store to keep in sync; short expiry limits blast radius if a token leaks.
- **Why RBAC, not just role checks scattered in controllers?** Centralized middleware (`requireRole`, `requireSelfOrAdmin`) means the authorization rule is defined once and can't silently diverge between two similar endpoints.
- **Why modular monolith instead of microservices?** Faster to build and debug in 12 hours, no distributed-transaction problem for leave-approval-plus-notification-plus-audit, and the module folder boundaries mean it's a lift-and-shift to real services later, not a rewrite.
- **How do you prevent an employee from seeing another's salary?** Ownership check at the middleware layer (`requireSelfOrAdmin`) *and* re-checked in the service layer before the query even runs — defense in depth, not a single point of failure. (Then do the live demo from §3.12.)
- **How do you prevent duplicate check-ins?** The check-in transaction validates there's no open `CHECK_IN` event without a paired `CHECK_OUT` for today before inserting.
- **How do you handle overlapping leave requests?** Service-layer validation queries for any `PENDING`/`APPROVED` request for that employee whose date range intersects the new one, before the insert.
- **How are approvals audited?** Every approve/reject writes an `AuditLog` row inside the same database transaction as the status change — they can't get out of sync.
- **What happens if leave approval succeeds but notification creation fails?** It can't — both are inside one `prisma.$transaction`; if the notification insert throws, the status update rolls back too.
- **How does the system scale?** Walk through TRD §8: indexes already in place for 100–1,000 employees with zero changes; Redis + object storage at 10,000; read replicas and table partitioning at 100,000 — no microservices needed at any point.
- **What makes this different from a basic CRUD HR app?** Event-sourced attendance instead of a mutable row, transactional multi-step workflows instead of sequential unguarded writes, and a real audit trail instead of `updatedAt` being the only history you have.
- **How would you integrate this into Odoo?** See TRD §12's mapping table — Employee → `hr.employee`, Attendance → `hr.attendance`, Leave → `hr.leave`, etc. Dayflow is architecturally compatible with becoming an Odoo module later; it isn't one today.

## 6. Odoo Alignment (short version — full table in TRD §12)

Dayflow mirrors Odoo's actual HR app structure (Employees / Attendance / Time Off as separate top-level areas under one nav) rather than inventing a new IA — this was a deliberate wireframe choice and is worth stating explicitly to judges, since it's evidence of genuine domain research rather than a generic CRUD scaffold.
