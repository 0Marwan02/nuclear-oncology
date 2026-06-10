const { Prisma } = require('@prisma/client');

// Build, from the Prisma schema itself, a per-model map of scalar field -> type.
// This guarantees we only ever write columns that actually exist on the target
// model, and that we coerce values to the correct type — eliminating the whole
// class of "Unknown argument" / "Invalid value" Prisma errors that came from a
// hand-maintained global field list being applied to every model.
const MODEL_FIELD_TYPES = {};
for (const model of Prisma.dmmf.datamodel.models) {
  const map = new Map();
  for (const f of model.fields) {
    if (f.kind === 'scalar') map.set(f.name, f.type);
  }
  MODEL_FIELD_TYPES[model.name] = map;
}

// Maps the API `:type` route param / scan slug to the Prisma model name.
const TYPE_TO_MODEL = {
  visit: 'Visit',
  petct: 'ScanPETCT',
  psma: 'ScanPSMAPETCT',
  thyroid: 'ScanThyroid',
  bone: 'ScanBone',
  renal: 'ScanRenal',
  gastric: 'ScanGastric',
  meckel: 'ScanMeckel',
};

// Fields the server owns — never picked from the request body as clinical data.
// (workflowStatus is set explicitly by the controllers / driven by the advance
// endpoint, so it must never be stripped or role-filtered.)
const SERVER_CONTROLLED = new Set([
  'id', 'patientId', 'performedBy', 'reportedBy',
  'createdAt', 'updatedAt', 'isLocked', 'fileUrl', 'workflowStatus',
]);

const coerce = (type, val) => {
  if (val === '' || val === undefined || val === null) return undefined;
  switch (type) {
    case 'DateTime': {
      const d = new Date(val);
      return isNaN(d.getTime()) ? undefined : d;
    }
    case 'Int': {
      const n = parseInt(val, 10);
      return isNaN(n) ? undefined : n;
    }
    case 'Float': {
      const n = parseFloat(val);
      return isNaN(n) ? undefined : n;
    }
    case 'Boolean':
      if (typeof val === 'boolean') return val;
      return val === 'true' || val === 1 || val === '1';
    default:
      // String (and any other) columns: stringify objects/arrays (e.g. JSON
      // payloads like tumorMarkers / diagramData), pass strings through.
      return typeof val === 'object' ? JSON.stringify(val) : val;
  }
};

// Pick only the keys from `body` that are real, writable scalar columns on the
// given model, coerced to their schema type.
const pickClinicalFields = (body, modelName) => {
  const types = MODEL_FIELD_TYPES[modelName];
  if (!types || !body || typeof body !== 'object') return {};
  const out = {};
  for (const [key, val] of Object.entries(body)) {
    if (SERVER_CONTROLLED.has(key)) continue;
    if (!types.has(key)) continue;
    const c = coerce(types.get(key), val);
    if (c !== undefined) out[key] = c;
  }
  return out;
};

// Keys each non-doctor role is allowed to write on a scan.
const ROLE_WRITABLE = {
  nurse: [
    'prepWeight', 'prepHeight', 'prepBloodGlucose',
    'injectionSite', 'pregnancyStatus', 'prepNurseNotes', 'mealType',
  ],
  technician: [
    'fdgDoseMCi', 'ga68DoseMCi', 'isotopeDoseMCi', 'tc99mDoseMCi',
    'dmsaDoseMCi', 'dtpaDoseMCi', 'doseUnit',
    'injectionTime', 'scanTime', 'scanStartTime', 'ingestionTime',
    'dmsaInjectionTime', 'dmsaScanTime', 'dtpaInjectionTime', 'dtpaScanTime',
    'uptakeTime', 'scanMode', 'delayedImages', 'delayedImagesNotes', 'technicianNotes',
    'furosemideGiven', 'furosemideTime', 'aceInhibitorGiven',
  ],
};

// Restrict a body to the fields the current role may write on the given model.
// Doctors and admins may write any clinical column on the model.
const filterBodyByRole = (body, role, modelName) => {
  const picked = pickClinicalFields(body, modelName);
  if (role === 'admin' || role === 'doctor') return picked;
  const roleKeys = new Set(ROLE_WRITABLE[role] || []);
  const out = {};
  for (const key of Object.keys(picked)) {
    if (roleKeys.has(key)) out[key] = picked[key];
  }
  return out;
};

module.exports = {
  pickClinicalFields,
  filterBodyByRole,
  ROLE_WRITABLE,
  TYPE_TO_MODEL,
  MODEL_FIELD_TYPES,
};
