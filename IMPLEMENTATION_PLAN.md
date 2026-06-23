# Implementation Plan — Cardiac Scan, Multi Scan-Mode, Report Export, mCi Base Unit, Dynamic Sheet Engine

> Hand-off spec for the implementing agent (Claude Code in terminal).
> Project: Nuclear Oncology EMR — Assiut University Hospital.
> Stack: Node/Express + Prisma (SQL Server) + Socket.IO · React/Vite · i18n (ar/en).
> **DB rule:** use `npx prisma db push` (NEVER `migrate reset`). `prisma generate` throws EPERM while the backend is running — stop the server first.

This document has **5 workstreams**. WS1–WS4 are concrete features. WS5 is an architecture addition (admin-defined sheets). Do them in order. Each workstream has its own acceptance criteria.

---

## Reference: Anatomy of a scan type (how a sheet is wired end-to-end)

Adding/maintaining a scan type touches these files. Keep this checklist — it is the backbone of WS1 and WS5.

**Backend**
1. `backend/prisma/schema.prisma` — the `ScanXxx` model (Doctor/Nurse/Technician/Results field groups + the standard workflow columns). Also add the two `User` back-relations (`scanXxxs` + `scanXxxReports @relation("ScanXxx_reporter")`), the `Patient` relation, and the `Visit?` relation.
2. `backend/src/utils/scanFields.js` — add `xxx: 'ScanXxx'` to `TYPE_TO_MODEL`; if the tech writes a new dose-field name, add it to `ROLE_WRITABLE.technician`.
3. `backend/src/controllers/scanController.js` — `createXxx / getXxxs / getXxx / updateXxx / getXxxHistory`; register the model in `SCAN_MODELS` (aggregate) and in `getScanStats`.
4. `backend/src/routes/scans.js` — POST (`doctorOnly`), GET list, GET `/patient/:patientId`, GET `/:id`, PUT (`roleFieldFilter`).
5. `backend/src/controllers/workflowController.js` — `MODEL_MAP.xxx = 'scanXxx'`; `DOSE_FIELD.xxx`; the `scanLabels`/`scanTypes` lists inside `getPatientWorkflow`.
6. `backend/seedDemo.js` — optional demo rows.

**Frontend**
7. `frontend/src/App.jsx` — `<Route path="scans/xxx" element={<ScanXxx />} />`.
8. `frontend/src/pages/ScanXxx.jsx` — the sheet page (clone the structure of `ScanGastric.jsx`; it is the cleanest reference and already uses `useScanRole`, `useAdminWorkflow`, `DoctorActionFooter`, `AdminDoneFooter`, `AdminReportFooter`, `RoleCreateNotice`, and per-field `<Prev k="..."/>` hints).
9. `frontend/src/components/ScanReportView.jsx` — add the type to `SCAN_LABEL`; classify any new field keys into the `NURSE` / `TECH` / `FINDINGS` sets so the report groups them correctly.
10. `frontend/src/pages/TechnicianDashboard.jsx` — add to `SCAN_TYPES` filter list.
11. `frontend/src/pages/PhysicianDashboard.jsx` — add to `SCAN_SHORTCUTS`.
12. `frontend/src/i18n/index.jsx` — add ar/en keys.
13. Check downstream readers: `Dashboard.jsx` (stats/pie), `PatientHistory.jsx`, `ScansList.jsx`, `GlobalSearch.jsx` — add the type wherever scan types are enumerated.

---

## WS1 — Add the **Cardiac (MPI)** scan sheet (8th scan type, `cardiac`)

Implement cardiac as a **first-class hardcoded scan type** exactly like the existing 7 (the user wants it "زيه زي باقي الكشوفات"). It also becomes the reference implementation for the engine in WS5.

### 1.1 Prisma model `ScanCardiac`
Add a `ScanCardiac` model mirroring the standard scaffold (`id, patientId, patient, visitId, visit, … performedBy/performer, reportedBy/reporter, createdAt, updatedAt, workflowStatus @default("Pending_Doctor"), isLocked @default(false), doseUnit @default("mCi"), returnReason, @@index([patientId]), @@index([workflowStatus])`). Add the User back-relations `scanCardiacs` + `scanCardiacReports @relation("ScanCardiac_reporter")`, the `Patient.scanCardiacs`, and `Visit.scanCardiacs`.

Field groups (derive exact names; coercion is automatic via `pickClinicalFields` DMMF logic):

