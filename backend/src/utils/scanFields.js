const DATE_FIELDS = new Set([
  'lastChemoDate', 'lastRadiationDate', 'contrastCTDate',
  'injectionTime', 'scanTime', 'scanStartTime', 'ingestionTime', 'furosemideTime',
]);

const CLINICAL_PREP_FIELDS = [
  'complaint', 'diagnosis', 'referralReason',
  'scanPurpose', 'surgeryHistory', 'chemoSessions', 'lastChemoDate',
  'radiationSessions', 'lastRadiationDate', 'gcsfGiven', 'tumorMarkers', 'renalFunction',
  'pregnancyContraindication',
  'totalPSA', 'freePSA', 'psaHistory', 'psaLevel', 'gleasonScore',
  'symptoms', 't3Level', 't4Level', 'contrastCTDate', 'currentMedications',
  'medicationStopped', 'medicationStopNotes', 'tshLevel', 'withdrawalDays',
  'scanMode', 'painComplaint', 'hardwareHistory', 'primaryCancer',
  'renalComplaint', 'dialysisHistory', 'urineAnalysis', 'scanType',
  'endoscopyHistory', 'chronicDiseases', 'mealType', 'bleedingHistory',
  'prepWeight', 'prepHeight', 'prepBloodGlucose', 'injectionSite',
  'cannulaSize', 'pregnancyStatus', 'prepNurseNotes', 'technicianNotes',
  'workflowStatus',
];

const ROLE_WRITABLE = {
  nurse: ['prepWeight', 'prepHeight', 'prepBloodGlucose', 'injectionSite', 'cannulaSize', 'pregnancyStatus', 'prepNurseNotes'],
  technician: [
    'fdgDoseMCi', 'ga68DoseMCi', 'isotopeDoseMCi', 'tc99mDoseMCi',
    'injectionTime', 'scanTime', 'scanStartTime', 'ingestionTime', 'technicianNotes',
  ],
  doctor: [
    'complaint', 'diagnosis', 'referralReason', 'scanPurpose', 'surgeryHistory',
    'chemoSessions', 'lastChemoDate', 'radiationSessions', 'lastRadiationDate',
    'gcsfGiven', 'tumorMarkers', 'renalFunction', 'pregnancyContraindication',
    'totalPSA', 'freePSA', 'psaHistory', 'psaLevel', 'gleasonScore',
    'symptoms', 't3Level', 't4Level', 'contrastCTDate', 'currentMedications',
    'medicationStopped', 'medicationStopNotes', 'tshLevel', 'withdrawalDays',
    'scanMode', 'painComplaint', 'hardwareHistory', 'primaryCancer',
    'renalComplaint', 'dialysisHistory', 'urineAnalysis',
    'endoscopyHistory', 'chronicDiseases', 'mealType', 'bleedingHistory',
    'impression', 'physicianNotes', 'reportedBy',
  ],
  admin: null,
};

const parseValue = (key, val) => {
  if (val === '' || val === undefined) return undefined;
  if (DATE_FIELDS.has(key) && val) return new Date(val);
  if (['chemoSessions', 'radiationSessions', 'uptakeTime', 'withdrawalDays', 'scanDuration', 'imageInterval'].includes(key)) {
    return val === '' ? undefined : parseInt(val, 10);
  }
  if (typeof val === 'boolean') return val;
  if (['gcsfGiven', 'medicationStopped', 'pregnancyContraindication', 'metastasisSign',
    'prostateBedRecurrence', 'lymphNodeInvolvement', 'boneMetastasis', 'visceralMetastasis',
    'diffuseUptake', 'heterogenousUptake', 'delayedEmptying', 'rapidEmptying', 'refluxSign',
    'aspirationSign', 'ectopicUptake', 'furosemideGiven', 'aceInhibitorGiven', 'obstructionSign',
    'refluxSign', 'corticalScarring', 'skeletalMetastasis', 'extraosseousUptake', 'renalVisualization',
    'degenerativeChanges'].includes(key)) {
    return Boolean(val);
  }
  const floats = ['prepWeight', 'prepHeight', 'prepBloodGlucose', 'fdgDoseMCi', 'ga68DoseMCi',
    'isotopeDoseMCi', 'tc99mDoseMCi', 'bloodSugar', 'suvMax', 'suvMean', 'psaLevel', 'totalPSA', 'freePSA',
    't3Level', 't4Level', 'tshLevel', 'thyroglobulin', 'halfEmptyingTime', 'retention1h', 'retention2h', 'retention4h'];
  if (floats.includes(key) && val !== null && val !== '') return parseFloat(val);
  return val;
};

const pickClinicalFields = (body, allowedKeys = null) => {
  const keys = allowedKeys || CLINICAL_PREP_FIELDS;
  const out = {};
  for (const key of keys) {
    if (body[key] !== undefined) {
      const parsed = parseValue(key, body[key]);
      if (parsed !== undefined) out[key] = parsed;
    }
  }
  return out;
};

const filterBodyByRole = (body, role) => {
  if (role === 'admin') return pickClinicalFields(body);

  const roleKeys = role === 'nurse' ? ROLE_WRITABLE.nurse
    : role === 'technician' ? ROLE_WRITABLE.technician
    : role === 'doctor' ? ROLE_WRITABLE.doctor
    : [];

  return pickClinicalFields(body, roleKeys);
};

module.exports = { pickClinicalFields, filterBodyByRole, CLINICAL_PREP_FIELDS };
