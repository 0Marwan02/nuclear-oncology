import React, { useState, useEffect } from 'react';
import { Search, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { createScan, getScanHistory, apiFetch } from '../utils/api';
import ScanFormExtras from '../components/ScanFormExtras';
import { buildScanPayload } from '../utils/scanPayload';
import './ScanGastric.css';

const ScanMeckel = () => {
  const [patients, setPatients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [formData, setFormData] = useState({
    complaint: '',
    diagnosis: '',
    bleedingHistory: '',
    tc99mDose: '',
    injectionTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    scanTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    ectopicUptake: false,
    uptakeLocation: '',
    impression: '',
    physicianNotes: '',
    files: [],
  });
  const [history, setHistory] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (searchQuery.length >= 2) {
      apiFetch(`/patients?q=${encodeURIComponent(searchQuery)}`)
        .then((d) => setPatients(Array.isArray(d) ? d : []))
        .catch(() => setPatients([]));
    } else setPatients([]);
  }, [searchQuery]);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    setFormData((prev) => ({ ...prev, files: [...(prev.files || []), ...files] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPatient) return;
    setSubmitting(true);
    setError('');
    try {
      const payload = buildScanPayload('meckel', formData, {
        patientId: selectedPatient.id,
        ectopicUptake: formData.ectopicUptake,
        uptakeLocation: formData.uptakeLocation,
        impression: formData.impression,
        physicianNotes: formData.physicianNotes,
        workflowStatus: 'Registered',
      });
      await createScan('meckel', payload);
      setSuccess('تم حفظ فحص Meckel بنجاح');
      fetchHistory();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const fetchHistory = async () => {
    if (!selectedPatient?.id) return;
    try {
      const data = await getScanHistory('meckel', selectedPatient.id);
      setHistory(Array.isArray(data) ? data : []);
    } catch {
      setHistory([]);
    }
  };

  return (
    <div className="scan-page" dir="rtl">
      <h2>فحص Meckel&apos;s</h2>

      <input
        className="patient-search-input"
        placeholder="بحث بالاسم أو الرقم القومي..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      {patients.length > 0 && !selectedPatient && (
        <ul className="patient-dropdown">
          {patients.map((p) => (
            <li key={p.id} onClick={() => { setSelectedPatient(p); setSearchQuery(p.name); setPatients([]); fetchHistory(); }}>
              {p.name} — {p.nationalId}
            </li>
          ))}
        </ul>
      )}

      {error && <div className="notification notification-error"><AlertCircle size={18} />{error}</div>}
      {success && <div className="notification notification-success"><CheckCircle size={18} />{success}</div>}

      {selectedPatient && (
        <>
          <ScanFormExtras
            patientId={selectedPatient.id}
            scanType="meckel"
            formData={formData}
            setFormData={setFormData}
            files={formData.files}
            onFileChange={handleFileChange}
          />
          <form onSubmit={handleSubmit} className="clinic-form">
            <div className="form-group">
              <label>
                <input type="checkbox" checked={formData.ectopicUptake} onChange={(e) => setFormData({ ...formData, ectopicUptake: e.target.checked })} />
                امتصاص خارج المعدة
              </label>
            </div>
            {formData.ectopicUptake && (
              <div className="form-group">
                <label>موقع الامتصاص</label>
                <input value={formData.uptakeLocation} onChange={(e) => setFormData({ ...formData, uptakeLocation: e.target.value })} />
              </div>
            )}
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? <Loader2 className="spin" /> : 'حفظ الفحص'}
            </button>
          </form>
          {history.length > 0 && (
            <p className="text-muted">سجلات سابقة: {history.length}</p>
          )}
        </>
      )}
    </div>
  );
};

export default ScanMeckel;
