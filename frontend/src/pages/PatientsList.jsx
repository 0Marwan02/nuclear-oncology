import { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';
import { Search, UserPlus, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PatientCreate from '../components/PatientCreate';
import './PatientsList.css';

const PatientsList = () => {
  const [patients, setPatients] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPatients();
  }, [query]);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const data = await apiFetch(`/patients${query ? `?q=${encodeURIComponent(query)}` : ''}`);
      setPatients(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePatientCreated = (result) => {
    setShowCreateModal(false);
    fetchPatients();
    // Navigate to the new patient profile
    if (result?.patient?.id) {
      navigate(`/patients/${result.patient.id}`);
    }
  };

  return (
    <div className="patients-container">
      <div className="page-header">
        <h2>Patients Directory</h2>
        <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
          <UserPlus size={18} />
          New Patient
        </button>
      </div>

      <div className="search-bar">
        <Search className="search-icon" size={20} />
        <input 
          type="text" 
          placeholder="Search by name, National ID, or phone..." 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="loading-state">Loading patients...</div>
      ) : patients.length === 0 ? (
        <div className="empty-state">No patients found.</div>
      ) : (
        <div className="patients-grid">
          {patients.map(patient => (
            <div key={patient.id} className="patient-card" onClick={() => navigate(`/patients/${patient.id}`)}>
              <div className="card-header">
                <div className="patient-avatar">
                  {patient.name.charAt(0).toUpperCase()}
                </div>
                <div className="patient-info">
                  <h3>{patient.name}</h3>
                  <p>ID: {patient.nationalId}</p>
                </div>
              </div>
              <div className="card-body">
                <div className="detail-row">
                  <span className="label">Gender:</span>
                  <span className="value">{patient.gender}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Blood Type:</span>
                  <span className="value">{patient.bloodType}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Phone:</span>
                  <span className="value">{patient.phone}</span>
                </div>
              </div>
              <div className="card-footer">
                <FileText size={16} />
                <span>{patient.medicalCases.length} case(s)</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <PatientCreate
          onPatientCreated={handlePatientCreated}
          onCancel={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
};

export default PatientsList;
