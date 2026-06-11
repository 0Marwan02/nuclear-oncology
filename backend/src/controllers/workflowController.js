const prisma = require('../prisma');
const { emitQueue } = require('../realtime');
const { MODEL_FIELD_TYPES, TYPE_TO_MODEL } = require('../utils/scanFields');

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

const VALID_STATUSES = ['Pending_Doctor', 'Pending_Nurse', 'Pending_Technical', 'Pending_Report', 'Completed'];

const TRANSITION_RULES = {
  Pending_Doctor: { next: 'Pending_Nurse', role: 'doctor' },
  Pending_Nurse:   { next: 'Pending_Technical', role: 'nurse' },
  Pending_Technical: { next: 'Pending_Report', role: 'technician' },
  Pending_Report: { next: 'Completed', role: 'doctor' }
};

// Send-back (rejection) transitions: one step backwards, with a mandatory
// reason. Pending_Nurse is the entry point, so it has no backward step.
const RETURN_RULES = {
  Pending_Report: { prev: 'Pending_Technical', role: 'doctor' },
  Pending_Technical: { prev: 'Pending_Nurse', role: 'technician' },
};

const isReturnTransition = (currentStatus, nextStatus) => {
  const rule = RETURN_RULES[currentStatus];
  return Boolean(rule && rule.prev === nextStatus);
};

const assertReturn = (userRole, currentStatus, nextStatus) => {
  if (userRole === 'admin') return true;
  const rule = RETURN_RULES[currentStatus];
  return rule && rule.prev === nextStatus && rule.role === userRole;
};

const NEXT_ROOM_FOR_STATUS = {
  Pending_Nurse: 'nurse',
  Pending_Technical: 'technician',
  Pending_Report: 'physician',
  Completed: 'nurse'
};

const PET_TYPES = ['petct', 'psma'];
const GLUCOSE_REQUIRED_TYPES = ['petct', 'psma', 'gastric'];
const HIGH_GLUCOSE_THRESHOLD = 200;

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

// NaN and Invalid Date must never reach Prisma — skip the field instead.
const safeFloat = (val) => {
  const n = parseFloat(val);
  return isNaN(n) ? undefined : n;
};
const safeDate = (val) => {
  const d = new Date(val);
  return isNaN(d.getTime()) ? undefined : d;
};
const assign = (data, key, val) => {
  if (val !== undefined) data[key] = val;
};

const buildPrepData = (prep = {}) => {
  const data = {};
  if (prep.weight != null && prep.weight !== '') assign(data, 'prepWeight', safeFloat(prep.weight));
  if (prep.height != null && prep.height !== '') assign(data, 'prepHeight', safeFloat(prep.height));
  if (prep.bloodSugar != null && prep.bloodSugar !== '') assign(data, 'prepBloodGlucose', safeFloat(prep.bloodSugar));
  if (prep.bloodGlucose != null && prep.bloodGlucose !== '') assign(data, 'prepBloodGlucose', safeFloat(prep.bloodGlucose));
  if (prep.injectionSite) data.injectionSite = prep.injectionSite;
  if (prep.pregnancyStatus) data.pregnancyStatus = prep.pregnancyStatus;
  if (prep.nurseNotes) data.prepNurseNotes = prep.nurseNotes;
  return data;
};

const buildVisitPrepData = (prep = {}) => {
  const data = {};
  if (prep.weight != null && prep.weight !== '') assign(data, 'weight', safeFloat(prep.weight));
  if (prep.height != null && prep.height !== '') assign(data, 'height', safeFloat(prep.height));
  if (prep.bloodSugar != null && prep.bloodSugar !== '') assign(data, 'bloodGlucose', safeFloat(prep.bloodSugar));
  if (prep.bloodGlucose != null && prep.bloodGlucose !== '') assign(data, 'bloodGlucose', safeFloat(prep.bloodGlucose));
  if (prep.injectionSite) data.injectionSite = prep.injectionSite;
  if (prep.pregnancyStatus) data.pregnancyStatus = prep.pregnancyStatus;
  if (prep.nurseNotes) data.nurseNotes = prep.nurseNotes;
  return data;
};

