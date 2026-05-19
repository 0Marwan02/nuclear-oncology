import { useState } from 'react';
import './CaseCreate.css'; // Reusing modal CSS
import { apiFetch } from '../utils/api';

const fetchWithFile = async (endpoint, formData) => {
  const token = localStorage.getItem('auth_token');
  const response = await fetch(`http://localhost:5000/api${endpoint}`, {
    method: 'POST',
    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    body: formData
  });
  
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'File upload failed');
  return data;
};

export const LabUploadModal = ({ visitId, onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData(e.target);
      fd.append('visitId', visitId);
      const data = await fetchWithFile('/labs', fd);
      onSuccess(data);
    } catch (err) {
      alert(err.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <h3>Upload Lab Result</h3>
          <button className="close-btn" onClick={onCancel}>&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Test Name</label>
            <input type="text" name="testName" required placeholder="e.g. TSH Level" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Result Value</label>
              <input type="text" name="resultValue" required />
            </div>
            <div className="form-group">
              <label>Unit (optional)</label>
              <input type="text" name="unit" />
            </div>
          </div>
          <div className="form-group">
            <label>Reference Range</label>
            <input type="text" name="referenceRange" />
          </div>
          <div className="form-group">
            <label>Attachement (PDF/Image)</label>
            <input type="file" name="labResult" accept=".pdf,image/*" />
          </div>
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>Upload</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const ImagingUploadModal = ({ visitId, onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData(e.target);
      fd.append('visitId', visitId);
      const data = await fetchWithFile('/imaging', fd);
      onSuccess(data);
    } catch (err) {
      alert(err.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <h3>Upload Imaging Scan</h3>
          <button className="close-btn" onClick={onCancel}>&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-row">
            <div className="form-group">
              <label>Imaging Type</label>
              <input type="text" name="imagingType" required placeholder="e.g. Whole Body Scan" />
            </div>
            <div className="form-group">
              <label>Body Region</label>
              <input type="text" name="bodyRegion" required placeholder="e.g. Neck" />
            </div>
          </div>
          <div className="form-group">
            <label>Findings</label>
            <textarea name="findings" rows="3" placeholder="Radiology report..."></textarea>
          </div>
          <div className="form-group">
            <label>Scan Image</label>
            <input type="file" name="imagingResult" accept="image/*,.dicom" />
          </div>
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>Upload</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const DoseModal = ({ visitId, caseId, onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData(e.target);
      const payload = {
        visitId,
        caseId,
        isotopeType: fd.get('isotopeType'),
        doseMCi: fd.get('doseMCi'),
        cumulativeDose: fd.get('cumulativeDose')
      };
      
      const data = await apiFetch('/radiation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      onSuccess(data);
    } catch (err) {
      alert(err.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <h3>Log Radiation Dose</h3>
          <button className="close-btn" onClick={onCancel}>&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Isotope Type</label>
            <input type="text" name="isotopeType" required defaultValue="I-131" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Dose (mCi)</label>
              <input type="number" step="0.1" name="doseMCi" required />
            </div>
            <div className="form-group">
              <label>Cumulative Dose (mCi)</label>
              <input type="number" step="0.1" name="cumulativeDose" required />
            </div>
          </div>
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>Log Dose</button>
          </div>
        </form>
      </div>
    </div>
  );
};
