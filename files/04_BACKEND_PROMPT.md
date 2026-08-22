# Dayflow — Backend Build Prompt

*Paste this whole file as the opening prompt to Claude Code (or another coding agent) in your `backend/` repo. It is self-contained — it does not assume the agent has read the PRD/TRD, though you should keep those alongside for reference.*

---

You are building the **backend for Dayflow**, an internal HR Management System, for a 12-hour hackathon. Correctness and security (especially around salary data) matter more than feature count. Build a working vertical slice before adding differentiators.

## Stack (fixed — do not substitute)
Node.js + Express + TypeScript, PostgreSQL, Prisma ORM, JWT for auth, bcrypt or Argon2 for password hashing, zod (or joi) for request validation. Socket.IO is optional and only for real-time notification pushes — build the REST API first; add Socket.IO only if time remains.

## Non-negotiable architectural rules
1. **Database is the source of truth.** Nothing important lives only in memory or only on the client.
2. **Controllers stay thin.** Parse the request, call one service function, shape the response. Business logic never lives in a route handler.
3. **All business logic lives in the service layer**, one service module per domain (`auth`, `employees`, `attendance`, `leave`, `payroll`, `notifications`, `audit`).
4. **Backend authorization is mandatory and independent of the frontend.** Assume every request could come from a hand-crafted `curl` call, not just your own UI. Never trust a client-supplied employee ID as proof of identity — always check it against the JWT's `employeeId`/role.
5. **Multi-step HR state changes are transactional** (leave approval, attendance check-in) — see §5 below. Partial success is not an acceptable outcome for these.
6. **Every meaningful mutation writes an audit log row** in the same transaction as the mutation itself.
7. No AI/ML anywhere in this codebase — the Workforce Health Score and anomaly detection are explicitly deterministic rule engines. If you find yourself reaching for a model or a scoring heuristic that isn't fully explainable in one sentence, stop and use arithmetic instead.

## Database

Use the Prisma schema below verbatim as your starting point (this is the agreed schema — don't redesign it without flagging why to the user first). Run `prisma migrate dev` to generate the initial migration, then write `prisma/seed.ts` to seed: 2 departments, 1 `HR_ADMIN` user, 6–8 `EMPLOYEE` users with realistic profiles, salary structures matching the components below, some historical attendance events (including at least one exception — a missing checkout — for the anomaly-detection demo), and a few leave requests in each status (Pending/Approved/Rejected) so every screen has real data to show on first login.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  EMPLOYEE
  HR_ADMIN
}

enum AccountStatus {
  PENDING_ACTIVATION
  ACTIVE
  SUSPENDED
}

model User {
  id              String        @id @default(uuid())
  loginId         String        @unique
  email           String        @unique
  passwordHash    String
  role            Role
  status          AccountStatus @default(PENDING_ACTIVATION)
  emailVerifiedAt DateTime?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  employee        Employee?
  auditLogs       AuditLog[]    @relation("ActorAuditLogs")
  notifications   Notification[]

  @@index([email])
  @@index([loginId])
}

model Department {
  id        String     @id @default(uuid())
  name      String     @unique
  employees Employee[]
}

model Employee {
  id                String    @id @default(uuid())
  userId            String    @unique
  user              User      @relation(fields: [userId], references: [id])

  firstName         String
  lastName          String
  employeeCode      String    @unique
  profilePictureUrl String?
  phone             String?
  personalEmail     String?
  address           String?

  departmentId      String?
  department        Department? @relation(fields: [departmentId], references: [id])
  designation       String?
  managerId         String?
  manager           Employee? @relation("ManagerReports", fields: [managerId], references: [id])
  reports           Employee[] @relation("ManagerReports")

  joiningDate       DateTime
  employmentStatus  String    @default("ACTIVE")

  dateOfBirth       DateTime?
  gender            String?
  maritalStatus     String?
  nationality       String?
  bankName          String?
  bankAccountNumber String?
  ifscCode          String?
  panNumber         String?
  uanNumber         String?

  bio               String?
  jobLoveNote       String?
  interests         String?
  skills            String[]  @default([])
  certifications    String[]  @default([])

  attendanceEvents  AttendanceEvent[]
  leaveRequests     LeaveRequest[]
  leaveBalances     LeaveBalance[]
  salaryStructure   SalaryStructure?
  documents         EmployeeDocument[]

  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  @@index([departmentId])
  @@index([managerId])
  @@index([lastName, firstName])
}

