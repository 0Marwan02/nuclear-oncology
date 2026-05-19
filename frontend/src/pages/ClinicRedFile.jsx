import { useState, useEffect, useRef } from 'react';
import { Search, Calendar, Activity, FileText, ChevronDown, ChevronUp, Loader2, CheckCircle, AlertCircle, Edit2 } from 'lucide-react';
import { format } from 'date-fns';
import { getClinics, createClinic, updateClinic, getClinicHistory } from '../utils/api';
import './ClinicRedFile.css';

const RED_FILE_LAB_FIELDS = [
  { key: 'tsh', label: 'TSH', unit: 'mIU/L', required: true },
  { key: 'ft3', label: 'FT3', unit: 'pmol/L', required: false },
  { key: 'ft4', label: 'FT4', unit: 'pmol/L', required: false },
  { key: 'antiTpo', label: 'Anti-TPO', unit: 'IU/mL', required: false },
  { key: 'antiTg', label: 'Anti-Tg', unit: 'IU/mL', required: false },
  { key: 'trab', label: 'TRAb', unit: 'IU/L', required: false },
];

const ClinicRedFile = () => {
  const [diseaseType, setDiseaseType] = useState('hypothyroidism');
  const [patients, setPatients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientCases, setPatientCases] = useState([]);

  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    tsh: '',
    ft3: '',
    ft4: '',
    antiTpo: '',
    antiTg: '',
    trab: '',
    thyroidVolume: '',
    rightLobeSize: '',
    leftLobeSize: '',
    nodulePresent: false,
    noduleDetails: '',
    symptoms: '',
    currentMedication: '',
    doseAdjustment: '',
    physicianNotes: '',
  });

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedRow, setExpandedRow] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [historyFilter, setHistoryFilter] = useState('all');

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
  }, [selectedPatient, diseaseType]);

  const searchPatients = async () => {
    try {
      const data = await getClinics('red', { q: searchQuery });
      setPatients(data.patients || data || []);
    } catch {
      try {
        const allPatients = await getClinics('red');
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
      const data = await getClinicHistory('red', selectedPatient.id);
      const entries = Array.isArray(data) ? data : data.entries || data.records || [];
      setHistory(entries);
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

    if (!formData.tsh) {
      setError('TSH is a required field');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        patientId: selectedPatient.id,
        diseaseType,
        ...formData,
        tsh: parseFloat(formData.tsh) || null,
        ft3: formData.ft3 ? parseFloat(formData.ft3) : null,
        ft4: formData.ft4 ? parseFloat(formData.ft4) : null,
        antiTpo: formData.antiTpo ? parseFloat(formData.antiTpo) : null,
        antiTg: formData.antiTg ? parseFloat(formData.antiTg) : null,
        trab: formData.trab ? parseFloat(formData.trab) : null,
        thyroidVolume: formData.thyroidVolume ? parseFloat(formData.thyroidVolume) : null,
        rightLobeSize: formData.rightLobeSize ? parseFloat(formData.rightLobeSize) : null,
        leftLobeSize: formData.leftLobeSize ? parseFloat(formData.leftLobeSize) : null,
      };

      if (editingId) {
        await updateClinic('red', editingId, payload);
        setSuccess('Record updated successfully');
        setEditingId(null);
      } else {
        await createClinic('red', payload);
        setSuccess('Red file entry created successfully');
      }

      setFormData({
        date: format(new Date(), 'yyyy-MM-dd'),
        tsh: '',
        ft3: '',
        ft4: '',
        antiTpo: '',
        antiTg: '',
        trab: '',
        thyroidVolume: '',
        rightLobeSize: '',
        leftLobeSize: '',
        nodulePresent: false,
        noduleDetails: '',
        symptoms: '',
        currentMedication: '',
        doseAdjustment: '',
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
      tsh: entry.tsh ?? '',
      ft3: entry.ft3 ?? '',
      ft4: entry.ft4 ?? '',
      antiTpo: entry.antiTpo ?? '',
      antiTg: entry.antiTg ?? '',
      trab: entry.trab ?? '',
      thyroidVolume: entry.thyroidVolume ?? '',
      rightLobeSize: entry.rightLobeSize ?? '',
      leftLobeSize: entry.leftLobeSize ?? '',
      nodulePresent: entry.nodulePresent || false,
      noduleDetails: entry.noduleDetails || '',
      symptoms: entry.symptoms || '',
      currentMedication: entry.currentMedication || '',
      doseAdjustment: entry.doseAdjustment || '',
      physicianNotes: entry.physicianNotes || '',
    });
    setEditingId(entry.id);
    if (entry.diseaseType) {
      setDiseaseType(entry.diseaseType);
    }
    setError('');
    setSuccess('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleExpand = (id) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  const filteredHistory = historyFilter === 'all'
    ? history
    : history.filter((e) => e.diseaseType === historyFilter);

  const getDiseaseTypeLabel = (type) => {
    if (type === 'hypothyroidism') return 'Hypothyroidism';
    if (type === 'hyperthyroidism') return 'Hyperthyroidism';
    return type || '—';
  };

  const getDiseaseTypeBadge = (type) => {
    if (!type) return null;
    const cls = type === 'hypothyroidism' ? 'hypo' : 'hyper';
    return <span className={`disease-type-badge ${cls}`}>{getDiseaseTypeLabel(type)}</span>;
  };

  return (
    <div className="clinic-page red-file-page">
      <div className="clinic-header">
        <div className="clinic-header-icon red-icon">
          <Activity size={28} />
        </div>
        <div>
          <h1>Red File - Thyroid Diseases</h1>
          <p className="clinic-subtitle">ملف أمراض الغدة الدرقية</p>
        </div>
      </div>

      {/* Disease Type Selector */}
      <div className="disease-type-section">
        <h2>Select Disease Type - نوع المرض</h2>
        <div className="disease-toggle">
          <button
            className={`disease-toggle-btn ${diseaseType === 'hypothyroidism' ? 'active-hypo' : ''}`}
            onClick={() => setDiseaseType('hypothyroidism')}
          >
            <h4>Hypothyroidism</h4>
            <p>خمول الغدة الدرقية</p>
          </button>
          <button
            className={`disease-toggle-btn ${diseaseType === 'hyperthyroidism' ? 'active-hyper' : ''}`}
            onClick={() => setDiseaseType('hyperthyroidism')}
          >
            <h4>Hyperthyroidism</h4>
            <p>نشاط زائد في الغدة الدرقية</p>
          </button>
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
          <div className="form-section red-accent-border">
            <h3>
              <Calendar size={18} />
              Follow-up Entry - {diseaseType === 'hypothyroidism' ? 'Hypothyroidism (خمول)' : 'Hyperthyroidism (نشاط زايد)'}
              {editingId && <span className="edit-badge">Editing</span>}
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
                {RED_FILE_LAB_FIELDS.map((field) => (
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

            <div className="form-section-inner">
              <h4>Thyroid Measurements</h4>
              <div className="lab-grid">
                <div className="form-group">
                  <label>Thyroid Volume (mL)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="Total volume"
                    value={formData.thyroidVolume}
                    onChange={(e) => handleChange('thyroidVolume', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Right Lobe Size (cm)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="Right lobe"
                    value={formData.rightLobeSize}
                    onChange={(e) => handleChange('rightLobeSize', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Left Lobe Size (cm)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="Left lobe"
                    value={formData.leftLobeSize}
                    onChange={(e) => handleChange('leftLobeSize', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="form-group nodule-section">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.nodulePresent}
                  onChange={(e) => handleChange('nodulePresent', e.target.checked)}
                />
                <span>Nodule Present</span>
              </label>
              {formData.nodulePresent && (
                <div className="nodule-details fade-in">
                  <label>Nodule Details</label>
                  <textarea
                    rows={2}
                    placeholder="Describe nodule characteristics (size, location, composition, echogenicity, margins, calcifications)..."
                    value={formData.noduleDetails}
                    onChange={(e) => handleChange('noduleDetails', e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Symptoms</label>
              <textarea
                rows={2}
                placeholder="Describe current symptoms..."
                value={formData.symptoms}
                onChange={(e) => handleChange('symptoms', e.target.value)}
              />
            </div>

            <div className="form-row-two">
              <div className="form-group">
                <label>Current Medication</label>
                <textarea
                  rows={2}
                  placeholder="List current medications and dosages..."
                  value={formData.currentMedication}
                  onChange={(e) => handleChange('currentMedication', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Dose Adjustment</label>
                <textarea
                  rows={2}
                  placeholder="Describe any dose adjustments..."
                  value={formData.doseAdjustment}
                  onChange={(e) => handleChange('doseAdjustment', e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Physician Notes</label>
              <textarea
                rows={3}
                placeholder="Additional notes and recommendations..."
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
                    Create Red File Entry
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
                      tsh: '',
                      ft3: '',
                      ft4: '',
                      antiTpo: '',
                      antiTg: '',
                      trab: '',
                      thyroidVolume: '',
                      rightLobeSize: '',
                      leftLobeSize: '',
                      nodulePresent: false,
                      noduleDetails: '',
                      symptoms: '',
                      currentMedication: '',
                      doseAdjustment: '',
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
          <div className="history-header">
            <h3>
              <FileText size={18} />
              Follow-up History ({filteredHistory.length} entries)
            </h3>
            <div className="history-filter">
              <label>Filter by type:</label>
              <select
                value={historyFilter}
                onChange={(e) => setHistoryFilter(e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="hypothyroidism">Hypothyroidism (خمول)</option>
                <option value="hyperthyroidism">Hyperthyroidism (نشاط زايد)</option>
              </select>
            </div>
          </div>

          {historyLoading ? (
            <div className="loading-state">
              <Loader2 size={24} className="spin" />
              Loading history...
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="empty-state">No follow-up entries recorded yet.</div>
          ) : (
            <div className="history-table-wrapper">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>TSH (mIU/L)</th>
                    <th>Medication</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((entry) => (
                    <>
                      <tr key={entry.id} className={expandedRow === entry.id ? 'expanded' : ''}>
                        <td>
                          {entry.date
                            ? format(new Date(entry.date), 'dd MMM yyyy')
                            : 'N/A'}
                        </td>
                        <td>{getDiseaseTypeBadge(entry.diseaseType || diseaseType)}</td>
                        <td>
                          <span className={`lab-value ${entry.tsh > 10 || entry.tsh < 0.1 ? 'high' : ''}`}>
                            {entry.tsh ?? '—'}
                          </span>
                        </td>
                        <td className="medication-cell">
                          {entry.currentMedication
                            ? (entry.currentMedication.length > 40
                                ? `${entry.currentMedication.substring(0, 40)}...`
                                : entry.currentMedication)
                            : '—'}
                        </td>
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
                                  <span className="detail-label">FT3:</span>
                                  <span>{entry.ft3 ?? '—'} pmol/L</span>
                                </div>
                                <div className="detail-item">
                                  <span className="detail-label">FT4:</span>
                                  <span>{entry.ft4 ?? '—'} pmol/L</span>
                                </div>
                                <div className="detail-item">
                                  <span className="detail-label">Anti-TPO:</span>
                                  <span>{entry.antiTpo ?? '—'} IU/mL</span>
                                </div>
                                <div className="detail-item">
                                  <span className="detail-label">Anti-Tg:</span>
                                  <span>{entry.antiTg ?? '—'} IU/mL</span>
                                </div>
                                <div className="detail-item">
                                  <span className="detail-label">TRAb:</span>
                                  <span>{entry.trab ?? '—'} IU/L</span>
                                </div>
                                <div className="detail-item">
                                  <span className="detail-label">Thyroid Volume:</span>
                                  <span>{entry.thyroidVolume != null ? `${entry.thyroidVolume} mL` : '—'}</span>
                                </div>
                                <div className="detail-item">
                                  <span className="detail-label">Right Lobe:</span>
                                  <span>{entry.rightLobeSize != null ? `${entry.rightLobeSize} cm` : '—'}</span>
                                </div>
                                <div className="detail-item">
                                  <span className="detail-label">Left Lobe:</span>
                                  <span>{entry.leftLobeSize != null ? `${entry.leftLobeSize} cm` : '—'}</span>
                                </div>
                                <div className="detail-item">
                                  <span className="detail-label">Nodule:</span>
                                  <span>{entry.nodulePresent ? 'Yes' : 'No'}</span>
                                </div>
                              </div>
                              {entry.noduleDetails && (
                                <div className="detail-text">
                                  <strong>Nodule Details:</strong>
                                  <p>{entry.noduleDetails}</p>
                                </div>
                              )}
                              {entry.symptoms && (
                                <div className="detail-text">
                                  <strong>Symptoms:</strong>
                                  <p>{entry.symptoms}</p>
                                </div>
                              )}
                              {entry.currentMedication && (
                                <div className="detail-text">
                                  <strong>Current Medication:</strong>
                                  <p>{entry.currentMedication}</p>
                                </div>
                              )}
                              {entry.doseAdjustment && (
                                <div className="detail-text">
                                  <strong>Dose Adjustment:</strong>
                                  <p>{entry.doseAdjustment}</p>
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

export default ClinicRedFile;
