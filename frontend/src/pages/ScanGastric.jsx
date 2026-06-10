import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, FileText, UtensilsCrossed, Loader2, CheckCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { createScan, getScanHistory, apiFetch } from '../utils/api';
import { useScanRole, useAdminWorkflow, DoctorActionFooter, AdminDoneFooter, AdminReportFooter, RoleCreateNotice } from '../utils/scanSheet';
import './ScanThyroid.css';

const MCi_TO_MBq = 37;
const TODAY = new Date().toISOString().split('T')[0];

const emptyForm = () => ({
  // Doctor
  diagnosis: '',
  complaint: '',
  contraceptiveStatus: '',
  lmpDate: '',
  surgeryHistory: '',
  surgeryDate: '',
  endoscopyDate: '',
  dmHistory: false,
  drugOpiates: false,
  drugNicotine: false,
  drugAntidepressant: false,
  // Labs
  labDate: '',
  labCa: '',
  labK: '',
  labTsh: '',
  labFt3: '',
  labFt4: '',
  // Previous investigations
  abdominalUsDate: '',
  ctMriDate: '',
  ctMriSite: '',
  // Nurse
  prepWeight: '',
  prepHeight: '',
  prepBloodGlucose: '',
  injectionSide: 'RT',
  injectionLimb: 'hand',
  prepNurseNotes: '',
  // Tech
  mealType: 'Solid',
  tc99mDoseMCi: '',
  ingestionTime: '',
  scanStartTime: '',
  scanDuration: '',
  imageInterval: '',
  delayedImages: false,
  delayedImagesNotes: '',
  // Results
  halfEmptyingTime: '',
  retention1h: '',
  retention2h: '',
  retention4h: '',
  delayedEmptying: false,
  rapidEmptying: false,
  refluxSign: false,
  aspirationSign: false,
  impression: '',
  physicianNotes: '',
});

