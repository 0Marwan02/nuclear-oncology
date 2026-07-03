const prisma = require('../prisma');
const { pickClinicalFields, filterBodyByRole } = require('../utils/scanFields');

const scanInclude = {
  patient: true,
  visit: true,
  performer: { select: { id: true, name: true, hospitalId: true } },
  reporter: { select: { id: true, name: true, hospitalId: true } }
};

const withRoleClinical = (req, modelName, data) => ({
  ...data,
  ...filterBodyByRole(req.body, req.user?.role || 'guest', modelName),
});

const LOCKED_EDIT_MSG = 'This record is locked and can only be modified by a doctor or admin';

const loadScanForUpdate = async (model, id, res, notFoundMsg, user) => {
  const existing = await prisma[model].findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ message: notFoundMsg });
    return null;
  }
  if (existing.isLocked && user?.role !== 'admin' && user?.role !== 'doctor') {
    res.status(403).json({ message: LOCKED_EDIT_MSG });
    return null;
  }
  return existing;
};

// New scans may only enter the workflow at its start — never at a later
// stage, which would skip the nurse/technician steps and the safety gates.
const CREATE_STATUSES = new Set(['Pending_Doctor', 'Pending_Nurse']);
const safeCreateStatus = (s) => (CREATE_STATUSES.has(s) ? s : 'Pending_Nurse');

// ===== PET-CT =====

const createPETCT = async (req, res) => {
  const {
    patientId, visitId, referralReason, fdgDoseMCi, injectionTime, scanTime,
    bloodSugar, uptakeTime, bodyRegion, suvMax, suvMean, lesionLocation,
    lesionSize, metastasisSign, metastasisDetails, impression, physicianNotes, reportedBy
  } = req.body;

  if (!patientId) return res.status(400).json({ message: 'patientId is required' });

  try {
    const fileUrl = req.file ? `/uploads/scans/${req.file.filename}` : null;

    const result = await prisma.$transaction(async (tx) => {
      const scan = await tx.scanPETCT.create({
        data: {
          ...pickClinicalFields(req.body, 'ScanPETCT'),
          patientId, visitId, referralReason, fdgDoseMCi: fdgDoseMCi ?? req.body.fdgDose,
          injectionTime: injectionTime ? new Date(injectionTime) : null,
          scanTime: scanTime ? new Date(scanTime) : null,
          bloodSugar, uptakeTime, bodyRegion, suvMax, suvMean,
          lesionLocation, lesionSize,
          metastasisSign: metastasisSign ?? req.body.metastasisPresent ?? false,
          metastasisDetails, impression, physicianNotes,
          fileUrl, performedBy: req.user.id, reportedBy,
          workflowStatus: safeCreateStatus(req.body.workflowStatus),
        },
        include: scanInclude
      });

      await tx.auditLog.create({
        data: {
          userId: req.user.id, tableName: 'ScanPETCT', recordId: scan.id,
          action: 'INSERT',
          newValues: JSON.stringify({ patientId, referralReason, impression })
        }
      });

      return scan;
    });

    return res.status(201).json(result);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create PET-CT scan', error: error.message });
  }
};

const getPETCTs = async (req, res) => {
  const { patientId } = req.query;
  try {
    const where = patientId ? { patientId } : {};
    const scans = await prisma.scanPETCT.findMany({
      where, orderBy: { createdAt: 'desc' }, include: scanInclude, take: 100,
    });
    return res.json(scans);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to list PET-CT scans', error: error.message });
  }
};

const getPETCT = async (req, res) => {
  try {
    const scan = await prisma.scanPETCT.findUnique({
      where: { id: req.params.id }, include: scanInclude
    });
    if (!scan) return res.status(404).json({ message: 'PET-CT scan not found' });
    return res.json(scan);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to get PET-CT scan', error: error.message });
  }
};

const updatePETCT = async (req, res) => {
  const {
    visitId, referralReason, fdgDoseMCi, injectionTime, scanTime,
    bloodSugar, uptakeTime, bodyRegion, suvMax, suvMean, lesionLocation,
    lesionSize, metastasisSign, metastasisDetails, impression, physicianNotes, reportedBy
  } = req.body;

  try {
    const existing = await loadScanForUpdate('scanPETCT', req.params.id, res, 'PET-CT scan not found', req.user);
    if (!existing) return;

    const fileUrl = req.file ? `/uploads/scans/${req.file.filename}` : existing.fileUrl;

    const result = await prisma.$transaction(async (tx) => {
      const scan = await tx.scanPETCT.update({
        where: { id: req.params.id },
        data: withRoleClinical(req, 'ScanPETCT', {
          visitId, referralReason, fdgDoseMCi,
          injectionTime: injectionTime ? new Date(injectionTime) : undefined,
          scanTime: scanTime ? new Date(scanTime) : undefined,
          bloodSugar, uptakeTime, bodyRegion, suvMax, suvMean,
          lesionLocation, lesionSize, metastasisSign, metastasisDetails,
          impression, physicianNotes, fileUrl, reportedBy
        }),
        include: scanInclude
      });

      await tx.auditLog.create({
        data: {
          userId: req.user.id, tableName: 'ScanPETCT', recordId: scan.id,
          action: 'UPDATE',
          oldValues: JSON.stringify(existing),
          newValues: JSON.stringify({
            visitId, referralReason, fdgDoseMCi, bloodSugar, uptakeTime,
            bodyRegion, suvMax, suvMean, lesionLocation, lesionSize,
            metastasisSign, metastasisDetails, impression, physicianNotes, fileUrl, reportedBy
          })
        }
      });

      return scan;
    });

    return res.json(result);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update PET-CT scan', error: error.message });
  }
};

