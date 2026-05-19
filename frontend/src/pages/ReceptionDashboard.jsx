import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../utils/api';
import { Search, UserPlus, Users, Calendar, Clock, FilePlus } from 'lucide-react';
import { format } from 'date-fns';
import PatientCreate from '../components/PatientCreate';
import ReceptionEncounterWizard from '../components/ReceptionEncounterWizard';
import './ReceptionDashboard.css';

const ReceptionDashboard = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [stats, setStats] = useState(null);
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searching, setSearching] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [encounterPatient, setEncounterPatient] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, appointmentsData] = await Promise.all([
          apiFetch('/dashboard/stats').catch(() => null),
          apiFetch('/appointments?date=' + format(new Date(), 'yyyy-MM-dd')).catch(() => []),
        ]);
        setStats(statsData);
        setTodayAppointments(appointmentsData);
      } catch (err) {
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const data = await apiFetch(`/patients?q=${encodeURIComponent(searchQuery)}`);
      setSearchResults(data);
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const handlePatientCreated = (result) => {
    setShowCreateModal(false);
    if (result?.patient?.id) {
      navigate(`/patients/${result.patient.id}`);
    }
  };

  if (loading) return <div className="dashboard-loading">Loading Reception Dashboard...</div>;
  if (error) return <div className="dashboard-error">{error}</div>;

  return (
    <div className="reception-dashboard fade-in">
      <div className="page-header">
        <div>
          <h2>مكتب الاستقبال</h2>
          <p className="text-muted">تسجيل المرضى وفتح ملفات الفحص والعيادات</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
          <UserPlus size={18} />
          تسجيل مريض جديد
        </button>
      </div>

      <div className="quick-stats">
        <div className="stat-card">
          <div className="stat-icon blue"><Users size={24} /></div>
          <div className="stat-details">
            <span className="stat-label">Total Patients</span>
            <span className="stat-value">{stats?.metrics?.totalPatients ?? '—'}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><Calendar size={24} /></div>
          <div className="stat-details">
            <span className="stat-label">Today's Registrations</span>
            <span className="stat-value">{stats?.metrics?.todayRegistrations ?? '—'}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple"><Clock size={24} /></div>
          <div className="stat-details">
            <span className="stat-label">Today's Appointments</span>
            <span className="stat-value">{todayAppointments.length}</span>
          </div>
        </div>
      </div>

      <div className="search-section">
        <h3>Quick Patient Search</h3>
        <form onSubmit={handleSearch} className="search-form">
          <div className="search-input-wrapper">
            <Search className="search-icon" size={20} />
            <input
              type="text"
              placeholder="Search by national ID or patient name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-primary" disabled={searching}>
            {searching ? 'Searching...' : 'Search'}
          </button>
        </form>

        {searchResults.length > 0 && (
          <div className="search-results">
            {searchResults.map((patient) => (
              <div
                key={patient.id}
                className="search-result-item"
                onClick={() => navigate(`/patients/${patient.id}`)}
              >
                <div className="result-avatar">{patient.name.charAt(0).toUpperCase()}</div>
                <div className="result-info">
                  <h4>{patient.name}</h4>
                  <span>National ID: {patient.nationalId}</span>
                </div>
                <div className="result-meta">
                  <span className="badge">{patient.gender}</span>
                  <button
                    type="button"
                    className="btn-secondary small"
                    onClick={(e) => { e.stopPropagation(); setEncounterPatient(patient); }}
                  >
                    <FilePlus size={14} /> فتح فحص
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="appointments-section">
        <h3>Today's Appointments</h3>
        {todayAppointments.length === 0 ? (
          <div className="empty-state">No appointments scheduled for today.</div>
        ) : (
          <div className="appointments-list">
            {todayAppointments.map((apt) => (
              <div
                key={apt.id}
                className="appointment-item"
                onClick={() => navigate(`/patients/${apt.patientId || apt.patient?.id}`)}
              >
                <div className="appointment-time">
                  <Clock size={16} />
                  <span>{format(new Date(apt.appointmentDate), 'HH:mm')}</span>
                </div>
                <div className="appointment-patient">
                  <h4>{apt.patientName || apt.patient?.name}</h4>
                  <span className="text-muted">{apt.appointmentType}</span>
                </div>
                <span className={`status-badge ${apt.status || 'pending'}`}>
                  {apt.status || 'Pending'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreateModal && (
        <PatientCreate
          onPatientCreated={handlePatientCreated}
          onCancel={() => setShowCreateModal(false)}
        />
      )}

      {encounterPatient && (
        <ReceptionEncounterWizard
          patient={encounterPatient}
          onClose={() => setEncounterPatient(null)}
          onDone={() => {
            const id = encounterPatient.id;
            setEncounterPatient(null);
            navigate(`/patients/${id}`);
          }}
        />
      )}
    </div>
  );
};

export default ReceptionDashboard;
