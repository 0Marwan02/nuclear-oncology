const prisma = require('../prisma');
const { emitQueue } = require('../realtime');

const MODEL_MAP = {
  visit: 'visit',
  petct: 'scanPETCT',
  psma: 'scanPSMAPETCT',
  thyroid: 'scanThyroid',
  bone: 'scanBone',
  renal: 'scanRenal',
  gastric: 'scanGastric',
  meckel: 'scanMeckel',
};

// Sequential stations (المحطات المتتابعة):
// Registered (reception Visit) -> Assessed (physician) -> Prepared (nurse)
// -> Scanned (technician) -> Completed (physician report).
const VALID_STATUSES = ['Registered', 'Assessed', 'Prepared', 'Scanned', 'Completed'];

const TRANSITION_RULES = {
  Registered: { next: 'Assessed', role: 'doctor' },      // physician assessed the encounter
  Assessed: { next: 'Prepared', role: 'nurse' },         // nurse prepared the patient
  Prepared: { next: 'Scanned', role: 'technician' },     // technician injected & imaged
  Scanned: { next: 'Completed', role: 'doctor' },        // physician signed the report
};

// Which station room should be notified after a record reaches a given status.
const NEXT_ROOM_FOR_STATUS = {
  Assessed: 'nurse',
  Prepared: 'technician',
  Scanned: 'physician',
  Completed: 'reception',
};

const PET_TYPES = ['petct', 'psma'];
const HIGH_GLUCOSE_THRESHOLD = 200; // mg/dL — block PET/CT injection above this

const DOSE_FIELD = {
  petct: 'fdgDoseMCi',
  psma: 'ga68DoseMCi',
  thyroid: 'isotopeDoseMCi',
  bone: 'tc99mDoseMCi',
  renal: 'tc99mDoseMCi',
  gastric: 'tc99mDoseMCi',
  meckel: 'tc99mDoseMCi',
};

const scanInclude = {
  patient: { select: { id: true, name: true, nationalId: true, gender: true, birthDate: true } },
  performer: { select: { name: true, role: true } },
};

const assertTransition = (userRole, currentStatus, nextStatus) => {
  if (userRole === 'admin') return true;
  const rule = TRANSITION_RULES[currentStatus];
  return rule && rule.next === nextStatus && rule.role === userRole;
};

const buildPrepData = (prep = {}) => {
  const data = {};
  if (prep.weight != null && prep.weight !== '') data.prepWeight = parseFloat(prep.weight);
  if (prep.height != null && prep.height !== '') data.prepHeight = parseFloat(prep.height);
  if (prep.bloodSugar != null && prep.bloodSugar !== '') data.prepBloodGlucose = parseFloat(prep.bloodSugar);
  if (prep.bloodGlucose != null && prep.bloodGlucose !== '') data.prepBloodGlucose = parseFloat(prep.bloodGlucose);
  if (prep.injectionSite) data.injectionSite = prep.injectionSite;
  if (prep.cannulaSize) data.cannulaSize = prep.cannulaSize;
  if (prep.pregnancyStatus) data.pregnancyStatus = prep.pregnancyStatus;
  if (prep.nurseNotes) data.prepNurseNotes = prep.nurseNotes;
  return data;
};

const buildVisitPrepData = (prep = {}) => {
  const data = {};
  if (prep.weight != null && prep.weight !== '') data.weight = parseFloat(prep.weight);
  if (prep.height != null && prep.height !== '') data.height = parseFloat(prep.height);
  if (prep.bloodSugar != null && prep.bloodSugar !== '') data.bloodGlucose = parseFloat(prep.bloodSugar);
  if (prep.bloodGlucose != null && prep.bloodGlucose !== '') data.bloodGlucose = parseFloat(prep.bloodGlucose);
  if (prep.injectionSite) data.injectionSite = prep.injectionSite;
  if (prep.pregnancyStatus) data.pregnancyStatus = prep.pregnancyStatus;
  if (prep.nurseNotes) data.nurseNotes = prep.nurseNotes;
  return data;
};

const buildTechnicalData = (type, technical = {}) => {
  const data = {};
  const doseField = DOSE_FIELD[type];
  if (doseField && technical.dose != null && technical.dose !== '') {
    data[doseField] = parseFloat(technical.dose);
  }
  if (technical.injectionTime) data.injectionTime = new Date(technical.injectionTime);
  if (technical.scanTime) {
    if (type === 'gastric') data.scanStartTime = new Date(technical.scanTime);
    else data.scanTime = new Date(technical.scanTime);
  }
  if (technical.notes) data.technicianNotes = technical.notes;
  return data;
};

