import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceArea } from 'recharts';
import { Calendar, FileText, Scan, BarChart2, Plus, CheckCircle, X, ArrowUp, ArrowDown, ArrowRight } from 'lucide-react';
import { getScanHistory, apiFetch } from '../utils/api';
import './HistoryComparison.css';

const HistoryComparison = ({ patientId: initialPatientId, recordType: initialRecordType = 'all', initialView = 'timeline' }) => {
  const [selectedPatientId, setSelectedPatientId] = useState(initialPatientId || '');
  const [patientSearch, setPatientSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [activeTab, setActiveTab] = useState(initialRecordType);
  const [subTab, setSubTab] = useState('both');
  const [viewMode, setViewMode] = useState(initialView);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedRecordId, setExpandedRecordId] = useState(null);
  const [selectedForCompare, setSelectedForCompare] = useState([]);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const scanTypes = ['petct', 'psma', 'thyroid', 'bone', 'renal', 'gastric'];

  useEffect(() => {
    if (initialPatientId) {
      loadPatient(initialPatientId);
    }
  }, [initialPatientId]);

  useEffect(() => {
    if (selectedPatientId) {
      loadRecords();
    }
  }, [selectedPatientId, activeTab, subTab]);

  const searchPatients = async () => {
    if (!patientSearch.trim()) return;
    try {
      setLoading(true);
      const results = await apiFetch(`/patients/search?q=${encodeURIComponent(patientSearch)}`);
      setSearchResults(results);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadPatient = async (id) => {
    try {
      setLoading(true);
      const patient = await apiFetch(`/patients/${id}`);
      setSelectedPatient(patient);
      setSelectedPatientId(id);
      setSearchResults([]);
      setPatientSearch('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadRecords = async () => {
    try {
      setLoading(true);
      setError('');
      const type = activeTab === 'all' ? 'all' : subTab || activeTab;
      const scanData = await getScanHistory(type, selectedPatientId);
      const records = (Array.isArray(scanData) ? scanData : (scanData.records || []))
        .map(r => ({ ...r, recordType: 'scan', scanType: r.type || r.scanType }));
      setRecords(records.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt)));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleCompareSelection = (record) => {
    if (selectedForCompare.find(r => r.id === record.id)) {
      setSelectedForCompare(selectedForCompare.filter(r => r.id !== record.id));
    } else {
      if (selectedForCompare.length < 2) {
        setSelectedForCompare([...selectedForCompare, record]);
      } else {
        setSelectedForCompare([selectedForCompare[1], record]);
      }
    }
  };

  const openCompareModal = () => {
    if (selectedForCompare.length === 2) {
      setShowCompareModal(true);
    }
  };

  const closeCompareModal = () => {
    setShowCompareModal(false);
  };

  const getRecordColor = (record) => {
    {
      const scanColors = {
        'petct': 'var(--purple)',
        'psma': 'var(--info)',
        'thyroid': 'var(--warning)',
        'bone': 'var(--gray-500)',
        'renal': 'var(--blue)',
        'gastric': 'var(--orange)'
      };
      return scanColors[record.scanType] || 'var(--gray-400)';
    }
  };

  const getRecordBadge = (record) => {
    const scanLabels = {
      'petct': 'PET/CT', 'psma': 'PSMA', 'thyroid': 'Thyroid',
      'bone': 'Bone', 'renal': 'Renal', 'gastric': 'Gastric', 'meckel': "Meckel's"
    };
    return scanLabels[record.scanType] || record.scanType || '—';
  };

  const getKeyMetrics = (record) => {
    return [
      { label: 'SUV Max', value: record.suvMax },
      { label: 'Impression', value: record.impression?.substring(0, 60) }
    ].filter(m => m.value != null);
  };

  const chartData = useMemo(() => {
    if (viewMode !== 'chart' || records.length === 0) return [];
    return records.map(r => {
      const point = { date: format(new Date(r.date), 'yyyy-MM-dd') };
      getKeyMetrics(r).forEach(m => {
        point[`${r.id}_${m.label}`] = m.value;
      });
      return point;
    });
  }, [records, viewMode]);

  const referenceRanges = {
    'Thyroglobulin': { min: 0, max: 55 },
    'TSH': { min: 0.5, max: 5.0 },
    'FT3': { min: 2.3, max: 4.2 },
    'FT4': { min: 0.9, max: 1.7 },
    'Anti-TPO': { min: 0, max: 35 }
  };

  const renderTimeline = () => (
    <div className="timeline-container">
      {records.map(record => (
        <div 
          key={record.id} 
          className={`timeline-item ${expandedRecordId === record.id ? 'expanded' : ''}`}
          style={{ borderLeftColor: getRecordColor(record) }}
        >
          <div className="timeline-header">
            <div className="timeline-date">
              <Calendar size={16} />
              <span>{format(new Date(record.date), 'MMM dd, yyyy')}</span>
            </div>
            <div className="timeline-badges">
              <span className="badge" style={{ backgroundColor: getRecordColor(record) }}>
                {getRecordBadge(record)}
              </span>
              <button 
                className={`compare-btn ${selectedForCompare.find(r => r.id === record.id) ? 'selected' : ''}`}
                onClick={() => toggleCompareSelection(record)}
              >
                {selectedForCompare.find(r => r.id === record.id) ? <CheckCircle size={16} /> : <Plus size={16} />}
              </button>
            </div>
          </div>
          <div className="timeline-metrics">
            {getKeyMetrics(record).map(metric => (
              <div key={metric.label} className="metric-item">
                <span className="metric-label">{metric.label}</span>
                <span className="metric-value">{metric.value}</span>
              </div>
            ))}
          </div>
          <button 
            className="expand-btn"
            onClick={() => setExpandedRecordId(expandedRecordId === record.id ? null : record.id)}
          >
            {expandedRecordId === record.id ? 'Show Less' : 'Show More'}
          </button>
          {expandedRecordId === record.id && (
            <div className="timeline-details">
              <pre>{JSON.stringify(record, null, 2)}</pre>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const renderChart = () => {
    if (records.length === 0) return <div className="no-data">No data to display</div>;
    const allMetrics = new Set();
    records.forEach(r => {
      getKeyMetrics(r).forEach(m => allMetrics.add(m.label));
    });
    const metricsArray = Array.from(allMetrics);
    const lineColors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00c853', '#d81b60'];
    return (
      <div className="chart-container">
        <LineChart
          width={800}
          height={400}
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          {metricsArray.map((metric, index) => (
            <Line
              key={metric}
              type="monotone"
              dataKey={metric}
              stroke={lineColors[index % lineColors.length]}
              activeDot={{ r: 8 }}
            />
          ))}
          {metricsArray.map(metric => {
            const range = referenceRanges[metric];
            if (range) {
              return (
                <ReferenceArea
                  key={`ref-${metric}`}
                  y1={range.min}
                  y2={range.max}
                  strokeOpacity={0.3}
                  fill={lineColors[metricsArray.indexOf(metric) % lineColors.length]}
                  fillOpacity={0.1}
                />
              );
            }
            return null;
          })}
        </LineChart>
      </div>
    );
  };

  const renderCompareModal = () => {
    if (!showCompareModal || selectedForCompare.length !== 2) return null;
    const [record1, record2] = selectedForCompare;
    const allKeys = new Set([...Object.keys(record1), ...Object.keys(record2)]);
    const excludeKeys = ['id', 'patientId', 'date', 'recordType', 'clinicType', 'scanType'];
    const compareKeys = Array.from(allKeys).filter(k => !excludeKeys.includes(k));
    return (
      <div className="modal-overlay">
        <div className="compare-modal">
          <div className="modal-header">
            <h3>Compare Records</h3>
            <button className="close-btn" onClick={closeCompareModal}><X size={20} /></button>
          </div>
          <div className="modal-body">
            <div className="compare-column">
              <h4>{format(new Date(record1.date), 'MMM dd, yyyy')} - {getRecordBadge(record1)}</h4>
              {compareKeys.map(key => {
                const val1 = record1[key];
                const val2 = record2[key];
                const hasChanged = val1 !== val2;
                return (
                  <div key={key} className={`compare-row ${hasChanged ? 'changed' : ''}`}>
                    <span className="compare-label">{key}</span>
                    <span className="compare-value">
                      {val1 != null ? val1.toString() : '-'}
                      {hasChanged && val2 != null && (
                        <span className="delta">
                          {val1 > val2 ? <ArrowUp size={14} className="text-danger" /> : val1 < val2 ? <ArrowDown size={14} className="text-success" /> : <ArrowRight size={14} className="text-muted" />}
                        </span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="compare-column">
              <h4>{format(new Date(record2.date), 'MMM dd, yyyy')} - {getRecordBadge(record2)}</h4>
              {compareKeys.map(key => {
                const val1 = record1[key];
                const val2 = record2[key];
                const hasChanged = val1 !== val2;
                return (
                  <div key={key} className={`compare-row ${hasChanged ? 'changed' : ''}`}>
                    <span className="compare-label">{key}</span>
                    <span className="compare-value">
                      {val2 != null ? val2.toString() : '-'}
                      {hasChanged && val1 != null && (
                        <span className="delta">
                          {val2 > val1 ? <ArrowUp size={14} className="text-danger" /> : val2 < val1 ? <ArrowDown size={14} className="text-success" /> : <ArrowRight size={14} className="text-muted" />}
                        </span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="history-comparison">
      {!initialPatientId && (
        <div className="patient-selector">
          <h3>Select Patient</h3>
          <div className="search-group">
            <input
              type="text"
              placeholder="Search by name or national ID..."
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchPatients()}
            />
            <button className="btn-primary" onClick={searchPatients}>Search</button>
          </div>
          {searchResults.length > 0 && (
            <div className="search-results">
              {searchResults.map(p => (
                <div key={p.id} className="search-result-item" onClick={() => loadPatient(p.id)}>
                  <span>{p.name}</span>
                  <span className="tag tag-blue">ID: {p.nationalId}</span>
                </div>
              ))}
            </div>
          )}
          {selectedPatient && (
            <div className="selected-patient">
              <span>Selected: {selectedPatient.name} (ID: {selectedPatient.nationalId})</span>
            </div>
          )}
        </div>
      )}

      <div className="tabs">
        <button className={`tab ${activeTab === 'scan' ? 'active' : ''}`} onClick={() => setActiveTab('scan')}>
          <Scan size={16} /> Scans (أشعة)
        </button>
        <button className={`tab ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>All (الكل)</button>
      </div>

      {(activeTab === 'scan' || activeTab === 'all') && (
        <div className="sub-tabs">
          <button className={`sub-tab ${subTab === 'all' ? 'active' : ''}`} onClick={() => setSubTab('all')}>All (الكل)</button>
          {scanTypes.map(type => (
            <button 
              key={type} 
              className={`sub-tab ${subTab === type ? 'active' : ''}`}
              onClick={() => setSubTab(type)}
            >
              {type.toUpperCase()}
            </button>
          ))}
        </div>
      )}

      <div className="view-toggle">
        <button 
          className={`toggle-btn ${viewMode === 'timeline' ? 'active' : ''}`}
          onClick={() => setViewMode('timeline')}
        >
          Timeline
        </button>
        <button 
          className={`toggle-btn ${viewMode === 'chart' ? 'active' : ''}`}
          onClick={() => setViewMode('chart')}
        >
          <BarChart2 size={16} /> Chart
        </button>
        {selectedForCompare.length === 2 && (
          <button className="btn-primary compare-action" onClick={openCompareModal}>
            Compare Selected
          </button>
        )}
      </div>

      {loading && <div className="loading-spinner">Loading...</div>}
      {error && <div className="error-message">{error}</div>}

      {!loading && !error && (
        <>
          {records.length === 0 ? (
            <div className="no-records">No records found for selected criteria</div>
          ) : (
            <>
              {viewMode === 'timeline' ? renderTimeline() : renderChart()}
            </>
          )}
        </>
      )}

      {renderCompareModal()}
    </div>
  );
};

export default HistoryComparison;
