import { useState } from 'react';
import { apiFetch } from '../utils/api';
import './CaseCreate.css';

const CaseCreate = ({ patientId, onCaseCreated, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    diagnosis: '',
    cancerType: '',
    cancerStage: '',
    protocolType: '',
    startDate: new Date().toISOString().split('T')[0],
    status: 'Active'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const newCase = await apiFetch('/cases', {
        method: 'POST',
        body: JSON.stringify({ patientId, ...formData })
      });
      onCaseCreated(newCase);
    } catch (err) {
      setError(err.message || 'Failed to create case');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <h3>Register Medical Case</h3>
          <button className="close-btn" onClick={onCancel}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Diagnosis</label>
            <input type="text" name="diagnosis" value={formData.diagnosis} onChange={handleChange} required placeholder="e.g. Papillary Thyroid Carcinoma" />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Cancer Type</label>
              <input type="text" name="cancerType" value={formData.cancerType} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Stage</label>
              <input type="text" name="cancerStage" value={formData.cancerStage} onChange={handleChange} required placeholder="e.g. Stage II" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Protocol</label>
              <input type="text" name="protocolType" value={formData.protocolType} onChange={handleChange} required placeholder="e.g. I-131 Ablation" />
            </div>
            <div className="form-group">
              <label>Start Date</label>
              <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} required />
            </div>
          </div>

          <div className="form-group">
            <label>Status</label>
            <select name="status" value={formData.status} onChange={handleChange}>
              <option value="Active">Active Treatment</option>
              <option value="Follow-up">Follow-up</option>
              <option value="Finished">Finished</option>
            </select>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onCancel} disabled={loading}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Create Case'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CaseCreate;