- **Doctor — Indication/Complaint:** `diagnosis`, `chestPain Boolean`, `chestPainCharacter String` (burning|pricking|compressing), `chestPainOnset String` (sudden|acute|gradual), `chestPainCourse String`, `chestPainDuration String` (minutes|hours), `precipitatedBy String` (JSON array: rest|exercise|after_meals|others), `relievedBy String` (JSON array: rest|dinitra|antacids|others), `radiation Boolean`, `radiationSite String`, plus Booleans `palpitation, sob, nausea, vomiting, fever, cough, legPain`, and `complaintOthers String`.
- **Doctor — Risk factors (Booleans):** `smoking, htn, dm, hyperlipidemia, renalDisease, familyHx, vasculitis`.
- **Doctor — Past history (Booleans):** `angina, stroke, mi, intermittentClaudication`.
- **Doctor — Surgical history:** `cabg Boolean, ptca Boolean, angioplasty Boolean, surgeryDate DateTime`.
- **Doctor — text:** `drugHistory String`, `ccuAdmissionHistory String`.
- **Doctor — Contraceptive (female):** `contraceptiveStatus String` (single|postmenopausal|married), `lmpDate DateTime`.
- **Doctor — Previous investigations:** `ecgDate DateTime, ecgFindings String, echoDate DateTime, echoFindings String, labDate DateTime, cardiacEnzymes String, cardiacCtMriDate DateTime, cardiacCtMriFindings String`.
- **Nurse (standard):** `prepWeight, prepHeight, prepBloodGlucose Float, injectionSite String, pregnancyStatus String, prepNurseNotes String`.
- **Technician — Procedure:** `scanMode String` (JSON array of rest|stress|delayed|redistribution|reinjection — see WS2), `treadmillExercise Boolean, thrBpm Int, mets Float, exerciseDurationMin Int, exerciseDurationSec Int, reasonEndingExercise String`, `vitalsTable String` (JSON — 5 rows × {time,pulse,bp,ecg,notes} for Before Rest / Before stress / During stress / After stress / Before Discharge), `pharmacological Boolean, pharmaDrug String, pharmaDose String`, `procedureSymptoms String` (JSON array: fatigue|chest_pain|dyspnea|dizziness|claudication|nausea|vomiting|blurred_vision), `nmPhysician String, cardiologist String`.
- **Technician — Tracer box:** `tracer String, tracerDoseMCi Float, injectionSiteSide String` (RT|LT), `injectionSiteLimb String` (hand|foot|forearm), `injectionTime DateTime, acquisitionTime DateTime, technicianPhysicist String, moreAcquisition String`.
- **Results/Report:** `impression String, physicianNotes String, technicianNotes String, fileUrl String`.

> JSON-array fields are stored as `String`; `coerce()` already `JSON.stringify`s objects/arrays on the way in. Parse them on read in the UI/report.

After editing the schema: stop backend → `npx prisma db push` → `npx prisma generate`.

### 1.2 Backend wiring
- `scanFields.js`: `TYPE_TO_MODEL.cardiac = 'ScanCardiac'`; add `tracerDoseMCi` to `ROLE_WRITABLE.technician` (and `nmPhysician, cardiologist, technicianPhysicist, vitalsTable, procedureSymptoms, acquisitionTime, moreAcquisition, treadmillExercise, thrBpm, mets, exerciseDurationMin, exerciseDurationSec, reasonEndingExercise, pharmacological, pharmaDrug, pharmaDose` so the tech can write the whole procedure block).
- `scanController.js`: add the 5 CRUD handlers (clone the Gastric ones; use `pickClinicalFields(req.body,'ScanCardiac')` + explicit date coercion + `safeCreateStatus`); add `cardiac: 'scanCardiac'` to `SCAN_MODELS`; add cardiac count to `getScanStats`.
- `routes/scans.js`: add the 5 `/cardiac` routes (POST `doctorOnly`, PUT `roleFieldFilter`).
- `workflowController.js`: `MODEL_MAP.cardiac='scanCardiac'`; `DOSE_FIELD.cardiac='tracerDoseMCi'`; add `scanCardiac→'cardiac'` to the `scanLabels`/`scanTypes` in `getPatientWorkflow`. **Note:** cardiac is NOT in `GLUCOSE_REQUIRED_TYPES` (no glucose gate).

