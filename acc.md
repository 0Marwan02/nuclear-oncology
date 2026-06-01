# حسابات الدخول وبيانات التجربة — مركز الإشعاع النووي
# Login Accounts & Demo Data

> Login is by **Hospital ID** + **Password** (not email). Arabic UI, RTL.

## 🔑 Accounts

| الدور / Role | Hospital ID | Password | الاسم / Name | Notes |
|---|---|---|---|---|
| **Admin / مدير** | `ADM-001` | `admin123` | د. أحمد سعيد | Full access; bypasses station gates; manages users & audit logs |
| **Doctor / طبيب** | `DOC-001` | `doc123` | د. محمد عبدالرحمن | Assessment + reporting queues |
| **Doctor / طبيب** | `DOC-002` | `doc123` | د. فاطمة الزهراء | (thyroid clinic files) |
| **Doctor / طبيب** | `DOC-003` | `doc123` | د. خالد مصطفى | |
| **Nurse / تمريض** | `NRS-001` | `nurse123` | نورهان أحمد | Preparation queue |
| **Nurse / تمريض** | `NRS-002` | `nurse123` | سارة محمود | |
| **Technician / فني** | `TEC-001` | `tech123` | عمرو حسن | Injection & imaging queue |
| **Technician / فني** | `TEC-002` | `tech123` | مصطفى كمال | |
| **Reception / استقبال** | `REC-001` | `rec123` | هدى عبدالله | Register patients & open encounters |
| **Reception / استقبال** | `REC-002` | `rec123` | منى السيد | |
| ~~Nurse (blocked)~~ | `BLK-001` | `blk123` | حسام إبراهيم | **Inactive** — login is rejected (tests the blocked-account path) |

---

## ▶️ Seeding the demo data

From `backend/` (SQL Server must be running and `prisma generate` / migrations applied):

```bash
node seedDemo.js
```

This **(re)seeds users** and rebuilds a full demo. It is **idempotent** — re-running wipes only the demo patients' records (scoped by national ID) and recreates them, so you always get a clean, known state.

> `node seed.js` runs the older basic seed; **use `seedDemo.js`** for the full station-flow demo.

---

## 🔄 The flow being demonstrated (المحطات المتتابعة)

```
Reception → Physician (assessment) → Nurse → Technician → Physician (report)
Registered →      Assessed         → Prepared →  Scanned  →     Completed
 (Visit)          (Scan created)
```

Each "Confirm (تأكيد)" pushes the patient to the next station's queue **live** (WebSocket — no refresh needed). Open several roles in separate browser windows/profiles to watch it move.

---

## 🧪 What each login will see (after `node seedDemo.js`)

| Login | Lands on | Pre-loaded queue |
|---|---|---|
| `REC-001` | Reception | Patient search + register; "إرسال للطبيب" opens an encounter |
| `DOC-001` | Physician | **4** patients *awaiting assessment* + **3** scans *awaiting report* + clinic cards + follow-up reminders (2 overdue, 4 upcoming) |
| `NRS-001` | Nurse | **3** patients *awaiting preparation* |
| `TEC-001` | Technician | **3** scans *ready to image* |
| `ADM-001` | Admin overview | KPIs, all users, audit logs |

---

## ✅ Test scenarios baked into the demo

| # | Scenario | How to test | Expected |
|---|---|---|---|
| 1 | **Happy path** | Reception registers → DOC assesses (pick a scan sheet) → NRS prepares → TEC images → DOC reports | Patient appears on each next dashboard instantly |
| 2 | **High blood sugar gate (PET/CT)** | As `NRS-001`, open the PET/CT female "هالة سمير", enter blood sugar **> 200** and confirm | Blocked: "السكر مرتفع… لا يُسمح بالانتقال للفني" |
| 3 | **Contraception gate (female dose)** | As `TEC-001`, open "سمر عاطف" (PET/CT, no LMP recorded) and confirm | Blocked (422): must record منع الحمل / LMP first |
| 4 | **Gate passes** | As `TEC-001`, open "ليلى فهمي" (sugar + LMP recorded) and confirm | Proceeds to physician reporting |
| 5 | **Medication alert** | As `DOC-001`, assess a **Thyroid** scan and type `كاربيمازول` in current medications (or view "سلمى عادل") | Iodine-interference warning appears |
| 6 | **History / comparison** | Create/assess a new **PET/CT** for "كريم فؤاد" (already has 2 completed) | Previous-scan banner + comparison shows |
| 7 | **Interactive diagram** | As `DOC-001`, assess a **Thyroid** scan → mark lobes/nodules on the diagram | Diagram data saved with the scan |
| 8 | **Attachments** | In any scan form, upload an old image via the mobile upload control | File stored under `/uploads` |
| 9 | **Blocked account** | Try `BLK-001 / blk123` | Login rejected — "Account is blocked by administration" |
| 10 | **Admin override** | As `ADM-001`, move any record across any transition | No gate blocks admin |

---

## 👥 Demo patients

13 patients (national-ID prefixed `30…`/`29…`), mixed male/female to exercise the
female-only contraception gate. Cancer patients (lung, prostate, thyroid) carry
medical cases and clinic files. Key ones:

- **كريم فؤاد** — lung cancer, 2 prior PET/CT (history/comparison) + 1 awaiting report
- **هالة سمير** (F) — PET/CT awaiting nurse (blood-sugar gate)
- **وليد ناصر** — prostate, PSMA awaiting report + prior PSMA
- **سلمى عادل** (F) — hyperthyroid, thyroid scan with **carbimazole** (med alert) + red file
- **سمر عاطف** (F) — PET/CT prepared, **no contraception** (tech gate blocks)
- **ليلى فهمي** (F) — PET/CT prepared, contraception recorded (gate passes)
- **ريم طارق** (F) — thyroid cancer green file + gastric scan awaiting report
- **أنس كمال** — post-thyroidectomy I-131 (green file) + assessment visit
