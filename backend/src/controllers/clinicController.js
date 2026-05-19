const prisma = require('../prisma');

const createGreenFile = async (req, res) => {
  const {
    patientId,
    visitId,
    caseId,
    followUpDate,
    thyroglobulin,
    antiTg,
    tsh,
    ft3,
    ft4,
    radioiodineUptake,
    wholeBodyScanResult,
    neckUltrasound,
    stimulatedTg,
    treatmentPlan,
    responseToTherapy,
    recurrenceSigns,
    physicianNotes
  } = req.body;

  if (!patientId) {
    return res.status(400).json({ message: 'patientId is required' });
  }

  try {
    const greenFile = await prisma.$transaction(async (tx) => {
      const created = await tx.clinicGreenFile.create({
        data: {
          patientId,
          visitId: visitId || null,
          caseId: caseId || null,
          followUpDate: followUpDate ? new Date(followUpDate) : new Date(),
          thyroglobulin: typeof thyroglobulin === 'number' ? thyroglobulin : null,
          antiTg: typeof antiTg === 'number' ? antiTg : null,
          tsh: typeof tsh === 'number' ? tsh : null,
          ft3: typeof ft3 === 'number' ? ft3 : null,
          ft4: typeof ft4 === 'number' ? ft4 : null,
          radioiodineUptake: radioiodineUptake || null,
          wholeBodyScanResult: wholeBodyScanResult || null,
          neckUltrasound: neckUltrasound || null,
          stimulatedTg: typeof stimulatedTg === 'number' ? stimulatedTg : null,
          treatmentPlan: treatmentPlan || null,
          responseToTherapy: responseToTherapy || null,
          recurrenceSigns: recurrenceSigns || null,
          physicianNotes: physicianNotes || null,
          createdBy: req.user.id
        }
      });

      if (followUpDate) {
        await tx.appointment.create({
          data: {
            patientId,
            appointmentDate: new Date(followUpDate),
            appointmentType: 'clinic_green',
            notes: 'متابعة ملف أخضر — أورام غدة',
            createdBy: req.user.id,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: req.user.id,
          tableName: 'ClinicGreenFile',
          recordId: created.id,
          action: 'INSERT',
          newValues: JSON.stringify({
            patientId: created.patientId,
            followUpDate: created.followUpDate
          })
        }
      });

      return created;
    });

    return res.status(201).json(greenFile);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create green file', error: error.message });
  }
};

const getGreenFiles = async (req, res) => {
  const { patientId } = req.query;

  try {
    const where = patientId ? { patientId } : {};

    const greenFiles = await prisma.clinicGreenFile.findMany({
      where,
      orderBy: { followUpDate: 'desc' },
      include: {
        patient: true,
        visit: true,
        medicalCase: true,
        creator: true
      }
    });

    return res.json(greenFiles);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to list green files', error: error.message });
  }
};

const getGreenFile = async (req, res) => {
  try {
    const greenFile = await prisma.clinicGreenFile.findUnique({
      where: { id: req.params.id },
      include: {
        patient: true,
        visit: true,
        medicalCase: true,
        creator: true
      }
    });

    if (!greenFile) {
      return res.status(404).json({ message: 'Green file not found' });
    }

    return res.json(greenFile);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to get green file', error: error.message });
  }
};

const GREEN_UPDATABLE = [
  'followUpDate', 'thyroglobulin', 'antiTg', 'tsh', 'ft3', 'ft4',
  'radioiodineUptake', 'wholeBodyScanResult', 'neckUltrasound', 'stimulatedTg',
  'treatmentPlan', 'responseToTherapy', 'recurrenceSigns', 'physicianNotes',
  'visitId', 'caseId',
];

const updateGreenFile = async (req, res) => {
  const { id } = req.params;

  try {
    const existing = await prisma.clinicGreenFile.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Green file not found' });
    }

    const data = {};
    for (const key of GREEN_UPDATABLE) {
      if (req.body[key] !== undefined) {
        data[key] = key === 'followUpDate' ? new Date(req.body[key]) : req.body[key];
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.clinicGreenFile.update({
        where: { id },
        data
      });

      await tx.auditLog.create({
        data: {
          userId: req.user.id,
          tableName: 'ClinicGreenFile',
          recordId: id,
          action: 'UPDATE',
          oldValues: JSON.stringify(existing),
          newValues: JSON.stringify(data)
        }
      });

      return result;
    });

    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update green file', error: error.message });
  }
};

const getGreenFileHistory = async (req, res) => {
  const { patientId } = req.params;

  try {
    const greenFiles = await prisma.clinicGreenFile.findMany({
      where: { patientId },
      orderBy: { followUpDate: 'asc' },
      include: {
        patient: true,
        visit: true,
        medicalCase: true,
        creator: true
      }
    });

    return res.json(greenFiles);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to get green file history', error: error.message });
  }
};

