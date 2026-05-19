import { useState } from 'react';
import { openEncounter } from '../utils/api';
import './ReceptionEncounterWizard.css';

const SCAN_OPTIONS = [
  { value: 'petct', label: 'PET/CT' },
  { value: 'psma', label: 'PSMA PET/CT' },
  { value: 'thyroid', label: 'مسح الغدة' },
  { value: 'bone', label: 'مسح العظام' },
  { value: 'renal', label: 'مسح الكلى' },
  { value: 'gastric', label: 'تفريغ المعدة' },
  { value: 'meckel', label: "Meckel's" },
];

const ReceptionEncounterWizard = ({ patient, onClose, onDone }) => {
  const [encounterType, setEncounterType] = useState('scan');
  const [scanSubtype, setScanSubtype] = useState('petct');
  const [referralReason, setReferralReason] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await openEncounter({
        patientId: patient.id,
        encounterType,
        scanSubtype: encounterType === 'scan' ? scanSubtype : undefined,
        referralReason: referralReason || undefined,
        diagnosis: diagnosis || undefined,
      });
      onDone(result);
    } catch (err) {
      setError(err.message || 'فشل فتح الملف');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="encounter-wizard-overlay" dir="rtl">
      <div className="encounter-wizard-card">
        <h3>فتح زيارة / فحص — {patient.name}</h3>
        <p className="text-muted">الرقم القومي: {patient.nationalId}</p>
        {error && <p className="error-banner">{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>نوع الخدمة</label>
            <select value={encounterType} onChange={(e) => setEncounterType(e.target.value)}>
              <option value="scan">فحص إشعاعي</option>
              <option value="clinic_green">عيادة — ملف أخضر (أورام غدة)</option>
              <option value="clinic_red">عيادة — ملف أحمر (أمراض غدة)</option>
            </select>
          </div>
          {encounterType === 'scan' && (
            <div className="form-group">
              <label>نوع الفحص</label>
              <select value={scanSubtype} onChange={(e) => setScanSubtype(e.target.value)}>
                {SCAN_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          )}
          <div className="form-group">
            <label>سبب الإحالة / الشكوى</label>
            <input value={referralReason} onChange={(e) => setReferralReason(e.target.value)} />
          </div>
          <div className="form-group">
            <label>التشخيص المبدئي (للفني)</label>
            <input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
          </div>
          <div className="wizard-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>إلغاء</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'جاري الفتح...' : 'فتح الملف (مسجّل)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReceptionEncounterWizard;
