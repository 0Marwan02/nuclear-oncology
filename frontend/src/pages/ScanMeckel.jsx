import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, FileText, Microscope, Loader2, CheckCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { createScan, getScanHistory, apiFetch } from '../utils/api';
import { useScanRole, useAdminWorkflow, DoctorActionFooter, AdminDoneFooter, AdminReportFooter, RoleCreateNotice } from '../utils/scanSheet';
import { usePrevHint } from '../components/PrevField';
import './ScanThyroid.css';

const MCi_TO_MBq = 37;
const getToday = () => new Date().toISOString().split('T')[0];

const emptyForm = () => ({
  // Doctor
  complaint: '',
  diagnosis: '',
  bleedingHistory: '',
  contraceptiveStatus: '',
  lmpDate: '',
  surgeryHistory: '',
  surgeryDate: '',
  endoscopyYn: false,
  endoscopyDate: '',
  enemaHistory: false,
  bariumHistory: false,
  // Previous investigations
  abdominalUsDate: '',
  ctMriDate: '',
  ctMriSite: '',
  // Nurse
  prepWeight: '',
  prepHeight: '',
  injectionSide: 'RT',
  injectionLimb: 'hand',
  prepNurseNotes: '',
  // Tech
  tc99mDoseMCi: '',
  injectionTime: '',
  scanTime: '',
  delayedImages: false,
  delayedImagesNotes: '',
  // Results
  ectopicUptake: false,
  uptakeLocation: '',
  impression: '',
  physicianNotes: '',
});

