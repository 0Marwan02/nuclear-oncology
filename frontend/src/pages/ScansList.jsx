import { useState, useEffect } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { Search, FileText, BarChart3, Plus, Loader2, AlertCircle, Calendar, Activity, Syringe, Pill, Bone, Droplets, UtensilsCrossed } from 'lucide-react';
import { format } from 'date-fns';
import { getScans, getScanStats } from '../utils/api';
import './ScansList.css';

const SCAN_TYPES = [
  { key: 'all', label: 'All Scans', labelAr: 'جميع الفحوصات', icon: BarChart3, route: null, color: '#2563eb' },
  { key: 'petct', label: 'PET/CT', labelAr: 'فحص PET/CT', icon: Activity, route: '/scans/petct', color: '#7c3aed' },
  { key: 'psma', label: 'PSMA PET/CT', labelAr: 'فحص PSMA', icon: Pill, route: '/scans/psma', color: '#ea580c' },
  { key: 'thyroid', label: 'Thyroid Scan', labelAr: 'فحص الغدة الدرقية', icon: Syringe, route: '/scans/thyroid', color: '#16a34a' },
  { key: 'bone', label: 'Bone Scan', labelAr: 'فحص العظام', icon: Bone, route: '/scans/bone', color: '#2563eb' },
  { key: 'renal', label: 'Renal Scan', labelAr: 'فحص الكلى', icon: Droplets, route: '/scans/renal', color: '#0d9488' },
  { key: 'gastric', label: 'Gastric Emptying', labelAr: 'فحص تفريغ المعدة', icon: UtensilsCrossed, route: '/scans/gastric', color: '#d97706' },
];

const STATUS_MAP = {
  completed: { label: 'Completed', class: 'status-completed' },
  pending: { label: 'Pending', class: 'status-pending' },
  in_progress: { label: 'In Progress', class: 'status-in-progress' },
  cancelled: { label: 'Cancelled', class: 'status-cancelled' },
};

const ScansList = () => {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [scans, setScans] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchScans();
  }, [activeFilter]);

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const data = await getScanStats();
      setStats(data);
    } catch {
      setStats({ total: 0, byType: {} });
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchScans = async () => {
    setLoading(true);
    setError('');
    try {
      const type = activeFilter === 'all' ? '' : activeFilter;
      const endpoint = type ? `/scans/${type}` : '/scans/recent';
      const data = await getScans(activeFilter === 'all' ? 'all' : activeFilter);
      setScans(Array.isArray(data) ? data : data.scans || []);
    } catch (err) {
      setError(err.message || 'Failed to load scans');
      setScans([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredScans = scans.filter((scan) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      scan.patientName?.toLowerCase().includes(q) ||
      scan.patientId?.toLowerCase().includes(q) ||
      scan.performedBy?.toLowerCase().includes(q)
    );
  });

  const handleNewScan = (type) => {
    setShowModal(false);
    navigate(`/scans/${type}`);
  };

  const totalScans = stats?.total ?? 0;

  return (
    <div className="scans-list-page fade-in">
      <div className="scans-page-header">
        <div>
          <h1>Scan Management</h1>
          <p className="page-subtitle">إدارة الفحوصات النووية</p>
        </div>
        <button className="btn-new-scan" onClick={() => setShowModal(true)}>
          <Plus size={18} />
          New Scan
        </button>
      </div>

      {/* Quick Stats */}
      <div className="stats-row">
        <div className="stat-card stat-total">
          <div className="stat-icon">
            <BarChart3 size={22} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{statsLoading ? '...' : totalScans}</span>
            <span className="stat-label">Total Scans</span>
          </div>
        </div>
        {SCAN_TYPES.filter((t) => t.key !== 'all').map((type) => {
          const Icon = type.icon;
          const count = stats?.byType?.[type.key] ?? 0;
          return (
            <button
              key={type.key}
              className="stat-card stat-type"
              style={{ '--accent': type.color }}
              onClick={() => setActiveFilter(type.key)}
            >
              <div className="stat-icon" style={{ background: `${type.color}15`, color: type.color }}>
                <Icon size={20} />
              </div>
              <div className="stat-content">
                <span className="stat-value">{statsLoading ? '...' : count}</span>
                <span className="stat-label">{type.label}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Filter Tabs */}
      <div className="scan-filters">
        <div className="filter-tabs">
          {SCAN_TYPES.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.key}
                className={`filter-tab ${activeFilter === type.key ? 'active' : ''}`}
                style={activeFilter === type.key ? { '--accent': type.color } : {}}
                onClick={() => setActiveFilter(type.key)}
              >
                <Icon size={16} />
                <span>{type.label}</span>
              </button>
            );
          })}
        </div>
        <div className="filter-search">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search by patient name, ID, or physician..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="notification notification-error fade-in">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Scans Table */}
      <div className="scans-table-card">
        <div className="scans-table-header">
          <h3>
            <FileText size={18} />
            Recent Scans ({filteredScans.length})
          </h3>
          <span className="active-filter-label">
            Showing: {SCAN_TYPES.find((t) => t.key === activeFilter)?.label}
          </span>
        </div>

        {loading ? (
          <div className="loading-state">
            <Loader2 size={24} className="spin" />
            Loading scans...
          </div>
        ) : filteredScans.length === 0 ? (
          <div className="empty-state">
            <FileText size={40} />
            <p>No scans found</p>
            <button className="btn-primary btn-sm" onClick={() => setShowModal(true)}>
              <Plus size={16} />
              Create First Scan
            </button>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="scans-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Patient</th>
                  <th>Status</th>
                  <th>Performed By</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredScans.map((scan) => {
                  const typeConfig = SCAN_TYPES.find((t) => t.key === scan.type);
                  const Icon = typeConfig?.icon || Activity;
                  const status = STATUS_MAP[scan.status] || STATUS_MAP.pending;
                  return (
                    <tr key={scan.id}>
                      <td>
                        <div className="date-cell">
                          <Calendar size={14} />
                          {scan.date ? format(new Date(scan.date), 'dd MMM yyyy') : 'N/A'}
                        </div>
                      </td>
                      <td>
                        <span className="type-badge" style={{ '--accent': typeConfig?.color || '#666' }}>
                          <Icon size={14} />
                          {typeConfig?.label || scan.type}
                        </span>
                      </td>
                      <td>
                        <div className="patient-cell">
                          <span className="patient-name">{scan.patientName || 'N/A'}</span>
                          <span className="patient-id">{scan.patientId || ''}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`status-badge ${status.class}`}>{status.label}</span>
                      </td>
                      <td className="performed-cell">{scan.performedBy || '—'}</td>
                      <td>
                        <div className="row-actions">
                          {typeConfig?.route && (
                            <NavLink
                              to={typeConfig.route}
                              className="btn-view"
                              title="View"
                            >
                              View
                            </NavLink>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Scan Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Scan</h2>
              <p>اختر نوع الفحص</p>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-scan-types">
              {SCAN_TYPES.filter((t) => t.key !== 'all').map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.key}
                    className="modal-scan-type"
                    style={{ '--accent': type.color }}
                    onClick={() => handleNewScan(type.key)}
                  >
                    <div className="modal-type-icon" style={{ background: `${type.color}15`, color: type.color }}>
                      <Icon size={24} />
                    </div>
                    <span className="modal-type-label">{type.label}</span>
                    <span className="modal-type-ar">{type.labelAr}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScansList;
