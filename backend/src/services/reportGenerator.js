// Report generator — builds a normalized report model from a scan record and
// renders it to DOCX (via `docx`) and PDF (via `pdfmake` + embedded Amiri font).
//
// The grouping (Clinical / Preparation / Acquisition / Findings + Impression +
// Signatures) mirrors frontend/src/components/ScanReportView.jsx so the exported
// document matches the on-screen report.

const path = require('path');
const prisma = require('../prisma');
const { TYPE_TO_MODEL } = require('../utils/scanFields');

const LETTERHEAD = 'Nuclear Medicine Unit — Clinical Oncology and Nuclear Medicine Department — Assiut University Hospital';

const SCAN_LABEL = {
  petct: 'PET/CT (FDG)', psma: 'PSMA PET/CT', thyroid: 'Thyroid Scan',
  bone: 'Bone Scan', renal: 'Renal Scan', gastric: 'Gastric Emptying',
  meckel: "Meckel's Scan", cardiac: 'Cardiac (MPI)',
};

// --- field classification (kept in sync with ScanReportView.jsx) ---
const JSON_ARRAY_FIELDS = new Set(['scanMode', 'procedureSymptoms', 'precipitatedBy', 'relievedBy']);

const HIDDEN = new Set([
  'id', 'patientId', 'visitId', 'performedBy', 'reportedBy', 'createdAt', 'updatedAt',
  'fileUrl', 'isLocked', 'patient', 'visit', 'performer', 'reporter',
  'scanType', '_scanType', 'type', 'date', 'doseUnit', 'diagramData', 'symptomFlags',
  'workflowStatus', 'returnReason',
]);

const NURSE = new Set(['prepWeight', 'prepHeight', 'prepBloodGlucose', 'injectionSite', 'pregnancyStatus', 'prepNurseNotes', 'mealType']);
const TECH = new Set([
  'fdgDoseMCi', 'ga68DoseMCi', 'isotopeDoseMCi', 'tc99mDoseMCi', 'dmsaDoseMCi', 'dtpaDoseMCi',
  'injectionTime', 'scanTime', 'scanStartTime', 'ingestionTime',
  'dmsaInjectionTime', 'dmsaScanTime', 'dtpaInjectionTime', 'dtpaScanTime',
  'uptakeTime', 'scanMode', 'delayedImages', 'delayedImagesNotes', 'technicianNotes',
  'withdrawalDays', 'furosemideGiven', 'furosemideTime', 'aceInhibitorGiven',
  'scanDuration', 'imageInterval', 'isotopeType', 'scanSubType',
  'tracerDoseMCi', 'tracer', 'injectionSiteSide', 'injectionSiteLimb', 'acquisitionTime',
  'technicianPhysicist', 'moreAcquisition', 'nmPhysician', 'cardiologist',
  'treadmillExercise', 'thrBpm', 'mets', 'exerciseDurationMin', 'exerciseDurationSec',
  'reasonEndingExercise', 'pharmacological', 'pharmaDrug', 'pharmaDose',
  'procedureSymptoms', 'vitalsTable',
]);
const FINDINGS = new Set([
  'impression', 'physicianNotes', 'bodyRegion', 'suvMax', 'suvMean', 'lesionLocation', 'lesionSize',
  'metastasisSign', 'metastasisDetails', 'skeletalMetastasis', 'metastasisLocations',
  'extraosseousUptake', 'extraosseousLocations', 'renalVisualization', 'degenerativeChanges', 'traumaSites',
  'rightLobeUptake', 'leftLobeUptake', 'totalUptake', 'glandPosition', 'hotNodules', 'coldNodules',
  'diffuseUptake', 'heterogenousUptake', 'prostateBedRecurrence', 'lymphNodeInvolvement',
  'boneMetastasis', 'visceralMetastasis', 'lesionLocations', 'psmaExpression',
  'rightKidneyGFR', 'leftKidneyGFR', 'rightSplitFunction', 'leftSplitFunction',
  'rightT1_2', 'leftT1_2', 'rightTmax', 'leftTmax', 'obstructionSign', 'refluxSign', 'corticalScarring',
  'halfEmptyingTime', 'retention1h', 'retention2h', 'retention4h', 'delayedEmptying', 'rapidEmptying',
  'aspirationSign', 'ectopicUptake', 'uptakeLocation',
  'ecgFindings', 'echoFindings', 'cardiacEnzymes', 'cardiacCtMriFindings',
]);

