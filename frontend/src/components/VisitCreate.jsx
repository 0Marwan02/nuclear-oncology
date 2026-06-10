import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Pill, Scan, Bone, Droplet, Search, X, Plus, ChevronRight, RefreshCw } from 'lucide-react';
import { apiFetch } from '../utils/api';
import './VisitCreate.css';

const SCAN_TYPES = [
  { label: 'PET/CT (FDG)',    path: '/scans/petct',   icon: Activity, color: '#8b5cf6', category: 'PET_CT' },
  { label: 'PSMA PET/CT',     path: '/scans/psma',    icon: Pill,     color: '#ec4899', category: 'PSMA_PET_CT' },
  { label: 'Thyroid',         path: '/scans/thyroid', icon: Scan,     color: '#f59e0b', category: 'GAMMA', sub: 'Thyroid' },
  { label: 'Bone',            path: '/scans/bone',    icon: Bone,     color: '#6b7280', category: 'GAMMA', sub: 'Bone' },
  { label: 'Renal',           path: '/scans/renal',   icon: Droplet,  color: '#3b82f6', category: 'GAMMA', sub: 'Renal' },
  { label: 'Gastric',         path: '/scans/gastric', icon: Search,   color: '#10b981', category: 'GAMMA', sub: 'Gastric' },
  { label: "Meckel's",        path: '/scans/meckel',  icon: Search,   color: '#f97316', category: 'GAMMA', sub: 'Meckel' },
];

const typeFromPatient = (patient) => {
  if (!patient?.category) return null;
  if (patient.category === 'PET_CT') return SCAN_TYPES[0];
  if (patient.category === 'PSMA_PET_CT') return SCAN_TYPES[1];
  if (patient.category === 'GAMMA') {
    const found = SCAN_TYPES.find(t => t.sub === patient.subCategory);
    return found || null;
  }
  return null;
};

const VisitCreate = ({ patientId, onCancel }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState(null);
  const [showFullPicker, setShowFullPicker] = useState(false);

  useEffect(() => {
    apiFetch(`/patients/${patientId}`)
      .then(p => setPatient(p))
      .catch(() => setPatient(null))
      .finally(() => setLoading(false));
  }, [patientId]);

  const go = (path) => {
    navigate(`${path}?patientId=${patientId}`);
    onCancel();
  };

  const primaryType = typeFromPatient(patient);
  const hasPrimary = !!primaryType;

  return (
    <div className="visit-create-modal-overlay" onClick={onCancel}>
      <div className="visit-create-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add New Visit</h3>
          <button className="close-btn" onClick={onCancel}><X size={18} /></button>
        </div>

        {loading ? (
          <div className="vc-loading"><RefreshCw size={20} className="spin" /> Loading…</div>
        ) : !hasPrimary || showFullPicker ? (
          <>
            {hasPrimary && (
              <div className="vc-section-label">
                <Plus size={14} /> Register a new condition
              </div>
            )}
            <div className="scan-type-grid">
              {SCAN_TYPES.map(({ label, path, icon: Icon, color }) => (
                <button
                  key={path}
                  className="scan-type-btn"
                  style={{ borderColor: `${color}40`, color }}
                  onClick={() => go(path)}
                >
                  <Icon size={22} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
            {hasPrimary && (
              <button className="vc-back-link" onClick={() => setShowFullPicker(false)}>
                ← Back
              </button>
            )}
          </>
        ) : (
          <div className="vc-conditions-body">
            <p className="vc-hint">Continue with the patient's registered condition:</p>

            <button
              className="vc-condition-card"
              style={{ '--accent': primaryType.color }}
              onClick={() => go(primaryType.path)}
            >
              <div className="vc-cc-icon" style={{ background: `${primaryType.color}18`, color: primaryType.color }}>
                <primaryType.icon size={22} />
              </div>
              <div className="vc-cc-info">
                <span className="vc-cc-label">{primaryType.label}</span>
                <span className="vc-cc-date">Primary condition</span>
              </div>
              <ChevronRight size={18} className="vc-cc-arrow" />
            </button>

            <button className="vc-new-condition-btn" onClick={() => setShowFullPicker(true)}>
              <Plus size={16} /> Register a new condition
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VisitCreate;
