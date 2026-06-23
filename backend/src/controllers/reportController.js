const fs = require('fs');
const path = require('path');
const prisma = require('../prisma');
const { TYPE_TO_MODEL } = require('../utils/scanFields');
const { buildReportModel, generateDocx, generatePdf } = require('../services/reportGenerator');

// Reports are written under the statically-served uploads folder (project-root
// `uploads`, mounted at `/uploads` in index.js), in a `reports/` subfolder.
const REPORTS_DIR = path.join(__dirname, '..', '..', '..', 'uploads', 'reports');

const ensureReportsDir = () => {
  if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });
};

const sanitizeName = (name) =>
  String(name || 'Patient')
    .replace(/[\\/]+/g, '_')      // strip slashes
    .replace(/\s+/g, '_')         // spaces -> underscore
    .replace(/[^\w؀-ۿ_.-]/g, '') // keep word chars + Arabic
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '') || 'Patient';

const pad6 = (n) => String(n).padStart(6, '0');

/**
 * Find-or-allocate a stable reportNumber for this scan, and compute the next
 * version. Runs inside the caller's transaction.
 * - If a GeneratedReport already exists for this scanId: reuse its reportNumber,
 *   version = max(version)+1.
 * - Else: atomically increment Counter `report-{year}` and format
 *   `NM-{year}-{padded6}`, version = 1.
 */
const allocateReportNumber = async (tx, scanId) => {
  const existing = await tx.generatedReport.findMany({
    where: { scanId },
    orderBy: { version: 'desc' },
    take: 1,
  });

  if (existing.length) {
    return { reportNumber: existing[0].reportNumber, version: existing[0].version + 1 };
  }

  const year = new Date().getFullYear();
  const key = `report-${year}`;
  const counter = await tx.counter.upsert({
    where: { key },
    create: { key, value: 1 },
    update: { value: { increment: 1 } },
  });
  const reportNumber = `NM-${year}-${pad6(counter.value)}`;
  return { reportNumber, version: 1 };
};

const generateReport = async (req, res) => {
  const { scanType, scanId } = req.params;
  const format = (req.query.format || 'pdf').toLowerCase();

  if (!TYPE_TO_MODEL[scanType]) {
    return res.status(400).json({ message: `Invalid scan type: ${scanType}` });
  }
  if (format !== 'pdf' && format !== 'docx') {
    return res.status(400).json({ message: "format must be 'pdf' or 'docx'" });
  }

  try {
    ensureReportsDir();

    // Allocate number/version inside a transaction (atomic counter increment).
    const alloc = await prisma.$transaction((tx) => allocateReportNumber(tx, scanId));
    const { reportNumber, version } = alloc;

    // Build the model (loads the scan + patient).
    const model = await buildReportModel(scanType, scanId, {
      reportNumber,
      version,
      generatedByName: req.user?.name,
    });

    // Need patientId for the row + a sanitized patient name for the filename.
    const accessor = (() => {
      const m = TYPE_TO_MODEL[scanType];
      return m.charAt(0).toLowerCase() + m.slice(1);
    })();
    const scan = await prisma[accessor].findUnique({
      where: { id: scanId },
      select: { patientId: true, patient: { select: { name: true } } },
    });
    if (!scan) return res.status(404).json({ message: 'Scan record not found' });

    const ext = format === 'pdf' ? 'pdf' : 'docx';
    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `${sanitizeName(scan.patient?.name)}_${reportNumber}_${dateStr}.${ext}`;

    const buffer = format === 'pdf' ? await generatePdf(model) : await generateDocx(model);
    fs.writeFileSync(path.join(REPORTS_DIR, fileName), buffer);

    const fileUrl = `/uploads/reports/${fileName}`;

    await prisma.generatedReport.create({
      data: {
        scanType, scanId,
        patientId: scan.patientId,
        reportNumber, version, format,
        fileUrl, fileName,
        generatedBy: req.user.id,
      },
    });

    return res.json({ fileUrl, fileName, reportNumber, version });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to generate report', error: error.message });
  }
};

const listReports = async (req, res) => {
  const { scanType, scanId } = req.params;
  try {
    const reports = await prisma.generatedReport.findMany({
      where: { scanId },
      orderBy: { version: 'desc' },
    });
    return res.json(reports);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to list reports', error: error.message });
  }
};

module.exports = { generateReport, listReports, ensureReportsDir, REPORTS_DIR };
