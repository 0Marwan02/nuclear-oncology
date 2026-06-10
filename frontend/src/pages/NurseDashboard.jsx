import { useState, useEffect, useCallback } from 'react';
import { getWorkflowAll, advanceWorkflow } from '../utils/api';
import { useQueueSocket } from '../utils/socket';
import { useTranslation } from '../i18n/index';
import WorkflowProgress from '../components/WorkflowProgress';
import { ClipboardList, CheckCircle, ChevronDown, ChevronUp, Activity, User, Clock } from 'lucide-react';
import { format } from 'date-fns';
import './NurseDashboard.css';

const emptyPrep = {
  weight: '', height: '', bloodSugar: '', injectionSite: '', cannulaSize: '', nurseNotes: '', pregnancyStatus: '',
};

const NurseDashboard = () => {
  const { t } = useTranslation();
  const [registeredVisits, setRegisteredVisits] = useState([]);
  const [preparedToday, setPreparedToday] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [submittingId, setSubmittingId] = useState(null);
  const [prepForm, setPrepForm] = useState(emptyPrep);
  const [successMsg, setSuccessMsg] = useState('');

  const fetchRegistered = useCallback(async () => {
    try {
      const records = await getWorkflowAll({ status: 'Pending_Nurse' });
      records.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setRegisteredVisits(records.map((r) => ({ ...r, _scanType: r.scanType })));
    } catch (err) {
      setError(err.message || 'فشل في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRegistered(); }, [fetchRegistered]);
  useQueueSocket(fetchRegistered);

  const handlePrepChange = (e) => {
    setPrepForm({ ...prepForm, [e.target.name]: e.target.value });
  };

  const handlePrepare = async (visit) => {
    setSubmittingId(visit.id);
    setError('');
    setSuccessMsg('');
    try {
      await advanceWorkflow(visit._scanType || visit.scanType, visit.id, {
        workflowStatus: 'Pending_Technical',
        prep: { ...prepForm },
      });
      setRegisteredVisits(prev => prev.filter(v => v.id !== visit.id));
      setPreparedToday(prev => [...prev, visit]);
      setExpandedId(null);
      setPrepForm(emptyPrep);
      setSuccessMsg('تم التحضير — المريض بانتظار الطبيب');
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

  if (loading) return <div className="dashboard-loading"><div className="spinner" /> {t('common.loading')}</div>;

  return (
    <div className="nurse-dashboard fade-in">
      <div className="page-header">
        <div>
          <h2><ClipboardList size={24} /> {t('nurse.title')}</h2>
          <p className="text-muted">{t('nurse.subtitle')}</p>
        </div>
        <div className="status-badge registered">{registeredVisits.length} {t('nurse.waiting')}</div>
      </div>

      {successMsg && <div className="success-banner">{successMsg}</div>}
      {error && <div className="error-banner">{error}</div>}

      <div className="dashboard-grid">
        <div className="main-column">
          <div className="section-card">
            <div className="section-header">
              <h3><Activity size={20} /> {t('nurse.waiting_for_prep')}</h3>
              <span className="count-badge">{registeredVisits.length}</span>
            </div>

            {registeredVisits.length === 0 ? (
              <div className="empty-state">{t('nurse.no_patients')}</div>
            ) : (
              <div className="patient-cards">
                {registeredVisits.map(visit => {
                  const patient = visit.patient || {};
                  return (
                    <div key={visit.id} className={`patient-card ${expandedId === visit.id ? 'expanded' : ''}`}>
                      <div className="card-header" onClick={() => toggleExpand(visit.id)}>
                        <div className="patient-info">
                          <div className="patient-avatar"><User size={18} /></div>
                          <div>
                            <h4>{patient.name || t('common.unknown')}</h4>
                            <span className="text-muted">{patient.nationalId || ''}</span>
                          </div>
                        </div>
                        <div className="card-actions">
                          <span className="type-tag">{visit._scanType || 'scan'}</span>
                          <span className="text-muted">{format(new Date(visit.createdAt || Date.now()), 'HH:mm')}</span>
                          {expandedId === visit.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </div>
                      </div>

                      {expandedId === visit.id && (
                        <div className="card-body">
                          <WorkflowProgress status={visit.workflowStatus || 'Pending_Doctor'} />
                          {visit.doctorNotes && (
                            <div className="referral-notes">
                              <strong>ملاحظات الإحالة:</strong> {visit.doctorNotes}
                            </div>
                          )}
                          <form onSubmit={(e) => { e.preventDefault(); handlePrepare(visit); }} className="prep-form">
                            <div className="form-row-2">
                              <div className="form-group">
                                <label>{t('nurse.weight')}</label>
                                <input type="number" inputMode="decimal" name="weight" value={prepForm.weight} onChange={handlePrepChange} placeholder="kg" step="0.1" min="0" className="touch-input" />
                              </div>
                              <div className="form-group">
                                <label>{t('nurse.height')}</label>
                                <input type="number" inputMode="decimal" name="height" value={prepForm.height} onChange={handlePrepChange} placeholder="cm" min="0" className="touch-input" />
                              </div>
                            </div>
                            <div className="form-row-2">
                              <div className="form-group">
                                <label>{t('nurse.blood_glucose')}</label>
                                <input type="number" inputMode="decimal" name="bloodSugar" value={prepForm.bloodSugar} onChange={handlePrepChange} placeholder="mg/dL" min="0" className="touch-input" />
                              </div>
                              <div className="form-group">
                                <label>{t('nurse.injection_site')}</label>
                                <select name="injectionSite" value={prepForm.injectionSite} onChange={handlePrepChange} className="touch-input">
                                  <option value="">{t('nurse.choose')}</option>
                                  <option value="right_arm">{t('nurse.right_arm')}</option>
                                  <option value="left_arm">{t('nurse.left_arm')}</option>
                                  <option value="hand">{t('nurse.hand')}</option>
                                  <option value="foot">{t('nurse.foot')}</option>
                                </select>
                              </div>
                            </div>
                            <div className="form-row-2">
                              <div className="form-group">
                                <label>{t('nurse.cannula_size')}</label>
                                <input name="cannulaSize" value={prepForm.cannulaSize} onChange={handlePrepChange} placeholder="20G" className="touch-input" />
                              </div>
                              <div className="form-group">
                                <label>{t('nurse.pregnancy_status')}</label>
                                <input name="pregnancyStatus" value={prepForm.pregnancyStatus} onChange={handlePrepChange} className="touch-input" />
                              </div>
                            </div>
                            <div className="form-group">
                              <label>{t('nurse.nurse_notes')}</label>
                              <textarea name="nurseNotes" value={prepForm.nurseNotes} onChange={handlePrepChange} rows="2" className="touch-input" />
                            </div>
                            <button type="submit" className="btn-prepare" disabled={submittingId === visit.id}>
                              <CheckCircle size={18} />
                              {submittingId === visit.id ? t('nurse.preparing') : t('nurse.confirm_prep')}
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
              <h3><CheckCircle size={20} /> {t('nurse.prepared_today')}</h3>
              <div className="prepared-list">
                {preparedToday.map(record => {
                  const patient = record.patient || {};
                  return (
                    <div key={record.id} className="prepared-item">
                      <span className="prepared-name">{patient.name || t('common.unknown')}</span>
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
