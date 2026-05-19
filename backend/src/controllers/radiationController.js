const prisma = require('../prisma');

const logRadiationDose = async (req, res) => {
  const { visitId, caseId, isotopeType, doseMCi, cumulativeDose } = req.body;

  if (!visitId || !caseId || !isotopeType || !doseMCi || !cumulativeDose) {
    return res.status(400).json({ message: 'Missing required radiation dose fields' });
  }

  try {
    const radiationDose = await prisma.$transaction(async (tx) => {
      const dose = await tx.radiationDose.create({
        data: {
          visitId,
          caseId,
          isotopeType,
          doseMCi: parseFloat(doseMCi),
          cumulativeDose: parseFloat(cumulativeDose),
          recordedBy: req.user.id
        }
      });
      return dose;
    });

    return res.status(201).json(radiationDose);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to log radiation dose', error: error.message });
  }
};

module.exports = { logRadiationDose };
