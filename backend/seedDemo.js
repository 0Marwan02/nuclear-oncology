/**
 * Comprehensive demo seed for the Sequential Station Flow.
 *
 * Populates every station queue and every edge case so each role sees a
 * realistic dashboard on login:
 *   - Physician assessment queue : Visits  (workflowStatus 'Registered')
 *   - Nurse queue                : Scans   ('Assessed')
 *   - Technician queue           : Scans   ('Prepared')  + safety-gate cases
 *   - Physician reporting queue  : Scans   ('Scanned')
 *   - History / comparison       : Scans   ('Completed') — multiple per patient
 *   - Clinic green/red files, medical cases, appointments (upcoming + overdue)
 *
 * Idempotent: re-running wipes only the DEMO patients' transactional records
 * (scoped by nationalId) and rebuilds them. Users are (re)seeded via seedUsers.
 *
 * Run:  node seedDemo.js
 */
const { PrismaClient } = require('@prisma/client');
const { seedUsers } = require('./seedUsers');
const prisma = new PrismaClient();

const d = (s) => new Date(s);
const daysFromNow = (n) => new Date(Date.now() + n * 86400000);

// ─── Demo patients (recognizable 3000/2900 nationalIds) ──────────────────────
const PATIENTS = [
  { nationalId: '30001011111111', name: 'كريم فؤاد',      gender: 'Male',   birthDate: '1980-01-01', phone: '01000000101', address: 'أسيوط - حي شرق',   bloodType: 'A+',  maritalStatus: 'Married' },
  { nationalId: '29502022222222', name: 'هالة سمير',      gender: 'Female', birthDate: '1985-02-02', phone: '01000000102', address: 'أسيوط - حي غرب',   bloodType: 'O+',  maritalStatus: 'Married' },
  { nationalId: '28803033333333', name: 'وليد ناصر',      gender: 'Male',   birthDate: '1968-03-03', phone: '01000000103', address: 'سوهاج',            bloodType: 'B+',  maritalStatus: 'Married' },
  { nationalId: '29904044444444', name: 'سلمى عادل',      gender: 'Female', birthDate: '1989-04-04', phone: '01000000104', address: 'قنا',              bloodType: 'AB+', maritalStatus: 'Single'  },
  { nationalId: '30205055555555', name: 'يوسف جمال',      gender: 'Male',   birthDate: '1992-05-05', phone: '01000000105', address: 'الأقصر',           bloodType: 'O-',  maritalStatus: 'Married' },
  { nationalId: '29006066666666', name: 'دعاء راضي',      gender: 'Female', birthDate: '1990-06-06', phone: '01000000106', address: 'أسيوط - المنشاة',  bloodType: 'A-',  maritalStatus: 'Married' },
  { nationalId: '30307077777777', name: 'عمر هشام',       gender: 'Male',   birthDate: '2003-07-07', phone: '01000000107', address: 'المنيا',           bloodType: 'B-',  maritalStatus: 'Single'  },
  { nationalId: '29708088888888', name: 'ريم طارق',       gender: 'Female', birthDate: '1987-08-08', phone: '01000000108', address: 'أسيوط - أبنوب',    bloodType: 'A+',  maritalStatus: 'Married' },
  { nationalId: '28509099999999', name: 'أنس كمال',       gender: 'Male',   birthDate: '1965-09-09', phone: '01000000109', address: 'أسيوط - البداري',  bloodType: 'O+',  maritalStatus: 'Widowed' },
  { nationalId: '29610101010101', name: 'ليلى فهمي',      gender: 'Female', birthDate: '1986-10-10', phone: '01000000110', address: 'أسيوط - منفلوط',   bloodType: 'AB-', maritalStatus: 'Married' },
  { nationalId: '30011111212121', name: 'محمد صبري',      gender: 'Male',   birthDate: '1994-11-11', phone: '01000000111', address: 'أسوان',            bloodType: 'A+',  maritalStatus: 'Single'  },
  { nationalId: '29712121313131', name: 'نهى رأفت',       gender: 'Female', birthDate: '1979-12-12', phone: '01000000112', address: 'أسيوط - ساحل سليم', bloodType: 'B+',  maritalStatus: 'Married' },
  { nationalId: '29013141414141', name: 'سمر عاطف',       gender: 'Female', birthDate: '1993-01-14', phone: '01000000113', address: 'أسيوط - ديروط',    bloodType: 'O+',  maritalStatus: 'Single'  },
];