const getPETCTHistory = async (req, res) => {
  try {
    const scans = await prisma.scanPETCT.findMany({
      where: { patientId: req.params.patientId },
      orderBy: { createdAt: 'desc' },
      include: scanInclude,
      take: 100,
    });
    return res.json(scans);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to get PET-CT history', error: error.message });
  }
};

// ===== PSMA PET-CT =====

const createPSMAPETCT = async (req, res) => {
  const {
    patientId, visitId, psaLevel, gleasonScore, ga68DoseMCi, injectionTime, scanTime,
    uptakeTime, prostateBedRecurrence, lymphNodeInvolvement, boneMetastasis,
    visceralMetastasis, lesionLocations, psmaExpression, impression, physicianNotes, reportedBy
  } = req.body;

  if (!patientId) return res.status(400).json({ message: 'patientId is required' });

  try {
    const fileUrl = req.file ? `/uploads/scans/${req.file.filename}` : null;

    const result = await prisma.$transaction(async (tx) => {
      const scan = await tx.scanPSMAPETCT.create({
        data: {
          ...pickClinicalFields(req.body, 'ScanPSMAPETCT'),
          patientId, visitId, gleasonScore, ga68DoseMCi: ga68DoseMCi ?? req.body.ga68Dose,
          injectionTime: injectionTime ? new Date(injectionTime) : null,
          scanTime: scanTime ? new Date(scanTime) : null,
          uptakeTime,
          prostateBedRecurrence: prostateBedRecurrence ?? false,
          lymphNodeInvolvement: lymphNodeInvolvement ?? false,
          boneMetastasis: boneMetastasis ?? false,
          visceralMetastasis: visceralMetastasis ?? false,
          lesionLocations, psmaExpression, impression, physicianNotes,
          fileUrl, performedBy: req.user.id, reportedBy,
          workflowStatus: safeCreateStatus(req.body.workflowStatus),
        },
        include: scanInclude
      });

      await tx.auditLog.create({
        data: {
          userId: req.user.id, tableName: 'ScanPSMAPETCT', recordId: scan.id,
          action: 'INSERT',
          newValues: JSON.stringify({ patientId, psaLevel, impression })
        }
      });

      return scan;
    });

    return res.status(201).json(result);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create PSMA PET-CT scan', error: error.message });
  }
};

const getPSMAPETCTs = async (req, res) => {
  const { patientId } = req.query;
  try {
    const where = patientId ? { patientId } : {};
    const scans = await prisma.scanPSMAPETCT.findMany({
      where, orderBy: { createdAt: 'desc' }, include: scanInclude, take: 100,
    });
    return res.json(scans);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to list PSMA PET-CT scans', error: error.message });
  }
};

const getPSMAPETCT = async (req, res) => {
  try {
    const scan = await prisma.scanPSMAPETCT.findUnique({
      where: { id: req.params.id }, include: scanInclude
    });
    if (!scan) return res.status(404).json({ message: 'PSMA PET-CT scan not found' });
    return res.json(scan);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to get PSMA PET-CT scan', error: error.message });
  }
};

const updatePSMAPETCT = async (req, res) => {
  const {
    visitId, psaLevel, gleasonScore, ga68DoseMCi, injectionTime, scanTime,
    uptakeTime, prostateBedRecurrence, lymphNodeInvolvement, boneMetastasis,
    visceralMetastasis, lesionLocations, psmaExpression, impression, physicianNotes, reportedBy
  } = req.body;

  try {
    const existing = await loadScanForUpdate('scanPSMAPETCT', req.params.id, res, 'PSMA PET-CT scan not found', req.user);
    if (!existing) return;

    const fileUrl = req.file ? `/uploads/scans/${req.file.filename}` : existing.fileUrl;

    const result = await prisma.$transaction(async (tx) => {
      const scan = await tx.scanPSMAPETCT.update({
        where: { id: req.params.id },
        data: withRoleClinical(req, 'ScanPSMAPETCT', {
          visitId, psaLevel, gleasonScore, ga68DoseMCi,
          injectionTime: injectionTime ? new Date(injectionTime) : undefined,
          scanTime: scanTime ? new Date(scanTime) : undefined,
          uptakeTime, prostateBedRecurrence, lymphNodeInvolvement,
          boneMetastasis, visceralMetastasis, lesionLocations, psmaExpression,
          impression, physicianNotes, fileUrl, reportedBy
        }),
        include: scanInclude
      });

      await tx.auditLog.create({
        data: {
          userId: req.user.id, tableName: 'ScanPSMAPETCT', recordId: scan.id,
          action: 'UPDATE',
          oldValues: JSON.stringify(existing),
          newValues: JSON.stringify({
            visitId, psaLevel, gleasonScore, ga68DoseMCi, uptakeTime,
            prostateBedRecurrence, lymphNodeInvolvement, boneMetastasis,
            visceralMetastasis, lesionLocations, psmaExpression, impression, physicianNotes, fileUrl, reportedBy
          })
        }
      });

      return scan;
    });

    return res.json(result);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update PSMA PET-CT scan', error: error.message });
  }
};

