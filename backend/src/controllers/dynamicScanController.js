// Dynamic Sheet Engine (WS5) — admin-defined scan sheets.
//
// Two resource families live here:
//   1. Templates  (ScanTemplate + ScanTemplateField) — admin CRUD; define the
//      shape of a sheet (fields grouped by section: doctor|nurse|tech|results).
//   2. Records    (DynamicScan) — doctor-created clinical records that carry a
//      JSON `data` blob (validated/coerced against the template) plus the same
//      workflow scaffold columns as the 8 hardcoded scan models.
//
// Reuses the audit-log + $transaction pattern from scanController.js.

const prisma = require('../prisma');
const { emitQueue } = require('../realtime');

const SECTIONS = ['doctor', 'nurse', 'tech', 'results'];
// Role → the template section that role is allowed to write into the data blob.
const ROLE_SECTION = { nurse: 'nurse', technician: 'tech' };

const scanInclude = {
  patient: true,
  performer: { select: { id: true, name: true, hospitalId: true } },
  reporter: { select: { id: true, name: true, hospitalId: true } },
};

// New scans may only enter the workflow at its start.
const CREATE_STATUSES = new Set(['Pending_Doctor', 'Pending_Nurse']);
const safeCreateStatus = (s) => (CREATE_STATUSES.has(s) ? s : 'Pending_Nurse');

// ---- value coercion by field type (mirrors scanFields.coerce semantics) ----
const coerceField = (type, val) => {
  if (val === '' || val === undefined || val === null) return undefined;
  switch (type) {
    case 'number': {
      const n = Number(val);
      return Number.isNaN(n) ? undefined : n;
    }
    case 'date':
    case 'datetime': {
      const d = new Date(val);
      return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
    }
    case 'checkbox':
      if (typeof val === 'boolean') return val;
      return val === 'true' || val === 1 || val === '1';
    case 'multiselect':
    case 'vitalsTable':
    case 'group':
      // Stored as a JSON string inside the data blob.
      if (typeof val === 'string') {
        // Already a JSON string? keep it; otherwise stringify.
        try { JSON.parse(val); return val; } catch { return JSON.stringify(val); }
      }
      return JSON.stringify(val);
    case 'text':
    case 'textarea':
    case 'radio':
    case 'select':
    default:
      return typeof val === 'object' ? JSON.stringify(val) : String(val);
  }
};

// Validate/coerce an incoming `data` object against the template's fields.
// - whitelist keys to those defined on the template
// - coerce each value by its field type
// - optionally restrict to a single section (for nurse/tech edits)
// - enforce required fields for the given section(s)
//
// Returns { data, missing } where `missing` lists required keys still empty.
const validateData = (fields, incoming = {}, { sections = null } = {}) => {
  const byKey = new Map(fields.map((f) => [f.key, f]));
  const out = {};
  for (const [key, raw] of Object.entries(incoming || {})) {
    const field = byKey.get(key);
    if (!field) continue; // not on the template — drop it
    if (sections && !sections.includes(field.section)) continue; // wrong section for this role
    const c = coerceField(field.type, raw);
    if (c !== undefined) out[key] = c;
  }
  return out;
};

const requiredMissing = (fields, mergedData, sections) => {
  const missing = [];
  for (const f of fields) {
    if (!f.required) continue;
    if (sections && !sections.includes(f.section)) continue;
    const v = mergedData[f.key];
    if (v === undefined || v === null || v === '') missing.push(f.label || f.key);
  }
  return missing;
};

// ============================ TEMPLATE CRUD ============================

const normalizeFields = (fields = []) =>
  (Array.isArray(fields) ? fields : []).map((f, i) => ({
    section: SECTIONS.includes(f.section) ? f.section : 'doctor',
    key: String(f.key || '').trim(),
    label: String(f.label || f.key || '').trim(),
    labelAr: f.labelAr || null,
    type: f.type || 'text',
    options: f.options
      ? (typeof f.options === 'string' ? f.options : JSON.stringify(f.options))
      : null,
    unit: f.unit || null,
    required: !!f.required,
    order: Number.isFinite(f.order) ? f.order : i,
    conditional: f.conditional
      ? (typeof f.conditional === 'string' ? f.conditional : JSON.stringify(f.conditional))
      : null,
  })).filter((f) => f.key);

