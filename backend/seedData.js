const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getUsers() {
  const all = await prisma.user.findMany();
  const m = {};
  all.forEach(u => m[u.hospitalId] = u.id);
  return m;
}

const PATIENTS = [
  { nationalId:'29501011234567', name:'أحمد محمد علي', gender:'Male', birthDate:'1995-01-01', phone:'01012345678', address:'أسيوط - حي شرق', bloodType:'A+', maritalStatus:'Married', referringDoctor:'د. حسن' },
  { nationalId:'29803152345672', name:'فاطمة حسين', gender:'Female', birthDate:'1998-03-15', phone:'01112345678', address:'أسيوط - حي غرب', bloodType:'O+', maritalStatus:'Single', referringDoctor:'د. سمير' },
  { nationalId:'28706203456781', name:'محمود عبدالله', gender:'Male', birthDate:'1987-06-20', phone:'01212345678', address:'سوهاج', bloodType:'B+', maritalStatus:'Married', referringDoctor:'د. نادر' },
  { nationalId:'29204103456782', name:'سعاد إبراهيم', gender:'Female', birthDate:'1992-04-10', phone:'01512345678', address:'قنا', bloodType:'AB+', maritalStatus:'Married', referringDoctor:'د. عادل' },
  { nationalId:'27010054567891', name:'عبدالرحمن حسن', gender:'Male', birthDate:'1970-10-05', phone:'01098765432', address:'الأقصر', bloodType:'O-', maritalStatus:'Married', referringDoctor:'د. رامي' },
  { nationalId:'30105125678901', name:'ياسمين أحمد', gender:'Female', birthDate:'2001-05-12', phone:'01198765432', address:'أسيوط - المنشاة', bloodType:'A-', maritalStatus:'Single', referringDoctor:null },
  { nationalId:'28309187890123', name:'حسن عبدالعزيز', gender:'Male', birthDate:'1983-09-18', phone:'01298765432', address:'المنيا', bloodType:'B-', maritalStatus:'Divorced', referringDoctor:'د. ماجد' },
  { nationalId:'29508228901234', name:'مريم خالد', gender:'Female', birthDate:'1995-08-22', phone:'01598765432', address:'أسيوط - أبنوب', bloodType:'A+', maritalStatus:'Married', referringDoctor:'د. وليد' },
  { nationalId:'26512019012345', name:'السيد محمد', gender:'Male', birthDate:'1965-12-01', phone:'01011112222', address:'أسيوط - البداري', bloodType:'O+', maritalStatus:'Widowed', referringDoctor:'د. أمير' },
  { nationalId:'30208140123456', name:'نور الهدى', gender:'Female', birthDate:'2002-08-14', phone:'01522223333', address:'أسيوط - منفلوط', bloodType:'AB-', maritalStatus:'Single', referringDoctor:null },
  { nationalId:'28001301234569', name:'طارق السعيد', gender:'Male', birthDate:'1980-01-30', phone:'01033334444', address:'أسوان', bloodType:'A+', maritalStatus:'Married', referringDoctor:'د. شريف' },
  { nationalId:'29107112345670', name:'آية مصطفى', gender:'Female', birthDate:'1991-07-11', phone:'01144445555', address:'أسيوط - ساحل سليم', bloodType:'B+', maritalStatus:'Married', referringDoctor:'د. هاني' },
];

