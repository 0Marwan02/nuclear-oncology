# Nuclear Oncology - Work Log

## Project State
- Type: Graduation project (clinical workflow system for Nuclear Oncology).
- Architecture: separate backend + frontend.
- Backend status: stable MVP APIs working.
- Frontend direction: React + JavaScript (Vite), no TypeScript.

## Confirmed Stack
- Backend: `Node.js`, `Express`, `Prisma`, `SQL Server`
- Frontend: `React` (Vite, JavaScript)
- Auth: `JWT`
- Roles: `doctor`, `nurse`

## What Is Done
- Backend foundation completed:
  - Auth (`register`, `login`)
  - Patients (`create`, `list`, `details`)
  - Visits (`create`, `list by patient`)
  - Request validation
  - Global 404 + error handler
  - Audit logging on create
- End-to-end API smoke test passed.
- User environment verified:
  - Node `v20.18.3`
  - npm `10.8.2`
  - SQL Server connected via Prisma
- Frontend switched from Next/TS plan to React/JS plan.
- New React app scaffold created and renamed to `frontend`.
- Frontend login module implemented:
  - Login form (hospital ID + password)
  - Backend integration with `/api/auth/login`
  - Auth token and user stored in localStorage
  - Logout flow added
- Frontend quality checks passed:
  - `npm run lint` passed
  - `npm run build` passed

## Current Issue
- In some terminals, `npm` is not recognized because PATH is not refreshed.
- Agent terminal can run npm using full path (`C:\Program Files\nodejs\npm.cmd`).
- Vite 8 required Node `20.19+`, but current version is `20.18.3`.
- Resolved by pinning compatible versions (`vite` 5 + React 18).

## Next Actions
- Build next frontend pages after auth:
  - patients list
  - patient profile
  - visit create form
- Continue recording all progress in this file and `imp.md`.

### Session 2026-04-16
- Done:
  - Installed frontend routing and UI dependencies (react-router-dom, lucide-react, date-fns).
  - Built `Layout` wrapper with sidebar navigation.
  - Implemented client-side routing in `App.jsx`.
  - Created `Login` page and moved auth logic from App.jsx.
  - Developed `PatientsList` with search functionality.
  - Built `PatientProfile` to display demographics and medical cases.
  - Implemented `VisitsTimeline` to visualize patient visits chronologically.
  - Created `VisitCreate` modal to log new patient visits.
  - Backend Phase 4: Configured `multer` for `uploads/labs` and `uploads/imaging` static exposing.
  - Backend Phase 4: Implemented controllers/routes for Cases, Labs, Imaging, and Radiation.
  - Frontend Phase 4: Created `CaseCreate` form component to allow registering cancer details.
  - Frontend Phase 4: Appended action buttons inside `VisitItem` in timeline for diagnostic attachments.
  - Frontend Phase 4: Engineered `LabUploadModal`, `ImagingUploadModal`, and `DoseModal` inside `ResourceModals.jsx`.
  - Phase 5: Installed `recharts`.
  - Phase 5: Engineered `dashboardController.js` rendering grouped statistical charts.
  - Phase 5: Built fully independent, visually stunning `Dashboard.jsx`.
  - Final Verification: Executed `npm run build` cleanly.
  - Phase 6 (Admin): Modified Prisma Schema `User` to include `isActive`.
  - Phase 6 (Admin): Built `isAdmin` middleware, secure `/api/admin` endpoints for `users` and `audit-logs`.
  - Phase 6 (Admin): Configured Medical Cases modification via API endpoints constrained by role.
  - Phase 6 (Admin): Appended frontend `AdminUsers` table with "Block/Unblock" mechanisms and add user logic.
  - Phase 6 (Admin): Engineered `AdminLogs` with formatted timeline to view activity logs from audit tables.
  - Verification: Exited successfully on `npm run build` with fully functional React structure.
- Next:
  - Ready for handoff to user. Admin user can manage the flow entirely.
