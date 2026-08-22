# Dayflow — Human Resource Management System

Modular monolith HRMS with JWT RBAC, PostgreSQL, Docker, and an Odoo-inspired React UI.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19 + TypeScript + Vite + Tailwind v4 + React Query + React Router |
| Backend | Node.js + Express + TypeScript + Prisma + Zod + bcrypt + JWT |
| Database | PostgreSQL 16 |
| Ops | Docker Compose |

## Quick start (Docker)

```bash
docker compose up --build
```

- App UI: http://localhost:5173  
- API: http://localhost:4000/health  
- Postgres (host): `localhost:5433` → container `5432`

On first boot the backend runs `prisma migrate deploy` and seeds demo data.

## Local development

### 1. Database

```bash
docker compose up -d db
```

### 2. Backend

```bash
cd backend
cp .env.example .env   # already points at localhost:5433
npm install
npx prisma migrate dev
npm run prisma:seed
npm run dev
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## Demo accounts

Password for all: `Password@123`

| Role | Email | Login ID |
|---|---|---|
| HR Admin | `priya@dayflow.local` | `PS2026001` |
| Employee | `rahul@dayflow.local` | `RV2026002` |

## RBAC highlights

- No public signup — HR Admin provisions employees (`POST /api/auth/employees`) with auto Login ID (`AS2026007` pattern).
- Middleware: `requireAuth` → `requireRole` / `requireSelfOrAdmin`.
- Salary endpoint re-checks ownership in the **service layer** (defense in depth). Employee A calling `/api/employees/{B}/salary` returns **403** with no salary payload.
- Leave approve/reject + attendance check-in are **Prisma transactions** (status + balance/notification + audit commit together).

## Project layout

```
backend/src/modules/{auth,employees,attendance,leave,payroll,notifications,dashboard,audit}/
frontend/src/{pages,components,services,routes,hooks}/
files/   # PRD / TRD / build prompts
```

## API envelope

```json
{ "success": true, "message": "…", "data": {} }
{ "success": false, "message": "…", "code": "LEAVE_OVERLAP" }
```