const VITALS_LABELS = ['Before Rest', 'Before stress', 'During stress', 'After stress', 'Before Discharge'];

const ARABIC_RE = /[؀-ۿ]/;
const hasArabic = (s) => typeof s === 'string' && ARABIC_RE.test(s);

const humanize = (key) =>
  key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bT1 2\b/i, 'T-half')
    .replace(/\bGfr\b/i, 'GFR')
    .replace(/\bSuv\b/i, 'SUV')
    .replace(/\bTsh\b/i, 'TSH')
    .replace(/\bMc I\b/i, 'mCi')
    .trim();

const parseArr = (val) => {
  if (Array.isArray(val)) return val;
  if (typeof val !== 'string') return [val];
  try {
    const p = JSON.parse(val);
    return Array.isArray(p) ? p : [val];
  } catch {
    return [val];
  }
};

const parseVitals = (val) => {
  if (Array.isArray(val)) return val;
  if (typeof val !== 'string') return null;
  try {
    const p = JSON.parse(val);
    return Array.isArray(p) ? p : null;
  } catch {
    return null;
  }
};

const fmtDate = (d) => {
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return null;
  return dt.toISOString().slice(0, 10);
};
const fmtDateTime = (d) => {
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return null;
  return `${dt.toISOString().slice(0, 10)} ${dt.toISOString().slice(11, 16)}`;
};

const formatVal = (key, val) => {
  if (val === null || val === undefined || val === '') return null;
  if (key === 'vitalsTable') return null; // rendered separately as a table
  if (JSON_ARRAY_FIELDS.has(key)) {
    const arr = parseArr(val).filter((x) => x != null && x !== '');
    return arr.length ? arr.join(', ') : null;
  }
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (/time$/i.test(key)) return fmtDateTime(val) || String(val);
  if (/date$/i.test(key)) return fmtDate(val) || String(val);
  if (typeof val === 'object') return null;
  return String(val);
};

const ageFrom = (birthDate) => {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  if (isNaN(b.getTime())) return null;
  return Math.floor((Date.now() - b.getTime()) / (365.25 * 24 * 3600 * 1000));
};

const SECTION_DEFS = [
  { key: 'clinical', title: 'Clinical / Referral', test: (k) => !NURSE.has(k) && !TECH.has(k) && !FINDINGS.has(k) },
  { key: 'prep', title: 'Preparation', test: (k) => NURSE.has(k) },
  { key: 'acq', title: 'Acquisition', test: (k) => TECH.has(k) },
  { key: 'findings', title: 'Findings', test: (k) => FINDINGS.has(k) && k !== 'impression' && k !== 'physicianNotes' },
];

// Map a template field section → the report section it belongs in.
const DYNAMIC_SECTION_TITLES = {
  doctor: 'Clinical / Referral',
  nurse: 'Preparation',
  tech: 'Acquisition',
  results: 'Findings',
};

const formatDynamicVal = (field, val) => {
  if (val === null || val === undefined || val === '') return null;
  if (field.type === 'vitalsTable') return null; // handled separately
  if (field.type === 'multiselect') {
    const arr = parseArr(val).filter((x) => x != null && x !== '');
    return arr.length ? arr.join(', ') : null;
  }
  if (field.type === 'checkbox') return (val === true || val === 'true') ? 'Yes' : 'No';
  if (field.type === 'datetime') return fmtDateTime(val) || String(val);
  if (field.type === 'date') return fmtDate(val) || String(val);
  let s = String(val);
  if (field.unit) s += ` ${field.unit}`;
  return s;
};

