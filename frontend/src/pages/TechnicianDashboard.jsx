import { useState, useEffect, useCallback } from 'react';
import { getWorkflowAll, advanceWorkflow } from '../utils/api';
import { useQueueSocket } from '../utils/socket';
import { useTranslation } from '../i18n/index';
import WorkflowProgress from '../components/WorkflowProgress';
import ReturnAction, { ReturnReasonBanner } from '../components/ReturnAction';
import { format as fmtDate } from 'date-fns';
import { ClipboardList, ChevronDown, ChevronUp, Eye, BarChart3, CheckCircle, AlertCircle, FolderOpen } from 'lucide-react';
import { getFileInfo } from '../utils/fileColor';
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
  const { t } = useTranslation();
  const [preparedRecords, setPreparedRecords] = useState([]);
  const [scannedToday, setScannedToday] = useState([]);
  const [selectedType, setSelectedType] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [submittingId, setSubmittingId] = useState(null);
  const [scanForm, setScanForm] = useState({
    dose: '', doseUnit: 'mCi', injectionTime: '', scanTime: '',
    scanMode: 'Static', delayedImages: false, notes: '',
  });
  const [successMsg, setSuccessMsg] = useState('');

  const fetchPrepared = useCallback(async () => {
    try {
      const combined = await getWorkflowAll({ status: 'Pending_Technical' });
      combined.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setPreparedRecords(combined.map((r) => ({ ...r, _scanType: r.scanType })));
    } catch (err) {
      setError(err.message || t('technician.load_failed'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPrepared(); }, [fetchPrepared]);
  useQueueSocket(fetchPrepared);

  const filteredRecords = selectedType === 'all' ? preparedRecords : preparedRecords.filter(r => r._scanType === selectedType);

  const handleFormChange = (e) => {
    setScanForm({ ...scanForm, [e.target.name]: e.target.value });
  };

  const handleScanComplete = async (record) => {
    setSubmittingId(record.id);
    setError('');
    setSuccessMsg('');
    try {
      // Convert MBq → mCi if needed (1 mCi = 37 MBq)
      const doseMCi = scanForm.doseUnit === 'MBq' && scanForm.dose !== ''
        ? (parseFloat(scanForm.dose) / 37).toFixed(3)
        : scanForm.dose;

      await advanceWorkflow(record._scanType || record.scanType, record.id, {
        workflowStatus: 'Pending_Report',
        technical: {
          dose: doseMCi,
          doseUnit: scanForm.doseUnit,
          injectionTime: scanForm.injectionTime || fmtDate(new Date(), "yyyy-MM-dd'T'HH:mm"),
          scanTime: scanForm.scanTime || fmtDate(new Date(), "yyyy-MM-dd'T'HH:mm"),
          scanMode: scanForm.scanMode,
          delayedImages: scanForm.delayedImages,
          notes: scanForm.notes,
        },
      });
      setPreparedRecords(prev => prev.filter(p => p.id !== record.id));
      setScannedToday(prev => [...prev, record]);
      setExpandedId(null);
      setScanForm({ dose: '', doseUnit: 'mCi', injectionTime: '', scanTime: '', scanMode: 'Static', delayedImages: false, notes: '' });
      setSuccessMsg(t('technician.scan_saved'));
    } catch (err) {
      setError(err.message || t('technician.save_failed'));
    } finally {
      setSubmittingId(null);
    }
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
    setScanForm({ dose: '', injectionTime: '', scanTime: '', notes: '' });
  };

  if (loading) return <div className="dashboard-loading"><div className="spinner" /> {t('common.loading')}</div>;

  return (
    <div className="technician-dashboard fade-in">
      <div className="page-header">
        <div>
          <h2><ClipboardList size={24} /> {t('technician.title')}</h2>
          <p className="text-muted">{t('technician.subtitle')}</p>
        </div>
        <div className="status-badge prepared">{filteredRecords.length} {t('technician.ready_count')}</div>
      </div>

      {successMsg && <div className="success-banner">{successMsg}</div>}
      {error && <div className="error-banner">{error}</div>}

      <div className="stats-row">
        <div className="mini-stat">
          <BarChart3 size={20} />
          <div><span className="mini-stat-value">{preparedRecords.length}</span><span className="mini-stat-label">{t('technician.waiting')}</span></div>
        </div>
        <div className="mini-stat">
          <CheckCircle size={20} />
          <div><span className="mini-stat-value">{scannedToday.length}</span><span className="mini-stat-label">{t('technician.done_today')}</span></div>
        </div>
      </div>

      <div className="filter-bar">
        {SCAN_TYPES.map(type => (
          <button key={type.value} className={`filter-btn ${selectedType === type.value ? 'active' : ''}`} onClick={() => setSelectedType(type.value)}>
            {type.value === 'all' ? t('common.all') : type.label}
          </button>
        ))}
      </div>

      <div className="records-list">
        {filteredRecords.length === 0 ? (
          <div className="empty-state">
            <AlertCircle size={48} />
            <p>{t('technician.no_scans')}</p>
            <span className="empty-state-hint">{t('technician.empty_hint')}</span>
          </div>
        ) : (
          filteredRecords.map(record => {
            const patient = record.patient || {};
            const diagnosis = record.referralReason || record.diagnosis || record.case?.diagnosis || '';
            const prepWeight = record.weight || record.prepWeight || '—';
            const prepSugar = record.prepBloodGlucose || record.bloodSugar || record.prepBloodSugar || '—';
            const isFemale = record.patient?.gender === 'Female' || record.patient?.gender === 'أنثى';
            const contraception = record.pregnancyStatus;
            const fileInfo = getFileInfo(record);

            return (
              <div key={record.id} className={`record-card ${expandedId === record.id ? 'expanded' : ''}`}>
                <div className="record-header" onClick={() => toggleExpand(record.id)}>
                  <div className="patient-info">
                    <h3>{patient.name || t('common.unknown')}</h3>
                    <span className="text-muted">{patient.nationalId || ''}</span>
                  </div>
                  <div className="record-meta">
                    <span className="diagnosis-highlight">{diagnosis || '—'}</span>
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

                <div className="prep-summary">
                  <span><strong>{t('technician.weight')}:</strong> {prepWeight} kg</span>
                  <span><strong>{t('technician.blood_glucose')}:</strong> {prepSugar} mg/dL</span>
                  {isFemale && (
                    <span className={contraception ? 'safety-ok' : 'safety-missing'}>
                      <strong>{t('technician.contraception')}:</strong> {contraception || t('technician.not_recorded')}
                    </span>
                  )}
                </div>

                {expandedId === record.id && (
                  <div className="record-body">
                    <WorkflowProgress status={record.workflowStatus || 'Pending_Technical'} />
                    <ReturnReasonBanner record={record} />
                    <form onSubmit={(e) => { e.preventDefault(); handleScanComplete(record); }} className="scan-form-inline">
                      <div className="form-row-3">
                        <div className="form-group">
                          <label>{t('technician.dose')}</label>
                          <div className="dose-input-row">
                            <input
                              type="number" inputMode="decimal" name="dose"
                              value={scanForm.dose} onChange={handleFormChange}
                              placeholder={scanForm.doseUnit === 'MBq' ? 'MBq' : 'mCi'}
                              step="0.01" className="touch-input dose-input"
                            />
                            <select
                              name="doseUnit" value={scanForm.doseUnit} onChange={handleFormChange}
                              className="touch-input unit-select"
                            >
                              <option value="mCi">mCi</option>
                              <option value="MBq">MBq</option>
                            </select>
                          </div>
                          {scanForm.dose && scanForm.doseUnit === 'MBq' && (
                            <span className="unit-hint">≈ {(parseFloat(scanForm.dose) / 37).toFixed(2)} mCi</span>
                          )}
                          {scanForm.dose && scanForm.doseUnit === 'mCi' && (
                            <span className="unit-hint">= {(parseFloat(scanForm.dose) * 37).toFixed(1)} MBq</span>
                          )}
                        </div>
                        <div className="form-group">
                          <label>{t('technician.injection_time')}</label>
                          <input type="datetime-local" name="injectionTime" value={scanForm.injectionTime} onChange={handleFormChange} className="touch-input" />
                        </div>
                        <div className="form-group">
                          <label>{t('technician.scan_time')}</label>
                          <input type="datetime-local" name="scanTime" value={scanForm.scanTime} onChange={handleFormChange} className="touch-input" />
                          {scanForm.injectionTime && scanForm.scanTime && (() => {
                            const mins = Math.round((new Date(scanForm.scanTime) - new Date(scanForm.injectionTime)) / 60000);
                            if (mins > 0) return <span className="unit-hint">{t('technician.uptake_interval')}: {mins} {t('technician.minutes')}</span>;
                            return null;
                          })()}
                        </div>
                      </div>

                      <div className="form-row-2">
                        <div className="form-group">
                          <label>{t('technician.scan_mode')}</label>
                          <select name="scanMode" value={scanForm.scanMode} onChange={handleFormChange} className="touch-input">
                            <option value="Static">{t('technician.scan_mode_static')}</option>
                            <option value="Dynamic">{t('technician.scan_mode_dynamic')}</option>
                            <option value="Whole Body">{t('technician.scan_mode_whole_body')}</option>
                            <option value="SPECT">{t('technician.scan_mode_spect')}</option>
                            <option value="SPECT/CT">{t('technician.scan_mode_spect_ct')}</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label>{t('technician.delayed_images')}</label>
                          <label className="toggle-switch-label">
                            <input
                              type="checkbox" name="delayedImages"
                              checked={scanForm.delayedImages}
                              onChange={e => setScanForm(f => ({ ...f, delayedImages: e.target.checked }))}
                            />
                            <span className="toggle-switch-text">
                              {scanForm.delayedImages ? t('technician.delayed_required') : t('technician.delayed_not_required')}
                            </span>
                          </label>
                        </div>
                      </div>

                      <div className="form-group">
                        <label>{t('technician.technician_notes')}</label>
                        <textarea name="notes" value={scanForm.notes} onChange={handleFormChange} rows="2" className="touch-input" />
                      </div>
                      <div className="scan-form-footer">
                        <button type="submit" className="btn-scan-complete" disabled={submittingId === record.id}>
                          <Eye size={18} />
                          {submittingId === record.id ? t('technician.saving') : t('technician.confirm_scan')}
                        </button>
                        <ReturnAction
                          record={record}
                          targetStatus="Pending_Nurse"
                          label={t('workflow.return_to_nurse')}
                          onReturned={(r) => {
                            setPreparedRecords(prev => prev.filter(p => p.id !== r.id));
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
  );
};

export default TechnicianDashboard;
