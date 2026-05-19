import { useState, useEffect } from 'react';
import { getWorkflowAll, advanceWorkflow } from '../utils/api';
import WorkflowProgress from '../components/WorkflowProgress';
import { format as fmtDate } from 'date-fns';
import { ClipboardList, ChevronDown, ChevronUp, Eye, BarChart3, CheckCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import './TechnicianDashboard.css';

const SCAN_TYPES = [
  { value: 'all', label: 'All' },
  { value: 'petct', label: 'PET/CT' },
  { value: 'psma', label: 'PSMA' },
  { value: 'thyroid', label: 'Thyroid' },
  { value: 'bone', label: 'Bone' },
  { value: 'renal', label: 'Renal' },
  { value: 'gastric', label: 'Gastric' },
  { value: 'meckel', label: "Meckel's" },
];

const TechnicianDashboard = () => {
  const [preparedRecords, setPreparedRecords] = useState([]);
  const [scannedToday, setScannedToday] = useState([]);
  const [selectedType, setSelectedType] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [submittingId, setSubmittingId] = useState(null);
  const [scanForm, setScanForm] = useState({ dose: '', injectionTime: '', scanTime: '', notes: '' });
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const fetchPrepared = async () => {
      try {
        const combined = await getWorkflowAll({ status: 'Prepared' });
        combined.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        setPreparedRecords(combined.map((r) => ({ ...r, _scanType: r.scanType })));
      } catch (err) {
        setError(err.message || 'فشل في تحميل البيانات');
      } finally {
        setLoading(false);
      }
    };
    fetchPrepared();
  }, []);

  const filteredRecords = selectedType === 'all' ? preparedRecords : preparedRecords.filter(r => r._scanType === selectedType);

  const handleFormChange = (e) => {
    setScanForm({ ...scanForm, [e.target.name]: e.target.value });
  };

  const handleScanComplete = async (record) => {
    setSubmittingId(record.id);
    setError('');
    setSuccessMsg('');
    try {
      await advanceWorkflow(record._scanType || record.scanType, record.id, {
        workflowStatus: 'Scanned',
        technical: {
          dose: scanForm.dose,
          injectionTime: scanForm.injectionTime || fmtDate(new Date(), "yyyy-MM-dd'T'HH:mm"),
          scanTime: scanForm.scanTime || fmtDate(new Date(), "yyyy-MM-dd'T'HH:mm"),
          notes: scanForm.notes,
        },
      });
      setPreparedRecords(prev => prev.filter(p => p.id !== record.id));
      setScannedToday(prev => [...prev, record]);
      setExpandedId(null);
      setScanForm({ dose: '', injectionTime: '', scanTime: '', notes: '' });
      setSuccessMsg('تم تسجيل الفحص بنجاح');
    } catch (err) {
      setError(err.message || 'فشل في حفظ الفحص');
    } finally {
      setSubmittingId(null);
    }
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
    setScanForm({ dose: '', injectionTime: '', scanTime: '', notes: '' });
  };

  if (loading) return <div className="dashboard-loading"><div className="spinner" /> Loading...</div>;

  return (
    <div className="technician-dashboard fade-in" dir="rtl">
      <div className="page-header">
        <div>
          <h2><ClipboardList size={24} /> لوحة الفني</h2>
          <p className="text-muted">قائمة الفحوصات الجاهزة وتسجيل البيانات التقنية</p>
        </div>
        <div className="status-badge prepared">{filteredRecords.length} جاهز للفحص</div>
      </div>

      {successMsg && <div className="success-banner">{successMsg}</div>}
      {error && <div className="error-banner">{error}</div>}

      <div className="stats-row">
        <div className="mini-stat">
          <BarChart3 size={20} />
          <div><span className="mini-stat-value">{preparedRecords.length}</span><span className="mini-stat-label">في الانتظار</span></div>
        </div>
        <div className="mini-stat">
          <CheckCircle size={20} />
          <div><span className="mini-stat-value">{scannedToday.length}</span><span className="mini-stat-label">تم اليوم</span></div>
        </div>
      </div>

      <div className="filter-bar">
        {SCAN_TYPES.map(type => (
          <button key={type.value} className={`filter-btn ${selectedType === type.value ? 'active' : ''}`} onClick={() => setSelectedType(type.value)}>
            {type.label}
          </button>
        ))}
      </div>

      <div className="records-list">
        {filteredRecords.length === 0 ? (
          <div className="empty-state"><AlertCircle size={48} /><p>لا يوجد فحوصات جاهزة</p></div>
        ) : (
          filteredRecords.map(record => {
            const patient = record.patient || {};
            const diagnosis = record.referralReason || record.diagnosis || record.case?.diagnosis || '';
            const prepWeight = record.weight || record.prepWeight || '—';
            const prepSugar = record.bloodSugar || record.prepBloodSugar || '—';

            return (
              <div key={record.id} className={`record-card ${expandedId === record.id ? 'expanded' : ''}`}>
                <div className="record-header" onClick={() => toggleExpand(record.id)}>
                  <div className="patient-info">
                    <h3>{patient.name || 'Unknown'}</h3>
                    <span className="text-muted">{patient.nationalId || ''}</span>
                  </div>
                  <div className="record-meta">
                    <span className="diagnosis-highlight">{diagnosis || '—'}</span>
                    <span className="type-tag">{record._scanType}</span>
                    <span className="text-muted">{format(new Date(record.createdAt), 'MMM dd, HH:mm')}</span>
                    {expandedId === record.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </div>

                <div className="prep-summary">
                  <span><strong>الوزن:</strong> {prepWeight} كجم</span>
                  <span><strong>السكر:</strong> {prepSugar} mg/dL</span>
                </div>

                {expandedId === record.id && (
                  <div className="record-body">
                    <WorkflowProgress status={record.workflowStatus || 'Prepared'} />
                    <form onSubmit={(e) => { e.preventDefault(); handleScanComplete(record); }} className="scan-form-inline">
                      <div className="form-row-3">
                        <div className="form-group">
                          <label>الجرعة (mCi)</label>
                          <input type="number" inputMode="decimal" name="dose" value={scanForm.dose} onChange={handleFormChange} placeholder="mCi" step="0.1" className="touch-input" />
                        </div>
                        <div className="form-group">
                          <label>وقت الحقن</label>
                          <input type="datetime-local" name="injectionTime" value={scanForm.injectionTime} onChange={handleFormChange} className="touch-input" />
                        </div>
                        <div className="form-group">
                          <label>وقت الفحص</label>
                          <input type="datetime-local" name="scanTime" value={scanForm.scanTime} onChange={handleFormChange} className="touch-input" />
                        </div>
                      </div>
                      <div className="form-group">
                        <label>ملاحظات</label>
                        <textarea name="notes" value={scanForm.notes} onChange={handleFormChange} rows="2" className="touch-input" />
                      </div>
                      <button type="submit" className="btn-scan-complete" disabled={submittingId === record.id}>
                        <Eye size={18} />
                        {submittingId === record.id ? 'جاري الحفظ...' : 'تأكيد الفحص'}
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
  );
};

export default TechnicianDashboard;