const createTemplate = async (req, res) => {
  const { key, name, nameAr, category, icon, color, isActive, fields } = req.body;
  if (!key || !name) return res.status(400).json({ message: 'key and name are required' });
  const slug = String(key).trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
  if (!slug) return res.status(400).json({ message: 'key must contain letters or numbers' });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const template = await tx.scanTemplate.create({
        data: {
          key: slug,
          name,
          nameAr: nameAr || null,
          category: category || null,
          icon: icon || null,
          color: color || null,
          isActive: isActive !== undefined ? !!isActive : true,
          createdBy: req.user.id,
          fields: { create: normalizeFields(fields) },
        },
        include: { fields: { orderBy: { order: 'asc' } } },
      });
      await tx.auditLog.create({
        data: {
          userId: req.user.id, tableName: 'ScanTemplate', recordId: template.id,
          action: 'INSERT', newValues: JSON.stringify({ key: slug, name }),
        },
      });
      return template;
    });
    return res.status(201).json(result);
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).json({ message: 'A template with this key already exists' });
    return res.status(500).json({ message: 'Failed to create template', error: error.message });
  }
};

const listTemplates = async (req, res) => {
  try {
    const where = {};
    if (req.query.active === '1' || req.query.active === 'true') where.isActive = true;
    const templates = await prisma.scanTemplate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { fields: { orderBy: { order: 'asc' } } },
    });
    return res.json(templates);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to list templates', error: error.message });
  }
};

const getTemplate = async (req, res) => {
  const { idOrKey } = req.params;
  try {
    const template = await prisma.scanTemplate.findFirst({
      where: { OR: [{ id: idOrKey }, { key: idOrKey }] },
      include: { fields: { orderBy: { order: 'asc' } } },
    });
    if (!template) return res.status(404).json({ message: 'Template not found' });
    return res.json(template);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to get template', error: error.message });
  }
};

// Update template metadata and (optionally) replace its full field set.
const updateTemplate = async (req, res) => {
  const { id } = req.params;
  const { name, nameAr, category, icon, color, isActive, fields } = req.body;
  try {
    const existing = await prisma.scanTemplate.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: 'Template not found' });

    const result = await prisma.$transaction(async (tx) => {
      const data = {};
      if (name !== undefined) data.name = name;
      if (nameAr !== undefined) data.nameAr = nameAr || null;
      if (category !== undefined) data.category = category || null;
      if (icon !== undefined) data.icon = icon || null;
      if (color !== undefined) data.color = color || null;
      if (isActive !== undefined) data.isActive = !!isActive;

      // If a fields array is supplied, replace the whole set and bump version.
      if (Array.isArray(fields)) {
        await tx.scanTemplateField.deleteMany({ where: { templateId: id } });
        data.fields = { create: normalizeFields(fields) };
        data.version = (existing.version || 1) + 1;
      }

      const template = await tx.scanTemplate.update({
        where: { id },
        data,
        include: { fields: { orderBy: { order: 'asc' } } },
      });
      await tx.auditLog.create({
        data: {
          userId: req.user.id, tableName: 'ScanTemplate', recordId: id,
          action: 'UPDATE', oldValues: JSON.stringify({ name: existing.name, isActive: existing.isActive }),
          newValues: JSON.stringify(data),
        },
      });
      return template;
    });
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update template', error: error.message });
  }
};

const setTemplateActive = async (req, res) => {
  const { id } = req.params;
  const isActive = !!req.body.isActive;
  try {
    const template = await prisma.scanTemplate.update({
      where: { id },
      data: { isActive },
      include: { fields: { orderBy: { order: 'asc' } } },
    });
    return res.json(template);
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Template not found' });
    return res.status(500).json({ message: 'Failed to update template status', error: error.message });
  }
};

// --- single-field management (optional, alongside the replace-all on update) ---
const addField = async (req, res) => {
  const { id } = req.params;
  try {
    const [field] = normalizeFields([req.body]);
    if (!field) return res.status(400).json({ message: 'field key is required' });
    const created = await prisma.scanTemplateField.create({ data: { ...field, templateId: id } });
    return res.status(201).json(created);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to add field', error: error.message });
  }
};

