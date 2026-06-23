import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { getScanHistory, apiFetch } from '../utils/api';
import {
  Activity, Pill, Scan, Bone, Droplet, Search as SearchIcon, Microscope,
  Calendar, FileText, ChevronDown, ChevronUp, ArrowLeft, GitCompare, X,
  ArrowUp, ArrowDown, Minus, Layers, Clock, Stethoscope, CheckCircle2, HeartPulse,
} from 'lucide-react';
import './PatientHistory.css';

const TYPE_META = {
  petct:   { label: 'PET/CT',    color: '#8b5cf6', Icon: Activity,   dose: 'fdgDoseMCi' },
  psma:    { label: 'PSMA',      color: '#ec4899', Icon: Pill,       dose: 'ga68DoseMCi' },
  thyroid: { label: 'Thyroid',   color: '#f59e0b', Icon: Scan,       dose: 'isotopeDoseMCi' },
  bone:    { label: 'Bone',      color: '#6b7280', Icon: Bone,       dose: 'tc99mDoseMCi' },
  renal:   { label: 'Renal',     color: '#3b82f6', Icon: Droplet,    dose: 'tc99mDoseMCi' },
  gastric: { label: 'Gastric',   color: '#10b981', Icon: SearchIcon, dose: 'tc99mDoseMCi' },
  meckel:  { label: "Meckel's",  color: '#f97316', Icon: Microscope, dose: 'tc99mDoseMCi' },
  cardiac: { label: 'Cardiac',   color: '#ef4444', Icon: HeartPulse, dose: 'tracerDoseMCi' },
};

const meta = (t) => TYPE_META[t] || { label: t || 'Scan', color: '#9ca3af', Icon: FileText, dose: null };

const STATUS_LABEL = {
  Pending_Doctor: 'Awaiting Doctor',
  Pending_Nurse: 'Awaiting Nurse',
  Pending_Technical: 'Awaiting Technical',
  Pending_Report: 'Awaiting Report',
  Completed: 'Completed',
};

// Fields hidden from the detail grid / comparison (internal, relational, or noisy).
const HIDDEN_KEYS = new Set([
  'id', 'patientId', 'visitId', 'performedBy', 'reportedBy', 'createdAt', 'updatedAt',
  'fileUrl', 'isLocked', 'patient', 'visit', 'performer', 'reporter',
  'scanType', 'type', 'date', 'doseUnit', 'diagramData', 'symptomFlags',
]);

const humanize = (key) =>
  key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bMc I\b/i, 'mCi')
    .replace(/\bTc99m\b/i, 'Tc-99m')
    .trim();

const looksLikeDate = (k) => /date|time$/i.test(k);

const formatVal = (key, val) => {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (looksLikeDate(key)) {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return format(d, 'dd MMM yyyy');
  }
  if (typeof val === 'object') return null;
  return String(val);
};

const detailEntries = (record) =>
  Object.entries(record)
    .filter(([k, v]) => !HIDDEN_KEYS.has(k) && formatVal(k, v) !== null)
    .map(([k, v]) => ({ key: k, label: humanize(k), value: formatVal(k, v), raw: v }));

const doseOf = (record) => {
  const field = meta(record.scanType).dose;
  const v = field && record[field];
  return v != null ? `${v} mCi` : null;
};

