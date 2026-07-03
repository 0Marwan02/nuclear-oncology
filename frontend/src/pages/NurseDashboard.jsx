import { useState, useEffect, useCallback } from 'react';
import { getWorkflowAll, advanceWorkflow, getDailyStats } from '../utils/api';
import { useQueueSocket } from '../utils/socket';
import { useTranslation } from '../i18n/index';
import WorkflowProgress from '../components/WorkflowProgress';
import { ClipboardList, CheckCircle, ChevronDown, ChevronUp, Activity, User, Clock } from 'lucide-react';
import { format } from 'date-fns';
import './NurseDashboard.css';

const emptyPrep = {
  weight: '', height: '', bloodSugar: '',
  injectionSiteLimb: '', injectionSiteSide: '', injectionSiteCustom: '',
  nurseNotes: '', pregnancyStatus: '',
};

const NurseDashboard = () => {
  const { t } = useTranslation();
  const [registeredVisits, setRegisteredVisits] = useState([]);
  const [preparedToday, setPreparedToday] = useState([]);
  const [dailyStats, setDailyStats] = useState({ myCasesToday: 0, hospitalCasesToday: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [submittingId, setSubmittingId] = useState(null);
  const [prepForm, setPrepForm] = useState(emptyPrep);
  const [successMsg, setSuccessMsg] = useState('');

  const fetchRegistered = useCallback(async () => {
    try {
      const [records, stats] = await Promise.all([
        getWorkflowAll({ status: 'Pending_Nurse' }),
        getDailyStats()
      ]);
      records.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setRegisteredVisits(records.map((r) => ({ ...r, _scanType: r.scanType })));
      setDailyStats(stats);
    } catch (err) {
      setError(err.message || t('nurse.load_failed'));
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
      const { injectionSiteLimb, injectionSiteSide, injectionSiteCustom, ...restPrep } = prepForm;
      const injectionSite = injectionSiteLimb === 'Other'
        ? (injectionSiteCustom || 'Other')
        : [injectionSiteSide, injectionSiteLimb].filter(Boolean).join(' ');
      await advanceWorkflow(visit._scanType || visit.scanType, visit.id, {
        workflowStatus: 'Pending_Technical',
        prep: { ...restPrep, injectionSite },
      });
      setRegisteredVisits(prev => prev.filter(v => v.id !== visit.id));
      setPreparedToday(prev => [...prev, visit]);
      setDailyStats(prev => ({ 
        myCasesToday: prev.myCasesToday + 1, 
        hospitalCasesToday: prev.hospitalCasesToday + 1 
      }));
      setExpandedId(null);
      setPrepForm(emptyPrep);
      setSuccessMsg(t('nurse.prep_saved'));
    } catch (err) {
      setError(err.message || t('nurse.prep_save_failed'));
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

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ flex: 1, backgroundColor: '#fff', padding: '1rem 1.5rem', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderLeft: '4px solid #7c3aed' }}>
          <h4 style={{ margin: '0 0 0.5rem 0', color: '#6b7280', fontSize: '0.9rem' }}>{t('dashboard.my_cases_today')}</h4>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#111827' }}>{dailyStats.myCasesToday}</div>
        </div>
        <div style={{ flex: 1, backgroundColor: '#fff', padding: '1rem 1.5rem', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderLeft: '4px solid #10b981' }}>
          <h4 style={{ margin: '0 0 0.5rem 0', color: '#6b7280', fontSize: '0.9rem' }}>{t('dashboard.hospital_cases_today')}</h4>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#111827' }}>{dailyStats.hospitalCasesToday}</div>
        </div>
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
              <div className="empty-state">
                <ClipboardList size={44} />
                <p>{t('nurse.no_patients')}</p>
                <span className="empty-state-hint">{t('nurse.empty_hint')}</span>
              </div>
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
                          {visit.returnReason && (
                            <div className="referral-notes">
                              <strong>{t('workflow.returned_note')}:</strong> {visit.returnReason}
                            </div>
                          )}
                          {visit.doctorNotes && (
                            <div className="referral-notes">
                              <strong>{t('nurse.referral_notes')}:</strong> {visit.doctorNotes}
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
                                <label>Body Part</label>
                                <select name="injectionSiteLimb" value={prepForm.injectionSiteLimb} onChange={handlePrepChange} className="touch-input">
                                  <option value="">— Select —</option>
                                  <option value="Hand">Hand</option>
                                  <option value="Wrist">Wrist</option>
                                  <option value="Forearm">Forearm</option>
                                  <option value="Arm">Arm</option>
                                  <option value="Leg">Leg</option>
                                  <option value="Foot">Foot</option>
                                  <option value="Other">Other</option>
                                </select>
                              </div>
                            </div>
                            <div className="form-row-2">
                              <div className="form-group">
                                <label>Side</label>
                                <div className="side-toggle">
                                  {['Right', 'Left'].map(side => (
                                    <button
                                      key={side}
                                      type="button"
                                      className={`side-btn${prepForm.injectionSiteSide === side ? ' active' : ''}`}
                                      onClick={() => setPrepForm(prev => ({ ...prev, injectionSiteSide: side }))}
                                    >{side}</button>
                                  ))}
                                </div>
                              </div>
                              <div className="form-group">
                                <label>{t('nurse.pregnancy_status')}</label>
                                <input name="pregnancyStatus" value={prepForm.pregnancyStatus} onChange={handlePrepChange} className="touch-input" />
                              </div>
                            </div>
                            {prepForm.injectionSiteLimb === 'Other' && (
                              <div className="form-group">
                                <label>Describe (Other)</label>
                                <input type="text" name="injectionSiteCustom" value={prepForm.injectionSiteCustom} onChange={handlePrepChange} className="touch-input" placeholder="e.g. Neck vein" />
                              </div>
                            )}
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
