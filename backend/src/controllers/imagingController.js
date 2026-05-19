const prisma = require('../prisma');

const uploadImagingResult = async (req, res) => {
  const { visitId, imagingType, bodyRegion, findings } = req.body;

  if (!visitId || !imagingType || !bodyRegion) {
    return res.status(400).json({ message: 'visitId, imagingType, and bodyRegion are required' });
  }

  try {
    const fileUrl = req.file ? `/uploads/imaging/${req.file.filename}` : null;

    const imagingResult = await prisma.imagingResult.create({
      data: {
        visitId,
        imagingType,
        bodyRegion,
        findings,
        fileUrl,
        uploadedBy: req.user.id
      }
    });

    return res.status(201).json(imagingResult);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to upload imaging result', error: error.message });
  }
};

module.exports = { uploadImagingResult };