### 1.3 Frontend
- New page `frontend/src/pages/ScanCardiac.jsx` — clone `ScanGastric.jsx` structure (patient selector, role gating, Doctor/Nurse/Tech/Results sections, admin footers, history table, `<Prev>` hints). Build the cardiac fields above. The **vitals table** is a small editable 5×5 grid bound to `formData.vitalsTable` (array of objects); serialize to JSON in the payload.
- `App.jsx`: add the route + import.
- `PhysicianDashboard.jsx`: add `{ label: 'Cardiac', icon: HeartPulse, path: '/scans/cardiac', color: '#ef4444' }` to `SCAN_SHORTCUTS` (import `HeartPulse` from lucide-react).
- `TechnicianDashboard.jsx`: add `{ value: 'cardiac', label: 'Cardiac' }` to `SCAN_TYPES`.
- `ScanReportView.jsx`: `SCAN_LABEL.cardiac = 'Cardiac (MPI)'`; add cardiac tech keys to `TECH`, and findings keys to `FINDINGS`; add a small custom renderer for `vitalsTable` (render as an HTML table) and JSON-array fields (render as comma list).
- i18n: add `cardiac.*` keys (ar/en).
- Sweep `Dashboard.jsx`, `PatientHistory.jsx`, `ScansList.jsx`, `GlobalSearch.jsx` for any hardcoded list of 7 scan types and add cardiac.

### 1.4 Acceptance
- Doctor can create a cardiac sheet → `Pending_Nurse`; full Doctor→Nurse→Tech→Report→Completed flow works; admin one-page flow works; appears in technician/physician queues, patient history, dashboard stats, global search; send-back works.

---

## WS2 — Technician: **multiple scan modes**

Today `scanMode` is a single `String` set from a `<select>` in `TechnicianDashboard.jsx` and in each scan page. Generalize to **multi-select**.

- **Storage:** keep the `scanMode` column as `String` on every scan model (no migration). Store a **JSON array string**, e.g. `["Static","SPECT/CT"]`. `coerce()` already stringifies arrays; the workflow `buildTechnicalData` passes `scanMode` through — change nothing server-side except: in `buildTechnicalData`, if `technical.scanMode` is an array, keep it (coercion stringifies). Confirm `scanMode` stays in `ROLE_WRITABLE.technician` (it does).
- **TechnicianDashboard.jsx:** replace the single `<select name="scanMode">` with a **multi-select chip group** (toggle buttons) writing an array into `scanForm.scanMode` (default `[]`). Options for general scans: Static, Dynamic, Whole Body, SPECT, SPECT/CT. For **cardiac** records (`record._scanType === 'cardiac'`) show the cardiac procedure options instead: Rest, Stress, Delayed, Redistribution, Re-injection. Send the array in `technical.scanMode`.
- **ScanReportView.jsx / formatVal:** when a value parses as a JSON array, render it as a comma-joined list. Add a helper that tries `JSON.parse` for `scanMode`.
- **Backward compatibility:** old records hold a plain string. The parse helper must fall back to `[value]` when `JSON.parse` fails, so existing data still renders.
- **Acceptance:** tech can pick 2+ modes; saved as JSON array; report and history show all selected modes; old single-string records still display.

---

## WS3 — Final report **export (Word + PDF)**, editable, versioned, named `{patientName}_{reportNumber}_{date}`

### 3.1 Report numbering + versioning (central table)
Add a central table so numbering/versioning works uniformly across all 8 scan types **and** future dynamic sheets:

```
model GeneratedReport {
  id           String   @id @default(uuid())
  scanType     String              // petct | psma | … | cardiac | dynamic
  scanId       String              // the scan record id
  patientId    String
  reportNumber String              // running, e.g. "NM-2026-000123" — stable across versions
  version      Int      @default(1)
  format       String              // "pdf" | "docx"
  fileUrl      String              // /uploads/reports/<name>
  fileName     String              // {patientName}_{reportNumber}_{date}.<ext>
  generatedBy  String
  generatedAt  DateTime @default(now())
  @@index([scanId])
  @@index([patientId])
}
```
Running number: derive `reportNumber` once per scan record (first export). Allocate it inside a transaction by counting existing distinct `reportNumber`s for the year, or add a tiny `Counter` model `{ key String @id, value Int }` and increment atomically. Format `NM-{year}-{padded6}`. **Re-export of an edited report keeps the same `reportNumber` and increments `version`.** Filename uses the date of generation: sanitize patient name (strip spaces/slashes), e.g. `Ahmed_Ali_NM-2026-000123_2026-06-23.pdf`.

### 3.2 "Editable on the system"
The impression/physicianNotes (and, for admin, any field) remain editable after `Completed` via the existing `updateXxx` PUT (admin/doctor bypass `isLocked` filtering — verify and, if needed, allow doctor/admin PUT on locked records while still blocking nurse/tech). Each export reflects the current record state and bumps the version. No Word round-trip editing — "editable" means edit in-app, then re-generate.