const PatientHistory = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [typeFilter, setTypeFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [selected, setSelected] = useState([]); // up to 2 records for comparison

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const [p, scans] = await Promise.all([
          apiFetch(`/patients/${id}`).catch(() => null),
          getScanHistory('all', id),
        ]);
        if (!alive) return;
        setPatient(p);
        const list = (Array.isArray(scans) ? scans : scans.records || [])
          .map((r) => ({ ...r, scanType: r.scanType || r.type, date: r.date || r.createdAt }))
          .sort((a, b) => new Date(b.date) - new Date(a.date));
        setRecords(list);
      } catch (err) {
        if (alive) setError(err.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  const summary = useMemo(() => {
    const byType = {};
    const byStatus = {};
    records.forEach((r) => {
      byType[r.scanType] = (byType[r.scanType] || 0) + 1;
      const s = r.workflowStatus || 'Completed';
      byStatus[s] = (byStatus[s] || 0) + 1;
    });
    return {
      total: records.length,
      modalities: Object.keys(byType).length,
      completed: byStatus.Completed || 0,
      last: records[0] ? format(new Date(records[0].date), 'dd MMM yyyy') : '—',
      byType,
      byStatus,
    };
  }, [records]);

  const visibleRecords = useMemo(
    () => (typeFilter === 'all' ? records : records.filter((r) => r.scanType === typeFilter)),
    [records, typeFilter]
  );

  const toggleCompare = (record) => {
    setSelected((prev) => {
      if (prev.find((r) => r.id === record.id)) return prev.filter((r) => r.id !== record.id);
      if (prev.length < 2) return [...prev, record];
      return [prev[1], record];
    });
  };

  const isSelected = (record) => selected.some((r) => r.id === record.id);

  if (loading) return <div className="ph-loading"><div className="ph-spinner" /> Loading history…</div>;
  if (error) return <div className="ph-error">{error}</div>;

  return (
    <div className="patient-history">
      {/* Header */}
      <div className="ph-header">
        <button className="ph-back" onClick={() => navigate(`/patients/${id}`)}>
          <ArrowLeft size={16} /> Back to patient
        </button>
        <div className="ph-title-row">
          <div className="ph-avatar">{(patient?.name || '?').charAt(0).toUpperCase()}</div>
          <div>
            <h2>{patient?.name || 'Patient'} <span className="ph-sub">— Scan History</span></h2>
            <div className="ph-tags">
              {patient?.nationalId && <span className="ph-tag">ID: {patient.nationalId}</span>}
              {patient?.gender && <span className="ph-tag">{patient.gender}</span>}
              {patient?.category && <span className="ph-tag ph-tag--accent">{patient.category.replace(/_/g, ' ')}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="ph-tabs">
        {[
          { key: 'overview', label: 'Overview', Icon: Layers },
          { key: 'timeline', label: 'Timeline', Icon: Clock },
          { key: 'compare', label: `Compare${selected.length ? ` (${selected.length})` : ''}`, Icon: GitCompare },
        ].map(({ key, label, Icon }) => (
          <button key={key} className={`ph-tab ${activeTab === key ? 'active' : ''}`} onClick={() => setActiveTab(key)}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="ph-overview">
          <div className="ph-stat-grid">
            <StatCard icon={<FileText size={18} />} label="Total Scans" value={summary.total} accent="#6366f1" />
            <StatCard icon={<Layers size={18} />} label="Modalities" value={summary.modalities} accent="#0ea5e9" />
            <StatCard icon={<CheckCircle2 size={18} />} label="Completed" value={summary.completed} accent="#10b981" />
            <StatCard icon={<Calendar size={18} />} label="Last Scan" value={summary.last} accent="#f59e0b" small />
          </div>

          {summary.total > 0 ? (
            <>
              <div className="ph-panel">
                <h3>By Modality</h3>
                <div className="ph-modality-grid">
                  {Object.entries(summary.byType).map(([t, n]) => {
                    const m = meta(t);
                    return (
                      <button key={t} className="ph-modality" onClick={() => { setTypeFilter(t); setActiveTab('timeline'); }}>
                        <span className="ph-modality-icon" style={{ background: `${m.color}18`, color: m.color }}>
                          <m.Icon size={18} />
                        </span>
                        <span className="ph-modality-label">{m.label}</span>
                        <span className="ph-modality-count">{n}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="ph-panel">
                <h3>Workflow Status</h3>
                <div className="ph-status-bars">
                  {Object.entries(summary.byStatus).map(([s, n]) => (
                    <div key={s} className="ph-status-row">
                      <span className={`ph-status-badge st-${s.toLowerCase()}`}>{STATUS_LABEL[s] || s}</span>
                      <div className="ph-status-track">
                        <div className="ph-status-fill" style={{ width: `${(n / summary.total) * 100}%` }} />
                      </div>
                      <span className="ph-status-num">{n}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="ph-empty"><Scan size={40} /><p>No scans recorded for this patient yet.</p></div>
          )}
        </div>
      )}

      {/* TIMELINE */}
      {activeTab === 'timeline' && (
        <div className="ph-timeline-tab">
          <div className="ph-filter-row">
            <button className={`ph-chip ${typeFilter === 'all' ? 'active' : ''}`} onClick={() => setTypeFilter('all')}>
              All ({records.length})
            </button>
            {Object.entries(summary.byType).map(([t, n]) => (
              <button key={t} className={`ph-chip ${typeFilter === t ? 'active' : ''}`}
                style={typeFilter === t ? { background: meta(t).color, borderColor: meta(t).color } : {}}
                onClick={() => setTypeFilter(t)}>
                {meta(t).label} ({n})
              </button>
            ))}
          </div>

          {visibleRecords.length === 0 ? (
            <div className="ph-empty"><Scan size={40} /><p>No scans match this filter.</p></div>
          ) : (
            <div className="ph-timeline">
              {visibleRecords.map((record) => {
                const m = meta(record.scanType);
                const open = expandedId === record.id;
                const dose = doseOf(record);
                return (
                  <div key={record.id} className={`ph-card ${open ? 'open' : ''}`} style={{ '--accent': m.color }}>
                    <div className="ph-card-rail"><m.Icon size={16} /></div>
                    <div className="ph-card-body">
                      <div className="ph-card-top">
                        <div className="ph-card-headings">
                          <span className="ph-badge" style={{ background: m.color }}>{m.label}</span>
                          <span className="ph-date"><Calendar size={13} /> {format(new Date(record.date), 'dd MMM yyyy · HH:mm')}</span>
                          {record.workflowStatus && (
                            <span className={`ph-status-badge st-${record.workflowStatus.toLowerCase()}`}>
                              {STATUS_LABEL[record.workflowStatus] || record.workflowStatus}
                            </span>
                          )}
                        </div>
                        <button className={`ph-compare-toggle ${isSelected(record) ? 'on' : ''}`}
                          title="Select for comparison" onClick={() => toggleCompare(record)}>
                          <GitCompare size={15} />
                        </button>
                      </div>

                      <div className="ph-card-summary">
                        {record.diagnosis && <span className="ph-kv"><Stethoscope size={13} /> {record.diagnosis}</span>}
                        {dose && <span className="ph-kv ph-kv--dose">{dose}</span>}
                        {record.reporter?.name && <span className="ph-kv ph-muted">Dr. {record.reporter.name}</span>}
                      </div>

                      {record.impression && (
                        <p className="ph-impression"><strong>Impression:</strong> {record.impression}</p>
                      )}

                      <button className="ph-expand" onClick={() => setExpandedId(open ? null : record.id)}>
                        {open ? <><ChevronUp size={14} /> Hide details</> : <><ChevronDown size={14} /> Show details</>}
                      </button>

                      {open && (
                        <div className="ph-detail-grid">
                          {detailEntries(record).map(({ key, label, value }) => (
                            <div key={key} className="ph-detail">
                              <span className="ph-detail-label">{label}</span>
                              <span className="ph-detail-value">{value}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* COMPARE */}
      {activeTab === 'compare' && (
        <CompareView selected={selected} onClear={() => setSelected([])} onGoTimeline={() => setActiveTab('timeline')} />
      )}

      {/* Sticky compare bar */}
      {selected.length > 0 && activeTab !== 'compare' && (
        <div className="ph-compare-bar">
          <span className="ph-compare-count">{selected.length}/2 selected for comparison</span>
          <div className="ph-compare-chips">
            {selected.map((r) => (
              <span key={r.id} className="ph-compare-chip" style={{ borderColor: meta(r.scanType).color }}>
                {meta(r.scanType).label} · {format(new Date(r.date), 'dd MMM')}
                <button onClick={() => toggleCompare(r)}><X size={12} /></button>
              </span>
            ))}
          </div>
          <button className="ph-compare-go" disabled={selected.length !== 2} onClick={() => setActiveTab('compare')}>
            Compare <GitCompare size={15} />
          </button>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ icon, label, value, accent, small }) => (
  <div className="ph-stat" style={{ '--accent': accent }}>
    <span className="ph-stat-icon">{icon}</span>
    <div className="ph-stat-text">
      <span className={`ph-stat-value ${small ? 'sm' : ''}`}>{value}</span>
      <span className="ph-stat-label">{label}</span>
    </div>
  </div>
);

const CompareView = ({ selected, onClear, onGoTimeline }) => {
  if (selected.length < 2) {
    return (
      <div className="ph-empty ph-compare-empty">
        <GitCompare size={40} />
        <p>Select <strong>two</strong> scans to compare.</p>
        <span className="ph-muted">Use the <GitCompare size={13} /> button on any card in the Timeline.</span>
        <button className="ph-link" onClick={onGoTimeline}>Go to Timeline →</button>
      </div>
    );
  }

  const [a, b] = [...selected].sort((x, y) => new Date(x.date) - new Date(y.date)); // older → newer
  const ma = meta(a.scanType);
  const mb = meta(b.scanType);

  const keys = Array.from(new Set([...detailEntries(a), ...detailEntries(b)].map((e) => e.key)));
  const labelFor = (k) => humanize(k);

  const trend = (k) => {
    const va = Number(a[k]);
    const vb = Number(b[k]);
    if (Number.isNaN(va) || Number.isNaN(vb) || va === vb) return null;
    return vb > va
      ? <ArrowUp size={14} className="tr-up" />
      : <ArrowDown size={14} className="tr-down" />;
  };

  return (
    <div className="ph-compare-view">
      <div className="ph-compare-head">
        <h3>Comparing {selected.length} scans</h3>
        <button className="ph-link" onClick={onClear}>Clear selection</button>
      </div>
      <div className="ph-compare-table">
        <div className="ph-compare-col-head" />
        <div className="ph-compare-col-head">
          <span className="ph-badge" style={{ background: ma.color }}>{ma.label}</span>
          <span className="ph-muted">{format(new Date(a.date), 'dd MMM yyyy')}</span>
        </div>
        <div className="ph-compare-col-head">
          <span className="ph-badge" style={{ background: mb.color }}>{mb.label}</span>
          <span className="ph-muted">{format(new Date(b.date), 'dd MMM yyyy')}</span>
        </div>

        {keys.map((k) => {
          const va = formatVal(k, a[k]);
          const vb = formatVal(k, b[k]);
          const changed = (va || '') !== (vb || '');
          return (
            <div key={k} className={`ph-compare-line ${changed ? 'changed' : ''}`}>
              <span className="ph-compare-key">{labelFor(k)}</span>
              <span className="ph-compare-cell">{va || '—'}</span>
              <span className="ph-compare-cell">{vb || '—'} {changed && trend(k)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PatientHistory;
