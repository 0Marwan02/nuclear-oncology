import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { apiFetch, getScanHistory } from '../utils/api';
import { useTranslation } from '../i18n/index';
import './PatientProfile.css';
import VisitsTimeline from '../components/VisitsTimeline';
import VisitCreate from '../components/VisitCreate';
import { History, Scan, Clock } from 'lucide-react';

const PatientProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showVisitForm, setShowVisitForm] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [scanHistory, setScanHistory] = useState([]);
  const [scanHistoryLoading, setScanHistoryLoading] = useState(false);

  useEffect(() => { fetchPatient(); }, [id]);

  useEffect(() => {
    if (activeTab === 'scan_history' && id) fetchScanHistory();
  }, [activeTab, id]);

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

  const fetchScanHistory = async () => {
    setScanHistoryLoading(true);
    try {
      const data = await getScanHistory('all', id);
      setScanHistory(Array.isArray(data) ? data : data.records || []);
    } catch (err) {
      console.error(err);
      setScanHistory([]);
    } finally {
      setScanHistoryLoading(false);
    }
  };

  if (loading) return <div className="profile-loading"><div className="spinner" /> {t('common.loading')}</div>;
  if (error) return <div className="profile-error">{error}</div>;
  if (!patient) return <div className="profile-not-found">{t('patient.not_found')}</div>;

  const TABS = [
    { key: 'overview', label: t('patient.tabs.overview') },
    { key: 'scan_history', label: t('patient.tabs.scan_history') },
  ];

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
            <span className="tag tag-purple">{t('patient.blood_type')}: {patient.bloodType}</span>
            {patient.patientType && (
              <span className={`tag ${patient.patientType === 'tumor' ? 'tag-red' : 'tag-green'}`}>
                {patient.patientType === 'tumor' ? 'Tumor' : 'Disease'}
              </span>
            )}
            {patient.phone && <span className="tag tag-gray"><span role="img" aria-label="phone">📞</span> {patient.phone}</span>}
            {patient.phone2 && <span className="tag tag-gray"><span role="img" aria-label="phone">📞</span> {patient.phone2} (قريب)</span>}
          </div>
          {(() => {
            const lastVisit = patient.visits?.slice().sort((a, b) => new Date(b.visitDate || b.createdAt) - new Date(a.visitDate || a.createdAt))[0];
            if (!lastVisit) return null;
            return (
              <div className="last-visit-summary">
                <Clock size={14} />
                <span className="last-visit-label">آخر زيارة:</span>
                <span className="last-visit-date">{format(new Date(lastVisit.visitDate || lastVisit.createdAt), 'dd MMM yyyy')}</span>
                {lastVisit.workflowStatus && <span className={`status-badge ${lastVisit.workflowStatus.toLowerCase()} last-visit-status`}>{lastVisit.workflowStatus}</span>}
                {lastVisit.doctorNotes && <span className="last-visit-note">{lastVisit.doctorNotes}</span>}
              </div>
            );
          })()}
        </div>
        <div className="profile-actions">
          <button className="btn-secondary" onClick={() => navigate('/patients')}>{t('common.back')}</button>
          <button className="btn-secondary" onClick={() => navigate(`/patients/${id}/history`)}>
            <History size={16} /> {t('patient.view_history')}
          </button>
          <button className="btn-primary" onClick={() => setShowVisitForm(true)}>{t('patient.add_visit')}</button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="profile-tabs">
        {TABS.map(tab => (
          <button
            key={tab.key}
            className={`profile-tab-btn ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="profile-tab-content">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="profile-content">
            <div className="content-left">
              <div className="info-card">
                <h3>{t('patient.demographics')}</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="label">{t('patient.gender')}</span>
                    <span className="value">{patient.gender}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">{t('patient.birth_date')}</span>
                    <span className="value">{new Date(patient.birthDate).toLocaleDateString()}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">{t('patient.phone')}</span>
                    <span className="value">{patient.phone}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">{t('patient.address')}</span>
                    <span className="value">{patient.address}</span>
                  </div>
                </div>
              </div>

            </div>

            <div className="content-right">
              <div className="info-card">
                <h3>{t('patient.visits_timeline')}</h3>
                <VisitsTimeline visits={patient.visits} onVisitUpdated={fetchPatient} />
              </div>
            </div>
          </div>
        )}

        {/* SCAN HISTORY TAB */}
        {activeTab === 'scan_history' && (
          <div className="scan-history-tab">
            {scanHistoryLoading ? (
              <div className="dashboard-loading"><div className="spinner" /> {t('common.loading')}</div>
            ) : scanHistory.length === 0 ? (
              <div className="empty-state"><Scan size={48} /><p>{t('patient.no_scan_history')}</p></div>
            ) : (
              <div className="scan-history-list">
                {scanHistory.map((scan, i) => (
                  <div key={scan.id || i} className="record-card">
                    <div className="record-header">
                      <div className="patient-info">
                        <h3 className="type-tag">{scan.scanType?.toUpperCase() || scan.type?.toUpperCase()}</h3>
                        <span className="text-muted">{scan.date ? format(new Date(scan.date), 'dd MMM yyyy') : '—'}</span>
                      </div>
                      <div className="record-meta">
                        <span className={`status-badge ${(scan.workflowStatus || 'completed').toLowerCase()}`}>
                          {scan.workflowStatus || 'Completed'}
                        </span>
                      </div>
                    </div>
                    {scan.impression && (
                      <div className="scan-summary">
                        <span><strong>{t('physician.impression')}:</strong> {scan.impression}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showVisitForm && (
        <VisitCreate
          patientId={patient.id}
          onCancel={() => setShowVisitForm(false)}
        />
      )}

    </div>
  );
};

export default PatientProfile;