### 3.3 Generation
- **Word (.docx):** add `docx` npm package (backend). Build a styled document from the record (letterhead "Nuclear Medicine Unit — Clinical Oncology and Nuclear Medicine Department — Assiut University Hospital", patient header, sections mirroring `ScanReportView`, impression, signatures). Supports Arabic; set `bidirectional: true` on Arabic paragraphs.
- **PDF:** **Recommended — Puppeteer** (`puppeteer`) rendering a server-side HTML template (best Arabic/RTL fidelity, single source of truth). Build one `reportHtml(record, meta)` used for the PDF. *Tradeoff:* Puppeteer pulls a Chromium binary (~heavy install). **Lighter alternative:** `pdfmake` with an embedded Arabic font (Amiri/Cairo) — smaller, but Arabic shaping/bidi needs care. Pick Puppeteer unless install size is a blocker; note the choice in the PR.
- Store files under `backend/uploads/reports/` (already served at `/uploads`). Ensure the folder exists at startup.

### 3.4 API + UI
- Routes (new `backend/src/routes/reports.js`, mounted `/api/reports`, `auth` + `doctorOnly` for generation):
  - `POST /api/reports/:scanType/:scanId?format=pdf|docx` → generates, records a `GeneratedReport` row, returns `{ fileUrl, fileName, reportNumber, version }`.
  - `GET /api/reports/:scanType/:scanId` → list previous generated reports (for version history).
- `PhysicianDashboard.jsx`: in the report card (and/or after approve), add **"Export PDF"** and **"Export Word"** buttons that call the endpoint and download/open `fileUrl`. Show current `reportNumber`/version. Re-clicking after an edit produces v2, v3…
- **Acceptance:** approving/exporting a completed cardiac (or any) scan yields a downloadable PDF and DOCX named `{patientName}_{reportNumber}_{date}`; editing the impression then re-exporting keeps the number, increments the version, and the file reflects the edit; Arabic renders correctly.

---

## WS4 — **mCi is the base measurement unit** (audit + confirm)

Already largely true (`doseUnit @default("mCi")`, all `*DoseMCi` columns, MBq→mCi ÷37 conversion in `TechnicianDashboard`). Tasks:
- Ensure `ScanCardiac.tracerDoseMCi` + `doseUnit @default("mCi")` follow the same pattern; the MBq toggle in the tech dashboard converts to mCi before save (reuse existing logic).
- Confirm every dose **display** shows mCi as primary (the physician/report views read `*DoseMCi`). Add `tracerDoseMCi` to the dose fallback chain in `PhysicianDashboard` (`const dose = … || record.tracerDoseMCi`).
- The cardiac paper form shows both mci and MBq next to the tracer dose — render mCi primary with `= X MBq` hint (reuse the `unit-hint` pattern).
- **Acceptance:** no scan stores a non-mCi base value; MBq is input-only and converted on save; reports show mCi.

---

## WS5 — **Admin-defined scan sheets** (Dynamic Sheet Engine)

Goal: the admin can create a brand-new sheet **without a developer/migration**, and it flows through the same Doctor→Nurse→Tech→Report workflow, queues, history, and report export. The 8 hardcoded sheets stay untouched; new sheets use the engine.

### 5.1 Data model (3 tables, JSON-driven)
```
model ScanTemplate {
  id        String  @id @default(uuid())
  key       String  @unique          // slug, e.g. "lung_perfusion"
  name      String                   // display name (ar/en in a JSON or two columns nameAr/nameEn)
  category  String?                  // grouping/badge
  icon      String?                  // lucide icon name
  color     String?
  isActive  Boolean @default(true)
  version   Int     @default(1)
  createdBy String
  createdAt DateTime @default(now())
  fields    ScanTemplateField[]
}

model ScanTemplateField {
  id          String  @id @default(uuid())
  templateId  String
  template    ScanTemplate @relation(fields:[templateId], references:[id], onDelete: NoAction, onUpdate: NoAction)
  section     String        // "doctor" | "nurse" | "tech" | "results"
  key         String        // data key within the JSON blob
  label       String
  type        String        // text|textarea|number|date|datetime|checkbox|radio|select|multiselect|group|vitalsTable
  options     String?       // JSON array for radio/select/multiselect
  unit        String?
  required    Boolean @default(false)
  order       Int     @default(0)
  conditional String?       // optional JSON: { field, equals } to show/hide
  @@index([templateId])
}

model DynamicScan {
  id        String  @id @default(uuid())
  templateId String
  patientId  String
  patient    Patient @relation(fields:[patientId], references:[id], onUpdate:NoAction, onDelete:NoAction)
  visitId    String?
  data       String  @default("{}")  // JSON: { fieldKey: value } for all sections
  // standard workflow scaffold (same as scan models):
  workflowStatus String @default("Pending_Doctor")
  isLocked   Boolean @default(false)
  returnReason String?
  doseUnit   String  @default("mCi")
  scanMode   String?            // JSON array (WS2)
  impression String?
  physicianNotes String?
  technicianNotes String?
  fileUrl    String?
  performedBy String
  reportedBy  String?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  @@index([patientId])
  @@index([workflowStatus])
  @@index([templateId])
}
```
Add the needed back-relations on `User`/`Patient`. This is one migration that enables unlimited future sheets.

