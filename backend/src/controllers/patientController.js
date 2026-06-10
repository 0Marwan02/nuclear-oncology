const prisma = require('../prisma');

const createPatient = async (req, res) => {
  const {
    nationalId, name, gender, birthDate, phone, address, bloodType,
    maritalStatus, referringDoctor, referringDoctorPhone, phone2,
    category, subCategory,
  } = req.body;

  if (!nationalId || !name || !gender || !birthDate || !phone || !address || !bloodType) {
    return res.status(400).json({ message: 'Missing required patient fields' });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const patient = await tx.patient.create({
        data: {
          nationalId, name, gender,
          birthDate: new Date(birthDate),
          phone, address, bloodType,
          maritalStatus: maritalStatus || null,
          referringDoctor: referringDoctor || null,
          referringDoctorPhone: referringDoctorPhone || null,
          phone2: phone2 || null,
          category: category || null,
          subCategory: subCategory || null,
          createdBy: req.user.id
        }
      });

      await tx.auditLog.create({
        data: {
          userId: req.user.id, tableName: 'Patient', recordId: patient.id, action: 'INSERT',
          newValues: JSON.stringify({ nationalId: patient.nationalId, name: patient.name, gender: patient.gender, category: patient.category })
        }
      });

      // The scan record (created from the scan sheet the wizard opens next) is
      // the single workflow unit — we no longer create a separate Visit here.
      return { patient };
    });

    return res.status(201).json(result);
  } catch (error) {
    if (error.code === 'P2002') {
      const existing = await prisma.patient.findUnique({ where: { nationalId } });
      return res.status(409).json({
        message: 'A patient with this National ID already exists',
        existingPatientId: existing?.id
      });
    }
    console.error('[createPatient]', error.message);
    return res.status(500).json({ message: 'Failed to create patient', error: error.message });
  }
};

const listPatients = async (req, res) => {
  const { q, status, category } = req.query;

  try {
    const conditions = [];

    if (q) {
      conditions.push({
        OR: [
          { name: { contains: q } },
          { nationalId: { contains: q } },
          { phone: { contains: q } }
        ]
      });
    }

    if (category) {
      conditions.push({ category });
    }

    if (status === 'active') {
      conditions.push({ visits: { some: { workflowStatus: { not: 'Completed' } } } });
    } else if (status === 'completed') {
      // patients who have at least one completed visit AND no active visits
      conditions.push({ visits: { some: { workflowStatus: 'Completed' } } });
      conditions.push({ visits: { none: { workflowStatus: { not: 'Completed' } } } });
    }

    const where = conditions.length > 0 ? { AND: conditions } : {};

    const patients = await prisma.patient.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { visits: true } } }
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
        visits: {
          orderBy: { visitDate: 'desc' },
          take: 20,
          include: {
            labResults: true, imagingResults: true, radiationDoses: true,
            scanPETCTs: true, scanPSMAPETCTs: true, scanThyroids: true,
            scanBones: true, scanRenals: true, scanGastrics: true, scanMeckels: true
          }
        }
      }
    });

    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    return res.json(patient);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to get patient', error: error.message });
  }
};

module.exports = { createPatient, listPatients, getPatientById };
