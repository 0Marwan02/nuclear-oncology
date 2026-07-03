import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, FileText, Bone, Loader2, CheckCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { createScan, getScanHistory, apiFetch } from '../utils/api';
import { useScanRole, useAdminWorkflow, DoctorActionFooter, AdminDoneFooter, AdminReportFooter, RoleCreateNotice } from '../utils/scanSheet';
import { usePrevHint } from '../components/PrevField';
import './ScanThyroid.css';

const MCi_TO_MBq = 37;
const getToday = () => new Date().toISOString().split('T')[0];

const emptyForm = () => ({
  // Doctor
  indication: '',
  complaint: '',
  painSite: '',
  painOnset: '',
  painCourse: '',
  primaryCancer: '',
  // Contraception
  contraceptiveStatus: '',
  lmpDate: '',
  // Surgery
  surgeryHistory: '',
  surgeryDate: '',
  // Chemo
  chemoYn: false,
  chemoSessions: '',
  chemoLastCycle: '',
  // Radio
  radioYn: false,
  radioSite: '',
  radioSessions: '',
  radioLastSession: '',
  // G-CSF
  gcsfGiven: false,
  gcsfLastDate: '',
  // Bone prosthesis
  boneProthesisYn: false,
  boneProthesisSite: '',
  boneProthesisDate: '',
  // Trauma
  traumaYn: false,
  traumaSite: '',
  traumaDate: '',
  // Labs
  labDate: '',
  tumorMarkerName: '',
  tumorMarkerValue: '',
  // Imaging
  ctMriDate: '',
  ctMriSite: '',
  prevBoneScanDate: '',
  prevBoneScanSite: '',
  othersDate: '',
  othersSite: '',
  // Nurse
  prepWeight: '',
  prepHeight: '',
  prepBloodGlucose: '',
  injectionSide: 'RT',
  injectionLimb: 'hand',
  prepNurseNotes: '',
  // Tech
  tc99mDoseMCi: '',
  injectionTime: '',
  scanTime: '',
  delayedImages: false,
  delayedImagesNotes: '',
  uptakeTime: '',
  // Results
  skeletalMetastasis: false,
  metastasisLocations: '',
  extraosseousUptake: false,
  extraosseousLocations: '',
  renalVisualization: true,
  degenerativeChanges: false,
  traumaSites: '',
  impression: '',
  physicianNotes: '',
});

