# Dayflow — Technical Requirements Document (TRD)

Companion to `01_PRD.md`. This is the single source of truth for schema, API contracts, and architecture that both the Frontend and Backend build prompts are generated from — if you change something here, update those two prompts too.

---

## 1. System Architecture

**Modular monolith**, not microservices — deliberately, for a 12-hour build:

```
React (TS, Tailwind, React Router, React Query)
        │  HTTPS / JSON
        ▼
Express REST API
        │
   ┌────┴────┐
   │Middleware│  (JWT auth → RBAC guard → validation)
   └────┬────┘
        ▼
   Controllers        (thin — parse req, call service, shape response)
        ▼
   Services            (ALL business logic + transactions live here)
        ▼
   Prisma Client
        ▼
   PostgreSQL

Optional side-channel:
Services ──emit──▶ Socket.IO ──▶ connected clients (leave approved, new request, exception raised)
```

**Why modular monolith, not microservices:** one deployable, one DB connection pool, no distributed-transaction problem for leave-approval-plus-notification-plus-audit, and a hackathon judge cares about correctness and depth, not deployment topology. Module boundaries (`auth/`, `employees/`, `attendance/`, `leave/`, `payroll/`, `notifications/`, `audit/`) are enforced by folder structure and each module talking to others only through its service's public functions — so extraction into real services later is a lift-and-shift, not a rewrite.

## 2. Role Model

Two roles for this build, modeled so a 3rd can be added without a schema change:

```
enum Role {
  EMPLOYEE
  HR_ADMIN     // covers both "Admin" and "HR Officer" per PDF §1.3/§2 — see PRD §6
}
```

Every protected route declares its required role(s) in the route definition (`requireRole('HR_ADMIN')`), never inferred from the frontend.

## 3. Database Schema (Prisma)

Design principles: separate **identity/auth** from **HR profile** (PRD §7.1); every mutation-worthy table gets an audit trail; money and dates are typed correctly (`Decimal`, `DateTime`); every foreign key that's queried in a list view is indexed.

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─────────────────────────────────────────────
// IDENTITY & AUTH
// ─────────────────────────────────────────────

enum Role {
  EMPLOYEE
  HR_ADMIN
}

enum AccountStatus {
  PENDING_ACTIVATION   // created by Admin, awaiting first login / email verification
  ACTIVE
  SUSPENDED
}

model User {
  id            String        @id @default(uuid())
  loginId       String        @unique              // e.g. AS2026007 — see PRD §7.1 for generation rule
  email         String        @unique
  passwordHash  String
  role          Role
  status        AccountStatus @default(PENDING_ACTIVATION)
  emailVerifiedAt DateTime?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  employee      Employee?
  auditLogs     AuditLog[]    @relation("ActorAuditLogs")
  notifications Notification[]

  @@index([email])
  @@index([loginId])
}

// ─────────────────────────────────────────────
// HR PROFILE
// ─────────────────────────────────────────────

model Department {
  id        String     @id @default(uuid())
  name      String     @unique
  employees Employee[]
}

model Employee {
  id               String    @id @default(uuid())
  userId           String    @unique
  user             User      @relation(fields: [userId], references: [id])

  firstName        String
  lastName         String
  employeeCode     String    @unique          // "Emp Code" per wireframe
  profilePictureUrl String?
  phone            String?
  personalEmail    String?
  address          String?

  departmentId     String?
  department       Department? @relation(fields: [departmentId], references: [id])
  designation      String?
  managerId        String?
  manager          Employee? @relation("ManagerReports", fields: [managerId], references: [id])
  reports          Employee[] @relation("ManagerReports")

  joiningDate      DateTime
  employmentStatus String    @default("ACTIVE")   // ACTIVE / INACTIVE — kept as string for hackathon simplicity

  // Private Info tab (Admin-only visibility, enforced in service layer — see §7 Security)
  dateOfBirth      DateTime?
  gender           String?
  maritalStatus    String?
  nationality      String?
  bankName         String?
  bankAccountNumber String?
  ifscCode         String?
  panNumber        String?
  uanNumber        String?

  // About tab
  bio              String?
  jobLoveNote      String?    // "What I love about my job"
  interests        String?
  skills           String[]  @default([])
  certifications   String[]  @default([])

  attendanceEvents AttendanceEvent[]
  leaveRequests    LeaveRequest[]
  leaveBalances    LeaveBalance[]
  salaryStructure  SalaryStructure?
  documents        EmployeeDocument[]

  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  @@index([departmentId])
  @@index([managerId])
  @@index([lastName, firstName])
}

