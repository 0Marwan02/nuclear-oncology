import React, { useState, useEffect, useRef } from 'react';
import { Search, FileText, Pill, Calendar, Loader2, CheckCircle, AlertCircle, ChevronDown, ChevronUp, Upload, X } from 'lucide-react';
import { format } from 'date-fns';
import { createScan, getScanHistory, apiFetch } from '../utils/api';
import ScanFormExtras from '../components/ScanFormExtras';
import { buildScanPayload } from '../utils/scanPayload';
import './ScanPSMA.css';

const PSMA_EXPRESSION_OPTIONS = ['Focal', 'Diffuse', 'Heterogeneous', 'None'];

const ScanPSMA = () => {
  const [patients, setPatients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);

  const [formData, setFormData] = useState({
    psaLevel: '',
    gleasonScore: '',
    ga68Dose: '',
    injectionTime: '',
    scanTime: '',
    uptakeTime: '',
    prostateBedRecurrence: false,
    lymphNodeInvolvement: false,
    boneMetastasis: false,
    visceralMetastasis: false,
    lesionLocations: '',
    psmaExpression: '',
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
      psaLevel: '',
      gleasonScore: '',
      ga68Dose: '',
      injectionTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      scanTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      uptakeTime: '',
      prostateBedRecurrence: false,
      lymphNodeInvolvement: false,
      boneMetastasis: false,
      visceralMetastasis: false,
      lesionLocations: '',
      psmaExpression: '',
      impression: '',
      physicianNotes: '',
      files: [],
    });
  };

  const fetchHistory = async () => {
    if (!selectedPatient?.id) return;
    setHistoryLoading(true);
    try {
      const data = await getScanHistory('psma', selectedPatient.id);
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
    if (!formData.ga68Dose) {
      setError('Ga-68 Dose is required');
      return;
    }

    setSubmitting(true);
    try {
      const payload = buildScanPayload('psma', { ...formData, ga68Dose: formData.ga68Dose }, {
        patientId: selectedPatient.id,
        psaLevel: formData.psaLevel ? parseFloat(formData.psaLevel) : null,
        gleasonScore: formData.gleasonScore,
        uptakeTime: formData.uptakeTime ? parseInt(formData.uptakeTime) : null,
        prostateBedRecurrence: formData.prostateBedRecurrence,
        lymphNodeInvolvement: formData.lymphNodeInvolvement,
        boneMetastasis: formData.boneMetastasis,
        visceralMetastasis: formData.visceralMetastasis,
        lesionLocations: formData.lesionLocations,
        psmaExpression: formData.psmaExpression,
        impression: formData.impression,
        physicianNotes: formData.physicianNotes,
        workflowStatus: 'Assessed',
      });

      await createScan('psma', payload);
      setSuccess('PSMA PET/CT scan record created successfully');
      setFormData({
        psaLevel: '',
        gleasonScore: '',
        ga68Dose: '',
        injectionTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        scanTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        uptakeTime: '',
        prostateBedRecurrence: false,
        lymphNodeInvolvement: false,
        boneMetastasis: false,
        visceralMetastasis: false,
        lesionLocations: '',
        psmaExpression: '',
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

  const getMetastasisTags = (entry) => {
    const tags = [];
    if (entry.prostateBedRecurrence) tags.push({ label: 'Prostate Bed', class: 'tag-orange' });
    if (entry.lymphNodeInvolvement) tags.push({ label: 'Lymph Nodes', class: 'tag-blue' });
    if (entry.boneMetastasis) tags.push({ label: 'Bone', class: 'tag-red' });
    if (entry.visceralMetastasis) tags.push({ label: 'Visceral', class: 'tag-purple' });
    return tags;
  };

  return (
    <div className="scan-page psma-page">
      <div className="scan-header">
        <div className="scan-header-icon psma-icon">
          <Pill size={28} />
        </div>
        <div>
          <h1>PSMA PET/CT (Prostate)</h1>
          <p className="scan-subtitle">فحص PSMA للبروستاتا</p>
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
            scanType="psma"
            formData={formData}
            setFormData={setFormData}
            files={formData.files}
            onFileChange={handleFileChange}
          />
        <form className="clinic-form" onSubmit={handleSubmit}>
          <div className="form-section">
            <h3><Calendar size={18} />PSMA Scan Details</h3>

            <div className="form-section-inner">
              <h4>Clinical Data</h4>
              <div className="lab-grid">
                <div className="form-group">
                  <label>PSA Level <span className="unit-label">(ng/mL)</span></label>
                  <input type="number" step="any" placeholder="e.g., 4.5" value={formData.psaLevel} onChange={(e) => handleChange('psaLevel', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Gleason Score</label>
                  <input type="text" placeholder="e.g., 4+3=7" value={formData.gleasonScore} onChange={(e) => handleChange('gleasonScore', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Ga-68 Dose <span className="required-star">*</span> <span className="unit-label">(mCi)</span></label>
                  <input type="number" step="any" placeholder="e.g., 4" value={formData.ga68Dose} onChange={(e) => handleChange('ga68Dose', e.target.value)} required />
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
              <h4>Metastasis Assessment</h4>
              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input type="checkbox" checked={formData.prostateBedRecurrence} onChange={(e) => handleChange('prostateBedRecurrence', e.target.checked)} />
                  <span>Prostate Bed Recurrence</span>
                </label>
                <label className="checkbox-label">
                  <input type="checkbox" checked={formData.lymphNodeInvolvement} onChange={(e) => handleChange('lymphNodeInvolvement', e.target.checked)} />
                  <span>Lymph Node Involvement</span>
                </label>
                <label className="checkbox-label">
                  <input type="checkbox" checked={formData.boneMetastasis} onChange={(e) => handleChange('boneMetastasis', e.target.checked)} />
                  <span>Bone Metastasis</span>
                </label>
                <label className="checkbox-label">
                  <input type="checkbox" checked={formData.visceralMetastasis} onChange={(e) => handleChange('visceralMetastasis', e.target.checked)} />
                  <span>Visceral Metastasis</span>
                </label>
              </div>
            </div>

            <div className="form-row-two">
              <div className="form-group">
                <label>Lesion Locations</label>
                <textarea rows={3} placeholder="Describe all lesion locations..." value={formData.lesionLocations} onChange={(e) => handleChange('lesionLocations', e.target.value)} />
              </div>
              <div className="form-group">
                <label>PSMA Expression Pattern</label>
                <select value={formData.psmaExpression} onChange={(e) => handleChange('psmaExpression', e.target.value)}>
                  <option value="">Select pattern...</option>
                  {PSMA_EXPRESSION_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
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
                {submitting ? (<><Loader2 size={18} className="spin" />Saving...</>) : (<><FileText size={18} />Create PSMA Record</>)}
              </button>
            </div>
          </div>
        </form>
        </>
      )}

      {selectedPatient && (
        <div className="history-section">
          <h3><FileText size={18} />Patient PSMA History ({history.length})</h3>
          {historyLoading ? (<div className="loading-state"><Loader2 size={24} className="spin" />Loading...</div>) : history.length === 0 ? (<div className="empty-state">No previous PSMA scans recorded.</div>) : (
            <div className="history-table-wrapper">
              <table className="history-table">
                <thead>
                  <tr><th>Date</th><th>PSA</th><th>Gleason</th><th>PSMA Pattern</th><th>Metastasis</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {history.map((entry) => (
                    <React.Fragment key={entry.id}>
                      <tr className={expandedRow === entry.id ? 'expanded' : ''}>
                        <td>{entry.createdAt ? format(new Date(entry.createdAt), 'dd MMM yyyy HH:mm') : 'N/A'}</td>
                        <td>{entry.psaLevel != null ? `${entry.psaLevel} ng/mL` : '—'}</td>
                        <td>{entry.gleasonScore || '—'}</td>
                        <td>{entry.psmaExpression || '—'}</td>
                        <td>
                          <div className="meta-tags">
                            {getMetastasisTags(entry).map((t, i) => (
                              <span key={i} className={`tag ${t.class}`}>{t.label}</span>
                            ))}
                            {getMetastasisTags(entry).length === 0 && <span>—</span>}
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
                          <td colSpan={6}>
                            <div className="detail-content">
                              <div className="detail-grid">
                                <div className="detail-item"><span className="detail-label">Ga-68 Dose:</span><span>{entry.ga68Dose != null ? `${entry.ga68Dose} mCi` : '—'}</span></div>
                                <div className="detail-item"><span className="detail-label">Uptake Time:</span><span>{entry.uptakeTime != null ? `${entry.uptakeTime} min` : '—'}</span></div>
                              </div>
                              {entry.lesionLocations && (<div className="detail-text"><strong>Lesion Locations:</strong><p>{entry.lesionLocations}</p></div>)}
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

export default ScanPSMA;
