import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { apiFetch, getClinicHistory, getScanHistory } from '../utils/api';
import './PatientProfile.css';
import VisitsTimeline from '../components/VisitsTimeline';
import VisitCreate from '../components/VisitCreate';
import CaseCreate from '../components/CaseCreate';
import { History, Calendar, FileText, Scan } from 'lucide-react';

const PatientProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showVisitForm, setShowVisitForm] = useState(false);
  const [showCaseForm, setShowCaseForm] = useState(false);
  const [miniTimeline, setMiniTimeline] = useState([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  useEffect(() => {
    fetchPatient();
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchMiniTimeline();
    }
  }, [id]);

  const fetchMiniTimeline = async () => {
    try {
      setLoadingTimeline(true);
      const [clinicData, scanData] = await Promise.all([
        getClinicHistory('both', id),
        getScanHistory('all', id)
      ]);
      const allRecords = [...clinicData.map(r => ({ ...r, recordType: 'clinic' })), ...scanData.map(r => ({ ...r, recordType: 'scan' }))]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);
      setMiniTimeline(allRecords);
    } catch (err) {
      console.error('Failed to load mini timeline:', err);
    } finally {
      setLoadingTimeline(false);
    }
  };

  const fetchPatient = async () => {
    try {
      const data = await apiFetch(`/patients/${id}`);
      setPatient(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVisitCreated = (newVisit) => {
    setShowVisitForm(false);
    // Refresh to get updated timeline with full populated details (like lab results, if backend does that) or just append.
    // Easiest is to re-fetch the patient profile completely.
    fetchPatient();
  };

  const handleCaseCreated = (newCase) => {
    setShowCaseForm(false);
    fetchPatient();
  };

  if (loading) return <div className="profile-loading">Loading patient details...</div>;
  if (error) return <div className="profile-error">{error}</div>;
  if (!patient) return <div className="profile-not-found">Patient not found</div>;

  return (
    <div className="patient-profile">
      <div className="profile-banner">
        <div className="profile-avatar">
          {patient.name.charAt(0).toUpperCase()}
        </div>
        <div className="profile-header-info">
          <h2>{patient.name}</h2>
          <div className="tags">
            <span className="tag tag-blue">ID: {patient.nationalId}</span>
            <span className="tag tag-purple">Blood: {patient.bloodType}</span>
          </div>
        </div>
        <div className="profile-actions">
          <button className="btn-secondary" onClick={() => navigate('/patients')}>Back</button>
          <button className="btn-secondary" onClick={() => navigate(`/patients/${id}/history`)}>
            <History size={16} /> View Full History
          </button>
          <button className="btn-primary" onClick={() => setShowVisitForm(true)}>Add Visit</button>
        </div>
      </div>

      <div className="profile-content">
        <div className="content-left">
          <div className="info-card">
            <h3>Demographics</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="label">Gender</span>
                <span className="value">{patient.gender}</span>
              </div>
              <div className="info-item">
                <span className="label">Birth Date</span>
                <span className="value">{new Date(patient.birthDate).toLocaleDateString()}</span>
              </div>
              <div className="info-item">
                <span className="label">Phone</span>
                <span className="value">{patient.phone}</span>
              </div>
              <div className="info-item">
                <span className="label">Address</span>
                <span className="value">{patient.address}</span>
              </div>
            </div>
          </div>

          <div className="info-card mt-4">
            <div className="flex-between">
              <h3>Medical Cases ({patient.medicalCases?.length || 0})</h3>
              <button className="btn-secondary btn-sm" onClick={() => setShowCaseForm(true)}>+ New Case</button>
            </div>
            {patient.medicalCases?.length > 0 ? (
              <div className="cases-list">
                {patient.medicalCases.map(c => (
                  <div key={c.id} className="case-item">
                    <h4>{c.diagnosis}</h4>
                    <p>{c.cancerType} - {c.cancerStage}</p>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                      <span className={`status-badge ${c.status.toLowerCase()}`}>{c.status}</span>
                      {JSON.parse(localStorage.getItem('auth_user') || '{}').role === 'admin' && (
                        <button 
                          className="btn-secondary btn-sm" 
                          onClick={async () => {
                            const newStatus = prompt('Update case status (Active / Finished):', c.status);
                            if (newStatus && newStatus !== c.status) {
                               try {
                                 await apiFetch(`/cases/${c.id}`, { method: 'PUT', body: JSON.stringify({ status: newStatus }) });
                                 fetchPatient();
                               } catch(e) { alert(e.message); }
                            }
                          }}
                        >
                          Edit Status
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted">No cases registered.</p>
            )}
          </div>
        </div>

        <div className="content-right">
          <div className="info-card">
            <h3>Visits Timeline</h3>
            <VisitsTimeline visits={patient.visits} onVisitUpdated={fetchPatient} />
          </div>
          <div className="info-card mt-4">
            <div className="flex-between">
              <h3>Recent Activity (آخر النشاط)</h3>
              <button className="btn-secondary btn-sm" onClick={() => navigate(`/patients/${id}/history`)}>
                View All
              </button>
            </div>
            {loadingTimeline ? (
              <div className="loading-spinner">Loading...</div>
            ) : miniTimeline.length > 0 ? (
              <div className="mini-timeline">
                {miniTimeline.map((record, index) => (
                  <div key={record.id || index} className="mini-timeline-item">
                    <div className="mini-timeline-date">
                      <Calendar size={14} />
                      <span>{format(new Date(record.date), 'MMM dd, yyyy')}</span>
                    </div>
                    <div className="mini-timeline-badge">
                      {record.recordType === 'clinic' ? (
                        <span className={`badge ${record.type === 'green' ? 'badge-green' : 'badge-red'}`}>
                          <FileText size={12} /> {record.type === 'green' ? 'Green File' : 'Red File'}
                        </span>
                      ) : (
                        <span className="badge badge-purple">
                          <Scan size={12} /> {record.type?.toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted">No recent activity</p>
            )}
          </div>
        </div>
      </div>

      {showVisitForm && (
        <VisitCreate 
          patientId={patient.id} 
          medicalCases={patient.medicalCases} 
          onVisitCreated={handleVisitCreated}
          onCancel={() => setShowVisitForm(false)} 
        />
      )}
      
      {showCaseForm && (
        <CaseCreate 
          patientId={patient.id}
          onCaseCreated={handleCaseCreated}
          onCancel={() => setShowCaseForm(false)}
        />
      )}
    </div>
  );
};

export default PatientProfile;
