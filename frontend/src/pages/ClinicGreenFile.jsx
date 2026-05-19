import { useState, useEffect, useRef } from 'react';
import { Search, Calendar, Activity, FileText, ChevronDown, ChevronUp, Loader2, CheckCircle, AlertCircle, Eye, Edit2 } from 'lucide-react';
import { format } from 'date-fns';
import { getClinics, createClinic, updateClinic, getClinicHistory } from '../utils/api';
import './ClinicGreenFile.css';

const GREEN_FILE_FIELDS = [
  { key: 'thyroglobulin', label: 'Thyroglobulin', unit: 'ng/mL', required: true },
  { key: 'antiTg', label: 'Anti-Tg', unit: 'IU/mL', required: false },
  { key: 'tsh', label: 'TSH', unit: 'mIU/L', required: true },
  { key: 'ft3', label: 'FT3', unit: 'pmol/L', required: false },
  { key: 'ft4', label: 'FT4', unit: 'pmol/L', required: false },
  { key: 'stimulatedTg', label: 'Stimulated Tg', unit: 'ng/mL', required: false },
];

const TREATMENT_OPTIONS = [
  'Active Surveillance',
  'Radioiodine Therapy',
  'Surgery',
  'External Beam',
  'Other',
];

const RESPONSE_OPTIONS = [
  'Complete Response',
  'Partial Response',
  'Stable Disease',
  'Progressive Disease',
];