model EmployeeDocument {
  id          String   @id @default(uuid())
  employeeId  String
  employee    Employee @relation(fields: [employeeId], references: [id])
  label       String                       // e.g. "Resume", "Sick Leave Certificate"
  fileUrl     String
  uploadedAt  DateTime @default(now())

  @@index([employeeId])
}

// ─────────────────────────────────────────────
// ATTENDANCE  (event-sourced — see TRD §6 Transactions)
// ─────────────────────────────────────────────

enum AttendanceEventType {
  CHECK_IN
  CHECK_OUT
}

model AttendanceEvent {
  id          String              @id @default(uuid())
  employeeId  String
  employee    Employee            @relation(fields: [employeeId], references: [id])
  type        AttendanceEventType
  occurredAt  DateTime            @default(now())   // server-set, never client-supplied

  @@index([employeeId, occurredAt])
}

enum AttendanceStatus {
  PRESENT
  ABSENT
  HALF_DAY
  LEAVE
}

// One row per employee per calendar day — derived/cached from AttendanceEvent pairs,
// recomputed by the service layer, never hand-edited by a client.
model AttendanceDaySummary {
  id            String            @id @default(uuid())
  employeeId    String
  date          DateTime          @db.Date
  checkIn       DateTime?
  checkOut      DateTime?
  workedMinutes Int?
  status        AttendanceStatus
  isException   Boolean           @default(false)   // missing checkout, excessive lateness, etc — §5.5 differentiator

  @@unique([employeeId, date])
  @@index([date])
  @@index([employeeId, date])
}

// ─────────────────────────────────────────────
// LEAVE / TIME OFF
// ─────────────────────────────────────────────

enum LeaveTypeCode {
  PAID
  SICK
  UNPAID
}

model LeaveType {
  id                String        @id @default(uuid())
  code              LeaveTypeCode @unique
  name              String
  requiresAttachment Boolean      @default(false)   // true for SICK, per wireframe
  leaveRequests     LeaveRequest[]
  balances          LeaveBalance[]
}

// Running per-employee, per-leave-type balance ("24 Days Available" in the wireframe)
model LeaveBalance {
  id            String    @id @default(uuid())
  employeeId    String
  employee      Employee  @relation(fields: [employeeId], references: [id])
  leaveTypeId   String
  leaveType     LeaveType @relation(fields: [leaveTypeId], references: [id])
  allocatedDays Decimal   @db.Decimal(5,2)
  usedDays      Decimal   @db.Decimal(5,2) @default(0)

  @@unique([employeeId, leaveTypeId])
}

enum LeaveStatus {
  PENDING
  APPROVED
  REJECTED
}

model LeaveRequest {
  id            String      @id @default(uuid())
  employeeId    String
  employee      Employee    @relation(fields: [employeeId], references: [id])
  leaveTypeId   String
  leaveType     LeaveType   @relation(fields: [leaveTypeId], references: [id])

  startDate     DateTime    @db.Date
  endDate       DateTime    @db.Date
  daysRequested Decimal     @db.Decimal(5,2)
  remarks       String?
  attachmentUrl String?     // required at service-validation level if leaveType.requiresAttachment

  status        LeaveStatus @default(PENDING)
  reviewedById  String?     // User.id of the HR_ADMIN who approved/rejected
  reviewComment String?
  reviewedAt    DateTime?

  createdAt     DateTime    @default(now())

  @@index([employeeId, status])
  @@index([status])
  @@index([startDate, endDate])
}

// ─────────────────────────────────────────────
// PAYROLL / SALARY (visibility + structure, NOT a payroll engine — PRD §7.7)
// ─────────────────────────────────────────────

model SalaryStructure {
  id                String            @id @default(uuid())
  employeeId        String            @unique
  employee          Employee          @relation(fields: [employeeId], references: [id])
  monthlyWage       Decimal           @db.Decimal(12,2)
  yearlyWage        Decimal           @db.Decimal(12,2)
  workingDaysPerWeek Int              @default(5)
  breakTimeMinutes  Int               @default(60)
  components        SalaryComponent[]
  updatedAt         DateTime          @updatedAt
}

