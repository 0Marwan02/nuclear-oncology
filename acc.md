# Nuclear Oncology System — Accounts & Demo Data Reference
> Assiut University Hospital · Nuclear Medicine Department  
> Last updated: 2026-06-10

---

## Quick Login Reference

| Hospital ID | Password   | Role        | Name                    | Status   |
|-------------|------------|-------------|-------------------------|----------|
| ADM-001     | admin123   | Admin       | د. أحمد سعيد            | Active   |
| DOC-001     | doc123     | Doctor      | د. محمد عبدالرحمن       | Active   |
| DOC-002     | doc123     | Doctor      | د. فاطمة الزهراء        | Active   |
| DOC-003     | doc123     | Doctor      | د. خالد مصطفى           | Active   |
| NRS-001     | nurse123   | Nurse       | نورهان أحمد              | Active   |
| NRS-002     | nurse123   | Nurse       | سارة محمود               | Active   |
| TEC-001     | tech123    | Technician  | عمرو حسن                 | Active   |
| TEC-002     | tech123    | Technician  | مصطفى كمال               | Active   |
| BLK-001     | blk123     | Nurse       | حسام إبراهيم             | **BLOCKED** |

> Login at: **Hospital ID + Password** (not email).  
> No reception role — that role has been removed from the system.

---

## How to Seed the Database

```bash
# From backend directory:

# 1. Seed users (idempotent — upserts by hospitalId)
node seedUsers.js

# 2. Seed demo patients + all scan records
node seedDemo.js

# 3. (Optional) Seed admin-only test account
node seed.js
```

Both `seedUsers.js` and `seedDemo.js` are **idempotent** — safe to re-run at any time.

> After any schema change: `npx prisma db push` (NEVER `migrate reset`), then re-run seeders.

---

## System Workflow

```
Doctor fills scan form
        │
        ▼
  [Pending_Doctor]  ← visit created, scan form awaiting doctor
        │
        ▼  (Doctor submits form)
  [Pending_Nurse]   ← nurse prepares patient (weight, BP, glucose, IV cannula)
        │
        ▼  (Nurse confirms prep)
  [Pending_Technical] ← technician performs scan + fills technical fields
        │
        ▼  (Technician submits)
  [Pending_Report]  ← doctor writes final impression & approves report
        │
        ▼  (Doctor approves)
  [Completed]       ← scan visible in patient history / comparison
```

No reception step. No appointment model. No clinic files.

---

## Scan Categories

| Category     | Sub-category / Scan Type                          | Radiopharmaceutical |
|--------------|---------------------------------------------------|---------------------|
| PET_CT       | (none — single type)                              | F-18 FDG            |
| PSMA_PET_CT  | (none — male patients only)                       | Ga-68 PSMA          |
| GAMMA        | Thyroid (thyroid_scan / wbs_diagnostic / wbs_therapeutic) | Tc-99m / I-131 |
| GAMMA        | Bone                                              | Tc-99m MDP          |
| GAMMA        | Renal                                             | Tc-99m DTPA / MAG3  |
| GAMMA        | Gastric                                           | Tc-99m Sulfur Colloid |
| GAMMA        | Meckel's                                         | Tc-99m Pertechnetate |
| OTHER        | (catch-all for unlisted)                          | Variable            |

---

## Role Dashboards — What Each Role Sees

### Admin (ADM-001)
- Full user management (create / edit / toggle active / reset password)
- Permission overrides per user
- Audit logs (who did what, when)
- All patients and all scan records readable
- Can enter any scan form and override data

### Doctor (DOC-001, DOC-002, DOC-003)
- **New Scan** shortcuts: PET/CT · PSMA · Thyroid · Bone · Renal · Gastric
- **Awaiting Assessment** queue: visits at `Pending_Doctor` stage
- **Report Queue**: scans at `Pending_Report` stage awaiting final sign-off
- Physician Assessment form (PhysicianAssessment component)
- Patient list + profile + history comparison
- Scan forms (7 types) with all clinical fields

