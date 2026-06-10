import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../utils/api';
import { parseEgyptianNationalId } from '../utils/nationalIdParser';
import { Activity, Pill, Scan, Bone, Droplet, Search, HelpCircle, ChevronDown } from 'lucide-react';
import './PatientCreate.css';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const SCAN_CATEGORIES = [
  { key: 'PET_CT',      label: 'PET/CT',      sublabel: 'F-18 FDG',  icon: Activity, color: '#8b5cf6', path: '/scans/petct' },
  { key: 'PSMA_PET_CT', label: 'PSMA PET/CT', sublabel: 'Ga-68 PSMA', icon: Pill,     color: '#ec4899', path: '/scans/psma' },
  { key: 'GAMMA',       label: 'GAMMA',        sublabel: 'Tc-99m / I-131', icon: Scan, color: '#f59e0b', path: null },
  { key: 'OTHER',       label: 'Other',        sublabel: 'Other scan type', icon: HelpCircle, color: '#6b7280', path: '/scans/petct' },
];

const GAMMA_SUB = [
  { key: 'Thyroid',  label: 'Thyroid',    path: '/scans/thyroid' },
  { key: 'Bone',     label: 'Bone Scan',  path: '/scans/bone' },
  { key: 'Renal',    label: 'Renal',      path: '/scans/renal' },
  { key: 'Gastric',  label: 'Gastric',    path: '/scans/gastric' },
  { key: "Meckel",   label: "Meckel's",   path: '/scans/meckel' },
  { key: 'Other',    label: 'Other',      path: '/scans/petct' },
];