// Build the report model for an admin-defined (dynamic) scan: sections come from
// the template field definitions + the record's JSON `data` blob.
const buildDynamicReportModel = async (scanId, meta) => {
  const record = await prisma.dynamicScan.findUnique({
    where: { id: scanId },
    include: { patient: true, reporter: { select: { name: true } } },
  });
  if (!record) throw new Error('Scan record not found');
  const template = await prisma.scanTemplate.findUnique({
    where: { id: record.templateId },
    include: { fields: { orderBy: { order: 'asc' } } },
  });
  if (!template) throw new Error('Template not found');

  let data = {};
  try { data = JSON.parse(record.data || '{}'); } catch { data = {}; }

  const patient = record.patient || {};
  const order = ['doctor', 'nurse', 'tech', 'results'];
  const sections = order.map((sec) => {
    const secFields = template.fields.filter((f) => f.section === sec);
    const vitalsField = secFields.find((f) => f.type === 'vitalsTable');
    const items = secFields
      .map((f) => ({ field: f, value: formatDynamicVal(f, data[f.key]) }))
      .filter((x) => x.value !== null)
      .map((x) => ({ label: x.field.label, value: x.value }));
    return {
      title: DYNAMIC_SECTION_TITLES[sec] || sec,
      items,
      vitals: vitalsField ? parseVitals(data[vitalsField.key]) : null,
    };
  }).filter((s) => s.items.length > 0 || (s.vitals && s.vitals.length));

  return {
    letterhead: LETTERHEAD,
    title: 'Nuclear Medicine Report',
    scanLabel: template.name || 'Dynamic Scan',
    reportNumber: meta.reportNumber || null,
    version: meta.version || null,
    generatedAt: fmtDate(new Date()),
    patient: {
      name: patient.name || '—',
      nationalId: patient.nationalId || null,
      gender: patient.gender || null,
      age: ageFrom(patient.birthDate),
    },
    sections,
    impression: record.impression || null,
    physicianNotes: record.physicianNotes || null,
    technicianNotes: record.technicianNotes || null,
    physicianName: record.reporter?.name || meta.generatedByName || null,
  };
};

/**
 * Load the scan record and return a normalized report model.
 */
const buildReportModel = async (scanType, scanId, meta = {}) => {
  if (scanType === 'dynamic') return buildDynamicReportModel(scanId, meta);

  const modelName = TYPE_TO_MODEL[scanType];
  if (!modelName) throw new Error(`Unknown scan type: ${scanType}`);
  // modelName is PascalCase (e.g. ScanCardiac); prisma client uses camelCase.
  const accessor = modelName.charAt(0).toLowerCase() + modelName.slice(1);

  const record = await prisma[accessor].findUnique({
    where: { id: scanId },
    include: { patient: true },
  });
  if (!record) throw new Error('Scan record not found');

  const patient = record.patient || {};
  const entries = Object.entries(record).filter(
    ([k, v]) => !HIDDEN.has(k) && formatVal(k, v) !== null
  );

  const sections = SECTION_DEFS
    .map((s) => ({
      title: s.title,
      items: entries
        .filter(([k]) => s.test(k))
        .map(([k, v]) => ({ label: humanize(k), value: formatVal(k, v) })),
      // attach the vitals table to the Acquisition section
      vitals: s.key === 'acq' ? parseVitals(record.vitalsTable) : null,
    }))
    .filter((s) => s.items.length > 0 || (s.vitals && s.vitals.length));

  return {
    letterhead: LETTERHEAD,
    title: 'Nuclear Medicine Report',
    scanLabel: SCAN_LABEL[scanType] || scanType,
    reportNumber: meta.reportNumber || null,
    version: meta.version || null,
    generatedAt: fmtDate(new Date()),
    patient: {
      name: patient.name || '—',
      nationalId: patient.nationalId || null,
      gender: patient.gender || null,
      age: ageFrom(patient.birthDate),
    },
    sections,
    impression: record.impression || null,
    physicianNotes: record.physicianNotes || null,
    technicianNotes: record.technicianNotes || null,
    physicianName: record.reporter?.name || meta.generatedByName || null,
  };
};

// ===================== DOCX =====================
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle,
} = require('docx');

const docxText = (text, opts = {}) =>
  new Paragraph({
    bidirectional: hasArabic(text),
    alignment: hasArabic(text) ? AlignmentType.RIGHT : (opts.alignment || AlignmentType.LEFT),
    spacing: { after: opts.after ?? 40 },
    children: [new TextRun({ text: String(text), bold: !!opts.bold, size: opts.size || 20, color: opts.color })],
  });

const docxLabelValue = (label, value) =>
  new Paragraph({
    bidirectional: hasArabic(value),
    alignment: hasArabic(value) ? AlignmentType.RIGHT : AlignmentType.LEFT,
    spacing: { after: 40 },
    children: [
      new TextRun({ text: `${label}: `, bold: true, size: 20 }),
      new TextRun({ text: String(value), size: 20 }),
    ],
  });

const docxSectionTitle = (title) =>
  new Paragraph({
    spacing: { before: 160, after: 80 },
    children: [new TextRun({ text: title, bold: true, size: 24, color: '1d4ed8' })],
  });

