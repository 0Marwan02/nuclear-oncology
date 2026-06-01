import { useState, useEffect, useCallback } from 'react';
import { getWorkflowAll, advanceWorkflow } from '../utils/api';
import { useQueueSocket } from '../utils/socket';
import WorkflowProgress from '../components/WorkflowProgress';
import { ClipboardList, CheckCircle, ChevronDown, ChevronUp, Activity, User, Clock, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import './NurseDashboard.css';

const PET_TYPES = ['petct', 'psma'];
const HIGH_GLUCOSE = 200;

const emptyPrep = {
  weight: '', height: '', bloodSugar: '', injectionSite: '', cannulaSize: '', nurseNotes: '', pregnancyStatus: '',
};

const NurseDashboard = () => {
  const [assessedPatients, setAssessedPatients] = useState([]);
  const [preparedToday, setPreparedToday] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [submittingId, setSubmittingId] = useState(null);
  const [prepForm, setPrepForm] = useState(emptyPrep);
  const [successMsg, setSuccessMsg] = useState('');

  const fetchAssessed = useCallback(async () => {
    try {
      const combined = await getWorkflowAll({ status: 'Assessed' });
      combined.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setAssessedPatients(combined);
    } catch (err) {
      setError(err.message || 'فشل في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAssessed(); }, [fetchAssessed]);
  useQueueSocket(fetchAssessed);

  const handlePrepChange = (e) => {
    setPrepForm({ ...prepForm, [e.target.name]: e.target.value });
  };

  // Mirror the backend gate so the nurse sees the problem before submitting.
  const sugarWarning = (record) => {
    if (!PET_TYPES.includes(record.scanType)) return null;
    const v = prepForm.bloodSugar;
    if (v === '' || v == null) return 'سكر الدم إلزامي لفحوصات PET/CT';
    if (parseFloat(v) > HIGH_GLUCOSE) return `السكر مرتفع (${v}) — لن يُسمح بالانتقال للفني`;
    return null;
  };

  const handlePrepare = async (record) => {
    setSubmittingId(record.id);
    setError('');
    setSuccessMsg('');
    try {
      const mappedType = record.scanType || 'visit';
      await advanceWorkflow(mappedType, record.id, {
        workflowStatus: 'Prepared',
        prep: { ...prepForm },
      });
      setAssessedPatients(prev => prev.filter(p => p.id !== record.id));
      setPreparedToday(prev => [...prev, record]);
      setExpandedId(null);
      setPrepForm(emptyPrep);
      setSuccessMsg('تم التحضير وإرسال المريض للفني');
    } catch (err) {
      setError(err.message || 'فشل في حفظ التحضير');
    } finally {
      setSubmittingId(null);
    }
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
    setPrepForm(emptyPrep);
  };

  if (loading) return <div className="dashboard-loading"><div className="spinner" /> Loading...</div>;

  return (
    <div className="nurse-dashboard fade-in" dir="rtl">
      <div className="page-header">
        <div>
          <h2><ClipboardList size={24} /> محطة التمريض</h2>
          <p className="text-muted">تحضير المرضى وتسجيل العلامات الحيوية</p>
        </div>
        <div className="status-badge registered">{assessedPatients.length} في الانتظار</div>
      </div>

      {successMsg && <div className="success-banner">{successMsg}</div>}

      {error && <div className="error-banner">{error}</div>}

      <div className="dashboard-grid">
        <div className="main-column">
          <div className="section-card">
            <div className="section-header">
              <h3><Activity size={20} /> مرضى في انتظار التحضير</h3>
              <span className="count-badge">{assessedPatients.length}</span>
            </div>

            {assessedPatients.length === 0 ? (
              <div className="empty-state">لا يوجد مرضى في انتظار التحضير</div>
            ) : (
              <div className="patient-cards">
                {assessedPatients.map(record => {
                  const patient = record.patient || {};
                  const typeLabel = record.scanType || record.imagingType || 'Visit';
                  const warn = expandedId === record.id ? sugarWarning(record) : null;

                  return (
                    <div key={record.id} className={`patient-card ${expandedId === record.id ? 'expanded' : ''}`}>
                      <div className="card-header" onClick={() => toggleExpand(record.id)}>
                        <div className="patient-info">
                          <div className="patient-avatar"><User size={18} /></div>
                          <div>
                            <h4>{patient.name || 'Unknown'}</h4>
                            <span className="text-muted">{patient.nationalId || ''}</span>
                          </div>
                        </div>
                        <div className="card-actions">
                          <span className="type-tag">{typeLabel}</span>
                          {expandedId === record.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </div>
                      </div>

                      {expandedId === record.id && (
                        <div className="card-body">
                          <WorkflowProgress status={record.workflowStatus} />
                          {warn && (
                            <div className="sugar-warning">
                              <AlertTriangle size={16} /> {warn}
                            </div>
                          )}
                          <form onSubmit={(e) => { e.preventDefault(); handlePrepare(record); }} className="prep-form">
                            <div className="form-row-2">
                              <div className="form-group">
                                <label>الوزن (كجم)</label>
                                <input type="number" inputMode="decimal" name="weight" value={prepForm.weight} onChange={handlePrepChange} placeholder="kg" step="0.1" min="0" className="touch-input" />
                              </div>
                              <div className="form-group">
                                <label>الطول (سم)</label>
                                <input type="number" inputMode="decimal" name="height" value={prepForm.height} onChange={handlePrepChange} placeholder="cm" min="0" className="touch-input" />
                              </div>
                            </div>
                            <div className="form-row-2">
                              <div className="form-group">
                                <label>
                                  سكر الدم (mg/dL)
                                  {PET_TYPES.includes(record.scanType) && <span className="required-star"> *</span>}
                                </label>
                                <input type="number" inputMode="decimal" name="bloodSugar" value={prepForm.bloodSugar} onChange={handlePrepChange} placeholder="mg/dL" min="0" className="touch-input" />
                              </div>
                              <div className="form-group">
                                <label>مكان الحقن</label>
                                <select name="injectionSite" value={prepForm.injectionSite} onChange={handlePrepChange} className="touch-input">
                                  <option value="">اختر</option>
                                  <option value="right_arm">الذراع الأيمن</option>
                                  <option value="left_arm">الذراع الأيسر</option>
                                  <option value="hand">اليد</option>
                                  <option value="foot">القدم</option>
                                </select>
                              </div>
                            </div>
                            <div className="form-row-2">
                              <div className="form-group">
                                <label>مقاس الكانيولا</label>
                                <input name="cannulaSize" value={prepForm.cannulaSize} onChange={handlePrepChange} placeholder="مثال: 20G" className="touch-input" />
                              </div>
                              <div className="form-group">
                                <label>منع الحمل / تاريخ آخر دورة (LMP)</label>
                                <input name="pregnancyStatus" value={prepForm.pregnancyStatus} onChange={handlePrepChange} placeholder="للإناث — إلزامي قبل الحقن" className="touch-input" />
                              </div>
                            </div>
                            <div className="form-group">
                              <label>ملاحظات التمريض</label>
                              <textarea name="nurseNotes" value={prepForm.nurseNotes} onChange={handlePrepChange} rows="2" className="touch-input" />
                            </div>
                            <button type="submit" className="btn-prepare" disabled={submittingId === record.id}>
                              <CheckCircle size={18} />
                              {submittingId === record.id ? 'جاري الحفظ...' : 'تأكيد التحضير وإرسال للفني'}
                            </button>
                          </form>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {preparedToday.length > 0 && (
          <div className="side-column">
            <div className="section-card">
              <h3><CheckCircle size={20} /> تم التحضير اليوم</h3>
              <div className="prepared-list">
                {preparedToday.map(record => {
                  const patient = record.patient || {};
                  return (
                    <div key={record.id} className="prepared-item">
                      <span className="prepared-name">{patient.name || 'Unknown'}</span>
                      <Clock size={12} />
                      <span className="prepared-time">{format(new Date(), 'HH:mm')}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NurseDashboard;