const updateField = async (req, res) => {
  const { fieldId } = req.params;
  try {
    const [field] = normalizeFields([req.body]);
    if (!field) return res.status(400).json({ message: 'field key is required' });
    const updated = await prisma.scanTemplateField.update({ where: { id: fieldId }, data: field });
    return res.json(updated);
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Field not found' });
    return res.status(500).json({ message: 'Failed to update field', error: error.message });
  }
};

const deleteField = async (req, res) => {
  const { fieldId } = req.params;
  try {
    await prisma.scanTemplateField.delete({ where: { id: fieldId } });
    return res.json({ ok: true });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Field not found' });
    return res.status(500).json({ message: 'Failed to delete field', error: error.message });
  }
};

// ============================ RECORD CRUD ============================

const dynamicInclude = (template) => ({ ...scanInclude });

// Attach template fields + parsed data so the frontend/report can render
// generically without a second round-trip.
const decorate = (record, template) => ({
  ...record,
  scanType: 'dynamic',
  templateKey: template?.key,
  templateName: template?.name,
  templateNameAr: template?.nameAr,
  templateFields: template?.fields || [],
  // expose parsed data alongside the raw string for convenience
  _data: (() => { try { return JSON.parse(record.data || '{}'); } catch { return {}; } })(),
});

const createDynamicScan = async (req, res) => {
  const { patientId, templateId, visitId, data, scanMode, impression, physicianNotes } = req.body;
  if (!patientId || !templateId) {
    return res.status(400).json({ message: 'patientId and templateId are required' });
  }

  try {
    const template = await prisma.scanTemplate.findUnique({
      where: { id: templateId },
      include: { fields: { orderBy: { order: 'asc' } } },
    });
    if (!template) return res.status(404).json({ message: 'Template not found' });

    // Doctor creates → validate the doctor section's required fields.
    const merged = validateData(template.fields, data);
    const missing = requiredMissing(template.fields, merged, ['doctor']);
    if (missing.length) {
      return res.status(422).json({ message: `Missing required fields: ${missing.join(', ')}` });
    }

    const fileUrl = req.file ? `/uploads/scans/${req.file.filename}` : null;

    const result = await prisma.$transaction(async (tx) => {
      const scan = await tx.dynamicScan.create({
        data: {
          templateId,
          patientId,
          visitId: visitId || null,
          data: JSON.stringify(merged),
          scanMode: scanMode ? (typeof scanMode === 'string' ? scanMode : JSON.stringify(scanMode)) : null,
          impression: impression || null,
          physicianNotes: physicianNotes || null,
          fileUrl,
          performedBy: req.user.id,
          workflowStatus: safeCreateStatus(req.body.workflowStatus),
        },
        include: scanInclude,
      });
      await tx.auditLog.create({
        data: {
          userId: req.user.id, tableName: 'DynamicScan', recordId: scan.id,
          action: 'INSERT', newValues: JSON.stringify({ patientId, templateId, templateKey: template.key }),
        },
      });
      return scan;
    });

    return res.status(201).json(decorate(result, template));
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create dynamic scan', error: error.message });
  }
};

const loadTemplateFor = (templateId) =>
  prisma.scanTemplate.findUnique({
    where: { id: templateId },
    include: { fields: { orderBy: { order: 'asc' } } },
  });

const listDynamicScans = async (req, res) => {
  const { patientId, templateId } = req.query;
  try {
    const where = {};
    if (patientId) where.patientId = patientId;
    if (templateId) where.templateId = templateId;
    const rows = await prisma.dynamicScan.findMany({
      where, orderBy: { createdAt: 'desc' }, include: scanInclude, take: 100,
    });
    // batch-load templates for labels
    const tplIds = [...new Set(rows.map((r) => r.templateId))];
    const tpls = await prisma.scanTemplate.findMany({
      where: { id: { in: tplIds } },
      include: { fields: { orderBy: { order: 'asc' } } },
    });
    const tplMap = new Map(tpls.map((t) => [t.id, t]));
    return res.json(rows.map((r) => decorate(r, tplMap.get(r.templateId))));
  } catch (error) {
    return res.status(500).json({ message: 'Failed to list dynamic scans', error: error.message });
  }
};