const buildReportData = (report = {}, userId) => {
  const data = { reportedBy: userId };
  if (report.impression != null) data.impression = report.impression;
  if (report.physicianNotes != null) data.physicianNotes = report.physicianNotes;
  return data;
};

const logWorkflowAudit = async (tx, userId, tableName, recordId, action, oldValues, newValues) => {
  await tx.auditLog.create({
    data: {
      userId,
      tableName,
      recordId,
      action,
      oldValues: oldValues ? JSON.stringify(oldValues) : null,
      newValues: newValues ? JSON.stringify(newValues) : null,
    },
  });
};

// Error-prevention gates (منع الأخطاء). Returns an Arabic message string when
// the transition must be blocked, or null when it is safe to proceed.
const checkSafetyGate = async (type, nextStatus, record, prep = {}) => {
  // Nurse confirm (Assessed -> Prepared): PET/CT must have blood sugar, and it
  // must not be high — "لا يسمح بالانتقال للفني والسكر مرتفع".
  if (nextStatus === 'Prepared' && PET_TYPES.includes(type)) {
    const incoming = prep.bloodGlucose ?? prep.bloodSugar;
    const glucose = (incoming != null && incoming !== '')
      ? parseFloat(incoming)
      : record.prepBloodGlucose;
    if (glucose == null || Number.isNaN(glucose)) {
      return 'يجب تسجيل نسبة السكر في الدم قبل إرسال المريض للفني (فحص PET/CT).';
    }
    if (glucose > HIGH_GLUCOSE_THRESHOLD) {
      return `نسبة السكر مرتفعة (${glucose} mg/dL). لا يُسمح بالانتقال للفني حتى ينخفض السكر عن ${HIGH_GLUCOSE_THRESHOLD}.`;
    }
  }

  // Technician confirm (Prepared -> Scanned) = the injection point. Block the
  // radioactive dose until sugar (PET/CT) and contraception (females) are recorded.
  if (nextStatus === 'Scanned' && type !== 'visit') {
    if (PET_TYPES.includes(type) && (record.prepBloodGlucose == null)) {
      return 'لا يمكن حقن الجرعة قبل تسجيل نسبة السكر في الدم.';
    }
    const patient = await prisma.patient.findUnique({
      where: { id: record.patientId },
      select: { gender: true },
    });
    const isFemale = patient?.gender === 'Female' || patient?.gender === 'أنثى';
    if (isFemale && !record.pregnancyStatus) {
      return 'لا يمكن حقن الجرعة لمريضة قبل تسجيل وسائل منع الحمل / تاريخ آخر دورة (LMP).';
    }
  }

  return null;
};

const advanceWorkflow = async (req, res) => {
  try {
    const { type, id } = req.params;
    const { workflowStatus, prep, technical, report } = req.body;
    const userRole = req.user.role;

    const modelName = MODEL_MAP[type];
    if (!modelName) {
      return res.status(400).json({ message: `Invalid type. Allowed: ${Object.keys(MODEL_MAP).join(', ')}` });
    }
    if (!VALID_STATUSES.includes(workflowStatus)) {
      return res.status(400).json({ message: `Invalid status. Allowed: ${VALID_STATUSES.join(', ')}` });
    }

    const record = await prisma[modelName].findUnique({ where: { id } });
    if (!record) return res.status(404).json({ message: 'Record not found' });

    if (!assertTransition(userRole, record.workflowStatus, workflowStatus)) {
      return res.status(403).json({ message: 'Unauthorized workflow transition' });
    }

    // Safety gates (admin may override).
    if (userRole !== 'admin') {
      const blocked = await checkSafetyGate(type, workflowStatus, record, prep);
      if (blocked) return res.status(422).json({ message: blocked });
    }

    let updateData = { workflowStatus };

    if (workflowStatus === 'Prepared' && prep) {
      updateData = type === 'visit'
        ? { ...updateData, ...buildVisitPrepData(prep) }
        : { ...updateData, ...buildPrepData(prep) };
    }
    if (workflowStatus === 'Scanned' && technical && type !== 'visit') {
      updateData = { ...updateData, ...buildTechnicalData(type, technical) };
    }
    if (workflowStatus === 'Completed' && report) {
      updateData = { ...updateData, ...buildReportData(report, req.user.id) };
    }

    // Visit has no performer/reporter relations, so use a visit-safe include.
    const include = type === 'visit'
      ? { patient: { select: { id: true, name: true, nationalId: true, gender: true, birthDate: true } } }
      : scanInclude;

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx[modelName].update({
        where: { id },
        data: updateData,
        include,
      });
      await logWorkflowAudit(
        tx,
        req.user.id,
        modelName,
        id,
        'WORKFLOW',
        { workflowStatus: record.workflowStatus },
        { workflowStatus, ...updateData }
      );
      return updated;
    });

    // Notify the next station's queue (live push).
    const nextRoom = NEXT_ROOM_FOR_STATUS[workflowStatus];
    if (nextRoom) {
      emitQueue(nextRoom, { event: 'advanced', status: workflowStatus, record: { ...result, scanType: type } });
    }

    res.json({ ...result, scanType: type });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const updateWorkflowStatus = async (req, res) => {
  req.body = { workflowStatus: req.body.workflowStatus, prep: req.body.prep, technical: req.body.technical, report: req.body.report };
  return advanceWorkflow(req, res);
};

