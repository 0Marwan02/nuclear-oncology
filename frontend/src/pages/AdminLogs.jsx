import React, { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';
import { Activity, Clock } from 'lucide-react';
import { format } from 'date-fns';
import './Admin.css';

export default function AdminLogs() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const data = await apiFetch('/admin/audit-logs');
        setLogs(data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchLogs();
  }, []);

  
  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1><Activity size={28} /> System Audit Logs</h1>
      </div>

      <div className="table-container fade-in">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>User</th>
              <th>Action</th>
              <th>Table / Record</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr key={log.id}>
                <td className="log-time">
                  <Clock size={14} className="icon-inline"/> 
                  {format(new Date(log.timestamp), 'PP pp')}
                </td>
                <td>
                  <strong>{log.user.name}</strong>
                  <br />
                  <span className={`role-badge ${log.user.role}`}>{log.user.role}</span>
                </td>
                <td>
                  <span className={`action-badge ${log.action.toLowerCase()}`}>{log.action}</span>
                </td>
                <td>
                  {log.tableName} <br/>
                  <small className="mono">{log.recordId.substring(0,8)}...</small>
                </td>
                <td>
                  <details className="log-details">
                    <summary>View Data</summary>
                    <pre>{log.newValues}</pre>
                  </details>
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan="5" className="text-center">No logs found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
