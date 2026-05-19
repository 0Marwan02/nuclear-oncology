import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, ArrowLeftRight, Calendar, X } from 'lucide-react';
import { getScanHistory } from '../utils/api';
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
  const [expanded, setExpanded] = useState(true);

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
    if (typeof val === 'boolean') return val ? 'نعم' : 'لا';
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
            مقارنة الفحص الحالي مع السابق
          </h3>
          <button className="comparison-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="comparison-scan-info">
          <div className="scan-info-card current">
            <span className="scan-info-label">الفحص الحالي</span>
            <span className="scan-info-date">
              <Calendar size={14} />
              {currentData?.createdAt ? new Date(currentData.createdAt).toLocaleDateString('ar-EG') : 'اليوم'}
            </span>
          </div>
          <div className="scan-info-card previous">
            <span className="scan-info-label">الفحص السابق</span>
            <span className="scan-info-date">
              <Calendar size={14} />
              {previousScan?.createdAt ? new Date(previousScan.createdAt).toLocaleDateString('ar-EG') : '-'}
            </span>
          </div>
        </div>

        <div className="comparison-legend">
          <span className="legend-item">
            <span className="legend-dot" style={{ background: DIFF_COLORS.changed }} />
            قيم متغيرة
          </span>
          <span className="legend-item">
            <span className="legend-dot" style={{ background: DIFF_COLORS.new }} />
            قيم جديدة
          </span>
          <span className="legend-item">
            <span className="legend-dot" style={{ background: DIFF_COLORS.removed }} />
            قيم مفقودة
          </span>
        </div>

        <div className="comparison-table-wrapper">
          <table className="comparison-table">
            <thead>
              <tr>
                <th>العنصر</th>
                <th>الحالي</th>
                <th>السابق</th>
              </tr>
            </thead>
            <tbody>
              {keys.map(key => renderValue(key, currentData?.[key], previousScan?.data?.[key]))}
            </tbody>
          </table>
        </div>

        <div className="comparison-footer">
          <button className="comparison-done-btn" onClick={onClose}>تم</button>
        </div>
      </div>
    </div>
  );
};

const PreviousScanBanner = ({ patientId, scanType, currentScanData = {}, className = '' }) => {
  const [previousScans, setPreviousScans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [latestScan, setLatestScan] = useState(null);

  const fetchHistory = useCallback(async () => {
    if (!patientId || !scanType) return;
    setLoading(true);
    try {
      const data = await getScanHistory(scanType, patientId);
      const scans = data.scans || data || [];
      if (scans.length > 0) {
        const mostRecent = scans.sort(
          (a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date)
        )[0];
        setPreviousScans(scans);
        setLatestScan(mostRecent);
        setShowBanner(true);
      }
    } catch (err) {
      console.error('Failed to fetch scan history:', err);
    } finally {
      setLoading(false);
    }
  }, [patientId, scanType]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  if (loading || !showBanner) return null;

  const scanLabel = SCAN_TYPE_LABELS[scanType] || scanType;

  return (
    <>
      <div className={`previous-scan-banner ${className}`}>
        <div className="banner-content">
          <AlertTriangle size={20} className="banner-icon" />
          <div className="banner-text">
            <strong>⚠️ تم العثور على {previousScans.length} فحص سابق لنوع {scanLabel}</strong>
            <span className="banner-date">
              آخر فحص: {latestScan?.createdAt ? new Date(latestScan.createdAt).toLocaleDateString('ar-EG') : '-'}
            </span>
          </div>
          <div className="banner-actions">
            <button
              className="banner-compare-btn"
              onClick={() => setShowComparison(true)}
            >
              <ArrowLeftRight size={16} />
              مقارنة
            </button>
            <button
              className="banner-dismiss-btn"
              onClick={() => setShowBanner(false)}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>

      {showComparison && latestScan && (
        <ComparisonModal
          currentData={currentScanData}
          previousScan={latestScan}
          scanType={scanType}
          onClose={() => setShowComparison(false)}
        />
      )}
    </>
  );
};

export default PreviousScanBanner;
