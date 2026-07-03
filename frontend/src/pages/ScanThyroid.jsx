import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, FileText, Syringe, Calendar, Loader2, CheckCircle, AlertCircle, ChevronDown, ChevronUp, Upload, X, User, Activity, Stethoscope, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { createScan, getScanHistory, apiFetch } from '../utils/api';
import ThyroidDiagram from '../components/ThyroidDiagram';
import ThyroidDiagramViewer from '../components/ThyroidDiagramViewer';
import { useScanRole, useAdminWorkflow, DoctorActionFooter, AdminDoneFooter, AdminReportFooter, RoleCreateNotice } from '../utils/scanSheet';
import { usePrevHint } from '../components/PrevField';
import './ScanThyroid.css';

const MCi_TO_MBq = 37;

const SCAN_SUBTYPES = [
  { value: 'thyroid_scan', label: 'Thyroid Scan (Tc-99m)', isotope: 'Tc-99m', timing: '20 min after injection' },
  { value: 'wbs_diagnostic', label: 'Whole Body Scan — Diagnostic (I-131)', isotope: 'I-131', timing: '48–72 hrs after dose' },
  { value: 'wbs_therapeutic', label: 'Therapeutic WBS (post I-131)', isotope: 'I-131', timing: '1 week after dose' },
];

const THYROTOXIC_SYMPTOMS = [
  { key: 'insomnia', label: 'Insomnia / Irritability / Nervousness' },
  { key: 'palpitation', label: 'Palpitation / Dyspnea' },
  { key: 'exophthalmos_sym', label: 'Exophthalmos / Lacrimation / Redness' },
  { key: 'appetite_up', label: 'Appetite ↑' },
  { key: 'appetite_down', label: 'Appetite ↓' },
  { key: 'weight_up', label: 'Weight ↑' },
  { key: 'weight_down', label: 'Weight ↓' },
  { key: 'fatigue', label: 'Fatigue / Weakness' },
  { key: 'alopecia', label: 'Alopecia / Skin Changes' },
  { key: 'menstrual', label: 'Menstrual History' },
];

const GLAND_POSITIONS = ['Normal', 'High', 'Low', 'Ectopic'];

const getToday = () => new Date().toISOString().split('T')[0];

const emptyForm = () => ({
  scanSubType: 'thyroid_scan',
  // Doctor
  indication: '',
  complaint: '',
  // Symptoms
  symptomFlags: {},
  // Labs
  labDate: '',
  tshLevel: '',
  t3Level: '',
  t4Level: '',
  antibodies: '',
  // Ultrasound
  usDate: '',
  rightLobeSize: '',
  leftLobeSize: '',
  isthmusSize: '',
  // Safety
  contrastCTDate: '',
  // Surgery
  surgicalHistory: '',
  // Medications
  eltroxinDose: '',
  eltroxinStopped: false,
  carbimazoleDose: '',
  carbimazoleStopped: false,
  otherDrugs: '',
  // Social
  familyHistory: '',
  familyHistoryNotes: '',
  smokingHistory: '',
  // Contraception
  contraceptiveStatus: '',
  lmpDate: '',
  numChildren: '',
  youngestChildAge: '',
  // Physical exam
  exophthalmos: '',
  pulseRate: '',
  localRtLobe: '',
  localLtLobe: '',
  // Nurse
  prepWeight: '',
  prepHeight: '',
  prepBloodGlucose: '',
  injectionSide: 'RT',
  injectionLimb: 'hand',
  prepNurseNotes: '',
  // Technician
  isotopeDoseMCi: '',
  injectionTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
  scanTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
  delayedImages: false,
  delayedImagesNotes: '',
  // Results
  withdrawalDays: '',
  rightLobeUptake: '',
  leftLobeUptake: '',
  totalUptake: '',
  glandPosition: '',
  hotNodules: '',
  coldNodules: '',
  diffuseUptake: false,
  heterogeneousUptake: false,
  diagramData: null,
  impression: '',
  physicianNotes: '',
});