async function getUsers() {
  const all = await prisma.user.findMany();
  const m = {};
  all.forEach((u) => (m[u.hospitalId] = u.id));
  return m;
}

async function resetDemoData(demoIds) {
  if (demoIds.length === 0) return;
  const where = { patientId: { in: demoIds } };

  // Gather demo visit ids first (children reference visitId, not patientId).
  const visits = await prisma.visit.findMany({ where, select: { id: true } });
  const visitIds = visits.map((v) => v.id);
  const byVisit = { visitId: { in: visitIds } };

  // FK-safe deletion order.
  if (visitIds.length) {
    await prisma.labResult.deleteMany({ where: byVisit });
    await prisma.imagingResult.deleteMany({ where: byVisit });
    await prisma.radiationDose.deleteMany({ where: byVisit });
  }
  await prisma.scanPETCT.deleteMany({ where });
  await prisma.scanPSMAPETCT.deleteMany({ where });
  await prisma.scanThyroid.deleteMany({ where });
  await prisma.scanBone.deleteMany({ where });
  await prisma.scanRenal.deleteMany({ where });
  await prisma.scanGastric.deleteMany({ where });
  await prisma.scanMeckel.deleteMany({ where });
  await prisma.clinicGreenFile.deleteMany({ where });
  await prisma.clinicRedFile.deleteMany({ where });
  await prisma.appointment.deleteMany({ where });
  await prisma.visit.deleteMany({ where });
  await prisma.medicalCase.deleteMany({ where });
}

