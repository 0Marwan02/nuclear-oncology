import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, FileText, HeartPulse, Loader2, CheckCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { createScan, getScanHistory, apiFetch } from '../utils/api';
import { useScanRole, useAdminWorkflow, DoctorActionFooter, AdminDoneFooter, AdminReportFooter, RoleCreateNotice } from '../utils/scanSheet';
import { usePrevHint } from '../components/PrevField';
import './ScanThyroid.css';

const MCi_TO_MBq = 37;
const getToday = () => new Date().toISOString().split('T')[0];

const VITALS_ROWS = ['Before Rest', 'Before stress', 'During stress', 'After stress', 'Before Discharge'];
const emptyVitals = () => VITALS_ROWS.map((label) => ({ label, time: '', pulse: '', bp: '', ecg: '', notes: '' }));

const SCAN_MODE_OPTIONS = [
  { v: 'rest', l: 'Rest' },
  { v: 'stress', l: 'Stress' },
  { v: 'delayed', l: 'Delayed' },
  { v: 'redistribution', l: 'Redistribution' },
  { v: 'reinjection', l: 'Re-injection' },
];
const PRECIPITATED_OPTIONS = [
  { v: 'rest', l: 'Rest' },
  { v: 'exercise', l: 'Exercise' },
  { v: 'after_meals', l: 'After meals' },
  { v: 'others', l: 'Others' },
];
const RELIEVED_OPTIONS = [
  { v: 'rest', l: 'Rest' },
  { v: 'dinitra', l: 'Dinitra' },
  { v: 'antacids', l: 'Antacids' },
  { v: 'others', l: 'Others' },
];
const SYMPTOM_OPTIONS = [
  { v: 'fatigue', l: 'Fatigue' },
  { v: 'chest_pain', l: 'Chest pain' },
  { v: 'dyspnea', l: 'Dyspnea' },
  { v: 'dizziness', l: 'Dizziness' },
  { v: 'claudication', l: 'Claudication' },
  { v: 'nausea', l: 'Nausea' },
  { v: 'vomiting', l: 'Vomiting' },
  { v: 'blurred_vision', l: 'Blurred vision' },
];

const emptyForm = () => ({
  // Doctor — indication/complaint
  diagnosis: '',
  chestPain: false,
  chestPainCharacter: '',
  chestPainOnset: '',
  chestPainCourse: '',
  chestPainDuration: '',
  precipitatedBy: [],
  relievedBy: [],
  radiation: false,
  radiationSite: '',
  palpitation: false,
  sob: false,
  nausea: false,
  vomiting: false,
  fever: false,
  cough: false,
  legPain: false,
  complaintOthers: '',
  // Risk factors
  smoking: false,
  htn: false,
  dm: false,
  hyperlipidemia: false,
  renalDisease: false,
  familyHx: false,
  vasculitis: false,
  // Past history
  angina: false,
  stroke: false,
  mi: false,
  intermittentClaudication: false,
  // Surgical history
  cabg: false,
  ptca: false,
  angioplasty: false,
  surgeryDate: '',
  // Doctor text
  drugHistory: '',
  ccuAdmissionHistory: '',
  // Contraceptive
  contraceptiveStatus: '',
  lmpDate: '',
  // Previous investigations
  ecgDate: '',
  ecgFindings: '',
  echoDate: '',
  echoFindings: '',
  labDate: '',
  cardiacEnzymes: '',
  cardiacCtMriDate: '',
  cardiacCtMriFindings: '',
  // Nurse
  prepWeight: '',
  prepHeight: '',
  prepBloodGlucose: '',
  injectionSide: 'RT',
  injectionLimb: 'hand',
  prepNurseNotes: '',
  // Tech — procedure
  scanMode: [],
  treadmillExercise: false,
  thrBpm: '',
  mets: '',
  exerciseDurationMin: '',
  exerciseDurationSec: '',
  reasonEndingExercise: '',
  vitalsTable: emptyVitals(),
  pharmacological: false,
  pharmaDrug: '',
  pharmaDose: '',
  procedureSymptoms: [],
  nmPhysician: '',
  cardiologist: '',
  // Tech — tracer box
  tracer: '',
  tracerDoseMCi: '',
  acquisitionTime: '',
  technicianPhysicist: '',
  moreAcquisition: '',
  // Results
  impression: '',
  physicianNotes: '',
  technicianNotes: '',
});