const getRecordsByStatus = async (req, res) => {
  try {
    const { type } = req.params;
    const { status, patientId } = req.query;

    const modelName = MODEL_MAP[type];
    if (!modelName) {
      return res.status(400).json({ message: `Invalid type. Allowed: ${Object.keys(MODEL_MAP).join(', ')}` });
    }

    const where = {};
    if (status) where.workflowStatus = status;
    if (patientId) where.patientId = patientId;

    const records = await prisma[modelName].findMany({
      where,
      include: scanInclude,
      orderBy: { createdAt: 'desc' },
    });

    const enriched = records.map((r) => ({
      ...r,
      scanType: type,
      prepWeight: r.prepWeight ?? r.weight,
      prepBloodGlucose: r.prepBloodGlucose ?? r.bloodGlucose ?? r.bloodSugar,
    }));

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getAllByStatus = async (req, res) => {
  try {
    const { status } = req.query;
    const types = Object.keys(MODEL_MAP).filter((t) => t !== 'visit');
    const results = await Promise.all(
      types.map(async (type) => {
        const modelName = MODEL_MAP[type];
        const where = status ? { workflowStatus: status } : {};
        const records = await prisma[modelName].findMany({
          where,
          include: scanInclude,
          orderBy: { createdAt: 'desc' },
        });
        return records.map((r) => ({
          ...r,
          scanType: type,
          prepWeight: r.prepWeight,
          prepBloodGlucose: r.prepBloodGlucose ?? r.bloodSugar,
        }));
      })
    );
    const combined = results.flat().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(combined);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getPatientWorkflow = async (req, res) => {
  try {
    const { patientId } = req.params;

    const visits = await prisma.visit.findMany({
      where: { patientId },
      select: { id: true, visitDate: true, workflowStatus: true, weight: true, height: true, bloodGlucose: true },
      orderBy: { visitDate: 'desc' },
    });

    const scanTypes = ['scanPETCT', 'scanPSMAPETCT', 'scanThyroid', 'scanBone', 'scanRenal', 'scanGastric', 'scanMeckel'];
    const scanLabels = {
      scanPETCT: 'petct',
      scanPSMAPETCT: 'psma',
      scanThyroid: 'thyroid',
      scanBone: 'bone',
      scanRenal: 'renal',
      scanGastric: 'gastric',
      scanMeckel: 'meckel',
    };
    const scans = {};

    for (const model of scanTypes) {
      const items = await prisma[model].findMany({
        where: { patientId },
        select: { id: true, createdAt: true, workflowStatus: true, impression: true, diagnosis: true },
        orderBy: { createdAt: 'desc' },
      });
      scans[scanLabels[model]] = items;
    }

    res.json({ visits, scans });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Physician assessment queue: encounters opened by reception (Visit, Registered)
// awaiting the physician to choose a scan sheet and record clinical data.
const getAssessmentQueue = async (req, res) => {
  try {
    const visits = await prisma.visit.findMany({
      where: { workflowStatus: 'Registered' },
      include: {
        patient: { select: { id: true, name: true, nationalId: true, gender: true, birthDate: true, phone: true } },
        recorder: { select: { id: true, name: true, role: true } },
      },
      orderBy: { visitDate: 'desc' },
    });
    res.json(visits.map((v) => ({ ...v, scanType: 'visit' })));
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = {
  advanceWorkflow,
  updateWorkflowStatus,
  getRecordsByStatus,
  getAllByStatus,
  getPatientWorkflow,
  getAssessmentQueue,
};