const buildTechnicalData = (type, technical = {}) => {
  const data = {};
  const doseField = DOSE_FIELD[type];
  if (doseField && technical.dose != null && technical.dose !== '') {
    assign(data, doseField, safeFloat(technical.dose));
  }
  if (technical.doseUnit) data.doseUnit = technical.doseUnit;
  if (technical.injectionTime) assign(data, 'injectionTime', safeDate(technical.injectionTime));
  if (technical.scanTime) {
    if (type === 'gastric') assign(data, 'scanStartTime', safeDate(technical.scanTime));
    else assign(data, 'scanTime', safeDate(technical.scanTime));
  }
  if (technical.scanMode) data.scanMode = technical.scanMode;
  if (technical.delayedImages != null) data.delayedImages = Boolean(technical.delayedImages);
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

const checkSafetyGate = async (type, nextStatus, record, prep = {}) => {
  if (nextStatus === 'Completed' && type !== 'visit') {
    if (GLUCOSE_REQUIRED_TYPES.includes(type)) {
      if (record.prepBloodGlucose == null) {
        const label = type === 'gastric' ? 'Gastric Emptying' : 'PET/CT';
        return `لا يمكن حقن الجرعة قبل تسجيل نسبة السكر في الدم (فحص ${label}).`;
      }
      if (PET_TYPES.includes(type) && record.prepBloodGlucose > HIGH_GLUCOSE_THRESHOLD) {
        return `نسبة السكر مرتفعة (${record.prepBloodGlucose} mg/dL). لا يُسمح بالحقن حتى ينخفض السكر عن ${HIGH_GLUCOSE_THRESHOLD}.`;
      }
    }
  }
  return null;
};

const advanceWorkflow = async (req, res) => {
  try {
    const { type, id } = req.params;
    const { workflowStatus, prep, technical, report, returnReason } = req.body;
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

    const returning = isReturnTransition(record.workflowStatus, workflowStatus);

    if (returning) {
      if (!assertReturn(userRole, record.workflowStatus, workflowStatus)) {
        return res.status(403).json({ message: 'Unauthorized workflow transition' });
      }
      if (!returnReason || !String(returnReason).trim()) {
        return res.status(400).json({ message: 'A reason is required to return a scan' });
      }
    } else if (!assertTransition(userRole, record.workflowStatus, workflowStatus)) {
      return res.status(403).json({ message: 'Unauthorized workflow transition' });
    }

    if (!returning && userRole !== 'admin') {
      const blocked = await checkSafetyGate(type, workflowStatus, record, prep);
      if (blocked) return res.status(422).json({ message: blocked });
    }

    let updateData = { workflowStatus };

    if (returning && type !== 'visit') {
      updateData.returnReason = `${req.user.name || userRole}: ${String(returnReason).trim()}`;
      // Re-open the record so the previous station can edit it again.
      updateData.isLocked = false;
    } else if (type !== 'visit') {
      // A normal forward step clears any old rejection note.
      updateData.returnReason = null;
    }

    if (workflowStatus === 'Pending_Technical' && prep) {
      updateData = type === 'visit'
        ? { ...updateData, ...buildVisitPrepData(prep) }
        : { ...updateData, ...buildPrepData(prep) };
    }
    if (workflowStatus === 'Pending_Report' && technical && type !== 'visit') {
      updateData = { ...updateData, ...buildTechnicalData(type, technical) };
      updateData.isLocked = true;
    }
    if (workflowStatus === 'Completed' && report && type !== 'visit') {
      updateData = { ...updateData, ...buildReportData(report, req.user.id) };
    }

    // Drop any key that isn't a real column on the target model (e.g. some scan
    // types have no `scanMode`) so a stray field can never 500 the update.
    const modelCols = MODEL_FIELD_TYPES[TYPE_TO_MODEL[type]];
    if (modelCols) {
      updateData = Object.fromEntries(
        Object.entries(updateData).filter(([key]) => modelCols.has(key))
      );
    }

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

const getRegisteredVisits = async (req, res) => {
  try {
    const visits = await prisma.visit.findMany({
      where: { workflowStatus: 'Pending_Doctor' },
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
  getRegisteredVisits,
};