### 5.2 Backend
- `dynamicScanController.js`: CRUD that validates incoming `data` against the template's fields (whitelist keys by template, coerce by `type`), enforces required fields per section at each workflow step. Reuse the audit-log + transaction pattern.
- Routes `backend/src/routes/dynamicScans.js` mounted `/api/dynamic-scans`: template CRUD is **admin-only** (`adminOnly`); record create is `doctorOnly`; advance via the existing workflow controller.
- `workflowController.js`: add `dynamic: 'dynamicScan'` to `MODEL_MAP`. Prep/technical/report writers must target the JSON `data` blob for template fields while still writing the top-level scaffold columns (`workflowStatus`, `impression`, dose, etc.). Add a branch in `buildPrepData`/`buildTechnicalData` (or a dynamic variant) that merges into `data`.
- `scanController.getAllScansForPatient` + `getScanStats` + `getPatientWorkflow`: include dynamic scans (group by templateId/key).
- Permissions: add a `scan_template:manage` permission to `backend/src/utils/permissions.js` catalog + admin default.

### 5.3 Frontend
- **Form Builder** page `frontend/src/pages/AdminScanTemplates.jsx` at `/admin/scan-templates` (admin route in `App.jsx`, link in `Layout` admin nav): list templates; create/edit a template; add fields with section, type, label, options, unit, required, order, conditional; activate/deactivate. Drag-or-number ordering.
- **Generic renderer** `frontend/src/pages/DynamicScanSheet.jsx` (route `/scans/t/:templateKey`): fetches the template, renders Doctor/Nurse/Tech/Results sections by iterating fields, reuses `useScanRole`/`useAdminWorkflow`/the footers from `scanSheet.jsx`, and `<Prev>` where feasible. Submits `{ patientId, templateId, data, workflowStatus:'Pending_Nurse' }`.
- Dashboards: technician/physician queues already iterate `getWorkflowAll` results — make sure dynamic records carry a display label (template name) and a generic detail view. `ScanReportView` gets a `dynamic` branch that renders sections from the template + `data`.
- Report export (WS3) must accept `scanType='dynamic'` and render from the template.
- New-scan shortcuts: physician dashboard lists active templates dynamically (fetch `/api/dynamic-scans/templates?active=1`) alongside the 8 built-ins.

### 5.4 Acceptance
- Admin creates a new sheet with fields across all 4 sections, activates it; a doctor sees it in shortcuts, creates a record, and it flows nurse→tech→report→completed; it shows in queues, patient history, stats, and can be exported to PDF/Word with a report number. No code change or migration was needed to add the sheet.

---

## Suggested order & branching
1. Branch `feature/cardiac-and-reports`.
2. WS4 quick audit (mCi) — trivial, do alongside WS1.
3. WS1 (cardiac) — biggest single feature; verify full workflow.
4. WS2 (multi scan-mode) — small, build on cardiac.
5. WS3 (report export) — new deps (`docx`, `puppeteer`/`pdfmake`); test Arabic.
6. WS5 (dynamic engine) — largest architecture piece; separate commit, ideally its own branch `feature/dynamic-sheets`.

## Cross-cutting checklist
- After every schema change: stop backend → `npx prisma db push` → `npx prisma generate` → restart.
- i18n: every new visible string gets ar + en keys.
- Design system: reuse existing classes (`.scan-sheet-form`, `.sheet-section`, `.radio-chip`, `.touch-input`, `.btn-*`, easing tokens); gate hover with `@media (hover:hover)`; respect reduced-motion.
- Arabic text edits in JSON/seed files: use Node scripts, NOT perl one-liners (they mangle Arabic on this machine).
- Update `acc.md` (scan coverage matrix, endpoint cheat sheet) when done.
