# Nuclear Oncology Center — EMR System

Hospital EMR for the Nuclear Oncology department, Assiut University. Covers the full clinical workflow for 7 nuclear-medicine scan types (PET/CT, PSMA PET/CT, Thyroid, Bone, Renal, Gastric Emptying, Meckel's) across four roles: **Doctor → Nurse → Technician → Physician Report**, with an admin role overseeing everything.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js + Express 4 |
| Database | Microsoft SQL Server (via Prisma ORM 6) |
| Auth | JWT (12h tokens) + bcrypt, role-based access control |
| Real-time | Socket.IO (live queue updates per role) |
| Frontend | React 18 + Vite 5 |
| Routing / UI | react-router v6, lucide-react icons, date-fns |
| i18n | Custom Arabic/English context (RTL-aware) |

## Prerequisites (install these first)

1. **Node.js 20 LTS or newer** — https://nodejs.org (includes npm)
2. **Microsoft SQL Server** (Express edition is fine) — https://www.microsoft.com/sql-server/sql-server-downloads
   - During setup note your **instance name** (e.g. `SQLEXPRESS`)
   - Enable **TCP/IP** in SQL Server Configuration Manager (port 1433)
3. **Git** — https://git-scm.com

## Setup from zero

```bash
# 1. Clone
git clone https://github.com/0Marwan02/nuclear-oncology.git
cd nuclear-oncology

# 2. Backend dependencies
cd backend
npm install

# 3. Create backend/.env  (NEVER commit this file)
```

Create `backend/.env` with:

```env
DATABASE_URL="sqlserver://localhost:1433;instanceName=SQLEXPRESS;database=NuclearOncology;trustServerCertificate=true;integratedSecurity=true;encrypt=false"
JWT_SECRET=<run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
PORT=5000
FRONTEND_URL=http://localhost:5173
```

> Adjust `instanceName` to match your SQL Server install. If you use SQL authentication instead of Windows auth, use `user=sa;password=...` instead of `integratedSecurity=true`. Create an empty database named `NuclearOncology` first (e.g. in SSMS: `CREATE DATABASE NuclearOncology;`).

```bash
# 4. Create tables + generate the Prisma client
npx prisma db push

# 5. Seed demo users + data (admin/doctor/nurse/technician accounts, 20 demo patients)
node seedDemo.js

# 6. Frontend dependencies
cd ../frontend
npm install
```

## Running

From the project root (starts both servers):

```bash
node start
```

Or manually in two terminals:

```bash
cd backend  && npm run dev     # API + WebSocket on http://localhost:5000
cd frontend && npm run dev     # UI on http://localhost:5173
```

Open http://localhost:5173 and log in with a seeded account (see the seeding output or `acc.md` for the demo Hospital IDs and passwords).

## Project layout

```
backend/
  prisma/schema.prisma     # all models (Patient, Visit, 7 Scan models, AuditLog, permissions)
  src/controllers/         # auth, patients, scans, workflow, admin
  src/middleware/          # JWT auth, role gates, role-based field filtering
  src/realtime.js          # Socket.IO queue rooms per role
  seedDemo.js              # demo users + patients + scans
frontend/
  src/pages/               # role dashboards + 7 scan sheets + admin pages
  src/components/          # shared UI (report view, workflow stepper, return flow…)
  src/i18n/                # ar.json / en.json
```

## Notes

- `backend/.env`, `credentials.txt`, and `uploads/` are gitignored — never commit secrets.
- Schema changes are applied with `npx prisma db push` (this project does not use migration files).
- Stop the backend before running `npx prisma generate` on Windows (the running server locks the query engine DLL).
