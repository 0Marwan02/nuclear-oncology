/**
 * seedDemo.js — Full demonstration data for Nuclear Oncology System
 * Covers: all 8 scan types + dynamic templates, all workflow stages, all edge-case gates,
 *         all new form fields (HTN/DM, multiple markers, G-CSF notes, etc.)
 *
 * Run: node seedDemo.js
 * Idempotent: upserts users, deletes+recreates demo patients/scans.
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

// ─── USERS ────────────────────────────────────────────────────────────────────
const USERS = [
  { hospitalId: 'ADM-001', name: 'د. أحمد سعيد',        role: 'admin',      password: 'admin123', gender: 'Male',   birthDate: new Date('1980-03-15'), nationalId: '28003152301011', phone: '01000000001' },
  { hospitalId: 'DOC-001', name: 'د. محمد عبدالرحمن',   role: 'doctor',     password: 'doc123',   gender: 'Male',   birthDate: new Date('1982-07-22'), nationalId: '28207222401031', phone: '01100000001' },
  { hospitalId: 'DOC-002', name: 'د. فاطمة الزهراء',    role: 'doctor',     password: 'doc123',   gender: 'Female', birthDate: new Date('1986-11-05'), nationalId: '28611052601052', phone: '01100000002' },
  { hospitalId: 'DOC-003', name: 'د. خالد مصطفى',       role: 'doctor',     password: 'doc123',   gender: 'Male',   birthDate: new Date('1979-09-30'), nationalId: '27909302501073', phone: '01100000003' },
  { hospitalId: 'NRS-001', name: 'نورهان أحمد',          role: 'nurse',      password: 'nurse123', gender: 'Female', birthDate: new Date('1995-04-18'), nationalId: '29504182601094', phone: '01200000001' },
  { hospitalId: 'NRS-002', name: 'سارة محمود',           role: 'nurse',      password: 'nurse123', gender: 'Female', birthDate: new Date('1997-08-09'), nationalId: '29708092701115', phone: '01200000002' },
  { hospitalId: 'TEC-001', name: 'عمرو حسن',             role: 'technician', password: 'tech123',  gender: 'Male',   birthDate: new Date('1993-02-14'), nationalId: '29302142801131', phone: '01500000001' },
  { hospitalId: 'TEC-002', name: 'مصطفى كمال',           role: 'technician', password: 'tech123',  gender: 'Male',   birthDate: new Date('1990-06-27'), nationalId: '29006272901152', phone: '01500000002' },
  { hospitalId: 'BLK-001', name: 'حسام إبراهيم',         role: 'nurse',      password: 'blk123',   gender: 'Male',   birthDate: new Date('1991-12-03'), nationalId: '29112032501173', phone: '01200000099', isActive: false },
];

// ─── DEMO PATIENTS ─────────────────────────────────────────────────────────────
// nationalId format: first digit=century(2=1900s,3=2000s), next 6=YYMMDD, 2=gov, 3=seq, last=check
const PATIENTS = [
  // PET/CT patients
  { nationalId: '29506153301011', name: 'كريم فؤاد',      gender: 'Male',   birthDate: new Date('1995-06-15'), phone: '01011100001', bloodType: 'A+',  address: 'أسيوط — شارع الجمهورية', scenario: 'petct_history' },
  { nationalId: '29210224401022', name: 'هالة سمير',      gender: 'Female', birthDate: new Date('1992-10-22'), phone: '01011100002', bloodType: 'B+',  address: 'أسيوط — حي الضبعية',    scenario: 'petct_glucose_gate' },
  { nationalId: '29809073501033', name: 'سمر عاطف',       gender: 'Female', birthDate: new Date('1998-09-07'), phone: '01011100003', bloodType: 'O+',  address: 'أسيوط — الدراج',         scenario: 'petct_contraception_gate' },
  { nationalId: '29407184601044', name: 'ليلى فهمي',      gender: 'Female', birthDate: new Date('1994-07-18'), phone: '01011100004', bloodType: 'AB+', address: 'أسيوط — العزيزية',       scenario: 'petct_gate_passes' },
  { nationalId: '29601253301055', name: 'مجدي رضا',       gender: 'Male',   birthDate: new Date('1966-01-25'), phone: '01011100005', bloodType: 'A-',  address: 'أسيوط — منفلوط',          scenario: 'petct_htn_dm_markers' },
  { nationalId: '29304264401066', name: 'نادية إبراهيم',  gender: 'Female', birthDate: new Date('1973-04-26'), phone: '01011100006', bloodType: 'O-',  address: 'أسيوط — أبو تيج',         scenario: 'petct_gcsf_warning' },
  { nationalId: '29108123501077', name: 'طارق عبدالله',   gender: 'Male',   birthDate: new Date('1961-08-12'), phone: '01011100007', bloodType: 'B-',  address: 'أسيوط — ديروط',           scenario: 'petct_resus_renal' },
  // PSMA patients
  { nationalId: '29703094601088', name: 'وليد ناصر',      gender: 'Male',   birthDate: new Date('1957-03-09'), phone: '01011100008', bloodType: 'A+',  address: 'أسيوط — القوصية',         scenario: 'psma_high_psa' },
  { nationalId: '29011073301099', name: 'يوسف حسين',      gender: 'Male',   birthDate: new Date('1970-11-07'), phone: '01011100009', bloodType: 'O+',  address: 'أسيوط — البداري',          scenario: 'psma_comparison' },
  { nationalId: '29512304401100', name: 'سامي الشريف',    gender: 'Male',   birthDate: new Date('1955-12-30'), phone: '01011100010', bloodType: 'B+',  address: 'أسيوط — الفتح',            scenario: 'psma_dm_htn' },
  // Thyroid patients
  { nationalId: '29203173501111', name: 'سلمى عادل',      gender: 'Female', birthDate: new Date('1992-03-17'), phone: '01011100011', bloodType: 'A+',  address: 'أسيوط — ناصر',             scenario: 'thyroid_med_alert' },
  { nationalId: '29406224601122', name: 'أنس كمال',       gender: 'Male',   birthDate: new Date('1974-06-22'), phone: '01011100012', bloodType: 'O+',  address: 'أسيوط — دير مواس',          scenario: 'thyroid_wbs_therapeutic' },
  { nationalId: '29808093301133', name: 'رانيا سامي',     gender: 'Female', birthDate: new Date('1998-08-09'), phone: '01011100013', bloodType: 'B+',  address: 'أسيوط — المنشاة',           scenario: 'thyroid_wbs_diagnostic' },
  { nationalId: '29105204401144', name: 'محمود صلاح',     gender: 'Male',   birthDate: new Date('1971-05-20'), phone: '01011100014', bloodType: 'AB-', address: 'أسيوط — ساحل سليم',         scenario: 'thyroid_routine_complete' },
  // Bone scan patients
  { nationalId: '29602133501155', name: 'حسن علي',        gender: 'Male',   birthDate: new Date('1956-02-13'), phone: '01011100015', bloodType: 'A+',  address: 'أسيوط — مركز أسيوط',        scenario: 'bone_metastasis' },
  { nationalId: '29704054601166', name: 'مروة جمال',      gender: 'Female', birthDate: new Date('1977-04-05'), phone: '01011100016', bloodType: 'O+',  address: 'أسيوط — الغنايم',            scenario: 'bone_surveillance' },
  // Renal patients
  { nationalId: '29309253301177', name: 'عادل منصور',     gender: 'Male',   birthDate: new Date('1966-09-25'), phone: '01011100017', bloodType: 'B+',  address: 'أسيوط — أبنوب',              scenario: 'renal_stenosis' },
  { nationalId: '29012084401188', name: 'علاء الدين خليل', gender: 'Male',  birthDate: new Date('1980-12-08'), phone: '01011100018', bloodType: 'A+',  address: 'أسيوط — البداري',             scenario: 'renal_transplant' },
  // Gastric patient
  { nationalId: '29507313501199', name: 'دينا وهبة',      gender: 'Female', birthDate: new Date('1995-07-31'), phone: '01011100019', bloodType: 'O+',  address: 'أسيوط — منفلوط',             scenario: 'gastric_gastroparesis' },
  // Meckel's patient
  { nationalId: '31008154601200', name: 'فريد يوسف',      gender: 'Male',   birthDate: new Date('2010-08-15'), phone: '01011100020', bloodType: 'B+',  address: 'أسيوط — القوصية',            scenario: 'meckel_bleeding' },
  // Cardiac (MPI) patients
  { nationalId: '29405123301201', name: 'إبراهيم سليم',   gender: 'Male',   birthDate: new Date('1964-05-12'), phone: '01011100021', bloodType: 'A+',  address: 'أسيوط — الفتح',              scenario: 'cardiac_stress_complete' },
  { nationalId: '29109284401202', name: 'سها محمود',      gender: 'Female', birthDate: new Date('1969-09-28'), phone: '01011100022', bloodType: 'B+',  address: 'أسيوط — ساحل سليم',          scenario: 'cardiac_pending_report' },
  // Dynamic scan (Lung Perfusion template)
  { nationalId: '29006173501203', name: 'حمدي عوض',       gender: 'Male',   birthDate: new Date('1960-06-17'), phone: '01011100023', bloodType: 'O+',  address: 'أسيوط — أبو تيج',            scenario: 'lung_perfusion_dynamic' },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const daysAgo  = (n) => new Date(Date.now() - n * 86400000);
const hoursAgo = (h) => new Date(Date.now() - h * 3600000);

async function main() {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║  Nuclear Oncology — Comprehensive Demo Seed       ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  // ── 1. USERS ──────────────────────────────────────────────────────────────
  console.log('👥 Seeding users...');
  const userMap = {};
  for (const u of USERS) {
    const hashed = await bcrypt.hash(u.password, 10);
    const user = await prisma.user.upsert({
      where: { hospitalId: u.hospitalId },
      update: { name: u.name, role: u.role, isActive: u.isActive !== false },
      create: {
        hospitalId: u.hospitalId, name: u.name, role: u.role,
        password: hashed, gender: u.gender, birthDate: u.birthDate,
        nationalId: u.nationalId, phone: u.phone,
        isActive: u.isActive !== false,
      },
    });
    userMap[u.hospitalId] = user.id;
    console.log(`  ✅ ${u.hospitalId} — ${u.name} (${u.role})`);
  }
  const admin = userMap['ADM-001'];
  const doc1  = userMap['DOC-001'];
  const doc2  = userMap['DOC-002'];
  const doc3  = userMap['DOC-003'];
  const nur1  = userMap['NRS-001'];
  const tec1  = userMap['TEC-001'];

  // ── 2. WIPE DEMO PATIENTS ─────────────────────────────────────────────────
  console.log('\n🗑  Removing previous demo patient data...');
  const demoIds = PATIENTS.map(p => p.nationalId);
  const existing = await prisma.patient.findMany({ where: { nationalId: { in: demoIds } }, select: { id: true } });
  const existingPatientIds = existing.map(p => p.id);
  if (existingPatientIds.length > 0) {
    // Delete scan records first (FK constraint order)
    for (const model of ['scanPETCT','scanPSMAPETCT','scanThyroid','scanBone','scanRenal','scanGastric','scanMeckel','scanCardiac']) {
      await prisma[model].deleteMany({ where: { patientId: { in: existingPatientIds } } });
    }
    await prisma.dynamicScan.deleteMany({ where: { patientId: { in: existingPatientIds } } });
    await prisma.generatedReport.deleteMany({ where: { patientId: { in: existingPatientIds } } });
    await prisma.visit.deleteMany({ where: { patientId: { in: existingPatientIds } } });
    await prisma.patient.deleteMany({ where: { id: { in: existingPatientIds } } });
  }

  // ── 3. CREATE PATIENTS ────────────────────────────────────────────────────
  console.log('\n🏥 Creating demo patients...');
  const patMap = {};
  for (const p of PATIENTS) {
    const pat = await prisma.patient.create({
      data: {
        nationalId: p.nationalId, name: p.name, gender: p.gender,
        birthDate: p.birthDate, phone: p.phone, bloodType: p.bloodType,
        address: p.address, createdBy: admin,
      },
    });
    patMap[p.scenario] = pat.id;
    console.log(`  ✅ ${p.name} (${p.scenario})`);
  }

  // ── 4. VISITS & SCANS ─────────────────────────────────────────────────────
  console.log('\n📋 Creating visits & scan records...');

  const mkVisit = (patientId, category, subCategory, status, recordedBy, overrides = {}) =>
    prisma.visit.create({ data: { patientId, category, subCategory, visitDate: daysAgo(overrides.daysAgo || 0), workflowStatus: status, recordedBy, ...overrides, daysAgo: undefined } });

  // ────────────────────────────────────────────────────────────
  // SCENARIO 1: كريم فؤاد — PET/CT history (2 completed + 1 Pending_Report)
  // ────────────────────────────────────────────────────────────
  const pid1 = patMap['petct_history'];
  // Past PET/CT #1 (90 days ago, completed)
  const v1a = await mkVisit(pid1, 'PET_CT', null, 'Completed', doc1, { daysAgo: 90 });
  await prisma.scanPETCT.create({ data: {
    patientId: pid1, visitId: v1a.id,
    diagnosis: 'Ca Lung (Squamous Cell)',
    petAim: 'initial_staging',
    complaint: 'سعال دموي + ضيق تنفس',
    radioYn: false, chemoYn: false, gcsfGiven: false,
    dmHistory: false, hypertension: false, contrastAllergy: false,
    tumorMarkers: JSON.stringify([{ name: 'CEA', value: '18.4', physician: 'د. محمد عبدالرحمن' }]),
    urea: 28.0, creatinine: 0.9,
    renalFunctionDate: daysAgo(91),
    prepWeight: 72, prepHeight: 175, prepBloodGlucose: 88,
    injectionSite: 'RT hand',
    fdgDoseMCi: 12.5,
    injectionTime: daysAgo(90),
    scanTime: daysAgo(90),
    uptakeTime: 60,
    bodyRegion: 'Skull → thighs',
    suvMax: 14.2, suvMean: 8.6,
    lesionLocation: 'RT upper lobe + mediastinal LN',
    lesionSize: '3.8 × 2.9 cm',
    metastasisSign: true,
    metastasisDetails: 'Mediastinal + hilar LN involvement',
    impression: 'Hypermetabolic RUL mass with mediastinal nodal metastasis — T2N2M0 (Stage IIIA)',
    workflowStatus: 'Completed',
    performedBy: tec1, reportedBy: doc1,
  }});

  // Past PET/CT #2 (45 days ago, completed — post-chemo monitoring)
  const v1b = await mkVisit(pid1, 'PET_CT', null, 'Completed', doc1, { daysAgo: 45 });
  await prisma.scanPETCT.create({ data: {
    patientId: pid1, visitId: v1b.id,
    diagnosis: 'Ca Lung (Squamous Cell) — post 4 cycles chemo',
    petAim: 'monitoring_ttt',
    complaint: 'متابعة استجابة العلاج',
    chemoYn: true, chemoSessions: 4, lastChemoDate: daysAgo(50),
    radioYn: false, gcsfGiven: true, gcsfLastDate: daysAgo(52), gcsfNotes: 'G-CSF (Filgrastim 300mcg SC) بعد الكيماوي',
    dmHistory: false, hypertension: true, hypertensionNote: 'Amlodipine 5mg — ضغط متحكم فيه',
    contrastAllergy: false,
    tumorMarkers: JSON.stringify([
      { name: 'CEA', value: '9.2', physician: 'د. محمد عبدالرحمن' },
      { name: 'CYFRA 21-1', value: '3.8', physician: 'د. محمد عبدالرحمن' },
    ]),
    urea: 32.0, creatinine: 1.0, renalFunctionDate: daysAgo(46),
    prepWeight: 70, prepHeight: 175, prepBloodGlucose: 92,
    injectionSite: 'RT hand',
    fdgDoseMCi: 12.0,
    injectionTime: daysAgo(45),
    scanTime: daysAgo(45),
    uptakeTime: 60,
    bodyRegion: 'Skull → thighs',
    suvMax: 7.8, suvMean: 5.1,
    lesionLocation: 'RT upper lobe (residual)',
    lesionSize: '2.1 × 1.6 cm',
    metastasisSign: false,
    impression: 'Partial metabolic response — RUL mass decreased in size and FDG avidity. Mediastinal nodes resolved.',
    workflowStatus: 'Completed',
    performedBy: tec1, reportedBy: doc1,
  }});

  // Current PET/CT — Pending_Report (scanned 2 hours ago)
  const v1c = await mkVisit(pid1, 'PET_CT', null, 'Pending_Report', doc1, { daysAgo: 0 });
  await prisma.scanPETCT.create({ data: {
    patientId: pid1, visitId: v1c.id,
    diagnosis: 'Ca Lung (Squamous Cell) — end of TTT assessment',
    petAim: 'end_of_ttt',
    complaint: 'اكتمال 6 سيكل كيماوي',
    chemoYn: true, chemoSessions: 6, lastChemoDate: daysAgo(14),
    radioYn: true, radioSite: 'RT lung', lastRadiationDate: daysAgo(7),
    gcsfGiven: true, gcsfLastDate: daysAgo(10), gcsfNotes: 'Filgrastim 300mcg كل 2 يوم × 5 جرعات',
    dmHistory: false, hypertension: true, hypertensionNote: 'Amlodipine 5mg يومياً',
    contrastAllergy: false,
    tumorMarkers: JSON.stringify([
      { name: 'CEA', value: '4.1', physician: 'د. محمد عبدالرحمن' },
      { name: 'CYFRA 21-1', value: '2.2', physician: 'د. محمد عبدالرحمن' },
      { name: 'NSE', value: '12.0', physician: 'د. محمد عبدالرحمن' },
    ]),
    urea: 35.0, ureaNote: 'طبيعي — مراقبة دورية', creatinine: 1.1, creatinineNote: 'حدود طبيعة — CKD stage I',
    renalFunctionDate: daysAgo(2),
    prevPetDate: daysAgo(45), prevPetFindings: 'Partial metabolic response after 4 cycles',
    ctMriYn: true, ctMriDate: daysAgo(10), ctMriFindings: 'RUL mass 1.8 × 1.3 cm — decreased',
    prepWeight: 69, prepHeight: 175, prepBloodGlucose: 96,
    injectionSite: 'RT hand',
    fdgDoseMCi: 11.5,
    injectionTime: hoursAgo(3),
    scanTime: hoursAgo(2),
    uptakeTime: 60,
    workflowStatus: 'Pending_Report',
    performedBy: tec1,
  }});
  console.log('  ✅ كريم فؤاد (PET/CT ×3: history + Pending_Report)');

  // ────────────────────────────────────────────────────────────
  // SCENARIO 2: هالة سمير — PET/CT Pending_Nurse, blood glucose = 225 → GATE TEST
  // ────────────────────────────────────────────────────────────
  const pid2 = patMap['petct_glucose_gate'];
  const v2 = await mkVisit(pid2, 'PET_CT', null, 'Pending_Nurse', doc1, { daysAgo: 0 });
  await prisma.scanPETCT.create({ data: {
    patientId: pid2, visitId: v2.id,
    diagnosis: 'Ca Breast (IDC Grade III)',
    petAim: 'initial_staging',
    complaint: 'كتلة بالثدي الأيسر + ضخامة عقد إبطية',
    contraceptiveStatus: 'married', lmpDate: daysAgo(12),
    radioYn: false, chemoYn: false, gcsfGiven: false,
    dmHistory: true, dmMedicationType: 'Pills', dmLastDoseDate: hoursAgo(2),
    hypertension: false, contrastAllergy: false,
    tumorMarkers: JSON.stringify([{ name: 'CA 15-3', value: '68.2', physician: 'د. محمد عبدالرحمن' }]),
    urea: 22.0, creatinine: 0.8, renalFunctionDate: daysAgo(3),
    prepWeight: 68, prepHeight: 162, prepBloodGlucose: 225,
    injectionSite: 'LT hand',
    fdgDoseMCi: 10.5,
    workflowStatus: 'Pending_Nurse',
    performedBy: doc1,
  }});
  console.log('  ✅ هالة سمير (PET/CT Pending_Nurse — glucose gate: 225 mg/dL)');

  // ────────────────────────────────────────────────────────────
  // SCENARIO 3: سمر عاطف — PET/CT Pending_Technical, NO contraception → TECH GATE
  // ────────────────────────────────────────────────────────────
  const pid3 = patMap['petct_contraception_gate'];
  const v3 = await mkVisit(pid3, 'PET_CT', null, 'Pending_Technical', nur1, { daysAgo: 0 });
  await prisma.scanPETCT.create({ data: {
    patientId: pid3, visitId: v3.id,
    diagnosis: 'Diffuse Large B-Cell Lymphoma',
    petAim: 'initial_staging',
    complaint: 'تضخم العقد اللمفاوية + إرهاق',
    contraceptiveStatus: '',  // ← EMPTY — triggers tech gate
    radioYn: false, chemoYn: false, gcsfGiven: false,
    dmHistory: false, hypertension: false, contrastAllergy: false,
    tumorMarkers: JSON.stringify([{ name: 'LDH', value: '780', physician: 'د. محمد عبدالرحمن' }]),
    urea: 26.0, creatinine: 0.85, renalFunctionDate: daysAgo(1),
    prepWeight: 58, prepHeight: 165, prepBloodGlucose: 86,
    injectionSite: 'RT hand',
    fdgDoseMCi: 9.5,
    workflowStatus: 'Pending_Technical',
    performedBy: doc1,
  }});
  console.log('  ✅ سمر عاطف (PET/CT Pending_Technical — contraception gate: missing)');

  // ────────────────────────────────────────────────────────────
  // SCENARIO 4: ليلى فهمي — PET/CT Pending_Technical, all gates pass
  // ────────────────────────────────────────────────────────────
  const pid4 = patMap['petct_gate_passes'];
  const v4 = await mkVisit(pid4, 'PET_CT', null, 'Pending_Technical', nur1, { daysAgo: 0 });
  await prisma.scanPETCT.create({ data: {
    patientId: pid4, visitId: v4.id,
    diagnosis: 'Ca Ovary (Serous Carcinoma Grade III)',
    petAim: 'monitoring_ttt',
    complaint: 'متابعة بعد 3 سيكل كيماوي',
    contraceptiveStatus: 'married', lmpDate: daysAgo(22),
    chemoYn: true, chemoSessions: 3, lastChemoDate: daysAgo(21),
    radioYn: false, gcsfGiven: false,
    dmHistory: false, hypertension: false, contrastAllergy: false,
    tumorMarkers: JSON.stringify([
      { name: 'CA-125', value: '142.0', physician: 'د. محمد عبدالرحمن' },
      { name: 'HE4', value: '98.3', physician: 'د. محمد عبدالرحمن' },
    ]),
    urea: 24.0, creatinine: 0.75, renalFunctionDate: daysAgo(2),
    prevPetDate: daysAgo(65), prevPetFindings: 'Hypermetabolic pelvic mass + omental deposits',
    ctMriYn: true, ctMriDate: daysAgo(25), ctMriFindings: 'Pelvic mass reduced 40% after chemo',
    prepWeight: 65, prepHeight: 168, prepBloodGlucose: 91,
    injectionSite: 'LT hand',
    fdgDoseMCi: 10.0,
    workflowStatus: 'Pending_Technical',
    performedBy: doc1,
  }});
  console.log('  ✅ ليلى فهمي (PET/CT Pending_Technical — all gates pass)');

  // ────────────────────────────────────────────────────────────
  // SCENARIO 5: مجدي رضا — PET/CT full form (HTN + DM insulin + 3 markers)
  // ────────────────────────────────────────────────────────────
  const pid5 = patMap['petct_htn_dm_markers'];
  const v5 = await mkVisit(pid5, 'PET_CT', null, 'Pending_Doctor', admin, { daysAgo: 1 });
  console.log('  ✅ مجدي رضا (PET/CT Pending_Doctor — HTN+DM+3 markers, visit created, form to fill)');

  // ────────────────────────────────────────────────────────────
  // SCENARIO 6: نادية إبراهيم — PET/CT Pending_Doctor, G-CSF 8 days ago
  // ────────────────────────────────────────────────────────────
  const pid6 = patMap['petct_gcsf_warning'];
  const v6 = await mkVisit(pid6, 'PET_CT', null, 'Pending_Doctor', doc2, { daysAgo: 0 });
  console.log('  ✅ نادية إبراهيم (PET/CT Pending_Doctor — G-CSF warning scenario)');

  // ────────────────────────────────────────────────────────────
  // SCENARIO 7: طارق عبدالله — PET/CT Pending_Doctor, resus aim + renal notes
  // ────────────────────────────────────────────────────────────
  const pid7 = patMap['petct_resus_renal'];
  const v7 = await mkVisit(pid7, 'PET_CT', null, 'Pending_Nurse', doc1, { daysAgo: 0 });
  await prisma.scanPETCT.create({ data: {
    patientId: pid7, visitId: v7.id,
    diagnosis: 'Ca Lung (NSCLC Adenocarcinoma)',
    petAim: 'resus', resusSide: 'suspected hepatic metastasis — بعد ظهور ألم في الربع الأيمن العلوي',
    complaint: 'ألم في الربع الأيمن العلوي + ضيق تنفس',
    surgeryHistory: 'RT lower lobectomy 8 months ago (240 days)', surgeryHistoryOther: 'VATS approach — no complications',
    radioYn: true, radioSite: 'RT chest wall', lastRadiationDate: daysAgo(90),
    chemoYn: true, chemoSessions: 4, lastChemoDate: daysAgo(45),
    gcsfGiven: true, gcsfLastDate: daysAgo(42), gcsfNotes: 'Pegfilgrastim 6mg SC × 1 dose post cycle 4',
    dmHistory: false,
    hypertension: true, hypertensionNote: 'Losartan 50mg + Amlodipine 5mg — ضغط متحكم فيه',
    contrastAllergy: false,
    tumorMarkers: JSON.stringify([
      { name: 'CEA', value: '28.5', physician: 'د. محمد عبدالرحمن' },
      { name: 'CYFRA 21-1', value: '7.9', physician: 'د. محمد عبدالرحمن' },
    ]),
    urea: 48.0, ureaNote: 'مرتفع قليلاً — مريض هيبوتنشن خفيف',
    creatinine: 1.6, creatinineNote: 'CKD Stage II — eGFR 58 mL/min — يحتاج متابعة قبل التباين',
    renalFunctionDate: daysAgo(3),
    prevPetDate: daysAgo(180), prevPetFindings: 'Complete metabolic response post lobectomy',
    ctMriYn: true, ctMriDate: daysAgo(14), ctMriFindings: 'New hepatic lesion 2.2cm segment VI + pleural effusion',
    prepWeight: 74, prepHeight: 172, prepBloodGlucose: 102,
    injectionSite: 'LT forearm',
    fdgDoseMCi: 12.0,
    workflowStatus: 'Pending_Nurse',
    performedBy: doc1,
  }});
  console.log('  ✅ طارق عبدالله (PET/CT Pending_Nurse — resus aim + elevated creatinine)');

  // ────────────────────────────────────────────────────────────
  // SCENARIO 8: وليد ناصر — PSMA high PSA, Pending_Report + 1 prior
  // ────────────────────────────────────────────────────────────
  const pid8 = patMap['psma_high_psa'];
  // Completed prior PSMA
  const v8a = await mkVisit(pid8, 'PSMA_PET_CT', null, 'Completed', doc1, { daysAgo: 90 });
  await prisma.scanPSMAPETCT.create({ data: {
    patientId: pid8, visitId: v8a.id,
    diagnosis: 'Prostate Cancer (Gleason 4+4=8)',
    psaTestDate: daysAgo(92), totalPSA: 32.5, freePSA: 3.5, gleasonScore: '4+4=8',
    surgeryHistory: 'TURP', surgeryDate: daysAgo(730),
    radioYn: true, radioSite: 'Pelvis', radioSessions: 35, radioLastSession: daysAgo(180),
    chemoYn: false, gcsfGiven: false,
    hypertension: true, hypertensionNote: 'Ramipril 5mg',
    dmHistory: false, contrastAllergy: false,
    urea: 30.0, creatinine: 1.0, renalFunctionDate: daysAgo(93),
    prevPsmaDate: null, prevPsmaFindings: null,
    ctMriYn: true, ctMriDate: daysAgo(95), ctMriFindings: 'Pelvic nodes suspicious',
    prepWeight: 80, prepHeight: 170, prepBloodGlucose: 94,
    injectionSite: 'RT hand',
    ga68DoseMCi: 4.0,
    injectionTime: daysAgo(90), scanTime: daysAgo(90), uptakeTime: 60,
    prostateBedRecurrence: true, lymphNodeInvolvement: true,
    boneMetastasis: false, visceralMetastasis: false,
    lesionLocations: 'Prostate bed + external iliac nodes bilateral',
    psmaExpression: 'Focal',
    impression: 'PSMA-avid prostate bed recurrence + bilateral pelvic nodal disease. No distant mets.',
    workflowStatus: 'Completed',
    performedBy: tec1, reportedBy: doc1,
  }});

  // Current PSMA Pending_Report
  const v8b = await mkVisit(pid8, 'PSMA_PET_CT', null, 'Pending_Report', doc1, { daysAgo: 0 });
  await prisma.scanPSMAPETCT.create({ data: {
    patientId: pid8, visitId: v8b.id,
    diagnosis: 'Prostate Cancer — re-staging after hormonal therapy',
    psaTestDate: daysAgo(7), totalPSA: 48.5, freePSA: 4.8, gleasonScore: '4+4=8',
    surgeryHistory: 'TURP', surgeryDate: daysAgo(730),
    radioYn: true, radioSite: 'Pelvis', radioSessions: 35, radioLastSession: daysAgo(180),
    chemoYn: false, gcsfGiven: false,
    hypertension: true, hypertensionNote: 'Ramipril 5mg — ضغط طبيعي',
    dmHistory: false, contrastAllergy: false,
    tumorMarkers: JSON.stringify([{ name: 'ALP', value: '145', physician: 'د. محمد عبدالرحمن' }]),
    urea: 34.0, creatinine: 1.1, renalFunctionDate: daysAgo(8),
    prevPsmaDate: daysAgo(90), prevPsmaFindings: 'Prostate bed + pelvic nodes',
    ctMriYn: true, ctMriDate: daysAgo(14), ctMriFindings: 'T8 vertebral sclerotic lesion — new',
    prepWeight: 82, prepHeight: 170, prepBloodGlucose: 97,
    injectionSite: 'RT hand',
    ga68DoseMCi: 4.5,
    injectionTime: hoursAgo(4), scanTime: hoursAgo(3), uptakeTime: 60,
    prostateBedRecurrence: true, lymphNodeInvolvement: true,
    boneMetastasis: true, visceralMetastasis: false,
    lesionLocations: 'Prostate bed + bilateral pelvic/para-aortic nodes + T8 vertebral metastasis (new)',
    psmaExpression: 'Diffuse',
    impression: 'Disease progression on hormonal therapy. New T8 bone metastasis. Theranostic evaluation recommended.',
    workflowStatus: 'Pending_Report',
    performedBy: tec1,
  }});
  console.log('  ✅ وليد ناصر (PSMA ×2: completed + Pending_Report — high PSA + bone mets)');

  // ────────────────────────────────────────────────────────────
  // SCENARIO 9: يوسف حسين — PSMA comparison (1 completed + Pending_Technical)
  // ────────────────────────────────────────────────────────────
  const pid9 = patMap['psma_comparison'];
  const v9a = await mkVisit(pid9, 'PSMA_PET_CT', null, 'Completed', doc1, { daysAgo: 120 });
  await prisma.scanPSMAPETCT.create({ data: {
    patientId: pid9, visitId: v9a.id,
    diagnosis: 'Prostate Cancer post-radical prostatectomy',
    psaTestDate: daysAgo(121), totalPSA: 3.2, freePSA: 0.38, gleasonScore: '3+4=7',
    surgeryHistory: 'Radical prostatectomy', surgeryDate: daysAgo(365),
    radioYn: false, chemoYn: false, gcsfGiven: false,
    hypertension: false, dmHistory: false, contrastAllergy: false,
    urea: 28.0, creatinine: 0.95, renalFunctionDate: daysAgo(122),
    ctMriYn: false,
    prepWeight: 78, prepHeight: 175, prepBloodGlucose: 85,
    injectionSite: 'RT hand',
    ga68DoseMCi: 4.0,
    injectionTime: daysAgo(120), scanTime: daysAgo(120), uptakeTime: 60,
    prostateBedRecurrence: true, lymphNodeInvolvement: false,
    boneMetastasis: false, visceralMetastasis: false,
    lesionLocations: 'Prostate bed focal uptake',
    psmaExpression: 'Focal',
    impression: 'Focal PSMA-avid prostate bed recurrence. No nodal or distant disease.',
    workflowStatus: 'Completed',
    performedBy: tec1, reportedBy: doc1,
  }});

  const v9b = await mkVisit(pid9, 'PSMA_PET_CT', null, 'Pending_Technical', nur1, { daysAgo: 0 });
  await prisma.scanPSMAPETCT.create({ data: {
    patientId: pid9, visitId: v9b.id,
    diagnosis: 'Post-prostatectomy BCR — PSA rising',
    psaTestDate: daysAgo(5), totalPSA: 0.8, freePSA: 0.09, gleasonScore: '3+4=7',
    surgeryHistory: 'Radical prostatectomy', surgeryDate: daysAgo(365),
    radioYn: false, chemoYn: false, gcsfGiven: false,
    hypertension: false, dmHistory: false, contrastAllergy: false,
    tumorMarkers: JSON.stringify([{ name: 'ALP', value: '82', physician: 'د. محمد عبدالرحمن' }]),
    urea: 29.0, creatinine: 0.92, renalFunctionDate: daysAgo(6),
    prevPsmaDate: daysAgo(120), prevPsmaFindings: 'Focal prostate bed recurrence',
    ctMriYn: false,
    prepWeight: 77, prepHeight: 175, prepBloodGlucose: 89,
    injectionSite: 'RT hand',
    ga68DoseMCi: 4.0,
    workflowStatus: 'Pending_Technical',
    performedBy: doc1,
  }});
  console.log('  ✅ يوسف حسين (PSMA ×2: completed + Pending_Technical — comparison)');

  // ────────────────────────────────────────────────────────────
  // SCENARIO 10: سامي الشريف — PSMA Pending_Nurse (DM + HTN)
  // ────────────────────────────────────────────────────────────
  const pid10 = patMap['psma_dm_htn'];
  const v10 = await mkVisit(pid10, 'PSMA_PET_CT', null, 'Pending_Nurse', doc1, { daysAgo: 0 });
  await prisma.scanPSMAPETCT.create({ data: {
    patientId: pid10, visitId: v10.id,
    diagnosis: 'Prostate Cancer (metastatic castration-resistant)',
    psaTestDate: daysAgo(10), totalPSA: 155.0, freePSA: 12.4, gleasonScore: '4+5=9',
    surgeryHistory: 'Bilateral orchiectomy', surgeryDate: daysAgo(548),
    radioYn: false, chemoYn: true, chemoSessions: 6, chemoLastCycle: daysAgo(30),
    gcsfGiven: true, gcsfLastDate: daysAgo(28), gcsfNotes: 'Filgrastim 300mcg × 5 days',
    hypertension: true, hypertensionNote: 'Lisinopril 10mg + Bisoprolol 2.5mg',
    dmHistory: true, dmMedicationType: 'Insulin', dmLastDoseDate: hoursAgo(14),
    contrastAllergy: false,
    tumorMarkers: JSON.stringify([
      { name: 'ALP', value: '312', physician: 'د. محمد عبدالرحمن' },
      { name: 'LDH', value: '580', physician: 'د. محمد عبدالرحمن' },
    ]),
    urea: 42.0, ureaNote: 'مرتفع — CKD background',
    creatinine: 1.45, creatinineNote: 'CKD Stage II — eGFR 62',
    renalFunctionDate: daysAgo(3),
    ctMriYn: true, ctMriDate: daysAgo(20), ctMriFindings: 'Multiple bone mets (T4, L2, L5, ribs) + hepatic deposits (2)',
    prepWeight: 72, prepHeight: 165, prepBloodGlucose: 138,
    injectionSite: 'LT forearm',
    ga68DoseMCi: 4.5,
    workflowStatus: 'Pending_Nurse',
    performedBy: doc1,
  }});
  console.log('  ✅ سامي الشريف (PSMA Pending_Nurse — DM insulin + HTN + high PSA)');

  // ────────────────────────────────────────────────────────────
  // SCENARIO 11: سلمى عادل — Thyroid MEDICATION ALERT (carbimazole)
  // ────────────────────────────────────────────────────────────
  const pid11 = patMap['thyroid_med_alert'];
  const v11 = await mkVisit(pid11, 'GAMMA', 'Thyroid', 'Pending_Doctor', doc2, { daysAgo: 0 });
  console.log('  ✅ سلمى عادل (Thyroid Pending_Doctor — carbimazole med alert)');

  // ────────────────────────────────────────────────────────────
  // SCENARIO 12: أنس كمال — Thyroid WBS Therapeutic (I-131), Pending_Technical
  // ────────────────────────────────────────────────────────────
  const pid12 = patMap['thyroid_wbs_therapeutic'];
  const v12 = await mkVisit(pid12, 'GAMMA', 'Thyroid', 'Pending_Technical', nur1, { daysAgo: 0 });
  await prisma.scanThyroid.create({ data: {
    patientId: pid12, visitId: v12.id,
    scanSubType: 'wbs_therapeutic',
    indication: 'Post-total thyroidectomy ablation — papillary thyroid ca',
    diagnosis: 'Papillary Thyroid Carcinoma (T2N1bM0)',
    complaint: 'استئصال الغدة الدرقية منذ 4 أسابيع — للعلاج باليود المشع',
    tshLevel: 85.4, t3Level: 0.5, t4Level: 0.4, labDate: daysAgo(7),
    antibodies: 'Anti-TPO: 42 IU/mL, Anti-Tg: 18 IU/mL',
    rightLobeSize: 'مستأصل', leftLobeSize: 'مستأصل', isthmusSize: 'مستأصل', usDate: daysAgo(35),
    prepWeight: 78, prepHeight: 174, prepBloodGlucose: 87,
    injectionSite: 'RT hand',
    workflowStatus: 'Pending_Technical',
    performedBy: doc2,
  }});
  console.log('  ✅ أنس كمال (Thyroid WBS Therapeutic Pending_Technical)');

  // ────────────────────────────────────────────────────────────
  // SCENARIO 13: رانيا سامي — Thyroid WBS Diagnostic, 2 priors, Pending_Report
  // ────────────────────────────────────────────────────────────
  const pid13 = patMap['thyroid_wbs_diagnostic'];
  const v13a = await mkVisit(pid13, 'GAMMA', 'Thyroid', 'Completed', doc2, { daysAgo: 180 });
  await prisma.scanThyroid.create({ data: {
    patientId: pid13, visitId: v13a.id,
    scanSubType: 'thyroid_scan',
    indication: 'Goiter evaluation',
    diagnosis: 'Multinodular goiter',
    tshLevel: 2.1, t3Level: 1.8, t4Level: 1.0, labDate: daysAgo(182),
    prepWeight: 60, prepHeight: 163, prepBloodGlucose: 82,
    injectionSite: 'LT hand',
    impression: 'Heterogeneous thyroid uptake — cold nodule RT lobe 1.4cm',
    workflowStatus: 'Completed', performedBy: tec1, reportedBy: doc2,
  }});

  const v13b = await mkVisit(pid13, 'GAMMA', 'Thyroid', 'Pending_Report', doc2, { daysAgo: 0 });
  await prisma.scanThyroid.create({ data: {
    patientId: pid13, visitId: v13b.id,
    scanSubType: 'wbs_diagnostic',
    indication: 'Cold nodule RT lobe — FNA malignant cells',
    diagnosis: 'Suspected papillary thyroid ca — pre-op staging',
    complaint: 'نتيجة خزعة مشبوهة',
    tshLevel: 1.8, t3Level: 1.7, t4Level: 0.9, labDate: daysAgo(5),
    rightLobeSize: '18×14mm nodule', leftLobeSize: 'Normal 4.2cm', usDate: daysAgo(14),
    prepWeight: 61, prepHeight: 163, prepBloodGlucose: 80,
    injectionSite: 'LT hand',
    workflowStatus: 'Pending_Report', performedBy: tec1,
  }});
  console.log('  ✅ رانيا سامي (Thyroid ×2: completed + Pending_Report — WBS diagnostic)');

  // ────────────────────────────────────────────────────────────
  // SCENARIO 14: محمود صلاح — Thyroid routine scan, Completed (history)
  // ────────────────────────────────────────────────────────────
  const pid14 = patMap['thyroid_routine_complete'];
  const v14 = await mkVisit(pid14, 'GAMMA', 'Thyroid', 'Completed', doc2, { daysAgo: 30 });
  await prisma.scanThyroid.create({ data: {
    patientId: pid14, visitId: v14.id,
    scanSubType: 'thyroid_scan',
    indication: 'Hypothyroidism follow-up',
    diagnosis: 'Primary hypothyroidism on replacement therapy',
    tshLevel: 4.8, t3Level: 1.4, t4Level: 0.7, labDate: daysAgo(32),
    prepWeight: 85, prepHeight: 170, prepBloodGlucose: 95,
    injectionSite: 'RT hand',
    impression: 'Heterogeneous reduced uptake — consistent with autoimmune thyroiditis (Hashimoto\'s)',
    workflowStatus: 'Completed', performedBy: tec1, reportedBy: doc2,
  }});
  console.log('  ✅ محمود صلاح (Thyroid completed — hypothyroid follow-up)');

  // ────────────────────────────────────────────────────────────
  // SCENARIO 15: حسن علي — Bone scan completed (multiple hot spots)
  // ────────────────────────────────────────────────────────────
  const pid15 = patMap['bone_metastasis'];
  const v15 = await mkVisit(pid15, 'GAMMA', 'Bone', 'Completed', doc3, { daysAgo: 60 });
  await prisma.scanBone.create({ data: {
    patientId: pid15, visitId: v15.id,
    complaint: 'Prostate cancer bone metastasis surveillance',
    diagnosis: 'Metastatic prostate cancer',
    complaint: 'ألم عظام منتشر',
    prepWeight: 76, prepHeight: 168, prepBloodGlucose: 92,
    injectionSite: 'RT hand',
    impression: 'Multiple sites of increased osteoblastic activity: cervical spine C5-C6, T3, T8, T12, L2, bilateral ribs, sternum — extensive bone metastases',
    workflowStatus: 'Completed', performedBy: tec1, reportedBy: doc3,
  }});
  console.log('  ✅ حسن علي (Bone scan completed — extensive bone mets)');

  // ────────────────────────────────────────────────────────────
  // SCENARIO 16: مروة جمال — Bone scan Pending_Technical
  // ────────────────────────────────────────────────────────────
  const pid16 = patMap['bone_surveillance'];
  const v16 = await mkVisit(pid16, 'GAMMA', 'Bone', 'Pending_Technical', nur1, { daysAgo: 0 });
  await prisma.scanBone.create({ data: {
    patientId: pid16, visitId: v16.id,
    complaint: 'Breast cancer bone surveillance — annual — متابعة دورية سنوية',
    diagnosis: 'Ca Breast (Stage II, ER+/PR+/HER2-) on hormonal therapy',
    prepWeight: 65, prepHeight: 162, prepBloodGlucose: 88,
    injectionSite: 'LT hand',
    workflowStatus: 'Pending_Technical', performedBy: doc3,
  }});
  console.log('  ✅ مروة جمال (Bone scan Pending_Technical — breast cancer surveillance)');

  // ────────────────────────────────────────────────────────────
  // SCENARIO 17: عادل منصور — Renal scan Pending_Report
  // ────────────────────────────────────────────────────────────
  const pid17 = patMap['renal_stenosis'];
  const v17 = await mkVisit(pid17, 'GAMMA', 'Renal', 'Pending_Report', doc3, { daysAgo: 0 });
  await prisma.scanRenal.create({ data: {
    patientId: pid17, visitId: v17.id,
    complaint: 'Renovascular hypertension evaluation — ارتفاع ضغط صعب في السيطرة',
    diagnosis: 'Suspected LT renal artery stenosis',
    prepWeight: 82, prepHeight: 173, prepBloodGlucose: 104,
    injectionSite: 'RT hand',
    workflowStatus: 'Pending_Report', performedBy: tec1,
  }});
  console.log('  ✅ عادل منصور (Renal Pending_Report — renal artery stenosis)');

  // ────────────────────────────────────────────────────────────
  // SCENARIO 18: علاء الدين خليل — Renal scan Completed (transplant)
  // ────────────────────────────────────────────────────────────
  const pid18 = patMap['renal_transplant'];
  const v18 = await mkVisit(pid18, 'GAMMA', 'Renal', 'Completed', doc3, { daysAgo: 45 });
  await prisma.scanRenal.create({ data: {
    patientId: pid18, visitId: v18.id,
    complaint: 'Post-renal transplant function assessment — ارتفاع في الكرياتينين',
    diagnosis: 'Renal transplant in LIF — 8 months post-op',
    prepWeight: 74, prepHeight: 170, prepBloodGlucose: 98,
    injectionSite: 'RT hand',
    impression: 'Mildly delayed perfusion phase. Functioning renal transplant with mild acute rejection pattern — correlate clinically.',
    workflowStatus: 'Completed', performedBy: tec1, reportedBy: doc3,
  }});
  console.log('  ✅ علاء الدين خليل (Renal completed — post-transplant)');

  // ────────────────────────────────────────────────────────────
  // SCENARIO 19: دينا وهبة — Gastric scan Pending_Doctor
  // ────────────────────────────────────────────────────────────
  const pid19 = patMap['gastric_gastroparesis'];
  const v19 = await mkVisit(pid19, 'GAMMA', 'Gastric', 'Pending_Doctor', doc3, { daysAgo: 0 });
  console.log('  ✅ دينا وهبة (Gastric Pending_Doctor — gastroparesis)');

  // ────────────────────────────────────────────────────────────
  // SCENARIO 20: فريد يوسف — Meckel's scan Pending_Nurse (pediatric)
  // ────────────────────────────────────────────────────────────
  const pid20 = patMap['meckel_bleeding'];
  const v20 = await mkVisit(pid20, 'GAMMA', 'Gastric', 'Pending_Nurse', doc2, { daysAgo: 0 });
  await prisma.scanMeckel.create({ data: {
    patientId: pid20, visitId: v20.id,
    complaint: 'Lower GI bleeding — rule out Meckel\'s diverticulum — نزيف مستقيمي متكرر بدون ألم (14 سنة)',
    diagnosis: 'Suspected Meckel\'s diverticulum',
    prepWeight: 52, prepHeight: 158, prepBloodGlucose: 82,
    injectionSite: 'LT hand',
    workflowStatus: 'Pending_Nurse', performedBy: doc2,
  }});
  console.log('  ✅ فريد يوسف (Meckel\'s Pending_Nurse — pediatric GI bleed)');

  // ────────────────────────────────────────────────────────────
  // SCENARIO 21: إبراهيم سليم — Cardiac MPI completed (treadmill stress + locked)
  // ────────────────────────────────────────────────────────────
  const pid21 = patMap['cardiac_stress_complete'];
  const v21 = await mkVisit(pid21, 'GAMMA', 'Cardiac', 'Completed', doc1, { daysAgo: 30 });
  await prisma.scanCardiac.create({ data: {
    patientId: pid21, visitId: v21.id,
    diagnosis: 'Suspected CAD — exertional chest pain',
    chestPain: true, chestPainCharacter: 'compressing', chestPainOnset: 'gradual',
    chestPainDuration: 'minutes', precipitatedBy: JSON.stringify(['exercise']),
    relievedBy: JSON.stringify(['rest']),
    smoking: true, htn: true, dm: true, hyperlipidemia: true,
    angina: true, cabg: false, ptca: false,
    ecgFindings: 'NSR — no acute ST changes',
    echoFindings: 'LVEF 55% — no wall motion abnormality at rest',
    cardiacEnzymes: 'Troponin I negative',
    prepWeight: 88, prepHeight: 172, prepBloodGlucose: 112,
    injectionSite: 'RT hand',
    scanMode: JSON.stringify(['rest', 'stress']),
    treadmillExercise: true, thrBpm: 142, mets: 8.5,
    exerciseDurationMin: 7, exerciseDurationSec: 30,
    reasonEndingExercise: 'Target HR achieved',
    vitalsTable: JSON.stringify([
      { label: 'Before Rest', time: '09:00', pulse: '72', bp: '130/80', ecg: 'NSR', notes: '' },
      { label: 'Before stress', time: '09:15', pulse: '88', bp: '145/85', ecg: 'NSR', notes: '' },
      { label: 'During stress', time: '09:22', pulse: '142', bp: '180/90', ecg: 'NSR', notes: 'No chest pain' },
      { label: 'After stress', time: '09:30', pulse: '95', bp: '140/82', ecg: 'NSR', notes: '' },
      { label: 'Before Discharge', time: '10:00', pulse: '74', bp: '128/78', ecg: 'NSR', notes: 'Stable' },
    ]),
    tracer: 'Tc-99m Sestamibi', tracerDoseMCi: 25.0,
    injectionSiteSide: 'RT', injectionSiteLimb: 'hand',
    injectionTime: daysAgo(30), acquisitionTime: daysAgo(30),
    technicianPhysicist: 'عمرو حسن',
    impression: 'Reversible perfusion defect in inferolateral wall — consistent with ischemia. Recommend coronary angiography.',
    workflowStatus: 'Completed', isLocked: true,
    performedBy: tec1, reportedBy: doc1,
  }});
  console.log('  ✅ إبراهيم سليم (Cardiac MPI completed — treadmill stress, locked)');

  // ────────────────────────────────────────────────────────────
  // SCENARIO 22: سها محمود — Cardiac MPI Pending_Report (multi scan-mode)
  // ────────────────────────────────────────────────────────────
  const pid22 = patMap['cardiac_pending_report'];
  const v22 = await mkVisit(pid22, 'GAMMA', 'Cardiac', 'Pending_Report', doc2, { daysAgo: 0 });
  await prisma.scanCardiac.create({ data: {
    patientId: pid22, visitId: v22.id,
    diagnosis: 'Atypical chest pain — rule out ischemia',
    chestPain: true, chestPainCharacter: 'pricking', chestPainOnset: 'sudden',
    htn: true, dm: false, familyHx: true,
    contraceptiveStatus: 'postmenopausal',
    ecgFindings: 'NSR — T-wave flattening V4-V6',
    echoFindings: 'LVEF 60% — normal wall motion',
    prepWeight: 70, prepHeight: 160, prepBloodGlucose: 98,
    injectionSite: 'LT hand',
    scanMode: JSON.stringify(['rest', 'stress', 'delayed']),
    treadmillExercise: true, thrBpm: 138, mets: 7.2,
    exerciseDurationMin: 6, exerciseDurationSec: 45,
    tracer: 'Tc-99m Sestamibi', tracerDoseMCi: 22.0,
    injectionSiteSide: 'LT', injectionSiteLimb: 'hand',
    injectionTime: hoursAgo(4), acquisitionTime: hoursAgo(3),
    workflowStatus: 'Pending_Report',
    performedBy: tec1,
  }});
  console.log('  ✅ سها محمود (Cardiac MPI Pending_Report — multi scan-mode)');

  // ── DEMO DYNAMIC TEMPLATE (Lung Perfusion) + SCENARIO 23 ──
  console.log('\n📐 Seeding demo dynamic template (Lung Perfusion)...');
  const DEMO_TEMPLATE_KEY = 'lung_perfusion';
  let demoTpl = await prisma.scanTemplate.findUnique({ where: { key: DEMO_TEMPLATE_KEY } });
  if (demoTpl) {
    await prisma.dynamicScan.deleteMany({ where: { templateId: demoTpl.id } });
    await prisma.scanTemplateField.deleteMany({ where: { templateId: demoTpl.id } });
    await prisma.scanTemplate.delete({ where: { id: demoTpl.id } });
  }
  demoTpl = await prisma.scanTemplate.create({
    data: {
      key: DEMO_TEMPLATE_KEY,
      name: 'Lung Perfusion Scan',
      nameAr: 'فحص تروية الرئة',
      category: 'Ventilation/Perfusion',
      icon: 'Wind',
      color: '#6366f1',
      isActive: true,
      createdBy: admin,
      fields: {
        create: [
          { section: 'doctor', key: 'indication', label: 'Indication', labelAr: 'المؤشر', type: 'textarea', required: true, order: 0 },
          { section: 'doctor', key: 'diagnosis', label: 'Diagnosis', labelAr: 'التشخيص', type: 'text', required: false, order: 1 },
          { section: 'nurse', key: 'prepWeight', label: 'Weight (kg)', labelAr: 'الوزن', type: 'number', unit: 'kg', order: 0 },
          { section: 'nurse', key: 'prepBloodGlucose', label: 'Blood Glucose', labelAr: 'سكر الدم', type: 'number', unit: 'mg/dL', order: 1 },
          { section: 'tech', key: 'tracerDose', label: 'Tracer Dose', labelAr: 'جرعة المتتبع', type: 'number', unit: 'mCi', order: 0 },
          { section: 'results', key: 'perfusionDefect', label: 'Perfusion Defect', labelAr: 'عيب التروية', type: 'textarea', order: 0 },
        ],
      },
    },
  });
  console.log('  ✅ Lung Perfusion template (lung_perfusion)');

  const pid23 = patMap['lung_perfusion_dynamic'];
  const v23 = await mkVisit(pid23, 'OTHER', null, 'Pending_Nurse', doc1, { daysAgo: 0 });
  await prisma.dynamicScan.create({
    data: {
      templateId: demoTpl.id,
      patientId: pid23,
      visitId: v23.id,
      data: JSON.stringify({
        indication: 'Suspected PE — dyspnea + elevated D-dimer (980 ng/mL)',
        diagnosis: 'Rule out pulmonary embolism',
      }),
      performedBy: doc1,
      workflowStatus: 'Pending_Nurse',
    },
  });
  console.log('  ✅ حمدي عوض (Dynamic Lung Perfusion — Pending_Nurse)');

  console.log('\n✅ All demo data seeded successfully!\n');
  console.log('  Users:    9  (8 active + 1 blocked)');
  console.log('  Patients: 23 (all scenarios covered)');
  console.log('  Scans:    33 records across 8 scan types + 1 dynamic + all workflow stages');
  console.log('\n  Run: node seedDemo.js (idempotent — safe to re-run)\n');
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
