import { useState } from 'react';
import { createScan, advanceWorkflow } from '../utils/api';
import { buildScanPayload } from '../utils/scanPayload';
import ScanClinicalSections from './ScanClinicalSections';
import PreviousScanBanner from './PreviousScanBanner';
import ThyroidContrastAlert from './ThyroidContrastAlert';
import MedicationAlert from './MedicationAlert';
import ThyroidDiagram from './ThyroidDiagram';
import { CheckCircle, Stethoscope } from 'lucide-react';
import './PhysicianAssessment.css';

const SCAN_SHEETS = [
  { value: 'petct', label: 'PET/CT' },
  { value: 'psma', label: 'PSMA PET/CT' },
  { value: 'thyroid', label: 'مسح الغدة (Thyroid)' },
  { value: 'bone', label: 'مسح العظام (Bone)' },
  { value: 'renal', label: 'مسح الكلى (Renal)' },
  { value: 'gastric', label: 'تفريغ المعدة (Gastric)' },
  { value: 'meckel', label: "Meckel's" },
];

const ISOTOPE_OPTIONS = ['Tc-99m', 'I-123', 'I-131'];
const RENAL_OPTIONS = ['DTPA', 'DMSA', 'MAG3'];

// المحطة الثانية: physician assessment. Chooses the scan sheet, records the
// clinical data + diagram, then routes the patient to the nurse (Assessed).
const PhysicianAssessment = ({ visit, onDone, onNavigateClinic }) => {
  const patient = visit.patient || {};
  const patientId = visit.patientId || patient.id;

  const [path, setPath] = useState('scan'); // 'scan' | 'thyroid_cancer' | 'thyroid_disease'
  const [scanType, setScanType] = useState('');
  const [form, setForm] = useState({ isotopeType: 'Tc-99m', scanType: 'DTPA' });
  const [diagramData, setDiagramData] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleDiagramChange = (field, value) => {
    setDiagramData((prev) => ({ ...(prev || {}), [field]: value }));
    // Mirror scalar uptake/size fields onto the form so they persist as columns.
    if (['rightLobeUptake', 'leftLobeUptake', 'totalUptake', 'rightLobeSize', 'leftLobeSize', 'isthmusSize', 'diffuseUptake', 'heterogenousUptake'].includes(field)) {
      setForm((f) => ({ ...f, [field]: value }));
    }
  };

  const handleConfirm = async () => {
    setError('');

    if (path !== 'scan') {
      setSubmitting(true);
      try {
        await advanceWorkflow('visit', visit.id, { workflowStatus: 'Assessed' });
        onNavigateClinic?.(path === 'thyroid_cancer' ? 'thyroid-cancer' : 'thyroid-disease', patient);
        onDone?.();
      } catch (err) {
        setError(err.message || 'فشل في فتح ملف العيادة');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!scanType) {
      setError('اختر نوع الفحص أولاً');
      return;
    }

    setSubmitting(true);
    try {
      const base = {
        patientId,
        visitId: visit.id,
        workflowStatus: 'Assessed',
        // Copy nurse prep data from visit so technician can see it on the scan record.
        prepWeight: visit.weight ?? undefined,
        prepHeight: visit.height ?? undefined,
        prepBloodGlucose: visit.bloodGlucose ?? undefined,
        injectionSite: visit.injectionSite ?? undefined,
        pregnancyStatus: visit.pregnancyStatus ?? undefined,
      };
      if (scanType === 'thyroid') base.isotopeType = form.isotopeType || 'Tc-99m';
      if (scanType === 'renal') base.scanType = form.scanType || 'DTPA';
      if (scanType === 'thyroid' && diagramData) {
        base.diagramData = JSON.stringify(diagramData);
      }

      const payload = buildScanPayload(scanType, form, base);
      await createScan(scanType, payload);
      await advanceWorkflow('visit', visit.id, { workflowStatus: 'Assessed' });
      onDone?.();
    } catch (err) {
      setError(err.message || 'فشل في حفظ التقييم');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="physician-assessment" dir="rtl">
      <div className="assessment-path">
        <label>المسار</label>
        <div className="path-buttons">
          <button type="button" className={path === 'scan' ? 'active' : ''} onClick={() => setPath('scan')}>فحص ذري</button>
          <button type="button" className={path === 'thyroid_cancer' ? 'active' : ''} onClick={() => setPath('thyroid_cancer')}>عيادة — سرطان الغدة</button>
          <button type="button" className={path === 'thyroid_disease' ? 'active' : ''} onClick={() => setPath('thyroid_disease')}>عيادة — أمراض الغدة</button>
        </div>
      </div>

      {path === 'scan' && (
        <>
          <div className="form-group">
            <label>نوع الفحص (شيت المسح)</label>
            <select value={scanType} onChange={(e) => setScanType(e.target.value)} className="scan-sheet-select">
              <option value="">اختر نوع الفحص...</option>
              {SCAN_SHEETS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          {scanType && (
            <>
              {scanType === 'thyroid' && (
                <div className="form-group">
                  <label>النظير المشع</label>
                  <select value={form.isotopeType} onChange={(e) => setForm({ ...form, isotopeType: e.target.value })}>
                    {ISOTOPE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              )}
              {scanType === 'renal' && (
                <div className="form-group">
                  <label>نوع مسح الكلى</label>
                  <select value={form.scanType} onChange={(e) => setForm({ ...form, scanType: e.target.value })}>
                    {RENAL_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              )}

              <PreviousScanBanner patientId={patientId} scanType={scanType} currentScanData={form} />
              {scanType === 'thyroid' && <ThyroidContrastAlert contrastCTDate={form.contrastCTDate} />}
              {scanType === 'thyroid' && <MedicationAlert medications={form.currentMedications} scanType={scanType} />}

              <ScanClinicalSections role="doctor" scanType={scanType} formData={form} onChange={setForm} />

              {scanType === 'thyroid' && (
                <div className="assessment-diagram">
                  <h4>رسم الغدة الدرقية (للتعليم)</h4>
                  <ThyroidDiagram diagramData={diagramData} onChange={handleDiagramChange} editable width={360} />
                </div>
              )}
            </>
          )}
        </>
      )}

      {error && <div className="error-banner">{error}</div>}

      <button type="button" className="btn-assess" onClick={handleConfirm} disabled={submitting}>
        {path === 'scan' ? <CheckCircle size={18} /> : <Stethoscope size={18} />}
        {submitting ? 'جاري الحفظ...' : (path === 'scan' ? 'تأكيد التقييم وإرسال للفني' : 'فتح ملف العيادة')}
      </button>
    </div>
  );
};

export default PhysicianAssessment;