### Nurse (NRS-001, NRS-002)
- **Prep Queue**: visits at `Pending_Nurse` stage
- Fills prep form: weight, height, blood glucose, injection site, cannula size, pregnancy status, nurse notes
- On confirm → advances visit to `Pending_Technical`
- **Gate checks** (UI warning — not hard block):
  - Blood glucose > 200 mg/dL → yellow alert
  - Female patient: contraceptive status must be filled
  - Pregnancy status field for fertile-age women

### Technician (TEC-001, TEC-002)
- **Scan Queue**: visits at `Pending_Technical` stage
- Fills technical fields: dose, injection time, scan time, uptake time, findings
- On submit → advances to `Pending_Report`
- **Gate checks**:
  - Female patient: contraceptive status must be recorded before scan proceeds

### Blocked Account (BLK-001)
- Login returns "Account is inactive" error
- Cannot access any dashboard or API endpoint

---

## Demo Patients — Full Roster

### PET/CT Scenarios (F-18 FDG)

---

#### 1. كريم فؤاد — `PET/CT History + Ghost Text Demo`
- **National ID**: 29506153301011 · Male · Born 1995-06-15
- **Diagnosis**: Ca Lung (Squamous Cell Carcinoma)
- **Visits**: 3 PET/CT records
  - Visit 1 (90 days ago): **Completed** — Initial staging. SUV Max 14.2. Stage IIIA RUL mass + mediastinal nodes. CEA 18.4.
  - Visit 2 (45 days ago): **Completed** — Monitoring after 4 cycles chemo. SUV Max 7.8. Partial metabolic response. CEA 9.2, CYFRA 21-1 3.8. G-CSF given (Filgrastim). HTN history (Amlodipine).
  - Visit 3 (today): **Pending_Report** — End of TTT assessment after 6 cycles. 3 tumor markers. CT/MRI done 10 days ago.
- **Tests this patient covers**:
  - Ghost text hints (previous scan values shown in form placeholders)
  - Multi-scan history timeline and comparison modal
  - G-CSF notes field populated
  - HTN history + notes field populated
  - Multiple tumor marker rows (3 markers)
  - CT/MRI toggle YES with date and findings
  - Physician report queue (Pending_Report)

---

#### 2. هالة سمير — `Blood Glucose Gate (225 mg/dL)`
- **National ID**: 29210224401022 · Female · Born 1992-10-22
- **Diagnosis**: Ca Breast (IDC Grade III)
- **Visit**: **Pending_Nurse** — Initial staging. Married, LMP 12 days ago. DM on oral pills, last dose 2 hours before scan. Blood glucose recorded as **225 mg/dL**.
- **Tests this patient covers**:
  - Nurse dashboard high-glucose warning alert
  - DM med type: "Pills" + last dose date
  - CA 15-3 tumor marker (68.2)
  - Female contraception field (married + LMP date)

---

#### 3. سمر عاطف — `Contraception Gate (field empty)`
- **National ID**: 29809073501033 · Female · Born 1998-09-07
- **Diagnosis**: Diffuse Large B-Cell Lymphoma (DLBCL)
- **Visit**: **Pending_Technical** — Initial staging. Contraceptive status intentionally left **empty**.
- **Tests this patient covers**:
  - Technician gate: contraceptive status missing → warning before proceeding
  - LDH as tumor marker (780)
  - Single tumor marker row

---

#### 4. ليلى فهمي — `All Gates Pass`
- **National ID**: 29407184601044 · Female · Born 1994-07-18
- **Diagnosis**: Ca Ovary (High-Grade Serous Carcinoma)
- **Visit**: **Pending_Technical** — Monitoring after 3 chemo cycles. Married, LMP 22 days ago. Blood glucose 91 mg/dL. Contraception filled. 2 tumor markers (CA-125 + HE4). CT/MRI: 40% size reduction.
- **Tests this patient covers**:
  - All gates pass without warning
  - Monitoring TTT aim
  - Two tumor markers from different assays
  - Previous PET/CT hint in form (65 days ago)

---

