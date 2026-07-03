import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Search, FileText, Loader2, CheckCircle, AlertCircle, ChevronDown, ChevronUp, LayoutTemplate } from 'lucide-react';
import { format } from 'date-fns';
import {
  apiFetch, getScanTemplate, createDynamicScan, getDynamicScanHistory,
  advanceWorkflow, getPatientWorkflow,
} from '../utils/api';
import { useScanRole, DoctorActionFooter, AdminDoneFooter, AdminReportFooter, RoleCreateNotice } from '../utils/scanSheet';
import { useTranslation } from '../i18n/index';
import './ScanThyroid.css';

const getToday = () => new Date().toISOString().split('T')[0];

const SECTION_META = {
  doctor: { cls: 'doctor-section', badge: 'doctor-badge', label: 'Doctor' },
  nurse: { cls: 'nurse-section', badge: 'nurse-badge', label: 'Nurse' },
  tech: { cls: 'tech-section', badge: 'tech-badge', label: 'Technician' },
  results: { cls: 'results-section', badge: 'results-badge', label: 'Results' },
};

const parseOptions = (f) => {
  try { const a = JSON.parse(f.options); return Array.isArray(a) ? a : []; } catch { return []; }
};
const parseConditional = (f) => {
  try { const c = JSON.parse(f.conditional); return c && c.field ? c : null; } catch { return null; }
};

// Admin local state machine for filling every stage of one dynamic record.
const useDynamicAdminWorkflow = (templateKey) => {
  const [scanId, setScanId] = useState(null);
  const [progress, setProgress] = useState({ doctor: false, nurse: false, tech: false, report: false });
  const [advancing, setAdvancing] = useState(false);
  const [error, setError] = useState('');

  const PROGRESS_AT_STATUS = {
    Pending_Nurse: { doctor: true, nurse: false, tech: false, report: false },
    Pending_Technical: { doctor: true, nurse: true, tech: false, report: false },
    Pending_Report: { doctor: true, nurse: true, tech: true, report: false },
  };

  const reset = async (patientId) => {
    setScanId(null);
    setProgress({ doctor: false, nurse: false, tech: false, report: false });
    setError('');
    if (!patientId || !templateKey) return;
    try {
      const wf = await getPatientWorkflow(patientId);
      const bucket = wf?.scans?.[`t:${templateKey}`] || [];
      const inFlight = bucket.find((s) => s.workflowStatus !== 'Completed');
      if (inFlight && PROGRESS_AT_STATUS[inFlight.workflowStatus]) {
        setScanId(inFlight.id);
        setProgress(PROGRESS_AT_STATUS[inFlight.workflowStatus]);
      }
    } catch { /* best-effort */ }
  };
  const onCreated = (id) => {
    setScanId(id);
    setProgress({ doctor: true, nurse: false, tech: false, report: false });
  };
  // For dynamic records we pass the section fields so the workflow merges them
  // into the JSON data blob (payloads keyed prep/technical/report).
  const advance = async (nextStatus, stage, payload = {}) => {
    if (!scanId || advancing) return;
    setAdvancing(true);
    setError('');
    try {
      await advanceWorkflow('dynamic', scanId, { workflowStatus: nextStatus, ...payload });
      setProgress((p) => ({ ...p, [stage]: true }));
    } catch (e) {
      setError(e.message || 'Failed to advance workflow');
    } finally {
      setAdvancing(false);
    }
  };
  return { scanId, progress, advancing, error, reset, onCreated, advance };
};