enum ComponentBasis {
  FIXED        // flat ₹ amount
  PERCENT_OF_BASIC
}

model SalaryComponent {
  id                String          @id @default(uuid())
  salaryStructureId String
  salaryStructure   SalaryStructure @relation(fields: [salaryStructureId], references: [id])
  name              String          // Basic Salary, HRA, PF (Employee), PF (Employer), Standard Allowance,
                                     // Professional Tax, Performance Bonus, LTA, Fixed Allowance — seed data,
                                     // not a fixed enum, so HR can add/rename components later
  basis             ComponentBasis
  percentage        Decimal?        @db.Decimal(5,2)   // used when basis = PERCENT_OF_BASIC
  amount            Decimal         @db.Decimal(12,2)  // computed and stored monthly ₹ amount either way

  @@index([salaryStructureId])
}

// ─────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────

model Notification {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  type      String   // LEAVE_APPROVED / LEAVE_REJECTED / NEW_LEAVE_REQUEST / ATTENDANCE_EXCEPTION / MISSING_CHECKOUT
  message   String
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())

  @@index([userId, isRead])
}

// ─────────────────────────────────────────────
// AUDIT LOG
// ─────────────────────────────────────────────

model AuditLog {
  id           String   @id @default(uuid())
  actorId      String
  actor        User     @relation("ActorAuditLogs", fields: [actorId], references: [id])
  action       String   // EMPLOYEE_CREATED / SALARY_UPDATED / LEAVE_APPROVED / ATTENDANCE_CHECK_IN / ...
  entityType   String   // "Employee" | "LeaveRequest" | "SalaryStructure" | ...
  entityId     String
  previousValue Json?
  newValue     Json?
  ipAddress    String?
  createdAt    DateTime @default(now())

  @@index([entityType, entityId])
  @@index([actorId, createdAt])
}
```

### Why event-sourced attendance, not one mutable row?
A single `Attendance` row that gets overwritten on check-out loses history and is trivially "correctable" without a trace. `AttendanceEvent` is append-only (one row per punch); `AttendanceDaySummary` is a **derived, recomputed cache** the service rebuilds from events — auditable and never hand-edited directly (Recommendation, per PRD NFR "Auditability").

### Relationships (text ER diagram)

```
User (1) ── (1) Employee
Department (1) ── (*) Employee
Employee (1) ── (*) Employee            [self-relation: manager → reports]
Employee (1) ── (*) AttendanceEvent
Employee (1) ── (*) AttendanceDaySummary
Employee (1) ── (*) LeaveRequest ── (1) LeaveType
Employee (1) ── (*) LeaveBalance ── (1) LeaveType
Employee (1) ── (1) SalaryStructure ── (*) SalaryComponent
Employee (1) ── (*) EmployeeDocument
User (1) ── (*) Notification
User (1) ── (*) AuditLog               [as actor]
```

## 4. RBAC Middleware Design

```
requireAuth        → verifies JWT, attaches req.user { id, role, employeeId }
requireRole(...roles) → 403 if req.user.role not in roles
requireSelfOrAdmin(paramKey) → allows if req.params[paramKey] === req.user.employeeId
                                OR req.user.role === 'HR_ADMIN'; else 403
```

`requireSelfOrAdmin` is the one that matters most — it's what stops an Employee from reading `/api/employees/:id/salary` for someone else's `:id` (PRD Acceptance Criteria #4). It is applied at the **route/controller boundary**, and the service layer *re-checks* scope before returning salary data, so a bug in one layer doesn't become a breach (defense in depth).

## 5. API Design

Consistent envelope for every response:

```json
// success
{ "success": true, "message": "Leave request submitted successfully", "data": { } }

