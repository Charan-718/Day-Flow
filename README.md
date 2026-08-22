# Dayflow — Production HRMS

## Quick start (Docker — no .env required)

```bash
docker compose up --build
```

| Service | URL |
|---|---|
| UI | http://localhost:5173 |
| API | http://localhost:4000/health |

**Demo logins** (seeded automatically on first run):

| Role | Email | Password |
|------|-------|----------|
| HR Admin | `priya@demo.local` | `Password@123` |
| Employee | `rahul@demo.local` | `Password@123` |

Fresh database with no demo users? Bootstrap HR is also created when the DB is empty:

- Email: `hr.admin@dayflow.local`
- Password: `ChangeMeOnFirstLogin!` (must change on first login)

## Optional: override with `.env`

Defaults are baked into `docker-compose.yml` for local Docker. To customize, copy:

```bash
cp .env.example .env
# edit JWT_SECRET, POSTGRES_PASSWORD, etc.
docker compose up --build
```

**Never commit `.env`** to git.

## Local development (hot reload)

Requires **Node 20+** (`nvm use 20`).

```bash
docker compose up -d db

cd backend && cp .env.example .env && npm install
npx prisma migrate dev && npm run prisma:seed && npm run dev

cd frontend && npm install && npm run dev
```

## How access works

1. **No public sign-up** — only HR Admin can provision accounts.
2. **Role assignment:** Human Resources department or HR job title → `HR_ADMIN`; all others → `EMPLOYEE`.
3. **Production:** set `SEED_DEMO_DATA=false` and use strong secrets in `.env`.

## Wireframe features

- HR-provisioned accounts, login ID generation, employee status dots
- Check-in/out, role-aware attendance, leave calendar with holidays
- Salary tab (HR only), Security tab, forced password change on first login