const ScanBone = () => {
  const TODAY = getToday(); // fresh per render so the max-date never goes stale overnight
  const [searchParams] = useSearchParams();
  const { isAdmin, canCreate } = useScanRole();
  const admin = useAdminWorkflow('bone');
  const [patients, setPatients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const Prev = usePrevHint('bone', selectedPatient?.id); // per-field previous-visit hints

  // Auto-populate patient from ?patientId URL param
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
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
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
      getScanHistory('bone', selectedPatient.id)
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

  const injectionSite = `${formData.injectionSide} ${formData.injectionLimb}`;
  const mbq = formData.tc99mDoseMCi
    ? (parseFloat(formData.tc99mDoseMCi) * MCi_TO_MBq).toFixed(0)
    : '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isAdmin && admin.progress.doctor) return;
    setError('');
    setSuccess('');
    if (!selectedPatient) { setError('Please select a patient first'); return; }

    setSubmitting(true);
    try {
      const payload = {
        patientId: selectedPatient.id,
        indication: formData.indication,
        complaint: formData.complaint,
        primaryCancer: formData.primaryCancer,
        contraceptiveStatus: formData.contraceptiveStatus || null,
        lmpDate: formData.lmpDate || null,
        surgeryHistory: formData.surgeryHistory || null,
        surgeryDate: formData.surgeryDate || null,
        chemoYn: formData.chemoYn,
        chemoSessions: formData.chemoSessions ? parseInt(formData.chemoSessions) : null,
        chemoLastCycle: formData.chemoLastCycle || null,
        radioYn: formData.radioYn,
        radioSite: formData.radioSite || null,
        radioSessions: formData.radioSessions ? parseInt(formData.radioSessions) : null,
        radioLastSession: formData.radioLastSession || null,
        gcsfGiven: formData.gcsfGiven,
        gcsfLastDate: formData.gcsfLastDate || null,
        boneProthesisYn: formData.boneProthesisYn,
        boneProthesisSite: formData.boneProthesisSite || null,
        boneProthesisDate: formData.boneProthesisDate || null,
        traumaYn: formData.traumaYn,
        traumaSite: formData.traumaSite || null,
        traumaDate: formData.traumaDate || null,
        labDate: formData.labDate || null,
        tumorMarkerName: formData.tumorMarkerName || null,
        tumorMarkerValue: formData.tumorMarkerValue ? parseFloat(formData.tumorMarkerValue) : null,
        ctMriDate: formData.ctMriDate || null,
        ctMriFindings: formData.ctMriSite || null,
        prevBoneScanDate: formData.prevBoneScanDate || null,
        prevBoneScanFindings: formData.prevBoneScanSite || null,
        othersDate: formData.othersDate || null,
        othersSite: formData.othersSite || null,
        prepWeight: formData.prepWeight ? parseFloat(formData.prepWeight) : null,
        prepHeight: formData.prepHeight ? parseFloat(formData.prepHeight) : null,
        prepBloodGlucose: formData.prepBloodGlucose ? parseFloat(formData.prepBloodGlucose) : null,
        injectionSite,
        prepNurseNotes: formData.prepNurseNotes || null,
        tc99mDoseMCi: parseFloat(formData.tc99mDoseMCi),
        injectionTime: formData.injectionTime || null,
        scanTime: formData.scanTime || null,
        uptakeTime: formData.uptakeTime ? parseInt(formData.uptakeTime) : null,
        delayedImages: formData.delayedImages,
        delayedImagesNotes: formData.delayedImagesNotes || null,
        skeletalMetastasis: formData.skeletalMetastasis,
        metastasisLocations: formData.metastasisLocations || null,
        extraosseousUptake: formData.extraosseousUptake,
        extraosseousLocations: formData.extraosseousLocations || null,
        renalVisualization: formData.renalVisualization,
        degenerativeChanges: formData.degenerativeChanges,
        traumaSites: formData.traumaSites || null,
        impression: formData.impression || null,
        physicianNotes: formData.physicianNotes || null,
        workflowStatus: 'Pending_Nurse',
      };

      const result = await createScan('bone', payload);
      if (isAdmin) {
        admin.onCreated(result.id);
        setSuccess('Record created. Use the section buttons below to advance each stage.');
      } else {
        setSuccess('Bone Scan record created — sent to nurse.');
        setFormData(emptyForm());
        setSelectedPatient(null);
      }
      setHistoryLoading(true);
      getScanHistory('bone', selectedPatient.id)
        .then((d) => setHistory(Array.isArray(d) ? d : []))
        .finally(() => setHistoryLoading(false));
    } catch (err) {
      setError(err.message || 'Failed to save record');
    } finally {
      setSubmitting(false);
    }
  };

  const isFemale = selectedPatient?.gender?.toLowerCase() === 'female';

  return (
    <div className="scan-page">
      {/* Header */}
      <div className="scan-header">
        <div className="scan-header-icon" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}>
          <Bone size={28} />
        </div>
        <div>
          <h1>Bone Scan</h1>
          <p className="scan-subtitle">Tc-99m MDP — Dynamic / Static</p>
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
            {selectedPatient && (
              <button className="clear-search" onClick={() => { setSelectedPatient(null); setSearchQuery(''); setHistory([]); }}>✕</button>
            )}
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
                {selectedPatient.birthDate && (
                  <span className="tag tag-gray">DOB: {format(new Date(selectedPatient.birthDate), 'dd/MM/yyyy')}</span>
                )}
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
                <><input type="text" value={formData.indication} onChange={(e) => set('indication', e.target.value)} placeholder="e.g., staging, follow-up..." /><Prev k="indication" /></>
              </div>
              <div className="form-group flex-2">
                <label>Diagnosis / Primary Tumor</label>
                <><input type="text" value={formData.primaryCancer} onChange={(e) => set('primaryCancer', e.target.value)} placeholder="e.g., Breast cancer..." /><Prev k="primaryCancer" /></>
              </div>
            </div>

            <div className="form-group">
              <label>Bone Pain — site / onset / course / duration / change ↑↓</label>
              <><textarea rows={2} value={formData.complaint} onChange={(e) => set('complaint', e.target.value)} placeholder="Describe pain characteristics..." /><Prev k="complaint" /></>
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

            {/* Previous Surgery */}
            <div className="sheet-subsection">
              <div className="sheet-row">
                <div className="form-group flex-2">
                  <label>Previous Surgery</label>
                  <><input type="text" value={formData.surgeryHistory} onChange={(e) => set('surgeryHistory', e.target.value)} placeholder="Describe surgery..." /><Prev k="surgeryHistory" /></>
                </div>
                <div className="form-group">
                  <label>Date</label>
                  <><input type="date" max={TODAY} value={formData.surgeryDate} onChange={(e) => set('surgeryDate', e.target.value)} /><Prev k="surgeryDate" /></>
                </div>
              </div>
            </div>

            {/* Chemotherapy */}
            <div className="sheet-subsection">
              <div className="subsection-title">Chemotherapy (CTH)</div>
              <div className="sheet-row" style={{ alignItems: 'center' }}>
                <div className="radio-group">
                  <button type="button" className={`radio-chip${!formData.chemoYn ? ' active' : ''}`} onClick={() => set('chemoYn', false)}>No</button>
                  <button type="button" className={`radio-chip${formData.chemoYn ? ' active' : ''}`} onClick={() => set('chemoYn', true)}>Yes</button>
                </div>
                {formData.chemoYn && (
                  <>
                    <div className="form-group">
                      <label>Sessions</label>
                      <><input type="number" value={formData.chemoSessions} onChange={(e) => set('chemoSessions', e.target.value)} placeholder="#" style={{ width: 80 }} /><Prev k="chemoSessions" /></>
                    </div>
                    <div className="form-group">
                      <label>Last Cycle</label>
                      <><input type="date" max={TODAY} value={formData.chemoLastCycle} onChange={(e) => set('chemoLastCycle', e.target.value)} /><Prev k="chemoLastCycle" /></>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Radiotherapy */}
            <div className="sheet-subsection">
              <div className="subsection-title">Radiotherapy (RTH)</div>
              <div className="sheet-row" style={{ alignItems: 'center' }}>
                <div className="radio-group">
                  <button type="button" className={`radio-chip${!formData.radioYn ? ' active' : ''}`} onClick={() => set('radioYn', false)}>No</button>
                  <button type="button" className={`radio-chip${formData.radioYn ? ' active' : ''}`} onClick={() => set('radioYn', true)}>Yes</button>
                </div>
                {formData.radioYn && (
                  <>
                    <div className="form-group flex-2">
                      <label>Site</label>
                      <><input type="text" value={formData.radioSite} onChange={(e) => set('radioSite', e.target.value)} placeholder="Irradiated site..." /><Prev k="radioSite" /></>
                    </div>
                    <div className="form-group">
                      <label>Sessions</label>
                      <><input type="number" value={formData.radioSessions} onChange={(e) => set('radioSessions', e.target.value)} style={{ width: 80 }} /><Prev k="radioSessions" /></>
                    </div>
                    <div className="form-group">
                      <label>Last Session</label>
                      <><input type="date" max={TODAY} value={formData.radioLastSession} onChange={(e) => set('radioLastSession', e.target.value)} /><Prev k="radioLastSession" /></>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* G-CSF */}
            <div className="sheet-subsection">
              <div className="sheet-row" style={{ alignItems: 'center' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)', minWidth: 120 }}>G-CSF Given</span>
                <div className="radio-group">
                  <button type="button" className={`radio-chip${!formData.gcsfGiven ? ' active' : ''}`} onClick={() => set('gcsfGiven', false)}>No</button>
                  <button type="button" className={`radio-chip${formData.gcsfGiven ? ' active' : ''}`} onClick={() => set('gcsfGiven', true)}>Yes</button>
                </div>
                {formData.gcsfGiven && (
                  <div className="form-group">
                    <label>Last Done</label>
                    <><input type="date" max={TODAY} value={formData.gcsfLastDate} onChange={(e) => set('gcsfLastDate', e.target.value)} /><Prev k="gcsfLastDate" /></>
                  </div>
                )}
              </div>
            </div>

            {/* Bone Prosthesis */}
            <div className="sheet-subsection">
              <div className="sheet-row" style={{ alignItems: 'center' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)', minWidth: 150 }}>Bone Surgery / Prosthesis</span>
                <div className="radio-group">
                  <button type="button" className={`radio-chip${!formData.boneProthesisYn ? ' active' : ''}`} onClick={() => set('boneProthesisYn', false)}>No</button>
                  <button type="button" className={`radio-chip${formData.boneProthesisYn ? ' active' : ''}`} onClick={() => set('boneProthesisYn', true)}>Yes</button>
                </div>
                {formData.boneProthesisYn && (
                  <>
                    <div className="form-group flex-2">
                      <label>Site</label>
                      <><input type="text" value={formData.boneProthesisSite} onChange={(e) => set('boneProthesisSite', e.target.value)} /><Prev k="boneProthesisSite" /></>
                    </div>
                    <div className="form-group">
                      <label>Date</label>
                      <><input type="date" max={TODAY} value={formData.boneProthesisDate} onChange={(e) => set('boneProthesisDate', e.target.value)} /><Prev k="boneProthesisDate" /></>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Trauma */}
            <div className="sheet-subsection">
              <div className="sheet-row" style={{ alignItems: 'center' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)', minWidth: 150 }}>Bone Fracture / Trauma</span>
                <div className="radio-group">
                  <button type="button" className={`radio-chip${!formData.traumaYn ? ' active' : ''}`} onClick={() => set('traumaYn', false)}>No</button>
                  <button type="button" className={`radio-chip${formData.traumaYn ? ' active' : ''}`} onClick={() => set('traumaYn', true)}>Yes</button>
                </div>
                {formData.traumaYn && (
                  <>
                    <div className="form-group flex-2">
                      <label>Site</label>
                      <><input type="text" value={formData.traumaSite} onChange={(e) => set('traumaSite', e.target.value)} /><Prev k="traumaSite" /></>
                    </div>
                    <div className="form-group">
                      <label>Date</label>
                      <><input type="date" max={TODAY} value={formData.traumaDate} onChange={(e) => set('traumaDate', e.target.value)} /><Prev k="traumaDate" /></>
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
                  <label>Labs Date</label>
                  <><input type="date" max={TODAY} value={formData.labDate} onChange={(e) => set('labDate', e.target.value)} /><Prev k="labDate" /></>
                </div>
                <div className="form-group flex-2">
                  <label>Tumor Marker Name</label>
                  <><input type="text" value={formData.tumorMarkerName} onChange={(e) => set('tumorMarkerName', e.target.value)} placeholder="e.g., CA 15-3, PSA..." /><Prev k="tumorMarkerName" /></>
                </div>
                <div className="form-group">
                  <label>Value</label>
                  <><input type="number" step="any" value={formData.tumorMarkerValue} onChange={(e) => set('tumorMarkerValue', e.target.value)} /><Prev k="tumorMarkerValue" /></>
                </div>
              </div>

              <div className="sheet-row">
                <div className="form-group">
                  <label>CT / MRI Date</label>
                  <><input type="date" max={TODAY} value={formData.ctMriDate} onChange={(e) => set('ctMriDate', e.target.value)} /><Prev k="ctMriDate" /></>
                </div>
                <div className="form-group flex-2">
                  <label>CT / MRI Site</label>
                  <><input type="text" value={formData.ctMriSite} onChange={(e) => set('ctMriSite', e.target.value)} placeholder="Brain / chest / abdomen..." /><Prev k="ctMriSite" /></>
                </div>
              </div>

              <div className="sheet-row">
                <div className="form-group">
                  <label>Prev. Bone Scan Date</label>
                  <><input type="date" max={TODAY} value={formData.prevBoneScanDate} onChange={(e) => set('prevBoneScanDate', e.target.value)} /><Prev k="prevBoneScanDate" /></>
                </div>
                <div className="form-group flex-2">
                  <label>Site</label>
                  <><input type="text" value={formData.prevBoneScanSite} onChange={(e) => set('prevBoneScanSite', e.target.value)} /><Prev k="prevBoneScanSite" /></>
                </div>
              </div>

              <div className="sheet-row">
                <div className="form-group">
                  <label>Others Date</label>
                  <><input type="date" max={TODAY} value={formData.othersDate} onChange={(e) => set('othersDate', e.target.value)} /><Prev k="othersDate" /></>
                </div>
                <div className="form-group flex-2">
                  <label>Others Site</label>
                  <><input type="text" value={formData.othersSite} onChange={(e) => set('othersSite', e.target.value)} /><Prev k="othersSite" /></>
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
              <><textarea rows={2} value={formData.prepNurseNotes} onChange={(e) => set('prepNurseNotes', e.target.value)} placeholder="Any prep notes..." /><Prev k="prepNurseNotes" /></>
            </div>
          </div>

          <AdminDoneFooter stage="nurse" label="Nurse" done={admin.progress.nurse} disabled={!admin.progress.doctor} advancing={admin.advancing} onClick={() => admin.advance('Pending_Technical', 'nurse')} />

          {/* ── TECHNICIAN SECTION ── */}
          <div className="sheet-section tech-section">
            <div className="section-role-badge tech-badge">Technician</div>

            {/* Dose */}
            <div className="dose-input-row">
              <div className="form-group">
                <label>Injected Dose <span className="required-star">*</span></label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <><input type="number" step="any" value={formData.tc99mDoseMCi} onChange={(e) => set('tc99mDoseMCi', e.target.value)} placeholder="20" style={{ width: 100 }} /><Prev k="tc99mDoseMCi" /></>
                  <span className="dose-unit">mCi</span>
                  {mbq && <span className="dose-mbq">= {mbq} MBq</span>}
                </div>
              </div>
            </div>

            {/* Injection site */}
            <div className="form-group">
              <label>Site of Injection</label>
              <div className="injection-site-picker">
                <div className="site-group">
                  {['RT', 'LT'].map((s) => (
                    <button key={s} type="button"
                      className={`site-chip${formData.injectionSide === s ? ' active' : ''}`}
                      onClick={() => set('injectionSide', s)}>{s}</button>
                  ))}
                </div>
                <div className="site-group">
                  {['hand', 'foot', 'forearm'].map((l) => (
                    <button key={l} type="button"
                      className={`site-chip${formData.injectionLimb === l ? ' active' : ''}`}
                      onClick={() => set('injectionLimb', l)}>{l}</button>
                  ))}
                </div>
              </div>
            </div>

            <div className="sheet-row">
              <div className="form-group">
                <label>Time of Injection</label>
                <><input type="datetime-local" value={formData.injectionTime} onChange={(e) => set('injectionTime', e.target.value)} /><Prev k="injectionTime" /></>
              </div>
              <div className="form-group">
                <label>Time of Acquisition</label>
                <><input type="datetime-local" value={formData.scanTime} onChange={(e) => set('scanTime', e.target.value)} /><Prev k="scanTime" /></>
              </div>
              <div className="form-group">
                <label>Uptake Time <span className="unit">min</span></label>
                <><input type="number" value={formData.uptakeTime} onChange={(e) => set('uptakeTime', e.target.value)} placeholder="180" style={{ width: 90 }} /><Prev k="uptakeTime" /></>
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
                  placeholder="Describe additional acquisition details..." />
              )}
            </div>
          </div>

          <AdminDoneFooter stage="tech" label="Technical" done={admin.progress.tech} disabled={!admin.progress.nurse} advancing={admin.advancing} onClick={() => admin.advance('Pending_Report', 'tech')} />

          {/* ── RESULTS SECTION ── */}
          <div className="sheet-section results-section">
            <div className="section-role-badge results-badge">Results</div>

            <div className="sheet-row">
              <label className="checkbox-label">
                <><input type="checkbox" checked={formData.skeletalMetastasis} onChange={(e) => set('skeletalMetastasis', e.target.checked)} /><Prev k="skeletalMetastasis" /></>
                <span>Skeletal Metastasis</span>
              </label>
              <label className="checkbox-label">
                <><input type="checkbox" checked={formData.extraosseousUptake} onChange={(e) => set('extraosseousUptake', e.target.checked)} /><Prev k="extraosseousUptake" /></>
                <span>Extraosseous Uptake</span>
              </label>
              <label className="checkbox-label">
                <><input type="checkbox" checked={formData.renalVisualization} onChange={(e) => set('renalVisualization', e.target.checked)} /><Prev k="renalVisualization" /></>
                <span>Renal Visualization</span>
              </label>
              <label className="checkbox-label">
                <><input type="checkbox" checked={formData.degenerativeChanges} onChange={(e) => set('degenerativeChanges', e.target.checked)} /><Prev k="degenerativeChanges" /></>
                <span>Degenerative Changes</span>
              </label>
            </div>

            {formData.skeletalMetastasis && (
              <div className="form-group mt-8">
                <label>Metastasis Locations</label>
                <><textarea rows={2} value={formData.metastasisLocations} onChange={(e) => set('metastasisLocations', e.target.value)} placeholder="Skull / spine / ribs / pelvis / femur..." /><Prev k="metastasisLocations" /></>
              </div>
            )}
            {formData.extraosseousUptake && (
              <div className="form-group mt-8">
                <label>Extraosseous Locations</label>
                <><textarea rows={2} value={formData.extraosseousLocations} onChange={(e) => set('extraosseousLocations', e.target.value)} /><Prev k="extraosseousLocations" /></>
              </div>
            )}

            <div className="form-group mt-8">
              <label>Trauma Sites</label>
              <><input type="text" value={formData.traumaSites} onChange={(e) => set('traumaSites', e.target.value)} placeholder="e.g., Rt tibia fracture site..." /><Prev k="traumaSites" /></>
            </div>

            <div className="form-group mt-8">
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
          <h3><FileText size={18} />Bone Scan History ({history.length})</h3>
          {historyLoading ? (
            <div className="loading-state"><Loader2 size={24} className="spin" />Loading...</div>
          ) : history.length === 0 ? (
            <div className="empty-state">No previous bone scans recorded.</div>
          ) : (
            <div className="history-table-wrapper">
              <table className="history-table">
                <thead>
                  <tr><th>Date</th><th>Cancer Type</th><th>Dose (mCi)</th><th>Skeletal Mets</th><th>Impression</th><th></th></tr>
                </thead>
                <tbody>
                  {history.map((entry) => (
                    <React.Fragment key={entry.id}>
                      <tr>
                        <td>{entry.createdAt ? format(new Date(entry.createdAt), 'dd MMM yyyy') : '—'}</td>
                        <td>{entry.primaryCancer || '—'}</td>
                        <td>{entry.tc99mDoseMCi ?? '—'}</td>
                        <td>{entry.skeletalMetastasis ? <span className="status-badge status-cancelled">Yes</span> : <span className="status-badge status-completed">No</span>}</td>
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
                                <div className="detail-item"><span className="detail-label">Isotope:</span><span>Tc-99m MDP</span></div>
                                <div className="detail-item"><span className="detail-label">Dose:</span><span>{entry.tc99mDoseMCi} mCi / {entry.tc99mDoseMCi ? (entry.tc99mDoseMCi * 37).toFixed(0) : '—'} MBq</span></div>
                                <div className="detail-item"><span className="detail-label">Chemo:</span><span>{entry.chemoYn ? `Yes (${entry.chemoSessions ?? '?'} sessions)` : 'No'}</span></div>
                                <div className="detail-item"><span className="detail-label">Radio:</span><span>{entry.radioYn ? `Yes — ${entry.radioSite || '?'}` : 'No'}</span></div>
                                <div className="detail-item"><span className="detail-label">G-CSF:</span><span>{entry.gcsfGiven ? 'Yes' : 'No'}</span></div>
                                <div className="detail-item"><span className="detail-label">Renal vis.:</span><span>{entry.renalVisualization ? 'Yes' : 'No'}</span></div>
                              </div>
                              {entry.metastasisLocations && <div className="detail-text"><strong>Metastasis Locations:</strong><p>{entry.metastasisLocations}</p></div>}
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

export default ScanBone;
