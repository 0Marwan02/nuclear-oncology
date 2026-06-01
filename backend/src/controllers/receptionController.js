const prisma = require('../prisma');
const { emitQueue } = require('../realtime');

/**
 * Reception opens a new encounter (المحطة الأولى). Reception has no diagnosis
 * access and does NOT choose the scan sheet — it only registers the patient and
 * pushes them to the physician's assessment queue as a Visit (Registered).
 *
 * The clinic paths (green/red) remain a separate continuous-care track and are
 * created directly here when reception is explicitly routing a follow-up.
 */
const openEncounter = async (req, res) => {
  const { patientId, encounterType, referralReason, diagnosis } = req.body;

  if (!patientId) {
    return res.status(400).json({ message: 'patientId is required' });
  }

  try {
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    if (encounterType === 'clinic_green') {
      const record = await prisma.clinicGreenFile.create({
        data: {
          patientId,
          followUpDate: new Date(),
          physicianNotes: referralReason || null,
          createdBy: req.user.id,
        },
      });
      emitQueue('physician', { event: 'clinic_opened', record: { ...record, type: 'clinic_green' } });
      return res.status(201).json({ type: 'clinic_green', record });
    }

    if (encounterType === 'clinic_red') {
      const record = await prisma.clinicRedFile.create({
        data: {
          patientId,
          diseaseType: diagnosis || 'Thyroid Disease',
          followUpDate: new Date(),
          physicianNotes: referralReason || null,
          createdBy: req.user.id,
        },
      });
      emitQueue('physician', { event: 'clinic_opened', record: { ...record, type: 'clinic_red' } });
      return res.status(201).json({ type: 'clinic_red', record });
    }

    // Default + 'scan': create a Visit encounter awaiting physician assessment.
    const visit = await prisma.visit.create({
      data: {
        patientId,
        visitDate: new Date(),
        doctorNotes: referralReason || null,
        workflowStatus: 'Registered',
        recordedBy: req.user.id,
      },
      include: {
        patient: { select: { id: true, name: true, nationalId: true, gender: true, birthDate: true, phone: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        tableName: 'Visit',
        recordId: visit.id,
        action: 'INSERT',
        newValues: JSON.stringify({ patientId, workflowStatus: 'Registered', referralReason: referralReason || null }),
      },
    });

    emitQueue('physician', { event: 'encounter_opened', record: { ...visit, scanType: 'visit' } });
    return res.status(201).json({ type: 'visit', record: visit });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { openEncounter };