// error
{ "success": false, "message": "Leave dates overlap with an existing request", "code": "LEAVE_OVERLAP" }
```

### 5.1 Endpoint Table

| Method | Route | Auth | Role | Purpose |
|---|---|---|---|---|
| POST | `/api/auth/login` | none | any | Email + password → JWT |
| POST | `/api/auth/employees` | JWT | HR_ADMIN | Admin creates employee + user (auto Login ID) — replaces public "Sign Up" |
| POST | `/api/auth/verify-email` | token | any | Activates a PENDING_ACTIVATION account |
| POST | `/api/auth/logout` | JWT | any | Invalidate/blacklist token (or client discard, see TRD §7) |
| GET | `/api/employees` | JWT | HR_ADMIN | Paginated, searchable employee directory |
| GET | `/api/employees/:id` | JWT | self or HR_ADMIN | Profile — Private/Salary tabs stripped from payload unless HR_ADMIN or self-owned-limited-fields |
| PATCH | `/api/employees/:id` | JWT | self (limited fields) or HR_ADMIN (all fields) | Edit profile — field allowlist enforced server-side per role |
| GET | `/api/employees/:id/salary` | JWT | self (read-only) or HR_ADMIN | Salary structure + components |
| PUT | `/api/employees/:id/salary` | JWT | HR_ADMIN | Replace salary structure/components (transactional) |
| POST | `/api/attendance/check-in` | JWT | self (Employee/HR_ADMIN) | Creates CHECK_IN event, rejects if already checked in |
| POST | `/api/attendance/check-out` | JWT | self | Creates CHECK_OUT event, rejects if not checked in |
| GET | `/api/attendance/me` | JWT | Employee | Own monthly summary + day table |
| GET | `/api/attendance?date=` | JWT | HR_ADMIN | All employees' attendance for a given date |
| GET | `/api/attendance/:employeeId/timeline` | JWT | self or HR_ADMIN | Chronological timeline — differentiator §5.2 |
| GET | `/api/leave/types` | JWT | any | Paid/Sick/Unpaid list, incl. `requiresAttachment` |
| GET | `/api/leave/balance` | JWT | Employee | Own balances |
| GET | `/api/leave/requests` | JWT | self (own) or HR_ADMIN (all, filterable) | List leave requests |
| POST | `/api/leave/requests` | JWT | Employee | Create request (validates overlap, balance, attachment) |
| PATCH | `/api/leave/requests/:id/approve` | JWT | HR_ADMIN | Transactional approve + notify + audit |
| PATCH | `/api/leave/requests/:id/reject` | JWT | HR_ADMIN | Transactional reject + notify + audit (comment required) |
| GET | `/api/notifications` | JWT | any | Own notifications |
| PATCH | `/api/notifications/:id/read` | JWT | any (own only) | Mark read |
| GET | `/api/audit-logs` | JWT | HR_ADMIN | Filterable audit trail |
| GET | `/api/dashboard/health-score` | JWT | HR_ADMIN | Deterministic Workforce Health Score — §5.5 differentiator |
| GET | `/api/dashboard/summary` | JWT | any | Role-aware landing stats (headcount/pending leave for Admin; today's status/balance for Employee) |

### 5.2 Example — Leave Approval

Request:
```
PATCH /api/leave/requests/:id/approve
Authorization: Bearer <jwt>
Body: { "comment": "Approved — coverage confirmed" }
```

Success:
```json
{
  "success": true,
  "message": "Leave request approved",
  "data": {
    "id": "…", "status": "APPROVED", "reviewedById": "…",
    "reviewComment": "Approved — coverage confirmed", "reviewedAt": "2026-08-22T10:15:00Z"
  }
}
```

Error (wrong state):
```json
{ "success": false, "message": "Only pending requests can be approved", "code": "LEAVE_INVALID_STATE" }
```

## 6. Transaction Strategy

Every multi-step HR operation is wrapped in a single `prisma.$transaction`:

**Leave Approval:**
1. Re-fetch request, lock/validate `status === PENDING`
2. Update `LeaveRequest.status/reviewedById/reviewComment/reviewedAt`
3. Decrement `LeaveBalance.usedDays`
4. Insert `Notification` for the employee
5. Insert `AuditLog`
6. Commit — if any step throws, the whole transaction rolls back and the client gets a clean error, not a half-approved leave request.

**Attendance Check-In:**
1. Validate employee exists and isn't already checked in today (no CHECK_IN without a following CHECK_OUT today)
2. Insert `AttendanceEvent(CHECK_IN)`
3. Upsert `AttendanceDaySummary` for today
4. Insert `AuditLog`
5. Commit

This matters concretely for the judge question *"what happens if leave approval succeeds but notification creation fails?"* — with this design, it can't: notification creation is inside the same transaction as the status update, so either both happen or neither does.

## 7. Security

- Passwords: bcrypt (cost 12) or Argon2id.
- JWT: short-lived access token (e.g. 2h) carrying `{ userId, role, employeeId }`; no sensitive data (salary, etc.) in the token payload itself.
- **Every** salary/attendance-by-id endpoint re-validates ownership server-side — never trust `req.params.id` matching `req.user`'s intent without checking it against `req.user.employeeId` or role.
- Input validation with a schema library (zod/joi) at the controller boundary before it ever reaches a service.
- SQL injection: not applicable — all queries go through Prisma's parameterized query builder, never raw string concatenation.
- CORS locked to the frontend origin; standard secure headers (helmet).
- Rate limiting on `/api/auth/login` specifically (brute-force mitigation) — cheap to add, good judge talking point.

## 8. Performance & Scaling Path

Indexes are already placed on every foreign key and search field used in a list view (see schema `@@index` annotations above: employee name/department for directory search, `(employeeId, date)` for attendance lookups, `status` for leave queues, `(entityType, entityId)` for audit lookups).

Scaling story (talking point for judges, not a build task):
- **100 → 1,000 employees:** current design handles this with zero changes — pagination + the indexes above.
- **1,000 → 10,000:** add Redis for the dashboard/health-score aggregate (recompute on a schedule instead of per-request); move `EmployeeDocument` files to object storage (S3-compatible) instead of DB-adjacent storage.
- **10,000 → 100,000:** read replicas for reporting queries (audit log, attendance history) so they don't compete with the transactional write path; consider partitioning `AttendanceEvent`/`AuditLog` by month, since those tables grow unboundedly while `Employee` doesn't.
- At no point does this require microservices — it requires caching, read replicas, and partitioning, all compatible with the modular-monolith boundary already in place.

## 9. Folder Structure

```
backend/
├── src/
│   ├── config/            # env, prisma client singleton
│   ├── middleware/         # requireAuth, requireRole, requireSelfOrAdmin, errorHandler, validate(schema)
│   ├── modules/
│   │   ├── auth/           # controller, service, routes, zod schemas
│   │   ├── employees/
│   │   ├── attendance/
│   │   ├── leave/
│   │   ├── payroll/
│   │   ├── notifications/
│   │   ├── dashboard/
│   │   └── audit/
│   ├── utils/               # loginIdGenerator, jwt, responseEnvelope
│   ├── app.ts
│   └── server.ts
├── prisma/
│   ├── schema.prisma
│   └── seed.ts             # demo data — see Execution Plan
└── package.json

