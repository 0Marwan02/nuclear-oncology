import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { apiFetch } from '../utils/api';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Users, Activity, CheckCircle, Clock } from 'lucide-react';
import './Dashboard.css';

const ROLE_REDIRECTS = {
  admin: null,
  doctor: '/physician',
  nurse: '/nurse',
  technician: '/technician',
  reception: '/reception',
};

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const userStr = localStorage.getItem('auth_user');
  const user = userStr ? JSON.parse(userStr) : null;

  if (user && ROLE_REDIRECTS[user.role]) {
    return <Navigate to={ROLE_REDIRECTS[user.role]} replace />;
  }

  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await apiFetch('/dashboard/stats');
        setStats(data);
      } catch (err) {
        setError(err.message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div className="dashboard-loading">Loading Clinic Metrics...</div>;
  if (error) return <div className="dashboard-error">{error}</div>;
  if (!stats) return null;

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h2>Clinic Overview</h2>
        <p className="text-muted">Real-time statistics for Nuclear Oncology Department</p>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon blue"><Users size={24} /></div>
          <div className="kpi-details">
            <span className="kpi-label">Total Patients</span>
            <span className="kpi-value">{stats.metrics.totalPatients}</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon purple"><Activity size={24} /></div>
          <div className="kpi-details">
            <span className="kpi-label">Active Cases</span>
            <span className="kpi-value">{stats.metrics.activeCases}</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon green"><CheckCircle size={24} /></div>
          <div className="kpi-details">
            <span className="kpi-label">Finished Cases</span>
            <span className="kpi-value">{stats.metrics.finishedCases}</span>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="chart-card">
          <h3>Cancer Types Distribution</h3>
          {stats.cancerDistribution && stats.cancerDistribution.length > 0 ? (
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stats.cancerDistribution}
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stats.cancerDistribution.map((entry, index) => (
                      <Cell key={"cell-" + index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="chart-legend">
                {stats.cancerDistribution.map((entry, index) => (
                  <div key={entry.name} className="legend-item">
                    <span className="color-dot" style={{ background: COLORS[index % COLORS.length] }}></span>
                    {entry.name} ({entry.value})
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="empty-chart">No cancer distribution data available</div>
          )}
        </div>

        <div className="side-card">
          <h3>Recently Registered Patients</h3>
          <div className="recent-patients-list">
            {stats.recentPatients && stats.recentPatients.length > 0 ? (
              stats.recentPatients.map(patient => (
                <div key={patient.id} className="recent-patient-item" onClick={() => navigate("/patients/" + patient.id)}>
                  <div className="avatar-sm">{patient.name.charAt(0)}</div>
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