const ScanGastric = () => {
  const [searchParams] = useSearchParams();
  const { isAdmin, canCreate } = useScanRole();
  const admin = useAdminWorkflow('gastric');
  const [patients, setPatients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);

  useEffect(() => {
    const pid = searchParams.get('patientId');
    if (pid) apiFetch(`/patients/${pid}`).then(p => { setSelectedPatient(p); setSearchQuery(p.name); }).catch(() => {});
  }, []);
  const [formData, setFormData] = useState(emptyForm());
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedRow, setExpandedRow] = useState(null);

  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      apiFetch(`/patients?q=${encodeURIComponent(searchQuery)}`)
        .then((d) => setPatients(Array.isArray(d) ? d : []))
        .catch(() => setPatients([]));
    } else setPatients([]);
  }, [searchQuery]);

  useEffect(() => {
    if (selectedPatient) {
      setHistoryLoading(true);
      getScanHistory('gastric', selectedPatient.id)
        .then((d) => setHistory(Array.isArray(d) ? d : []))
        .catch(() => setHistory([]))
        .finally(() => setHistoryLoading(false));
    }
  }, [selectedPatient]);

  const set = (field, value) => setFormData((p) => ({ ...p, [field]: value }));

  const selectPatient = (p) => {
    setSelectedPatient(p);
    setSearchQuery(p.name);
    setShowDropdown(false);
    setFormData(emptyForm());
    setError('');
    setSuccess('');
    admin.reset();
  };

  const isFemale = selectedPatient?.gender?.toLowerCase() === 'female';
  const mbq = formData.tc99mDoseMCi ? (parseFloat(formData.tc99mDoseMCi) * MCi_TO_MBq).toFixed(0) : '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isAdmin && admin.progress.doctor) return;
    setError('');
    setSuccess('');
    if (!selectedPatient) { setError('Please select a patient first'); return; }

    setSubmitting(true);
    try {
      const injectionSite = `${formData.injectionSide} ${formData.injectionLimb}`;
      const payload = {
        patientId: selectedPatient.id,
        diagnosis: formData.diagnosis || null,
        complaint: formData.complaint || null,
        contraceptiveStatus: formData.contraceptiveStatus || null,
        lmpDate: formData.lmpDate || null,
        surgeryHistory: formData.surgeryHistory || null,
        surgeryDate: formData.surgeryDate || null,
        endoscopyDate: formData.endoscopyDate || null,
        dmHistory: formData.dmHistory,
        drugOpiates: formData.drugOpiates,
        drugNicotine: formData.drugNicotine,
        drugAntidepressant: formData.drugAntidepressant,
        labDate: formData.labDate || null,
        labCa: formData.labCa ? parseFloat(formData.labCa) : null,
        labK: formData.labK ? parseFloat(formData.labK) : null,
        labTsh: formData.labTsh ? parseFloat(formData.labTsh) : null,
        labFt3: formData.labFt3 ? parseFloat(formData.labFt3) : null,
        labFt4: formData.labFt4 ? parseFloat(formData.labFt4) : null,
        abdominalUsDate: formData.abdominalUsDate || null,
        ctMriDate: formData.ctMriDate || null,
        ctMriFindings: formData.ctMriSite || null,
        prepWeight: formData.prepWeight ? parseFloat(formData.prepWeight) : null,
        prepHeight: formData.prepHeight ? parseFloat(formData.prepHeight) : null,
        prepBloodGlucose: formData.prepBloodGlucose ? parseFloat(formData.prepBloodGlucose) : null,
        injectionSite,
        prepNurseNotes: formData.prepNurseNotes || null,
        mealType: formData.mealType,
        tc99mDoseMCi: parseFloat(formData.tc99mDoseMCi),
        ingestionTime: formData.ingestionTime || null,
        scanStartTime: formData.scanStartTime || null,
        scanDuration: formData.scanDuration ? parseInt(formData.scanDuration) : null,
        imageInterval: formData.imageInterval ? parseInt(formData.imageInterval) : null,
        delayedImages: formData.delayedImages,
        delayedImagesNotes: formData.delayedImagesNotes || null,
        halfEmptyingTime: formData.halfEmptyingTime ? parseFloat(formData.halfEmptyingTime) : null,
        retention1h: formData.retention1h ? parseFloat(formData.retention1h) : null,
        retention2h: formData.retention2h ? parseFloat(formData.retention2h) : null,
        retention4h: formData.retention4h ? parseFloat(formData.retention4h) : null,
        delayedEmptying: formData.delayedEmptying,
        rapidEmptying: formData.rapidEmptying,
        refluxSign: formData.refluxSign,
        aspirationSign: formData.aspirationSign,
        impression: formData.impression || null,
        physicianNotes: formData.physicianNotes || null,
        workflowStatus: 'Pending_Nurse',
      };

      const result = await createScan('gastric', payload);
      if (isAdmin) {
        admin.onCreated(result.id);
        setSuccess('Record created. Use the section buttons below to advance each stage.');
      } else {
        setSuccess('Gastric scintigraphy record created — sent to nurse.');
        setFormData(emptyForm());
      }
      setHistoryLoading(true);
      getScanHistory('gastric', selectedPatient.id)
        .then((d) => setHistory(Array.isArray(d) ? d : []))
        .finally(() => setHistoryLoading(false));
    } catch (err) {
      setError(err.message || 'Failed to save record');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="scan-page">
      <div className="scan-header">
        <div className="scan-header-icon" style={{ background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' }}>
          <UtensilsCrossed size={28} />
        </div>
        <div>
          <h1>Gastric Emptying Scintigraphy</h1>
          <p className="scan-subtitle">Tc-99m DTPA — Dynamic / Static</p>
        </div>
      </div>

      {/* Patient selector */}
      <div className="patient-selector-section">
        <h2><Search size={18} />Select Patient</h2>
        <div className="search-wrapper" ref={dropdownRef}>
          <div className="patient-search-input">
            <Search size={18} className="search-icon-input" />
            <input type="text" placeholder="Search by name or national ID..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setShowDropdown(true); if (selectedPatient && e.target.value !== selectedPatient.name) setSelectedPatient(null); }}
              onFocus={() => setShowDropdown(true)} />
            {selectedPatient && <button className="clear-search" onClick={() => { setSelectedPatient(null); setSearchQuery(''); setHistory([]); }}>✕</button>}
          </div>
          {showDropdown && patients.length > 0 && !selectedPatient && (
            <div className="patient-dropdown">
              {patients.map((p) => (
                <button key={p.id} className="dropdown-item" onClick={() => selectPatient(p)}>
                  <div className="dropdown-avatar">{(p.name || '?').charAt(0).toUpperCase()}</div>
                  <div className="dropdown-info">
                    <span className="dropdown-name">{p.name}</span>
                    <span className="dropdown-id">ID: {p.nationalId}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        {selectedPatient && (
          <div className="selected-patient-card fade-in">
            <div className="patient-card-avatar">{selectedPatient.name?.charAt(0).toUpperCase()}</div>
            <div className="patient-card-info">
              <h3>{selectedPatient.name}</h3>
              <div className="patient-card-tags">
                <span className="tag tag-blue">ID: {selectedPatient.nationalId}</span>
                {selectedPatient.gender && <span className="tag tag-gray">{selectedPatient.gender}</span>}
                {selectedPatient.birthDate && <span className="tag tag-gray">DOB: {format(new Date(selectedPatient.birthDate), 'dd/MM/yyyy')}</span>}
              </div>
            </div>
          </div>
        )}
      </div>

      {error && <div className="notification notification-error fade-in"><AlertCircle size={18} /><span>{error}</span></div>}
      {success && <div className="notification notification-success fade-in"><CheckCircle size={18} /><span>{success}</span></div>}

      {selectedPatient && !canCreate && <RoleCreateNotice />}

      {selectedPatient && canCreate && (
        <form className="scan-sheet-form" onSubmit={handleSubmit}>

          {/* ── DOCTOR SECTION ── */}
          <div className="sheet-section doctor-section">
            <div className="section-role-badge doctor-badge">Doctor</div>

            <div className="sheet-row">
              <div className="form-group flex-2">
                <label>Indication / Complaint</label>
                <textarea rows={2} value={formData.complaint} onChange={(e) => set('complaint', e.target.value)} placeholder="Abdominal pain, vomiting, nausea, bloating..." />
              </div>
            </div>

            <div className="form-group">
              <label>Diagnosis</label>
              <input type="text" value={formData.diagnosis} onChange={(e) => set('diagnosis', e.target.value)} placeholder="e.g., Gastroparesis, gastric emptying delay..." />
            </div>

            {/* Contraception */}
            {isFemale && (
              <div className="sheet-subsection">
                <div className="subsection-title">Contraceptive History</div>
                <div className="sheet-row">
                  <div className="radio-group">
                    {['single', 'postmenopausal', 'married'].map((s) => (
                      <button key={s} type="button"
                        className={`radio-chip${formData.contraceptiveStatus === s ? ' active' : ''}`}
                        onClick={() => set('contraceptiveStatus', s)}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                  {formData.contraceptiveStatus === 'married' && (
                    <div className="form-group">
                      <label>Date of LMP</label>
                      <input type="date" max={TODAY} value={formData.lmpDate} onChange={(e) => set('lmpDate', e.target.value)} />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Surgery */}
            <div className="sheet-subsection">
              <div className="sheet-row">
                <div className="form-group flex-2">
                  <label>Previous Surgery</label>
                  <input type="text" value={formData.surgeryHistory} onChange={(e) => set('surgeryHistory', e.target.value)} placeholder="e.g., Vagotomy, gastrectomy..." />
                </div>
                <div className="form-group">
                  <label>Date</label>
                  <input type="date" max={TODAY} value={formData.surgeryDate} onChange={(e) => set('surgeryDate', e.target.value)} />
                </div>
              </div>
            </div>

            {/* Endoscopy */}
            <div className="sheet-subsection">
              <div className="sheet-row">
                <div className="form-group flex-2">
                  <label>History of Endoscopic Intervention</label>
                  <input type="text" value={formData.endoscopyDate} onChange={(e) => set('endoscopyDate', e.target.value)} placeholder="Date or description..." />
                </div>
              </div>
            </div>

            {/* Chronic diseases + drugs */}
            <div className="sheet-subsection">
              <div className="subsection-title">History of Chronic Disease</div>
              <div className="sheet-row" style={{ alignItems: 'center', gap: 24 }}>
                <label className="checkbox-label">
                  <input type="checkbox" checked={formData.dmHistory} onChange={(e) => set('dmHistory', e.target.checked)} />
                  <span>DM</span>
                </label>
              </div>
              <div className="subsection-title" style={{ marginTop: 14 }}>Drug History</div>
              <div className="sheet-row" style={{ gap: 24 }}>
                <label className="checkbox-label">
                  <input type="checkbox" checked={formData.drugOpiates} onChange={(e) => set('drugOpiates', e.target.checked)} />
                  <span>Opiates</span>
                </label>
                <label className="checkbox-label">
                  <input type="checkbox" checked={formData.drugNicotine} onChange={(e) => set('drugNicotine', e.target.checked)} />
                  <span>Nicotine</span>
                </label>
                <label className="checkbox-label">
                  <input type="checkbox" checked={formData.drugAntidepressant} onChange={(e) => set('drugAntidepressant', e.target.checked)} />
                  <span>Anti-depressant</span>
                </label>
              </div>
            </div>

            {/* Labs */}
            <div className="sheet-subsection">
              <div className="subsection-title">Laboratory Investigation</div>
              <div className="sheet-row">
                <div className="form-group">
                  <label>Date</label>
                  <input type="date" max={TODAY} value={formData.labDate} onChange={(e) => set('labDate', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Ca <span className="unit">mg/dL</span></label>
                  <input type="number" step="any" value={formData.labCa} onChange={(e) => set('labCa', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>K <span className="unit">mEq/L</span></label>
                  <input type="number" step="any" value={formData.labK} onChange={(e) => set('labK', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>TSH <span className="unit">mIU/L</span></label>
                  <input type="number" step="any" value={formData.labTsh} onChange={(e) => set('labTsh', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>FT3</label>
                  <input type="number" step="any" value={formData.labFt3} onChange={(e) => set('labFt3', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>FT4</label>
                  <input type="number" step="any" value={formData.labFt4} onChange={(e) => set('labFt4', e.target.value)} />
                </div>
              </div>
            </div>

            {/* Prev investigations */}
            <div className="sheet-subsection">
              <div className="subsection-title">Previous Investigations</div>
              <div className="sheet-row">
                <div className="form-group"><label>Upper Endoscopy / Abdominal US Date</label><input type="date" max={TODAY} value={formData.abdominalUsDate} onChange={(e) => set('abdominalUsDate', e.target.value)} /></div>
                <div className="form-group"><label>CT / MRI Date</label><input type="date" max={TODAY} value={formData.ctMriDate} onChange={(e) => set('ctMriDate', e.target.value)} /></div>
                <div className="form-group flex-2"><label>CT / MRI Site</label><input type="text" value={formData.ctMriSite} onChange={(e) => set('ctMriSite', e.target.value)} /></div>
              </div>
            </div>
          </div>

          <DoctorActionFooter isAdmin={isAdmin} admin={admin} submitting={submitting} />

          {isAdmin && (<>
          {/* ── NURSE SECTION ── */}
          <div className="sheet-section nurse-section">
            <div className="section-role-badge nurse-badge">Nurse</div>
            <div className="sheet-row">
              <div className="form-group"><label>Weight <span className="unit">kg</span></label><input type="number" step="any" value={formData.prepWeight} onChange={(e) => set('prepWeight', e.target.value)} placeholder="65" /></div>
              <div className="form-group"><label>Height <span className="unit">cm</span></label><input type="number" step="any" value={formData.prepHeight} onChange={(e) => set('prepHeight', e.target.value)} placeholder="170" /></div>
            </div>
            <div className="form-group"><label>Nurse Notes</label><textarea rows={2} value={formData.prepNurseNotes} onChange={(e) => set('prepNurseNotes', e.target.value)} /></div>
          </div>

          <AdminDoneFooter stage="nurse" label="Nurse" done={admin.progress.nurse} disabled={!admin.progress.doctor} advancing={admin.advancing} onClick={() => admin.advance('Pending_Technical', 'nurse')} />

          {/* ── TECHNICIAN SECTION ── */}
          <div className="sheet-section tech-section">
            <div className="section-role-badge tech-badge">Technician</div>

            <div className="form-group">
              <label>Glucose Level / Blood Sugar <span className="unit">mg/dL</span></label>
              <input type="number" step="any" value={formData.prepBloodGlucose} onChange={(e) => set('prepBloodGlucose', e.target.value)} placeholder="90" style={{ width: 120 }} />
            </div>

            <div className="form-group">
              <label>Meal Type</label>
              <div className="radio-group">
                {['Solid', 'Liquid', 'Mixed'].map((t) => (
                  <button key={t} type="button"
                    className={`radio-chip${formData.mealType === t ? ' active' : ''}`}
                    onClick={() => set('mealType', t)}>{t}</button>
                ))}
              </div>
            </div>

            <div className="dose-input-row">
              <div className="form-group">
                <label>Injected Dose <span className="required-star">*</span></label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="number" step="any" value={formData.tc99mDoseMCi} onChange={(e) => set('tc99mDoseMCi', e.target.value)} placeholder="0.5" style={{ width: 100 }} />
                  <span className="dose-unit">mCi</span>
                  {mbq && <span className="dose-mbq">= {mbq} MBq</span>}
                </div>
              </div>
            </div>

            <div className="form-group">
              <label>Injection Site</label>
              <div className="site-chips-row">
                {['RT', 'LT'].map((s) => (
                  <button key={s} type="button" className={`site-chip${formData.injectionSide === s ? ' active' : ''}`} onClick={() => set('injectionSide', s)}>{s}</button>
                ))}
                <span className="site-sep">—</span>
                {['hand', 'foot', 'forearm'].map((l) => (
                  <button key={l} type="button" className={`site-chip${formData.injectionLimb === l ? ' active' : ''}`} onClick={() => set('injectionLimb', l)}>{l}</button>
                ))}
              </div>
            </div>

            <div className="sheet-row">
              <div className="form-group"><label>Ingestion Time</label><input type="datetime-local" value={formData.ingestionTime} onChange={(e) => set('ingestionTime', e.target.value)} /></div>
              <div className="form-group"><label>Scan Start Time</label><input type="datetime-local" value={formData.scanStartTime} onChange={(e) => set('scanStartTime', e.target.value)} /></div>
              <div className="form-group"><label>Scan Duration <span className="unit">min</span></label><input type="number" value={formData.scanDuration} onChange={(e) => set('scanDuration', e.target.value)} style={{ width: 90 }} /></div>
              <div className="form-group"><label>Image Interval <span className="unit">min</span></label><input type="number" value={formData.imageInterval} onChange={(e) => set('imageInterval', e.target.value)} style={{ width: 90 }} /></div>
            </div>

            <div className="sheet-subsection">
              <label className="checkbox-label">
                <input type="checkbox" checked={formData.delayedImages} onChange={(e) => set('delayedImages', e.target.checked)} />
                <span>More Acquisition</span>
              </label>
              {formData.delayedImages && (
                <textarea rows={2} className="mt-8" value={formData.delayedImagesNotes} onChange={(e) => set('delayedImagesNotes', e.target.value)} placeholder="Describe..." />
              )}
            </div>
          </div>

          <AdminDoneFooter stage="tech" label="Technical" done={admin.progress.tech} disabled={!admin.progress.nurse} advancing={admin.advancing} onClick={() => admin.advance('Pending_Report', 'tech')} />

          {/* ── RESULTS SECTION ── */}
          <div className="sheet-section results-section">
            <div className="section-role-badge results-badge">Results</div>

            <div className="renal-results-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
              <div className="form-group">
                <label>T½ Emptying <span className="unit">min</span></label>
                <input type="number" step="any" value={formData.halfEmptyingTime} onChange={(e) => set('halfEmptyingTime', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Retention at 1h <span className="unit">%</span></label>
                <input type="number" step="any" value={formData.retention1h} onChange={(e) => set('retention1h', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Retention at 2h <span className="unit">%</span></label>
                <input type="number" step="any" value={formData.retention2h} onChange={(e) => set('retention2h', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Retention at 4h <span className="unit">%</span></label>
                <input type="number" step="any" value={formData.retention4h} onChange={(e) => set('retention4h', e.target.value)} />
              </div>
            </div>

            <div className="sheet-row" style={{ gap: 24, marginTop: 12 }}>
              {[
                { field: 'delayedEmptying', label: 'Delayed Emptying' },
                { field: 'rapidEmptying', label: 'Rapid Emptying' },
                { field: 'refluxSign', label: 'Reflux Sign' },
                { field: 'aspirationSign', label: 'Aspiration Sign' },
              ].map(({ field, label }) => (
                <label key={field} className="checkbox-label">
                  <input type="checkbox" checked={formData[field]} onChange={(e) => set(field, e.target.checked)} />
                  <span>{label}</span>
                </label>
              ))}
            </div>

            <div className="form-group mt-12"><label>Impression</label><textarea rows={4} value={formData.impression} onChange={(e) => set('impression', e.target.value)} /></div>
            <div className="form-group"><label>Physician Notes</label><textarea rows={2} value={formData.physicianNotes} onChange={(e) => set('physicianNotes', e.target.value)} /></div>

            <AdminReportFooter admin={admin} />
          </div>
          </>)}
        </form>
      )}

      {/* History */}
      {selectedPatient && (
        <div className="history-section">
          <h3><FileText size={18} />Gastric Scintigraphy History ({history.length})</h3>
          {historyLoading ? (
            <div className="loading-state"><Loader2 size={24} className="spin" />Loading...</div>
          ) : history.length === 0 ? (
            <div className="empty-state">No previous gastric scans recorded.</div>
          ) : (
            <div className="history-table-wrapper">
              <table className="history-table">
                <thead><tr><th>Date</th><th>Meal Type</th><th>T½ (min)</th><th>Delayed Empty.</th><th>Impression</th><th></th></tr></thead>
                <tbody>
                  {history.map((entry) => (
                    <React.Fragment key={entry.id}>
                      <tr>
                        <td>{entry.createdAt ? format(new Date(entry.createdAt), 'dd MMM yyyy') : '—'}</td>
                        <td>{entry.mealType || '—'}</td>
                        <td>{entry.halfEmptyingTime ?? '—'}</td>
                        <td>{entry.delayedEmptying ? <span className="status-badge status-cancelled">Yes</span> : <span className="status-badge status-completed">No</span>}</td>
                        <td className="impression-cell">{entry.impression ? entry.impression.slice(0, 60) + (entry.impression.length > 60 ? '…' : '') : '—'}</td>
                        <td><button className="btn-icon" onClick={() => setExpandedRow(expandedRow === entry.id ? null : entry.id)}>{expandedRow === entry.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button></td>
                      </tr>
                      {expandedRow === entry.id && (
                        <tr className="detail-row"><td colSpan={6}>
                          <div className="detail-content">
                            <div className="detail-grid">
                              <div className="detail-item"><span className="detail-label">Retention 1h:</span><span>{entry.retention1h ?? '—'}%</span></div>
                              <div className="detail-item"><span className="detail-label">Retention 2h:</span><span>{entry.retention2h ?? '—'}%</span></div>
                              <div className="detail-item"><span className="detail-label">Retention 4h:</span><span>{entry.retention4h ?? '—'}%</span></div>
                              <div className="detail-item"><span className="detail-label">Rapid Emptying:</span><span>{entry.rapidEmptying ? 'Yes' : 'No'}</span></div>
                              <div className="detail-item"><span className="detail-label">Reflux:</span><span>{entry.refluxSign ? 'Yes' : 'No'}</span></div>
                              <div className="detail-item"><span className="detail-label">Aspiration:</span><span>{entry.aspirationSign ? 'Yes' : 'No'}</span></div>
                            </div>
                            {entry.impression && <div className="detail-text"><strong>Impression:</strong><p>{entry.impression}</p></div>}
                          </div>
                        </td></tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ScanGastric;