const createRedFile = async (req, res) => {
  const {
    patientId,
    visitId,
    diseaseType,
    followUpDate,
    tsh,
    ft3,
    ft4,
    antiTpo,
    antiTg,
    trAb,
    thyroidVolume,
    rightLobeSize,
    leftLobeSize,
    nodulePresence,
    noduleDetails,
    symptoms,
    currentMedication,
    doseAdjustment,
    physicianNotes
  } = req.body;

  if (!patientId || !diseaseType) {
    return res.status(400).json({ message: 'patientId and diseaseType are required' });
  }

  try {
    const redFile = await prisma.$transaction(async (tx) => {
      const created = await tx.clinicRedFile.create({
        data: {
          patientId,
          visitId: visitId || null,
          diseaseType,
          followUpDate: followUpDate ? new Date(followUpDate) : new Date(),
          tsh: typeof tsh === 'number' ? tsh : null,
          ft3: typeof ft3 === 'number' ? ft3 : null,
          ft4: typeof ft4 === 'number' ? ft4 : null,
          antiTpo: typeof antiTpo === 'number' ? antiTpo : null,
          antiTg: typeof antiTg === 'number' ? antiTg : null,
          trAb: typeof trAb === 'number' ? trAb : null,
          thyroidVolume: typeof thyroidVolume === 'number' ? thyroidVolume : null,
          rightLobeSize: rightLobeSize || null,
          leftLobeSize: leftLobeSize || null,
          nodulePresence: nodulePresence === true,
          noduleDetails: noduleDetails || null,
          symptoms: symptoms || null,
          currentMedication: currentMedication || null,
          doseAdjustment: doseAdjustment || null,
          physicianNotes: physicianNotes || null,
          createdBy: req.user.id
        }
      });

      if (followUpDate) {
        await tx.appointment.create({
          data: {
            patientId,
            appointmentDate: new Date(followUpDate),
            appointmentType: 'clinic_red',
            notes: 'متابعة ملف أحمر — أمراض غدة',
            createdBy: req.user.id,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: req.user.id,
          tableName: 'ClinicRedFile',
          recordId: created.id,
          action: 'INSERT',
          newValues: JSON.stringify({
            patientId: created.patientId,
            diseaseType: created.diseaseType,
            followUpDate: created.followUpDate
          })
        }
      });

      return created;
    });

    return res.status(201).json(redFile);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create red file', error: error.message });
  }
};

const getRedFiles = async (req, res) => {
  const { patientId, diseaseType } = req.query;

  try {
    const where = {};
    if (patientId) {
      where.patientId = patientId;
    }
    if (diseaseType) {
      where.diseaseType = diseaseType;
    }

    const redFiles = await prisma.clinicRedFile.findMany({
      where,
      orderBy: { followUpDate: 'desc' },
      include: {
        patient: true,
        visit: true,
        creator: true
      }
    });

    return res.json(redFiles);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to list red files', error: error.message });
  }
};

const getRedFile = async (req, res) => {
  try {
    const redFile = await prisma.clinicRedFile.findUnique({
      where: { id: req.params.id },
      include: {
        patient: true,
        visit: true,
        creator: true
      }
    });

    if (!redFile) {
      return res.status(404).json({ message: 'Red file not found' });
    }

    return res.json(redFile);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to get red file', error: error.message });
  }
};

const RED_UPDATABLE = [
  'followUpDate', 'diseaseType', 'tsh', 'ft3', 'ft4', 'antiTpo', 'antiTg', 'trAb',
  'thyroidVolume', 'rightLobeSize', 'leftLobeSize', 'nodulePresence', 'noduleDetails',
  'symptoms', 'currentMedication', 'doseAdjustment', 'physicianNotes', 'visitId',
];

const updateRedFile = async (req, res) => {
  const { id } = req.params;

  try {
    const existing = await prisma.clinicRedFile.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Red file not found' });
    }

    const data = {};
    for (const key of RED_UPDATABLE) {
      if (req.body[key] !== undefined) {
        data[key] = key === 'followUpDate' ? new Date(req.body[key]) : req.body[key];
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.clinicRedFile.update({
        where: { id },
        data
      });

      await tx.auditLog.create({
        data: {
          userId: req.user.id,
          tableName: 'ClinicRedFile',
          recordId: id,
          action: 'UPDATE',
          oldValues: JSON.stringify(existing),
          newValues: JSON.stringify(data)
        }
      });

      return result;
    });

    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update red file', error: error.message });
  }
};

const getRedFileHistory = async (req, res) => {
  const { patientId } = req.params;

  try {
    const redFiles = await prisma.clinicRedFile.findMany({
      where: { patientId },
      orderBy: { followUpDate: 'asc' },
      include: {
        patient: true,
        visit: true,
        creator: true
      }
    });

    return res.json(redFiles);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to get red file history', error: error.message });
  }
};

module.exports = {
  createGreenFile,
  getGreenFiles,
  getGreenFile,
  updateGreenFile,
  getGreenFileHistory,
  createRedFile,
  getRedFiles,
  getRedFile,
  updateRedFile,
  getRedFileHistory
};