const docxVitalsTable = (rows) => {
  const headers = ['Stage', 'Time', 'Pulse', 'BP', 'ECG', 'Notes'];
  const cell = (text, bold) =>
    new TableCell({
      width: { size: 16, type: WidthType.PERCENTAGE },
      children: [new Paragraph({ children: [new TextRun({ text: String(text ?? '—'), bold: !!bold, size: 18 })] })],
    });
  const headerRow = new TableRow({ children: headers.map((h) => cell(h, true)) });
  const bodyRows = rows.map((r, i) =>
    new TableRow({
      children: [
        cell(r.label || VITALS_LABELS[i] || `Row ${i + 1}`),
        cell(r.time), cell(r.pulse), cell(r.bp), cell(r.ecg), cell(r.notes),
      ],
    })
  );
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: 'cccccc' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: 'cccccc' },
      left: { style: BorderStyle.SINGLE, size: 1, color: 'cccccc' },
      right: { style: BorderStyle.SINGLE, size: 1, color: 'cccccc' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'eeeeee' },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'eeeeee' },
    },
    rows: [headerRow, ...bodyRows],
  });
};

const generateDocx = async (model) => {
  const children = [];

  // Letterhead
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { after: 40 },
    children: [new TextRun({ text: model.letterhead, bold: true, size: 20 })],
  }));
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { after: 120 },
    children: [new TextRun({ text: model.title, bold: true, size: 28, color: '1d4ed8' })],
  }));

  // Meta line (scan type + report number/version + date)
  const metaParts = [model.scanLabel];
  if (model.reportNumber) metaParts.push(`Report No. ${model.reportNumber}` + (model.version ? ` (v${model.version})` : ''));
  if (model.generatedAt) metaParts.push(model.generatedAt);
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { after: 160 },
    children: [new TextRun({ text: metaParts.join('  ·  '), size: 18, color: '666666' })],
  }));

  // Patient header
  children.push(docxSectionTitle('Patient'));
  children.push(docxLabelValue('Name', model.patient.name));
  const idParts = [];
  if (model.patient.nationalId) idParts.push(`ID ${model.patient.nationalId}`);
  if (model.patient.gender) idParts.push(model.patient.gender);
  if (model.patient.age != null) idParts.push(`${model.patient.age}y`);
  if (idParts.length) children.push(docxText(idParts.join(' · ')));

  // Sections
  for (const sec of model.sections) {
    children.push(docxSectionTitle(sec.title));
    for (const it of sec.items) children.push(docxLabelValue(it.label, it.value));
    if (sec.vitals && sec.vitals.length) {
      children.push(new Paragraph({ spacing: { before: 40, after: 40 }, children: [new TextRun({ text: 'Vitals', bold: true, size: 20 })] }));
      children.push(docxVitalsTable(sec.vitals));
    }
  }

  // Impression
  if (model.impression) {
    children.push(docxSectionTitle('Impression'));
    children.push(docxText(model.impression));
  }
  if (model.physicianNotes) {
    children.push(docxSectionTitle('Physician Notes'));
    children.push(docxText(model.physicianNotes));
  }
  if (model.technicianNotes) {
    children.push(docxSectionTitle('Technician Notes'));
    children.push(docxText(model.technicianNotes));
  }

  // Signatures
  children.push(new Paragraph({ spacing: { before: 320 }, children: [] }));
  children.push(new Paragraph({
    spacing: { after: 40 },
    children: [new TextRun({ text: `Reporting Physician: ${model.physicianName || '__________________'}`, size: 20 })],
  }));
  children.push(new Paragraph({
    children: [new TextRun({ text: 'Signature: __________________      Date: ' + (model.generatedAt || '__________'), size: 20 })],
  }));

  const doc = new Document({ sections: [{ children }] });
  return Packer.toBuffer(doc);
};

// ===================== PDF =====================
const PdfPrinter = require('pdfmake');

const FONT_DIR = path.join(__dirname, '..', '..', 'assets', 'fonts');
const pdfFonts = {
  Amiri: {
    normal: path.join(FONT_DIR, 'Amiri-Regular.ttf'),
    bold: path.join(FONT_DIR, 'Amiri-Bold.ttf'),
    italics: path.join(FONT_DIR, 'Amiri-Regular.ttf'),
    bolditalics: path.join(FONT_DIR, 'Amiri-Bold.ttf'),
  },
};
let _printer = null;
const getPrinter = () => {
  if (!_printer) _printer = new PdfPrinter(pdfFonts);
  return _printer;
};

