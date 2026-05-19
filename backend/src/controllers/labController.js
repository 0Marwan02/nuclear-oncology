const prisma = require('../prisma');

const uploadLabResult = async (req, res) => {
  const { visitId, testName, resultValue, unit, referenceRange } = req.body;

  if (!visitId || !testName || !resultValue) {
    return res.status(400).json({ message: 'visitId, testName, and resultValue are required' });
  }

  try {
    const fileUrl = req.file ? `/uploads/labs/${req.file.filename}` : null;

    const labResult = await prisma.labResult.create({
      data: {
        visitId,
        testName,
        resultValue,
        unit,
        referenceRange,
        fileUrl,
        uploadedBy: req.user.id
      }
    });

    return res.status(201).json(labResult);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to upload lab result', error: error.message });
  }
};

module.exports = { uploadLabResult };