const ScanMeckel = () => {
  const TODAY = getToday(); // fresh per render so the max-date never goes stale overnight
  const [searchParams] = useSearchParams();
  const { isAdmin, canCreate } = useScanRole();
  const admin = useAdminWorkflow('meckel');
  const [patients, setPatients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const Prev = usePrevHint('meckel', selectedPatient?.id); // per-field previous-visit hints

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
      getScanHistory('meckel', selectedPatient.id)
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
    admin.reset(p.id);
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
        complaint: formData.complaint || null,
        diagnosis: formData.diagnosis || null,
        bleedingHistory: formData.bleedingHistory || null,
        contraceptiveStatus: formData.contraceptiveStatus || null,
        lmpDate: formData.lmpDate || null,
        surgeryHistory: formData.surgeryHistory || null,
        surgeryDate: formData.surgeryDate || null,
        endoscopyYn: formData.endoscopyYn,
        endoscopyDate: formData.endoscopyDate || null,
        enemaHistory: formData.enemaHistory,
        bariumHistory: formData.bariumHistory,
        abdominalUsDate: formData.abdominalUsDate || null,
        ctMriDate: formData.ctMriDate || null,
        ctMriFindings: formData.ctMriSite || null,
        prepWeight: formData.prepWeight ? parseFloat(formData.prepWeight) : null,
        prepHeight: formData.prepHeight ? parseFloat(formData.prepHeight) : null,
        injectionSite,
        prepNurseNotes: formData.prepNurseNotes || null,
        tc99mDoseMCi: parseFloat(formData.tc99mDoseMCi),
        injectionTime: formData.injectionTime || null,
        scanTime: formData.scanTime || null,
        delayedImages: formData.delayedImages,
        delayedImagesNotes: formData.delayedImagesNotes || null,
        ectopicUptake: formData.ectopicUptake,
        uptakeLocation: formData.uptakeLocation || null,
        impression: formData.impression || null,
        physicianNotes: formData.physicianNotes || null,
        workflowStatus: 'Pending_Nurse',
      };

      const result = await createScan('meckel', payload);
      if (isAdmin) {
        admin.onCreated(result.id);
        setSuccess('Record created. Use the section buttons below to advance each stage.');
      } else {
        setSuccess('Meckel\'s scan record created — sent to nurse.');
        setFormData(emptyForm());
        setSelectedPatient(null);
      }
      setHistoryLoading(true);
      getScanHistory('meckel', selectedPatient.id)
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
        <div className="scan-header-icon" style={{ background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)' }}>
          <Microscope size={28} />
        </div>
        <div>
          <h1>Meckel's Scan</h1>
          <p className="scan-subtitle">Tc-99m Pertechnetate — Dynamic / Static</p>
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

            <div className="form-group">
              <label>Indication / Complaint</label>
              <><textarea rows={2} value={formData.complaint} onChange={(e) => set('complaint', e.target.value)} placeholder="Abdominal pain, vomiting, nausea, bleeding..." /><Prev k="complaint" /></>
            </div>
            <div className="form-group">
              <label>Diagnosis</label>
              <><input type="text" value={formData.diagnosis} onChange={(e) => set('diagnosis', e.target.value)} placeholder="e.g., Meckel's diverticulum, lower GI bleed..." /><Prev k="diagnosis" /></>
            </div>
            <div className="form-group">
              <label>Bleeding History</label>
              <><textarea rows={2} value={formData.bleedingHistory} onChange={(e) => set('bleedingHistory', e.target.value)} placeholder="Describe bleeding history..." /><Prev k="bleedingHistory" /></>
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
                      <><input type="date" max={TODAY} value={formData.lmpDate} onChange={(e) => set('lmpDate', e.target.value)} /><Prev k="lmpDate" /></>
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
                  <><input type="text" value={formData.surgeryHistory} onChange={(e) => set('surgeryHistory', e.target.value)} placeholder="Describe..." /><Prev k="surgeryHistory" /></>
                </div>
                <div className="form-group">
                  <label>Date</label>
                  <><input type="date" max={TODAY} value={formData.surgeryDate} onChange={(e) => set('surgeryDate', e.target.value)} /><Prev k="surgeryDate" /></>
                </div>
              </div>
            </div>

            {/* Endoscopy / Enema / Barium */}
            <div className="sheet-subsection">
              <div className="subsection-title">GI History</div>
              <div className="sheet-row" style={{ alignItems: 'center' }}>
                <span style={{ fontWeight: 600, minWidth: 200 }}>History of Endoscopic Intervention</span>
                <div className="radio-group">
                  <button type="button" className={`radio-chip${!formData.endoscopyYn ? ' active' : ''}`} onClick={() => set('endoscopyYn', false)}>No</button>
                  <button type="button" className={`radio-chip${formData.endoscopyYn ? ' active' : ''}`} onClick={() => set('endoscopyYn', true)}>Yes</button>
                </div>
                {formData.endoscopyYn && (
                  <div className="form-group"><label>Date</label><input type="date" max={TODAY} value={formData.endoscopyDate} onChange={(e) => set('endoscopyDate', e.target.value)} /></div>
                )}
              </div>
              <div className="sheet-row" style={{ gap: 32, marginTop: 8 }}>
                <label className="checkbox-label">
                  <><input type="checkbox" checked={formData.enemaHistory} onChange={(e) => set('enemaHistory', e.target.checked)} /><Prev k="enemaHistory" /></>
                  <span>History of Enema</span>
                </label>
                <label className="checkbox-label">
                  <><input type="checkbox" checked={formData.bariumHistory} onChange={(e) => set('bariumHistory', e.target.checked)} /><Prev k="bariumHistory" /></>
                  <span>History of Barium Study</span>
                </label>
              </div>
            </div>

            {/* Previous investigations */}
            <div className="sheet-subsection">
              <div className="subsection-title">Previous Investigations</div>
              <div className="sheet-row">
                <div className="form-group"><label>Abdominal US Date</label><input type="date" max={TODAY} value={formData.abdominalUsDate} onChange={(e) => set('abdominalUsDate', e.target.value)} /></div>
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
              <div className="form-group"><label>Weight <span className="unit">kg</span></label><input type="number" step="any" value={formData.prepWeight} onChange={(e) => set('prepWeight', e.target.value)} /></div>
              <div className="form-group"><label>Height <span className="unit">cm</span></label><input type="number" step="any" value={formData.prepHeight} onChange={(e) => set('prepHeight', e.target.value)} /></div>
            </div>
            <div className="form-group"><label>Nurse Notes</label><textarea rows={2} value={formData.prepNurseNotes} onChange={(e) => set('prepNurseNotes', e.target.value)} /></div>
          </div>

          <AdminDoneFooter stage="nurse" label="Nurse" done={admin.progress.nurse} disabled={!admin.progress.doctor} advancing={admin.advancing} onClick={() => admin.advance('Pending_Technical', 'nurse')} />

          {/* ── TECHNICIAN SECTION ── */}
          <div className="sheet-section tech-section">
            <div className="section-role-badge tech-badge">Technician</div>

            <div className="dose-input-row">
              <div className="form-group">
                <label>Injected Dose <span className="required-star">*</span></label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <><input type="number" step="any" value={formData.tc99mDoseMCi} onChange={(e) => set('tc99mDoseMCi', e.target.value)} placeholder="10" style={{ width: 100 }} /><Prev k="tc99mDoseMCi" /></>
                  <span className="dose-unit">mCi</span>
                  {mbq && <span className="dose-mbq">= {mbq} MBq</span>}
                </div>
              </div>
            </div>

            <div className="form-group">
              <label>Site of Injection</label>
              <div className="injection-site-picker">
                <div className="site-group">
                  {['RT', 'LT'].map((s) => (<button key={s} type="button" className={`site-chip${formData.injectionSide === s ? ' active' : ''}`} onClick={() => set('injectionSide', s)}>{s}</button>))}
                </div>
                <div className="site-group">
                  {['hand', 'foot', 'forearm'].map((l) => (<button key={l} type="button" className={`site-chip${formData.injectionLimb === l ? ' active' : ''}`} onClick={() => set('injectionLimb', l)}>{l}</button>))}
                </div>
              </div>
            </div>

            <div className="sheet-row">
              <div className="form-group"><label>Time of Injection</label><input type="datetime-local" value={formData.injectionTime} onChange={(e) => set('injectionTime', e.target.value)} /></div>
              <div className="form-group"><label>Time of Acquisition</label><input type="datetime-local" value={formData.scanTime} onChange={(e) => set('scanTime', e.target.value)} /></div>
            </div>

            <div className="sheet-subsection">
              <label className="checkbox-label">
                <><input type="checkbox" checked={formData.delayedImages} onChange={(e) => set('delayedImages', e.target.checked)} /><Prev k="delayedImages" /></>
                <span>More Acquisition / Delayed Images</span>
              </label>
              {formData.delayedImages && (
                <><textarea rows={2} className="mt-8" value={formData.delayedImagesNotes} onChange={(e) => set('delayedImagesNotes', e.target.value)} placeholder="Describe..." /><Prev k="delayedImagesNotes" /></>
              )}
            </div>
          </div>

          <AdminDoneFooter stage="tech" label="Technical" done={admin.progress.tech} disabled={!admin.progress.nurse} advancing={admin.advancing} onClick={() => admin.advance('Pending_Report', 'tech')} />

          {/* ── RESULTS SECTION ── */}
          <div className="sheet-section results-section">
            <div className="section-role-badge results-badge">Results</div>

            <label className="checkbox-label" style={{ marginBottom: 12 }}>
              <><input type="checkbox" checked={formData.ectopicUptake} onChange={(e) => set('ectopicUptake', e.target.checked)} /><Prev k="ectopicUptake" /></>
              <span>Ectopic Uptake</span>
            </label>

            {formData.ectopicUptake && (
              <div className="form-group">
                <label>Uptake Location</label>
                <><input type="text" value={formData.uptakeLocation} onChange={(e) => set('uptakeLocation', e.target.value)} placeholder="e.g., RIF / mid-abdomen..." /><Prev k="uptakeLocation" /></>
              </div>
            )}

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
          <h3><FileText size={18} />Meckel Scan History ({history.length})</h3>
          {historyLoading ? (
            <div className="loading-state"><Loader2 size={24} className="spin" />Loading...</div>
          ) : history.length === 0 ? (
            <div className="empty-state">No previous Meckel scans recorded.</div>
          ) : (
            <div className="history-table-wrapper">
              <table className="history-table">
                <thead><tr><th>Date</th><th>Dose (mCi)</th><th>Ectopic Uptake</th><th>Impression</th><th></th></tr></thead>
                <tbody>
                  {history.map((entry) => (
                    <React.Fragment key={entry.id}>
                      <tr>
                        <td>{entry.createdAt ? format(new Date(entry.createdAt), 'dd MMM yyyy') : '—'}</td>
                        <td>{entry.tc99mDoseMCi ?? '—'}</td>
                        <td>{entry.ectopicUptake ? <span className="status-badge status-cancelled">Yes — {entry.uptakeLocation || '?'}</span> : <span className="status-badge status-completed">No</span>}</td>
                        <td className="impression-cell">{entry.impression ? entry.impression.slice(0, 60) + (entry.impression.length > 60 ? '…' : '') : '—'}</td>
                        <td><button className="btn-icon" onClick={() => setExpandedRow(expandedRow === entry.id ? null : entry.id)}>{expandedRow === entry.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button></td>
                      </tr>
                      {expandedRow === entry.id && (
                        <tr className="detail-row"><td colSpan={5}>
                          <div className="detail-content">
                            {entry.bleedingHistory && <div className="detail-text"><strong>Bleeding History:</strong><p>{entry.bleedingHistory}</p></div>}
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

export default ScanMeckel;