frontend/                    # full breakdown in the Frontend Build Prompt
├── src/
│   ├── components/  layouts/  pages/{auth,employees,attendance,leave,payroll}/
│   ├── hooks/  services/  api/  routes/  types/  utils/
│   └── App.tsx
```

## 10. Testing Strategy (hackathon-scoped)

Given the 12-hour window, prioritize: (1) manual end-to-end walkthrough of the demo script (see Execution Plan) over automated coverage; (2) a handful of service-layer unit tests for the two things a judge is most likely to probe live — leave-overlap validation and the salary-access guard — since those are the two places a bug is most embarrassing on stage.

## 11. Deployment (hackathon-scoped)

Single environment: Postgres (managed, e.g. Supabase/Neon/Railway) + Node backend + static-hosted frontend (Vercel/Netlify) pointed at the backend's URL via `VITE_API_URL`/env var. No CI/CD pipeline needed for a 12-hour build — `prisma migrate deploy` + `prisma db seed` on the demo database before judging.

## 12. Odoo Alignment

| Dayflow | Odoo equivalent |
|---|---|
| User | `res.users` |
| Employee | `hr.employee` |
| Department | `hr.department` |
| AttendanceEvent / AttendanceDaySummary | `hr.attendance` |
| LeaveType / LeaveRequest / LeaveBalance | `hr.leave.type` / `hr.leave` / `hr.leave.allocation` |
| SalaryStructure / SalaryComponent | `hr.contract` / `hr.salary.rule` |
| AuditLog | conceptually `mail.message` (chatter) + a dedicated log, since Odoo's chatter is UI-level, not a queryable audit table |
| Notification | `mail.activity` / bus notifications |

This is presented as a conceptual mapping for the "how would you integrate this into Odoo" judge question — Dayflow is a standalone app inspired by Odoo's HR UX, not an Odoo module, unless a future phase builds it as one (`Future Scope`).
