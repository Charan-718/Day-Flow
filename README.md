# Dayflow — Production HRMS

A full-stack HR management system: employee directory & profiles, attendance
(check-in/out), leave requests & balances, payroll/salary structures, and an
HR admin console — plus a public marketing/landing page.

- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS v4 (`frontend/`)
- **Backend:** Node + Express + Prisma + PostgreSQL (`backend/`)

## Quick start — Docker (recommended, no setup)

```bash
docker compose up --build
```

| Service | URL |
|---|---|
| App (UI) | http://localhost:5173 |
| API | http://localhost:4000/health |

On first boot the backend container automatically runs migrations and seeds
the database with a **full realistic demo organisation** — see
[Login credentials](#login-credentials--who-can-i-sign-in-as) below.

To customize secrets instead of using the baked-in Docker defaults:

```bash
cp .env.example .env
# edit JWT_SECRET, POSTGRES_PASSWORD, etc.
docker compose up --build
```

**Never commit `.env`** to git.

## Local development (hot reload)

Requires **Node 20+** (`nvm use 20` — this repo will not run on Node 18; Vite
8's dependencies require `node:util`'s `styleText`, added in Node ≥20).

```bash
# 1. Postgres only — everything else runs locally for hot reload
docker compose up -d db

# 2. Backend
cd backend
cp .env.example .env
npm install
npx prisma migrate dev
npm run prisma:seed      # creates the bootstrap HR admin + full demo org (see below)
npm run dev              # http://localhost:4000

# 3. Frontend (separate terminal)
cd frontend
npm install
npm run dev               # http://localhost:5173 (falls back to 5174/5175 if busy)
```

Re-running `npm run prisma:seed` is safe — it only adds rows that don't
already exist (matched by email). To wipe and regenerate attendance, leave
requests, notifications and the audit log (keeping company/department/
employee/salary data), run `npm run db:reset` instead.

## Login credentials — who can I sign in as?

Every account below uses the login page at `/login` (there is **no public
sign-up** for employees — see [How access works](#how-access-works)). Sign in
with either the **email** or the **Login ID**.

### Docker (`docker compose up --build`, no `.env`)

| Role | Email | Password | Notes |
|---|---|---|---|
| HR Admin (bootstrap) | `hr.admin@dayflow.local` | `ChangeMeOnFirstLogin!` | Forced password change on first login |
| Demo employees | *(see table below)* | `Password@123` | Same password for all seeded employees |

> **Bootstrap only ever runs once per database** — if you're pointing at a
> database that was already seeded (e.g. with different `BOOTSTRAP_HR_*`
> values), the account above won't exist. Any Human Resources department
> employee from the table below also has `HR_ADMIN` access, or check which
> account actually exists:
> `docker exec dayflow-db psql -U dayflow -d dayflow -c "SELECT email FROM \"User\" WHERE role='HR_ADMIN' ORDER BY \"createdAt\" LIMIT 1;"`

### Local dev (`npm run prisma:seed` with the values in `backend/.env.example`)

| Role | Email | Password | Notes |
|---|---|---|---|
| HR Admin (bootstrap) | `hr.admin@yourcompany.com` | `ChangeMeOnFirstLogin!` | Edit `BOOTSTRAP_HR_EMAIL`/`BOOTSTRAP_HR_PASSWORD` in `.env` before seeding to change this |
| Demo employees | `firstname.lastname@dayflow-demo.local` | `Password@123` (`DEMO_SEED_PASSWORD` in `.env`) | ~30 employees across 8 departments |

The demo-employee email domain and password are hardcoded the same way in
both Docker and local dev (only the bootstrap HR admin's credentials
differ), so the table below applies to either setup. Name-to-role
assignment is deterministic (hashed from department + designation), so
these stay the same across every reseed — one employee per department, so
you can sign in as any role/level:

| Department | Name | Email | Designation |
|---|---|---|---|
| Engineering | Deepika Iyer | `deepika.iyer@dayflow-demo.local` | Engineering Manager |
| Human Resources | Anjali Patel | `anjali.patel@dayflow-demo.local` | HR Manager |
| Sales | Radhika Patel | `radhika.patel@dayflow-demo.local` | Sales Manager |
| Marketing | Isha Gupta | `isha.gupta@dayflow-demo.local` | Digital Marketing Manager |
| Finance | Radhika Gupta | `radhika.gupta@dayflow-demo.local` | Finance Manager |
| Customer Success | Anjali Gupta | `anjali.gupta@dayflow-demo.local` | Customer Success Manager |
| Design | Kunal Bhat | `kunal.bhat@dayflow-demo.local` | Design Lead |
| Operations | Pooja Bose | `pooja.bose@dayflow-demo.local` | Operations Manager |

Every employee in the **Human Resources** department signs in with
`HR_ADMIN` access (full directory, approvals, salary, audit log); everyone
else gets standard `EMPLOYEE` access (their own profile, attendance, leave).
To see the exact full list (all ~30 names/emails), sign in as any HR Admin
and open **Employees**, or query the database directly:

```sql
SELECT e."firstName", e."lastName", u.email, u."loginId", e.designation
FROM "Employee" e JOIN "User" u ON u.id = e."userId" ORDER BY e."createdAt";
```

## What the seed builds (`backend/prisma/seed.ts`)

With `SEED_DEMO_DATA=true` (the Docker default; opt-in locally via `.env`),
seeding creates a believable demo company, not just a couple of test rows:

- **1 company** (reuses whatever company already exists rather than creating
  a duplicate — self-registration only ever allows one) with a generated logo
- **8 departments** (Engineering, Human Resources, Sales, Marketing, Finance,
  Customer Success, Design, Operations)
- **~30 employees** with realistic names, designations, a manager/reports
  hierarchy per department, phone/address/bank/PAN/UAN details, bios, skills
  and certifications tailored to their role, and a **generated profile
  photo** for every employee (colored initials avatars fetched from
  ui-avatars.com at seed time — synthetic, not photos of real people; if the
  network is unavailable the seed still completes and the app falls back to
  showing initials, same as it does for any employee without a photo)
- **~60 days of attendance** per employee (check-in/out times, occasional
  late arrivals, half days and absences, weekends and public holidays
  skipped)
- **Leave requests** in a realistic status mix (approved, rejected, and
  pending/future-dated), with a real PDF attachment on sick-leave requests,
  and leave balances that reflect actual approved usage
- **Notifications** and an **audit log** of the approve/reject actions taken
  above
- **9 India public holidays** for 2026 and **salary structures** for every
  employee (basic/HRA/allowances/PF breakdown)

## How access works

1. **No public sign-up** — only an HR Admin can provision employee accounts
   (`POST /api/auth/employees`); the one exception is the very first company,
   created once via `/signup` when no company exists yet.
2. **Role assignment:** an employee's `role` is `HR_ADMIN` if their
   department has `isHrTeam = true` (Human Resources), otherwise `EMPLOYEE`.
3. **Login ID format:** `[CompanyCode][Initials(4)][JoiningYear][Serial(4)]`,
   e.g. `OIDENA20240001` — generated uniquely per employee, collision-safe
   under concurrent creation.
4. **Production:** set `SEED_DEMO_DATA=false` and use strong, unique secrets
   in `.env` (`JWT_SECRET`, `POSTGRES_PASSWORD`, `BOOTSTRAP_HR_PASSWORD`).

## Features

- Public landing page with role-based sign-in (Admin/HR and Employee, both
  in the top navbar and further down the page)
- HR-provisioned accounts, concurrency-safe login ID generation, employee
  status badges
- Check-in/out, role-aware attendance history, leave requests + calendar
  with public holidays
- Employee 360 profile: Info / Resume / Private Info / About / Security tabs
- Salary tab (HR-visible), audit log, workforce health dashboard (HR only)
- Forced password change on first login for HR-bootstrapped accounts
- HR-mediated password reset (no email service is configured, so there's no
  self-service "forgot password" — the login page explains this, and an HR
  Admin can generate a fresh temporary password from any employee's profile
  Security tab and relay it directly)
