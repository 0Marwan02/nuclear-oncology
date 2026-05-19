const prisma = require('../prisma');

const createCase = async (req, res) => {
  const { patientId } = req.body;
  const { diagnosis, cancerType, cancerStage, protocolType, startDate, status } = req.body;

  if (!patientId || !diagnosis || !cancerType || !cancerStage || !protocolType || !startDate || !status) {
    return res.status(400).json({ message: 'Missing required case fields' });
  }

  try {
    const medicalCase = await prisma.$transaction(async (tx) => {
      const newCase = await tx.medicalCase.create({
        data: {
          patientId,
          diagnosis,
          cancerType,
          cancerStage,
          protocolType,
          startDate: new Date(startDate),
          status,
          createdBy: req.user.id
        }
      });

      await tx.auditLog.create({
        data: {
          userId: req.user.id,
          tableName: 'MedicalCase',
          recordId: newCase.id,
          action: 'INSERT',
          newValues: JSON.stringify({ patientId, diagnosis, cancerType })
        }
      });

      return newCase;
    });

    return res.status(201).json(medicalCase);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create medical case', error: error.message });
  }
};

const updateCase = async (req, res) => {
  const { id } = req.params;
  const { diagnosis, cancerType, cancerStage, protocolType, startDate, status } = req.body;
  const updates = {};
  if (diagnosis !== undefined) updates.diagnosis = diagnosis;
  if (cancerType !== undefined) updates.cancerType = cancerType;
  if (cancerStage !== undefined) updates.cancerStage = cancerStage;
  if (protocolType !== undefined) updates.protocolType = protocolType;
  if (startDate !== undefined) updates.startDate = new Date(startDate);
  if (status !== undefined) updates.status = status;

  try {
    const existing = await prisma.medicalCase.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: 'Case not found' });

    const updated = await prisma.$transaction(async (tx) => {
      const caseRecord = await tx.medicalCase.update({
        where: { id },
        data: updates
      });
      await tx.auditLog.create({
        data: {
          userId: req.user.id,
          tableName: 'MedicalCase',
          recordId: id,
          action: 'UPDATE',
          oldValues: JSON.stringify(existing),
          newValues: JSON.stringify(updates)
        }
      });
      return caseRecord;
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update case', error: error.message });
  }
};

module.exports = { createCase, updateCase };
