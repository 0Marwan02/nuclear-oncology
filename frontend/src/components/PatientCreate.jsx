import { useState } from 'react';
import { apiFetch } from '../utils/api';
import { parseEgyptianNationalId } from '../utils/nationalIdParser';
import './PatientCreate.css';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const PatientCreate = ({ onPatientCreated, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);

  const user = JSON.parse(localStorage.getItem('auth_user') || '{}');
  const isDoctor = user.role === 'doctor';

  const [formData, setFormData] = useState({
    nationalId: '',
    name: '',
    gender: 'male',
    birthDate: '',
    phone: '',
    address: '',
    bloodType: 'A+',
    maritalStatus: '',
    referringDoctor: '',
  });

  const [nationalIdStatus, setNationalIdStatus] = useState({ isValid: false, error: '' });
  const [calculatedAge, setCalculatedAge] = useState(null);

  const [includeMedicalCase, setIncludeMedicalCase] = useState(false);
  const [caseData, setCaseData] = useState({
    diagnosis: '',
    cancerType: '',
    cancerStage: '',
    protocolType: '',
    startDate: new Date().toISOString().split('T')[0],
    status: 'Active',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNationalIdChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 14);
    setFormData((prev) => ({ ...prev, nationalId: value }));
    setCalculatedAge(null);
    setNationalIdStatus({ isValid: false, error: '' });

    if (value.length === 14) {
      try {
        const parsed = parseEgyptianNationalId(value);
        if (parsed.isValid) {
          setFormData((prev) => ({
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

  const handleCaseChange = (e) => {
    const { name, value } = e.target;
    setCaseData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = { ...formData };
      if (includeMedicalCase && isDoctor) {
        payload.medicalCase = caseData;
      }

      const result = await apiFetch('/patients', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      onPatientCreated(result);
    } catch (err) {
      setError(err.message || 'Failed to create patient');
    } finally {
      setLoading(false);
    }
  };

  const goNext = () => {
    if (!formData.nationalId || !formData.name || !formData.birthDate || !formData.phone || !formData.address) {
      setError('Please fill all required fields');
      return;
    }
    setError('');
    setStep(2);
  };

  return (
    <div className="patient-create-overlay">
      <div className="patient-create-modal">
        <div className="pcm-header">
          <div className="pcm-title-area">
            <h3>Register New Patient</h3>
            <p className="pcm-subtitle">Fill in the patient information below</p>
          </div>
          <button className="close-btn" onClick={onCancel}>&times;</button>
        </div>

        {/* Step Indicators */}
        <div className="pcm-steps">
          <div className={`step-indicator ${step >= 1 ? 'active' : ''}`}>
            <span className="step-number">1</span>
            <span className="step-label">Patient Info</span>
          </div>
          <div className="step-line"></div>
          <div className={`step-indicator ${step >= 2 ? 'active' : ''}`}>
            <span className="step-number">2</span>
            <span className="step-label">Review & Case</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="pcm-form">
          {step === 1 && (
            <div className="pcm-step-content">
              <div className="form-group">
                <label>National ID <span className="req">*</span></label>
                <div className="input-with-status">
                  <input
                    type="text"
                    name="nationalId"
                    value={formData.nationalId}
                    onChange={handleNationalIdChange}
                    required
                    placeholder="١٤ رقم"
                    inputMode="numeric"
                    maxLength={14}
                    className={nationalIdStatus.isValid ? 'valid-input' : nationalIdStatus.error ? 'invalid-input' : ''}
                  />
                  {nationalIdStatus.isValid && <span className="status-icon valid">✓</span>}
                  {nationalIdStatus.error && <span className="status-icon invalid">✗</span>}
                </div>
                {nationalIdStatus.error && <span className="field-error">{nationalIdStatus.error}</span>}
                {calculatedAge !== null && <span className="field-hint">العمر: {calculatedAge} سنة — تم التعبئة تلقائياً</span>}
              </div>

              <div className="form-group">
                <label>Full Name <span className="req">*</span></label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="e.g. Ahmed Mohamed"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Gender <span className="req">*</span></label>
                  <select name="gender" value={formData.gender} onChange={handleChange} className={nationalIdStatus.isValid ? 'autofilled' : ''}>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                  {nationalIdStatus.isValid && <span className="field-hint">تعبئة تلقائية من الرقم القومي</span>}
                </div>
                <div className="form-group">
                  <label>Blood Type <span className="req">*</span></label>
                  <select name="bloodType" value={formData.bloodType} onChange={handleChange}>
                    {BLOOD_TYPES.map((bt) => (
                      <option key={bt} value={bt}>{bt}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Date of Birth <span className="req">*</span></label>
                <div className="date-input-row">
                  <input
                    type="date"
                    name="birthDate"
                    value={formData.birthDate}
                    onChange={handleChange}
                    required
                    className={nationalIdStatus.isValid ? 'autofilled' : ''}
                  />
                  {calculatedAge !== null && <span className="age-badge">{calculatedAge} سنة</span>}
                </div>
                {nationalIdStatus.isValid && <span className="field-hint">تعبئة تلقائية من الرقم القومي</span>}
              </div>

              <div className="form-group">
                <label>Phone <span className="req">*</span></label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  placeholder="e.g. 01012345678"
                />
              </div>

              <div className="form-group">
                <label>Address <span className="req">*</span></label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  required
                  placeholder="e.g. 12 Tahrir St, Cairo"
                />
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
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="pcm-step-content">
              {/* Summary */}
              <div className="patient-summary-card">
                <div className="psc-avatar">{formData.name.charAt(0).toUpperCase()}</div>
                <div className="psc-info">
                  <h4>{formData.name}</h4>
                  <span>ID: {formData.nationalId} • {formData.gender} • {formData.bloodType}</span>
                </div>
              </div>

              {isDoctor && (
                <div className="case-toggle">
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={includeMedicalCase}
                      onChange={(e) => setIncludeMedicalCase(e.target.checked)}
                    />
                    <span className="toggle-switch"></span>
                    <span>Register initial medical case</span>
                  </label>
                </div>
              )}

              {includeMedicalCase && isDoctor && (
                <div className="case-fields">
                  <div className="form-group">
                    <label>Diagnosis</label>
                    <input
                      type="text"
                      name="diagnosis"
                      value={caseData.diagnosis}
                      onChange={handleCaseChange}
                      required
                      placeholder="e.g. Papillary Thyroid Carcinoma"
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Cancer Type</label>
                      <input
                        type="text"
                        name="cancerType"
                        value={caseData.cancerType}
                        onChange={handleCaseChange}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Stage</label>
                      <input
                        type="text"
                        name="cancerStage"
                        value={caseData.cancerStage}
                        onChange={handleCaseChange}
                        required
                        placeholder="e.g. Stage II"
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Protocol</label>
                      <input
                        type="text"
                        name="protocolType"
                        value={caseData.protocolType}
                        onChange={handleCaseChange}
                        required
                        placeholder="e.g. I-131 Ablation"
                      />
                    </div>
                    <div className="form-group">
                      <label>Start Date</label>
                      <input
                        type="date"
                        name="startDate"
                        value={caseData.startDate}
                        onChange={handleCaseChange}
                        required
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select name="status" value={caseData.status} onChange={handleCaseChange}>
                      <option value="Active">Active Treatment</option>
                      <option value="Follow-up">Follow-up</option>
                      <option value="Finished">Finished</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {error && <div className="pcm-error">{error}</div>}

          <div className="pcm-actions">
            {step === 1 ? (
              <>
                <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
                <button type="button" className="btn-primary" onClick={goNext}>
                  Next Step →
                </button>
              </>
            ) : (
              <>
                <button type="button" className="btn-secondary" onClick={() => setStep(1)}>← Back</button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Registering...' : 'Register Patient'}
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default PatientCreate;