const getPSMAPETCTHistory = async (req, res) => {
  try {
    const scans = await prisma.scanPSMAPETCT.findMany({
      where: { patientId: req.params.patientId },
      orderBy: { createdAt: 'desc' },
      include: scanInclude,
      take: 100,
    });
    return res.json(scans);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to get PSMA PET-CT history', error: error.message });
  }
};

// ===== Thyroid =====

const createThyroid = async (req, res) => {
  const {
    patientId, visitId, isotopeType, isotopeDoseMCi, injectionTime, scanTime,
    tshLevel, withdrawalDays, rightLobeUptake, leftLobeUptake, totalUptake,
    rightLobeSize, leftLobeSize, isthmusSize, glandPosition, hotNodules,
    coldNodules, diffuseUptake, heterogenousUptake, diagramData, impression, physicianNotes, reportedBy
  } = req.body;

  if (!patientId || !isotopeType) return res.status(400).json({ message: 'patientId and isotopeType are required' });

  try {
    const fileUrl = req.file ? `/uploads/scans/${req.file.filename}` : null;

    const result = await prisma.$transaction(async (tx) => {
      const scan = await tx.scanThyroid.create({
        data: {
          ...pickClinicalFields(req.body, 'ScanThyroid'),
          patientId, visitId, isotopeType, isotopeDoseMCi: isotopeDoseMCi ?? req.body.isotopeDose,
          injectionTime: injectionTime ? new Date(injectionTime) : null,
          scanTime: scanTime ? new Date(scanTime) : null,
          tshLevel, withdrawalDays, rightLobeUptake, leftLobeUptake, totalUptake,
          rightLobeSize, leftLobeSize, isthmusSize, glandPosition,
          hotNodules, coldNodules,
          diffuseUptake: diffuseUptake ?? false,
          heterogenousUptake: heterogenousUptake ?? req.body.heterogeneousUptake ?? false,
          diagramData: typeof diagramData === 'object' ? JSON.stringify(diagramData) : diagramData,
          impression, physicianNotes,
          fileUrl, performedBy: req.user.id, reportedBy,
          workflowStatus: safeCreateStatus(req.body.workflowStatus),
        },
        include: scanInclude
      });

      await tx.auditLog.create({
        data: {
          userId: req.user.id, tableName: 'ScanThyroid', recordId: scan.id,
          action: 'INSERT',
          newValues: JSON.stringify({ patientId, isotopeType, impression })
        }
      });

      return scan;
    });

    return res.status(201).json(result);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create Thyroid scan', error: error.message });
  }
};

const getThyroids = async (req, res) => {
  const { patientId } = req.query;
  try {
    const where = patientId ? { patientId } : {};
    const scans = await prisma.scanThyroid.findMany({
      where, orderBy: { createdAt: 'desc' }, include: scanInclude, take: 100,
    });
    return res.json(scans);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to list Thyroid scans', error: error.message });
  }
};

const getThyroid = async (req, res) => {
  try {
    const scan = await prisma.scanThyroid.findUnique({
      where: { id: req.params.id }, include: scanInclude
    });
    if (!scan) return res.status(404).json({ message: 'Thyroid scan not found' });
    return res.json(scan);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to get Thyroid scan', error: error.message });
  }
};

const updateThyroid = async (req, res) => {
  const {
    visitId, isotopeType, isotopeDoseMCi, injectionTime, scanTime,
    tshLevel, withdrawalDays, rightLobeUptake, leftLobeUptake, totalUptake,
    rightLobeSize, leftLobeSize, isthmusSize, glandPosition, hotNodules,
    coldNodules, diffuseUptake, heterogenousUptake, diagramData, impression, physicianNotes, reportedBy
  } = req.body;

  try {
    const existing = await loadScanForUpdate('scanThyroid', req.params.id, res, 'Thyroid scan not found', req.user);
    if (!existing) return;

    const fileUrl = req.file ? `/uploads/scans/${req.file.filename}` : existing.fileUrl;

    const result = await prisma.$transaction(async (tx) => {
      const scan = await tx.scanThyroid.update({
        where: { id: req.params.id },
        data: withRoleClinical(req, 'ScanThyroid', {
          visitId, isotopeType, isotopeDoseMCi,
          injectionTime: injectionTime ? new Date(injectionTime) : undefined,
          scanTime: scanTime ? new Date(scanTime) : undefined,
          tshLevel, withdrawalDays, rightLobeUptake, leftLobeUptake, totalUptake,
          rightLobeSize, leftLobeSize, isthmusSize, glandPosition,
          hotNodules, coldNodules, diffuseUptake, heterogenousUptake,
          diagramData, impression, physicianNotes, fileUrl, reportedBy
        }),
        include: scanInclude
      });

      await tx.auditLog.create({
        data: {
          userId: req.user.id, tableName: 'ScanThyroid', recordId: scan.id,
          action: 'UPDATE',
          oldValues: JSON.stringify(existing),
          newValues: JSON.stringify({
            visitId, isotopeType, isotopeDoseMCi, tshLevel, withdrawalDays,
            rightLobeUptake, leftLobeUptake, totalUptake, rightLobeSize,
            leftLobeSize, isthmusSize, glandPosition, hotNodules, coldNodules,
            diffuseUptake, heterogenousUptake, diagramData, impression, physicianNotes, fileUrl, reportedBy
          })
        }
      });

      return scan;
    });

    return res.json(result);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update Thyroid scan', error: error.message });
  }
};

const getThyroidHistory = async (req, res) => {
  try {
    const scans = await prisma.scanThyroid.findMany({
      where: { patientId: req.params.patientId },
      orderBy: { createdAt: 'desc' },
      include: scanInclude,
      take: 100,
    });
    return res.json(scans);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to get Thyroid history', error: error.message });
  }
};

