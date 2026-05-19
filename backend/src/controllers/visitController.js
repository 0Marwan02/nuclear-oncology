const prisma = require('../prisma');

const createVisit = async (req, res) => {
  const {
    patientId,
    caseId,
    visitDate,
    weight,
    bloodPressure,
    temperature,
    generalCondition,
    doctorNotes,
    nurseNotes
  } = req.body;

  if (!patientId) {
    return res.status(400).json({ message: 'patientId is required' });
  }

  try {
    const visit = await prisma.$transaction(async (tx) => {
      const createdVisit = await tx.visit.create({
        data: {
          patientId,
          caseId: caseId || null,
          visitDate: visitDate ? new Date(visitDate) : new Date(),
          weight: typeof weight === 'number' ? weight : weight ? parseFloat(weight) : null,
          height: req.body.height ? parseFloat(req.body.height) : null,
          bloodGlucose: req.body.bloodGlucose ? parseFloat(req.body.bloodGlucose) : null,
          injectionSite: req.body.injectionSite || null,
          pregnancyStatus: req.body.pregnancyStatus || null,
          bloodPressure: bloodPressure || null,
          temperature: typeof temperature === 'number' ? temperature : null,
          generalCondition: generalCondition || null,
          doctorNotes: req.user.role === 'doctor' ? doctorNotes || null : null,
          nurseNotes: nurseNotes || null,
          workflowStatus: 'Registered',
          recordedBy: req.user.id
        }
      });

      await tx.auditLog.create({
        data: {
          userId: req.user.id,
          tableName: 'Visit',
          recordId: createdVisit.id,
          action: 'INSERT',
          newValues: JSON.stringify({
            patientId: createdVisit.patientId,
            caseId: createdVisit.caseId,
            visitDate: createdVisit.visitDate
          })
        }
      });

      return createdVisit;
    });

    return res.status(201).json(visit);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create visit', error: error.message });
  }
};

const listPatientVisits = async (req, res) => {
  try {
    const visits = await prisma.visit.findMany({
      where: { patientId: req.params.patientId },
      orderBy: { visitDate: 'desc' },
      include: {
        labResults: true,
        imagingResults: true,
        radiationDoses: true
      }
    });

    return res.json(visits);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to list visits', error: error.message });
  }
};

module.exports = {
  createVisit,
  listPatientVisits
};
