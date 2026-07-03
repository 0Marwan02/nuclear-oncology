import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, FileText, Pill, Loader2, CheckCircle, AlertCircle, ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { createScan, getScanHistory, apiFetch } from '../utils/api';
import { useScanRole, useAdminWorkflow, DoctorActionFooter, AdminDoneFooter, AdminReportFooter, RoleCreateNotice } from '../utils/scanSheet';
import { usePrevHint } from '../components/PrevField';
import './ScanThyroid.css';

const MCi_TO_MBq = 37;

const getToday = () => new Date().toISOString().split('T')[0];

const emptyForm = () => ({
  // Doctor
  diagnosis: '',
  complaint: '',
  totalPSA: '',
  freePSA: '',
  psaTestDate: '',
  gleasonScore: '',
  surgeryHistory: '',
  surgeryDate: '',
  surgeryOthers: '',
  // Radio
  radioYn: false,
  radioSite: '',
  radioSessions: '',
  radioLastSession: '',
  // Chemo
  chemoYn: false,
  chemoSessions: '',
  chemoLastCycle: '',
  // G-CSF
  gcsfGiven: false,
  gcsfLastDate: '',
  gcsfNotes: '',
  // Renal function
  renalFunctionDate: '',
  urea: '',
  ureaNotes: '',
  creatinine: '',
  creatinineNotes: '',
  // Medical history
  contrastAllergy: false,
  htnHistory: false,
  htnNotes: '',
  dmHistory: false,
  dmMedType: '',
  dmLastDoseDate: '',
  // Prev studies
  prevPsmaDate: '',
  prevPsmaSite: '',
  ctMriYn: false,
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
  ga68DoseMCi: '',
  injectionTime: '',
  scanTime: '',
  uptakeTime: '',
  delayedImages: false,
  delayedImagesNotes: '',
  // Results
  prostateBedRecurrence: false,
  lymphNodeInvolvement: false,
  boneMetastasis: false,
  visceralMetastasis: false,
  lesionLocations: '',
  psmaExpression: '',
  impression: '',
  physicianNotes: '',
});

const emptyMarker = () => ({ name: '', value: '' });