// ===== Bone =====

const createBone = async (req, res) => {
  const {
    patientId, visitId, primaryCancer, tc99mDoseMCi, injectionTime, scanTime,
    uptakeTime, skeletalMetastasis, metastasisLocations, extraosseousUptake,
    extraosseousLocations, renalVisualization, degenerativeChanges, traumaSites,
    impression, physicianNotes, reportedBy
  } = req.body;

  if (!patientId) return res.status(400).json({ message: 'patientId is required' });

  try {
    const fileUrl = req.file ? `/uploads/scans/${req.file.filename}` : null;

    const result = await prisma.$transaction(async (tx) => {
      const scan = await tx.scanBone.create({
        data: {
          ...pickClinicalFields(req.body, 'ScanBone'),
          patientId, visitId, primaryCancer, tc99mDoseMCi: tc99mDoseMCi ?? req.body.tc99mDose,
          injectionTime: injectionTime ? new Date(injectionTime) : null,
          scanTime: scanTime ? new Date(scanTime) : null,
          uptakeTime,
          skeletalMetastasis: skeletalMetastasis ?? false,
          metastasisLocations,
          extraosseousUptake: extraosseousUptake ?? false,
          extraosseousLocations,
          renalVisualization: renalVisualization ?? true,
          degenerativeChanges: degenerativeChanges ?? false,
          traumaSites, impression, physicianNotes,
          fileUrl, performedBy: req.user.id, reportedBy,
          workflowStatus: safeCreateStatus(req.body.workflowStatus),
        },
        include: scanInclude
      });

      await tx.auditLog.create({
        data: {
          userId: req.user.id, tableName: 'ScanBone', recordId: scan.id,
          action: 'INSERT',
          newValues: JSON.stringify({ patientId, primaryCancer, impression })
        }
      });

      return scan;
    });

    return res.status(201).json(result);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create Bone scan', error: error.message });
  }
};

const getBones = async (req, res) => {
  const { patientId } = req.query;
  try {
    const where = patientId ? { patientId } : {};
    const scans = await prisma.scanBone.findMany({
      where, orderBy: { createdAt: 'desc' }, include: scanInclude, take: 100,
    });
    return res.json(scans);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to list Bone scans', error: error.message });
  }
};

const getBone = async (req, res) => {
  try {
    const scan = await prisma.scanBone.findUnique({
      where: { id: req.params.id }, include: scanInclude
    });
    if (!scan) return res.status(404).json({ message: 'Bone scan not found' });
    return res.json(scan);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to get Bone scan', error: error.message });
  }
};

const updateBone = async (req, res) => {
  const {
    visitId, primaryCancer, tc99mDoseMCi, injectionTime, scanTime,
    uptakeTime, skeletalMetastasis, metastasisLocations, extraosseousUptake,
    extraosseousLocations, renalVisualization, degenerativeChanges, traumaSites,
    impression, physicianNotes, reportedBy
  } = req.body;

  try {
    const existing = await loadScanForUpdate('scanBone', req.params.id, res, 'Bone scan not found', req.user);
    if (!existing) return;

    const fileUrl = req.file ? `/uploads/scans/${req.file.filename}` : existing.fileUrl;

    const result = await prisma.$transaction(async (tx) => {
      const scan = await tx.scanBone.update({
        where: { id: req.params.id },
        data: withRoleClinical(req, 'ScanBone', {
          visitId, primaryCancer, tc99mDoseMCi,
          injectionTime: injectionTime ? new Date(injectionTime) : undefined,
          scanTime: scanTime ? new Date(scanTime) : undefined,
          uptakeTime, skeletalMetastasis, metastasisLocations,
          extraosseousUptake, extraosseousLocations, renalVisualization,
          degenerativeChanges, traumaSites, impression, physicianNotes,
          fileUrl, reportedBy
        }),
        include: scanInclude
      });

      await tx.auditLog.create({
        data: {
          userId: req.user.id, tableName: 'ScanBone', recordId: scan.id,
          action: 'UPDATE',
          oldValues: JSON.stringify(existing),
          newValues: JSON.stringify({
            visitId, primaryCancer, tc99mDoseMCi, uptakeTime, skeletalMetastasis,
            metastasisLocations, extraosseousUptake, extraosseousLocations,
            renalVisualization, degenerativeChanges, traumaSites, impression, physicianNotes, fileUrl, reportedBy
          })
        }
      });

      return scan;
    });

    return res.json(result);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update Bone scan', error: error.message });
  }
};

const getBoneHistory = async (req, res) => {
  try {
    const scans = await prisma.scanBone.findMany({
      where: { patientId: req.params.patientId },
      orderBy: { createdAt: 'desc' },
      include: scanInclude,
      take: 100,
    });
    return res.json(scans);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to get Bone history', error: error.message });
  }
};

// ===== Renal =====