const ClinicGreenFile = () => {
  const [patients, setPatients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientCases, setPatientCases] = useState([]);

  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    thyroglobulin: '',
    antiTg: '',
    tsh: '',
    ft3: '',
    ft4: '',
    stimulatedTg: '',
    radioiodineUptake: '',
    wbsResult: '',
    neckUsFindings: '',
    treatmentPlan: '',
    responseToTherapy: '',
    recurrenceSigns: '',
    physicianNotes: '',
  });

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedRow, setExpandedRow] = useState(null);
  const [editingId, setEditingId] = useState(null);

  const searchRef = useRef(null);
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
      searchPatients();
    } else {
      setPatients([]);
    }
  }, [searchQuery]);

  useEffect(() => {
    if (selectedPatient) {
      fetchHistory();
    }
  }, [selectedPatient]);

  const searchPatients = async () => {
    try {
      const data = await getClinics('green', { q: searchQuery });
      setPatients(data.patients || data || []);
    } catch {
      try {
        const allPatients = await getClinics('green');
        const filtered = (allPatients.patients || allPatients || []).filter(
          (p) =>
            p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.nationalId?.includes(searchQuery)
        );
        setPatients(filtered);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const selectPatient = (patient) => {
    setSelectedPatient(patient);
    setSearchQuery(patient.name);
    setShowDropdown(false);
    setFormData((prev) => ({
      ...prev,
      date: format(new Date(), 'yyyy-MM-dd'),
    }));
    setPatientCases(patient.cases || []);
  };

  const fetchHistory = async () => {
    if (!selectedPatient?.id) return;
    setHistoryLoading(true);
    try {
      const data = await getClinicHistory('green', selectedPatient.id);
      setHistory(Array.isArray(data) ? data : data.entries || data.records || []);
    } catch (err) {
      console.error(err);
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedPatient) {
      setError('Please select a patient first');
      return;
    }

    if (!formData.thyroglobulin || !formData.tsh) {
      setError('Thyroglobulin and TSH are required fields');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        patientId: selectedPatient.id,
        ...formData,
        thyroglobulin: parseFloat(formData.thyroglobulin) || null,
        antiTg: formData.antiTg ? parseFloat(formData.antiTg) : null,
        tsh: parseFloat(formData.tsh) || null,
        ft3: formData.ft3 ? parseFloat(formData.ft3) : null,
        ft4: formData.ft4 ? parseFloat(formData.ft4) : null,
        stimulatedTg: formData.stimulatedTg ? parseFloat(formData.stimulatedTg) : null,
        radioiodineUptake: formData.radioiodineUptake ? parseFloat(formData.radioiodineUptake) : null,
      };

      if (editingId) {
        await updateClinic('green', editingId, payload);
        setSuccess('Record updated successfully');
        setEditingId(null);
      } else {
        await createClinic('green', payload);
        setSuccess('Green file entry created successfully');
      }

      setFormData({
        date: format(new Date(), 'yyyy-MM-dd'),
        thyroglobulin: '',
        antiTg: '',
        tsh: '',
        ft3: '',
        ft4: '',
        stimulatedTg: '',
        radioiodineUptake: '',
        wbsResult: '',
        neckUsFindings: '',
        treatmentPlan: '',
        responseToTherapy: '',
        recurrenceSigns: '',
        physicianNotes: '',
      });

      fetchHistory();
    } catch (err) {
      setError(err.message || 'Failed to save record');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (entry) => {
    setFormData({
      date: entry.date ? format(new Date(entry.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      thyroglobulin: entry.thyroglobulin ?? '',
      antiTg: entry.antiTg ?? '',
      tsh: entry.tsh ?? '',
      ft3: entry.ft3 ?? '',
      ft4: entry.ft4 ?? '',
      stimulatedTg: entry.stimulatedTg ?? '',
      radioiodineUptake: entry.radioiodineUptake ?? '',
      wbsResult: entry.wbsResult || '',
      neckUsFindings: entry.neckUsFindings || '',
      treatmentPlan: entry.treatmentPlan || '',
      responseToTherapy: entry.responseToTherapy || '',
      recurrenceSigns: entry.recurrenceSigns || '',
      physicianNotes: entry.physicianNotes || '',
    });
    setEditingId(entry.id);
    setError('');
    setSuccess('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleExpand = (id) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  const getResponseBadge = (response) => {
    if (!response) return null;
    const map = {
      'Complete Response': 'cr',
      'Partial Response': 'pr',
      'Stable Disease': 'sd',
      'Progressive Disease': 'pd',
    };
    return <span className={`response-badge ${map[response] || ''}`}>{response}</span>;
  };

  return (
    <div className="clinic-page green-file-page">
      <div className="clinic-header">
        <div className="clinic-header-icon green-icon">
          <Activity size={28} />
        </div>
        <div>
          <h1>Green File - Thyroid Cancer Follow-up</h1>
          <p className="clinic-subtitle">ملف المتابعة - سرطان الغدة الدرقية</p>
        </div>
      </div>

      {/* Patient Selector */}
      <div className="patient-selector-section">
        <h2>
          <Search size={18} />
          Select Patient
        </h2>
        <div className="search-wrapper" ref={dropdownRef}>
          <div className="patient-search-input">
            <Search size={18} className="search-icon-input" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search by patient name or national ID..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowDropdown(true);
                if (selectedPatient && e.target.value !== selectedPatient.name) {
                  setSelectedPatient(null);
                }
              }}
              onFocus={() => setShowDropdown(true)}
            />
            {selectedPatient && (
              <button
                className="clear-search"
                onClick={() => {
                  setSelectedPatient(null);
                  setSearchQuery('');
                  setHistory([]);
                }}
              >
                ✕
              </button>
            )}
          </div>

          {showDropdown && patients.length > 0 && !selectedPatient && (
            <div className="patient-dropdown">
              {patients.map((p) => (
                <button
                  key={p.id}
                  className="dropdown-item"
                  onClick={() => selectPatient(p)}
                >
                  <div className="dropdown-avatar">
                    {(p.name || '?').charAt(0).toUpperCase()}
                  </div>
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
            <div className="patient-card-avatar">
              {selectedPatient.name?.charAt(0).toUpperCase()}
            </div>
            <div className="patient-card-info">
              <h3>{selectedPatient.name}</h3>
              <div className="patient-card-tags">
                <span className="tag tag-blue">National ID: {selectedPatient.nationalId}</span>
                {selectedPatient.gender && <span className="tag tag-gray">{selectedPatient.gender}</span>}
                {selectedPatient.birthDate && (
                  <span className="tag tag-gray">
                    DOB: {format(new Date(selectedPatient.birthDate), 'dd/MM/yyyy')}
                  </span>
                )}
              </div>
            </div>
            {patientCases.length > 0 && (
              <div className="patient-cases-mini">
                <span className="cases-label">Active Cases:</span>
                {patientCases.slice(0, 2).map((c) => (
                  <span key={c.id} className="case-mini-tag">{c.diagnosis || c.cancerType}</span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Notifications */}
      {error && (
        <div className="notification notification-error fade-in">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="notification notification-success fade-in">
          <CheckCircle size={18} />
          <span>{success}</span>
        </div>
      )}

      {/* Main Form */}
      {selectedPatient && (
        <form className="clinic-form" onSubmit={handleSubmit}>
          <div className="form-section">
            <h3>
              <Calendar size={18} />
              Follow-up Entry {editingId && <span className="edit-badge">Editing</span>}
            </h3>

            <div className="form-row">
              <div className="form-group">
                <label>Follow-up Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleChange('date', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-section-inner">
              <h4>Lab Results</h4>
              <div className="lab-grid">
                {GREEN_FILE_FIELDS.map((field) => (
                  <div className="form-group" key={field.key}>
                    <label>
                      {field.label}
                      {field.required && <span className="required-star">*</span>}
                      <span className="unit-label">({field.unit})</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder={`Enter ${field.label}`}
                      value={formData[field.key]}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      required={field.required}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Radioiodine Uptake (%)</label>
              <input
                type="number"
                step="any"
                min="0"
                max="100"
                placeholder="Enter radioiodine uptake percentage"
                value={formData.radioiodineUptake}
                onChange={(e) => handleChange('radioiodineUptake', e.target.value)}
              />
            </div>

            <div className="form-row-two">
              <div className="form-group">
                <label>Whole Body Scan Result</label>
                <textarea
                  rows={3}
                  placeholder="Describe whole body scan findings..."
                  value={formData.wbsResult}
                  onChange={(e) => handleChange('wbsResult', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Neck Ultrasound Findings</label>
                <textarea
                  rows={3}
                  placeholder="Describe neck ultrasound findings..."
                  value={formData.neckUsFindings}
                  onChange={(e) => handleChange('neckUsFindings', e.target.value)}
                />
              </div>
            </div>

            <div className="form-row-two">
              <div className="form-group">
                <label>Treatment Plan</label>
                <select
                  value={formData.treatmentPlan}
                  onChange={(e) => handleChange('treatmentPlan', e.target.value)}
                >
                  <option value="">Select treatment plan...</option>
                  {TREATMENT_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Response to Therapy</label>
                <select
                  value={formData.responseToTherapy}
                  onChange={(e) => handleChange('responseToTherapy', e.target.value)}
                >
                  <option value="">Select response...</option>
                  {RESPONSE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Recurrence Signs</label>
              <textarea
                rows={2}
                placeholder="Describe any signs of recurrence..."
                value={formData.recurrenceSigns}
                onChange={(e) => handleChange('recurrenceSigns', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Physician Notes</label>
              <textarea
                rows={3}
                placeholder="Additional notes..."
                value={formData.physicianNotes}
                onChange={(e) => handleChange('physicianNotes', e.target.value)}
              />
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="btn-primary btn-lg"
                disabled={submitting || !selectedPatient}
              >
                {submitting ? (
                  <>
                    <Loader2 size={18} className="spin" />
                    Saving...
                  </>
                ) : editingId ? (
                  <>
                    <Edit2 size={18} />
                    Update Record
                  </>
                ) : (
                  <>
                    <FileText size={18} />
                    Create Green File Entry
                  </>
                )}
              </button>
              {editingId && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setEditingId(null);
                    setFormData({
                      date: format(new Date(), 'yyyy-MM-dd'),
                      thyroglobulin: '',
                      antiTg: '',
                      tsh: '',
                      ft3: '',
                      ft4: '',
                      stimulatedTg: '',
                      radioiodineUptake: '',
                      wbsResult: '',
                      neckUsFindings: '',
                      treatmentPlan: '',
                      responseToTherapy: '',
                      recurrenceSigns: '',
                      physicianNotes: '',
                    });
                  }}
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </div>
        </form>
      )}

      {/* History Section */}
      {selectedPatient && (
        <div className="history-section">
          <h3>
            <FileText size={18} />
            Follow-up History ({history.length} entries)
          </h3>

          {historyLoading ? (
            <div className="loading-state">
              <Loader2 size={24} className="spin" />
              Loading history...
            </div>
          ) : history.length === 0 ? (
            <div className="empty-state">No follow-up entries recorded yet.</div>
          ) : (
            <div className="history-table-wrapper">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Thyroglobulin (ng/mL)</th>
                    <th>TSH (mIU/L)</th>
                    <th>Response</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((entry) => (
                    <>
                      <tr key={entry.id} className={expandedRow === entry.id ? 'expanded' : ''}>
                        <td>
                          {entry.date
                            ? format(new Date(entry.date), 'dd MMM yyyy')
                            : 'N/A'}
                        </td>
                        <td>
                          <span className={`lab-value ${entry.thyroglobulin > 2 ? 'high' : ''}`}>
                            {entry.thyroglobulin ?? '—'}
                          </span>
                        </td>
                        <td>{entry.tsh ?? '—'}</td>
                        <td>{getResponseBadge(entry.responseToTherapy)}</td>
                        <td className="actions-cell">
                          <button
                            className="btn-icon"
                            onClick={() => toggleExpand(entry.id)}
                            title="View details"
                          >
                            {expandedRow === entry.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                          <button
                            className="btn-icon edit-btn"
                            onClick={() => handleEdit(entry)}
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                        </td>
                      </tr>
                      {expandedRow === entry.id && (
                        <tr key={`${entry.id}-detail`} className="detail-row">
                          <td colSpan={5}>
                            <div className="detail-content">
                              <div className="detail-grid">
                                <div className="detail-item">
                                  <span className="detail-label">Anti-Tg:</span>
                                  <span>{entry.antiTg ?? '—'} IU/mL</span>
                                </div>
                                <div className="detail-item">
                                  <span className="detail-label">FT3:</span>
                                  <span>{entry.ft3 ?? '—'} pmol/L</span>
                                </div>
                                <div className="detail-item">
                                  <span className="detail-label">FT4:</span>
                                  <span>{entry.ft4 ?? '—'} pmol/L</span>
                                </div>
                                <div className="detail-item">
                                  <span className="detail-label">Stimulated Tg:</span>
                                  <span>{entry.stimulatedTg ?? '—'} ng/mL</span>
                                </div>
                                <div className="detail-item">
                                  <span className="detail-label">Radioiodine Uptake:</span>
                                  <span>{entry.radioiodineUptake != null ? `${entry.radioiodineUptake}%` : '—'}</span>
                                </div>
                                <div className="detail-item">
                                  <span className="detail-label">Treatment Plan:</span>
                                  <span>{entry.treatmentPlan || '—'}</span>
                                </div>
                              </div>
                              {entry.wbsResult && (
                                <div className="detail-text">
                                  <strong>Whole Body Scan:</strong>
                                  <p>{entry.wbsResult}</p>
                                </div>
                              )}
                              {entry.neckUsFindings && (
                                <div className="detail-text">
                                  <strong>Neck Ultrasound:</strong>
                                  <p>{entry.neckUsFindings}</p>
                                </div>
                              )}
                              {entry.recurrenceSigns && (
                                <div className="detail-text">
                                  <strong>Recurrence Signs:</strong>
                                  <p>{entry.recurrenceSigns}</p>
                                </div>
                              )}
                              {entry.physicianNotes && (
                                <div className="detail-text">
                                  <strong>Physician Notes:</strong>
                                  <p>{entry.physicianNotes}</p>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
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

export default ClinicGreenFile;
