import React, { useState, useEffect, useRef } from 'react';
import { Search, FileText, Activity, Calendar, Loader2, CheckCircle, AlertCircle, Edit2, ChevronDown, ChevronUp, Upload, X } from 'lucide-react';
import { format } from 'date-fns';
import { createScan, getScanHistory, apiFetch } from '../utils/api';
import ScanFormExtras from '../components/ScanFormExtras';
import { buildScanPayload } from '../utils/scanPayload';
import './ScanPETCT.css';

const ScanPETCT = () => {
  const [patients, setPatients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);

  const [formData, setFormData] = useState({
    referralReason: '',
    fdgDose: '',
    bloodSugar: '',
    injectionTime: '',
    scanTime: '',
    uptakeTime: '',
    bodyRegion: '',
    suvMax: '',
    suvMean: '',
    lesionLocation: '',
    lesionSize: '',
    metastasisPresent: false,
    metastasisDetails: '',
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
  const [uploading, setUploading] = useState(false);

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
      referralReason: '',
      fdgDose: '',
      bloodSugar: '',
      injectionTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      scanTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      uptakeTime: '',
      bodyRegion: '',
      suvMax: '',
      suvMean: '',
      lesionLocation: '',
      lesionSize: '',
      metastasisPresent: false,
      metastasisDetails: '',
      impression: '',
      physicianNotes: '',
      files: [],
    });
  };

  const fetchHistory = async () => {
    if (!selectedPatient?.id) return;
    setHistoryLoading(true);
    try {
      const data = await getScanHistory('petct', selectedPatient.id);
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
    if (!formData.referralReason) {
      setError('Referral reason is required');
      return;
    }
    if (!formData.fdgDose) {
      setError('FDG Dose is required');
      return;
    }

    setSubmitting(true);
    try {
      const payload = buildScanPayload('petct', formData, {
        patientId: selectedPatient.id,
        referralReason: formData.referralReason,
        bloodSugar: formData.bloodSugar ? parseFloat(formData.bloodSugar) : null,
        uptakeTime: formData.uptakeTime ? parseInt(formData.uptakeTime) : null,
        bodyRegion: formData.bodyRegion,
        suvMax: formData.suvMax ? parseFloat(formData.suvMax) : null,
        suvMean: formData.suvMean ? parseFloat(formData.suvMean) : null,
        lesionLocation: formData.lesionLocation,
        lesionSize: formData.lesionSize,
        metastasisPresent: formData.metastasisPresent,
        metastasisDetails: formData.metastasisDetails,
        impression: formData.impression,
        physicianNotes: formData.physicianNotes,
        workflowStatus: 'Registered',
      });

      await createScan('petct', payload);
      setSuccess('PET/CT scan record created successfully');
      setFormData({
        referralReason: '',
        fdgDose: '',
        bloodSugar: '',
        injectionTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        scanTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        uptakeTime: '',
        bodyRegion: '',
        suvMax: '',
        suvMean: '',
        lesionLocation: '',
        lesionSize: '',
        metastasisPresent: false,
        metastasisDetails: '',
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
    <div className="scan-page petct-page">
      <div className="scan-header">
        <div className="scan-header-icon petct-icon">
          <Activity size={28} />
        </div>
        <div>
          <h1>PET/CT Scan (Body)</h1>
          <p className="scan-subtitle">فحص PET/CT للجسم</p>
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
          <ScanFormExtras
            patientId={selectedPatient.id}
            scanType="petct"
            formData={formData}
            setFormData={setFormData}
            files={formData.files}
            onFileChange={handleFileChange}
          />
        <form className="clinic-form" onSubmit={handleSubmit}>
          <div className="form-section">
            <h3><Calendar size={18} />Scan Details</h3>

            <div className="form-group">
              <label>Referral Reason <span className="required-star">*</span></label>
              <input type="text" placeholder="e.g., Staging of lung cancer, follow-up..." value={formData.referralReason} onChange={(e) => handleChange('referralReason', e.target.value)} required />
            </div>

            <div className="form-section-inner">
              <h4>Radiopharmaceutical</h4>
              <div className="lab-grid">
                <div className="form-group">
                  <label>FDG Dose <span className="required-star">*</span> <span className="unit-label">(mCi)</span></label>
                  <input type="number" step="any" placeholder="e.g., 10" value={formData.fdgDose} onChange={(e) => handleChange('fdgDose', e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Blood Sugar <span className="unit-label">(mg/dL)</span></label>
                  <input type="number" step="any" placeholder="Pre-injection" value={formData.bloodSugar} onChange={(e) => handleChange('bloodSugar', e.target.value)} />
                </div>
              </div>
            </div>

            <div className="form-section-inner">
              <h4>Timing</h4>
              <div className="lab-grid">
                <div className="form-group">
                  <label>Injection Time</label>
                  <input type="datetime-local" value={formData.injectionTime} onChange={(e) => handleChange('injectionTime', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Scan Time</label>
                  <input type="datetime-local" value={formData.scanTime} onChange={(e) => handleChange('scanTime', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Uptake Time <span className="unit-label">(min)</span></label>
                  <input type="number" placeholder="e.g., 60" value={formData.uptakeTime} onChange={(e) => handleChange('uptakeTime', e.target.value)} />
                </div>
              </div>
            </div>

            <div className="form-section-inner">
              <h4>Findings</h4>
              <div className="form-row-two">
                <div className="form-group">
                  <label>Body Region</label>
                  <input type="text" placeholder="e.g., Whole body, chest, abdomen" value={formData.bodyRegion} onChange={(e) => handleChange('bodyRegion', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Lesion Location</label>
                  <input type="text" placeholder="e.g., Right lung upper lobe" value={formData.lesionLocation} onChange={(e) => handleChange('lesionLocation', e.target.value)} />
                </div>
              </div>
              <div className="lab-grid">
                <div className="form-group">
                  <label>SUV Max</label>
                  <input type="number" step="any" placeholder="e.g., 8.5" value={formData.suvMax} onChange={(e) => handleChange('suvMax', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>SUV Mean</label>
                  <input type="number" step="any" placeholder="e.g., 5.2" value={formData.suvMean} onChange={(e) => handleChange('suvMean', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Lesion Size</label>
                  <input type="text" placeholder="e.g., 3.2 x 2.1 cm" value={formData.lesionSize} onChange={(e) => handleChange('lesionSize', e.target.value)} />
                </div>
              </div>
            </div>

            <div className="form-section-inner">
              <h4>Metastasis</h4>
              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input type="checkbox" checked={formData.metastasisPresent} onChange={(e) => handleChange('metastasisPresent', e.target.checked)} />
                  <span>Metastasis Present</span>
                </label>
              </div>
              {formData.metastasisPresent && (
                <div className="form-group mt-16">
                  <label>Metastasis Details</label>
                  <textarea rows={3} placeholder="Describe metastasis locations and characteristics..." value={formData.metastasisDetails} onChange={(e) => handleChange('metastasisDetails', e.target.value)} />
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Impression / Conclusion</label>
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
                {submitting ? (<><Loader2 size={18} className="spin" />Saving...</>) : (<><FileText size={18} />Create PET/CT Record</>)}
              </button>
            </div>
          </div>
        </form>
        </>
      )}

      {selectedPatient && (
        <div className="history-section">
          <h3><FileText size={18} />Patient PET/CT History ({history.length})</h3>
          {historyLoading ? (<div className="loading-state"><Loader2 size={24} className="spin" />Loading...</div>) : history.length === 0 ? (<div className="empty-state">No previous PET/CT scans recorded.</div>) : (
            <div className="history-table-wrapper">
              <table className="history-table">
                <thead>
                  <tr><th>Date</th><th>Region</th><th>SUV Max</th><th>Metastasis</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {history.map((entry) => (
                    <React.Fragment key={entry.id}>
                      <tr className={expandedRow === entry.id ? 'expanded' : ''}>
                        <td>{entry.createdAt ? format(new Date(entry.createdAt), 'dd MMM yyyy HH:mm') : 'N/A'}</td>
                        <td>{entry.bodyRegion || '—'}</td>
                        <td><span className={`lab-value ${entry.suvMax > 2.5 ? 'high' : ''}`}>{entry.suvMax ?? '—'}</span></td>
                        <td>{entry.metastasisPresent ? (<span className="status-badge status-cancelled">Yes</span>) : (<span className="status-badge status-completed">No</span>)}</td>
                        <td className="actions-cell">
                          <button className="btn-icon" onClick={() => toggleExpand(entry.id)} title="View details">
                            {expandedRow === entry.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </td>
                      </tr>
                      {expandedRow === entry.id && (
                        <tr key={`${entry.id}-detail`} className="detail-row">
                          <td colSpan={5}>
                            <div className="detail-content">
                              <div className="detail-grid">
                                <div className="detail-item"><span className="detail-label">Referral:</span><span>{entry.referralReason || '—'}</span></div>
                                <div className="detail-item"><span className="detail-label">FDG Dose:</span><span>{entry.fdgDose != null ? `${entry.fdgDose} mCi` : '—'}</span></div>
                                <div className="detail-item"><span className="detail-label">Blood Sugar:</span><span>{entry.bloodSugar != null ? `${entry.bloodSugar} mg/dL` : '—'}</span></div>
                                <div className="detail-item"><span className="detail-label">Uptake Time:</span><span>{entry.uptakeTime != null ? `${entry.uptakeTime} min` : '—'}</span></div>
                                <div className="detail-item"><span className="detail-label">SUV Mean:</span><span>{entry.suvMean ?? '—'}</span></div>
                                <div className="detail-item"><span className="detail-label">Lesion Size:</span><span>{entry.lesionSize || '—'}</span></div>
                              </div>
                              {entry.lesionLocation && (<div className="detail-text"><strong>Lesion Location:</strong><p>{entry.lesionLocation}</p></div>)}
                              {entry.metastasisDetails && (<div className="detail-text"><strong>Metastasis Details:</strong><p>{entry.metastasisDetails}</p></div>)}
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

export default ScanPETCT;