const createRenal = async (req, res) => {
  const {
    patientId, visitId, scanType, tc99mDoseMCi, injectionTime, scanTime,
    furosemideGiven, furosemideTime, aceInhibitorGiven, rightKidneyGFR,
    leftKidneyGFR, rightSplitFunction, leftSplitFunction, rightT1_2,
    leftT1_2, rightTmax, leftTmax, obstructionSign, refluxSign,
    corticalScarring, impression, physicianNotes, reportedBy
  } = req.body;

  if (!patientId || !scanType) return res.status(400).json({ message: 'patientId and scanType are required' });

  try {
    const fileUrl = req.file ? `/uploads/scans/${req.file.filename}` : null;

    const result = await prisma.$transaction(async (tx) => {
      const scan = await tx.scanRenal.create({
        data: {
          ...pickClinicalFields(req.body, 'ScanRenal'),
          patientId, visitId, scanType, tc99mDoseMCi: tc99mDoseMCi ?? req.body.tc99mDose,
          injectionTime: injectionTime ? new Date(injectionTime) : null,
          scanTime: scanTime ? new Date(scanTime) : null,
          furosemideGiven: furosemideGiven ?? false,
          furosemideTime: furosemideTime ? new Date(furosemideTime) : null,
          aceInhibitorGiven: aceInhibitorGiven ?? false,
          rightKidneyGFR, leftKidneyGFR, rightSplitFunction, leftSplitFunction,
          rightT1_2, leftT1_2, rightTmax, leftTmax,
          obstructionSign: obstructionSign ?? false,
          refluxSign: refluxSign ?? false,
          corticalScarring: corticalScarring ?? false,
          impression, physicianNotes,
          fileUrl, performedBy: req.user.id, reportedBy,
          workflowStatus: safeCreateStatus(req.body.workflowStatus),
        },
        include: scanInclude
      });

      await tx.auditLog.create({
        data: {
          userId: req.user.id, tableName: 'ScanRenal', recordId: scan.id,
          action: 'INSERT',
          newValues: JSON.stringify({ patientId, scanType, impression })
        }
      });

      return scan;
    });

    return res.status(201).json(result);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create Renal scan', error: error.message });
  }
};

const getRenals = async (req, res) => {
  const { patientId } = req.query;
  try {
    const where = patientId ? { patientId } : {};
    const scans = await prisma.scanRenal.findMany({
      where, orderBy: { createdAt: 'desc' }, include: scanInclude, take: 100,
    });
    return res.json(scans);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to list Renal scans', error: error.message });
  }
};

const getRenal = async (req, res) => {
  try {
    const scan = await prisma.scanRenal.findUnique({
      where: { id: req.params.id }, include: scanInclude
    });
    if (!scan) return res.status(404).json({ message: 'Renal scan not found' });
    return res.json(scan);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to get Renal scan', error: error.message });
  }
};

const updateRenal = async (req, res) => {
  const {
    visitId, scanType, tc99mDoseMCi, injectionTime, scanTime,
    furosemideGiven, furosemideTime, aceInhibitorGiven, rightKidneyGFR,
    leftKidneyGFR, rightSplitFunction, leftSplitFunction, rightT1_2,
    leftT1_2, rightTmax, leftTmax, obstructionSign, refluxSign,
    corticalScarring, impression, physicianNotes, reportedBy
  } = req.body;

  try {
    const existing = await loadScanForUpdate('scanRenal', req.params.id, res, 'Renal scan not found', req.user);
    if (!existing) return;

    const fileUrl = req.file ? `/uploads/scans/${req.file.filename}` : existing.fileUrl;

    const result = await prisma.$transaction(async (tx) => {
      const scan = await tx.scanRenal.update({
        where: { id: req.params.id },
        data: withRoleClinical(req, 'ScanRenal', {
          visitId, scanType, tc99mDoseMCi,
          injectionTime: injectionTime ? new Date(injectionTime) : undefined,
          scanTime: scanTime ? new Date(scanTime) : undefined,
          furosemideGiven,
          furosemideTime: furosemideTime ? new Date(furosemideTime) : undefined,
          aceInhibitorGiven, rightKidneyGFR, leftKidneyGFR,
          rightSplitFunction, leftSplitFunction, rightT1_2, leftT1_2,
          rightTmax, leftTmax, obstructionSign, refluxSign,
          corticalScarring, impression, physicianNotes, fileUrl, reportedBy
        }),
        include: scanInclude
      });

      await tx.auditLog.create({
        data: {
          userId: req.user.id, tableName: 'ScanRenal', recordId: scan.id,
          action: 'UPDATE',
          oldValues: JSON.stringify(existing),
          newValues: JSON.stringify({
            visitId, scanType, tc99mDoseMCi, furosemideGiven, furosemideTime,
            aceInhibitorGiven, rightKidneyGFR, leftKidneyGFR, rightSplitFunction,
            leftSplitFunction, rightT1_2, leftT1_2, rightTmax, leftTmax,
            obstructionSign, refluxSign, corticalScarring, impression, physicianNotes, fileUrl, reportedBy
          })
        }
      });

      return scan;
    });

    return res.json(result);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update Renal scan', error: error.message });
  }
};

const getRenalHistory = async (req, res) => {
  try {
    const scans = await prisma.scanRenal.findMany({
      where: { patientId: req.params.patientId },
      orderBy: { createdAt: 'desc' },
      include: scanInclude,
      take: 100,
    });
    return res.json(scans);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to get Renal history', error: error.message });
  }
};

// ===== Gastric =====