#### 5. مجدي رضا — `HTN + DM (Insulin) + 3 Tumor Markers`
- **National ID**: 29601253301055 · Male · Born 1966-01-25
- **Diagnosis**: Ca Colon
- **Visit**: **Pending_Doctor** — visit created, form NOT yet submitted by doctor (open for testing form fill)
- **What to test**:
  - HTN toggle ON → fill notes "Amlodipine + Losartan"
  - DM toggle ON → med type "Insulin" → last dose date field
  - Add 3 tumor markers: CEA, CA 19-9, CA 72-4
  - Surgery history: Hemicolectomy
  - Surgery "Others" free text field
  - Check ghost text (no prior scans → blank hints)

---

#### 6. نادية إبراهيم — `G-CSF Warning`
- **National ID**: 29304264401066 · Female · Born 1973-04-26
- **Diagnosis**: Ca Cervix
- **Visit**: **Pending_Doctor** — visit created
- **What to test**:
  - Fill form with G-CSF last dose = 8 days ago
  - System should warn: "G-CSF within 10 days — bone marrow uptake may be affected"
  - G-CSF notes free text: "Filgrastim 300mcg SC ×3 post-chemo"
  - HTN toggle OFF, DM toggle OFF

---

#### 7. طارق عبدالله — `Re-staging (Resus Aim) + Elevated Creatinine`
- **National ID**: 29108123501077 · Male · Born 1961-08-12
- **Diagnosis**: Ca Lung (NSCLC Adenocarcinoma) — post-lobectomy
- **Visit**: **Pending_Nurse** — resus aim with side note, elevated creatinine (1.6), surgery history + "Others" field
- **Tests this patient covers**:
  - petAimResusSide field: "suspected hepatic metastasis — بعد ظهور ألم في الربع الأيمن العلوي"
  - Surgery date filled (240 days ago) + surgeryOthers free text
  - Creatinine notes: "CKD Stage II — eGFR 58 mL/min"
  - Urea notes: "مرتفع قليلاً"
  - CT/MRI YES: new hepatic lesion 2.2cm

---

### PSMA PET/CT Scenarios (Ga-68 PSMA) — Male patients only

---

#### 8. وليد ناصر — `High PSA + Bone Metastasis + History`
- **National ID**: 29703094601088 · Male · Born 1957-03-09
- **Diagnosis**: Prostate Cancer (Gleason 4+4=8)
- **Visits**: 2 PSMA records
  - Visit 1 (90 days ago): **Completed** — PSA 32.5. Prostate bed recurrence + bilateral pelvic nodes. No bone mets.
  - Visit 2 (today): **Pending_Report** — PSA 48.5. Disease progression. **New T8 vertebral bone metastasis**. ALP 145.
- **Tests this patient covers**:
  - PSMA history timeline + comparison (PSA trend: 32.5 → 48.5)
  - Bone metastasis checkbox progression (false → true)
  - Theranostic evaluation flag in impression
  - ALP as tumor marker
  - Physician report queue visible

---

#### 9. يوسف حسين — `Post-prostatectomy BCR Comparison`
- **National ID**: 29011073301099 · Male · Born 1970-11-07
- **Diagnosis**: Prostate Cancer post-radical prostatectomy
- **Visits**: 2 PSMA records
  - Visit 1 (120 days ago): **Completed** — PSA 3.2. Focal prostate bed recurrence only.
  - Visit 2 (today): **Pending_Technical** — PSA 0.8. Low PSA early detection. ALP 82. Previous PSMA reference filled.
- **Tests this patient covers**:
  - PSA trend in opposite direction (3.2 → 0.8 after treatment)
  - Pending_Technical queue for technician
  - prevPsmaDate / prevPsmaSite fields
  - History comparison: focal recurrence vs. no progression

---

#### 10. سامي الشريف — `mCRPC: DM (Insulin) + HTN + Very High PSA`
- **National ID**: 29512304401100 · Male · Born 1955-12-30
- **Diagnosis**: Prostate Cancer (metastatic castration-resistant, Gleason 4+5=9)
- **Visit**: **Pending_Nurse** — PSA 155 (very high). On docetaxel chemo (6 cycles). G-CSF given. Insulin (last dose 14 hours before). HTN (Lisinopril + Bisoprolol). Creatinine 1.45. 2 tumor markers (ALP 312, LDH 580).
- **Tests this patient covers**:
  - G-CSF notes field
  - DM insulin + last dose
  - HTN multi-drug regimen
  - Creatinine notes CKD
  - Multiple bone + visceral mets in CT/MRI field
  - Blood glucose 138 — borderline alert

