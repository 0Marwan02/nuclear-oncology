import React, { useState, useEffect, useRef } from 'react';
import { Search, FileText, Droplets, Calendar, Loader2, CheckCircle, AlertCircle, ChevronDown, ChevronUp, Upload, X } from 'lucide-react';
import { format } from 'date-fns';
import { createScan, getScanHistory, apiFetch } from '../utils/api';
import ScanFormExtras from '../components/ScanFormExtras';
import { buildScanPayload } from '../utils/scanPayload';
import './ScanRenal.css';

const RENAL_SCAN_TYPE_OPTIONS = ['DTPA', 'DMSA'];

const ScanRenal = () => {
  const [patients, setPatients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);

  const [formData, setFormData] = useState({
    scanType: '',
    tc99mDose: '',
    injectionTime: '',
    scanTime: '',
    furosemideGiven: false,
    furosemideTime: '',
    aceInhibitorGiven: false,
    rightKidneyGFR: '',
    leftKidneyGFR: '',
    rightSplitFunction: '',
    leftSplitFunction: '',
    rightT12: '',
    leftT12: '',
    rightTmax: '',
    leftTmax: '',
    obstructionSign: false,
    refluxSign: false,
    corticalScarring: false,
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
      scanType: '',
      tc99mDose: '',
      injectionTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      scanTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      furosemideGiven: false,
      furosemideTime: '',
      aceInhibitorGiven: false,
      rightKidneyGFR: '',
      leftKidneyGFR: '',
      rightSplitFunction: '',
      leftSplitFunction: '',
      rightT12: '',
      leftT12: '',
      rightTmax: '',
      leftTmax: '',
      obstructionSign: false,
      refluxSign: false,
      corticalScarring: false,
      impression: '',
      physicianNotes: '',
      files: [],
    });
  };

  const fetchHistory = async () => {
    if (!selectedPatient?.id) return;
    setHistoryLoading(true);
    try {
      const data = await getScanHistory('renal', selectedPatient.id);
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
    if (!formData.scanType) {
      setError('Scan type is required');
      return;
    }
    if (!formData.tc99mDose) {
      setError('Tc-99m Dose is required');
      return;
    }

    setSubmitting(true);
    try {
      const payload = buildScanPayload('renal', formData, {
        patientId: selectedPatient.id,
        scanType: formData.scanType,
        tc99mDose: parseFloat(formData.tc99mDose) || null,
        furosemideGiven: formData.furosemideGiven,
        furosemideTime: formData.furosemideTime || null,
        aceInhibitorGiven: formData.aceInhibitorGiven,
        rightKidneyGFR: formData.rightKidneyGFR ? parseFloat(formData.rightKidneyGFR) : null,
        leftKidneyGFR: formData.leftKidneyGFR ? parseFloat(formData.leftKidneyGFR) : null,
        rightSplitFunction: formData.rightSplitFunction ? parseFloat(formData.rightSplitFunction) : null,
        leftSplitFunction: formData.leftSplitFunction ? parseFloat(formData.leftSplitFunction) : null,
        rightT1_2: formData.rightT12 ? parseFloat(formData.rightT12) : null,
        leftT1_2: formData.leftT12 ? parseFloat(formData.leftT12) : null,
        rightTmax: formData.rightTmax ? parseFloat(formData.rightTmax) : null,
        leftTmax: formData.leftTmax ? parseFloat(formData.leftTmax) : null,
        obstructionSign: formData.obstructionSign,
        refluxSign: formData.refluxSign,
        corticalScarring: formData.corticalScarring,
        impression: formData.impression,
        physicianNotes: formData.physicianNotes,
        workflowStatus: 'Assessed',
      });

      await createScan('renal', payload);
      setSuccess('Renal scan record created successfully');
      setFormData({
        scanType: '',
        tc99mDose: '',
        injectionTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        scanTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        furosemideGiven: false,
        furosemideTime: '',
        aceInhibitorGiven: false,
        rightKidneyGFR: '',
        leftKidneyGFR: '',
        rightSplitFunction: '',
        leftSplitFunction: '',
        rightT12: '',
        leftT12: '',
        rightTmax: '',
        leftTmax: '',
        obstructionSign: false,
        refluxSign: false,
        corticalScarring: false,
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
    <div className="scan-page renal-page">
      <div className="scan-header">
        <div className="scan-header-icon renal-icon">
          <Droplets size={28} />
        </div>
        <div>
          <h1>Renal Scan (DTPA/DMSA)</h1>
          <p className="scan-subtitle">فحص الكلى - DTPA / DMSA</p>
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
          <ScanFormExtras patientId={selectedPatient.id} scanType="renal" formData={formData} setFormData={setFormData} files={formData.files} onFileChange={handleFileChange} />
        <form className="clinic-form" onSubmit={handleSubmit}>
          <div className="form-section">
            <h3><Calendar size={18} />Renal Scan Details</h3>

            <div className="form-section-inner">
              <h4>Scan Configuration</h4>
              <div className="form-row-two">
                <div className="form-group">
                  <label>Scan Type <span className="required-star">*</span></label>
                  <select value={formData.scanType} onChange={(e) => handleChange('scanType', e.target.value)} required>
                    <option value="">Select scan type...</option>
                    {RENAL_SCAN_TYPE_OPTIONS.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Tc-99m Dose <span className="required-star">*</span> <span className="unit-label">(mCi)</span></label>
                  <input type="number" step="any" placeholder="e.g., 5" value={formData.tc99mDose} onChange={(e) => handleChange('tc99mDose', e.target.value)} required />
                </div>
              </div>
            </div>

            <div className="form-section-inner">
              <h4>Timing</h4>
              <div className="form-row-two">
                <div className="form-group">
                  <label>Injection Time</label>
                  <input type="datetime-local" value={formData.injectionTime} onChange={(e) => handleChange('injectionTime', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Scan Time</label>
                  <input type="datetime-local" value={formData.scanTime} onChange={(e) => handleChange('scanTime', e.target.value)} />
                </div>
              </div>
              <div className="checkbox-group mt-16">
                <label className="checkbox-label">
                  <input type="checkbox" checked={formData.furosemideGiven} onChange={(e) => handleChange('furosemideGiven', e.target.checked)} />
                  <span>Furosemide Given</span>
                </label>
                {formData.furosemideGiven && (
                  <div className="form-group inline-group">
                    <label>Furosemide Time</label>
                    <input type="datetime-local" value={formData.furosemideTime} onChange={(e) => handleChange('furosemideTime', e.target.value)} />
                  </div>
                )}
                <label className="checkbox-label">
                  <input type="checkbox" checked={formData.aceInhibitorGiven} onChange={(e) => handleChange('aceInhibitorGiven', e.target.checked)} />
                  <span>ACE Inhibitor Given</span>
                </label>
              </div>
            </div>

            <div className="form-section-inner">
              <h4>GFR & Split Function</h4>
              <div className="lab-grid">
                <div className="form-group">
                  <label>Right Kidney GFR <span className="unit-label">(mL/min)</span></label>
                  <input type="number" step="any" placeholder="Right GFR" value={formData.rightKidneyGFR} onChange={(e) => handleChange('rightKidneyGFR', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Left Kidney GFR <span className="unit-label">(mL/min)</span></label>
                  <input type="number" step="any" placeholder="Left GFR" value={formData.leftKidneyGFR} onChange={(e) => handleChange('leftKidneyGFR', e.target.value)} />
                </div>
              </div>
              <div className="lab-grid mt-16">
                <div className="form-group">
                  <label>Right Split Function <span className="unit-label">(%)</span></label>
                  <input type="number" step="any" min="0" max="100" placeholder="%" value={formData.rightSplitFunction} onChange={(e) => handleChange('rightSplitFunction', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Left Split Function <span className="unit-label">(%)</span></label>
                  <input type="number" step="any" min="0" max="100" placeholder="%" value={formData.leftSplitFunction} onChange={(e) => handleChange('leftSplitFunction', e.target.value)} />
                </div>
              </div>
            </div>

            <div className="form-section-inner">
              <h4>Kinetics (T1/2 & Tmax)</h4>
              <div className="lab-grid">
                <div className="form-group">
                  <label>Right T1/2 <span className="unit-label">(min)</span></label>
                  <input type="number" step="any" placeholder="Right half-time" value={formData.rightT12} onChange={(e) => handleChange('rightT12', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Left T1/2 <span className="unit-label">(min)</span></label>
                  <input type="number" step="any" placeholder="Left half-time" value={formData.leftT12} onChange={(e) => handleChange('leftT12', e.target.value)} />
                </div>
              </div>
              <div className="lab-grid mt-16">
                <div className="form-group">
                  <label>Right Tmax <span className="unit-label">(min)</span></label>
                  <input type="number" step="any" placeholder="Right peak time" value={formData.rightTmax} onChange={(e) => handleChange('rightTmax', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Left Tmax <span className="unit-label">(min)</span></label>
                  <input type="number" step="any" placeholder="Left peak time" value={formData.leftTmax} onChange={(e) => handleChange('leftTmax', e.target.value)} />
                </div>
              </div>
            </div>

            <div className="form-section-inner">
              <h4>Pathological Signs</h4>
              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input type="checkbox" checked={formData.obstructionSign} onChange={(e) => handleChange('obstructionSign', e.target.checked)} />
                  <span>Obstruction Sign</span>
                </label>
                <label className="checkbox-label">
                  <input type="checkbox" checked={formData.refluxSign} onChange={(e) => handleChange('refluxSign', e.target.checked)} />
                  <span>Reflux Sign</span>
                </label>
                <label className="checkbox-label">
                  <input type="checkbox" checked={formData.corticalScarring} onChange={(e) => handleChange('corticalScarring', e.target.checked)} />
                  <span>Cortical Scarring</span>
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
                {submitting ? (<><Loader2 size={18} className="spin" />Saving...</>) : (<><FileText size={18} />Create Renal Record</>)}
              </button>
            </div>
          </div>
        </form>
        </>
      )}

      {selectedPatient && (
        <div className="history-section">
          <h3><FileText size={18} />Patient Renal History ({history.length})</h3>
          {historyLoading ? (<div className="loading-state"><Loader2 size={24} className="spin" />Loading...</div>) : history.length === 0 ? (<div className="empty-state">No previous renal scans recorded.</div>) : (
            <div className="history-table-wrapper">
              <table className="history-table">
                <thead>
                  <tr><th>Date</th><th>Type</th><th>Right GFR</th><th>Left GFR</th><th>Right SF%</th><th>Left SF%</th><th>Signs</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {history.map((entry) => (
                    <React.Fragment key={entry.id}>
                      <tr className={expandedRow === entry.id ? 'expanded' : ''}>
                        <td>{entry.createdAt ? format(new Date(entry.createdAt), 'dd MMM yyyy HH:mm') : 'N/A'}</td>
                        <td>{entry.scanType || '—'}</td>
                        <td>{entry.rightKidneyGFR != null ? `${entry.rightKidneyGFR}` : '—'}</td>
                        <td>{entry.leftKidneyGFR != null ? `${entry.leftKidneyGFR}` : '—'}</td>
                        <td>{entry.rightSplitFunction != null ? `${entry.rightSplitFunction}%` : '—'}</td>
                        <td>{entry.leftSplitFunction != null ? `${entry.leftSplitFunction}%` : '—'}</td>
                        <td>
                          <div className="meta-tags">
                            {entry.obstructionSign && <span className="tag tag-red">Obstruction</span>}
                            {entry.refluxSign && <span className="tag tag-orange">Reflux</span>}
                            {entry.corticalScarring && <span className="tag tag-gray">Scarring</span>}
                            {!entry.obstructionSign && !entry.refluxSign && !entry.corticalScarring && <span>—</span>}
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
                                <div className="detail-item"><span className="detail-label">Furosemide:</span><span>{entry.furosemideGiven ? 'Yes' : 'No'}</span></div>
                                <div className="detail-item"><span className="detail-label">ACE Inhibitor:</span><span>{entry.aceInhibitorGiven ? 'Yes' : 'No'}</span></div>
                                <div className="detail-item"><span className="detail-label">Right T1/2:</span><span>{entry.rightT12 != null ? `${entry.rightT12} min` : '—'}</span></div>
                                <div className="detail-item"><span className="detail-label">Left T1/2:</span><span>{entry.leftT12 != null ? `${entry.leftT12} min` : '—'}</span></div>
                                <div className="detail-item"><span className="detail-label">Right Tmax:</span><span>{entry.rightTmax != null ? `${entry.rightTmax} min` : '—'}</span></div>
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

export default ScanRenal;
