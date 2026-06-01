import { useState } from 'react';
import { openEncounter } from '../utils/api';
import './ReceptionEncounterWizard.css';

// Reception does NOT pick the scan sheet or enter a diagnosis (no diagnosis
// access per spec). It opens an encounter and routes the patient to the
// physician, who chooses the scan sheet during assessment.
const SERVICE_OPTIONS = [
  { value: 'scan', label: 'فحص ذري — إحالة للطبيب' },
  { value: 'clinic_green', label: 'عيادة — ملف أخضر (أورام غدة)' },
  { value: 'clinic_red', label: 'عيادة — ملف أحمر (أمراض غدة)' },
];

const ReceptionEncounterWizard = ({ patient, onClose, onDone }) => {
  const [encounterType, setEncounterType] = useState('scan');
  const [referralReason, setReferralReason] = useState('');
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
        referralReason: referralReason || undefined,
      });
      onDone(result);
    } catch (err) {
      setError(err.message || 'فشل فتح الملف');
    } finally {
      setLoading(false);
    }
  };

  const isScan = encounterType === 'scan';

  return (
    <div className="encounter-wizard-overlay" dir="rtl">
      <div className="encounter-wizard-card">
        <h3>فتح زيارة جديدة — {patient.name}</h3>
        <p className="text-muted">الرقم القومي: {patient.nationalId}</p>
        {error && <p className="error-banner">{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>نوع الخدمة</label>
            <select value={encounterType} onChange={(e) => setEncounterType(e.target.value)}>
              {SERVICE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>سبب الزيارة / الشكوى (اختياري)</label>
            <input value={referralReason} onChange={(e) => setReferralReason(e.target.value)} placeholder="يحدد الطبيب نوع الفحص والتشخيص" />
          </div>
          <div className="wizard-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>إلغاء</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'جاري الإرسال...' : (isScan ? 'إرسال للطبيب' : 'فتح ملف العيادة')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReceptionEncounterWizard;