---

### Thyroid Scan Scenarios (Tc-99m / I-131)

---

#### 11. سلمى عادل — `Medication Alert (Carbimazole/Methimazole)`
- **National ID**: 29203173501111 · Female · Born 1992-03-17
- **Diagnosis**: Hyperthyroidism (Graves' disease suspected)
- **Visit**: **Pending_Doctor** — visit created, form NOT yet submitted
- **What to test**:
  - Fill medication list: "Carbimazole 20mg daily + Methimazole 10mg daily"
  - System should fire medication alert: "Antithyroid drugs may affect scan uptake — consider stopping 2 weeks prior"
  - TSH: 0.02 mIU/L, T3: 6.8, T4: 2.1

---

#### 12. أنس كمال — `Therapeutic WBS (I-131 Ablation)`
- **National ID**: 29406224601122 · Male · Born 1974-06-22
- **Diagnosis**: Papillary Thyroid Carcinoma (T2N1bM0) — post-total thyroidectomy
- **Visit**: **Pending_Technical** — scan record created with TSH 85.4 (stimulated), T3/T4 very low (hypothyroid withdrawal prep). Scan subtype: `wbs_therapeutic`.
- **Tests this patient covers**:
  - wbs_therapeutic subtype selection
  - Stimulated TSH (off levothyroxine)
  - Anti-TPO + Anti-Tg antibody fields
  - Both lobes "مستأصل" in ultrasound fields

---

#### 13. رانيا سامي — `WBS Diagnostic + 2-Visit History`
- **National ID**: 29808093301133 · Female · Born 1998-08-09
- **Diagnosis**: Multinodular goiter → Suspected papillary ca (FNA positive)
- **Visits**: 2 thyroid records
  - Visit 1 (180 days ago): **Completed** — Routine thyroid scan. Cold nodule RT lobe 1.4cm detected.
  - Visit 2 (today): **Pending_Report** — Pre-op staging WBS diagnostic. RT lobe nodule 18×14mm.
- **Tests this patient covers**:
  - wbs_diagnostic subtype
  - Scan history progression (benign → suspected malignant)
  - Thyroid comparison in history timeline

---

#### 14. محمود صلاح — `Routine Thyroid Scan (Completed — for History)`
- **National ID**: 29105204401144 · Male · Born 1971-05-20
- **Diagnosis**: Primary hypothyroidism (Hashimoto's thyroiditis)
- **Visit**: **Completed** (30 days ago) — TSH 4.8, T3 1.4, T4 0.7. Impression: heterogeneous reduced uptake.
- **Purpose**: Provides completed thyroid scan data for history tab reference.

---

### Bone Scan Scenarios (Tc-99m MDP)

---

#### 15. حسن علي — `Extensive Bone Metastases (Completed)`
- **National ID**: 29602133501155 · Male · Born 1956-02-13
- **Diagnosis**: Metastatic prostate cancer
- **Visit**: **Completed** (60 days ago) — Multiple hot spots: C5-C6, T3, T8, T12, L2, bilateral ribs, sternum.
- **Purpose**: Completed bone scan for history reference + bone met comparison with PSMA patients.

---

#### 16. مروة جمال — `Annual Surveillance (Pending_Technical)`
- **National ID**: 29704054601166 · Female · Born 1977-04-05
- **Diagnosis**: Ca Breast (Stage II, ER+/PR+/HER2−) on hormonal therapy
- **Visit**: **Pending_Technical** — Annual bone surveillance scan. Technician queue entry.
- **Tests this patient covers**: Technician queue, female patient in bone scan.

---

### Renal Scan Scenarios (Tc-99m DTPA/MAG3)

---

#### 17. عادل منصور — `Renal Artery Stenosis (Pending_Report)`
- **National ID**: 29309253301177 · Male · Born 1966-09-25
- **Diagnosis**: Suspected LT renal artery stenosis → renovascular hypertension
- **Visit**: **Pending_Report** — Technical scan done, awaiting physician report.
- **Tests this patient covers**: Renal scan in Pending_Report queue.

---

#### 18. علاء الدين خليل — `Post-Transplant Function (Completed)`
- **National ID**: 29012084401188 · Male · Born 1980-12-08
- **Diagnosis**: Renal transplant in LIF — 8 months post-op
- **Visit**: **Completed** (45 days ago) — Mild acute rejection pattern on perfusion phase.
- **Purpose**: Completed renal scan for history reference.

---

### Gastric Scan Scenarios (Tc-99m Sulfur Colloid)

---

#### 19. دينا وهبة — `Gastroparesis (Pending_Doctor)`
- **National ID**: 29507313501199 · Female · Born 1995-07-31
- **Diagnosis**: Gastroparesis secondary to DM type 1
- **Visit**: **Pending_Doctor** — visit created, gastric scan form to be filled by doctor.
- **Tests this patient covers**: Gastric scan form, Pending_Doctor entry for gastric category.

---

### Meckel's Scan Scenarios (Tc-99m Pertechnetate)

---

#### 20. فريد يوسف — `Pediatric GI Bleeding (Pending_Nurse)`
- **National ID**: 31008154601200 · Male · Born 2010-08-15 (age 15)
- **Diagnosis**: Rectal bleeding, no pain — suspected Meckel's diverticulum
- **Visit**: **Pending_Nurse** — Meckel's scan request. Pediatric patient (weight 52 kg, height 158 cm).
- **Tests this patient covers**: Meckel's diverticulum scan, pediatric case, Pending_Nurse queue.

---

## Test Scenarios — Complete Checklist

### Authentication & Access

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| A1 | Valid login | ADM-001 / admin123 | Redirect to admin dashboard |
| A2 | Wrong password | DOC-001 / wrong123 | "Invalid credentials" error |
| A3 | Blocked account | BLK-001 / blk123 | "Account is inactive" error |
| A4 | Role-based redirect | NRS-001 → login | Nurse dashboard (not physician) |
| A5 | Route guard | Nurse tries /admin/users URL | Redirect to /unauthorized |

---

### Doctor Workflow

| # | Scenario | Patient | Steps | Expected |
|---|----------|---------|-------|----------|
| D1 | Fill PET/CT form (male) | مجدي رضا | Open form, add 3 markers, HTN+Insulin, submit | Visit advances to Pending_Nurse |
| D2 | Fill PET/CT form (female) | نادية إبراهيم | Fill form as female patient | Contraception field visible |
| D3 | Resus aim | طارق عبدالله | Select "Re-Staging" aim → fill resusSide text | resusSide field appears |
| D4 | G-CSF last dose < 10 days | نادية إبراهيم | Set gcsfLastDate = today − 8 days | Orange warning banner |
| D5 | Ghost text hints | كريم فؤاد (3rd visit) | Open PET/CT form | Prev scan values shown in grey hint text |
| D6 | PSMA male-only gate | Any female patient | Try to open PSMA form on female | Error: "PSMA PET/CT is for male patients only" |
| D7 | Approve report | وليد ناصر (Pending_Report) | Open physician dashboard → write impression → submit | Status → Completed, appears in history |
| D8 | View pending queue | (login as DOC-001) | Physician dashboard | Awaiting Assessment section shows Pending_Doctor visits |

---

### Nurse Workflow

| # | Scenario | Patient | Steps | Expected |
|---|----------|---------|-------|----------|
| N1 | Normal prep | Any Pending_Nurse visit | Fill prep form, submit | Visit advances to Pending_Technical |
| N2 | High glucose warning | هالة سمير | Note blood glucose = 225 | Yellow/orange glucose warning shown |
| N3 | Empty queue state | — | All visits completed | "No patients waiting" empty state |

---

### Technician Workflow

| # | Scenario | Patient | Steps | Expected |
|---|----------|---------|-------|----------|
| T1 | Perform scan | Any Pending_Technical | Fill injection time, dose, findings, submit | Visit advances to Pending_Report |
| T2 | Contraception gate | سمر عاطف | Female, contraception field empty | Warning before allowing submission |
| T3 | Contraception gate pass | ليلى فهمي | Female, contraception filled | No warning, submits normally |

---

### Patient History & Comparison

| # | Scenario | Patient | Steps | Expected |
|---|----------|---------|-------|----------|
| H1 | History timeline | كريم فؤاد | Open patient profile → Scan History | 3 PET/CT records in timeline |
| H2 | History comparison | كريم فؤاد | Select visits #1 and #3 → Compare | SUV Max, CEA trend visible |
| H3 | PSMA PSA trend | وليد ناصر | Open history | PSA 32.5 → 48.5 trend |
| H4 | Multi-scan type history | — | Patient with thyroid + bone scans | Both types in timeline |
| H5 | Empty history | New patient | Open history | "No records found" empty state |

---

### Admin Features

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| AD1 | View all users | ADM-001 → /admin/users | Full user table with roles + status |
| AD2 | Toggle user active | BLK-001 row → toggle | isActive flips, user can/cannot login |
| AD3 | Reset password | DOC-001 → reset | New password set, old one rejected |
| AD4 | View audit log | /admin/logs | All scan creations, workflow advances listed |
| AD5 | Permission override | /admin/permissions | Per-user route access override |

---

### Scan-Specific Features

| # | Feature | How to Test | Patient |
|---|---------|-------------|---------|
| S1 | Tumor markers (dynamic rows) | Add 3 markers in PET/CT form | مجدي رضا |
| S2 | Tumor markers with physician attribution | Submit → check DB `tumorMarkers` JSON | any PET/CT |
| S3 | HTN toggle + notes | HTN ON → notes field appears | طارق عبدالله |
| S4 | DM med type: Pills | DM ON → med type dropdown → "Pills" | هالة سمير |
| S5 | DM med type: Insulin + last dose date | DM ON → "Insulin" → date picker | سامي الشريف |
| S6 | DM med type: Both | DM ON → "Both" → date picker | (fill manually) |
| S7 | Urea notes | Fill notes in urea field | طارق عبدالله |
| S8 | Creatinine notes | CKD Stage II text | طارق عبدالله |
| S9 | CT/MRI toggle YES | ctMriYn ON → date + findings | طارق عبدالله |
| S10 | Surgery Others field | surgeryHistory ON → fill Others | طارق عبدالله |
| S11 | G-CSF notes textarea | gcsfGiven ON → notes field | كريم فؤاد |
| S12 | Resus side note | petAim = resus → side note field | طارق عبدالله |
| S13 | Thyroid subtype | thyroid_scan / wbs_diagnostic / wbs_therapeutic | رانيا سامي |
| S14 | Meckel's scan route | /scans/meckel | فريد يوسف |
| S15 | PSMA PSA fields | totalPSA, freePSA, gleasonScore | وليد ناصر |

---

## Workflow Stage Summary — What's in Each Queue

After running `node seedDemo.js`:

| Stage             | Count | Who sees it |
|-------------------|-------|-------------|
| Pending_Doctor    | 4     | Doctor dashboard (Awaiting Assessment) |
| Pending_Nurse     | 4     | Nurse dashboard queue |
| Pending_Technical | 5     | Technician dashboard queue |
| Pending_Report    | 5     | Physician dashboard report queue |
| Completed         | 8     | Patient history only |

---

## Scan Type Coverage Matrix

| Patient             | PET/CT | PSMA | Thyroid | Bone | Renal | Gastric | Meckel |
|---------------------|--------|------|---------|------|-------|---------|--------|
| كريم فؤاد           | ×3     |      |         |      |       |         |        |
| هالة سمير           | ×1     |      |         |      |       |         |        |
| سمر عاطف            | ×1     |      |         |      |       |         |        |
| ليلى فهمي           | ×1     |      |         |      |       |         |        |
| مجدي رضا            | ×1     |      |         |      |       |         |        |
| نادية إبراهيم       | ×1     |      |         |      |       |         |        |
| طارق عبدالله        | ×1     |      |         |      |       |         |        |
| وليد ناصر           |        | ×2   |         |      |       |         |        |
| يوسف حسين           |        | ×2   |         |      |       |         |        |
| سامي الشريف         |        | ×1   |         |      |       |         |        |
| سلمى عادل           |        |      | ×1      |      |       |         |        |
| أنس كمال            |        |      | ×1      |      |       |         |        |
| رانيا سامي          |        |      | ×2      |      |       |         |        |
| محمود صلاح          |        |      | ×1      |      |       |         |        |
| حسن علي             |        |      |         | ×1   |       |         |        |
| مروة جمال           |        |      |         | ×1   |       |         |        |
| عادل منصور          |        |      |         |      | ×1    |         |        |
| علاء الدين خليل     |        |      |         |      | ×1    |         |        |
| دينا وهبة           |        |      |         |      |       | ×1      |        |
| فريد يوسف           |        |      |         |      |       |         | ×1     |

---

## Conversion & Constants

```
1 mCi  = 37 MBq   (MCi_TO_MBq = 37)
```

Standard doses by scan type:
- PET/CT (FDG): 10–15 mCi (0.1 mCi/kg body weight; max 15 mCi)
- PSMA (Ga-68): 4–5 mCi
- Thyroid scan / WBS diagnostic: 5–10 mCi Tc-99m pertechnetate
- WBS therapeutic: 30–100 mCi I-131 (ablation)
- Bone scan: 20–25 mCi Tc-99m MDP
- Renal: 5–10 mCi Tc-99m DTPA/MAG3
- Gastric emptying: 1–2 mCi Tc-99m sulfur colloid

---

## API Endpoints Quick Reference

```
# Auth
POST /api/auth/login           { hospitalId, password }
POST /api/auth/logout

# Patients
GET  /api/patients             ?page=1&limit=20&q=searchTerm
GET  /api/patients/:id
POST /api/patients             { nationalId, name, gender, birthDate, phone, ... }
PUT  /api/patients/:id

# Workflow
GET  /api/workflow/nurse-queue        → Pending_Doctor visits (for physician "Awaiting Assessment")
GET  /api/workflow/assessment-queue   → Pending_Nurse visits (for Nurse dashboard)
GET  /api/workflow/technician-queue   → Pending_Technical visits
GET  /api/workflow/report-queue       → Pending_Report visits
POST /api/workflow/advance/:id        { workflowStatus, prep|report|scan }

# Scans
POST /api/scans/petct           { patientId, visitId, ...fields }
POST /api/scans/psma            { patientId, visitId, ...fields }
POST /api/scans/thyroid         { patientId, visitId, scanSubType, ...fields }
POST /api/scans/bone            { patientId, visitId, ...fields }
POST /api/scans/renal           { patientId, visitId, ...fields }
POST /api/scans/gastric         { patientId, visitId, ...fields }
POST /api/scans/meckel          { patientId, visitId, ...fields }

# Scan history
GET  /api/scans/history/all/:patientId
GET  /api/scans/history/petct/:patientId
GET  /api/scans/history/psma/:patientId
GET  /api/scans/history/thyroid/:patientId

# Admin
GET  /api/admin/users
POST /api/admin/users
PUT  /api/admin/users/:id/toggle-active
PUT  /api/admin/users/:id/reset-password
GET  /api/admin/logs
GET  /api/admin/permissions
PUT  /api/admin/permissions/:userId
```

---

## Important: Removed Features

The following are fully removed from the system — do not reference them:
- **Reception role** — no `reception` role exists; no reception dashboard; REC-001/REC-002 accounts do not exist
- **MedicalCase model** — removed from schema; no case creation
- **ClinicFile model** — removed from schema; no green/red file tabs
- **Appointment model** — removed from schema
- **ClinicFileTab component** — deleted
- **CaseCreate component** — deleted
- **PatientHistory clinic tab** — removed; only scan history remains