async function main() {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║  Nuclear Oncology — Comprehensive Demo Seed  ║');
  console.log('╚════════════════════════════════════════════╝\n');

  await seedUsers();
  const users = await getUsers();
  const doc1 = users['DOC-001'];
  const doc2 = users['DOC-002'] || doc1;
  const rec1 = users['REC-001'];
  const tech1 = users['TEC-001'] || doc1;
  const creator = rec1 || doc1 || Object.values(users)[0];
  if (!creator) throw new Error('No users found — run seedUsers first.');

  // ── Patients (upsert by nationalId) ──
  console.log('\n🏥 Patients...');
  const P = {};
  for (const p of PATIENTS) {
    const existing = await prisma.patient.findUnique({ where: { nationalId: p.nationalId } });
    if (existing) {
      P[p.nationalId] = existing.id;
    } else {
      const created = await prisma.patient.create({
        data: { ...p, birthDate: d(p.birthDate), createdBy: creator },
      });
      P[p.nationalId] = created.id;
    }
    console.log(`  ✅ ${p.name} (${p.gender})`);
  }
  const id = (nid) => P[nid];

  // ── Reset demo transactional data so the seed is idempotent ──
  console.log('\n🧹 Clearing previous demo records (scoped to demo patients)...');
  await resetDemoData(Object.values(P));

  // ── Medical cases (cancer patients) ──
  console.log('\n📋 Medical cases...');
  const caseLung = await prisma.medicalCase.create({ data: { patientId: id('30001011111111'), diagnosis: 'Lung Adenocarcinoma', cancerType: 'Lung Cancer', cancerStage: 'Stage IIIA', protocolType: 'Chemo + PET Follow-up', startDate: d('2025-10-01'), status: 'Active', createdBy: doc1 } });
  const caseProstate = await prisma.medicalCase.create({ data: { patientId: id('28803033333333'), diagnosis: 'Prostate Adenocarcinoma', cancerType: 'Prostate Cancer', cancerStage: 'Stage II', protocolType: 'PSMA-targeted', startDate: d('2025-06-10'), status: 'Active', createdBy: doc1 } });
  const caseThyCa = await prisma.medicalCase.create({ data: { patientId: id('29708088888888'), diagnosis: 'Papillary Thyroid Carcinoma', cancerType: 'Thyroid Cancer', cancerStage: 'Stage I', protocolType: 'Radioiodine Therapy', startDate: d('2025-08-15'), status: 'Active', createdBy: doc2 } });
  await prisma.medicalCase.create({ data: { patientId: id('28509099999999'), diagnosis: 'Follicular Thyroid Carcinoma', cancerType: 'Thyroid Cancer', cancerStage: 'Stage II', protocolType: 'Post-thyroidectomy I-131', startDate: d('2025-03-01'), status: 'Follow-up', createdBy: doc2 } });
  console.log('  ✅ 4 cases');

  // ════════════════════════════════════════════════════════════════════════
  //  STATION 1 → 2 : Reception encounters awaiting physician assessment
  //  (Visit, workflowStatus 'Registered')  → PHYSICIAN ASSESSMENT QUEUE
  // ════════════════════════════════════════════════════════════════════════
  console.log('\n🟦 Assessment queue — Visits (Registered)...');
  const assessVisits = [
    { nid: '29006066666666', note: 'ألم بالخاصرة اليمنى ودم في البول — يُحتمل مسح كلى' },
    { nid: '28509099999999', note: 'متابعة بعد استئصال الغدة — مسح يود مشع' },
    { nid: '30011111212121', note: 'كتلة رئوية مشتبهة — تحديد المرحلة' },
    { nid: '29712121313131', note: 'آلام عظام منتشرة — استبعاد ثانويات' },
  ];
  for (const v of assessVisits) {
    await prisma.visit.create({ data: { patientId: id(v.nid), visitDate: new Date(), doctorNotes: v.note, workflowStatus: 'Registered', recordedBy: rec1 || creator } });
    console.log(`  ✅ Visit Registered — ${v.note.slice(0, 28)}…`);
  }

  // ════════════════════════════════════════════════════════════════════════
  //  STATION 2 → 3 : Physician assessed, awaiting nurse  ('Assessed')
  //  → NURSE QUEUE
  // ════════════════════════════════════════════════════════════════════════
  console.log('\n🟩 Nurse queue — Scans (Assessed)...');
  // PET/CT female — nurse must record blood sugar + contraception (LMP)
  await prisma.scanPETCT.create({ data: { patientId: id('29502022222222'), complaint: 'نقص وزن وتعرق ليلي', diagnosis: 'Lymphoma — staging', referralReason: 'Initial staging', scanPurpose: 'Initial staging', chemoSessions: 0, workflowStatus: 'Assessed', performedBy: doc1 } });
  // Thyroid with interfering medication → MedicationAlert when viewed
  await prisma.scanThyroid.create({ data: { patientId: id('29904044444444'), complaint: 'خفقان ورعشة', diagnosis: 'Hyperthyroidism', isotopeType: 'Tc-99m', symptoms: 'palpitations, tremor, weight loss', currentMedications: 'كاربيمازول 20mg', medicationStopped: false, tshLevel: 0.02, t3Level: 8.1, t4Level: 3.0, workflowStatus: 'Assessed', performedBy: doc2 } });
  // Meckel (paediatric male)
  await prisma.scanMeckel.create({ data: { patientId: id('30307077777777'), complaint: 'نزيف شرجي غير مؤلم', diagnosis: 'Rule out Meckel diverticulum', bleedingHistory: 'Recurrent painless rectal bleeding', workflowStatus: 'Assessed', performedBy: doc1 } });
  console.log('  ✅ PET/CT (F), Thyroid (carbimazole), Meckel');

  // ════════════════════════════════════════════════════════════════════════
  //  STATION 3 → 4 : Nurse prepared, awaiting technician  ('Prepared')
  //  → TECHNICIAN QUEUE  (incl. safety-gate scenarios)
  // ════════════════════════════════════════════════════════════════════════
  console.log('\n🟧 Technician queue — Scans (Prepared)...');
  // Bone, male, non-PET → technician can complete freely (no gate)
  await prisma.scanBone.create({ data: { patientId: id('30205055555555'), complaint: 'ألم أسفل الظهر', diagnosis: 'Back pain — screen for mets', scanMode: 'Whole body', painComplaint: 'Lower back, 2 months', prepWeight: 78, prepHeight: 174, prepBloodGlucose: 102, injectionSite: 'right_arm', cannulaSize: '20G', workflowStatus: 'Prepared', performedBy: doc1 } });
  // PET/CT female, fully prepared (sugar + contraception recorded) → PASSES gate
  await prisma.scanPETCT.create({ data: { patientId: id('29610101010101'), complaint: 'متابعة استجابة', diagnosis: 'Breast cancer — response', referralReason: 'Response assessment', scanPurpose: 'Post-chemo evaluation', chemoSessions: 6, prepWeight: 70, prepHeight: 162, prepBloodGlucose: 96, injectionSite: 'left_arm', cannulaSize: '22G', pregnancyStatus: 'LMP 2026-05-20 — not pregnant', workflowStatus: 'Prepared', performedBy: doc1 } });
  // PET/CT female, sugar recorded but NO contraception → technician BLOCKED by gate
  await prisma.scanPETCT.create({ data: { patientId: id('29013141414141'), complaint: 'تحديد مرحلة', diagnosis: 'Cervical cancer — staging', referralReason: 'Staging', scanPurpose: 'Initial staging', prepWeight: 60, prepHeight: 158, prepBloodGlucose: 92, injectionSite: 'right_arm', cannulaSize: '22G', workflowStatus: 'Prepared', performedBy: doc1 } });
  console.log('  ✅ Bone (free), PET/CT-F (passes), PET/CT-F (contraception gate blocks)');

  // ════════════════════════════════════════════════════════════════════════
  //  STATION 4 → 5 : Technician imaged, awaiting physician report  ('Scanned')
  //  → PHYSICIAN REPORTING QUEUE
  // ════════════════════════════════════════════════════════════════════════
  console.log('\n🟪 Reporting queue — Scans (Scanned)...');
  await prisma.scanPSMAPETCT.create({ data: { patientId: id('28803033333333'), complaint: 'ارتفاع PSA', diagnosis: 'Prostate Adenocarcinoma', psaLevel: 6.2, totalPSA: 6.2, freePSA: 0.9, gleasonScore: '4+3=7', ga68DoseMCi: 5.0, injectionTime: d('2026-05-30T08:00:00'), scanTime: d('2026-05-30T09:00:00'), uptakeTime: 60, prepWeight: 82, prepHeight: 176, prepBloodGlucose: 99, injectionSite: 'right_arm', prostateBedRecurrence: true, lymphNodeInvolvement: true, lesionLocations: 'Prostate bed + pelvic LN', psmaExpression: 'High', workflowStatus: 'Scanned', performedBy: tech1 } });
  await prisma.scanGastric.create({ data: { patientId: id('29708088888888'), complaint: 'قيء وغثيان بعد الأكل', diagnosis: 'Gastroparesis evaluation', symptoms: 'nausea, early satiety', mealType: 'Solid — egg sandwich', tc99mDoseMCi: 1, ingestionTime: d('2026-05-30T08:00:00'), scanStartTime: d('2026-05-30T08:05:00'), scanDuration: 240, imageInterval: 30, halfEmptyingTime: 175, retention1h: 84, retention2h: 66, retention4h: 41, prepWeight: 64, prepHeight: 159, prepBloodGlucose: 90, workflowStatus: 'Scanned', performedBy: tech1 } });
  await prisma.scanPETCT.create({ data: { patientId: id('30001011111111'), complaint: 'متابعة سرطان رئة', diagnosis: 'Lung Adenocarcinoma', referralReason: 'Response assessment', scanPurpose: 'Post-chemo evaluation', chemoSessions: 4, fdgDoseMCi: 12.5, injectionTime: d('2026-05-31T08:00:00'), scanTime: d('2026-05-31T09:00:00'), uptakeTime: 60, prepWeight: 74, prepHeight: 170, prepBloodGlucose: 101, bodyRegion: 'Skull base to mid-thigh', suvMax: 4.1, workflowStatus: 'Scanned', performedBy: tech1 } });
  console.log('  ✅ PSMA, Gastric, PET/CT awaiting report');

  // ════════════════════════════════════════════════════════════════════════
  //  COMPLETED scans — history & previous-scan comparison
  //  (≥2 of the same type per patient for the PreviousScanBanner)
  // ════════════════════════════════════════════════════════════════════════
  console.log('\n✅ Completed scans (history / comparison)...');
  // P1 (كريم) — two prior PET/CT → comparison banner on the next PET/CT
  await prisma.scanPETCT.create({ data: { patientId: id('30001011111111'), complaint: 'تحديد مرحلة أولية', diagnosis: 'Lung Adenocarcinoma', scanPurpose: 'Initial staging', fdgDoseMCi: 12, injectionTime: d('2025-11-10T08:00:00'), scanTime: d('2025-11-10T09:00:00'), prepBloodGlucose: 98, suvMax: 11.2, lesionLocation: 'Right hilar mass + mediastinal LN', metastasisSign: true, metastasisDetails: 'Mediastinal LN', impression: 'Hypermetabolic right hilar mass — baseline staging', workflowStatus: 'Completed', performedBy: tech1, reportedBy: doc1, createdAt: d('2025-11-10T10:00:00') } });
  await prisma.scanPETCT.create({ data: { patientId: id('30001011111111'), complaint: 'متابعة بعد كيماوي', diagnosis: 'Lung Adenocarcinoma', scanPurpose: 'Interim response', fdgDoseMCi: 12.3, injectionTime: d('2026-02-15T08:00:00'), scanTime: d('2026-02-15T09:00:00'), prepBloodGlucose: 100, suvMax: 6.5, impression: 'Partial metabolic response vs baseline', workflowStatus: 'Completed', performedBy: tech1, reportedBy: doc1, createdAt: d('2026-02-15T10:00:00') } });
  // P3 (وليد) — prior PSMA completed
  await prisma.scanPSMAPETCT.create({ data: { patientId: id('28803033333333'), diagnosis: 'Prostate Adenocarcinoma', psaLevel: 4.5, ga68DoseMCi: 5.1, injectionTime: d('2025-12-01T08:00:00'), scanTime: d('2025-12-01T09:00:00'), prostateBedRecurrence: true, psmaExpression: 'High', impression: 'PSMA-avid recurrence in prostate bed', workflowStatus: 'Completed', performedBy: tech1, reportedBy: doc1, createdAt: d('2025-12-01T10:00:00') } });
  // P5 (يوسف) — prior bone completed
  await prisma.scanBone.create({ data: { patientId: id('30205055555555'), diagnosis: 'Bone pain — prior study', scanMode: 'Whole body', tc99mDoseMCi: 22, injectionTime: d('2026-01-20T08:30:00'), scanTime: d('2026-01-20T11:30:00'), uptakeTime: 180, skeletalMetastasis: false, degenerativeChanges: true, impression: 'Degenerative changes; no metastasis', workflowStatus: 'Completed', performedBy: tech1, reportedBy: doc1, createdAt: d('2026-01-20T12:00:00') } });
  // P6 (دعاء) — renal completed (DTPA obstruction)
  await prisma.scanRenal.create({ data: { patientId: id('29006066666666'), diagnosis: 'Right hydronephrosis', scanType: 'DTPA', renalComplaint: 'Right flank pain', tc99mDoseMCi: 10, injectionTime: d('2026-03-05T09:00:00'), scanTime: d('2026-03-05T09:05:00'), furosemideGiven: true, furosemideTime: d('2026-03-05T09:20:00'), rightKidneyGFR: 34, leftKidneyGFR: 56, rightSplitFunction: 37, leftSplitFunction: 63, obstructionSign: true, impression: 'Right partial obstruction, reduced function (37%)', workflowStatus: 'Completed', performedBy: tech1, reportedBy: doc2, createdAt: d('2026-03-05T10:00:00') } });
  // P9 (أنس) — thyroid I-131 whole-body completed
  await prisma.scanThyroid.create({ data: { patientId: id('28509099999999'), diagnosis: 'Post-thyroidectomy', isotopeType: 'I-131', tshLevel: 58, withdrawalDays: 21, isotopeDoseMCi: 3, injectionTime: d('2026-02-01T07:00:00'), scanTime: d('2026-02-02T07:00:00'), totalUptake: 0.4, impression: 'Minimal residual tissue; no distant metastasis', workflowStatus: 'Completed', performedBy: tech1, reportedBy: doc2, createdAt: d('2026-02-02T09:00:00') } });
  console.log('  ✅ 6 completed (incl. PET/CT ×2 for comparison)');

  // ── Clinic green files (Thyroid Cancer follow-up) ──
  console.log('\n🟢 Green files...');
  await prisma.clinicGreenFile.create({ data: { patientId: id('29708088888888'), caseId: caseThyCa.id, followUpDate: new Date(), thyroglobulin: 0.4, antiTg: 14, tsh: 0.3, ft3: 3.3, ft4: 1.4, radioiodineUptake: '1%', wholeBodyScanResult: 'No abnormal uptake', neckUltrasound: 'Normal post-op bed', treatmentPlan: 'Levothyroxine 150mcg', responseToTherapy: 'Excellent response', physicianNotes: 'استجابة ممتازة', createdBy: doc2 } });
  await prisma.clinicGreenFile.create({ data: { patientId: id('28509099999999'), followUpDate: daysFromNow(120), thyroglobulin: 0.6, tsh: 0.4, treatmentPlan: 'Continue suppression', responseToTherapy: 'Indeterminate', physicianNotes: 'متابعة بعد 4 شهور', createdBy: doc2 } });
  console.log('  ✅ 2 green files');

  // ── Clinic red files (Thyroid Disease follow-up) ──
  console.log('\n🔴 Red files...');
  await prisma.clinicRedFile.create({ data: { patientId: id('29904044444444'), diseaseType: 'Hyperthyroidism', followUpDate: new Date(), tsh: 0.02, ft3: 8.1, ft4: 3.0, trAb: 11.5, thyroidVolume: 34, symptoms: 'خفقان، رعشة، نقص وزن', currentMedication: 'Carbimazole 20mg', physicianNotes: 'بدء كاربيمازول', createdBy: doc2 } });
  await prisma.clinicRedFile.create({ data: { patientId: id('29006066666666'), diseaseType: 'Hypothyroidism', followUpDate: daysFromNow(45), tsh: 38, ft4: 0.5, antiTpo: 720, symptoms: 'إرهاق، زيادة وزن', currentMedication: 'Levothyroxine 75mcg', doseAdjustment: 'زيادة الجرعة', physicianNotes: 'تعديل الجرعة', createdBy: doc2 } });
  console.log('  ✅ 2 red files');

  // ── Appointments (overdue + upcoming → follow-up reminder panel) ──
  console.log('\n📅 Appointments...');
  const appts = [
    { patientId: id('29904044444444'), appointmentDate: daysFromNow(-7),  appointmentType: 'clinic_red',   notes: 'متابعة فرط نشاط — متأخرة',  status: 'Scheduled' },
    { patientId: id('29006066666666'), appointmentDate: daysFromNow(-2),  appointmentType: 'clinic_red',   notes: 'ضبط جرعة — متأخرة',          status: 'Scheduled' },
    { patientId: id('29708088888888'), appointmentDate: daysFromNow(14),  appointmentType: 'clinic_green',  notes: 'متابعة ملف أخضر',           status: 'Scheduled' },
    { patientId: id('28803033333333'), appointmentDate: daysFromNow(30),  appointmentType: 'scan_psma',     notes: 'PSMA متابعة',               status: 'Scheduled' },
    { patientId: id('30001011111111'), appointmentDate: daysFromNow(45),  appointmentType: 'scan_petct',    notes: 'PET/CT متابعة',             status: 'Scheduled' },
    { patientId: id('28509099999999'), appointmentDate: daysFromNow(120), appointmentType: 'clinic_green',  notes: 'متابعة بعد اليود',           status: 'Scheduled' },
  ];
  for (const a of appts) {
    await prisma.appointment.create({ data: { ...a, createdBy: creator } });
  }
  console.log('  ✅ 6 appointments (2 overdue, 4 upcoming)');

  console.log('\n🎉 Demo seed complete. Queues populated for every role.\n');
  console.log('   Physician assessment : 4 visits');
  console.log('   Nurse                : 3 scans (incl. PET/CT-F + carbimazole thyroid)');
  console.log('   Technician           : 3 scans (1 free, 1 passes gate, 1 blocked on contraception)');
  console.log('   Physician reporting  : 3 scans');
  console.log('   Completed/history    : 6 scans (PET/CT ×2 for comparison)\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