const PatientCreate = ({ onPatientCreated, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [existingPatientId, setExistingPatientId] = useState(null);
  const [step, setStep] = useState(1);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    nationalId: '', name: '', gender: 'male', birthDate: '', phone: '',
    address: '', bloodType: 'A+', maritalStatus: '', referringDoctor: '',
    referringDoctorPhone: '', phone2: '',
  });

  const [nationalIdStatus, setNationalIdStatus] = useState({ isValid: false, error: '' });
  const [calculatedAge, setCalculatedAge] = useState(null);

  // Step 3 state
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubCategory, setSelectedSubCategory] = useState('');
  const [gammaExpanded, setGammaExpanded] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNationalIdChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 14);
    setFormData(prev => ({ ...prev, nationalId: value }));
    setCalculatedAge(null);
    setNationalIdStatus({ isValid: false, error: '' });
    if (value.length === 14) {
      try {
        const parsed = parseEgyptianNationalId(value);
        if (parsed.isValid) {
          setFormData(prev => ({
            ...prev,
            gender: parsed.gender === 'Male' ? 'male' : 'female',
            birthDate: parsed.birthDateString || prev.birthDate,
          }));
          setCalculatedAge(parsed.age);
          setNationalIdStatus({ isValid: true, error: '' });
        } else {
          setNationalIdStatus({ isValid: false, error: parsed.error || 'رقم قومي غير صالح' });
        }
      } catch {
        setNationalIdStatus({ isValid: false, error: 'خطأ في تحليل الرقم القومي' });
      }
    }
  };

  const goNext = () => {
    if (!formData.nationalId || !formData.name || !formData.birthDate || !formData.phone || !formData.address) {
      setError('Please fill all required fields');
      return;
    }
    setError('');
    setStep(s => s + 1);
  };

  const handleSubmit = async () => {
    if (!selectedCategory) { setError('Please select a scan category'); return; }
    if (selectedCategory === 'GAMMA' && !selectedSubCategory) { setError('Please select a GAMMA sub-type'); return; }

    setLoading(true);
    setError('');
    setExistingPatientId(null);

    try {
      const cat   = selectedCategory;
      const subCat = selectedCategory === 'GAMMA' ? selectedSubCategory : '';

      const result = await apiFetch('/patients', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          category: cat,
          subCategory: subCat || null,
        }),
      });

      // Navigate to scan form with patient pre-selected
      const scanPath = selectedCategory === 'GAMMA'
        ? (GAMMA_SUB.find(s => s.key === selectedSubCategory)?.path ?? '/scans/petct')
        : (SCAN_CATEGORIES.find(c => c.key === selectedCategory)?.path ?? '/scans/petct');

      onPatientCreated(result);
      navigate(`${scanPath}?patientId=${result.patient.id}`);
    } catch (err) {
      setError(err.message || 'Failed to create patient');
      if (err.data?.existingPatientId) setExistingPatientId(err.data.existingPatientId);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="patient-create-overlay">
      <div className="patient-create-modal">
        <div className="pcm-header">
          <div className="pcm-title-area">
            <h3>Register New Patient</h3>
            <p className="pcm-subtitle">Step {step} of 3</p>
          </div>
          <button className="close-btn" onClick={onCancel}>&times;</button>
        </div>

        {/* Step indicators */}
        <div className="pcm-steps">
          {['Patient Info', 'Review', 'Condition'].map((label, i) => (
            <span key={i}>
              <div className={`step-indicator ${step >= i + 1 ? 'active' : ''}`}>
                <span className="step-number">{i + 1}</span>
                <span className="step-label">{label}</span>
              </div>
              {i < 2 && <div className="step-line" />}
            </span>
          ))}
        </div>

        {/* ── STEP 1: Demographics ── */}
        {step === 1 && (
          <div className="pcm-form">
            <div className="pcm-step-content">
              <div className="form-group">
                <label>National ID <span className="req">*</span></label>
                <div className="input-with-status">
                  <input type="text" name="nationalId" value={formData.nationalId}
                    onChange={handleNationalIdChange} placeholder="١٤ رقم"
                    inputMode="numeric" maxLength={14}
                    className={nationalIdStatus.isValid ? 'valid-input' : nationalIdStatus.error ? 'invalid-input' : ''} />
                  {nationalIdStatus.isValid && <span className="status-icon valid">✓</span>}
                  {nationalIdStatus.error && <span className="status-icon invalid">✗</span>}
                </div>
                {nationalIdStatus.error && <span className="field-error">{nationalIdStatus.error}</span>}
                {calculatedAge !== null && <span className="field-hint">العمر: {calculatedAge} سنة — تم التعبئة تلقائياً</span>}
              </div>

              <div className="form-group">
                <label>Full Name <span className="req">*</span></label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} required placeholder="e.g. Ahmed Mohamed" />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Gender <span className="req">*</span></label>
                  <select name="gender" value={formData.gender} onChange={handleChange} className={nationalIdStatus.isValid ? 'autofilled' : ''}>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Blood Type <span className="req">*</span></label>
                  <select name="bloodType" value={formData.bloodType} onChange={handleChange}>
                    {BLOOD_TYPES.map(bt => <option key={bt} value={bt}>{bt}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Date of Birth <span className="req">*</span></label>
                <div className="date-input-row">
                  <input type="date" name="birthDate" value={formData.birthDate} onChange={handleChange} required
                    className={nationalIdStatus.isValid ? 'autofilled' : ''} />
                  {calculatedAge !== null && <span className="age-badge">{calculatedAge} سنة</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Phone <span className="req">*</span></label>
                  <input type="text" name="phone" value={formData.phone} onChange={handleChange} required placeholder="01012345678" />
                </div>
                <div className="form-group">
                  <label>تليفون قريب</label>
                  <input type="text" name="phone2" value={formData.phone2} onChange={handleChange} />
                </div>
              </div>

              <div className="form-group">
                <label>Address <span className="req">*</span></label>
                <input type="text" name="address" value={formData.address} onChange={handleChange} required placeholder="e.g. 12 Tahrir St, Cairo" />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>الحالة الاجتماعية</label>
                  <select name="maritalStatus" value={formData.maritalStatus} onChange={handleChange}>
                    <option value="">—</option>
                    <option value="single">أعزب/عزباء</option>
                    <option value="married">متزوج/ة</option>
                    <option value="divorced">مطلق/ة</option>
                    <option value="widowed">أرمل/ة</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>الطبيب المحوّل</label>
                  <input type="text" name="referringDoctor" value={formData.referringDoctor} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>تليفون الطبيب المحوّل</label>
                  <input type="text" name="referringDoctorPhone" value={formData.referringDoctorPhone} onChange={handleChange} />
                </div>
              </div>
            </div>

            {error && <div className="pcm-error">{error}</div>}
            <div className="pcm-actions">
              <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
              <button type="button" className="btn-primary" onClick={goNext}>Next Step →</button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Review ── */}
        {step === 2 && (
          <div className="pcm-form">
            <div className="pcm-step-content">
              <div className="patient-summary-card">
                <div className="psc-avatar">{formData.name.charAt(0).toUpperCase()}</div>
                <div className="psc-info">
                  <h4>{formData.name}</h4>
                  <span>ID: {formData.nationalId} · {formData.gender} · {formData.bloodType}</span>
                  {calculatedAge && <span className="field-hint"> · Age {calculatedAge}</span>}
                </div>
              </div>
              <div className="review-grid">
                {[
                  ['Phone', formData.phone],
                  ['Phone 2', formData.phone2],
                  ['Address', formData.address],
                  ['Birth Date', formData.birthDate],
                  ['Marital', formData.maritalStatus],
                  ['Referring Dr.', formData.referringDoctor],
                ].filter(([, v]) => v).map(([label, value]) => (
                  <div key={label} className="review-row">
                    <span className="review-label">{label}</span>
                    <span className="review-value">{value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="pcm-actions">
              <button type="button" className="btn-secondary" onClick={() => setStep(1)}>← Back</button>
              <button type="button" className="btn-primary" onClick={() => setStep(3)}>Confirm & Next →</button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Condition + First Visit ── */}
        {step === 3 && (
          <div className="pcm-form">
            <div className="pcm-step-content">
              <p className="step3-heading">What is this patient being referred for?</p>
              <p className="step3-sub">Select the scan category — this will be the patient's primary condition and open the relevant scan form.</p>

              <div className="scan-category-grid">
                {SCAN_CATEGORIES.map(({ key, label, sublabel, icon: Icon, color }) => (
                  <div key={key}>
                    <button
                      type="button"
                      className={`cat-btn ${selectedCategory === key ? 'cat-btn--selected' : ''}`}
                      style={{ '--cat-color': color }}
                      onClick={() => {
                        setSelectedCategory(key);
                        setSelectedSubCategory('');
                        if (key === 'GAMMA') setGammaExpanded(true);
                        else setGammaExpanded(false);
                      }}
                    >
                      <Icon size={26} />
                      <span className="cat-label">{label}</span>
                      <span className="cat-sub">{sublabel}</span>
                      {key === 'GAMMA' && <ChevronDown size={14} style={{ marginTop: 4 }} />}
                    </button>

                    {/* GAMMA sub-categories inline */}
                    {key === 'GAMMA' && selectedCategory === 'GAMMA' && (
                      <div className="gamma-sub-grid">
                        {GAMMA_SUB.map(sub => (
                          <button
                            key={sub.key}
                            type="button"
                            className={`sub-btn ${selectedSubCategory === sub.key ? 'sub-btn--selected' : ''}`}
                            onClick={() => setSelectedSubCategory(sub.key)}
                          >
                            {sub.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div className="pcm-error" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>{error}</span>
                {existingPatientId && (
                  <button type="button" className="btn-primary" style={{ padding: '4px 12px', fontSize: '13px' }}
                    onClick={() => { onCancel(); navigate(`/patients/${existingPatientId}`); }}>
                    Open Profile
                  </button>
                )}
              </div>
            )}

            <div className="pcm-actions">
              <button type="button" className="btn-secondary" onClick={() => setStep(2)}>← Back</button>
              <button type="button" className="btn-primary" disabled={loading} onClick={handleSubmit}>
                {loading ? 'Registering...' : 'Register & Open Scan Form →'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientCreate;
