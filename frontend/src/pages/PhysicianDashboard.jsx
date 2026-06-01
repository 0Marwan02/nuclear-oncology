import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, getWorkflowAll, advanceWorkflow, getClinicHistory, getFollowUpReminders, getAssessmentQueue } from '../utils/api';
import { useQueueSocket } from '../utils/socket';
import WorkflowProgress from '../components/WorkflowProgress';
import PhysicianAssessment from '../components/PhysicianAssessment';
import { FileText, FolderOpen, PenTool, ChevronDown, ChevronUp, ChevronRight, CheckCircle, ClipboardList, Stethoscope, UserCheck } from 'lucide-react';
import { format } from 'date-fns';
import './PhysicianDashboard.css';

const CLINIC_TYPES = [
  { key: 'green', label: 'Thyroid Cancer', color: 'green', icon: FolderOpen },
  { key: 'red', label: 'Thyroid Diseases', color: 'red', icon: FolderOpen },
];

const PhysicianDashboard = () => {
  const navigate = useNavigate();
  const [assessmentQueue, setAssessmentQueue] = useState([]);
  const [scannedRecords, setScannedRecords] = useState([]);
  const [completedToday, setCompletedToday] = useState([]);
  const [greenFileCount, setGreenFileCount] = useState(0);
  const [redFileCount, setRedFileCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedAssessId, setExpandedAssessId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [submittingId, setSubmittingId] = useState(null);
  const [reportForm, setReportForm] = useState({ physicianNotes: '', impression: '' });
  const [successMsg, setSuccessMsg] = useState('');
  const [followUps, setFollowUps] = useState({ upcoming: [], overdue: [] });

  const fetchQueues = useCallback(async () => {
    try {
      const [assessQ, scannedQ] = await Promise.all([
        getAssessmentQueue().catch(() => []),
        getWorkflowAll({ status: 'Scanned' }).catch(() => []),
      ]);
      assessQ.sort((a, b) => new Date(b.visitDate || b.createdAt || 0) - new Date(a.visitDate || a.createdAt || 0));
      scannedQ.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setAssessmentQueue(assessQ);
      setScannedRecords(scannedQ.map((r) => ({ ...r, _scanType: r.scanType })));
    } catch (err) {
      setError(err.message || 'فشل في تحميل البيانات');
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      await fetchQueues();
      const [greenData, redData, reminders] = await Promise.all([
        getClinicHistory('green', {}).catch(() => []),
        getClinicHistory('red', {}).catch(() => []),
        getFollowUpReminders(60).catch(() => ({ upcoming: [], overdue: [] })),
      ]);
      setGreenFileCount(Array.isArray(greenData) ? greenData.length : 0);
      setRedFileCount(Array.isArray(redData) ? redData.length : 0);
      setFollowUps(reminders);
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
      setScannedRecords(prev => prev.filter(p => p.id !== record.id));
      setCompletedToday(prev => [...prev, record]);
      setExpandedId(null);
      setReportForm({ physicianNotes: '', impression: '' });
      setSuccessMsg('تم اعتماد التقرير بنجاح');
    } catch (err) {
      setError(err.message || 'فشل في اعتماد التقرير');
    } finally {
      setSubmittingId(null);
    }
  };

  const handleAssessmentDone = () => {
    setExpandedAssessId(null);
    setSuccessMsg('تم التقييم وإرسال المريض للتمريض');
    fetchQueues();
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
    setReportForm({ physicianNotes: '', impression: '' });
  };

  if (loading) return <div className="dashboard-loading"><div className="spinner" /> Loading...</div>;

  return (
    <div className="physician-dashboard fade-in" dir="rtl">
      <div className="page-header">
        <div>
          <h2><ClipboardList size={24} /> مساحة عمل الطبيب</h2>
          <p className="text-muted">تقييم المرضى الجدد ومراجعة واعتماد التقارير</p>
        </div>
        <div className="status-badge scanned">{assessmentQueue.length} للتقييم · {scannedRecords.length} للمراجعة</div>
      </div>

      {successMsg && <div className="success-banner">{successMsg}</div>}
      {error && <div className="error-banner">{error}</div>}

      {(followUps.overdue?.length > 0 || followUps.upcoming?.length > 0) && (
        <div className="follow-up-panel section-card" style={{ marginBottom: '1rem', padding: '1rem', background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb' }}>
          <h3>مواعيد المتابعة (عيادات)</h3>
          {followUps.overdue?.length > 0 && (
            <div style={{ color: '#b91c1c', marginBottom: '0.5rem' }}>
              <strong>متأخرة ({followUps.overdue.length})</strong>
              <ul>
                {followUps.overdue.slice(0, 5).map((a) => (
                  <li key={a.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/patients/${a.patientId}`)}>
                    {a.patient?.name} — {format(new Date(a.appointmentDate), 'dd/MM/yyyy')}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {followUps.upcoming?.length > 0 && (
            <div>
              <strong>قادمة ({followUps.upcoming.length})</strong>
              <ul>
                {followUps.upcoming.slice(0, 5).map((a) => (
                  <li key={a.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/patients/${a.patientId}`)}>
                    {a.patient?.name} — {format(new Date(a.appointmentDate), 'dd/MM/yyyy')}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="clinic-files-row">
        {CLINIC_TYPES.map(type => {
          const Icon = type.icon;
          const count = type.key === 'green' ? greenFileCount : redFileCount;
          return (
            <div key={type.key} className={`clinic-file-card ${type.color}`} onClick={() => navigate(`/clinic/${type.key}`)}>
              <div className="file-icon"><Icon size={28} /></div>
              <div className="file-info"><h3>{type.label}</h3><span className="file-count">{count} ملفات</span></div>
              <ChevronRight size={20} />
            </div>
          );
        })}
      </div>

      {/* Assessment queue — new encounters from reception awaiting the physician */}
      <div className="queue-section">
        <h3 className="queue-title"><UserCheck size={20} /> في انتظار التقييم ({assessmentQueue.length})</h3>
        <div className="records-list">
          {assessmentQueue.length === 0 ? (
            <div className="empty-state"><Stethoscope size={40} /><p>لا يوجد مرضى جدد في انتظار التقييم</p></div>
          ) : (
            assessmentQueue.map(visit => {
              const patient = visit.patient || {};
              const open = expandedAssessId === visit.id;
              return (
                <div key={visit.id} className={`record-card ${open ? 'expanded' : ''}`}>
                  <div className="record-header" onClick={() => setExpandedAssessId(open ? null : visit.id)}>
                    <div className="patient-info">
                      <h3>{patient.name || 'Unknown'}</h3>
                      <span className="text-muted">{patient.nationalId || ''}</span>
                    </div>
                    <div className="record-meta">
                      {visit.doctorNotes && <span className="diagnosis-highlight">{visit.doctorNotes}</span>}
                      <span className="text-muted">{format(new Date(visit.visitDate || visit.createdAt), 'MMM dd, HH:mm')}</span>
                      {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </div>
                  {open && (
                    <div className="record-body">
                      <WorkflowProgress status="Registered" />
                      <PhysicianAssessment
                        visit={visit}
                        onDone={handleAssessmentDone}
                        onNavigateClinic={(color) => navigate(`/clinic/${color}`)}
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Reporting queue — scans imaged by the technician, awaiting sign-off */}
      <div className="queue-section">
        <h3 className="queue-title"><PenTool size={20} /> في انتظار التقرير ({scannedRecords.length})</h3>
        <div className="stats-row">
          <div className="mini-stat"><CheckCircle size={20} /><div><span className="mini-stat-value">{completedToday.length}</span><span className="mini-stat-label">تم اعتماده اليوم</span></div></div>
        </div>
        <div className="records-list">
          {scannedRecords.length === 0 ? (
            <div className="empty-state"><FileText size={48} /><p>لا يوجد فحوصات في انتظار المراجعة</p></div>
          ) : (
            scannedRecords.map(record => {
              const patient = record.patient || {};
              const dose = record.fdgDoseMCi || record.ga68DoseMCi || record.isotopeDoseMCi || record.tc99mDoseMCi || '—';
              const impression = record.impression || '';

              return (
                <div key={record.id} className={`record-card ${expandedId === record.id ? 'expanded' : ''}`}>
                  <div className="record-header" onClick={() => toggleExpand(record.id)}>
                    <div className="patient-info">
                      <h3>{patient.name || 'Unknown'}</h3>
                      <span className="text-muted">{patient.nationalId || ''}</span>
                    </div>
                    <div className="record-meta">
                      <span className="type-tag">{record._scanType}</span>
                      <span className="text-muted">{format(new Date(record.createdAt), 'MMM dd, HH:mm')}</span>
                      {expandedId === record.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </div>

                  <div className="scan-summary">
                    <span><strong>الجرعة:</strong> {dose} mCi</span>
                    {impression && <span><strong>الانطباع:</strong> {impression.substring(0, 80)}{impression.length > 80 ? '...' : ''}</span>}
                  </div>

                  {expandedId === record.id && (
                    <div className="record-body">
                      <WorkflowProgress status={record.workflowStatus || 'Scanned'} />
                      <div className="scan-data-preview">
                        <h4>بيانات الفحص</h4>
                        <pre className="data-dump">{JSON.stringify(record, null, 2)}</pre>
                      </div>
                      <form onSubmit={(e) => { e.preventDefault(); handleComplete(record); }} className="report-form">
                        <div className="form-group">
                          <label>ملاحظات الطبيب</label>
                          <textarea name="physicianNotes" value={reportForm.physicianNotes} onChange={handleFormChange} rows="3" className="touch-input" />
                        </div>
                        <div className="form-group">
                          <label>الانطباع التشخيصي</label>
                          <textarea name="impression" value={reportForm.impression} onChange={handleFormChange} rows="3" className="touch-input" />
                        </div>
                        <button type="submit" className="btn-complete" disabled={submittingId === record.id}>
                          <CheckCircle size={18} />
                          {submittingId === record.id ? 'جاري الاعتماد...' : 'اعتماد التقرير'}
                        </button>
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