const DynamicScanSheet = () => {
  const TODAY = getToday();
  const { templateKey } = useParams();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const { isAdmin, canCreate } = useScanRole();
  const admin = useDynamicAdminWorkflow(templateKey);

  const [template, setTemplate] = useState(null);
  const [tplError, setTplError] = useState('');
  const [patients, setPatients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [formData, setFormData] = useState({});
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedRow, setExpandedRow] = useState(null);
  const dropdownRef = useRef(null);

  // Fetch template by key.
  useEffect(() => {
    setTplError('');
    getScanTemplate(templateKey)
      .then((tpl) => {
        if (!tpl.isActive) setTplError(t('dyn.not_found'));
        setTemplate(tpl);
        // seed defaults
        const seed = {};
        (tpl.fields || []).forEach((f) => {
          seed[f.key] = f.type === 'checkbox' ? false : (f.type === 'multiselect' ? [] : '');
        });
        setFormData(seed);
      })
      .catch(() => setTplError(t('dyn.not_found')));
  }, [templateKey]);

  useEffect(() => {
    const pid = searchParams.get('patientId');
    if (pid) apiFetch(`/patients/${pid}`).then((p) => { setSelectedPatient(p); setSearchQuery(p.name); }).catch(() => {});
  }, []);

  useEffect(() => {
    const onClick = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      apiFetch(`/patients?q=${encodeURIComponent(searchQuery)}`)
        .then((d) => setPatients(Array.isArray(d) ? d : []))
        .catch(() => setPatients([]));
    } else setPatients([]);
  }, [searchQuery]);

  const loadHistory = useCallback((pid) => {
    setHistoryLoading(true);
    getDynamicScanHistory(pid)
      .then((d) => setHistory((Array.isArray(d) ? d : []).filter((r) => r.templateKey === templateKey)))
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false));
  }, [templateKey]);

  useEffect(() => { if (selectedPatient) loadHistory(selectedPatient.id); }, [selectedPatient, loadHistory]);

  const set = (key, value) => setFormData((p) => ({ ...p, [key]: value }));

  const selectPatient = (p) => {
    setSelectedPatient(p);
    setSearchQuery(p.name);
    setShowDropdown(false);
    setError(''); setSuccess('');
    admin.reset(p.id);
  };

  // Field visibility honoring conditional { field, equals }.
  const isVisible = (f) => {
    const cond = parseConditional(f);
    if (!cond) return true;
    const v = formData[cond.field];
    if (Array.isArray(v)) return v.map(String).includes(String(cond.equals));
    return String(v) === String(cond.equals);
  };

  const renderField = (f) => {
    if (!isVisible(f)) return null;
    const val = formData[f.key];
    const labelEl = <label>{f.label}{f.unit ? <span className="unit"> {f.unit}</span> : null}{f.required ? <span className="required-star"> *</span> : null}</label>;

    switch (f.type) {
      case 'textarea':
        return <div className="form-group" key={f.key}>{labelEl}<textarea rows={3} value={val || ''} onChange={(e) => set(f.key, e.target.value)} /></div>;
      case 'number':
        return <div className="form-group" key={f.key}>{labelEl}<input type="number" step="any" value={val ?? ''} onChange={(e) => set(f.key, e.target.value)} /></div>;
      case 'date':
        return <div className="form-group" key={f.key}>{labelEl}<input type="date" max={TODAY} value={val || ''} onChange={(e) => set(f.key, e.target.value)} /></div>;
      case 'datetime':
        return <div className="form-group" key={f.key}>{labelEl}<input type="datetime-local" value={val || ''} onChange={(e) => set(f.key, e.target.value)} /></div>;
      case 'checkbox':
        return <div className="form-group" key={f.key}><label className="checkbox-label"><input type="checkbox" checked={!!val} onChange={(e) => set(f.key, e.target.checked)} /><span>{f.label}</span></label></div>;
      case 'radio':
      case 'select':
        return (
          <div className="form-group" key={f.key}>{labelEl}
            <div className="radio-group">
              {parseOptions(f).map((opt) => (
                <button type="button" key={opt} className={`radio-chip${String(val) === String(opt) ? ' active' : ''}`} onClick={() => set(f.key, opt)}>{opt}</button>
              ))}
            </div>
          </div>
        );
      case 'multiselect':
        return (
          <div className="form-group" key={f.key}>{labelEl}
            <div className="radio-group">
              {parseOptions(f).map((opt) => {
                const arr = Array.isArray(val) ? val : [];
                const on = arr.map(String).includes(String(opt));
                return (
                  <button type="button" key={opt} className={`radio-chip${on ? ' active' : ''}`}
                    onClick={() => set(f.key, on ? arr.filter((x) => String(x) !== String(opt)) : [...arr, opt])}>{opt}</button>
                );
              })}
            </div>
          </div>
        );
      case 'vitalsTable':
        return <VitalsEditor key={f.key} label={f.label} rows={Array.isArray(val) ? val : []} onChange={(rows) => set(f.key, rows)} />;
      case 'text':
      default:
        return <div className="form-group" key={f.key}>{labelEl}<input type="text" value={val || ''} onChange={(e) => set(f.key, e.target.value)} /></div>;
    }
  };

  const fieldsBySection = (sec) => (template?.fields || []).filter((f) => f.section === sec).sort((a, b) => a.order - b.order);

  // Collect data for a given section into a plain object.
  const collectSection = (sec) => {
    const out = {};
    fieldsBySection(sec).forEach((f) => {
      let v = formData[f.key];
      if (f.type === 'multiselect' || f.type === 'vitalsTable') v = JSON.stringify(v || (f.type === 'multiselect' ? [] : []));
      out[f.key] = v;
    });
    return out;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isAdmin && admin.progress.doctor) return;
    setError(''); setSuccess('');
    if (!selectedPatient) { setError(t('dyn.select_patient')); return; }
    setSubmitting(true);
    try {
      // Doctor section data only at create (other sections filled via workflow steps).
      const data = collectSection('doctor');
      const result = await createDynamicScan({
        patientId: selectedPatient.id,
        templateId: template.id,
        data,
        impression: formData.impression || null,
        workflowStatus: 'Pending_Nurse',
      });
      if (isAdmin) {
        admin.onCreated(result.id);
        setSuccess('Record created. Use the section buttons below to advance each stage.');
      } else {
        setSuccess(t('dyn.created'));
        setFormData(emptyForm());
        setSelectedPatient(null);
      }
      loadHistory(selectedPatient.id);
    } catch (err) {
      setError(err.message || 'Failed to save record');
    } finally {
      setSubmitting(false);
    }
  };

  if (tplError) {
    return <div className="scan-page"><div className="notification notification-error fade-in"><AlertCircle size={18} /><span>{tplError}</span></div></div>;
  }
  if (!template) {
    return <div className="dashboard-loading"><Loader2 className="spin" /> {t('common.loading')}</div>;
  }

  const accent = template.color || '#3b82f6';

  return (
    <div className="scan-page">
      <div className="scan-header">
        <div className="scan-header-icon" style={{ background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)` }}>
          <LayoutTemplate size={28} />
        </div>
        <div>
          <h1>{template.name}</h1>
          {template.category && <p className="scan-subtitle">{template.category}</p>}
        </div>
      </div>

      {/* Patient selector */}
      <div className="patient-selector-section">
        <h2><Search size={18} />{t('dyn.select_patient')}</h2>
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
          {/* DOCTOR */}
          <div className={`sheet-section ${SECTION_META.doctor.cls}`}>
            <div className={`section-role-badge ${SECTION_META.doctor.badge}`}>{SECTION_META.doctor.label}</div>
            {fieldsBySection('doctor').map(renderField)}
          </div>

          <DoctorActionFooter isAdmin={isAdmin} admin={admin} submitting={submitting} doctorLabel={t('dyn.save_send_nurse')} />

          {isAdmin && (<>
            {/* NURSE */}
            <div className={`sheet-section ${SECTION_META.nurse.cls}`}>
              <div className={`section-role-badge ${SECTION_META.nurse.badge}`}>{SECTION_META.nurse.label}</div>
              {fieldsBySection('nurse').map(renderField)}
            </div>
            <AdminDoneFooter stage="nurse" label="Nurse" done={admin.progress.nurse} disabled={!admin.progress.doctor} advancing={admin.advancing}
              onClick={() => admin.advance('Pending_Technical', 'nurse', { prep: collectSection('nurse') })} />

            {/* TECH */}
            <div className={`sheet-section ${SECTION_META.tech.cls}`}>
              <div className={`section-role-badge ${SECTION_META.tech.badge}`}>{SECTION_META.tech.label}</div>
              {fieldsBySection('tech').map(renderField)}
            </div>
            <AdminDoneFooter stage="tech" label="Technical" done={admin.progress.tech} disabled={!admin.progress.nurse} advancing={admin.advancing}
              onClick={() => admin.advance('Pending_Report', 'tech', { technical: collectSection('tech') })} />

            {/* RESULTS */}
            <div className={`sheet-section ${SECTION_META.results.cls}`}>
              <div className={`section-role-badge ${SECTION_META.results.badge}`}>{SECTION_META.results.label}</div>
              {fieldsBySection('results').map(renderField)}
              <div className="form-group mt-12"><label>Impression</label><textarea rows={4} value={formData.impression || ''} onChange={(e) => set('impression', e.target.value)} /></div>
              <AdminResultsFooter admin={admin} collectResults={() => collectSection('results')} impression={formData.impression} />
            </div>
          </>)}
        </form>
      )}

      {/* History */}
      {selectedPatient && (
        <div className="history-section">
          <h3><FileText size={18} />{template.name} {t('dyn.history')} ({history.length})</h3>
          {historyLoading ? (
            <div className="loading-state"><Loader2 size={24} className="spin" />Loading...</div>
          ) : history.length === 0 ? (
            <div className="empty-state">No previous records.</div>
          ) : (
            <div className="history-table-wrapper">
              <table className="history-table">
                <thead><tr><th>Date</th><th>Status</th><th>Impression</th><th></th></tr></thead>
                <tbody>
                  {history.map((entry) => (
                    <React.Fragment key={entry.id}>
                      <tr>
                        <td>{entry.createdAt ? format(new Date(entry.createdAt), 'dd MMM yyyy') : '—'}</td>
                        <td><span className="status-badge">{entry.workflowStatus}</span></td>
                        <td className="impression-cell">{entry.impression ? entry.impression.slice(0, 60) : '—'}</td>
                        <td><button className="btn-icon" onClick={() => setExpandedRow(expandedRow === entry.id ? null : entry.id)}>{expandedRow === entry.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button></td>
                      </tr>
                      {expandedRow === entry.id && (
                        <tr className="detail-row"><td colSpan={4}>
                          <div className="detail-content">
                            <div className="detail-grid">
                              {(template.fields || []).map((f) => {
                                const v = entry._data?.[f.key];
                                if (v === undefined || v === null || v === '') return null;
                                let disp = v;
                                if (Array.isArray(v)) disp = v.join(', ');
                                else if (typeof v === 'boolean') disp = v ? 'Yes' : 'No';
                                return <div className="detail-item" key={f.key}><span className="detail-label">{f.label}:</span><span>{String(disp)}</span></div>;
                              })}
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

// Results footer: advances to Completed, carrying the results-section fields +
// impression into the report payload.
const AdminResultsFooter = ({ admin, collectResults, impression }) => (
  <AdminReportFooterWrapper admin={admin} onComplete={() => admin.advance('Completed', 'report', { report: { ...collectResults(), impression } })} />
);

// Thin wrapper around the shared AdminReportFooter visuals but with a custom onClick.
const AdminReportFooterWrapper = ({ admin, onComplete }) => (
  <div className="form-actions">
    {admin.progress.report ? (
      <span className="admin-done-badge admin-done-badge--lg">✓ Record Completed</span>
    ) : (
      <button type="button" className="btn-admin-done btn-admin-report btn-lg"
        disabled={!admin.progress.tech || admin.advancing} onClick={onComplete}>
        {admin.advancing ? <><Loader2 size={18} className="spin" /> Working…</> : '✓ Complete & Approve'}
      </button>
    )}
  </div>
);

// Lightweight 5×5 vitals grid editor (time/pulse/bp/ecg/notes).
const VITALS_STAGES = ['Before Rest', 'Before stress', 'During stress', 'After stress', 'Before Discharge'];
const VitalsEditor = ({ label, rows, onChange }) => {
  const data = VITALS_STAGES.map((stage, i) => rows[i] || { label: stage, time: '', pulse: '', bp: '', ecg: '', notes: '' });
  const upd = (i, k, v) => {
    const next = data.map((r, idx) => (idx === i ? { ...r, [k]: v } : r));
    onChange(next);
  };
  return (
    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
      <label>{label}</label>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
          <thead><tr>{['Stage', 'Time', 'Pulse', 'BP', 'ECG', 'Notes'].map((h) => <th key={h} style={{ textAlign: 'start', padding: 4 }}>{h}</th>)}</tr></thead>
          <tbody>
            {data.map((r, i) => (
              <tr key={i}>
                <td style={{ padding: 4, whiteSpace: 'nowrap' }}>{r.label}</td>
                {['time', 'pulse', 'bp', 'ecg', 'notes'].map((k) => (
                  <td key={k} style={{ padding: 2 }}><input value={r[k] || ''} onChange={(e) => upd(i, k, e.target.value)} style={{ width: '100%', minWidth: 60 }} /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DynamicScanSheet;