const createGastric = async (req, res) => {
  const {
    patientId, visitId, mealType, tc99mDoseMCi, ingestionTime, scanStartTime,
    scanDuration, imageInterval, halfEmptyingTime, retention1h, retention2h,
    retention4h, delayedEmptying, rapidEmptying, refluxSign, aspirationSign,
    impression, physicianNotes, reportedBy
  } = req.body;

  if (!patientId) return res.status(400).json({ message: 'patientId is required' });

  try {
    const fileUrl = req.file ? `/uploads/scans/${req.file.filename}` : null;

    const result = await prisma.$transaction(async (tx) => {
      const scan = await tx.scanGastric.create({
        data: {
          ...pickClinicalFields(req.body, 'ScanGastric'),
          patientId, visitId, mealType, tc99mDoseMCi: tc99mDoseMCi ?? req.body.tc99mDose,
          ingestionTime: ingestionTime ? new Date(ingestionTime) : null,
          scanStartTime: scanStartTime ? new Date(scanStartTime) : null,
          scanDuration, imageInterval, halfEmptyingTime,
          retention1h, retention2h, retention4h,
          delayedEmptying: delayedEmptying ?? false,
          rapidEmptying: rapidEmptying ?? false,
          refluxSign: refluxSign ?? false,
          aspirationSign: aspirationSign ?? false,
          impression, physicianNotes,
          fileUrl, performedBy: req.user.id, reportedBy,
          workflowStatus: safeCreateStatus(req.body.workflowStatus),
        },
        include: scanInclude
      });

      await tx.auditLog.create({
        data: {
          userId: req.user.id, tableName: 'ScanGastric', recordId: scan.id,
          action: 'INSERT',
          newValues: JSON.stringify({ patientId, mealType, impression })
        }
      });

      return scan;
    });

    return res.status(201).json(result);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create Gastric scan', error: error.message });
  }
};

const getGastrics = async (req, res) => {
  const { patientId } = req.query;
  try {
    const where = patientId ? { patientId } : {};
    const scans = await prisma.scanGastric.findMany({
      where, orderBy: { createdAt: 'desc' }, include: scanInclude, take: 100,
    });
    return res.json(scans);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to list Gastric scans', error: error.message });
  }
};

const getGastric = async (req, res) => {
  try {
    const scan = await prisma.scanGastric.findUnique({
      where: { id: req.params.id }, include: scanInclude
    });
    if (!scan) return res.status(404).json({ message: 'Gastric scan not found' });
    return res.json(scan);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to get Gastric scan', error: error.message });
  }
};

const updateGastric = async (req, res) => {
  const {
    visitId, mealType, tc99mDoseMCi, ingestionTime, scanStartTime,
    scanDuration, imageInterval, halfEmptyingTime, retention1h, retention2h,
    retention4h, delayedEmptying, rapidEmptying, refluxSign, aspirationSign,
    impression, physicianNotes, reportedBy
  } = req.body;

  try {
    const existing = await loadScanForUpdate('scanGastric', req.params.id, res, 'Gastric scan not found', req.user);
    if (!existing) return;

    const fileUrl = req.file ? `/uploads/scans/${req.file.filename}` : existing.fileUrl;

    const result = await prisma.$transaction(async (tx) => {
      const scan = await tx.scanGastric.update({
        where: { id: req.params.id },
        data: withRoleClinical(req, 'ScanGastric', {
          visitId, mealType, tc99mDoseMCi,
          ingestionTime: ingestionTime ? new Date(ingestionTime) : undefined,
          scanStartTime: scanStartTime ? new Date(scanStartTime) : undefined,
          scanDuration, imageInterval, halfEmptyingTime,
          retention1h, retention2h, retention4h,
          delayedEmptying, rapidEmptying, refluxSign, aspirationSign,
          impression, physicianNotes, fileUrl, reportedBy
        }),
        include: scanInclude
      });

      await tx.auditLog.create({
        data: {
          userId: req.user.id, tableName: 'ScanGastric', recordId: scan.id,
          action: 'UPDATE',
          oldValues: JSON.stringify(existing),
          newValues: JSON.stringify({
            visitId, mealType, tc99mDoseMCi, scanDuration, imageInterval,
            halfEmptyingTime, retention1h, retention2h, retention4h,
            delayedEmptying, rapidEmptying, refluxSign, aspirationSign,
            impression, physicianNotes, fileUrl, reportedBy
          })
        }
      });

      return scan;
    });

    return res.json(result);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update Gastric scan', error: error.message });
  }
};

const getGastricHistory = async (req, res) => {
  try {
    const scans = await prisma.scanGastric.findMany({
      where: { patientId: req.params.patientId },
      orderBy: { createdAt: 'desc' },
      include: scanInclude,
      take: 100,
    });
    return res.json(scans);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to get Gastric history', error: error.message });
  }
};

// ===== Meckel =====

const createMeckel = async (req, res) => {
  const {
    patientId, visitId, complaint, diagnosis, bleedingHistory,
    tc99mDoseMCi, injectionTime, scanTime, ectopicUptake, uptakeLocation,
    impression, physicianNotes, reportedBy
  } = req.body;

  if (!patientId) return res.status(400).json({ message: 'patientId is required' });

  try {
    const fileUrl = req.file ? `/uploads/scans/${req.file.filename}` : null;
    const result = await prisma.$transaction(async (tx) => {
      const scan = await tx.scanMeckel.create({
        data: {
          ...pickClinicalFields(req.body, 'ScanMeckel'),
          patientId, visitId, complaint, diagnosis, bleedingHistory,
          tc99mDoseMCi: tc99mDoseMCi ?? req.body.tc99mDose,
          injectionTime: injectionTime ? new Date(injectionTime) : null,
          scanTime: scanTime ? new Date(scanTime) : null,
          ectopicUptake: ectopicUptake ?? false,
          uptakeLocation,
          impression, physicianNotes,
          fileUrl, performedBy: req.user.id, reportedBy,
          workflowStatus: safeCreateStatus(req.body.workflowStatus),
        },
        include: scanInclude,
      });
      await tx.auditLog.create({
        data: {
          userId: req.user.id, tableName: 'ScanMeckel', recordId: scan.id,
          action: 'INSERT',
          newValues: JSON.stringify({ patientId, impression }),
        },
      });
      return scan;
    });
    return res.status(201).json(result);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create Meckel scan', error: error.message });
  }
};

