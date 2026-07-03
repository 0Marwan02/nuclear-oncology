import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../i18n/index';
import { getWorkflowAll, advanceWorkflow, exportReport, getReportVersions, listScanTemplates, API_ORIGIN, getDailyStats } from '../utils/api';
import { useQueueSocket } from '../utils/socket';
import WorkflowProgress from '../components/WorkflowProgress';
import ScanReportView from '../components/ScanReportView';
import ReturnAction from '../components/ReturnAction';
import { FileText, FolderOpen, PenTool, ChevronDown, ChevronUp, CheckCircle, ClipboardList, Activity, Pill, Scan, Bone, Droplet, Search, Plus, HeartPulse, FileDown, FileType } from 'lucide-react';
import { getFileInfo } from '../utils/fileColor';
import { format } from 'date-fns';
import './PhysicianDashboard.css';

const SCAN_SHORTCUTS = [
  { label: 'PET/CT', icon: Activity, path: '/scans/petct', color: '#8b5cf6' },
  { label: 'PSMA', icon: Pill, path: '/scans/psma', color: '#ec4899' },
  { label: 'Thyroid', icon: Scan, path: '/scans/thyroid', color: '#f59e0b' },
  { label: 'Bone', icon: Bone, path: '/scans/bone', color: '#6b7280' },
  { label: 'Renal', icon: Droplet, path: '/scans/renal', color: '#3b82f6' },
  { label: 'Gastric', icon: Search, path: '/scans/gastric', color: '#10b981' },
  { label: 'Cardiac', icon: HeartPulse, path: '/scans/cardiac', color: '#ef4444' },
];

// Export PDF / Word buttons + current report number / version display.
const ReportExport = ({ record, t }) => {
  const scanType = record._scanType || record.scanType;
  const [versions, setVersions] = useState([]);
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');

  const loadVersions = useCallback(async () => {
    try {
      const rows = await getReportVersions(scanType, record.id);
      setVersions(rows || []);
    } catch { /* non-fatal */ }
  }, [scanType, record.id]);

  useEffect(() => { loadVersions(); }, [loadVersions]);

  const handleExport = async (format) => {
    setBusy(format);
    setErr('');
    try {
      const res = await exportReport(scanType, record.id, format);
      window.open(API_ORIGIN + res.fileUrl, '_blank');
      await loadVersions();
    } catch (e) {
      setErr(e.message || t('report.export_failed'));
    } finally {
      setBusy('');
    }
  };

  const current = versions[0];

  return (
    <div className="report-export">
      <div className="report-export-meta">
        {current ? (
          <span className="text-muted">
            {t('report.number')}: <strong>{current.reportNumber}</strong> · {t('report.version')} v{current.version}
          </span>
        ) : (
          <span className="text-muted">{t('report.not_generated')}</span>
        )}
      </div>
      <div className="report-export-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-sm" disabled={!!busy} onClick={() => handleExport('pdf')}>
          <FileDown size={16} /> {busy === 'pdf' ? t('report.exporting') : t('report.export_pdf')}
        </button>
        <button type="button" className="btn btn-sm" disabled={!!busy} onClick={() => handleExport('docx')}>
          <FileType size={16} /> {busy === 'docx' ? t('report.exporting') : t('report.export_word')}
        </button>
      </div>
      {err && <div className="error-banner" style={{ marginTop: 8 }}>{err}</div>}
    </div>
  );
};