const getDynamicScan = async (req, res) => {
  try {
    const scan = await prisma.dynamicScan.findUnique({
      where: { id: req.params.id }, include: scanInclude,
    });
    if (!scan) return res.status(404).json({ message: 'Dynamic scan not found' });
    const template = await loadTemplateFor(scan.templateId);
    return res.json(decorate(scan, template));
  } catch (error) {
    return res.status(500).json({ message: 'Failed to get dynamic scan', error: error.message });
  }
};

const getDynamicScanHistory = async (req, res) => {
  try {
    const rows = await prisma.dynamicScan.findMany({
      where: { patientId: req.params.patientId },
      orderBy: { createdAt: 'desc' }, include: scanInclude, take: 100,
    });
    const tplIds = [...new Set(rows.map((r) => r.templateId))];
    const tpls = await prisma.scanTemplate.findMany({
      where: { id: { in: tplIds } },
      include: { fields: { orderBy: { order: 'asc' } } },
    });
    const tplMap = new Map(tpls.map((t) => [t.id, t]));
    return res.json(rows.map((r) => decorate(r, tplMap.get(r.templateId))));
  } catch (error) {
    return res.status(500).json({ message: 'Failed to get dynamic scan history', error: error.message });
  }
};

// Merge edits into `data`, role-aware: nurse/tech may only write fields whose
// section matches their role; doctor/admin may write any field. Also accepts
// top-level scaffold writes (impression/physicianNotes/technicianNotes/scanMode)
// for doctor/admin.
const updateDynamicScan = async (req, res) => {
  const { id } = req.params;
  const role = req.user.role;
  try {
    const existing = await prisma.dynamicScan.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: 'Dynamic scan not found' });

    const template = await loadTemplateFor(existing.templateId);
    if (!template) return res.status(404).json({ message: 'Template not found' });

    // Which section may this role write into the data blob?
    let sections = null; // null = any (doctor/admin)
    if (role !== 'doctor' && role !== 'admin') {
      const sec = ROLE_SECTION[role];
      if (!sec) return res.status(403).json({ message: 'Your role cannot edit this record' });
      sections = [sec];
    }

    const incoming = req.body.data || {};
    const validated = validateData(template.fields, incoming, { sections });
    const currentData = (() => { try { return JSON.parse(existing.data || '{}'); } catch { return {}; } })();
    const mergedData = { ...currentData, ...validated };

    const updateData = { data: JSON.stringify(mergedData) };
    const fileUrl = req.file ? `/uploads/scans/${req.file.filename}` : undefined;
    if (fileUrl !== undefined) updateData.fileUrl = fileUrl;

    // Scaffold columns — only doctor/admin may set the report-level fields.
    if (role === 'doctor' || role === 'admin') {
      if (req.body.impression !== undefined) updateData.impression = req.body.impression;
      if (req.body.physicianNotes !== undefined) updateData.physicianNotes = req.body.physicianNotes;
      if (req.body.scanMode !== undefined) {
        updateData.scanMode = req.body.scanMode
          ? (typeof req.body.scanMode === 'string' ? req.body.scanMode : JSON.stringify(req.body.scanMode))
          : null;
      }
    }
    if (req.body.technicianNotes !== undefined && (role === 'technician' || role === 'doctor' || role === 'admin')) {
      updateData.technicianNotes = req.body.technicianNotes;
    }

    const result = await prisma.$transaction(async (tx) => {
      const scan = await tx.dynamicScan.update({ where: { id }, data: updateData, include: scanInclude });
      await tx.auditLog.create({
        data: {
          userId: req.user.id, tableName: 'DynamicScan', recordId: id,
          action: 'UPDATE', oldValues: existing.data, newValues: updateData.data,
        },
      });
      return scan;
    });

    return res.json(decorate(result, template));
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update dynamic scan', error: error.message });
  }
};

module.exports = {
  // templates
  createTemplate, listTemplates, getTemplate, updateTemplate, setTemplateActive,
  addField, updateField, deleteField,
  // records
  createDynamicScan, listDynamicScans, getDynamicScan, getDynamicScanHistory, updateDynamicScan,
  // helpers reused by workflowController
  validateData, requiredMissing, coerceField, SECTIONS, ROLE_SECTION,
};
