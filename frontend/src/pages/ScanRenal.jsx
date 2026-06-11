import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, FileText, Droplets, Loader2, CheckCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
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
  complaintDuration: '',
  diagnosis: '',
  // Symptoms
  symRtLoinPain: false,
  symLtLoinPain: false,
  symFever: false,
  symBurningMict: false,
  symUrineColor: false,
  symHaematuria: false,
  // PMH
  htn: false,
  dm: false,
  contraceptiveStatus: '',
  lmpDate: '',
  // Surgery
  surgeryHistory: '',
  surgeryDate: '',
  // Dialysis
  dialysisYn: false,
  dialysisDuration: '',
  dialysisPerWeek: '',
  // Investigations
  abdominalUsDate: '',
  ctMriDate: '',
  kidneyFunctionDate: '',
  urea: '',
  creatinine: '',
  pusCells: '',
  rbc: '',
  specificGravity: '',
  turbidity: '',
  prevRenalScanDate: '',
  // Nurse
  prepWeight: '',
  prepHeight: '',
  prepBloodGlucose: '',
  injectionSide: 'RT',
  injectionLimb: 'hand',
  prepNurseNotes: '',
  // Tech — scan type selector
  scanType: 'DTPA',
  // DMSA column
  dmsaDoseMCi: '',
  dmsaInjectionTime: '',
  dmsaScanTime: '',
  // DTPA column
  dtpaDoseMCi: '',
  dtpaInjectionTime: '',
  dtpaScanTime: '',
  // DTPA extras
  furosemideGiven: false,
  furosemideTime: '',
  aceInhibitorGiven: false,
  delayedImages: false,
  delayedImagesNotes: '',
  // Results
  rightKidneyGFR: '',
  leftKidneyGFR: '',
  rightSplitFunction: '',
  leftSplitFunction: '',
  rightT1_2: '',
  leftT1_2: '',
  rightTmax: '',
  leftTmax: '',
  obstructionSign: false,
  refluxSign: false,
  corticalScarring: false,
  impression: '',
  physicianNotes: '',
});

