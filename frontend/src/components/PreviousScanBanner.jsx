import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, ArrowLeftRight, Calendar, X } from 'lucide-react';
import { getScanHistory } from '../utils/api';
import { useTranslation } from '../i18n/index';
import './PreviousScanBanner.css';

const SCAN_TYPE_LABELS = {
  petct: 'PET/CT',
  psma: 'PSMA PET/CT',
  thyroid: 'Thyroid Scan',
  bone: 'Bone Scan',
  renal: 'Renal Scan',
  gastric: 'Gastric Emptying',
  meckel: "Meckel's Scan",
};

const DIFF_COLORS = {
  changed: '#fef3c7',
  new: '#dcfce7',
  removed: '#fee2e2',
};

const ComparisonModal = ({ currentData, previousScan, scanType, onClose }) => {
  const { t, lang } = useTranslation();
  const [expanded, setExpanded] = useState(true);
  const dateLocale = lang === 'ar' ? 'ar-EG' : 'en-GB';

  const renderValue = (key, currentVal, prevVal) => {
    const isDifferent = JSON.stringify(currentVal) !== JSON.stringify(prevVal);
    let bg = 'transparent';
    if (isDifferent && prevVal !== undefined && currentVal !== undefined) bg = DIFF_COLORS.changed;
    else if (isDifferent && prevVal === undefined) bg = DIFF_COLORS.new;
    else if (isDifferent && currentVal === undefined) bg = DIFF_COLORS.removed;

    return (
      <tr key={key} style={{ background: bg }}>
        <td className="comp-label">{formatKey(key)}</td>
        <td className="comp-current">{formatValue(currentVal)}</td>
        <td className="comp-previous">{formatValue(prevVal)}</td>
      </tr>
    );
  };

  const formatKey = (key) => {
    const labels = {
      uptake: 'Uptake / الامتصاص', suvMax: 'SUV Max', suvMean: 'SUV Mean',
      findings: 'Findings / النتائج', impression: 'Impression / الانطباع',
      tnmStage: 'TNM Stage', diagnosis: 'Diagnosis / التشخيص',
      thyroidVolume: 'Thyroid Volume', noduleSize: 'Nodule Size',
      glomerularFiltrationRate: 'GFR', splitFunction: 'Split Function',
      gastricEmptyingTime: 'Emptying Time', retention: 'Retention',
      boneLesions: 'Bone Lesions', psmaUptake: 'PSMA Uptake',
      createdAt: 'Date / التاريخ', notes: 'Notes / ملاحظات',
    };
    return labels[key] || key;
  };

  const formatValue = (val) => {
    if (val === undefined || val === null) return '-';
    if (typeof val === 'boolean') return val ? t('common.yes') : t('common.no');
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  };

  const allKeys = new Set([
    ...Object.keys(currentData || {}),
    ...Object.keys(previousScan?.data || {}),
  ]);

  const excludeKeys = ['_id', '__v', 'patientId', 'createdAt', 'updatedAt'];
  const keys = [...allKeys].filter(k => !excludeKeys.includes(k));

  return (
    <div className="comparison-backdrop" onClick={onClose}>
      <div className="comparison-modal" onClick={(e) => e.stopPropagation()}>
        <div className="comparison-header">
          <h3>
            <ArrowLeftRight size={20} />
            {t('ehist.compare_title')}
          </h3>
          <button className="comparison-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="comparison-scan-info">
          <div className="scan-info-card current">
            <span className="scan-info-label">{t('ehist.current_scan')}</span>
            <span className="scan-info-date">
              <Calendar size={14} />
              {currentData?.createdAt ? new Date(currentData.createdAt).toLocaleDateString(dateLocale) : t('ehist.today')}
            </span>
          </div>
          <div className="scan-info-card previous">
            <span className="scan-info-label">{t('ehist.previous_scan')}</span>
            <span className="scan-info-date">
              <Calendar size={14} />
              {previousScan?.createdAt ? new Date(previousScan.createdAt).toLocaleDateString(dateLocale) : '-'}
            </span>
          </div>
        </div>

        <div className="comparison-legend">
          <span className="legend-item">
            <span className="legend-dot" style={{ background: DIFF_COLORS.changed }} />
            {t('ehist.changed')}
          </span>
          <span className="legend-item">
            <span className="legend-dot" style={{ background: DIFF_COLORS.new }} />
            {t('ehist.new')}
          </span>
          <span className="legend-item">
            <span className="legend-dot" style={{ background: DIFF_COLORS.removed }} />
            {t('ehist.removed')}
          </span>
        </div>

        <div className="comparison-table-wrapper">
          <table className="comparison-table">
            <thead>
              <tr>
                <th>{t('ehist.field')}</th>
                <th>{t('ehist.current')}</th>
                <th>{t('ehist.prev')}</th>
              </tr>
            </thead>
            <tbody>
              {keys.map(key => renderValue(key, currentData?.[key], previousScan?.data?.[key]))}
            </tbody>
          </table>
        </div>

        <div className="comparison-footer">
          <button className="comparison-done-btn" onClick={onClose}>{t('ehist.done')}</button>
        </div>
      </div>
    </div>
  );
};

