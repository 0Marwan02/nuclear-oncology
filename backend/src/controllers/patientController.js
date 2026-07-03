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
  const take = Math.min(parseInt(req.query.take, 10) || 50, 200);
  const skip = Math.max(parseInt(req.query.skip, 10) || 0, 0);

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
      const activeWf = { workflowStatus: { notIn: ['Completed'] } };
      conditions.push({
        OR: [
          { visits: { some: { workflowStatus: { not: 'Completed' } } } },
          { scanPETCTs: { some: activeWf } },
          { scanPSMAPETCTs: { some: activeWf } },
          { scanThyroids: { some: activeWf } },
          { scanBones: { some: activeWf } },
          { scanRenals: { some: activeWf } },
          { scanGastrics: { some: activeWf } },
          { scanMeckels: { some: activeWf } },
          { scanCardiacs: { some: activeWf } },
          { dynamicScans: { some: activeWf } },
        ]
      });
    } else if (status === 'completed') {
      const completedWf = { workflowStatus: 'Completed' };
      const activeWf = { workflowStatus: { notIn: ['Completed'] } };
      conditions.push({
        OR: [
          { visits: { some: { workflowStatus: 'Completed' } } },
          { scanPETCTs: { some: completedWf } },
          { scanPSMAPETCTs: { some: completedWf } },
          { scanThyroids: { some: completedWf } },
          { scanBones: { some: completedWf } },
          { scanRenals: { some: completedWf } },
          { scanGastrics: { some: completedWf } },
          { scanMeckels: { some: completedWf } },
          { scanCardiacs: { some: completedWf } },
          { dynamicScans: { some: completedWf } },
        ]
      });
      conditions.push({
        AND: [
          { visits: { none: { workflowStatus: { not: 'Completed' } } } },
          { scanPETCTs: { none: activeWf } },
          { scanPSMAPETCTs: { none: activeWf } },
          { scanThyroids: { none: activeWf } },
          { scanBones: { none: activeWf } },
          { scanRenals: { none: activeWf } },
          { scanGastrics: { none: activeWf } },
          { scanMeckels: { none: activeWf } },
          { scanCardiacs: { none: activeWf } },
          { dynamicScans: { none: activeWf } },
        ]
      });
    }

    const where = conditions.length > 0 ? { AND: conditions } : {};

    const patients = await prisma.patient.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { visits: true } } },
      take,
      skip,
    });

    // Plain-array response is kept for backwards compatibility; the pager
    // reads X-Total-Count to know whether more pages exist.
    const total = await prisma.patient.count({ where });
    res.set('X-Total-Count', String(total));
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
        },
        scanPETCTs: { take: 20, orderBy: { createdAt: 'desc' } },
        scanPSMAPETCTs: { take: 20, orderBy: { createdAt: 'desc' } },
        scanThyroids: { take: 20, orderBy: { createdAt: 'desc' } },
        scanBones: { take: 20, orderBy: { createdAt: 'desc' } },
        scanRenals: { take: 20, orderBy: { createdAt: 'desc' } },
        scanGastrics: { take: 20, orderBy: { createdAt: 'desc' } },
        scanMeckels: { take: 20, orderBy: { createdAt: 'desc' } },
        scanCardiacs: { take: 20, orderBy: { createdAt: 'desc' } },
      }
    });

    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    return res.json(patient);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to get patient', error: error.message });
  }
};

module.exports = { createPatient, listPatients, getPatientById };