const ScanCardiac = () => {
  const TODAY = getToday();
  const [searchParams] = useSearchParams();
  const { isAdmin, canCreate } = useScanRole();
  const admin = useAdminWorkflow('cardiac');
  const [patients, setPatients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const Prev = usePrevHint('cardiac', selectedPatient?.id);

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
      getScanHistory('cardiac', selectedPatient.id)
        .then((d) => setHistory(Array.isArray(d) ? d : []))
        .catch(() => setHistory([]))
        .finally(() => setHistoryLoading(false));
    }
  }, [selectedPatient]);

  const set = (field, value) => setFormData((p) => ({ ...p, [field]: value }));

  const toggleArr = (field, value) => setFormData((p) => {
    const cur = Array.isArray(p[field]) ? p[field] : [];
    return { ...p, [field]: cur.includes(value) ? cur.filter((x) => x !== value) : [...cur, value] };
  });

  const setVitals = (rowIdx, key, value) => setFormData((p) => {
    const rows = p.vitalsTable.map((r, i) => (i === rowIdx ? { ...r, [key]: value } : r));
    return { ...p, vitalsTable: rows };
  });

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
  const mbq = formData.tracerDoseMCi ? (parseFloat(formData.tracerDoseMCi) * MCi_TO_MBq).toFixed(0) : '';

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
        // Doctor
        diagnosis: formData.diagnosis || null,
        chestPain: formData.chestPain,
        chestPainCharacter: formData.chestPainCharacter || null,
        chestPainOnset: formData.chestPainOnset || null,
        chestPainCourse: formData.chestPainCourse || null,
        chestPainDuration: formData.chestPainDuration || null,
        precipitatedBy: JSON.stringify(formData.precipitatedBy || []),
        relievedBy: JSON.stringify(formData.relievedBy || []),
        radiation: formData.radiation,
        radiationSite: formData.radiationSite || null,
        palpitation: formData.palpitation,
        sob: formData.sob,
        nausea: formData.nausea,
        vomiting: formData.vomiting,
        fever: formData.fever,
        cough: formData.cough,
        legPain: formData.legPain,
        complaintOthers: formData.complaintOthers || null,
        // Risk factors
        smoking: formData.smoking,
        htn: formData.htn,
        dm: formData.dm,
        hyperlipidemia: formData.hyperlipidemia,
        renalDisease: formData.renalDisease,
        familyHx: formData.familyHx,
        vasculitis: formData.vasculitis,
        // Past history
        angina: formData.angina,
        stroke: formData.stroke,
        mi: formData.mi,
        intermittentClaudication: formData.intermittentClaudication,
        // Surgical history
        cabg: formData.cabg,
        ptca: formData.ptca,
        angioplasty: formData.angioplasty,
        surgeryDate: formData.surgeryDate || null,
        // Doctor text
        drugHistory: formData.drugHistory || null,
        ccuAdmissionHistory: formData.ccuAdmissionHistory || null,
        // Contraceptive
        contraceptiveStatus: formData.contraceptiveStatus || null,
        lmpDate: formData.lmpDate || null,
        // Previous investigations
        ecgDate: formData.ecgDate || null,
        ecgFindings: formData.ecgFindings || null,
        echoDate: formData.echoDate || null,
        echoFindings: formData.echoFindings || null,
        labDate: formData.labDate || null,
        cardiacEnzymes: formData.cardiacEnzymes || null,
        cardiacCtMriDate: formData.cardiacCtMriDate || null,
        cardiacCtMriFindings: formData.cardiacCtMriFindings || null,
        // Nurse
        prepWeight: formData.prepWeight ? parseFloat(formData.prepWeight) : null,
        prepHeight: formData.prepHeight ? parseFloat(formData.prepHeight) : null,
        prepBloodGlucose: formData.prepBloodGlucose ? parseFloat(formData.prepBloodGlucose) : null,
        injectionSite,
        prepNurseNotes: formData.prepNurseNotes || null,
        // Tech — procedure
        scanMode: JSON.stringify(formData.scanMode || []),
        treadmillExercise: formData.treadmillExercise,
        thrBpm: formData.thrBpm ? parseInt(formData.thrBpm) : null,
        mets: formData.mets ? parseFloat(formData.mets) : null,
        exerciseDurationMin: formData.exerciseDurationMin ? parseInt(formData.exerciseDurationMin) : null,
        exerciseDurationSec: formData.exerciseDurationSec ? parseInt(formData.exerciseDurationSec) : null,
        reasonEndingExercise: formData.reasonEndingExercise || null,
        vitalsTable: JSON.stringify(formData.vitalsTable || []),
        pharmacological: formData.pharmacological,
        pharmaDrug: formData.pharmaDrug || null,
        pharmaDose: formData.pharmaDose || null,
        procedureSymptoms: JSON.stringify(formData.procedureSymptoms || []),
        nmPhysician: formData.nmPhysician || null,
        cardiologist: formData.cardiologist || null,
        // Tech — tracer box
        tracer: formData.tracer || null,
        tracerDoseMCi: formData.tracerDoseMCi ? parseFloat(formData.tracerDoseMCi) : null,
        injectionSiteSide: formData.injectionSide,
        injectionSiteLimb: formData.injectionLimb,
        acquisitionTime: formData.acquisitionTime || null,
        technicianPhysicist: formData.technicianPhysicist || null,
        moreAcquisition: formData.moreAcquisition || null,
        // Results
        impression: formData.impression || null,
        physicianNotes: formData.physicianNotes || null,
        technicianNotes: formData.technicianNotes || null,
        workflowStatus: 'Pending_Nurse',
      };

      const result = await createScan('cardiac', payload);
      if (isAdmin) {
        admin.onCreated(result.id);
        setSuccess('Record created. Use the section buttons below to advance each stage.');
      } else {
        setSuccess('Cardiac MPI record created — sent to nurse.');
        setFormData(emptyForm());
      }
      setHistoryLoading(true);
      getScanHistory('cardiac', selectedPatient.id)
        .then((d) => setHistory(Array.isArray(d) ? d : []))
        .finally(() => setHistoryLoading(false));
    } catch (err) {
      setError(err.message || 'Failed to save record');
    } finally {
      setSubmitting(false);
    }
  };

  const Checks = ({ items }) => (
    <div className="sheet-row" style={{ gap: 24, flexWrap: 'wrap' }}>
      {items.map(({ field, label }) => (
        <label key={field} className="checkbox-label">
          <><input type="checkbox" checked={formData[field]} onChange={(e) => set(field, e.target.checked)} /><Prev k={field} /></>
          <span>{label}</span>
        </label>
      ))}
    </div>
  );

  const ChipGroup = ({ field, options }) => (
    <div className="radio-group" style={{ flexWrap: 'wrap' }}>
      {options.map(({ v, l }) => (
        <button key={v} type="button"
          className={`radio-chip${(formData[field] || []).includes(v) ? ' active' : ''}`}
          onClick={() => toggleArr(field, v)}>{l}</button>
      ))}
    </div>
  );

  return (
    <div className="scan-page">
      <div className="scan-header">
        <div className="scan-header-icon" style={{ background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' }}>
          <HeartPulse size={28} />
        </div>
        <div>
          <h1>Cardiac MPI Scan</h1>
          <p className="scan-subtitle">Myocardial Perfusion Imaging — Tc-99m / Tl-201</p>
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
              <><input type="text" value={formData.diagnosis} onChange={(e) => set('diagnosis', e.target.value)} placeholder="e.g., Ischemic heart disease, CAD..." /><Prev k="diagnosis" /></>
            </div>

            {/* Chest pain */}
            <div className="sheet-subsection">
              <div className="subsection-title">Indication / Complaint</div>
              <label className="checkbox-label">
                <><input type="checkbox" checked={formData.chestPain} onChange={(e) => set('chestPain', e.target.checked)} /><Prev k="chestPain" /></>
                <span>Chest Pain</span>
              </label>
              {formData.chestPain && (
                <>
                  <div className="sheet-row" style={{ marginTop: 10 }}>
                    <div className="form-group">
                      <label>Character</label>
                      <div className="radio-group">
                        {['burning', 'pricking', 'compressing'].map((s) => (
                          <button key={s} type="button" className={`radio-chip${formData.chestPainCharacter === s ? ' active' : ''}`} onClick={() => set('chestPainCharacter', s)}>{s}</button>
                        ))}
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Onset</label>
                      <div className="radio-group">
                        {['sudden', 'acute', 'gradual'].map((s) => (
                          <button key={s} type="button" className={`radio-chip${formData.chestPainOnset === s ? ' active' : ''}`} onClick={() => set('chestPainOnset', s)}>{s}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="sheet-row">
                    <div className="form-group">
                      <label>Course</label>
                      <input type="text" value={formData.chestPainCourse} onChange={(e) => set('chestPainCourse', e.target.value)} placeholder="Continuous / intermittent..." />
                    </div>
                    <div className="form-group">
                      <label>Duration</label>
                      <div className="radio-group">
                        {['minutes', 'hours'].map((s) => (
                          <button key={s} type="button" className={`radio-chip${formData.chestPainDuration === s ? ' active' : ''}`} onClick={() => set('chestPainDuration', s)}>{s}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="sheet-row">
                    <div className="form-group flex-2">
                      <label>Precipitated By</label>
                      <ChipGroup field="precipitatedBy" options={PRECIPITATED_OPTIONS} />
                    </div>
                    <div className="form-group flex-2">
                      <label>Relieved By</label>
                      <ChipGroup field="relievedBy" options={RELIEVED_OPTIONS} />
                    </div>
                  </div>
                </>
              )}
              <div className="sheet-row" style={{ marginTop: 10 }}>
                <label className="checkbox-label">
                  <><input type="checkbox" checked={formData.radiation} onChange={(e) => set('radiation', e.target.checked)} /><Prev k="radiation" /></>
                  <span>Radiation</span>
                </label>
                {formData.radiation && (
                  <div className="form-group"><label>Radiation Site</label><input type="text" value={formData.radiationSite} onChange={(e) => set('radiationSite', e.target.value)} placeholder="e.g., Left arm, jaw..." /></div>
                )}
              </div>
              <div className="subsection-title" style={{ marginTop: 12 }}>Associated Symptoms</div>
              <Checks items={[
                { field: 'palpitation', label: 'Palpitation' },
                { field: 'sob', label: 'SOB' },
                { field: 'nausea', label: 'Nausea' },
                { field: 'vomiting', label: 'Vomiting' },
                { field: 'fever', label: 'Fever' },
                { field: 'cough', label: 'Cough' },
                { field: 'legPain', label: 'Leg Pain' },
              ]} />
              <div className="form-group mt-12"><label>Other Complaints</label><input type="text" value={formData.complaintOthers} onChange={(e) => set('complaintOthers', e.target.value)} /></div>
            </div>

            {/* Risk factors */}
            <div className="sheet-subsection">
              <div className="subsection-title">Risk Factors</div>
              <Checks items={[
                { field: 'smoking', label: 'Smoking' },
                { field: 'htn', label: 'HTN' },
                { field: 'dm', label: 'DM' },
                { field: 'hyperlipidemia', label: 'Hyperlipidemia' },
                { field: 'renalDisease', label: 'Renal Disease' },
                { field: 'familyHx', label: 'Family History' },
                { field: 'vasculitis', label: 'Vasculitis' },
              ]} />
            </div>

            {/* Past history */}
            <div className="sheet-subsection">
              <div className="subsection-title">Past History</div>
              <Checks items={[
                { field: 'angina', label: 'Angina' },
                { field: 'stroke', label: 'Stroke' },
                { field: 'mi', label: 'MI' },
                { field: 'intermittentClaudication', label: 'Intermittent Claudication' },
              ]} />
            </div>

            {/* Surgical history */}
            <div className="sheet-subsection">
              <div className="subsection-title">Surgical History</div>
              <div className="sheet-row" style={{ gap: 24, alignItems: 'center' }}>
                <Checks items={[
                  { field: 'cabg', label: 'CABG' },
                  { field: 'ptca', label: 'PTCA' },
                  { field: 'angioplasty', label: 'Angioplasty' },
                ]} />
                <div className="form-group"><label>Date</label><input type="date" max={TODAY} value={formData.surgeryDate} onChange={(e) => set('surgeryDate', e.target.value)} /></div>
              </div>
            </div>

            {/* Drug + CCU */}
            <div className="sheet-subsection">
              <div className="sheet-row">
                <div className="form-group flex-2"><label>Drug History</label><><textarea rows={2} value={formData.drugHistory} onChange={(e) => set('drugHistory', e.target.value)} /><Prev k="drugHistory" /></></div>
                <div className="form-group flex-2"><label>CCU Admission History</label><><textarea rows={2} value={formData.ccuAdmissionHistory} onChange={(e) => set('ccuAdmissionHistory', e.target.value)} /><Prev k="ccuAdmissionHistory" /></></div>
              </div>
            </div>

            {/* Contraceptive */}
            {isFemale && (
              <div className="sheet-subsection">
                <div className="subsection-title">Contraceptive History</div>
                <div className="sheet-row">
                  <div className="radio-group">
                    {['single', 'postmenopausal', 'married'].map((s) => (
                      <button key={s} type="button" className={`radio-chip${formData.contraceptiveStatus === s ? ' active' : ''}`} onClick={() => set('contraceptiveStatus', s)}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                  {formData.contraceptiveStatus === 'married' && (
                    <div className="form-group"><label>Date of LMP</label><><input type="date" max={TODAY} value={formData.lmpDate} onChange={(e) => set('lmpDate', e.target.value)} /><Prev k="lmpDate" /></></div>
                  )}
                </div>
              </div>
            )}

            {/* Previous investigations */}
            <div className="sheet-subsection">
              <div className="subsection-title">Previous Investigations</div>
              <div className="sheet-row">
                <div className="form-group"><label>ECG Date</label><input type="date" max={TODAY} value={formData.ecgDate} onChange={(e) => set('ecgDate', e.target.value)} /></div>
                <div className="form-group flex-2"><label>ECG Findings</label><input type="text" value={formData.ecgFindings} onChange={(e) => set('ecgFindings', e.target.value)} /></div>
              </div>
              <div className="sheet-row">
                <div className="form-group"><label>Echo Date</label><input type="date" max={TODAY} value={formData.echoDate} onChange={(e) => set('echoDate', e.target.value)} /></div>
                <div className="form-group flex-2"><label>Echo Findings</label><input type="text" value={formData.echoFindings} onChange={(e) => set('echoFindings', e.target.value)} /></div>
              </div>
              <div className="sheet-row">
                <div className="form-group"><label>Lab Date</label><input type="date" max={TODAY} value={formData.labDate} onChange={(e) => set('labDate', e.target.value)} /></div>
                <div className="form-group flex-2"><label>Cardiac Enzymes</label><input type="text" value={formData.cardiacEnzymes} onChange={(e) => set('cardiacEnzymes', e.target.value)} placeholder="Troponin, CK-MB..." /></div>
              </div>
              <div className="sheet-row">
                <div className="form-group"><label>Cardiac CT / MRI Date</label><input type="date" max={TODAY} value={formData.cardiacCtMriDate} onChange={(e) => set('cardiacCtMriDate', e.target.value)} /></div>
                <div className="form-group flex-2"><label>CT / MRI Findings</label><input type="text" value={formData.cardiacCtMriFindings} onChange={(e) => set('cardiacCtMriFindings', e.target.value)} /></div>
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
              <><input type="number" step="any" value={formData.prepBloodGlucose} onChange={(e) => set('prepBloodGlucose', e.target.value)} placeholder="90" style={{ width: 120 }} /><Prev k="prepBloodGlucose" /></>
            </div>

            <div className="form-group">
              <label>Scan Mode</label>
              <ChipGroup field="scanMode" options={SCAN_MODE_OPTIONS} />
            </div>

            {/* Exercise / treadmill */}
            <div className="sheet-subsection">
              <label className="checkbox-label">
                <input type="checkbox" checked={formData.treadmillExercise} onChange={(e) => set('treadmillExercise', e.target.checked)} />
                <span>Treadmill Exercise</span>
              </label>
              {formData.treadmillExercise && (
                <div className="sheet-row" style={{ marginTop: 10 }}>
                  <div className="form-group"><label>THR <span className="unit">bpm</span></label><input type="number" value={formData.thrBpm} onChange={(e) => set('thrBpm', e.target.value)} style={{ width: 90 }} /></div>
                  <div className="form-group"><label>METs</label><input type="number" step="any" value={formData.mets} onChange={(e) => set('mets', e.target.value)} style={{ width: 90 }} /></div>
                  <div className="form-group"><label>Duration <span className="unit">min</span></label><input type="number" value={formData.exerciseDurationMin} onChange={(e) => set('exerciseDurationMin', e.target.value)} style={{ width: 80 }} /></div>
                  <div className="form-group"><label>Duration <span className="unit">sec</span></label><input type="number" value={formData.exerciseDurationSec} onChange={(e) => set('exerciseDurationSec', e.target.value)} style={{ width: 80 }} /></div>
                  <div className="form-group flex-2"><label>Reason for Ending Exercise</label><input type="text" value={formData.reasonEndingExercise} onChange={(e) => set('reasonEndingExercise', e.target.value)} /></div>
                </div>
              )}
            </div>

            {/* Pharmacological */}
            <div className="sheet-subsection">
              <label className="checkbox-label">
                <input type="checkbox" checked={formData.pharmacological} onChange={(e) => set('pharmacological', e.target.checked)} />
                <span>Pharmacological Stress</span>
              </label>
              {formData.pharmacological && (
                <div className="sheet-row" style={{ marginTop: 10 }}>
                  <div className="form-group"><label>Drug</label><input type="text" value={formData.pharmaDrug} onChange={(e) => set('pharmaDrug', e.target.value)} placeholder="Dipyridamole, Adenosine..." /></div>
                  <div className="form-group"><label>Dose</label><input type="text" value={formData.pharmaDose} onChange={(e) => set('pharmaDose', e.target.value)} /></div>
                </div>
              )}
            </div>

            {/* Vitals table */}
            <div className="sheet-subsection">
              <div className="subsection-title">Vitals Monitoring</div>
              <div className="history-table-wrapper">
                <table className="history-table">
                  <thead><tr><th>Stage</th><th>Time</th><th>Pulse</th><th>BP</th><th>ECG</th><th>Notes</th></tr></thead>
                  <tbody>
                    {formData.vitalsTable.map((row, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{row.label}</td>
                        <td><input type="text" className="touch-input" value={row.time} onChange={(e) => setVitals(i, 'time', e.target.value)} style={{ width: 80 }} /></td>
                        <td><input type="text" className="touch-input" value={row.pulse} onChange={(e) => setVitals(i, 'pulse', e.target.value)} style={{ width: 70 }} /></td>
                        <td><input type="text" className="touch-input" value={row.bp} onChange={(e) => setVitals(i, 'bp', e.target.value)} style={{ width: 80 }} /></td>
                        <td><input type="text" className="touch-input" value={row.ecg} onChange={(e) => setVitals(i, 'ecg', e.target.value)} style={{ width: 90 }} /></td>
                        <td><input type="text" className="touch-input" value={row.notes} onChange={(e) => setVitals(i, 'notes', e.target.value)} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Procedure symptoms */}
            <div className="form-group">
              <label>Symptoms During Procedure</label>
              <ChipGroup field="procedureSymptoms" options={SYMPTOM_OPTIONS} />
            </div>

            <div className="sheet-row">
              <div className="form-group"><label>NM Physician</label><input type="text" value={formData.nmPhysician} onChange={(e) => set('nmPhysician', e.target.value)} /></div>
              <div className="form-group"><label>Cardiologist</label><input type="text" value={formData.cardiologist} onChange={(e) => set('cardiologist', e.target.value)} /></div>
            </div>

            {/* Tracer box */}
            <div className="sheet-subsection">
              <div className="subsection-title">Tracer</div>
              <div className="sheet-row">
                <div className="form-group"><label>Tracer</label><input type="text" value={formData.tracer} onChange={(e) => set('tracer', e.target.value)} placeholder="Tc-99m Sestamibi, Tl-201..." /></div>
                <div className="form-group">
                  <label>Injected Dose</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <><input type="number" step="any" value={formData.tracerDoseMCi} onChange={(e) => set('tracerDoseMCi', e.target.value)} placeholder="25" style={{ width: 100 }} /><Prev k="tracerDoseMCi" /></>
                    <span className="dose-unit">mCi</span>
                    {mbq && <span className="dose-mbq unit-hint">= {mbq} MBq</span>}
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
                <div className="form-group"><label>Acquisition Time</label><input type="datetime-local" value={formData.acquisitionTime} onChange={(e) => set('acquisitionTime', e.target.value)} /></div>
                <div className="form-group"><label>Technician / Physicist</label><input type="text" value={formData.technicianPhysicist} onChange={(e) => set('technicianPhysicist', e.target.value)} /></div>
              </div>

              <div className="form-group"><label>More Acquisition</label><textarea rows={2} value={formData.moreAcquisition} onChange={(e) => set('moreAcquisition', e.target.value)} placeholder="Additional views / delayed images..." /></div>
            </div>
          </div>

          <AdminDoneFooter stage="tech" label="Technical" done={admin.progress.tech} disabled={!admin.progress.nurse} advancing={admin.advancing} onClick={() => admin.advance('Pending_Report', 'tech')} />

          {/* ── RESULTS SECTION ── */}
          <div className="sheet-section results-section">
            <div className="section-role-badge results-badge">Results</div>

            <div className="form-group"><label>Impression</label><textarea rows={4} value={formData.impression} onChange={(e) => set('impression', e.target.value)} /></div>
            <div className="form-group"><label>Physician Notes</label><textarea rows={2} value={formData.physicianNotes} onChange={(e) => set('physicianNotes', e.target.value)} /></div>
            <div className="form-group"><label>Technician Notes</label><textarea rows={2} value={formData.technicianNotes} onChange={(e) => set('technicianNotes', e.target.value)} /></div>

            <AdminReportFooter admin={admin} />
          </div>
          </>)}
        </form>
      )}

      {/* History */}
      {selectedPatient && (
        <div className="history-section">
          <h3><FileText size={18} />Cardiac MPI History ({history.length})</h3>
          {historyLoading ? (
            <div className="loading-state"><Loader2 size={24} className="spin" />Loading...</div>
          ) : history.length === 0 ? (
            <div className="empty-state">No previous cardiac scans recorded.</div>
          ) : (
            <div className="history-table-wrapper">
              <table className="history-table">
                <thead><tr><th>Date</th><th>Diagnosis</th><th>Tracer</th><th>Status</th><th>Impression</th><th></th></tr></thead>
                <tbody>
                  {history.map((entry) => (
                    <React.Fragment key={entry.id}>
                      <tr>
                        <td>{entry.createdAt ? format(new Date(entry.createdAt), 'dd MMM yyyy') : '—'}</td>
                        <td>{entry.diagnosis || '—'}</td>
                        <td>{entry.tracer || '—'}</td>
                        <td>{entry.workflowStatus === 'Completed' ? <span className="status-badge status-completed">Completed</span> : <span className="status-badge status-pending">{entry.workflowStatus?.replace('Pending_', '')}</span>}</td>
                        <td className="impression-cell">{entry.impression ? entry.impression.slice(0, 60) + (entry.impression.length > 60 ? '…' : '') : '—'}</td>
                        <td><button className="btn-icon" onClick={() => setExpandedRow(expandedRow === entry.id ? null : entry.id)}>{expandedRow === entry.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button></td>
                      </tr>
                      {expandedRow === entry.id && (
                        <tr className="detail-row"><td colSpan={6}>
                          <div className="detail-content">
                            <div className="detail-grid">
                              <div className="detail-item"><span className="detail-label">Dose:</span><span>{entry.tracerDoseMCi != null ? `${entry.tracerDoseMCi} mCi` : '—'}</span></div>
                              <div className="detail-item"><span className="detail-label">NM Physician:</span><span>{entry.nmPhysician || '—'}</span></div>
                              <div className="detail-item"><span className="detail-label">Cardiologist:</span><span>{entry.cardiologist || '—'}</span></div>
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

export default ScanCardiac;