const ScanPSMA = () => {
  const TODAY = getToday(); // fresh per render so the max-date never goes stale overnight
  const [searchParams] = useSearchParams();
  const currentUser = JSON.parse(localStorage.getItem('auth_user') || '{}');
  const { isAdmin, canCreate } = useScanRole();
  const admin = useAdminWorkflow('psma');
  const [patients, setPatients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const Prev = usePrevHint('psma', selectedPatient?.id); // per-field previous-visit hints

  useEffect(() => {
    const pid = searchParams.get('patientId');
    if (pid) apiFetch(`/patients/${pid}`).then(p => { setSelectedPatient(p); setSearchQuery(p.name); }).catch(() => {});
  }, []);
  const [formData, setFormData] = useState(emptyForm());
  const [tumorMarkers, setTumorMarkers] = useState([emptyMarker()]);
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
      getScanHistory('psma', selectedPatient.id)
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
    setTumorMarkers([emptyMarker()]);
    setError('');
    setSuccess('');
    admin.reset(p.id);
  };

  const mbq = formData.ga68DoseMCi ? (parseFloat(formData.ga68DoseMCi) * MCi_TO_MBq).toFixed(0) : '';
  const prevScan = history.length > 0 ? history[0] : null;

  const addMarker = () => setTumorMarkers((p) => [...p, emptyMarker()]);
  const removeMarker = (i) => setTumorMarkers((p) => p.filter((_, idx) => idx !== i));
  const setMarker = (i, field, value) => setTumorMarkers((p) => p.map((m, idx) => idx === i ? { ...m, [field]: value } : m));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isAdmin && admin.progress.doctor) return; // guard: already submitted for this patient
    setError('');
    setSuccess('');
    if (!selectedPatient) { setError('Please select a patient first'); return; }
    if (!isAdmin && (selectedPatient.gender?.toLowerCase() === 'female' || selectedPatient.gender === 'أنثى')) {
      setError('PSMA PET/CT is for male patients only.');
      return;
    }
    const filledMarkers = tumorMarkers.filter((m) => m.name || m.value);

    setSubmitting(true);
    try {
      const injectionSite = `${formData.injectionSide} ${formData.injectionLimb}`;
      const payload = {
        patientId: selectedPatient.id,
        diagnosis: formData.diagnosis || null,
        complaint: formData.complaint || null,
        totalPSA: formData.totalPSA ? parseFloat(formData.totalPSA) : null,
        freePSA: formData.freePSA ? parseFloat(formData.freePSA) : null,
        psaTestDate: formData.psaTestDate || null,
        gleasonScore: formData.gleasonScore || null,
        surgeryHistory: formData.surgeryHistory || null,
        surgeryDate: formData.surgeryDate || null,
        surgeryHistoryOther: formData.surgeryOthers || null,
        radioYn: formData.radioYn,
        radioSite: formData.radioSite || null,
        radioSessions: formData.radioSessions ? parseInt(formData.radioSessions) : null,
        radioLastSession: formData.radioLastSession || null,
        chemoYn: formData.chemoYn,
        chemoSessions: formData.chemoSessions ? parseInt(formData.chemoSessions) : null,
        chemoLastCycle: formData.chemoLastCycle || null,
        gcsfGiven: formData.gcsfGiven,
        gcsfLastDate: formData.gcsfLastDate || null,
        gcsfNotes: formData.gcsfNotes || null,
        tumorMarkers: filledMarkers.length > 0
          ? JSON.stringify(filledMarkers.map((m) => ({ ...m, physician: currentUser.name || currentUser.username || '' })))
          : null,
        renalFunctionDate: formData.renalFunctionDate || null,
        urea: formData.urea ? parseFloat(formData.urea) : null,
        ureaNote: formData.ureaNotes || null,
        creatinine: formData.creatinine ? parseFloat(formData.creatinine) : null,
        creatinineNote: formData.creatinineNotes || null,
        contrastAllergy: formData.contrastAllergy,
        hypertension: formData.htnHistory,
        hypertensionNote: formData.htnNotes || null,
        dmHistory: formData.dmHistory,
        dmMedicationType: formData.dmMedType || null,
        dmLastDoseDate: formData.dmLastDoseDate || null,
        prevPsmaDate: formData.prevPsmaDate || null,
        prevPsmaFindings: formData.prevPsmaSite || null,
        ctMriYn: formData.ctMriYn,
        ctMriDate: formData.ctMriYn ? (formData.ctMriDate || null) : null,
        ctMriFindings: formData.ctMriYn ? (formData.ctMriSite || null) : null,
        prepWeight: formData.prepWeight ? parseFloat(formData.prepWeight) : null,
        prepHeight: formData.prepHeight ? parseFloat(formData.prepHeight) : null,
        prepBloodGlucose: formData.prepBloodGlucose ? parseFloat(formData.prepBloodGlucose) : null,
        injectionSite,
        prepNurseNotes: formData.prepNurseNotes || null,
        ga68DoseMCi: parseFloat(formData.ga68DoseMCi),
        injectionTime: formData.injectionTime || null,
        scanTime: formData.scanTime || null,
        uptakeTime: formData.uptakeTime ? parseInt(formData.uptakeTime) : null,
        delayedImages: formData.delayedImages,
        delayedImagesNotes: formData.delayedImagesNotes || null,
        prostateBedRecurrence: formData.prostateBedRecurrence,
        lymphNodeInvolvement: formData.lymphNodeInvolvement,
        boneMetastasis: formData.boneMetastasis,
        visceralMetastasis: formData.visceralMetastasis,
        lesionLocations: formData.lesionLocations || null,
        psmaExpression: formData.psmaExpression || null,
        impression: formData.impression || null,
        physicianNotes: formData.physicianNotes || null,
        workflowStatus: 'Pending_Nurse',
      };

      const result = await createScan('psma', payload);
      if (isAdmin) {
        admin.onCreated(result.id);
        setSuccess('Record created. Use the section buttons below to advance each stage.');
      } else {
        setSuccess('PSMA PET/CT record created — sent to nurse.');
        setFormData(emptyForm());
        setTumorMarkers([emptyMarker()]);
        setSelectedPatient(null);
      }
      setHistoryLoading(true);
      getScanHistory('psma', selectedPatient.id)
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
        <div className="scan-header-icon" style={{ background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)' }}>
          <Pill size={28} />
        </div>
        <div>
          <h1>PSMA PET/CT</h1>
          <p className="scan-subtitle">Ga-68 PSMA — Prostate Cancer Protocol</p>
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
              <label>Diagnosis</label>
              <><input type="text" value={formData.diagnosis} onChange={(e) => set('diagnosis', e.target.value)} placeholder="e.g., Prostate cancer, post-prostatectomy..." /><Prev k="diagnosis" /></>
              {prevScan?.diagnosis && <span className="prev-scan-hint">Prev: {prevScan.diagnosis}</span>}
            </div>

            {/* PSA */}
            <div className="sheet-subsection">
              <div className="subsection-title">PSA Values</div>
              <div className="sheet-row">
                <div className="form-group">
                  <label>Test Date</label>
                  <><input type="date" max={TODAY} value={formData.psaTestDate} onChange={(e) => set('psaTestDate', e.target.value)} /><Prev k="psaTestDate" /></>
                </div>
                <div className="form-group">
                  <label>Total PSA <span className="unit">ng/mL</span></label>
                  <><input type="number" step="any" value={formData.totalPSA} onChange={(e) => set('totalPSA', e.target.value)} /><Prev k="totalPSA" /></>
                  {prevScan?.totalPSA != null && <span className="prev-scan-hint">Prev: {prevScan.totalPSA} ng/mL</span>}
                </div>
                <div className="form-group">
                  <label>Free PSA <span className="unit">ng/mL</span></label>
                  <><input type="number" step="any" value={formData.freePSA} onChange={(e) => set('freePSA', e.target.value)} /><Prev k="freePSA" /></>
                  {prevScan?.freePSA != null && <span className="prev-scan-hint">Prev: {prevScan.freePSA} ng/mL</span>}
                </div>
                <div className="form-group">
                  <label>Gleason Score</label>
                  <><input type="text" value={formData.gleasonScore} onChange={(e) => set('gleasonScore', e.target.value)} placeholder="e.g., 3+4=7" /><Prev k="gleasonScore" /></>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label>Complaint</label>
              <><textarea rows={2} value={formData.complaint} onChange={(e) => set('complaint', e.target.value)} /><Prev k="complaint" /></>
            </div>

            {/* Surgery */}
            <div className="sheet-subsection">
              <div className="subsection-title">Surgical History</div>
              <div className="sheet-row">
                <div className="form-group flex-2">
                  <label>Previous Surgery</label>
                  <><input type="text" value={formData.surgeryHistory} onChange={(e) => set('surgeryHistory', e.target.value)} placeholder="e.g., Radical prostatectomy..." /><Prev k="surgeryHistory" /></>
                </div>
                <div className="form-group">
                  <label>Date</label>
                  <><input type="date" max={TODAY} value={formData.surgeryDate} onChange={(e) => set('surgeryDate', e.target.value)} /><Prev k="surgeryDate" /></>
                </div>
              </div>
              <div className="form-group" style={{ marginTop: 8 }}>
                <label>Others / Notes</label>
                <><textarea rows={2} value={formData.surgeryOthers} onChange={(e) => set('surgeryOthers', e.target.value)} placeholder="Additional surgical notes..." /><Prev k="surgeryOthers" /></>
              </div>
            </div>

            {/* Radiotherapy */}
            <div className="sheet-subsection">
              <div className="subsection-title">Radiotherapy</div>
              <div className="sheet-row" style={{ alignItems: 'center' }}>
                <div className="radio-group">
                  <button type="button" className={`radio-chip${!formData.radioYn ? ' active' : ''}`} onClick={() => set('radioYn', false)}>No</button>
                  <button type="button" className={`radio-chip${formData.radioYn ? ' active' : ''}`} onClick={() => set('radioYn', true)}>Yes</button>
                </div>
                {formData.radioYn && (
                  <>
                    <div className="form-group flex-2"><label>Site</label><input type="text" value={formData.radioSite} onChange={(e) => set('radioSite', e.target.value)} /></div>
                    <div className="form-group"><label>Sessions</label><input type="number" value={formData.radioSessions} onChange={(e) => set('radioSessions', e.target.value)} style={{ width: 80 }} /></div>
                    <div className="form-group"><label>Last Session</label><input type="date" max={TODAY} value={formData.radioLastSession} onChange={(e) => set('radioLastSession', e.target.value)} /></div>
                  </>
                )}
              </div>
            </div>

            {/* Chemotherapy */}
            <div className="sheet-subsection">
              <div className="subsection-title">Chemotherapy</div>
              <div className="sheet-row" style={{ alignItems: 'center' }}>
                <div className="radio-group">
                  <button type="button" className={`radio-chip${!formData.chemoYn ? ' active' : ''}`} onClick={() => set('chemoYn', false)}>No</button>
                  <button type="button" className={`radio-chip${formData.chemoYn ? ' active' : ''}`} onClick={() => set('chemoYn', true)}>Yes</button>
                </div>
                {formData.chemoYn && (
                  <>
                    <div className="form-group"><label>Sessions</label><input type="number" value={formData.chemoSessions} onChange={(e) => set('chemoSessions', e.target.value)} style={{ width: 80 }} /></div>
                    <div className="form-group"><label>Last Cycle</label><input type="date" max={TODAY} value={formData.chemoLastCycle} onChange={(e) => set('chemoLastCycle', e.target.value)} /></div>
                  </>
                )}
              </div>
            </div>

            {/* G-CSF */}
            <div className="sheet-subsection">
              <div className="subsection-title">G-CSF Administration</div>
              <div className="sheet-row" style={{ alignItems: 'center' }}>
                <div className="radio-group">
                  <button type="button" className={`radio-chip${!formData.gcsfGiven ? ' active' : ''}`} onClick={() => set('gcsfGiven', false)}>No</button>
                  <button type="button" className={`radio-chip${formData.gcsfGiven ? ' active' : ''}`} onClick={() => set('gcsfGiven', true)}>Yes</button>
                </div>
                {formData.gcsfGiven && (
                  <div className="form-group"><label>Last Done</label><input type="date" max={TODAY} value={formData.gcsfLastDate} onChange={(e) => set('gcsfLastDate', e.target.value)} /></div>
                )}
              </div>
              {formData.gcsfGiven && (
                <div className="form-group" style={{ marginTop: 8 }}>
                  <label>G-CSF Notes</label>
                  <><textarea rows={2} value={formData.gcsfNotes} onChange={(e) => set('gcsfNotes', e.target.value)} placeholder="Drug name, dose, frequency..." /><Prev k="gcsfNotes" /></>
                </div>
              )}
            </div>

            {/* Additional Tumor Markers */}
            <div className="sheet-subsection">
              <div className="subsection-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Additional Tumor Markers</span>
                <button type="button" className="btn-icon-sm" onClick={addMarker} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#2563eb', background: 'none', border: '1px solid #bfdbfe', borderRadius: 6, padding: '3px 10px', cursor: 'pointer' }}>
                  <Plus size={13} /> Add
                </button>
              </div>
              {tumorMarkers.map((marker, i) => (
                <div key={i} className="sheet-row" style={{ alignItems: 'flex-end', marginTop: i > 0 ? 8 : 0 }}>
                  <div className="form-group flex-2">
                    {i === 0 && <label>Name</label>}
                    <input type="text" value={marker.name} onChange={(e) => setMarker(i, 'name', e.target.value)} placeholder="e.g., LDH, ALP, CEA..." />
                  </div>
                  <div className="form-group">
                    {i === 0 && <label>Level</label>}
                    <input type="number" step="any" value={marker.value} onChange={(e) => setMarker(i, 'value', e.target.value)} placeholder="Value" />
                  </div>
                  {tumorMarkers.length > 1 && (
                    <button type="button" onClick={() => removeMarker(i)} style={{ marginBottom: 2, background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Renal function */}
            <div className="sheet-subsection">
              <div className="subsection-title">Renal Function</div>
              <div className="sheet-row">
                <div className="form-group"><label>Date</label><input type="date" max={TODAY} value={formData.renalFunctionDate} onChange={(e) => set('renalFunctionDate', e.target.value)} /></div>
                <div className="form-group">
                  <label>Urea <span className="unit">mg/dL</span></label>
                  <><input type="number" step="any" value={formData.urea} onChange={(e) => set('urea', e.target.value)} /><Prev k="urea" /></>
                  {prevScan?.urea != null && <span className="prev-scan-hint">Prev: {prevScan.urea} mg/dL</span>}
                </div>
                <div className="form-group">
                  <label>Creatinine <span className="unit">mg/dL</span></label>
                  <><input type="number" step="any" value={formData.creatinine} onChange={(e) => set('creatinine', e.target.value)} /><Prev k="creatinine" /></>
                  {prevScan?.creatinine != null && <span className="prev-scan-hint">Prev: {prevScan.creatinine} mg/dL</span>}
                </div>
              </div>
              <div className="sheet-row" style={{ marginTop: 8 }}>
                <div className="form-group flex-2">
                  <label>Urea Notes</label>
                  <><input type="text" value={formData.ureaNotes} onChange={(e) => set('ureaNotes', e.target.value)} placeholder="Clinical note..." /><Prev k="ureaNotes" /></>
                </div>
                <div className="form-group flex-2">
                  <label>Creatinine Notes</label>
                  <><input type="text" value={formData.creatinineNotes} onChange={(e) => set('creatinineNotes', e.target.value)} placeholder="e.g., elevated — CKD stage II..." /><Prev k="creatinineNotes" /></>
                </div>
              </div>
            </div>

            {/* Medical History */}
            <div className="sheet-subsection">
              <div className="subsection-title">Medical History</div>

              <label className="checkbox-label" style={{ marginBottom: 10 }}>
                <><input type="checkbox" checked={formData.contrastAllergy} onChange={(e) => set('contrastAllergy', e.target.checked)} /><Prev k="contrastAllergy" /></>
                <span>History of Allergy to Contrast Media</span>
              </label>

              {/* HTN */}
              <div className="sheet-row" style={{ alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontWeight: 600, minWidth: 180 }}>Hypertension (HTN)</span>
                <div className="radio-group">
                  <button type="button" className={`radio-chip${!formData.htnHistory ? ' active' : ''}`} onClick={() => set('htnHistory', false)}>No</button>
                  <button type="button" className={`radio-chip${formData.htnHistory ? ' active' : ''}`} onClick={() => set('htnHistory', true)}>Yes</button>
                </div>
                {formData.htnHistory && (
                  <div className="form-group flex-2" style={{ margin: 0 }}>
                    <><input type="text" value={formData.htnNotes} onChange={(e) => set('htnNotes', e.target.value)} placeholder="Medications, control status..." /><Prev k="htnNotes" /></>
                  </div>
                )}
              </div>

              {/* DM */}
              <div>
                <div className="sheet-row" style={{ alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, minWidth: 180 }}>Diabetes Mellitus (DM)</span>
                  <div className="radio-group">
                    <button type="button" className={`radio-chip${!formData.dmHistory ? ' active' : ''}`} onClick={() => set('dmHistory', false)}>No</button>
                    <button type="button" className={`radio-chip${formData.dmHistory ? ' active' : ''}`} onClick={() => set('dmHistory', true)}>Yes</button>
                  </div>
                </div>
                {formData.dmHistory && (
                  <div className="sheet-row" style={{ marginTop: 8 }}>
                    <div className="form-group">
                      <label>Medication Type</label>
                      <div className="radio-group">
                        {['Pills', 'Insulin', 'Both'].map((t) => (
                          <button key={t} type="button" className={`radio-chip${formData.dmMedType === t ? ' active' : ''}`} onClick={() => set('dmMedType', t)}>{t}</button>
                        ))}
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Last Dose / Injection</label>
                      <><input type="datetime-local" value={formData.dmLastDoseDate} onChange={(e) => set('dmLastDoseDate', e.target.value)} /><Prev k="dmLastDoseDate" /></>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Prev PSMA + CT/MRI */}
            <div className="sheet-subsection">
              <div className="subsection-title">Previous Investigations</div>
              <div className="sheet-row">
                <div className="form-group"><label>Prev PSMA Date</label><input type="date" max={TODAY} value={formData.prevPsmaDate} onChange={(e) => set('prevPsmaDate', e.target.value)} /></div>
                <div className="form-group flex-2">
                  <label>Site / Finding</label>
                  <><input type="text" value={formData.prevPsmaSite} onChange={(e) => set('prevPsmaSite', e.target.value)} /><Prev k="prevPsmaSite" /></>
                  {prevScan?.impression && <span className="prev-scan-hint">Prev impression: {prevScan.impression.slice(0, 80)}{prevScan.impression.length > 80 ? '…' : ''}</span>}
                </div>
              </div>
              <div className="sheet-row" style={{ marginTop: 8, alignItems: 'center' }}>
                <span style={{ fontWeight: 500, minWidth: 120 }}>CT / MRI done?</span>
                <div className="radio-group">
                  <button type="button" className={`radio-chip${!formData.ctMriYn ? ' active' : ''}`} onClick={() => set('ctMriYn', false)}>No</button>
                  <button type="button" className={`radio-chip${formData.ctMriYn ? ' active' : ''}`} onClick={() => set('ctMriYn', true)}>Yes</button>
                </div>
              </div>
              {formData.ctMriYn && (
                <div className="sheet-row" style={{ marginTop: 8 }}>
                  <div className="form-group"><label>CT / MRI Date</label><input type="date" max={TODAY} value={formData.ctMriDate} onChange={(e) => set('ctMriDate', e.target.value)} /></div>
                  <div className="form-group flex-2"><label>Site / Finding</label><input type="text" value={formData.ctMriSite} onChange={(e) => set('ctMriSite', e.target.value)} /></div>
                </div>
              )}
            </div>
          </div>

          <DoctorActionFooter isAdmin={isAdmin} admin={admin} submitting={submitting} />

          {isAdmin && (<>
          {/* ── NURSE SECTION ── */}
          <div className="sheet-section nurse-section">
            <div className="section-role-badge nurse-badge">Nurse</div>
            <div className="sheet-row">
              <div className="form-group"><label>Weight <span className="unit">kg</span></label><input type="number" step="any" value={formData.prepWeight} onChange={(e) => set('prepWeight', e.target.value)} placeholder="70" /></div>
              <div className="form-group"><label>Height <span className="unit">cm</span></label><input type="number" step="any" value={formData.prepHeight} onChange={(e) => set('prepHeight', e.target.value)} placeholder="170" /></div>
              <div className="form-group"><label>Blood Glucose <span className="unit">mg/dL</span></label><input type="number" step="any" value={formData.prepBloodGlucose} onChange={(e) => set('prepBloodGlucose', e.target.value)} placeholder="90" /></div>
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
            <div className="form-group"><label>Nurse Notes</label><textarea rows={2} value={formData.prepNurseNotes} onChange={(e) => set('prepNurseNotes', e.target.value)} /></div>
          </div>

          <AdminDoneFooter stage="nurse" label="Nurse" done={admin.progress.nurse} disabled={!admin.progress.doctor} advancing={admin.advancing} onClick={() => admin.advance('Pending_Technical', 'nurse')} />

          {/* ── TECHNICIAN SECTION ── */}
          <div className="sheet-section tech-section">
            <div className="section-role-badge tech-badge">Technician</div>
            <div className="dose-input-row">
              <div className="form-group">
                <label>Injected Dose (Ga-68 PSMA) <span className="required-star">*</span></label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <><input type="number" step="any" value={formData.ga68DoseMCi} onChange={(e) => set('ga68DoseMCi', e.target.value)} placeholder="4" style={{ width: 100 }} /><Prev k="ga68DoseMCi" /></>
                  <span className="dose-unit">mCi</span>
                  {mbq && <span className="dose-mbq">= {mbq} MBq</span>}
                </div>
              </div>
            </div>
            <div className="sheet-row">
              <div className="form-group"><label>Time of Injection</label><input type="datetime-local" value={formData.injectionTime} onChange={(e) => set('injectionTime', e.target.value)} /></div>
              <div className="form-group"><label>Time of Imaging</label><input type="datetime-local" value={formData.scanTime} onChange={(e) => set('scanTime', e.target.value)} /></div>
              <div className="form-group"><label>Uptake Time <span className="unit">min</span></label><input type="number" value={formData.uptakeTime} onChange={(e) => set('uptakeTime', e.target.value)} placeholder="60" style={{ width: 90 }} /></div>
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
            <div className="sheet-row" style={{ gap: 24, flexWrap: 'wrap' }}>
              {[
                { field: 'prostateBedRecurrence', label: 'Prostate Bed Recurrence' },
                { field: 'lymphNodeInvolvement', label: 'Lymph Node Involvement' },
                { field: 'boneMetastasis', label: 'Bone Metastasis' },
                { field: 'visceralMetastasis', label: 'Visceral Metastasis' },
              ].map(({ field, label }) => (
                <label key={field} className="checkbox-label">
                  <input type="checkbox" checked={formData[field]} onChange={(e) => set(field, e.target.checked)} />
                  <span>{label}</span>
                </label>
              ))}
            </div>

            <div className="form-group mt-12">
              <label>Lesion Locations</label>
              <><textarea rows={2} value={formData.lesionLocations} onChange={(e) => set('lesionLocations', e.target.value)} placeholder="Describe lesion sites..." /><Prev k="lesionLocations" /></>
            </div>

            <div className="form-group">
              <label>PSMA Expression</label>
              <div className="radio-group">
                {['Focal', 'Diffuse', 'Heterogeneous', 'None'].map((opt) => (
                  <button key={opt} type="button"
                    className={`radio-chip${formData.psmaExpression === opt ? ' active' : ''}`}
                    onClick={() => set('psmaExpression', formData.psmaExpression === opt ? '' : opt)}>
                    {opt}
                  </button>
                ))}
              </div>
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
          <h3><FileText size={18} />PSMA PET/CT History ({history.length})</h3>
          {historyLoading ? (
            <div className="loading-state"><Loader2 size={24} className="spin" />Loading...</div>
          ) : history.length === 0 ? (
            <div className="empty-state">No previous PSMA PET/CT scans recorded.</div>
          ) : (
            <div className="history-table-wrapper">
              <table className="history-table">
                <thead><tr><th>Date</th><th>Total PSA</th><th>Ga-68 Dose</th><th>Bone Mets</th><th>Impression</th><th></th></tr></thead>
                <tbody>
                  {history.map((entry) => (
                    <React.Fragment key={entry.id}>
                      <tr>
                        <td>{entry.createdAt ? format(new Date(entry.createdAt), 'dd MMM yyyy') : '—'}</td>
                        <td>{entry.totalPSA != null ? `${entry.totalPSA} ng/mL` : '—'}</td>
                        <td>{entry.ga68DoseMCi ? `${entry.ga68DoseMCi} mCi` : '—'}</td>
                        <td>{entry.boneMetastasis ? <span className="status-badge status-cancelled">Yes</span> : <span className="status-badge status-completed">No</span>}</td>
                        <td className="impression-cell">{entry.impression ? entry.impression.slice(0, 60) + (entry.impression.length > 60 ? '…' : '') : '—'}</td>
                        <td><button className="btn-icon" onClick={() => setExpandedRow(expandedRow === entry.id ? null : entry.id)}>{expandedRow === entry.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button></td>
                      </tr>
                      {expandedRow === entry.id && (
                        <tr className="detail-row"><td colSpan={6}>
                          <div className="detail-content">
                            <div className="detail-grid">
                              <div className="detail-item"><span className="detail-label">Gleason:</span><span>{entry.gleasonScore || '—'}</span></div>
                              <div className="detail-item"><span className="detail-label">LN Involvement:</span><span>{entry.lymphNodeInvolvement ? 'Yes' : 'No'}</span></div>
                              <div className="detail-item"><span className="detail-label">Prostate Bed:</span><span>{entry.prostateBedRecurrence ? 'Yes' : 'No'}</span></div>
                              <div className="detail-item"><span className="detail-label">PSMA Expression:</span><span>{entry.psmaExpression || '—'}</span></div>
                              <div className="detail-item"><span className="detail-label">HTN:</span><span>{entry.htnHistory ? 'Yes' : 'No'}</span></div>
                              <div className="detail-item"><span className="detail-label">DM:</span><span>{entry.dmHistory ? `Yes${entry.dmMedType ? ` (${entry.dmMedType})` : ''}` : 'No'}</span></div>
                            </div>
                            {entry.lesionLocations && <div className="detail-text"><strong>Lesion Locations:</strong><p>{entry.lesionLocations}</p></div>}
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

export default ScanPSMA;