model EmployeeDocument {
  id         String   @id @default(uuid())
  employeeId String
  employee   Employee @relation(fields: [employeeId], references: [id])
  label      String
  fileUrl    String
  uploadedAt DateTime @default(now())

  @@index([employeeId])
}

enum AttendanceEventType {
  CHECK_IN
  CHECK_OUT
}

model AttendanceEvent {
  id         String              @id @default(uuid())
  employeeId String
  employee   Employee            @relation(fields: [employeeId], references: [id])
  type       AttendanceEventType
  occurredAt DateTime            @default(now())

  @@index([employeeId, occurredAt])
}

enum AttendanceStatus {
  PRESENT
  ABSENT
  HALF_DAY
  LEAVE
}

model AttendanceDaySummary {
  id            String            @id @default(uuid())
  employeeId    String
  date          DateTime          @db.Date
  checkIn       DateTime?
  checkOut      DateTime?
  workedMinutes Int?
  status        AttendanceStatus
  isException   Boolean           @default(false)

  @@unique([employeeId, date])
  @@index([date])
  @@index([employeeId, date])
}

enum LeaveTypeCode {
  PAID
  SICK
  UNPAID
}

model LeaveType {
  id                 String        @id @default(uuid())
  code               LeaveTypeCode @unique
  name               String
  requiresAttachment Boolean       @default(false)
  leaveRequests      LeaveRequest[]
  balances           LeaveBalance[]
}

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
  attachmentUrl String?

  status        LeaveStatus @default(PENDING)
  reviewedById  String?
  reviewComment String?
  reviewedAt    DateTime?

  createdAt     DateTime    @default(now())

  @@index([employeeId, status])
  @@index([status])
  @@index([startDate, endDate])
}

model SalaryStructure {
  id                 String            @id @default(uuid())
  employeeId         String            @unique
  employee           Employee          @relation(fields: [employeeId], references: [id])
  monthlyWage        Decimal           @db.Decimal(12,2)
  yearlyWage         Decimal           @db.Decimal(12,2)
  workingDaysPerWeek Int               @default(5)
  breakTimeMinutes   Int               @default(60)
  components         SalaryComponent[]
  updatedAt          DateTime          @updatedAt
}

enum ComponentBasis {
  FIXED
  PERCENT_OF_BASIC
}

model SalaryComponent {
  id                String          @id @default(uuid())
  salaryStructureId String
  salaryStructure   SalaryStructure @relation(fields: [salaryStructureId], references: [id])
  name              String
  basis             ComponentBasis
  percentage        Decimal?        @db.Decimal(5,2)
  amount            Decimal         @db.Decimal(12,2)

  @@index([salaryStructureId])
}

model Notification {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  type      String
  message   String
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())

  @@index([userId, isRead])
}

