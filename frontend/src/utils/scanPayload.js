/** دمج الحقول السريرية والتحضير في payload الإرسال للـ API */

const CLINICAL_KEYS = [
  'complaint', 'diagnosis', 'scanPurpose', 'surgeryHistory', 'chemoSessions', 'lastChemoDate',
  'radiationSessions', 'lastRadiationDate', 'gcsfGiven', 'tumorMarkers', 'renalFunction',
  'pregnancyContraindication', 'totalPSA', 'freePSA', 'psaHistory',
  'symptoms', 't3Level', 't4Level', 'contrastCTDate', 'currentMedications',
  'medicationStopped', 'medicationStopNotes',
  'scanMode', 'painComplaint', 'hardwareHistory',
  'renalComplaint', 'dialysisHistory', 'urineAnalysis',
  'endoscopyHistory', 'chronicDiseases', 'bleedingHistory',
  'prepWeight', 'prepHeight', 'prepBloodGlucose', 'injectionSite',
  'cannulaSize', 'pregnancyStatus', 'prepNurseNotes', 'technicianNotes',
];

const DOSE_FIELD = {
  petct: { form: ['fdgDose', 'doseMCi'], api: 'fdgDoseMCi' },
  psma: { form: ['ga68Dose', 'doseMCi'], api: 'ga68DoseMCi' },
  thyroid: { form: ['isotopeDose', 'doseMCi'], api: 'isotopeDoseMCi' },
  bone: { form: ['tc99mDose', 'doseMCi'], api: 'tc99mDoseMCi' },
  renal: { form: ['tc99mDose', 'doseMCi'], api: 'tc99mDoseMCi' },
  gastric: { form: ['tc99mDose', 'doseMCi'], api: 'tc99mDoseMCi' },
  meckel: { form: ['tc99mDose', 'doseMCi'], api: 'tc99mDoseMCi' },
};

export const buildScanPayload = (scanType, formData, base = {}) => {
  const payload = { ...base };

  for (const key of CLINICAL_KEYS) {
    const v = formData[key];
    if (v !== undefined && v !== '' && v !== null) {
      payload[key] = v;
    }
  }

  const dm = DOSE_FIELD[scanType];
  if (dm) {
    for (const f of dm.form) {
      if (formData[f] !== undefined && formData[f] !== '') {
        payload[dm.api] = parseFloat(formData[f]);
        break;
      }
    }
  }

  if (formData.injectionTime) payload.injectionTime = formData.injectionTime;
  if (formData.scanTime) {
    payload[scanType === 'gastric' ? 'scanStartTime' : 'scanTime'] = formData.scanTime;
  }

  if (formData.thyroidWithdrawalDays) {
    payload.withdrawalDays = parseInt(formData.thyroidWithdrawalDays, 10);
  }

  return payload;
};

export default buildScanPayload;
