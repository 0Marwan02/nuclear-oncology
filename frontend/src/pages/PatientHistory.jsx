import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { getClinicHistory, getScanHistory } from '../utils/api';
import HistoryComparison from '../components/HistoryComparison';
import './PatientHistory.css';

const PatientHistory = () => {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('overview');
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSummary();
  }, [id]);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const [clinicData, scanData] = await Promise.all([
        getClinicHistory('both', id),
        getScanHistory('all', id)
      ]);
      const allRecords = [...clinicData, ...scanData].sort((a, b) => new Date(b.date) - new Date(a.date));
      const lastActivity = allRecords.length > 0 ? allRecords[0].date : null;
      setSummary({
        totalClinicRecords: clinicData.length,
        totalScanRecords: scanData.length,
        totalRecords: allRecords.length,
        lastActivity: lastActivity ? format(new Date(lastActivity), 'MMM dd, yyyy') : 'None'
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const OverviewTab = () => {
    if (loading) return <div className="loading-spinner">Loading summary...</div>;
    if (error) return <div className="error-message">{error}</div>;
    if (!summary) return null;

    return (
      <div className="overview-tab">
        <div className="summary-cards">
          <div className="card">
            <h4>Total Clinic Records</h4>
            <p className="card-value">{summary.totalClinicRecords}</p>
          </div>
          <div className="card">
            <h4>Total Scan Records</h4>
            <p className="card-value">{summary.totalScanRecords}</p>
          </div>
          <div className="card">
            <h4>Total Records</h4>
            <p className="card-value">{summary.totalRecords}</p>
          </div>
          <div className="card">
            <h4>Last Activity</h4>
            <p className="card-value">{summary.lastActivity}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="patient-history">
      <h2>Patient History (تاريخ المريض)</h2>
      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`tab ${activeTab === 'clinics' ? 'active' : ''}`}
          onClick={() => setActiveTab('clinics')}
        >
          Clinics
        </button>
        <button 
          className={`tab ${activeTab === 'scans' ? 'active' : ''}`}
          onClick={() => setActiveTab('scans')}
        >
          Scans
        </button>
        <button 
          className={`tab ${activeTab === 'compare' ? 'active' : ''}`}
          onClick={() => setActiveTab('compare')}
        >
          Compare
        </button>
      </div>
      <div className="tab-content">
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'clinics' && <HistoryComparison patientId={id} recordType="clinic" initialView="timeline" />}
        {activeTab === 'scans' && <HistoryComparison patientId={id} recordType="scan" initialView="timeline" />}
        {activeTab === 'compare' && <HistoryComparison patientId={id} recordType="all" initialView="timeline" />}
      </div>
    </div>
  );
};

export default PatientHistory;