model AuditLog {
  id            String   @id @default(uuid())
  actorId       String
  actor         User     @relation("ActorAuditLogs", fields: [actorId], references: [id])
  action        String
  entityType    String
  entityId      String
  previousValue Json?
  newValue      Json?
  ipAddress     String?
  createdAt     DateTime @default(now())

  @@index([entityType, entityId])
  @@index([actorId, createdAt])
}
```

## Folder Structure

```
backend/src/
├── config/          env.ts  prisma.ts (singleton PrismaClient)
├── middleware/      requireAuth.ts  requireRole.ts  requireSelfOrAdmin.ts  validate.ts  errorHandler.ts
├── modules/
│   ├── auth/         auth.controller.ts  auth.service.ts  auth.routes.ts  auth.schema.ts
│   ├── employees/
│   ├── attendance/
│   ├── leave/
│   ├── payroll/
│   ├── notifications/
│   ├── dashboard/
│   └── audit/
├── utils/           loginIdGenerator.ts  jwt.ts  responseEnvelope.ts  transactions.ts
├── app.ts
└── server.ts
prisma/
├── schema.prisma
└── seed.ts
```

## Auth Module

- `POST /api/auth/login` — email + password → `{ token, user: { id, loginId, role, employeeId } }`. Compare bcrypt/argon2 hash; on failure, generic "Invalid credentials" (don't reveal whether it was the email or password that was wrong).
- `POST /api/auth/employees` (`HR_ADMIN` only) — the account-provisioning endpoint. **This replaces public self-registration entirely** — see PRD §7.1 for why. Steps: generate `loginId` via `utils/loginIdGenerator.ts` (first-letter-of-first-name + first-letter-of-last-name, uppercase, + 4-digit joining year + zero-padded sequence number for that year — query existing `loginId`s for that year to get the next sequence), create `User` (status `PENDING_ACTIVATION`) + `Employee` in one transaction, return the generated `loginId` in the response so the admin can hand it to the new hire.
- `POST /api/auth/verify-email` — flips `PENDING_ACTIVATION` → `ACTIVE`.
- JWT payload: `{ userId, role, employeeId }` — nothing sensitive. Expiry ~2h for the demo.

## Employees Module

- `GET /api/employees` (`HR_ADMIN`) — paginated + `?search=` (name/department/employeeCode), returns list shape without Private Info/Salary fields (keep the directory response lean — full profile is a separate fetch).
- `GET /api/employees/:id` — **this is the endpoint that needs the most care.** Logic:
  - If `req.user.role === 'HR_ADMIN'`: return everything (Info + Private Info); include a `canViewSalary: true` flag rather than embedding salary here (salary is its own endpoint, see Payroll module).
  - If `req.user.employeeId === params.id` (viewing self): return Info + Private Info (a person can see their own private data), but not Salary unless also `HR_ADMIN`.
  - Otherwise (an `EMPLOYEE` requesting someone else's `:id`): **403**, or at minimum strip Private Info and Salary entirely from the payload — do not rely on the frontend to hide fields it received. If the product intent is that employees can see basic directory info about coworkers, return only the directory-safe subset (name, department, designation, photo) for that case — confirm this with the user if it's ambiguous, don't silently guess.
- `PATCH /api/employees/:id` — field-level allowlist enforced server-side: if actor is self and not `HR_ADMIN`, only `phone`, `address`, `profilePictureUrl` may appear in the diff; anything else in the request body for a non-admin self-edit should be rejected (400), not silently ignored, so the frontend gets clear feedback if it ever sends more than it should.

## Attendance Module

- `POST /api/attendance/check-in` (self) — transaction: validate no open `CHECK_IN` today without a `CHECK_OUT`, insert `AttendanceEvent(CHECK_IN)`, upsert `AttendanceDaySummary`, insert `AuditLog`. Reject with `ATTENDANCE_ALREADY_CHECKED_IN` if already in.
- `POST /api/attendance/check-out` (self) — symmetric; compute `workedMinutes` from the paired `CHECK_IN`, update `AttendanceDaySummary`. Reject with `ATTENDANCE_NOT_CHECKED_IN` if there's no open check-in.
- `GET /api/attendance/me?month=&year=` — own `AttendanceDaySummary` rows for the month + aggregate counts (present days, total working days, leave count).
- `GET /api/attendance?date=` (`HR_ADMIN`) — all employees' summary for that date.
- `GET /api/attendance/:employeeId/timeline` (self or `HR_ADMIN`) — chronological events + summaries, same ownership check as the employee profile endpoint.
- **Anomaly detection (differentiator, deterministic):** a scheduled/on-read check that flags `isException = true` on `AttendanceDaySummary` when: checked in but never checked out by end of day; check-in time is later than a configurable threshold (e.g. > 10:30); more than N corrections in a day (if you build correction/edit at all — optional). Keep the rule set small and explicit; each rule should be a named function, not a black box.

## Leave Module

- `GET /api/leave/types` — seeded `LeaveType` rows (Paid/Sick/Unpaid), including `requiresAttachment`.
- `GET /api/leave/balance` (self) — own `LeaveBalance` rows.
- `POST /api/leave/requests` (self) — validate: `endDate >= startDate`; no overlap with an existing `PENDING`/`APPROVED` request for the same employee (`LEAVE_OVERLAP`); `daysRequested <= (allocatedDays - usedDays)` for that leave type (`LEAVE_INSUFFICIENT_BALANCE`); attachment present if `leaveType.requiresAttachment` (`LEAVE_ATTACHMENT_REQUIRED`). Create as `PENDING`.
- `GET /api/leave/requests` — self sees only their own; `HR_ADMIN` sees all, filterable by `status`/`employeeId`.
- `PATCH /api/leave/requests/:id/approve` and `/reject` (`HR_ADMIN` only) — **transactional**, per TRD §6: re-validate `status === PENDING` (`LEAVE_INVALID_STATE` if not — this is what stops a double-approve race), update status + review fields, adjust `LeaveBalance.usedDays` on approve, insert `Notification` for the employee, insert `AuditLog`, commit together or not at all.

## Payroll Module

- `GET /api/employees/:id/salary` — self (read-only) or `HR_ADMIN`. Same ownership check pattern as the profile endpoint — this is the single most important endpoint to get the authorization check right on, since it's explicitly called out as the thing a judge will try to break (PRD Acceptance Criteria #4). Write a quick manual test for this one specifically: log in as Employee A, call this endpoint with Employee B's id, confirm you get a 403 with no salary data anywhere in the response body.
- `PUT /api/employees/:id/salary` (`HR_ADMIN` only) — replace `SalaryStructure` + `SalaryComponent` rows transactionally; audit-log the previous and new component sets (`previousValue`/`newValue` as JSON snapshots).

## Notifications Module

- `GET /api/notifications` (self) — own, most recent first, `?unreadOnly=true` optional.
- `PATCH /api/notifications/:id/read` — must belong to `req.user.id`, else 403.
- Created as a side effect inside other services' transactions (leave approve/reject, attendance exception detection) — there is no standalone "create notification" public endpoint.

## Dashboard Module

- `GET /api/dashboard/summary` — role-aware: `HR_ADMIN` gets `{ headcount, pendingLeaveCount, todayAttendancePercent }`; `EMPLOYEE` gets `{ todayStatus, leaveBalanceSummary }`.
- `GET /api/dashboard/health-score` (`HR_ADMIN`) — deterministic: `score = 0.4*attendanceHealth + 0.2*leaveWorkflowHealth + 0.2*(1 - exceptionRate) + 0.2*(1 - pendingActionsRatio)`, each sub-score 0–1, final scaled to 0–100. Return the breakdown, not just the final number, so the frontend can show its work. Document the exact formula in a code comment — you will be asked to explain it live.

## Audit Module

- `GET /api/audit-logs` (`HR_ADMIN`) — paginated, filterable by `entityType`/`actorId`/date range. This module has no writes of its own — every other module writes to `AuditLog` directly, inside its own transactions, using a shared `utils/auditWriter.ts` helper so the shape stays consistent.

## Error Codes (extend as needed, keep them stable once the frontend is coded against them)

`INVALID_CREDENTIALS`, `LEAVE_OVERLAP`, `LEAVE_INSUFFICIENT_BALANCE`, `LEAVE_ATTACHMENT_REQUIRED`, `LEAVE_INVALID_STATE`, `ATTENDANCE_ALREADY_CHECKED_IN`, `ATTENDANCE_NOT_CHECKED_IN`, `FORBIDDEN`, `VALIDATION_ERROR`.

## Build Order

1. Prisma schema + migration + seed script (get realistic demo data in the DB before writing a single route — you'll want it to test against as you go).
2. Auth module (login + admin-creates-employee) + JWT middleware + role middleware.
3. Employees module, with the ownership-check logic for `:id` routes nailed down before moving on — this pattern gets reused by Attendance and Payroll.
4. Attendance module (check-in/out transaction, summaries, admin day-view).
5. Leave module (request creation with validations, approve/reject transaction).
6. Payroll module — write the manual "Employee A can't see Employee B's salary" test the moment this is done.
7. Notifications + Audit (mostly side effects wired into the modules above).
8. Dashboard summary + health score.
9. Attendance anomaly detection pass.

Do not build the health score or anomaly detection before steps 1–7 are solid — a judge testing whether Employee A can see Employee B's salary and finding that they can is a worse outcome than not having a health score widget at all.