const KEY_FIELDS = {
  petct:   ['impression', 'suvMax', 'suvMean', 'lesionLocation', 'metastasisSign', 'fdgDoseMCi'],
  psma:    ['impression', 'psmaExpression', 'psaLevel', 'boneMetastasis', 'ga68DoseMCi'],
  thyroid: ['impression', 'totalUptake', 'rightLobeUptake', 'leftLobeUptake', 'tshLevel', 'isotopeDoseMCi'],
  bone:    ['impression', 'skeletalMetastasis', 'metastasisLocations', 'tc99mDoseMCi'],
  renal:   ['impression', 'rightKidneyGFR', 'leftKidneyGFR', 'rightSplitFunction', 'leftSplitFunction'],
  gastric: ['impression', 'halfEmptyingTime', 'retention1h', 'retention2h', 'retention4h'],
  meckel:  ['impression', 'ectopicUptake', 'uptakeLocation'],
};

const ScanCard = ({ scan, label, rank }) => {
  const { t, lang } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const fields = KEY_FIELDS[scan.type || ''] || ['impression'];
  const date = scan.createdAt ? new Date(scan.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB') : '—';

  return (
    <div className={`ehist-card ehist-card--${rank}`}>
      <div className="ehist-card-header" onClick={() => setExpanded(e => !e)}>
        <span className="ehist-rank-badge">{label}</span>
        <span className="ehist-date"><Calendar size={13} /> {date}</span>
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </div>
      {scan.impression && (
        <div className="ehist-impression">{scan.impression}</div>
      )}
      {expanded && (
        <div className="ehist-fields">
          {fields.filter(k => k !== 'impression').map(k => scan[k] != null ? (
            <div key={k} className="ehist-field-row">
              <span className="ehist-field-key">{k}</span>
              <span className="ehist-field-val">
                {typeof scan[k] === 'boolean' ? (scan[k] ? t('common.yes') : t('common.no')) : String(scan[k])}
              </span>
            </div>
          ) : null)}
        </div>
      )}
    </div>
  );
};

const PreviousScanBanner = ({ patientId, scanType, currentScanData = {}, className = '' }) => {
  const { t } = useTranslation();
  const [lastTwo, setLastTwo] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const fetchHistory = useCallback(async () => {
    if (!patientId || !scanType) return;
    setLoading(true);
    try {
      const data = await getScanHistory(scanType, patientId);
      const scans = (data.scans || data || [])
        .sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date))
        .slice(0, 2)
        .map(s => ({ ...s, type: scanType }));
      setLastTwo(scans);
    } catch (err) {
      console.error('Failed to fetch scan history:', err);
    } finally {
      setLoading(false);
    }
  }, [patientId, scanType]);

  useEffect(() => {
    setLastTwo([]);
    setDismissed(false);
    fetchHistory();
  }, [fetchHistory]);

  if (loading) return <div className="ehist-loading">{t('ehist.loading')}</div>;
  if (lastTwo.length === 0 || dismissed) return null;

  const scanLabel = SCAN_TYPE_LABELS[scanType] || scanType;

  return (
    <>
      <div className={`ehist-panel ${className}`}>
        <div className="ehist-header">
          <div className="ehist-title">
            <AlertTriangle size={16} className="ehist-icon" />
            <span>{t('ehist.title', { count: lastTwo.length, scan: scanLabel })}</span>
          </div>
          <div className="ehist-actions">
            {lastTwo.length >= 2 && (
              <button className="ehist-compare-btn" onClick={() => setShowComparison(true)}>
                <ArrowLeftRight size={14} /> {t('ehist.compare')}
              </button>
            )}
            <button className="ehist-dismiss-btn" onClick={() => setDismissed(true)}>
              <X size={14} />
            </button>
          </div>
        </div>
        <div className="ehist-cards">
          {lastTwo.map((scan, i) => (
            <ScanCard key={scan.id || i} scan={scan} rank={i + 1} label={i === 0 ? t('ehist.latest') : t('ehist.previous')} />
          ))}
        </div>
      </div>

      {showComparison && lastTwo[0] && (
        <ComparisonModal
          currentData={currentScanData}
          previousScan={lastTwo[0]}
          scanType={scanType}
          onClose={() => setShowComparison(false)}
        />
      )}
    </>
  );
};

export default PreviousScanBanner;
