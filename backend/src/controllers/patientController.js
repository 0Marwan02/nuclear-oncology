const prisma = require('../prisma');

const createPatient = async (req, res) => {
  const {
    nationalId,
    name,
    gender,
    birthDate,
    phone,
    address,
    bloodType,
    maritalStatus,
    referringDoctor,
    medicalCase
  } = req.body;

  if (!nationalId || !name || !gender || !birthDate || !phone || !address || !bloodType) {
    return res.status(400).json({ message: 'Missing required patient fields' });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const patient = await tx.patient.create({
        data: {
          nationalId,
          name,
          gender,
          birthDate: new Date(birthDate),
          phone,
          address,
          bloodType,
          maritalStatus: maritalStatus || null,
          referringDoctor: referringDoctor || null,
          createdBy: req.user.id
        }
      });

      let createdCase = null;
      if (medicalCase && req.user.role === 'doctor') {
        const { diagnosis, cancerType, cancerStage, protocolType, startDate, status } = medicalCase;
        if (diagnosis && cancerType && cancerStage && protocolType && startDate && status) {
          createdCase = await tx.medicalCase.create({
            data: {
              patientId: patient.id,
              diagnosis,
              cancerType,
              cancerStage,
              protocolType,
              startDate: new Date(startDate),
              status,
              createdBy: req.user.id
            }
          });
        }
      }

      await tx.auditLog.create({
        data: {
          userId: req.user.id,
          tableName: 'Patient',
          recordId: patient.id,
          action: 'INSERT',
          newValues: JSON.stringify({
            nationalId: patient.nationalId,
            name: patient.name,
            gender: patient.gender
          })
        }
      });

      return { patient, medicalCase: createdCase };
    });

    return res.status(201).json(result);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create patient', error: error.message });
  }
};

const listPatients = async (req, res) => {
  const { q } = req.query;

  try {
    const where = q
      ? {
          OR: [
            { name: { contains: q } },
            { nationalId: { contains: q } },
            { phone: { contains: q } }
          ]
        }
      : {};

    const patients = await prisma.patient.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        medicalCases: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    return res.json(patients);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to list patients', error: error.message });
  }
};

const getPatientById = async (req, res) => {
  try {
    const patient = await prisma.patient.findUnique({
      where: { id: req.params.id },
      include: {
        medicalCases: { orderBy: { createdAt: 'desc' } },
        visits: {
          orderBy: { visitDate: 'desc' },
          take: 20,
          include: {
            labResults: true,
            imagingResults: true,
            radiationDoses: true
          }
        }
      }
    });

    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    return res.json(patient);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to get patient', error: error.message });
  }
};

module.exports = {
  createPatient,
  listPatients,
  getPatientById
};
