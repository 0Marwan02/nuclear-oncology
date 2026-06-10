import { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';
import { useTranslation } from '../i18n/index';
import { Search, UserPlus, FileText, X } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PatientCreate from '../components/PatientCreate';
import './PatientsList.css';

const CATEGORY_LABELS = {
  PET_CT: 'PET/CT',
  PSMA_PET_CT: 'PSMA PET/CT',
  GAMMA: 'GAMMA',
  OTHER: 'Other',
};

const STATUS_LABELS = {
  active: 'Active Cases',
  completed: 'Finished Cases',
};

const PatientsList = () => {
  const { t } = useTranslation();
  const [patients, setPatients] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const statusFilter   = searchParams.get('status') || '';
  const categoryFilter = searchParams.get('category') || '';

  useEffect(() => {
    fetchPatients();
  }, [query, statusFilter, categoryFilter]);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (query)          params.set('q', query);
      if (statusFilter)   params.set('status', statusFilter);
      if (categoryFilter) params.set('category', categoryFilter);
      const qs = params.toString();
      const data = await apiFetch(`/patients${qs ? `?${qs}` : ''}`);
      setPatients(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const removeFilter = (key) => {
    const next = new URLSearchParams(searchParams);
    next.delete(key);
    setSearchParams(next);
  };

  const setCategory = (value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set('category', value);
    else next.delete('category');
    setSearchParams(next);
  };

  const handlePatientCreated = (result) => {
    setShowCreateModal(false);
    if (result?.patient?.id) {
      navigate(`/patients/${result.patient.id}`);
    } else {
      fetchPatients();
    }
  };

  // Page title based on active filters
  let pageTitle = t('patient.title');
  if (statusFilter === 'active')       pageTitle = 'Active Cases';
  else if (statusFilter === 'completed') pageTitle = 'Finished Cases';
  else if (categoryFilter)             pageTitle = `${CATEGORY_LABELS[categoryFilter] ?? categoryFilter} Patients`;

  const hasFilters = statusFilter || categoryFilter;

  return (
    <div className="patients-container">
      <div className="page-header">
        <h2>{pageTitle}</h2>
        <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
          <UserPlus size={18} />
          {t('patient.add_new')}
        </button>
      </div>

      {/* Active filter chips */}
      {hasFilters && (
        <div className="filter-chips">
          {statusFilter && (
            <span className="filter-chip">
              {STATUS_LABELS[statusFilter] ?? statusFilter}
              <button onClick={() => removeFilter('status')}><X size={12} /></button>
            </span>
          )}
          {categoryFilter && (
            <span className="filter-chip">
              {CATEGORY_LABELS[categoryFilter] ?? categoryFilter}
              <button onClick={() => removeFilter('category')}><X size={12} /></button>
            </span>
          )}
          <button className="filter-clear" onClick={() => setSearchParams({})}>Clear all</button>
        </div>
      )}

      <div className="patients-toolbar">
        <div className="search-bar">
          <Search className="search-icon" size={20} />
          <input
            type="text"
            placeholder={t('patient.search_placeholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select
          className="category-filter-select"
          value={categoryFilter}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">All Categories</option>
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="loading-state">{t('common.loading')}</div>
      ) : patients.length === 0 ? (
        <div className="empty-state">{t('common.no_results')}</div>
      ) : (
        <div className="patients-grid">
          {patients.map(patient => (
            <div key={patient.id} className="patient-card" onClick={() => navigate(`/patients/${patient.id}`)}>
              <div className="card-header">
                <div className="patient-avatar">{patient.name.charAt(0).toUpperCase()}</div>
                <div className="patient-info">
                  <h3>{patient.name}</h3>
                  <p>ID: {patient.nationalId}</p>
                </div>
              </div>
              <div className="card-body">
                <div className="detail-row">
                  <span className="label">{t('patient.gender')}:</span>
                  <span className="value">{patient.gender}</span>
                </div>
                <div className="detail-row">
                  <span className="label">{t('patient.blood_type')}:</span>
                  <span className="value">{patient.bloodType}</span>
                </div>
                {patient.category && (
                  <div className="detail-row">
                    <span className="label">Category:</span>
                    <span className="value category-tag">{CATEGORY_LABELS[patient.category] ?? patient.category}{patient.subCategory ? ` › ${patient.subCategory}` : ''}</span>
                  </div>
                )}
              </div>
              <div className="card-footer">
                <FileText size={16} />
                <span>{patient._count?.visits ?? 0} {t('patient.visits')}</span>
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
