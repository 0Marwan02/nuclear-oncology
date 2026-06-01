import React, { useState, useEffect, useRef } from 'react';
import { Search, FileText, UtensilsCrossed, Calendar, Loader2, CheckCircle, AlertCircle, ChevronDown, ChevronUp, Upload, X } from 'lucide-react';
import { format } from 'date-fns';
import { createScan, getScanHistory, apiFetch } from '../utils/api';
import ScanFormExtras from '../components/ScanFormExtras';
import { buildScanPayload } from '../utils/scanPayload';
import './ScanGastric.css';

const MEAL_TYPE_OPTIONS = ['Solid', 'Liquid', 'Mixed'];

const ScanGastric = () => {
  const [patients, setPatients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);

  const [formData, setFormData] = useState({
    mealType: '',
    tc99mDose: '',
    ingestionTime: '',
    scanStartTime: '',
    scanDuration: '',
    imageInterval: '',
    halfEmptyingTime: '',
    retention1h: '',
    retention2h: '',
    retention4h: '',
    delayedEmptying: false,
    rapidEmptying: false,
    refluxSign: false,
    aspirationSign: false,
    impression: '',
    physicianNotes: '',
    files: [],
  });

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedRow, setExpandedRow] = useState(null);

  const searchRef = useRef(null);
  const dropdownRef = useRef(null);
  const fileInputRef = useRef(null);

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
      const data = await apiFetch(`/patients?q=${encodeURIComponent(searchQuery)}`);
      setPatients(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setPatients([]);
    }
  };

  const selectPatient = (patient) => {
    setSelectedPatient(patient);
    setSearchQuery(patient.name);
    setShowDropdown(false);
    setFormData({
      mealType: '',
      tc99mDose: '',
      ingestionTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      scanStartTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      scanDuration: '',
      imageInterval: '',
      halfEmptyingTime: '',
      retention1h: '',
      retention2h: '',
      retention4h: '',
      delayedEmptying: false,
      rapidEmptying: false,
      refluxSign: false,
      aspirationSign: false,
      impression: '',
      physicianNotes: '',
      files: [],
    });
  };

  const fetchHistory = async () => {
    if (!selectedPatient?.id) return;
    setHistoryLoading(true);
    try {
      const data = await getScanHistory('gastric', selectedPatient.id);
      setHistory(Array.isArray(data) ? data : []);
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

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setFormData((prev) => ({ ...prev, files: [...prev.files, ...files] }));
  };

  const removeFile = (index) => {
    setFormData((prev) => ({ ...prev, files: prev.files.filter((_, i) => i !== index) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedPatient) {
      setError('Please select a patient first');
      return;
    }
    if (!formData.mealType) {
      setError('Meal type is required');
      return;
    }
    if (!formData.tc99mDose) {
      setError('Tc-99m Dose is required');
      return;
    }

    setSubmitting(true);
    try {
      const payload = buildScanPayload('gastric', formData, {
        patientId: selectedPatient.id,
        mealType: formData.mealType,
        tc99mDose: parseFloat(formData.tc99mDose) || null,
        ingestionTime: formData.ingestionTime || null,
        scanStartTime: formData.scanStartTime || null,
        scanDuration: formData.scanDuration ? parseInt(formData.scanDuration) : null,
        imageInterval: formData.imageInterval ? parseInt(formData.imageInterval) : null,
        halfEmptyingTime: formData.halfEmptyingTime ? parseFloat(formData.halfEmptyingTime) : null,
        retention1h: formData.retention1h ? parseFloat(formData.retention1h) : null,
        retention2h: formData.retention2h ? parseFloat(formData.retention2h) : null,
        retention4h: formData.retention4h ? parseFloat(formData.retention4h) : null,
        delayedEmptying: formData.delayedEmptying,
        rapidEmptying: formData.rapidEmptying,
        refluxSign: formData.refluxSign,
        aspirationSign: formData.aspirationSign,
        impression: formData.impression,
        physicianNotes: formData.physicianNotes,
        workflowStatus: 'Assessed',
      });

      await createScan('gastric', payload);
      setSuccess('Gastric emptying scan record created successfully');
      setFormData({
        mealType: '',
        tc99mDose: '',
        ingestionTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        scanStartTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        scanDuration: '',
        imageInterval: '',
        halfEmptyingTime: '',
        retention1h: '',
        retention2h: '',
        retention4h: '',
        delayedEmptying: false,
        rapidEmptying: false,
        refluxSign: false,
        aspirationSign: false,
        impression: '',
        physicianNotes: '',
        files: [],
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchHistory();
    } catch (err) {
      setError(err.message || 'Failed to save record');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleExpand = (id) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  return (
    <div className="scan-page gastric-page">
      <div className="scan-header">
        <div className="scan-header-icon gastric-icon">
          <UtensilsCrossed size={28} />
        </div>
        <div>
          <h1>Gastric Emptying Scan</h1>
          <p className="scan-subtitle">فحص تفريغ المعدة</p>
        </div>
      </div>

      <div className="patient-selector-section">
        <h2><Search size={18} />Select Patient</h2>
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

      {error && (<div className="notification notification-error fade-in"><AlertCircle size={18} /><span>{error}</span></div>)}
      {success && (<div className="notification notification-success fade-in"><CheckCircle size={18} /><span>{success}</span></div>)}

      {selectedPatient && (
        <>
          <ScanFormExtras patientId={selectedPatient.id} scanType="gastric" formData={formData} setFormData={setFormData} files={formData.files} onFileChange={handleFileChange} />
        <form className="clinic-form" onSubmit={handleSubmit}>
          <div className="form-section">
            <h3><Calendar size={18} />Gastric Emptying Details</h3>

            <div className="form-section-inner">
              <h4>Meal & Radiopharmaceutical</h4>
              <div className="lab-grid">
                <div className="form-group">
                  <label>Meal Type <span className="required-star">*</span></label>
                  <select value={formData.mealType} onChange={(e) => handleChange('mealType', e.target.value)} required>
                    <option value="">Select meal type...</option>
                    {MEAL_TYPE_OPTIONS.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Tc-99m Dose <span className="required-star">*</span> <span className="unit-label">(mCi)</span></label>
                  <input type="number" step="any" placeholder="e.g., 0.5" value={formData.tc99mDose} onChange={(e) => handleChange('tc99mDose', e.target.value)} required />
                </div>
              </div>
            </div>

            <div className="form-section-inner">
              <h4>Timing</h4>
              <div className="form-row-two">
                <div className="form-group">
                  <label>Ingestion Time</label>
                  <input type="datetime-local" value={formData.ingestionTime} onChange={(e) => handleChange('ingestionTime', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Scan Start Time</label>
                  <input type="datetime-local" value={formData.scanStartTime} onChange={(e) => handleChange('scanStartTime', e.target.value)} />
                </div>
              </div>
              <div className="lab-grid mt-16">
                <div className="form-group">
                  <label>Scan Duration <span className="unit-label">(minutes)</span></label>
                  <input type="number" placeholder="e.g., 120" value={formData.scanDuration} onChange={(e) => handleChange('scanDuration', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Image Interval <span className="unit-label">(minutes)</span></label>
                  <input type="number" placeholder="e.g., 15" value={formData.imageInterval} onChange={(e) => handleChange('imageInterval', e.target.value)} />
                </div>
              </div>
            </div>

            <div className="form-section-inner">
              <h4>Emptying Measurements</h4>
              <div className="form-row">
                <div className="form-group">
                  <label>Half Emptying Time <span className="unit-label">(minutes)</span></label>
                  <input type="number" step="any" placeholder="T1/2" value={formData.halfEmptyingTime} onChange={(e) => handleChange('halfEmptyingTime', e.target.value)} />
                </div>
              </div>
              <div className="lab-grid mt-16">
                <div className="form-group">
                  <label>Retention at 1h <span className="unit-label">(%)</span></label>
                  <input type="number" step="any" min="0" max="100" placeholder="%" value={formData.retention1h} onChange={(e) => handleChange('retention1h', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Retention at 2h <span className="unit-label">(%)</span></label>
                  <input type="number" step="any" min="0" max="100" placeholder="%" value={formData.retention2h} onChange={(e) => handleChange('retention2h', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Retention at 4h <span className="unit-label">(%)</span></label>
                  <input type="number" step="any" min="0" max="100" placeholder="%" value={formData.retention4h} onChange={(e) => handleChange('retention4h', e.target.value)} />
                </div>
              </div>
            </div>

            <div className="form-section-inner">
              <h4>Abnormal Findings</h4>
              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input type="checkbox" checked={formData.delayedEmptying} onChange={(e) => handleChange('delayedEmptying', e.target.checked)} />
                  <span>Delayed Emptying</span>
                </label>
                <label className="checkbox-label">
                  <input type="checkbox" checked={formData.rapidEmptying} onChange={(e) => handleChange('rapidEmptying', e.target.checked)} />
                  <span>Rapid Emptying</span>
                </label>
                <label className="checkbox-label">
                  <input type="checkbox" checked={formData.refluxSign} onChange={(e) => handleChange('refluxSign', e.target.checked)} />
                  <span>Reflux Sign</span>
                </label>
                <label className="checkbox-label">
                  <input type="checkbox" checked={formData.aspirationSign} onChange={(e) => handleChange('aspirationSign', e.target.checked)} />
                  <span>Aspiration Sign</span>
                </label>
              </div>
            </div>

            <div className="form-group">
              <label>Impression</label>
              <textarea rows={4} placeholder="Overall impression and conclusion..." value={formData.impression} onChange={(e) => handleChange('impression', e.target.value)} />
            </div>

            <div className="form-group">
              <label>Physician Notes</label>
              <textarea rows={3} placeholder="Additional notes..." value={formData.physicianNotes} onChange={(e) => handleChange('physicianNotes', e.target.value)} />
            </div>

            <div className="form-section-inner">
              <h4>Scan Images</h4>
              <div className="file-upload-area">
                <input type="file" ref={fileInputRef} multiple accept="image/*,.pdf,.dcm" onChange={handleFileChange} className="file-input-hidden" />
                <button type="button" className="btn-upload" onClick={() => fileInputRef.current?.click()}>
                  <Upload size={18} />
                  Upload Scan Images
                </button>
                {formData.files.length > 0 && (
                  <div className="file-list">
                    {formData.files.map((file, i) => (
                      <div key={i} className="file-item">
                        <span className="file-name">{file.name}</span>
                        <button type="button" className="file-remove" onClick={() => removeFile(i)}><X size={14} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary btn-lg" disabled={submitting}>
                {submitting ? (<><Loader2 size={18} className="spin" />Saving...</>) : (<><FileText size={18} />Create Gastric Record</>)}
              </button>
            </div>
          </div>
        </form>
        </>
      )}

      {selectedPatient && (
        <div className="history-section">
          <h3><FileText size={18} />Patient Gastric History ({history.length})</h3>
          {historyLoading ? (<div className="loading-state"><Loader2 size={24} className="spin" />Loading...</div>) : history.length === 0 ? (<div className="empty-state">No previous gastric emptying scans recorded.</div>) : (
            <div className="history-table-wrapper">
              <table className="history-table">
                <thead>
                  <tr><th>Date</th><th>Meal</th><th>T1/2 (min)</th><th>1h Retention</th><th>2h Retention</th><th>4h Retention</th><th>Signs</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {history.map((entry) => (
                    <React.Fragment key={entry.id}>
                      <tr className={expandedRow === entry.id ? 'expanded' : ''}>
                        <td>{entry.createdAt ? format(new Date(entry.createdAt), 'dd MMM yyyy HH:mm') : 'N/A'}</td>
                        <td>{entry.mealType || '—'}</td>
                        <td>{entry.halfEmptyingTime != null ? `${entry.halfEmptyingTime}` : '—'}</td>
                        <td>{entry.retention1h != null ? `${entry.retention1h}%` : '—'}</td>
                        <td>{entry.retention2h != null ? `${entry.retention2h}%` : '—'}</td>
                        <td>{entry.retention4h != null ? `${entry.retention4h}%` : '—'}</td>
                        <td>
                          <div className="meta-tags">
                            {entry.delayedEmptying && <span className="tag tag-orange">Delayed</span>}
                            {entry.rapidEmptying && <span className="tag tag-red">Rapid</span>}
                            {entry.refluxSign && <span className="tag tag-blue">Reflux</span>}
                            {entry.aspirationSign && <span className="tag tag-purple">Aspiration</span>}
                            {!entry.delayedEmptying && !entry.rapidEmptying && !entry.refluxSign && !entry.aspirationSign && <span>—</span>}
                          </div>
                        </td>
                        <td className="actions-cell">
                          <button className="btn-icon" onClick={() => toggleExpand(entry.id)} title="View details">
                            {expandedRow === entry.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </td>
                      </tr>
                      {expandedRow === entry.id && (
                        <tr key={`${entry.id}-detail`} className="detail-row">
                          <td colSpan={8}>
                            <div className="detail-content">
                              <div className="detail-grid">
                                <div className="detail-item"><span className="detail-label">Tc-99m Dose:</span><span>{entry.tc99mDose != null ? `${entry.tc99mDose} mCi` : '—'}</span></div>
                                <div className="detail-item"><span className="detail-label">Scan Duration:</span><span>{entry.scanDuration != null ? `${entry.scanDuration} min` : '—'}</span></div>
                                <div className="detail-item"><span className="detail-label">Image Interval:</span><span>{entry.imageInterval != null ? `${entry.imageInterval} min` : '—'}</span></div>
                              </div>
                              {entry.impression && (<div className="detail-text"><strong>Impression:</strong><p>{entry.impression}</p></div>)}
                              {entry.physicianNotes && (<div className="detail-text"><strong>Notes:</strong><p>{entry.physicianNotes}</p></div>)}
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

export default ScanGastric;