const ScanThyroid = () => {
  const TODAY = getToday(); // fresh per render so the max-date never goes stale overnight
  const [searchParams] = useSearchParams();
  const { isAdmin, canCreate } = useScanRole();
  const admin = useAdminWorkflow('thyroid');
  const [patients, setPatients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const Prev = usePrevHint('thyroid', selectedPatient?.id); // per-field previous-visit hints
  const [formData, setFormData] = useState(emptyForm());

  useEffect(() => {
    const pid = searchParams.get('patientId');
    if (pid) apiFetch(`/patients/${pid}`).then(p => { setSelectedPatient(p); setSearchQuery(p.name); }).catch(() => {});
  }, []);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedRow, setExpandedRow] = useState(null);
  const [contrastAlert, setContrastAlert] = useState(false);

  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false);
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  useEffect(() => {
    if (searchQuery.length >= 2) searchPatients();
    else setPatients([]);
  }, [searchQuery]);

  useEffect(() => {
    if (selectedPatient) fetchHistory();
  }, [selectedPatient]);

  // CT contrast safety check
  useEffect(() => {
    if (!formData.contrastCTDate) { setContrastAlert(false); return; }
    const scanDate = new Date();
    const ctDate = new Date(formData.contrastCTDate);
    const weeksAgo = (scanDate - ctDate) / (1000 * 60 * 60 * 24 * 7);
    setContrastAlert(weeksAgo < 6);
  }, [formData.contrastCTDate]);

  const searchPatients = async () => {
    try {
      const data = await apiFetch(`/patients?q=${encodeURIComponent(searchQuery)}`);
      setPatients(Array.isArray(data) ? data : []);
    } catch { setPatients([]); }
  };

  const selectPatient = (patient) => {
    setSelectedPatient(patient);
    setSearchQuery(patient.name);
    setShowDropdown(false);
    setFormData(emptyForm());
    setError('');
    setSuccess('');
    admin.reset(p.id);
  };

  const fetchHistory = async () => {
    if (!selectedPatient?.id) return;
    setHistoryLoading(true);
    try {
      const data = await getScanHistory('thyroid', selectedPatient.id);
      setHistory(Array.isArray(data) ? data : []);
    } catch { setHistory([]); }
    finally { setHistoryLoading(false); }
  };

  const set = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));

  const toggleSymptom = (key) => {
    setFormData((prev) => ({
      ...prev,
      symptomFlags: { ...prev.symptomFlags, [key]: !prev.symptomFlags[key] },
    }));
  };

  const handleDiagramChange = (field, value) => {
    setFormData((prev) => {
      const d = { ...(prev.diagramData || {}), [field]: value };
      const update = { diagramData: d };
      if (field === 'rightLobeUptake') update.rightLobeUptake = value;
      if (field === 'leftLobeUptake') update.leftLobeUptake = value;
      if (field === 'totalUptake') update.totalUptake = value;
      if (field === 'diffuseUptake') update.diffuseUptake = value;
      if (field === 'heterogenousUptake') update.heterogeneousUptake = value;
      return { ...prev, ...update };
    });
  };

  const mbq = formData.isotopeDoseMCi ? (parseFloat(formData.isotopeDoseMCi) * MCi_TO_MBq).toFixed(0) : '';

  const subtype = SCAN_SUBTYPES.find((s) => s.value === formData.scanSubType) || SCAN_SUBTYPES[0];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isAdmin && admin.progress.doctor) return;
    if (!selectedPatient) { setError('Please select a patient first'); return; }
    if (contrastAlert) { setError('Cannot proceed — CT with contrast was done within 6 weeks. Postpone scan.'); return; }

    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const diagramStr = formData.diagramData ? JSON.stringify({
        ...formData.diagramData,
        rightLobeUptake: formData.rightLobeUptake ? parseFloat(formData.rightLobeUptake) : null,
        leftLobeUptake: formData.leftLobeUptake ? parseFloat(formData.leftLobeUptake) : null,
        totalUptake: formData.totalUptake ? parseFloat(formData.totalUptake) : null,
        rightLobeSize: formData.rightLobeSize,
        leftLobeSize: formData.leftLobeSize,
        isthmusSize: formData.isthmusSize,
        glandPosition: formData.glandPosition,
        hotNodules: formData.hotNodules,
        coldNodules: formData.coldNodules,
        diffuseUptake: formData.diffuseUptake,
        heterogenousUptake: formData.heterogeneousUptake,
      }) : null;

      const payload = {
        patientId: selectedPatient.id,
        scanSubType: formData.scanSubType,
        isotopeType: subtype.isotope,
        indication: formData.indication || null,
        complaint: formData.complaint || null,
        symptomFlags: Object.keys(formData.symptomFlags).filter((k) => formData.symptomFlags[k]).join(',') || null,
        labDate: formData.labDate || null,
        tshLevel: formData.tshLevel ? parseFloat(formData.tshLevel) : null,
        t3Level: formData.t3Level ? parseFloat(formData.t3Level) : null,
        t4Level: formData.t4Level ? parseFloat(formData.t4Level) : null,
        antibodies: formData.antibodies || null,
        usDate: formData.usDate || null,
        rightLobeSize: formData.rightLobeSize || null,
        leftLobeSize: formData.leftLobeSize || null,
        isthmusSize: formData.isthmusSize || null,
        contrastCTDate: formData.contrastCTDate || null,
        surgicalHistory: formData.surgicalHistory || null,
        eltroxinDose: formData.eltroxinDose || null,
        eltroxinStopped: formData.eltroxinDose ? formData.eltroxinStopped : null,
        carbimazoleDose: formData.carbimazoleDose || null,
        carbimazoleStopped: formData.carbimazoleDose ? formData.carbimazoleStopped : null,
        otherDrugs: formData.otherDrugs || null,
        familyHistory: formData.familyHistory === 'yes' ? true : formData.familyHistory === 'no' ? false : null,
        familyHistoryNotes: formData.familyHistoryNotes || null,
        smokingHistory: formData.smokingHistory === 'yes' ? true : formData.smokingHistory === 'no' ? false : null,
        contraceptiveStatus: formData.contraceptiveStatus || null,
        lmpDate: formData.lmpDate || null,
        numChildren: formData.numChildren ? parseInt(formData.numChildren) : null,
        youngestChildAge: formData.youngestChildAge ? parseInt(formData.youngestChildAge) : null,
        exophthalmos: formData.exophthalmos === 'yes' ? true : formData.exophthalmos === 'no' ? false : null,
        pulseRate: formData.pulseRate ? parseInt(formData.pulseRate) : null,
        localRtLobe: formData.localRtLobe || null,
        localLtLobe: formData.localLtLobe || null,
        prepWeight: formData.prepWeight ? parseFloat(formData.prepWeight) : null,
        prepHeight: formData.prepHeight ? parseFloat(formData.prepHeight) : null,
        prepBloodGlucose: formData.prepBloodGlucose ? parseFloat(formData.prepBloodGlucose) : null,
        injectionSite: `${formData.injectionSide} ${formData.injectionLimb}`,
        prepNurseNotes: formData.prepNurseNotes || null,
        isotopeDoseMCi: parseFloat(formData.isotopeDoseMCi),
        injectionTime: formData.injectionTime || null,
        scanTime: formData.scanTime || null,
        delayedImages: formData.delayedImages,
        delayedImagesNotes: formData.delayedImagesNotes || null,
        withdrawalDays: formData.withdrawalDays ? parseInt(formData.withdrawalDays) : null,
        rightLobeUptake: formData.rightLobeUptake ? parseFloat(formData.rightLobeUptake) : null,
        leftLobeUptake: formData.leftLobeUptake ? parseFloat(formData.leftLobeUptake) : null,
        totalUptake: formData.totalUptake ? parseFloat(formData.totalUptake) : null,
        glandPosition: formData.glandPosition || null,
        hotNodules: formData.hotNodules || null,
        coldNodules: formData.coldNodules || null,
        diffuseUptake: formData.diffuseUptake,
        heterogenousUptake: formData.heterogeneousUptake,
        diagramData: diagramStr,
        impression: formData.impression || null,
        physicianNotes: formData.physicianNotes || null,
        workflowStatus: 'Pending_Nurse',
      };

      const result = await createScan('thyroid', payload);
      if (isAdmin) {
        admin.onCreated(result.id);
        setSuccess('Record created. Use the section buttons below to advance each stage.');
      } else {
        setSuccess('Thyroid Scan record created — sent to nurse.');
        setFormData(emptyForm());
        setSelectedPatient(null);
      }
      fetchHistory();
    } catch (err) {
      setError(err.message || 'Failed to save record');
    } finally {
      setSubmitting(false);
    }
  };

  const isFemale = selectedPatient?.gender === 'female';

  return (
    <div className="scan-page thyroid-page">
      <div className="scan-header">
        <div className="scan-header-icon thyroid-icon"><Syringe size={28} /></div>
        <div>
          <h1>Thyroid Scan — Nuclear Medicine</h1>
          <p className="scan-subtitle">وحدة الطب النووي — مستشفى أسيوط الجامعي</p>
        </div>
      </div>

      {/* Patient search */}
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

          {/* ── SCAN TYPE ── */}
          <div className="sheet-section sheet-header-section">
            <h3 className="sheet-section-title">Scan Type</h3>
            <div className="subtype-selector">
              {SCAN_SUBTYPES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  className={`subtype-btn ${formData.scanSubType === s.value ? 'active' : ''}`}
                  onClick={() => set('scanSubType', s.value)}
                >
                  <span className="subtype-label">{s.label}</span>
                  <span className="subtype-timing">{s.timing}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── DOCTOR SECTION ── */}
          <div className="sheet-section doctor-section">
            <div className="section-role-badge doctor-badge"><User size={14} />Physician</div>

            {/* Indication */}
            <div className="sheet-row">
              <div className="form-group full-width">
                <label>Indication / Complaint <span className="hint">— onset / course / duration</span></label>
                <><textarea rows={2} placeholder="e.g. Hyperthyroidism — 6 months, progressive, worsening..." value={formData.indication} onChange={(e) => set('indication', e.target.value)} /><Prev k="indication" /></>
              </div>
            </div>

            {/* Thyrotoxic Symptoms */}
            <div className="sheet-subsection">
              <h4 className="subsection-title">Thyrotoxic Symptoms</h4>
              <div className="symptom-grid">
                {THYROTOXIC_SYMPTOMS.map((s) => (
                  <label key={s.key} className={`symptom-chip ${formData.symptomFlags[s.key] ? 'checked' : ''}`}>
                    <input type="checkbox" checked={!!formData.symptomFlags[s.key]} onChange={() => toggleSymptom(s.key)} />
                    {s.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Previous Investigations */}
            <div className="sheet-subsection">
              <h4 className="subsection-title">Previous Investigations</h4>

              <div className="sheet-row">
                <div className="form-group">
                  <label>LABs Date</label>
                  <><input type="date" max={TODAY} value={formData.labDate} onChange={(e) => set('labDate', e.target.value)} /><Prev k="labDate" /></>
                </div>
                <div className="form-group">
                  <label>TSH <span className="unit">(mIU/L)</span></label>
                  <><input type="number" step="any" placeholder="e.g. 0.04" value={formData.tshLevel} onChange={(e) => set('tshLevel', e.target.value)} /><Prev k="tshLevel" /></>
                </div>
                <div className="form-group">
                  <label>T3 <span className="unit">(nmol/L)</span></label>
                  <><input type="number" step="any" placeholder="" value={formData.t3Level} onChange={(e) => set('t3Level', e.target.value)} /><Prev k="t3Level" /></>
                </div>
                <div className="form-group">
                  <label>T4 <span className="unit">(nmol/L)</span></label>
                  <><input type="number" step="any" placeholder="" value={formData.t4Level} onChange={(e) => set('t4Level', e.target.value)} /><Prev k="t4Level" /></>
                </div>
                <div className="form-group">
                  <label>Antibodies <span className="hint">(Anti-TPO / Anti-Tg)</span></label>
                  <><input type="text" placeholder="e.g. Anti-TPO 120 IU/mL" value={formData.antibodies} onChange={(e) => set('antibodies', e.target.value)} /><Prev k="antibodies" /></>
                </div>
              </div>

              <div className="sheet-row">
                <div className="form-group">
                  <label>Neck US Date</label>
                  <><input type="date" max={TODAY} value={formData.usDate} onChange={(e) => set('usDate', e.target.value)} /><Prev k="usDate" /></>
                </div>
                <div className="form-group">
                  <label>RT Lobe <span className="unit">(US findings)</span></label>
                  <><input type="text" placeholder="e.g. 4.5 × 2.0 cm, heterogeneous" value={formData.rightLobeSize} onChange={(e) => set('rightLobeSize', e.target.value)} /><Prev k="rightLobeSize" /></>
                </div>
                <div className="form-group">
                  <label>LT Lobe <span className="unit">(US findings)</span></label>
                  <><input type="text" placeholder="e.g. 4.2 × 1.8 cm, nodule 1.1 cm" value={formData.leftLobeSize} onChange={(e) => set('leftLobeSize', e.target.value)} /><Prev k="leftLobeSize" /></>
                </div>
              </div>

              {/* CT Contrast Safety Check */}
              <div className="sheet-row">
                <div className="form-group">
                  <label>CT Neck with Contrast — Date performed</label>
                  <><input type="date" max={TODAY} value={formData.contrastCTDate} onChange={(e) => set('contrastCTDate', e.target.value)} /><Prev k="contrastCTDate" /></>
                </div>
              </div>
              {contrastAlert && (
                <div className="safety-alert">
                  <AlertTriangle size={16} />
                  <strong>SCAN POSTPONED</strong> — CT with contrast was done within 6 weeks. Iodine from contrast interferes with the scan. Reschedule after 6 weeks from the CT date.
                </div>
              )}
            </div>

            {/* Previous Surgery */}
            <div className="sheet-row">
              <div className="form-group full-width">
                <label>Previous Neck Surgery / FNAC</label>
                <><input type="text" placeholder="e.g. Total thyroidectomy 2022, papillary carcinoma on pathology" value={formData.surgicalHistory} onChange={(e) => set('surgicalHistory', e.target.value)} /><Prev k="surgicalHistory" /></>
              </div>
            </div>

            {/* Medical Treatment */}
            <div className="sheet-subsection">
              <h4 className="subsection-title">Medical Treatment</h4>
              <div className="sheet-row medication-row">
                <div className="form-group">
                  <label>Eltroxin (Levothyroxine) — Dose</label>
                  <><input type="text" placeholder="e.g. 100 mcg/day" value={formData.eltroxinDose} onChange={(e) => set('eltroxinDose', e.target.value)} /><Prev k="eltroxinDose" /></>
                </div>
                {formData.eltroxinDose && (
                  <label className="stopped-check">
                    <><input type="checkbox" checked={formData.eltroxinStopped} onChange={(e) => set('eltroxinStopped', e.target.checked)} /><Prev k="eltroxinStopped" /></>
                    Stopped 5 days before scan ✓
                  </label>
                )}
              </div>
              <div className="sheet-row medication-row">
                <div className="form-group">
                  <label>Carbimazole — Dose</label>
                  <><input type="text" placeholder="e.g. 10 mg/day" value={formData.carbimazoleDose} onChange={(e) => set('carbimazoleDose', e.target.value)} /><Prev k="carbimazoleDose" /></>
                </div>
                {formData.carbimazoleDose && (
                  <label className="stopped-check">
                    <><input type="checkbox" checked={formData.carbimazoleStopped} onChange={(e) => set('carbimazoleStopped', e.target.checked)} /><Prev k="carbimazoleStopped" /></>
                    Stopped 5 days before scan ✓
                  </label>
                )}
              </div>
              <div className="form-group">
                <label>Other drugs interfering with iodine uptake <span className="hint">(Cordarone, cough meds, etc.)</span></label>
                <><input type="text" placeholder="e.g. Cordarone 200 mg" value={formData.otherDrugs} onChange={(e) => set('otherDrugs', e.target.value)} /><Prev k="otherDrugs" /></>
              </div>
            </div>

            {/* Family History */}
            <div className="sheet-row">
              <div className="form-group">
                <label>Family History of Thyroid Disease</label>
                <div className="radio-group">
                  {['yes', 'no'].map((v) => (
                    <label key={v} className={`radio-chip ${formData.familyHistory === v ? 'active' : ''}`}>
                      <input type="radio" name="familyHistory" value={v} checked={formData.familyHistory === v} onChange={() => set('familyHistory', v)} />
                      {v === 'yes' ? 'Yes' : 'No'}
                    </label>
                  ))}
                </div>
              </div>
              {formData.familyHistory === 'yes' && (
                <div className="form-group">
                  <label>Details</label>
                  <><input type="text" placeholder="Who, what condition..." value={formData.familyHistoryNotes} onChange={(e) => set('familyHistoryNotes', e.target.value)} /><Prev k="familyHistoryNotes" /></>
                </div>
              )}
              <div className="form-group">
                <label>History of Cigarette Smoking</label>
                <div className="radio-group">
                  {['yes', 'no'].map((v) => (
                    <label key={v} className={`radio-chip ${formData.smokingHistory === v ? 'active' : ''}`}>
                      <input type="radio" name="smokingHistory" value={v} checked={formData.smokingHistory === v} onChange={() => set('smokingHistory', v)} />
                      {v === 'yes' ? 'Yes' : 'No'}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Contraceptive History — females only */}
            {isFemale && (
              <div className="sheet-subsection">
                <h4 className="subsection-title">Contraceptive History</h4>
                <div className="sheet-row">
                  <div className="form-group">
                    <div className="radio-group">
                      {[
                        { value: 'single', label: 'Single' },
                        { value: 'postmenopausal', label: 'Post-menopausal' },
                        { value: 'married', label: 'Married' },
                        { value: 'other', label: 'Other' },
                      ].map((opt) => (
                        <label key={opt.value} className={`radio-chip ${formData.contraceptiveStatus === opt.value ? 'active' : ''}`}>
                          <input type="radio" name="contraceptiveStatus" value={opt.value} checked={formData.contraceptiveStatus === opt.value} onChange={() => set('contraceptiveStatus', opt.value)} />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                  </div>
                  {formData.contraceptiveStatus === 'married' && (
                    <div className="form-group">
                      <label>Date of LMP</label>
                      <><input type="date" max={TODAY} value={formData.lmpDate} onChange={(e) => set('lmpDate', e.target.value)} /><Prev k="lmpDate" /></>
                    </div>
                  )}
                  <div className="form-group">
                    <label>No. of Children</label>
                    <><input type="number" min="0" placeholder="0" value={formData.numChildren} onChange={(e) => set('numChildren', e.target.value)} /><Prev k="numChildren" /></>
                  </div>
                  <div className="form-group">
                    <label>Age of Youngest Child</label>
                    <><input type="number" min="0" placeholder="months/years" value={formData.youngestChildAge} onChange={(e) => set('youngestChildAge', e.target.value)} /><Prev k="youngestChildAge" /></>
                  </div>
                </div>
              </div>
            )}

            {/* Physical Examination */}
            <div className="sheet-subsection">
              <h4 className="subsection-title">Examination</h4>
              <div className="sheet-row">
                <div className="form-group">
                  <label>Exophthalmos</label>
                  <div className="radio-group">
                    {['yes', 'no'].map((v) => (
                      <label key={v} className={`radio-chip ${formData.exophthalmos === v ? 'active' : ''}`}>
                        <input type="radio" name="exophthalmos" value={v} checked={formData.exophthalmos === v} onChange={() => set('exophthalmos', v)} />
                        {v === 'yes' ? 'Yes' : 'No'}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label>Pulse <span className="unit">(bpm)</span></label>
                  <><input type="number" min="30" max="250" placeholder="e.g. 88" value={formData.pulseRate} onChange={(e) => set('pulseRate', e.target.value)} /><Prev k="pulseRate" /></>
                </div>
                <div className="form-group">
                  <label>Local — RT Lobe <span className="hint">(palpation)</span></label>
                  <><input type="text" placeholder="e.g. enlarged, firm, no nodule" value={formData.localRtLobe} onChange={(e) => set('localRtLobe', e.target.value)} /><Prev k="localRtLobe" /></>
                </div>
                <div className="form-group">
                  <label>Local — LT Lobe <span className="hint">(palpation)</span></label>
                  <><input type="text" placeholder="e.g. normal size, soft" value={formData.localLtLobe} onChange={(e) => set('localLtLobe', e.target.value)} /><Prev k="localLtLobe" /></>
                </div>
              </div>
            </div>
          </div>

          <DoctorActionFooter isAdmin={isAdmin} admin={admin} submitting={submitting} />

          {isAdmin && (<>
          {/* ── NURSE SECTION ── */}
          <div className="sheet-section nurse-section">
            <div className="section-role-badge nurse-badge"><Activity size={14} />Nurse</div>
            <div className="sheet-row">
              <div className="form-group">
                <label>Weight <span className="unit">(kg)</span></label>
                <><input type="number" step="0.1" placeholder="e.g. 70" value={formData.prepWeight} onChange={(e) => set('prepWeight', e.target.value)} /><Prev k="prepWeight" /></>
              </div>
              <div className="form-group">
                <label>Height <span className="unit">(cm)</span></label>
                <><input type="number" step="0.1" placeholder="e.g. 165" value={formData.prepHeight} onChange={(e) => set('prepHeight', e.target.value)} /><Prev k="prepHeight" /></>
              </div>
              <div className="form-group">
                <label>Blood Glucose <span className="unit">(mg/dL)</span></label>
                <><input type="number" step="any" placeholder="e.g. 110" value={formData.prepBloodGlucose} onChange={(e) => set('prepBloodGlucose', e.target.value)} /><Prev k="prepBloodGlucose" /></>
              </div>
            </div>
            <div className="sheet-row">
              <div className="form-group">
                <label>Site of Injection</label>
                <div className="injection-site-picker">
                  <div className="site-group">
                    {['RT', 'LT'].map((s) => (
                      <label key={s} className={`site-chip ${formData.injectionSide === s ? 'active' : ''}`}>
                        <input type="radio" name="injSide" value={s} checked={formData.injectionSide === s} onChange={() => set('injectionSide', s)} />
                        {s}
                      </label>
                    ))}
                  </div>
                  <div className="site-group">
                    {['hand', 'foot', 'forearm'].map((l) => (
                      <label key={l} className={`site-chip ${formData.injectionLimb === l ? 'active' : ''}`}>
                        <input type="radio" name="injLimb" value={l} checked={formData.injectionLimb === l} onChange={() => set('injectionLimb', l)} />
                        {l.charAt(0).toUpperCase() + l.slice(1)}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="form-group">
                <label>Nurse Notes <span className="hint">(difficult veins, etc.)</span></label>
                <><input type="text" placeholder="Optional notes..." value={formData.prepNurseNotes} onChange={(e) => set('prepNurseNotes', e.target.value)} /><Prev k="prepNurseNotes" /></>
              </div>
            </div>
          </div>

          <AdminDoneFooter stage="nurse" label="Nurse" done={admin.progress.nurse} disabled={!admin.progress.doctor} advancing={admin.advancing} onClick={() => admin.advance('Pending_Technical', 'nurse')} />

          {/* ── TECHNICIAN SECTION ── */}
          <div className="sheet-section tech-section">
            <div className="section-role-badge tech-badge"><Stethoscope size={14} />Technician / Physicist</div>

            <div className="sheet-row">
              <div className="form-group">
                <label>Isotope</label>
                <div className="isotope-display">{subtype.isotope}</div>
              </div>
              <div className="form-group">
                <label>Injected Dose <span className="required-star">*</span></label>
                <div className="dose-input-row">
                  <input
                    type="number" step="any" min="0" placeholder="mCi"
                    value={formData.isotopeDoseMCi}
                    onChange={(e) => set('isotopeDoseMCi', e.target.value)}
                  />
                  <span className="dose-unit">mCi</span>
                  {mbq && <span className="dose-mbq">= {mbq} MBq</span>}
                </div>
              </div>
              <div className="form-group">
                <label>Time of Injection</label>
                <><input type="datetime-local" value={formData.injectionTime} onChange={(e) => set('injectionTime', e.target.value)} /><Prev k="injectionTime" /></>
              </div>
              <div className="form-group">
                <label>Time of Imaging</label>
                <><input type="datetime-local" value={formData.scanTime} onChange={(e) => set('scanTime', e.target.value)} /><Prev k="scanTime" /></>
              </div>
            </div>

            {/* More Acquisition */}
            <div className="sheet-row">
              <div className="form-group">
                <label className="checkbox-label">
                  <><input type="checkbox" checked={formData.delayedImages} onChange={(e) => set('delayedImages', e.target.checked)} /><Prev k="delayedImages" /></>
                  <span>More Acquisition / Delayed Images</span>
                </label>
              </div>
              {formData.delayedImages && (
                <div className="form-group">
                  <label>Details</label>
                  <><input type="text" placeholder="e.g. Delayed images at 4h — poor visualization of RT lobe" value={formData.delayedImagesNotes} onChange={(e) => set('delayedImagesNotes', e.target.value)} /><Prev k="delayedImagesNotes" /></>
                </div>
              )}
            </div>

            {formData.scanSubType === 'wbs_diagnostic' && (
              <div className="sheet-row">
                <div className="form-group">
                  <label>Withdrawal Days <span className="hint">(days off Levothyroxine before dose)</span></label>
                  <><input type="number" placeholder="e.g. 14" value={formData.withdrawalDays} onChange={(e) => set('withdrawalDays', e.target.value)} /><Prev k="withdrawalDays" /></>
                </div>
              </div>
            )}
          </div>

          <AdminDoneFooter stage="tech" label="Technical" done={admin.progress.tech} disabled={!admin.progress.nurse} advancing={admin.advancing} onClick={() => admin.advance('Pending_Report', 'tech')} />

          {/* ── SCAN RESULTS (Physician post-scan) ── */}
          <div className="sheet-section results-section">
            <div className="section-role-badge results-badge"><FileText size={14} />Scan Results — Physician</div>

            <div className="sheet-row">
              <div className="form-group">
                <label>Right Lobe Uptake <span className="unit">(%)</span></label>
                <><input type="number" step="any" min="0" max="100" value={formData.rightLobeUptake} onChange={(e) => set('rightLobeUptake', e.target.value)} /><Prev k="rightLobeUptake" /></>
              </div>
              <div className="form-group">
                <label>Left Lobe Uptake <span className="unit">(%)</span></label>
                <><input type="number" step="any" min="0" max="100" value={formData.leftLobeUptake} onChange={(e) => set('leftLobeUptake', e.target.value)} /><Prev k="leftLobeUptake" /></>
              </div>
              <div className="form-group">
                <label>Total Uptake <span className="unit">(%)</span></label>
                <><input type="number" step="any" min="0" max="100" value={formData.totalUptake} onChange={(e) => set('totalUptake', e.target.value)} /><Prev k="totalUptake" /></>
              </div>
              <div className="form-group">
                <label>Gland Position</label>
                <select value={formData.glandPosition} onChange={(e) => set('glandPosition', e.target.value)}>
                  <option value="">Select...</option>
                  {GLAND_POSITIONS.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>

            <div className="sheet-row">
              <div className="form-group">
                <label>Hot Nodules</label>
                <><textarea rows={2} placeholder="Location, size..." value={formData.hotNodules} onChange={(e) => set('hotNodules', e.target.value)} /><Prev k="hotNodules" /></>
              </div>
              <div className="form-group">
                <label>Cold Nodules</label>
                <><textarea rows={2} placeholder="Location, size..." value={formData.coldNodules} onChange={(e) => set('coldNodules', e.target.value)} /><Prev k="coldNodules" /></>
              </div>
            </div>

            <div className="checkbox-group">
              <label className="checkbox-label">
                <><input type="checkbox" checked={formData.diffuseUptake} onChange={(e) => set('diffuseUptake', e.target.checked)} /><Prev k="diffuseUptake" /></>
                <span>Diffuse Uptake</span>
              </label>
              <label className="checkbox-label">
                <><input type="checkbox" checked={formData.heterogeneousUptake} onChange={(e) => set('heterogeneousUptake', e.target.checked)} /><Prev k="heterogeneousUptake" /></>
                <span>Heterogeneous Uptake</span>
              </label>
            </div>

            {/* Thyroid Diagram */}
            <div className="diagram-section">
              <h4>Thyroid Diagram</h4>
              <ThyroidDiagram diagramData={formData.diagramData} onChange={handleDiagramChange} editable={true} width={400} />
            </div>

            <div className="form-group">
              <label>Impression</label>
              <><textarea rows={4} placeholder="Overall impression and conclusion..." value={formData.impression} onChange={(e) => set('impression', e.target.value)} /><Prev k="impression" /></>
            </div>
            <div className="form-group">
              <label>Physician Notes</label>
              <><textarea rows={2} placeholder="Additional notes..." value={formData.physicianNotes} onChange={(e) => set('physicianNotes', e.target.value)} /><Prev k="physicianNotes" /></>
            </div>
          </div>

          <AdminReportFooter admin={admin} />
          </>)}
        </form>
      )}

      {/* History */}
      {selectedPatient && (
        <div className="history-section">
          <h3><FileText size={18} />Previous Thyroid Scans ({history.length})</h3>
          {historyLoading ? (
            <div className="loading-state"><Loader2 size={24} className="spin" />Loading...</div>
          ) : history.length === 0 ? (
            <div className="empty-state">No previous thyroid scans recorded for this patient.</div>
          ) : (
            <div className="history-table-wrapper">
              <table className="history-table">
                <thead>
                  <tr><th>Date</th><th>Type</th><th>Isotope</th><th>Dose</th><th>Total Uptake</th><th>Workflow</th><th></th></tr>
                </thead>
                <tbody>
                  {history.map((entry) => (
                    <React.Fragment key={entry.id}>
                      <tr className={expandedRow === entry.id ? 'expanded' : ''}>
                        <td>{entry.createdAt ? format(new Date(entry.createdAt), 'dd MMM yyyy') : '—'}</td>
                        <td>{entry.scanSubType === 'wbs_diagnostic' ? 'WBS Diagnostic' : entry.scanSubType === 'wbs_therapeutic' ? 'Therapeutic WBS' : 'Thyroid Scan'}</td>
                        <td>{entry.isotopeType || '—'}</td>
                        <td>{entry.isotopeDoseMCi != null ? `${entry.isotopeDoseMCi} mCi` : '—'}</td>
                        <td>{entry.totalUptake != null ? `${entry.totalUptake}%` : '—'}</td>
                        <td><span className={`status-badge status-${(entry.workflowStatus || '').toLowerCase()}`}>{entry.workflowStatus}</span></td>
                        <td>
                          <button className="btn-icon" onClick={() => setExpandedRow(expandedRow === entry.id ? null : entry.id)}>
                            {expandedRow === entry.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </td>
                      </tr>
                      {expandedRow === entry.id && (
                        <tr className="detail-row">
                          <td colSpan={7}>
                            <div className="detail-content">
                              <div className="detail-grid">
                                {entry.tshLevel != null && <div className="detail-item"><span className="detail-label">TSH:</span><span>{entry.tshLevel} mIU/L</span></div>}
                                {entry.t3Level != null && <div className="detail-item"><span className="detail-label">T3:</span><span>{entry.t3Level}</span></div>}
                                {entry.t4Level != null && <div className="detail-item"><span className="detail-label">T4:</span><span>{entry.t4Level}</span></div>}
                                {entry.rightLobeUptake != null && <div className="detail-item"><span className="detail-label">RT Uptake:</span><span>{entry.rightLobeUptake}%</span></div>}
                                {entry.leftLobeUptake != null && <div className="detail-item"><span className="detail-label">LT Uptake:</span><span>{entry.leftLobeUptake}%</span></div>}
                                {entry.injectionSite && <div className="detail-item"><span className="detail-label">Injection site:</span><span>{entry.injectionSite}</span></div>}
                                {entry.pulseRate && <div className="detail-item"><span className="detail-label">Pulse:</span><span>{entry.pulseRate} bpm</span></div>}
                                {entry.glandPosition && <div className="detail-item"><span className="detail-label">Position:</span><span>{entry.glandPosition}</span></div>}
                              </div>
                              {entry.diagramData && (
                                <div className="detail-diagram">
                                  <ThyroidDiagramViewer
                                    diagramData={typeof entry.diagramData === 'string' ? JSON.parse(entry.diagramData) : entry.diagramData}
                                    width={280}
                                  />
                                </div>
                              )}
                              {entry.impression && <div className="detail-text"><strong>Impression:</strong><p>{entry.impression}</p></div>}
                              {entry.delayedImages && entry.delayedImagesNotes && <div className="detail-text"><strong>More Acquisition:</strong><p>{entry.delayedImagesNotes}</p></div>}
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

export default ScanThyroid;