const ScanRenal = () => {
  const TODAY = getToday(); // fresh per render so the max-date never goes stale overnight
  const [searchParams] = useSearchParams();
  const { isAdmin, canCreate } = useScanRole();
  const admin = useAdminWorkflow('renal');
  const [patients, setPatients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const Prev = usePrevHint('renal', selectedPatient?.id); // per-field previous-visit hints

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
    } else {
      setPatients([]);
    }
  }, [searchQuery]);

  useEffect(() => {
    if (selectedPatient) {
      setHistoryLoading(true);
      getScanHistory('renal', selectedPatient.id)
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
  const isDTPA = formData.scanType === 'DTPA' || formData.scanType === 'Both';
  const isDMSA = formData.scanType === 'DMSA' || formData.scanType === 'Both';

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
        scanType: formData.scanType,
        complaint: formData.complaint || null,
        complaintDuration: formData.complaintDuration || null,
        diagnosis: formData.diagnosis || null,
        symRtLoinPain: formData.symRtLoinPain,
        symLtLoinPain: formData.symLtLoinPain,
        symFever: formData.symFever,
        symBurningMict: formData.symBurningMict,
        symUrineColor: formData.symUrineColor,
        symHaematuria: formData.symHaematuria,
        htn: formData.htn,
        dm: formData.dm,
        contraceptiveStatus: formData.contraceptiveStatus || null,
        lmpDate: formData.lmpDate || null,
        surgeryHistory: formData.surgeryHistory || null,
        surgeryDate: formData.surgeryDate || null,
        dialysisYn: formData.dialysisYn,
        dialysisDuration: formData.dialysisDuration || null,
        dialysisPerWeek: formData.dialysisPerWeek ? parseInt(formData.dialysisPerWeek) : null,
        abdominalUsDate: formData.abdominalUsDate || null,
        ctMriDate: formData.ctMriDate || null,
        kidneyFunctionDate: formData.kidneyFunctionDate || null,
        urea: formData.urea ? parseFloat(formData.urea) : null,
        creatinine: formData.creatinine ? parseFloat(formData.creatinine) : null,
        pusCells: formData.pusCells || null,
        rbc: formData.rbc || null,
        specificGravity: formData.specificGravity || null,
        turbidity: formData.turbidity || null,
        prevRenalScanDate: formData.prevRenalScanDate || null,
        // Nurse
        prepWeight: formData.prepWeight ? parseFloat(formData.prepWeight) : null,
        prepHeight: formData.prepHeight ? parseFloat(formData.prepHeight) : null,
        prepBloodGlucose: formData.prepBloodGlucose ? parseFloat(formData.prepBloodGlucose) : null,
        injectionSite,
        prepNurseNotes: formData.prepNurseNotes || null,
        // Tech — DMSA
        dmsaDoseMCi: formData.dmsaDoseMCi ? parseFloat(formData.dmsaDoseMCi) : null,
        dmsaInjectionTime: formData.dmsaInjectionTime || null,
        dmsaScanTime: formData.dmsaScanTime || null,
        // Tech — DTPA
        dtpaDoseMCi: formData.dtpaDoseMCi ? parseFloat(formData.dtpaDoseMCi) : null,
        dtpaInjectionTime: formData.dtpaInjectionTime || null,
        dtpaScanTime: formData.dtpaScanTime || null,
        furosemideGiven: formData.furosemideGiven,
        furosemideTime: formData.furosemideTime || null,
        aceInhibitorGiven: formData.aceInhibitorGiven,
        delayedImages: formData.delayedImages,
        delayedImagesNotes: formData.delayedImagesNotes || null,
        // Results
        rightKidneyGFR: formData.rightKidneyGFR ? parseFloat(formData.rightKidneyGFR) : null,
        leftKidneyGFR: formData.leftKidneyGFR ? parseFloat(formData.leftKidneyGFR) : null,
        rightSplitFunction: formData.rightSplitFunction ? parseFloat(formData.rightSplitFunction) : null,
        leftSplitFunction: formData.leftSplitFunction ? parseFloat(formData.leftSplitFunction) : null,
        rightT1_2: formData.rightT1_2 ? parseFloat(formData.rightT1_2) : null,
        leftT1_2: formData.leftT1_2 ? parseFloat(formData.leftT1_2) : null,
        rightTmax: formData.rightTmax ? parseFloat(formData.rightTmax) : null,
        leftTmax: formData.leftTmax ? parseFloat(formData.leftTmax) : null,
        obstructionSign: formData.obstructionSign,
        refluxSign: formData.refluxSign,
        corticalScarring: formData.corticalScarring,
        impression: formData.impression || null,
        physicianNotes: formData.physicianNotes || null,
        workflowStatus: 'Pending_Nurse',
      };

      const result = await createScan('renal', payload);
      if (isAdmin) {
        admin.onCreated(result.id);
        setSuccess('Record created. Use the section buttons below to advance each stage.');
      } else {
        setSuccess('Renal scan record created — sent to nurse.');
        setFormData(emptyForm());
      }
      setHistoryLoading(true);
      getScanHistory('renal', selectedPatient.id)
        .then((d) => setHistory(Array.isArray(d) ? d : []))
        .finally(() => setHistoryLoading(false));
    } catch (err) {
      setError(err.message || 'Failed to save record');
    } finally {
      setSubmitting(false);
    }
  };

  const SymptomChip = ({ field, label }) => (
    <button type="button"
      className={`symptom-chip${formData[field] ? ' active' : ''}`}
      onClick={() => set(field, !formData[field])}>
      {formData[field] ? '☑' : '☐'} {label}
    </button>
  );

  return (
    <div className="scan-page">
      {/* Header */}
      <div className="scan-header">
        <div className="scan-header-icon" style={{ background: 'linear-gradient(135deg, #06b6d4 0%, #0284c7 100%)' }}>
          <Droplets size={28} />
        </div>
        <div>
          <h1>Renal Scan</h1>
          <p className="scan-subtitle">Tc-99m DTPA / DMSA</p>
        </div>
      </div>

      {/* Patient selector */}
      <div className="patient-selector-section">
        <h2><Search size={18} />Select Patient</h2>
        <div className="search-wrapper" ref={dropdownRef}>
          <div className="patient-search-input">
            <Search size={18} className="search-icon-input" />
            <input
              type="text"
              placeholder="Search by name or national ID..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setShowDropdown(true); if (selectedPatient && e.target.value !== selectedPatient.name) setSelectedPatient(null); }}
              onFocus={() => setShowDropdown(true)}
            />
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
                <label>Diagnosis</label>
                <><input type="text" value={formData.diagnosis} onChange={(e) => set('diagnosis', e.target.value)} placeholder="e.g., Renal artery stenosis..." /><Prev k="diagnosis" /></>
              </div>
            </div>

            <div className="sheet-row">
              <div className="form-group flex-2">
                <label>Complaint</label>
                <><input type="text" value={formData.complaint} onChange={(e) => set('complaint', e.target.value)} placeholder="Chief complaint..." /><Prev k="complaint" /></>
              </div>
              <div className="form-group">
                <label>Duration</label>
                <><input type="text" value={formData.complaintDuration} onChange={(e) => set('complaintDuration', e.target.value)} placeholder="e.g., 3 months" /><Prev k="complaintDuration" /></>
              </div>
            </div>

            {/* Symptom chips */}
            <div className="form-group">
              <label>Symptoms</label>
              <div className="symptom-grid">
                <SymptomChip field="symRtLoinPain" label="RT Loin Pain" />
                <SymptomChip field="symLtLoinPain" label="LT Loin Pain" />
                <SymptomChip field="symFever" label="Fever" />
                <SymptomChip field="symBurningMict" label="Burning Micturition" />
                <SymptomChip field="symUrineColor" label="Change in Urine Color" />
                <SymptomChip field="symHaematuria" label="Haematuria" />
              </div>
            </div>

            {/* PMH */}
            <div className="sheet-subsection">
              <div className="subsection-title">Past Medical History</div>
              <div className="sheet-row" style={{ alignItems: 'center', gap: 24 }}>
                <label className="checkbox-label">
                  <><input type="checkbox" checked={formData.htn} onChange={(e) => set('htn', e.target.checked)} /><Prev k="htn" /></>
                  <span>HTN</span>
                </label>
                <label className="checkbox-label">
                  <><input type="checkbox" checked={formData.dm} onChange={(e) => set('dm', e.target.checked)} /><Prev k="dm" /></>
                  <span>DM</span>
                </label>
              </div>
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
                  <label>Previous Intervention / Surgery</label>
                  <><input type="text" value={formData.surgeryHistory} onChange={(e) => set('surgeryHistory', e.target.value)} placeholder="Describe..." /><Prev k="surgeryHistory" /></>
                </div>
                <div className="form-group">
                  <label>Date</label>
                  <><input type="date" max={TODAY} value={formData.surgeryDate} onChange={(e) => set('surgeryDate', e.target.value)} /><Prev k="surgeryDate" /></>
                </div>
              </div>
            </div>

            {/* Dialysis */}
            <div className="sheet-subsection">
              <div className="sheet-row" style={{ alignItems: 'center' }}>
                <span style={{ fontWeight: 600, minWidth: 130 }}>Renal Dialysis</span>
                <div className="radio-group">
                  <button type="button" className={`radio-chip${!formData.dialysisYn ? ' active' : ''}`} onClick={() => set('dialysisYn', false)}>No</button>
                  <button type="button" className={`radio-chip${formData.dialysisYn ? ' active' : ''}`} onClick={() => set('dialysisYn', true)}>Yes</button>
                </div>
                {formData.dialysisYn && (
                  <>
                    <div className="form-group">
                      <label>Duration</label>
                      <><input type="text" value={formData.dialysisDuration} onChange={(e) => set('dialysisDuration', e.target.value)} placeholder="e.g., 2 years" style={{ width: 110 }} /><Prev k="dialysisDuration" /></>
                    </div>
                    <div className="form-group">
                      <label>Per week</label>
                      <><input type="number" value={formData.dialysisPerWeek} onChange={(e) => set('dialysisPerWeek', e.target.value)} style={{ width: 70 }} /><Prev k="dialysisPerWeek" /></>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Previous Investigations */}
            <div className="sheet-subsection">
              <div className="subsection-title">Previous Investigations</div>
              <div className="sheet-row">
                <div className="form-group">
                  <label>Abdominal US Date</label>
                  <><input type="date" max={TODAY} value={formData.abdominalUsDate} onChange={(e) => set('abdominalUsDate', e.target.value)} /><Prev k="abdominalUsDate" /></>
                </div>
                <div className="form-group">
                  <label>CT / MRI Date</label>
                  <><input type="date" max={TODAY} value={formData.ctMriDate} onChange={(e) => set('ctMriDate', e.target.value)} /><Prev k="ctMriDate" /></>
                </div>
                <div className="form-group">
                  <label>Previous Renal Scan Date</label>
                  <><input type="date" max={TODAY} value={formData.prevRenalScanDate} onChange={(e) => set('prevRenalScanDate', e.target.value)} /><Prev k="prevRenalScanDate" /></>
                </div>
              </div>

              <div className="sheet-row">
                <div className="form-group">
                  <label>Kidney Function Date</label>
                  <><input type="date" max={TODAY} value={formData.kidneyFunctionDate} onChange={(e) => set('kidneyFunctionDate', e.target.value)} /><Prev k="kidneyFunctionDate" /></>
                </div>
                <div className="form-group">
                  <label>Urea <span className="unit">mg/dL</span></label>
                  <><input type="number" step="any" value={formData.urea} onChange={(e) => set('urea', e.target.value)} /><Prev k="urea" /></>
                </div>
                <div className="form-group">
                  <label>Creatinine <span className="unit">mg/dL</span></label>
                  <><input type="number" step="any" value={formData.creatinine} onChange={(e) => set('creatinine', e.target.value)} /><Prev k="creatinine" /></>
                </div>
              </div>

              <div className="subsection-title" style={{ marginTop: 12 }}>Urine Analysis</div>
              <div className="sheet-row">
                <div className="form-group">
                  <label>Pus Cells</label>
                  <><input type="text" value={formData.pusCells} onChange={(e) => set('pusCells', e.target.value)} placeholder="e.g., 2–5/HPF" /><Prev k="pusCells" /></>
                </div>
                <div className="form-group">
                  <label>Red Blood Cells</label>
                  <><input type="text" value={formData.rbc} onChange={(e) => set('rbc', e.target.value)} placeholder="e.g., 0–2/HPF" /><Prev k="rbc" /></>
                </div>
                <div className="form-group">
                  <label>Specific Gravity</label>
                  <><input type="text" value={formData.specificGravity} onChange={(e) => set('specificGravity', e.target.value)} placeholder="e.g., 1.015" /><Prev k="specificGravity" /></>
                </div>
                <div className="form-group">
                  <label>Turbidity</label>
                  <><input type="text" value={formData.turbidity} onChange={(e) => set('turbidity', e.target.value)} placeholder="Clear / Turbid" /><Prev k="turbidity" /></>
                </div>
              </div>
            </div>
          </div>

          <DoctorActionFooter isAdmin={isAdmin} admin={admin} submitting={submitting} />

          {isAdmin && (<>
          {/* ── NURSE SECTION ── */}
          <div className="sheet-section nurse-section">
            <div className="section-role-badge nurse-badge">Nurse</div>
            <div className="sheet-row">
              <div className="form-group">
                <label>Weight <span className="unit">kg</span></label>
                <><input type="number" step="any" value={formData.prepWeight} onChange={(e) => set('prepWeight', e.target.value)} placeholder="65" /><Prev k="prepWeight" /></>
              </div>
              <div className="form-group">
                <label>Height <span className="unit">cm</span></label>
                <><input type="number" step="any" value={formData.prepHeight} onChange={(e) => set('prepHeight', e.target.value)} placeholder="170" /><Prev k="prepHeight" /></>
              </div>
              <div className="form-group">
                <label>Blood Glucose <span className="unit">mg/dL</span></label>
                <><input type="number" step="any" value={formData.prepBloodGlucose} onChange={(e) => set('prepBloodGlucose', e.target.value)} placeholder="90" /><Prev k="prepBloodGlucose" /></>
              </div>
            </div>
            <div className="form-group">
              <label>Nurse Notes</label>
              <><textarea rows={2} value={formData.prepNurseNotes} onChange={(e) => set('prepNurseNotes', e.target.value)} /><Prev k="prepNurseNotes" /></>
            </div>
          </div>

          <AdminDoneFooter stage="nurse" label="Nurse" done={admin.progress.nurse} disabled={!admin.progress.doctor} advancing={admin.advancing} onClick={() => admin.advance('Pending_Technical', 'nurse')} />

          {/* ── TECHNICIAN SECTION — Dual Columns ── */}
          <div className="sheet-section tech-section">
            <div className="section-role-badge tech-badge">Technician</div>

            {/* Scan type selector */}
            <div className="form-group">
              <label>Scan Type</label>
              <div className="subtype-selector">
                {['DMSA', 'DTPA', 'Both'].map((t) => (
                  <button key={t} type="button"
                    className={`subtype-btn${formData.scanType === t ? ' active' : ''}`}
                    onClick={() => set('scanType', t)}>{t}</button>
                ))}
              </div>
            </div>

            {/* Dual dose columns — DMSA | DTPA */}
            <div className="renal-dual-col">
              {isDMSA && (
                <div className="renal-col">
                  <div className="renal-col-header dmsa-header">DMSA</div>
                  <div className="form-group">
                    <label>Injected Dose</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="number" step="any" value={formData.dmsaDoseMCi}
                        onChange={(e) => set('dmsaDoseMCi', e.target.value)}
                        placeholder="mCi" style={{ width: 90 }} />
                      <span className="dose-unit">mCi</span>
                      {formData.dmsaDoseMCi && <span className="dose-mbq">= {(parseFloat(formData.dmsaDoseMCi) * MCi_TO_MBq).toFixed(0)} MBq</span>}
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Time of Injection</label>
                    <><input type="datetime-local" value={formData.dmsaInjectionTime} onChange={(e) => set('dmsaInjectionTime', e.target.value)} /><Prev k="dmsaInjectionTime" /></>
                  </div>
                  <div className="form-group">
                    <label>Time of Acquisition</label>
                    <><input type="datetime-local" value={formData.dmsaScanTime} onChange={(e) => set('dmsaScanTime', e.target.value)} /><Prev k="dmsaScanTime" /></>
                  </div>
                </div>
              )}

              {isDTPA && (
                <div className="renal-col">
                  <div className="renal-col-header dtpa-header">DTPA</div>
                  <div className="form-group">
                    <label>Injected Dose</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="number" step="any" value={formData.dtpaDoseMCi}
                        onChange={(e) => set('dtpaDoseMCi', e.target.value)}
                        placeholder="mCi" style={{ width: 90 }} />
                      <span className="dose-unit">mCi</span>
                      {formData.dtpaDoseMCi && <span className="dose-mbq">= {(parseFloat(formData.dtpaDoseMCi) * MCi_TO_MBq).toFixed(0)} MBq</span>}
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Time of Injection</label>
                    <><input type="datetime-local" value={formData.dtpaInjectionTime} onChange={(e) => set('dtpaInjectionTime', e.target.value)} /><Prev k="dtpaInjectionTime" /></>
                  </div>
                  <div className="form-group">
                    <label>Time of Acquisition</label>
                    <><input type="datetime-local" value={formData.dtpaScanTime} onChange={(e) => set('dtpaScanTime', e.target.value)} /><Prev k="dtpaScanTime" /></>
                  </div>
                  <div className="sheet-row" style={{ gap: 12, marginTop: 8 }}>
                    <label className="checkbox-label">
                      <><input type="checkbox" checked={formData.furosemideGiven} onChange={(e) => set('furosemideGiven', e.target.checked)} /><Prev k="furosemideGiven" /></>
                      <span>Furosemide</span>
                    </label>
                    {formData.furosemideGiven && (
                      <div className="form-group">
                        <label>Time Given</label>
                        <><input type="datetime-local" value={formData.furosemideTime} onChange={(e) => set('furosemideTime', e.target.value)} /><Prev k="furosemideTime" /></>
                      </div>
                    )}
                    <label className="checkbox-label">
                      <><input type="checkbox" checked={formData.aceInhibitorGiven} onChange={(e) => set('aceInhibitorGiven', e.target.checked)} /><Prev k="aceInhibitorGiven" /></>
                      <span>ACE Inhibitor</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Injection site (shared) */}
            <div className="form-group">
              <label>Site of Injection</label>
              <div className="injection-site-picker">
                <div className="site-group">
                  {['RT', 'LT'].map((s) => (
                    <button key={s} type="button" className={`site-chip${formData.injectionSide === s ? ' active' : ''}`} onClick={() => set('injectionSide', s)}>{s}</button>
                  ))}
                </div>
                <div className="site-group">
                  {['hand', 'foot', 'forearm'].map((l) => (
                    <button key={l} type="button" className={`site-chip${formData.injectionLimb === l ? ' active' : ''}`} onClick={() => set('injectionLimb', l)}>{l}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* More Acquisition */}
            <div className="sheet-subsection">
              <label className="checkbox-label">
                <><input type="checkbox" checked={formData.delayedImages} onChange={(e) => set('delayedImages', e.target.checked)} /><Prev k="delayedImages" /></>
                <span>More Acquisition / Delayed Images</span>
              </label>
              {formData.delayedImages && (
                <textarea rows={2} className="mt-8" value={formData.delayedImagesNotes}
                  onChange={(e) => set('delayedImagesNotes', e.target.value)}
                  placeholder="Describe additional acquisition..." />
              )}
            </div>
          </div>

          <AdminDoneFooter stage="tech" label="Technical" done={admin.progress.tech} disabled={!admin.progress.nurse} advancing={admin.advancing} onClick={() => admin.advance('Pending_Report', 'tech')} />

          {/* ── RESULTS SECTION ── */}
          <div className="sheet-section results-section">
            <div className="section-role-badge results-badge">Results</div>

            <div className="renal-results-grid">
              {[
                { label: 'Right Kidney GFR', field: 'rightKidneyGFR', unit: 'mL/min' },
                { label: 'Left Kidney GFR', field: 'leftKidneyGFR', unit: 'mL/min' },
                { label: 'Right Split Function', field: 'rightSplitFunction', unit: '%' },
                { label: 'Left Split Function', field: 'leftSplitFunction', unit: '%' },
                { label: 'Right T½', field: 'rightT1_2', unit: 'min' },
                { label: 'Left T½', field: 'leftT1_2', unit: 'min' },
                { label: 'Right Tmax', field: 'rightTmax', unit: 'min' },
                { label: 'Left Tmax', field: 'leftTmax', unit: 'min' },
              ].map(({ label, field, unit }) => (
                <div key={field} className="form-group">
                  <label>{label} <span className="unit">{unit}</span></label>
                  <input type="number" step="any" value={formData[field]} onChange={(e) => set(field, e.target.value)} />
                </div>
              ))}
            </div>

            <div className="sheet-row" style={{ marginTop: 12, gap: 24 }}>
              <label className="checkbox-label">
                <><input type="checkbox" checked={formData.obstructionSign} onChange={(e) => set('obstructionSign', e.target.checked)} /><Prev k="obstructionSign" /></>
                <span>Obstruction Sign</span>
              </label>
              <label className="checkbox-label">
                <><input type="checkbox" checked={formData.refluxSign} onChange={(e) => set('refluxSign', e.target.checked)} /><Prev k="refluxSign" /></>
                <span>Reflux Sign</span>
              </label>
              <label className="checkbox-label">
                <><input type="checkbox" checked={formData.corticalScarring} onChange={(e) => set('corticalScarring', e.target.checked)} /><Prev k="corticalScarring" /></>
                <span>Cortical Scarring</span>
              </label>
            </div>

            <div className="form-group mt-12">
              <label>Impression</label>
              <><textarea rows={4} value={formData.impression} onChange={(e) => set('impression', e.target.value)} placeholder="Overall impression..." /><Prev k="impression" /></>
            </div>
            <div className="form-group">
              <label>Physician Notes</label>
              <><textarea rows={2} value={formData.physicianNotes} onChange={(e) => set('physicianNotes', e.target.value)} /><Prev k="physicianNotes" /></>
            </div>

            <AdminReportFooter admin={admin} />
          </div>
          </>)}
        </form>
      )}

      {/* History */}
      {selectedPatient && (
        <div className="history-section">
          <h3><FileText size={18} />Renal Scan History ({history.length})</h3>
          {historyLoading ? (
            <div className="loading-state"><Loader2 size={24} className="spin" />Loading...</div>
          ) : history.length === 0 ? (
            <div className="empty-state">No previous renal scans recorded.</div>
          ) : (
            <div className="history-table-wrapper">
              <table className="history-table">
                <thead>
                  <tr><th>Date</th><th>Type</th><th>GFR Rt/Lt</th><th>Obstruction</th><th>Impression</th><th></th></tr>
                </thead>
                <tbody>
                  {history.map((entry) => (
                    <React.Fragment key={entry.id}>
                      <tr>
                        <td>{entry.createdAt ? format(new Date(entry.createdAt), 'dd MMM yyyy') : '—'}</td>
                        <td>{entry.scanType || '—'}</td>
                        <td>{entry.rightKidneyGFR ?? '—'} / {entry.leftKidneyGFR ?? '—'}</td>
                        <td>{entry.obstructionSign ? <span className="status-badge status-cancelled">Yes</span> : <span className="status-badge status-completed">No</span>}</td>
                        <td className="impression-cell">{entry.impression ? entry.impression.slice(0, 60) + (entry.impression.length > 60 ? '…' : '') : '—'}</td>
                        <td>
                          <button className="btn-icon" onClick={() => setExpandedRow(expandedRow === entry.id ? null : entry.id)}>
                            {expandedRow === entry.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </td>
                      </tr>
                      {expandedRow === entry.id && (
                        <tr className="detail-row">
                          <td colSpan={6}>
                            <div className="detail-content">
                              <div className="detail-grid">
                                <div className="detail-item"><span className="detail-label">DMSA Dose:</span><span>{entry.dmsaDoseMCi ? `${entry.dmsaDoseMCi} mCi` : '—'}</span></div>
                                <div className="detail-item"><span className="detail-label">DTPA Dose:</span><span>{entry.dtpaDoseMCi ? `${entry.dtpaDoseMCi} mCi` : '—'}</span></div>
                                <div className="detail-item"><span className="detail-label">Split Fn Rt/Lt:</span><span>{entry.rightSplitFunction ?? '—'}% / {entry.leftSplitFunction ?? '—'}%</span></div>
                                <div className="detail-item"><span className="detail-label">Urea/Creat:</span><span>{entry.urea ?? '—'} / {entry.creatinine ?? '—'}</span></div>
                                <div className="detail-item"><span className="detail-label">Reflux:</span><span>{entry.refluxSign ? 'Yes' : 'No'}</span></div>
                                <div className="detail-item"><span className="detail-label">Cortical Scarring:</span><span>{entry.corticalScarring ? 'Yes' : 'No'}</span></div>
                              </div>
                              {entry.impression && <div className="detail-text"><strong>Impression:</strong><p>{entry.impression}</p></div>}
                            </div>
                          </td>
                        </tr>
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

export default ScanRenal;