const pdfLabelValue = (label, value) => {
  const ar = hasArabic(value);
  return {
    columns: [
      { text: `${label}: `, bold: true, width: 'auto' },
      { text: String(value), alignment: ar ? 'right' : 'left' },
    ],
    columnGap: 6,
    margin: [0, 1, 0, 1],
  };
};

const pdfSectionTitle = (title) => ({
  text: title, bold: true, fontSize: 12, color: '#1d4ed8', margin: [0, 10, 0, 4],
});

const pdfVitalsTable = (rows) => {
  const headers = ['Stage', 'Time', 'Pulse', 'BP', 'ECG', 'Notes'].map((h) => ({ text: h, bold: true, fontSize: 8 }));
  const body = [headers];
  rows.forEach((r, i) => {
    body.push([
      r.label || VITALS_LABELS[i] || `Row ${i + 1}`,
      r.time || '—', r.pulse || '—', r.bp || '—', r.ecg || '—', r.notes || '—',
    ].map((c) => ({ text: String(c), fontSize: 8 })));
  });
  return { table: { headerRows: 1, widths: ['*', '*', '*', '*', '*', '*'], body }, layout: 'lightHorizontalLines', margin: [0, 2, 0, 4] };
};

const generatePdf = async (model) => {
  const content = [];

  content.push({ text: model.letterhead, bold: true, fontSize: 9, alignment: 'center', margin: [0, 0, 0, 2] });
  content.push({ text: model.title, bold: true, fontSize: 16, color: '#1d4ed8', alignment: 'center', margin: [0, 0, 0, 4] });

  const metaParts = [model.scanLabel];
  if (model.reportNumber) metaParts.push(`Report No. ${model.reportNumber}` + (model.version ? ` (v${model.version})` : ''));
  if (model.generatedAt) metaParts.push(model.generatedAt);
  content.push({ text: metaParts.join('  ·  '), fontSize: 9, color: '#666', alignment: 'center', margin: [0, 0, 0, 10] });

  content.push(pdfSectionTitle('Patient'));
  content.push(pdfLabelValue('Name', model.patient.name));
  const idParts = [];
  if (model.patient.nationalId) idParts.push(`ID ${model.patient.nationalId}`);
  if (model.patient.gender) idParts.push(model.patient.gender);
  if (model.patient.age != null) idParts.push(`${model.patient.age}y`);
  if (idParts.length) content.push({ text: idParts.join(' · '), fontSize: 9, color: '#444' });

  for (const sec of model.sections) {
    content.push(pdfSectionTitle(sec.title));
    for (const it of sec.items) content.push(pdfLabelValue(it.label, it.value));
    if (sec.vitals && sec.vitals.length) {
      content.push({ text: 'Vitals', bold: true, margin: [0, 4, 0, 0] });
      content.push(pdfVitalsTable(sec.vitals));
    }
  }

  if (model.impression) {
    content.push(pdfSectionTitle('Impression'));
    content.push({ text: model.impression, alignment: hasArabic(model.impression) ? 'right' : 'left' });
  }
  if (model.physicianNotes) {
    content.push(pdfSectionTitle('Physician Notes'));
    content.push({ text: model.physicianNotes, alignment: hasArabic(model.physicianNotes) ? 'right' : 'left' });
  }
  if (model.technicianNotes) {
    content.push(pdfSectionTitle('Technician Notes'));
    content.push({ text: model.technicianNotes, alignment: hasArabic(model.technicianNotes) ? 'right' : 'left' });
  }

  content.push({ text: `Reporting Physician: ${model.physicianName || '__________________'}`, margin: [0, 30, 0, 2] });
  content.push({ text: `Signature: __________________      Date: ${model.generatedAt || '__________'}` });

  const docDefinition = {
    defaultStyle: { font: 'Amiri', fontSize: 10 },
    pageMargins: [40, 40, 40, 40],
    content,
  };

  const printer = getPrinter();
  const pdfDoc = printer.createPdfKitDocument(docDefinition);
  return new Promise((resolve, reject) => {
    const chunks = [];
    pdfDoc.on('data', (c) => chunks.push(c));
    pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
    pdfDoc.on('error', reject);
    pdfDoc.end();
  });
};

module.exports = { buildReportModel, generateDocx, generatePdf, SCAN_LABEL, LETTERHEAD };
