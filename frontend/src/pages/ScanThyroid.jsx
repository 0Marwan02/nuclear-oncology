import React, { useState, useEffect, useRef } from 'react';
import { Search, FileText, Syringe, Calendar, Loader2, CheckCircle, AlertCircle, ChevronDown, ChevronUp, Upload, X } from 'lucide-react';
import { format } from 'date-fns';
import { createScan, getScanHistory, apiFetch } from '../utils/api';
import ThyroidDiagram from '../components/ThyroidDiagram';
import ThyroidDiagramViewer from '../components/ThyroidDiagramViewer';
import ScanFormExtras from '../components/ScanFormExtras';
import { buildScanPayload } from '../utils/scanPayload';
import './ScanThyroid.css';

const ISOTOPE_OPTIONS = ['Tc-99m', 'I-123', 'I-131'];
const GLAND_POSITION_OPTIONS = ['Normal', 'High', 'Low', 'Ectopic'];

const ScanThyroid = () => {
  const [patients, setPatients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);

  const [formData, setFormData] = useState({
    isotopeType: '',
    isotopeDose: '',
    injectionTime: '',
    scanTime: '',
    tshLevel: '',
    thyroidWithdrawalDays: '',
    rightLobeUptake: '',
    leftLobeUptake: '',
    totalUptake: '',
    rightLobeSize: '',
    leftLobeSize: '',
    isthmusSize: '',
    glandPosition: '',
    hotNodules: '',
    coldNodules: '',
    diffuseUptake: false,
    heterogeneousUptake: false,
    impression: '',
    physicianNotes: '',
    files: [],
    diagramData: null,
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
      isotopeType: '',
      isotopeDose: '',
      injectionTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      scanTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      tshLevel: '',
      thyroidWithdrawalDays: '',
      rightLobeUptake: '',
      leftLobeUptake: '',
      totalUptake: '',
      rightLobeSize: '',
      leftLobeSize: '',
      isthmusSize: '',
      glandPosition: '',
      hotNodules: '',
      coldNodules: '',
      diffuseUptake: false,
      heterogeneousUptake: false,
      impression: '',
      physicianNotes: '',
      files: [],
      diagramData: null,
    });
  };

  const fetchHistory = async () => {
    if (!selectedPatient?.id) return;
    setHistoryLoading(true);
    try {
      const data = await getScanHistory('thyroid', selectedPatient.id);
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

  const handleDiagramChange = (field, value) => {
    setFormData((prev) => {
      const newData = { ...prev };
      if (field.startsWith('rightNodules') || field.startsWith('leftNodules')) {
        newData.diagramData = {
          ...(newData.diagramData || {}),
          [field]: value,
        };
      } else {
        newData.diagramData = {
          ...(newData.diagramData || {}),
          [field]: value,
        };
      }
      if (field === 'rightLobeUptake') newData.rightLobeUptake = value;
      if (field === 'leftLobeUptake') newData.leftLobeUptake = value;
      if (field === 'totalUptake') newData.totalUptake = value;
      if (field === 'rightLobeSize') newData.rightLobeSize = value;
      if (field === 'leftLobeSize') newData.leftLobeSize = value;
      if (field === 'isthmusSize') newData.isthmusSize = value;
      if (field === 'diffuseUptake') newData.diffuseUptake = value;
      if (field === 'heterogenousUptake') newData.heterogeneousUptake = value;
      return newData;
    });
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
    if (!formData.isotopeType) {
      setError('Isotope type is required');
      return;
    }
    if (!formData.isotopeDose) {
      setError('Isotope dose is required');
      return;
    }

    setSubmitting(true);
    try {
      const diagramDataObj = formData.diagramData ? {
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
      } : null;

      const payload = buildScanPayload('thyroid', formData, {
        patientId: selectedPatient.id,
        isotopeType: formData.isotopeType,
        isotopeDose: parseFloat(formData.isotopeDose) || null,
        tshLevel: formData.tshLevel ? parseFloat(formData.tshLevel) : null,
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
        heterogeneousUptake: formData.heterogeneousUptake,
        impression: formData.impression,
        physicianNotes: formData.physicianNotes,
        diagramData: diagramDataObj ? JSON.stringify(diagramDataObj) : null,
        workflowStatus: 'Assessed',
      });

      await createScan('thyroid', payload);
      setSuccess('Thyroid scan record created successfully');
      setFormData({
        isotopeType: '',
        isotopeDose: '',
        injectionTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        scanTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        tshLevel: '',
        thyroidWithdrawalDays: '',
        rightLobeUptake: '',
        leftLobeUptake: '',
        totalUptake: '',
        rightLobeSize: '',
        leftLobeSize: '',
        isthmusSize: '',
        glandPosition: '',
        hotNodules: '',
        coldNodules: '',
        diffuseUptake: false,
        heterogeneousUptake: false,
        impression: '',
        physicianNotes: '',
        files: [],
        diagramData: null,
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
    <div className="scan-page thyroid-page">
      <div className="scan-header">
        <div className="scan-header-icon thyroid-icon">
          <Syringe size={28} />
        </div>
        <div>
          <h1>Thyroid Scan (Gamma Camera)</h1>
          <p className="scan-subtitle">فحص الغدة الدرقية بكاميرا جاما</p>
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
            scanType="thyroid"
            formData={formData}
            setFormData={setFormData}
            files={formData.files}
            onFileChange={handleFileChange}
          />
        <form className="clinic-form" onSubmit={handleSubmit}>
          <div className="form-section">
            <h3><Calendar size={18} />Thyroid Scan Details</h3>

            <div className="form-section-inner">
              <h4>Isotope Information</h4>
              <div className="lab-grid">
                <div className="form-group">
                  <label>Isotope Type <span className="required-star">*</span></label>
                  <select value={formData.isotopeType} onChange={(e) => handleChange('isotopeType', e.target.value)} required>
                    <option value="">Select isotope...</option>
                    {ISOTOPE_OPTIONS.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Isotope Dose <span className="required-star">*</span> <span className="unit-label">(mCi)</span></label>
                  <input type="number" step="any" placeholder="e.g., 5" value={formData.isotopeDose} onChange={(e) => handleChange('isotopeDose', e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>TSH Level</label>
                  <input type="number" step="any" placeholder="mIU/L" value={formData.tshLevel} onChange={(e) => handleChange('tshLevel', e.target.value)} />
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
              <div className="form-group">
                <label>Thyroid Withdrawal Days <span className="unit-label">(if applicable)</span></label>
                <input type="number" placeholder="e.g., 14" value={formData.thyroidWithdrawalDays} onChange={(e) => handleChange('thyroidWithdrawalDays', e.target.value)} />
              </div>
            </div>

            <div className="form-section-inner">
              <h4>Uptake Measurements</h4>
              <div className="lab-grid">
                <div className="form-group">
                  <label>Right Lobe Uptake <span className="unit-label">(%)</span></label>
                  <input type="number" step="any" min="0" max="100" placeholder="%" value={formData.rightLobeUptake} onChange={(e) => handleChange('rightLobeUptake', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Left Lobe Uptake <span className="unit-label">(%)</span></label>
                  <input type="number" step="any" min="0" max="100" placeholder="%" value={formData.leftLobeUptake} onChange={(e) => handleChange('leftLobeUptake', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Total Uptake <span className="unit-label">(%)</span></label>
                  <input type="number" step="any" min="0" max="100" placeholder="%" value={formData.totalUptake} onChange={(e) => handleChange('totalUptake', e.target.value)} />
                </div>
              </div>
            </div>

            <div className="form-section-inner">
              <h4>Gland Measurements</h4>
              <div className="lab-grid">
                <div className="form-group">
                  <label>Right Lobe Size <span className="unit-label">(cm)</span></label>
                  <input type="text" placeholder="e.g., 4.5 x 2.0" value={formData.rightLobeSize} onChange={(e) => handleChange('rightLobeSize', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Left Lobe Size <span className="unit-label">(cm)</span></label>
                  <input type="text" placeholder="e.g., 4.2 x 1.8" value={formData.leftLobeSize} onChange={(e) => handleChange('leftLobeSize', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Isthmus Size <span className="unit-label">(cm)</span></label>
                  <input type="text" placeholder="e.g., 0.3" value={formData.isthmusSize} onChange={(e) => handleChange('isthmusSize', e.target.value)} />
                </div>
              </div>
              <div className="form-group mt-16">
                <label>Gland Position</label>
                <select value={formData.glandPosition} onChange={(e) => handleChange('glandPosition', e.target.value)}>
                  <option value="">Select position...</option>
                  {GLAND_POSITION_OPTIONS.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
                </select>
              </div>
            </div>

            <div className="form-section-inner">
              <h4>Nodules & Uptake Pattern</h4>
              <div className="form-row-two">
                <div className="form-group">
                  <label>Hot Nodules</label>
                  <textarea rows={2} placeholder="Describe hot nodules..." value={formData.hotNodules} onChange={(e) => handleChange('hotNodules', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Cold Nodules</label>
                  <textarea rows={2} placeholder="Describe cold nodules..." value={formData.coldNodules} onChange={(e) => handleChange('coldNodules', e.target.value)} />
                </div>
              </div>
              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input type="checkbox" checked={formData.diffuseUptake} onChange={(e) => handleChange('diffuseUptake', e.target.checked)} />
                  <span>Diffuse Uptake</span>
                </label>
                <label className="checkbox-label">
                  <input type="checkbox" checked={formData.heterogeneousUptake} onChange={(e) => handleChange('heterogeneousUptake', e.target.checked)} />
                  <span>Heterogeneous Uptake</span>
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

            {/* Thyroid Diagram Overlay */}
            <div className="diagram-section">
              <h4>Thyroid Diagram</h4>
              <ThyroidDiagram
                diagramData={formData.diagramData}
                onChange={handleDiagramChange}
                editable={true}
                width={400}
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary btn-lg" disabled={submitting}>
                {submitting ? (<><Loader2 size={18} className="spin" />Saving...</>) : (<><FileText size={18} />Create Thyroid Record</>)}
              </button>
            </div>
          </div>
        </form>
        </>
      )}

      {selectedPatient && (
        <div className="history-section">
          <h3><FileText size={18} />Patient Thyroid History ({history.length})</h3>
          {historyLoading ? (<div className="loading-state"><Loader2 size={24} className="spin" />Loading...</div>) : history.length === 0 ? (<div className="empty-state">No previous thyroid scans recorded.</div>) : (
            <div className="history-table-wrapper">
              <table className="history-table">
                <thead>
                  <tr><th>Date</th><th>Isotope</th><th>Total Uptake</th><th>Position</th><th>Pattern</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {history.map((entry) => (
                    <React.Fragment key={entry.id}>
                      <tr className={expandedRow === entry.id ? 'expanded' : ''}>
                        <td>{entry.createdAt ? format(new Date(entry.createdAt), 'dd MMM yyyy HH:mm') : 'N/A'}</td>
                        <td>{entry.isotopeType || '—'}</td>
                        <td>{entry.totalUptake != null ? `${entry.totalUptake}%` : '—'}</td>
                        <td>{entry.glandPosition || '—'}</td>
                        <td>
                          <div className="meta-tags">
                            {entry.diffuseUptake && <span className="tag tag-green">Diffuse</span>}
                            {entry.heterogeneousUptake && <span className="tag tag-orange">Heterogeneous</span>}
                            {!entry.diffuseUptake && !entry.heterogeneousUptake && <span>—</span>}
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
                                 <div className="detail-item"><span className="detail-label">Right Uptake:</span><span>{entry.rightLobeUptake != null ? `${entry.rightLobeUptake}%` : '—'}</span></div>
                                 <div className="detail-item"><span className="detail-label">Left Uptake:</span><span>{entry.leftLobeUptake != null ? `${entry.leftLobeUptake}%` : '—'}</span></div>
                                 <div className="detail-item"><span className="detail-label">Isotope Dose:</span><span>{entry.isotopeDose != null ? `${entry.isotopeDose} mCi` : '—'}</span></div>
                                 <div className="detail-item"><span className="detail-label">TSH:</span><span>{entry.tshLevel != null ? `${entry.tshLevel} mIU/L` : '—'}</span></div>
                                 <div className="detail-item"><span className="detail-label">Right Lobe:</span><span>{entry.rightLobeSize || '—'}</span></div>
                                 <div className="detail-item"><span className="detail-label">Left Lobe:</span><span>{entry.leftLobeSize || '—'}</span></div>
                               </div>
                               {entry.diagramData && (
                                 <div className="detail-diagram">
                                   <ThyroidDiagramViewer
                                     diagramData={typeof entry.diagramData === 'string' ? JSON.parse(entry.diagramData) : entry.diagramData}
                                     width={280}
                                   />
                                 </div>
                               )}
                               {entry.hotNodules && (<div className="detail-text"><strong>Hot Nodules:</strong><p>{entry.hotNodules}</p></div>)}
                               {entry.coldNodules && (<div className="detail-text"><strong>Cold Nodules:</strong><p>{entry.coldNodules}</p></div>)}
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

export default ScanThyroid;
