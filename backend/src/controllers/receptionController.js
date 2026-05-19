const prisma = require('../prisma');

const SCAN_MODEL = {
  petct: 'scanPETCT',
  psma: 'scanPSMAPETCT',
  thyroid: 'scanThyroid',
  bone: 'scanBone',
  renal: 'scanRenal',
  gastric: 'scanGastric',
  meckel: 'scanMeckel',
};

const openEncounter = async (req, res) => {
  const { patientId, encounterType, scanSubtype, referralReason, diagnosis, isotopeType, renalScanType } = req.body;

  if (!patientId || !encounterType) {
    return res.status(400).json({ message: 'patientId and encounterType are required' });
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
      return res.status(201).json({ type: 'clinic_red', record });
    }

    if (encounterType === 'scan') {
      const scanKey = scanSubtype || 'petct';
      const modelName = SCAN_MODEL[scanKey];
      if (!modelName) {
        return res.status(400).json({ message: `Invalid scanSubtype. Allowed: ${Object.keys(SCAN_MODEL).join(', ')}` });
      }

      const baseData = {
        patientId,
        referralReason: referralReason || null,
        diagnosis: diagnosis || null,
        workflowStatus: 'Registered',
        performedBy: req.user.id,
      };

      if (scanKey === 'thyroid') baseData.isotopeType = isotopeType || 'Tc-99m';
      if (scanKey === 'renal') baseData.scanType = renalScanType || 'DTPA';

      const record = await prisma[modelName].create({ data: baseData });
      return res.status(201).json({ type: scanKey, record });
    }

    return res.status(400).json({ message: 'encounterType must be clinic_green, clinic_red, or scan' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { openEncounter };