const getMeckels = async (req, res) => {
  const { patientId } = req.query;
  try {
    const where = patientId ? { patientId } : {};
    const scans = await prisma.scanMeckel.findMany({
      where, orderBy: { createdAt: 'desc' }, include: scanInclude, take: 100,
    });
    return res.json(scans);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to list Meckel scans', error: error.message });
  }
};

const getMeckel = async (req, res) => {
  try {
    const scan = await prisma.scanMeckel.findUnique({
      where: { id: req.params.id }, include: scanInclude,
    });
    if (!scan) return res.status(404).json({ message: 'Meckel scan not found' });
    return res.json(scan);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to get Meckel scan', error: error.message });
  }
};

const updateMeckel = async (req, res) => {
  const body = req.body;
  try {
    const existing = await loadScanForUpdate('scanMeckel', req.params.id, res, 'Meckel scan not found', req.user);
    if (!existing) return;

    const fileUrl = req.file ? `/uploads/scans/${req.file.filename}` : existing.fileUrl;

    const result = await prisma.$transaction(async (tx) => {
      const scan = await tx.scanMeckel.update({
        where: { id: req.params.id },
        data: withRoleClinical(req, 'ScanMeckel', {
          fileUrl,
          injectionTime: body.injectionTime ? new Date(body.injectionTime) : undefined,
          scanTime: body.scanTime ? new Date(body.scanTime) : undefined,
        }),
        include: scanInclude,
      });

      await tx.auditLog.create({
        data: {
          userId: req.user.id, tableName: 'ScanMeckel', recordId: scan.id,
          action: 'UPDATE',
          oldValues: JSON.stringify(existing),
          newValues: JSON.stringify({
            fileUrl, impression: body.impression, physicianNotes: body.physicianNotes
          })
        }
      });

      return scan;
    });
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update Meckel scan', error: error.message });
  }
};

const getMeckelHistory = async (req, res) => {
  try {
    const scans = await prisma.scanMeckel.findMany({
      where: { patientId: req.params.patientId },
      orderBy: { createdAt: 'desc' },
      include: scanInclude,
      take: 100,
    });
    return res.json(scans);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to get Meckel history', error: error.message });
  }
};

// ===== Cardiac (MPI) =====

const CARDIAC_DATE_FIELDS = [
  'surgeryDate', 'lmpDate', 'ecgDate', 'echoDate', 'labDate',
  'cardiacCtMriDate', 'injectionTime', 'acquisitionTime',
];

const coerceCardiacDates = (body) => {
  const out = {};
  for (const f of CARDIAC_DATE_FIELDS) {
    if (body[f]) {
      const d = new Date(body[f]);
      if (!isNaN(d.getTime())) out[f] = d;
    }
  }
  return out;
};

const createCardiac = async (req, res) => {
  const { patientId, visitId, reportedBy } = req.body;

  if (!patientId) return res.status(400).json({ message: 'patientId is required' });

  try {
    const fileUrl = req.file ? `/uploads/scans/${req.file.filename}` : null;

    const result = await prisma.$transaction(async (tx) => {
      const scan = await tx.scanCardiac.create({
        data: {
          ...pickClinicalFields(req.body, 'ScanCardiac'),
          ...coerceCardiacDates(req.body),
          patientId, visitId,
          tracerDoseMCi: req.body.tracerDoseMCi != null ? parseFloat(req.body.tracerDoseMCi) || null : null,
          fileUrl, performedBy: req.user.id, reportedBy,
          workflowStatus: safeCreateStatus(req.body.workflowStatus),
        },
        include: scanInclude,
      });

      await tx.auditLog.create({
        data: {
          userId: req.user.id, tableName: 'ScanCardiac', recordId: scan.id,
          action: 'INSERT',
          newValues: JSON.stringify({ patientId, diagnosis: req.body.diagnosis, impression: req.body.impression }),
        },
      });

      return scan;
    });

    return res.status(201).json(result);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create Cardiac scan', error: error.message });
  }
};

const getCardiacs = async (req, res) => {
  const { patientId } = req.query;
  try {
    const where = patientId ? { patientId } : {};
    const scans = await prisma.scanCardiac.findMany({
      where, orderBy: { createdAt: 'desc' }, include: scanInclude, take: 100,
    });
    return res.json(scans);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to list Cardiac scans', error: error.message });
  }
};

const getCardiac = async (req, res) => {
  try {
    const scan = await prisma.scanCardiac.findUnique({
      where: { id: req.params.id }, include: scanInclude,
    });
    if (!scan) return res.status(404).json({ message: 'Cardiac scan not found' });
    return res.json(scan);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to get Cardiac scan', error: error.message });
  }
};

