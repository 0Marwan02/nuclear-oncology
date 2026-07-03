import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { apiFetch, getDailyStats } from '../utils/api';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, Activity, CheckCircle, Clock, BarChart3 } from 'lucide-react';
import { useTranslation } from '../i18n/index';
import './Dashboard.css';

const ROLE_REDIRECTS = {
  doctor: '/physician',
  nurse: '/nurse',
  technician: '/technician',
};

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

// Map display name back to raw DB key for URL param
const toRawCategory = (displayName) => displayName.replace(/ /g, '_');

const Dashboard = () => {
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [dailyStats, setDailyStats] = useState({ myCasesToday: 0, hospitalCasesToday: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const userStr = localStorage.getItem('auth_user');
  const user = userStr ? JSON.parse(userStr) : null;

  // We defer the redirect decision to the API response. 
  // If the user lacks admin:dashboard permission, the API returns 403.
  useEffect(() => {
    Promise.all([
      apiFetch('/dashboard/stats'),
      getDailyStats().catch(() => ({ myCasesToday: 0, hospitalCasesToday: 0 }))
    ])
      .then(([data, daily]) => {
        setStats(data);
        setDailyStats(daily);
      })
      .catch(err => {
        if (err.status === 403 && user && ROLE_REDIRECTS[user.role]) {
          navigate(ROLE_REDIRECTS[user.role], { replace: true });
          return;
        }
        setError(err.message || 'Failed to load dashboard data');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="dashboard-loading">Loading Clinic Metrics...</div>;
  if (error) return <div className="dashboard-error">{error}</div>;
  if (!stats) return null;

  const activeCases = (stats.totalVisits ?? 0) - (stats.completedVisits ?? 0);
  const cancerDistribution = stats.categoriesCount
    ? Object.entries(stats.categoriesCount).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value, rawKey: name }))
    : [];
  const scanDistribution = stats.scanTypeDistribution || [];
  const totalScans = stats.scanStats?.total ?? 0;

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h2>Clinic Overview</h2>
        <p className="text-muted">Real-time statistics for Nuclear Oncology Department</p>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card kpi-card--clickable" onClick={() => navigate('/patients')} title="View all patients">
          <div className="kpi-icon blue"><Users size={24} /></div>
          <div className="kpi-details">
            <span className="kpi-label">Total Patients</span>
            <span className="kpi-value">{stats.totalPatients ?? 0}</span>
          </div>
        </div>
        <div className="kpi-card kpi-card--clickable" onClick={() => navigate('/scans')} title="View all scans">
          <div className="kpi-icon purple"><BarChart3 size={24} /></div>
          <div className="kpi-details">
            <span className="kpi-label">Total Scans</span>
            <span className="kpi-value">{totalScans}</span>
          </div>
        </div>
        <div className="kpi-card kpi-card--clickable" onClick={() => navigate('/patients?status=active')} title="View active cases">
          <div className="kpi-icon purple"><Activity size={24} /></div>
          <div className="kpi-details">
            <span className="kpi-label">Active Cases</span>
            <span className="kpi-value">{activeCases}</span>
          </div>
        </div>
        <div className="kpi-card kpi-card--clickable" onClick={() => navigate('/patients?status=completed')} title="View finished cases">
          <div className="kpi-icon green"><CheckCircle size={24} /></div>
          <div className="kpi-details">
            <span className="kpi-label">Finished Cases</span>
            <span className="kpi-value">{stats.completedVisits ?? 0}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ flex: 1, backgroundColor: '#fff', padding: '1rem 1.5rem', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderLeft: '4px solid #7c3aed' }}>
          <h4 style={{ margin: '0 0 0.5rem 0', color: '#6b7280', fontSize: '0.9rem' }}>{t('dashboard.my_cases_today')}</h4>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#111827' }}>{dailyStats.myCasesToday}</div>
        </div>
        <div style={{ flex: 1, backgroundColor: '#fff', padding: '1rem 1.5rem', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderLeft: '4px solid #10b981' }}>
          <h4 style={{ margin: '0 0 0.5rem 0', color: '#6b7280', fontSize: '0.9rem' }}>{t('dashboard.hospital_cases_today')}</h4>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#111827' }}>{dailyStats.hospitalCasesToday}</div>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="dashboard-charts">
        <div className="chart-card">
          <h3>Scans by Modality <span className="chart-hint">click a slice to open</span></h3>
          {scanDistribution.length > 0 ? (
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={scanDistribution}
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    cursor="pointer"
                    onClick={(entry) => navigate(entry.route || '/scans')}
                  >
                    {scanDistribution.map((entry, index) => (
                      <Cell key={'scan-' + index} fill={entry.color || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [value, name]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="chart-legend">
                {scanDistribution.map((entry, index) => (
                  <div
                    key={entry.key}
                    className="legend-item legend-item--clickable"
                    onClick={() => navigate(entry.route || '/scans')}
                  >
                    <span className="color-dot" style={{ background: entry.color || COLORS[index % COLORS.length] }} />
                    {entry.label} ({entry.value})
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="empty-chart">No scan records yet</div>
          )}
        </div>

        <div className="chart-card">
          <h3>Visit Category Distribution <span className="chart-hint">click a slice to filter</span></h3>
          {cancerDistribution.length > 0 ? (
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={cancerDistribution}
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    cursor="pointer"
                    onClick={(entry) => navigate(`/patients?category=${entry.rawKey}`)}
                  >
                    {cancerDistribution.map((entry, index) => (
                      <Cell key={'cell-' + index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [value, name]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="chart-legend">
                {cancerDistribution.map((entry, index) => (
                  <div
                    key={entry.name}
                    className="legend-item legend-item--clickable"
                    onClick={() => navigate(`/patients?category=${entry.rawKey}`)}
                  >
                    <span className="color-dot" style={{ background: COLORS[index % COLORS.length] }} />
                    {entry.name} ({entry.value})
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="empty-chart">No scan distribution data yet</div>
          )}
        </div>
        </div>

        <div className="side-card">
          <h3>Recently Registered Patients</h3>
          <div className="recent-patients-list">
            {stats.recentPatients && stats.recentPatients.length > 0 ? (
              stats.recentPatients.map(patient => (
                <div key={patient.id} className="recent-patient-item" onClick={() => navigate('/patients/' + patient.id)}>
                  <div className="avatar-sm">{(patient.name || '?').charAt(0)}</div>
                  <div className="patient-snippet">
                    <h4>{patient.name}</h4>
                    <span>ID: {patient.nationalId}</span>
                  </div>
                  <Clock size={14} className="time-icon" />
                </div>
              ))
            ) : (
              <p className="text-muted">No recent patients</p>
            )}
          </div>
          <button className="btn-primary-outline w-100" onClick={() => navigate('/patients')}>
            View All Patients
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