async function seed() {
  const users = await getUsers();
  const doc1 = users['DOC-001'], doc2 = users['DOC-002'], rec1 = users['REC-001'];
  const creator = rec1 || doc1 || Object.values(users)[0];

  console.log('🏥 Seeding patients...');
  const pIds = {};
  for (const p of PATIENTS) {
    const ex = await prisma.patient.findUnique({ where: { nationalId: p.nationalId } });
    if (ex) { pIds[p.nationalId] = ex.id; console.log(`  ⏩ ${p.name}`); continue; }
    const pt = await prisma.patient.create({ data: { ...p, birthDate: new Date(p.birthDate), createdBy: creator } });
    pIds[p.nationalId] = pt.id;
    console.log(`  ✅ ${p.name}`);
  }

  // Medical Cases
  console.log('\n📋 Seeding medical cases...');
  const cases = [
    { patientId: pIds['29501011234567'], diagnosis:'Papillary Thyroid Carcinoma', cancerType:'Thyroid Cancer', cancerStage:'Stage II', protocolType:'Radioiodine Therapy', startDate:new Date('2025-06-01'), status:'Active' },
    { patientId: pIds['28706203456781'], diagnosis:'Lung Adenocarcinoma', cancerType:'Lung Cancer', cancerStage:'Stage IIIA', protocolType:'Chemo + PET Follow-up', startDate:new Date('2025-03-15'), status:'Active' },
    { patientId: pIds['27010054567891'], diagnosis:'Prostate Adenocarcinoma', cancerType:'Prostate Cancer', cancerStage:'Stage II', protocolType:'PSMA-targeted', startDate:new Date('2025-01-10'), status:'Active' },
    { patientId: pIds['28309187890123'], diagnosis:'Breast Cancer Metastasis', cancerType:'Breast Cancer', cancerStage:'Stage IV', protocolType:'PET/CT Staging', startDate:new Date('2024-11-20'), status:'Follow-up' },
    { patientId: pIds['26512019012345'], diagnosis:'Colon Cancer', cancerType:'Colon Cancer', cancerStage:'Stage III', protocolType:'Chemo + PET', startDate:new Date('2024-08-01'), status:'Finished' },
  ];
  const caseIds = [];
  for (const c of cases) {
    if (!c.patientId) continue;
    const mc = await prisma.medicalCase.create({ data: { ...c, createdBy: doc1 || creator } });
    caseIds.push(mc.id);
    console.log(`  ✅ ${c.diagnosis}`);
  }

  // Green Files (Thyroid Cancer follow-up)
  console.log('\n🟢 Seeding Green Files...');
  const greenData = [
    { patientId: pIds['29501011234567'], caseId: caseIds[0], thyroglobulin:0.5, antiTg:15, tsh:0.3, ft3:3.2, ft4:1.4, radioiodineUptake:'2%', wholeBodyScanResult:'No uptake', neckUltrasound:'Normal post-op bed', treatmentPlan:'Continue Levothyroxine 150mcg', responseToTherapy:'Excellent response', physicianNotes:'مريض مستجيب بشكل ممتاز' },
    { patientId: pIds['29501011234567'], caseId: caseIds[0], followUpDate:new Date('2026-01-15'), thyroglobulin:0.3, antiTg:12, tsh:0.2, ft3:3.4, ft4:1.5, neckUltrasound:'Stable', treatmentPlan:'Continue same dose', responseToTherapy:'Excellent response', physicianNotes:'متابعة بعد 6 شهور' },
  ];
  for (const g of greenData) {
    if (!g.patientId) continue;
    await prisma.clinicGreenFile.create({ data: { ...g, followUpDate: g.followUpDate || new Date(), createdBy: doc1 || creator } });
    console.log('  ✅ Green file created');
  }

  // Red Files (Thyroid Disease follow-up)
  console.log('\n🔴 Seeding Red Files...');
  const redData = [
    { patientId: pIds['29803152345672'], diseaseType:'Hyperthyroidism', tsh:0.01, ft3:8.5, ft4:3.2, antiTpo:450, trAb:12.5, thyroidVolume:35, rightLobeSize:'5x3x2 cm', leftLobeSize:'4.5x2.8x2 cm', symptoms:'خفقان، رعشة، نقص وزن', currentMedication:'Carbimazole 30mg', physicianNotes:'بدء علاج كاربيمازول' },
    { patientId: pIds['29204103456782'], diseaseType:'Hypothyroidism', tsh:45, ft3:1.2, ft4:0.4, antiTpo:800, thyroidVolume:12, rightLobeSize:'3x2x1.5 cm', leftLobeSize:'2.8x1.8x1.3 cm', symptoms:'إرهاق، زيادة وزن، إمساك', currentMedication:'Levothyroxine 100mcg', physicianNotes:'بدء تعويض هرموني' },
    { patientId: pIds['29803152345672'], diseaseType:'Hyperthyroidism', followUpDate:new Date('2026-03-01'), tsh:0.5, ft3:4.2, ft4:1.8, trAb:5.0, symptoms:'تحسن ملحوظ', currentMedication:'Carbimazole 15mg', doseAdjustment:'تقليل الجرعة', physicianNotes:'استجابة جيدة - تقليل الجرعة' },
  ];
  for (const r of redData) {
    if (!r.patientId) continue;
    await prisma.clinicRedFile.create({ data: { ...r, followUpDate: r.followUpDate || new Date(), createdBy: doc2 || doc1 || creator } });
    console.log('  ✅ Red file created');
  }

  // Scans
  const tech = users['TEC-001'] || creator;
  console.log('\n🔬 Seeding PET/CT Scans...');
  if (pIds['28706203456781']) {
    await prisma.scanPETCT.create({ data: { patientId:pIds['28706203456781'], complaint:'كحة مزمنة ونقص وزن', diagnosis:'Lung Adenocarcinoma', referralReason:'Staging', scanPurpose:'Initial staging', surgeryHistory:'Right upper lobectomy 2025-02', chemoSessions:4, lastChemoDate:new Date('2025-09-01'), fdgDoseMCi:12.5, injectionTime:new Date('2026-05-16T08:30:00'), scanTime:new Date('2026-05-16T09:30:00'), bloodSugar:95, uptakeTime:60, bodyRegion:'Skull base to mid-thigh', suvMax:8.5, lesionLocation:'Right hilum, mediastinal LN', metastasisSign:true, metastasisDetails:'Mediastinal lymph nodes', impression:'Hypermetabolic right hilar mass with mediastinal LN involvement', workflowStatus:'Completed', performedBy:tech, reportedBy:doc1||creator, physicianNotes:'يحتاج متابعة بعد 3 أشهر' } });
    console.log('  ✅ PET/CT - Lung staging');
  }
  if (pIds['28309187890123']) {
    await prisma.scanPETCT.create({ data: { patientId:pIds['28309187890123'], complaint:'متابعة بعد كيماوي', diagnosis:'Breast Cancer Metastasis', referralReason:'Response assessment', scanPurpose:'Post-chemo evaluation', chemoSessions:6, fdgDoseMCi:11.8, injectionTime:new Date('2026-05-10T09:00:00'), scanTime:new Date('2026-05-10T10:00:00'), bloodSugar:88, uptakeTime:60, bodyRegion:'Skull base to mid-thigh', suvMax:3.2, impression:'Partial metabolic response', workflowStatus:'Completed', performedBy:tech, reportedBy:doc1||creator } });
    console.log('  ✅ PET/CT - Breast follow-up');
  }

  console.log('\n🔬 Seeding PSMA PET/CT...');
  if (pIds['27010054567891']) {
    await prisma.scanPSMAPETCT.create({ data: { patientId:pIds['27010054567891'], complaint:'ارتفاع PSA بعد الجراحة', diagnosis:'Prostate Adenocarcinoma', psaLevel:4.5, totalPSA:4.5, freePSA:0.8, gleasonScore:'4+3=7', ga68DoseMCi:5.2, injectionTime:new Date('2026-04-20T08:00:00'), scanTime:new Date('2026-04-20T09:00:00'), uptakeTime:60, prostateBedRecurrence:true, lymphNodeInvolvement:false, boneMetastasis:false, lesionLocations:'Prostate bed focal uptake', psmaExpression:'High', impression:'PSMA-avid recurrence in prostate bed', workflowStatus:'Completed', performedBy:tech, reportedBy:doc1||creator } });
    console.log('  ✅ PSMA - Prostate recurrence');
  }

  console.log('\n🔬 Seeding Thyroid Scans...');
  if (pIds['29803152345672']) {
    await prisma.scanThyroid.create({ data: { patientId:pIds['29803152345672'], complaint:'فرط نشاط الغدة', diagnosis:'Hyperthyroidism', isotopeType:'Tc-99m', t3Level:8.5, t4Level:3.2, tshLevel:0.01, isotopeDoseMCi:5.0, injectionTime:new Date('2026-05-12T08:00:00'), scanTime:new Date('2026-05-12T08:20:00'), rightLobeUptake:12, leftLobeUptake:10, totalUptake:22, rightLobeSize:'5x3x2', leftLobeSize:'4.5x2.8x2', diffuseUptake:true, impression:'Diffusely enlarged thyroid with increased uptake - Graves disease pattern', workflowStatus:'Completed', performedBy:tech, reportedBy:doc2||creator } });
    console.log('  ✅ Thyroid - Graves disease');
  }
  if (pIds['29501011234567']) {
    await prisma.scanThyroid.create({ data: { patientId:pIds['29501011234567'], complaint:'متابعة بعد استئصال', diagnosis:'Post-thyroidectomy', isotopeType:'I-131', tshLevel:55, withdrawalDays:21, isotopeDoseMCi:3.0, injectionTime:new Date('2026-04-01T07:00:00'), scanTime:new Date('2026-04-02T07:00:00'), totalUptake:0.5, impression:'Minimal residual thyroid tissue - no distant metastasis', workflowStatus:'Completed', performedBy:tech, reportedBy:doc1||creator } });
    console.log('  ✅ Thyroid - Post-thyroidectomy I-131');
  }

  console.log('\n🔬 Seeding Bone Scans...');
  if (pIds['28309187890123']) {
    await prisma.scanBone.create({ data: { patientId:pIds['28309187890123'], complaint:'آلام عظام منتشرة', diagnosis:'Breast Cancer - Bone mets screening', primaryCancer:'Breast Cancer', tc99mDoseMCi:25, injectionTime:new Date('2026-05-08T09:00:00'), scanTime:new Date('2026-05-08T12:00:00'), uptakeTime:180, skeletalMetastasis:true, metastasisLocations:'L2, L4 vertebrae, right iliac', degenerativeChanges:true, impression:'Multiple skeletal metastases L2 L4 and right iliac bone', workflowStatus:'Completed', performedBy:tech, reportedBy:doc1||creator } });
    console.log('  ✅ Bone - Breast mets');
  }
  if (pIds['28001301234569']) {
    await prisma.scanBone.create({ data: { patientId:pIds['28001301234569'], complaint:'ألم ركبة يمنى', diagnosis:'Rule out bone pathology', scanMode:'Whole body + Spot', painComplaint:'Right knee pain 3 months', tc99mDoseMCi:22, injectionTime:new Date('2026-05-14T08:30:00'), scanTime:new Date('2026-05-14T11:30:00'), uptakeTime:180, skeletalMetastasis:false, degenerativeChanges:true, traumaSites:'Right knee - degenerative', impression:'Degenerative changes right knee. No evidence of metastasis', workflowStatus:'Completed', performedBy:tech, reportedBy:doc1||creator } });
    console.log('  ✅ Bone - Degenerative');
  }

  console.log('\n🔬 Seeding Renal Scans...');
  if (pIds['29204103456782']) {
    await prisma.scanRenal.create({ data: { patientId:pIds['29204103456782'], complaint:'ألم جانبي أيمن', diagnosis:'Right hydronephrosis', scanType:'DTPA', renalComplaint:'Right flank pain', tc99mDoseMCi:10, injectionTime:new Date('2026-05-05T09:00:00'), scanTime:new Date('2026-05-05T09:05:00'), furosemideGiven:true, furosemideTime:new Date('2026-05-05T09:20:00'), rightKidneyGFR:35, leftKidneyGFR:55, rightSplitFunction:38, leftSplitFunction:62, rightT1_2:25, leftT1_2:8, obstructionSign:true, impression:'Right kidney partial obstruction with reduced function (38%)', workflowStatus:'Completed', performedBy:tech, reportedBy:doc2||creator } });
    console.log('  ✅ Renal DTPA - Obstruction');
  }
  if (pIds['30105125678901']) {
    await prisma.scanRenal.create({ data: { patientId:pIds['30105125678901'], complaint:'عدوى متكررة', diagnosis:'Recurrent UTI', scanType:'DMSA', renalComplaint:'Recurrent urinary infections', tc99mDoseMCi:5, injectionTime:new Date('2026-05-01T10:00:00'), scanTime:new Date('2026-05-01T14:00:00'), rightSplitFunction:52, leftSplitFunction:48, corticalScarring:true, impression:'Left kidney cortical scarring - compatible with chronic pyelonephritis', workflowStatus:'Completed', performedBy:tech, reportedBy:doc2||creator } });
    console.log('  ✅ Renal DMSA - Scarring');
  }

  console.log('\n🔬 Seeding Gastric & Meckel Scans...');
  if (pIds['29508228901234']) {
    await prisma.scanGastric.create({ data: { patientId:pIds['29508228901234'], complaint:'قيء متكرر بعد الأكل', diagnosis:'Gastroparesis evaluation', symptoms:'Nausea, vomiting, early satiety', mealType:'Solid - egg sandwich', tc99mDoseMCi:1, ingestionTime:new Date('2026-05-03T08:00:00'), scanStartTime:new Date('2026-05-03T08:00:00'), scanDuration:240, imageInterval:30, halfEmptyingTime:180, retention1h:85, retention2h:70, retention4h:45, delayedEmptying:true, impression:'Delayed gastric emptying - gastroparesis pattern', workflowStatus:'Completed', performedBy:tech, reportedBy:doc1||creator } });
    console.log('  ✅ Gastric - Gastroparesis');
  }
  if (pIds['30208140123456']) {
    await prisma.scanMeckel.create({ data: { patientId:pIds['30208140123456'], complaint:'نزيف شرجي متكرر', diagnosis:'Rule out Meckel diverticulum', bleedingHistory:'Recurrent painless rectal bleeding x 6 months', tc99mDoseMCi:10, injectionTime:new Date('2026-05-06T09:00:00'), scanTime:new Date('2026-05-06T09:30:00'), ectopicUptake:true, uptakeLocation:'Right lower quadrant - ectopic gastric mucosa', impression:'Positive Meckel scan - ectopic gastric mucosa RLQ', workflowStatus:'Completed', performedBy:tech, reportedBy:doc1||creator } });
    console.log('  ✅ Meckel - Positive');
  }

  // Pending workflow scans
  console.log('\n⏳ Seeding pending workflow scans...');
  if (pIds['29107112345670']) {
    await prisma.scanPETCT.create({ data: { patientId:pIds['29107112345670'], complaint:'كتلة رئوية', diagnosis:'Suspicious lung mass', referralReason:'Staging', workflowStatus:'Registered', performedBy:creator } });
    console.log('  ✅ PET/CT - Registered (awaiting nurse)');
    await prisma.scanBone.create({ data: { patientId:pIds['29107112345670'], complaint:'آلام ظهر', diagnosis:'Back pain evaluation', workflowStatus:'Prepared', prepWeight:65, prepHeight:160, prepBloodGlucose:100, injectionSite:'Right arm', performedBy:creator } });
    console.log('  ✅ Bone - Prepared (awaiting technician)');
  }
  if (pIds['26512019012345']) {
    await prisma.scanPETCT.create({ data: { patientId:pIds['26512019012345'], complaint:'متابعة سرطان قولون', diagnosis:'Colon cancer follow-up', referralReason:'Post-treatment', workflowStatus:'Scanned', fdgDoseMCi:13, injectionTime:new Date('2026-05-16T08:00:00'), scanTime:new Date('2026-05-16T09:00:00'), prepWeight:80, prepHeight:175, performedBy:creator } });
    console.log('  ✅ PET/CT - Scanned (awaiting doctor report)');
  }

  // Appointments
  console.log('\n📅 Seeding appointments...');
  const appts = [
    { patientId:pIds['29501011234567'], appointmentDate:new Date('2026-07-15'), appointmentType:'clinic_green', notes:'متابعة ملف أخضر', status:'Scheduled' },
    { patientId:pIds['29803152345672'], appointmentDate:new Date('2026-06-20'), appointmentType:'clinic_red', notes:'متابعة ملف أحمر', status:'Scheduled' },
    { patientId:pIds['28706203456781'], appointmentDate:new Date('2026-08-16'), appointmentType:'scan_petct', notes:'PET/CT follow-up', status:'Scheduled' },
    { patientId:pIds['27010054567891'], appointmentDate:new Date('2026-06-01'), appointmentType:'scan_psma', notes:'PSMA متابعة', status:'Scheduled' },
    { patientId:pIds['29204103456782'], appointmentDate:new Date('2026-04-01'), appointmentType:'clinic_red', notes:'متابعة غدة', status:'Scheduled' },
  ];
  for (const a of appts) {
    if (!a.patientId) continue;
    await prisma.appointment.create({ data: { ...a, createdBy: creator } });
    console.log(`  ✅ ${a.appointmentType} - ${a.appointmentDate.toISOString().split('T')[0]}`);
  }

  console.log('\n🎉 All seed data created successfully!');
}

seed().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
