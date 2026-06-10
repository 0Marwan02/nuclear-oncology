import { format } from 'date-fns';
import { User, Calendar, Stethoscope, Activity, FlaskConical, FileText } from 'lucide-react';
import './ScanReportView.css';

const SCAN_LABEL = {
  petct: 'PET/CT (FDG)', psma: 'PSMA PET/CT', thyroid: 'Thyroid Scan',
  bone: 'Bone Scan', renal: 'Renal Scan', gastric: 'Gastric Emptying', meckel: "Meckel's Scan",
};

// Internal / relational / noisy fields never shown on the report.
const HIDDEN = new Set([
  'id', 'patientId', 'visitId', 'performedBy', 'reportedBy', 'createdAt', 'updatedAt',
  'fileUrl', 'isLocked', 'patient', 'visit', 'performer', 'reporter',
  'scanType', '_scanType', 'type', 'date', 'doseUnit', 'diagramData', 'symptomFlags', 'workflowStatus',
]);

const NURSE = new Set(['prepWeight', 'prepHeight', 'prepBloodGlucose', 'injectionSite', 'pregnancyStatus', 'prepNurseNotes', 'mealType']);
const TECH = new Set([
  'fdgDoseMCi', 'ga68DoseMCi', 'isotopeDoseMCi', 'tc99mDoseMCi', 'dmsaDoseMCi', 'dtpaDoseMCi',
  'injectionTime', 'scanTime', 'scanStartTime', 'ingestionTime',
  'dmsaInjectionTime', 'dmsaScanTime', 'dtpaInjectionTime', 'dtpaScanTime',
  'uptakeTime', 'scanMode', 'delayedImages', 'delayedImagesNotes', 'technicianNotes',
  'withdrawalDays', 'furosemideGiven', 'furosemideTime', 'aceInhibitorGiven',
  'scanDuration', 'imageInterval', 'isotopeType', 'scanSubType',
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
]);

const humanize = (key) =>
  key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bT1 2\b/i, 'T½')
    .replace(/\bGfr\b/i, 'GFR')
    .replace(/\bSuv\b/i, 'SUV')
    .replace(/\bTsh\b/i, 'TSH')
    .replace(/\bMc I\b/i, 'mCi')
    .replace(/\bYn\b/i, '')
    .trim();

const formatVal = (key, val) => {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (/time$/i.test(key)) {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return format(d, 'dd MMM yyyy · HH:mm');
  }
  if (/date$/i.test(key)) {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return format(d, 'dd MMM yyyy');
  }
  if (typeof val === 'object') return null;
  return String(val);
};

const isWide = (key, value) =>
  /notes|impression|complaint|history|details|indication|findings|location|diagnosis|aim/i.test(key) ||
  (typeof value === 'string' && value.length > 42);

const ageFrom = (birthDate) => {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  if (isNaN(b.getTime())) return null;
  return Math.floor((Date.now() - b.getTime()) / (365.25 * 24 * 3600 * 1000));
};

const SECTIONS = [
  { key: 'clinical', title: 'Clinical / Referral', Icon: Stethoscope, test: (k) => !NURSE.has(k) && !TECH.has(k) && !FINDINGS.has(k) },
  { key: 'prep', title: 'Preparation', Icon: User, test: (k) => NURSE.has(k) },
  { key: 'acq', title: 'Acquisition', Icon: Activity, test: (k) => TECH.has(k) },
  { key: 'findings', title: 'Findings', Icon: FlaskConical, test: (k) => FINDINGS.has(k) && k !== 'impression' && k !== 'physicianNotes' },
];

const ScanReportView = ({ record }) => {
  const type = record.scanType || record._scanType || record.type;
  const patient = record.patient || {};
  const dateVal = record.date || record.createdAt;
  const age = ageFrom(patient.birthDate);

  const entries = Object.entries(record).filter(([k, v]) => !HIDDEN.has(k) && formatVal(k, v) !== null);

  const sections = SECTIONS
    .map((s) => ({
      ...s,
      items: entries
        .filter(([k]) => s.test(k))
        .map(([k, v]) => ({ key: k, label: humanize(k), value: formatVal(k, v), wide: isWide(k, v) })),
    }))
    .filter((s) => s.items.length > 0);

  return (
    <div className="scan-report">
      {/* Letterhead */}
      <div className="sr-head">
        <div className="sr-head-left">
          <span className="sr-type-badge">{SCAN_LABEL[type] || type}</span>
          <h4 className="sr-doc-title">Nuclear Medicine Report</h4>
        </div>
        <div className="sr-head-right">
          <span className="sr-patient-name"><User size={14} /> {patient.name || '—'}</span>
          <span className="sr-patient-meta">
            {patient.nationalId && <>ID {patient.nationalId}</>}
            {patient.gender && <> · {patient.gender}</>}
            {age != null && <> · {age}y</>}
          </span>
          <span className="sr-patient-meta"><Calendar size={12} /> {dateVal ? format(new Date(dateVal), 'dd MMM yyyy') : '—'}</span>
        </div>
      </div>

      {sections.map(({ key, title, Icon, items }) => (
        <div className="sr-section" key={key}>
          <div className="sr-section-title"><Icon size={14} /> {title}</div>
          <div className="sr-grid">
            {items.map((it) => (
              <div className={`sr-item ${it.wide ? 'wide' : ''}`} key={it.key}>
                <span className="sr-label">{it.label}</span>
                <span className="sr-value">{it.value}</span>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Existing impression, if any (e.g. admin-filled at create) */}
      {record.impression && (
        <div className="sr-impression">
          <div className="sr-section-title"><FileText size={14} /> Impression</div>
          <p>{record.impression}</p>
        </div>
      )}
    </div>
  );
};

export default ScanReportView;
