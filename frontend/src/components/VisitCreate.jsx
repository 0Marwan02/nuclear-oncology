import { useState } from 'react';
import { apiFetch } from '../utils/api';
import './VisitCreate.css';

const VisitCreate = ({ patientId, medicalCases, onVisitCreated, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    caseId: medicalCases?.[0]?.id || '',
    weight: '',
    bloodPressure: '',
    temperature: '',
    generalCondition: '',
    nurseNotes: '',
    doctorNotes: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.caseId) {
      setError('Please select a medical case for this visit.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        patientId,
        caseId: formData.caseId,
        weight: formData.weight ? parseFloat(formData.weight) : undefined,
        temperature: formData.temperature ? parseFloat(formData.temperature) : undefined,
        bloodPressure: formData.bloodPressure || undefined,
        generalCondition: formData.generalCondition || undefined,
        nurseNotes: formData.nurseNotes || undefined,
        doctorNotes: formData.doctorNotes || undefined
      };

      const newVisit = await apiFetch('/visits', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      
      onVisitCreated(newVisit);
    } catch (err) {
      setError(err.message || 'Failed to create visit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="visit-create-modal-overlay">
      <div className="visit-create-card">
        <div className="modal-header">
          <h3>Record New Visit</h3>
          <button className="close-btn" onClick={onCancel}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="visit-form">
          <div className="form-group">
            <label>Medical Case</label>
            <select name="caseId" value={formData.caseId} onChange={handleChange} required>
              <option value="" disabled>Select case...</option>
              {medicalCases && medicalCases.map(c => (
                <option key={c.id} value={c.id}>
                  {c.diagnosis} ({c.cancerType})
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Weight (kg)</label>
              <input type="number" step="0.1" name="weight" value={formData.weight} onChange={handleChange} placeholder="e.g. 70.5" />
            </div>
            <div className="form-group">
              <label>Temp (°C)</label>
              <input type="number" step="0.1" name="temperature" value={formData.temperature} onChange={handleChange} placeholder="e.g. 37.2" />
            </div>
            <div className="form-group">
              <label>Blood Pressure</label>
              <input type="text" name="bloodPressure" value={formData.bloodPressure} onChange={handleChange} placeholder="120/80" />
            </div>
          </div>

          <div className="form-group">
            <label>General Condition</label>
            <input type="text" name="generalCondition" value={formData.generalCondition} onChange={handleChange} placeholder="e.g. Stable, complains of nausea" />
          </div>

          <div className="form-group">
            <label>Nurse Notes</label>
            <textarea name="nurseNotes" value={formData.nurseNotes} onChange={handleChange} rows="2" placeholder="Triage information and initial observations"></textarea>
          </div>

          <div className="form-group">
            <label>Doctor Notes / Plan</label>
            <textarea name="doctorNotes" value={formData.doctorNotes} onChange={handleChange} rows="3" placeholder="Diagnosis updates, treatment plan..."></textarea>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onCancel} disabled={loading}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Save Visit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VisitCreate;