const updateCardiac = async (req, res) => {
  try {
    const existing = await loadScanForUpdate('scanCardiac', req.params.id, res, 'Cardiac scan not found', req.user);
    if (!existing) return;

    const fileUrl = req.file ? `/uploads/scans/${req.file.filename}` : existing.fileUrl;

    const result = await prisma.$transaction(async (tx) => {
      const scan = await tx.scanCardiac.update({
        where: { id: req.params.id },
        data: withRoleClinical(req, 'ScanCardiac', {
          ...coerceCardiacDates(req.body),
          visitId: req.body.visitId,
          fileUrl, reportedBy: req.body.reportedBy,
        }),
        include: scanInclude,
      });

      await tx.auditLog.create({
        data: {
          userId: req.user.id, tableName: 'ScanCardiac', recordId: scan.id,
          action: 'UPDATE',
          oldValues: JSON.stringify(existing),
          newValues: JSON.stringify({
            diagnosis: req.body.diagnosis, impression: req.body.impression,
            physicianNotes: req.body.physicianNotes, fileUrl,
          }),
        },
      });

      return scan;
    });

    return res.json(result);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update Cardiac scan', error: error.message });
  }
};

const getCardiacHistory = async (req, res) => {
  try {
    const scans = await prisma.scanCardiac.findMany({
      where: { patientId: req.params.patientId },
      orderBy: { createdAt: 'desc' },
      include: scanInclude,
      take: 100,
    });
    return res.json(scans);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to get Cardiac history', error: error.message });
  }
};

// ===== Aggregate — all scan types for one patient =====

const SCAN_MODELS = {
  petct: 'scanPETCT',
  psma: 'scanPSMAPETCT',
  thyroid: 'scanThyroid',
  bone: 'scanBone',
  renal: 'scanRenal',
  gastric: 'scanGastric',
  meckel: 'scanMeckel',
  cardiac: 'scanCardiac',
};

// GET /scans/all/patient/:patientId — every scan record for a patient, across
// all 7 modalities, flattened and tagged with `scanType`/`type`/`date`.
const getAllScansForPatient = async (req, res) => {
  const { patientId } = req.params;
  try {
    const grouped = await Promise.all(
      Object.entries(SCAN_MODELS).map(async ([type, model]) => {
        const rows = await prisma[model].findMany({
          where: { patientId },
          orderBy: { createdAt: 'desc' },
          include: scanInclude,
          take: 100,
        });
        return rows.map((r) => ({ ...r, scanType: type, type, date: r.createdAt }));
      })
    );

    // Dynamic (admin-defined) scans — tagged with their template key/name so the
    // history UI can group and label them like any other modality.
    const dynamicInclude = {
      patient: { select: { id: true, name: true, nationalId: true, gender: true, birthDate: true } },
      performer: { select: { name: true, role: true } },
      reporter: { select: { name: true, role: true } },
    };
    const dynamicRows = await prisma.dynamicScan.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
      include: dynamicInclude,
      take: 100,
    });
    let dynamicFlat = [];
    if (dynamicRows.length) {
      const tplIds = [...new Set(dynamicRows.map((r) => r.templateId))];
      const tpls = await prisma.scanTemplate.findMany({
        where: { id: { in: tplIds } },
        include: { fields: { orderBy: { order: 'asc' } } },
      });
      const tplMap = new Map(tpls.map((t) => [t.id, t]));
      dynamicFlat = dynamicRows.map((r) => {
        const tpl = tplMap.get(r.templateId);
        let parsed = {};
        try { parsed = JSON.parse(r.data || '{}'); } catch { parsed = {}; }
        return {
          ...r,
          scanType: 'dynamic', type: 'dynamic', date: r.createdAt,
          templateKey: tpl?.key, templateName: tpl?.name, templateNameAr: tpl?.nameAr,
          templateFields: tpl?.fields || [], scanLabel: tpl?.name || 'Dynamic Scan',
          _data: parsed,
        };
      });
    }

    const flat = [...grouped.flat(), ...dynamicFlat].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return res.json(flat);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to get patient scan history', error: error.message });
  }
};

// ===== Stats =====

const getScanStats = async (req, res) => {
  try {
    const [petct, psma, thyroid, bone, renal, gastric, meckel, cardiac, dynamic] = await Promise.all([
      prisma.scanPETCT.count(),
      prisma.scanPSMAPETCT.count(),
      prisma.scanThyroid.count(),
      prisma.scanBone.count(),
      prisma.scanRenal.count(),
      prisma.scanGastric.count(),
      prisma.scanMeckel.count(),
      prisma.scanCardiac.count(),
      prisma.dynamicScan.count(),
    ]);

    const total = petct + psma + thyroid + bone + renal + gastric + meckel + cardiac + dynamic;
    const byType = { petct, psma, thyroid, bone, renal, gastric, meckel, cardiac, dynamic };

    return res.json({
      total,
      byType,
      ...byType,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to get scan stats', error: error.message });
  }
};

module.exports = {
  createPETCT, getPETCTs, getPETCT, updatePETCT, getPETCTHistory,
  createPSMAPETCT, getPSMAPETCTs, getPSMAPETCT, updatePSMAPETCT, getPSMAPETCTHistory,
  createThyroid, getThyroids, getThyroid, updateThyroid, getThyroidHistory,
  createBone, getBones, getBone, updateBone, getBoneHistory,
  createRenal, getRenals, getRenal, updateRenal, getRenalHistory,
  createGastric, getGastrics, getGastric, updateGastric, getGastricHistory,
  createMeckel, getMeckels, getMeckel, updateMeckel, getMeckelHistory,
  createCardiac, getCardiacs, getCardiac, updateCardiac, getCardiacHistory,
  getAllScansForPatient,
  getScanStats,
};