const PhysicianDashboard = () => {
  const navigate = useNavigate();
  const { t, isRTL } = useTranslation();
  const [scannedRecords, setScannedRecords] = useState([]);
  const [completedToday, setCompletedToday] = useState([]);
  const [dailyStats, setDailyStats] = useState({ myCasesToday: 0, hospitalCasesToday: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [submittingId, setSubmittingId] = useState(null);
  const [reportForm, setReportForm] = useState({ physicianNotes: '', impression: '' });
  const [successMsg, setSuccessMsg] = useState('');
  const [dynamicTemplates, setDynamicTemplates] = useState([]);
  const dismissedRef = useRef(new Set());

  useEffect(() => {
    listScanTemplates(true).then((rows) => setDynamicTemplates(rows || [])).catch(() => {});
  }, []);

  const fetchQueues = useCallback(async () => {
    try {
      const [scannedQ, stats] = await Promise.all([
        getWorkflowAll({ status: 'Pending_Report' }).catch(() => []),
        getDailyStats()
      ]);
      scannedQ.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setScannedRecords(scannedQ
        .filter(r => !dismissedRef.current.has(r.id))
        .map((r) => ({ ...r, _scanType: r.scanType }))
      );
      setDailyStats(stats);
    } catch (err) {
      setError(err.message || t('physician.load_failed'));
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      await fetchQueues();
      setLoading(false);
    };
    fetchData();
  }, [fetchQueues]);

  useQueueSocket(fetchQueues);

  const handleFormChange = (e) => {
    setReportForm({ ...reportForm, [e.target.name]: e.target.value });
  };

  const handleComplete = async (record) => {
    setSubmittingId(record.id);
    setError('');
    setSuccessMsg('');
    try {
      await advanceWorkflow(record._scanType || record.scanType, record.id, {
        workflowStatus: 'Completed',
        report: {
          impression: reportForm.impression,
          physicianNotes: reportForm.physicianNotes,
        },
      });
      dismissedRef.current.add(record.id);
      setScannedRecords(prev => prev.filter(p => p.id !== record.id));
      setCompletedToday(prev => [...prev, record]);
      setDailyStats(prev => ({ 
        myCasesToday: prev.myCasesToday + 1, 
        hospitalCasesToday: prev.hospitalCasesToday + 1 
      }));
      setExpandedId(null);
      setReportForm({ physicianNotes: '', impression: '' });
      setSuccessMsg(t('physician.report_approved'));
    } catch (err) {
      setError(err.message || t('physician.approve_failed'));
    } finally {
      setSubmittingId(null);
    }
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
    setReportForm({ physicianNotes: '', impression: '' });
  };

  if (loading) return <div className="dashboard-loading"><div className="spinner" /> {t('common.loading')}</div>;

  return (
    <div className="physician-dashboard fade-in">
      <div className="page-header">
        <div>
          <h2><ClipboardList size={24} /> {t('physician.title')}</h2>
          <p className="text-muted">{t('physician.subtitle')}</p>
        </div>
        <div className="status-badge scanned">{scannedRecords.length} {t('physician.report_queue')}</div>
      </div>

      {successMsg && <div className="success-banner">{successMsg}</div>}
      {error && <div className="error-banner">{error}</div>}

      {/* Quick-access scan shortcuts */}
      <div className="queue-section" style={{ marginBottom: 24 }}>
        <h3 className="queue-title"><Plus size={20} /> New Scan Record</h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
          {SCAN_SHORTCUTS.map(({ label, icon: Icon, path, color }) => (
            <button key={path} onClick={() => navigate(path)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 10, border: `1px solid ${color}30`, background: `${color}10`, color, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
              <Icon size={16} /> {label}
            </button>
          ))}
          {dynamicTemplates.map((tpl) => {
            const color = tpl.color || '#0ea5e9';
            return (
              <button key={tpl.id} onClick={() => navigate(`/scans/t/${tpl.key}`)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 10, border: `1px solid ${color}30`, background: `${color}10`, color, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                <FileText size={16} /> {tpl.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="queue-section">
        <h3 className="queue-title"><PenTool size={20} /> {t('physician.report_queue')} ({scannedRecords.length})</h3>
        
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', marginTop: '1rem' }}>
          <div style={{ flex: 1, backgroundColor: '#fff', padding: '1rem 1.5rem', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderLeft: '4px solid #7c3aed' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#6b7280', fontSize: '0.9rem' }}>{t('dashboard.my_cases_today')}</h4>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#111827' }}>{dailyStats.myCasesToday}</div>
          </div>
          <div style={{ flex: 1, backgroundColor: '#fff', padding: '1rem 1.5rem', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderLeft: '4px solid #10b981' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#6b7280', fontSize: '0.9rem' }}>{t('dashboard.hospital_cases_today')}</h4>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#111827' }}>{dailyStats.hospitalCasesToday}</div>
          </div>
        </div>

        <div className="records-list">
          {scannedRecords.length === 0 ? (
            <div className="empty-state">
              <FileText size={48} />
              <p>{t('physician.no_reports')}</p>
              <span className="empty-state-hint">{t('physician.empty_hint')}</span>
            </div>
          ) : (
            scannedRecords.map(record => {
              const patient = record.patient || {};
              const dose = record.fdgDoseMCi || record.ga68DoseMCi || record.isotopeDoseMCi || record.tc99mDoseMCi || record.tracerDoseMCi || '—';
              const impression = record.impression || '';
              const fileInfo = getFileInfo(record);

              return (
                <div key={record.id} className={`record-card ${expandedId === record.id ? 'expanded' : ''}`}>
                  <div className="record-header" onClick={() => toggleExpand(record.id)}>
                    <div className="patient-info">
                      <h3>{patient.name || t('common.unknown')}</h3>
                      <span className="text-muted">{patient.nationalId || ''}</span>
                    </div>
                    <div className="record-meta">
                      {fileInfo && (
                        <span className={`file-badge file-badge--${fileInfo.color}`}>
                          <FolderOpen size={12} /> {fileInfo.label}
                        </span>
                      )}
                      <span className="type-tag">{record._scanType}</span>
                      <span className="text-muted">{format(new Date(record.createdAt), 'MMM dd, HH:mm')}</span>
                      {expandedId === record.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </div>

                  <div className="scan-summary">
                    <span><strong>{t('physician.dose')}:</strong> {dose} mCi</span>
                    {impression && <span><strong>{t('physician.impression')}:</strong> {impression.substring(0, 80)}{impression.length > 80 ? '...' : ''}</span>}
                  </div>

                  {expandedId === record.id && (
                    <div className="record-body">
                      <WorkflowProgress status={record.workflowStatus || 'Pending_Report'} />
                      <ScanReportView record={record} />
                      <ReportExport record={record} t={t} />
                      <form onSubmit={(e) => { e.preventDefault(); handleComplete(record); }} className="report-form">
                        <div className="form-group">
                          <label>{t('physician.impression')} <span className="required-mark">*</span></label>
                          <span className="field-help">{t('physician.impression_help')}</span>
                          <textarea name="impression" value={reportForm.impression} onChange={handleFormChange} rows="3" className="touch-input" required />
                        </div>
                        <div className="form-group">
                          <label>{t('physician.physician_notes')}</label>
                          <span className="field-help">{t('physician.physician_notes_help')}</span>
                          <textarea name="physicianNotes" value={reportForm.physicianNotes} onChange={handleFormChange} rows="3" className="touch-input" />
                        </div>
                        <div className="report-form-actions">
                          <button type="submit" className="btn-complete" disabled={submittingId === record.id || !reportForm.impression.trim()}>
                            <CheckCircle size={18} />
                            {submittingId === record.id ? t('physician.approving') : t('physician.approve_report')}
                          </button>
                          <ReturnAction
                            record={record}
                            targetStatus="Pending_Technical"
                            label={t('workflow.return_to_tech')}
                            onReturned={(r) => {
                              setScannedRecords(prev => prev.filter(p => p.id !== r.id));
                              setExpandedId(null);
                            }}
                          />
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default PhysicianDashboard;
