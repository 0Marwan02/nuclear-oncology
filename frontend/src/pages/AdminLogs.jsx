import React, { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';
import { useTranslation } from '../i18n/index';
import { Activity, Clock, X } from 'lucide-react';
import { format } from 'date-fns';
import './Admin.css';

const PAGE_SIZE = 100;

const parseJsonSafe = (str) => {
  if (!str) return null;
  try { return JSON.parse(str); } catch { return str; }
};

const LogDetailModal = ({ log, onClose }) => {
  const newVals = parseJsonSafe(log.newValues);
  const oldVals = parseJsonSafe(log.oldValues);
  const renderObj = (obj) => {
    if (!obj || typeof obj !== 'object') return <span className="mono">{String(obj ?? '—')}</span>;
    return (
      <table className="log-kv-table">
        <tbody>
          {Object.entries(obj).map(([k, v]) => (
            <tr key={k}>
              <td className="log-kv-key">{k}</td>
              <td className="log-kv-val">{v === null ? <em>null</em> : String(v)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card fade-in log-detail-modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>{log.action} — {log.tableName}</h3>
          <button className="btn text" onClick={onClose}><X size={18} /></button>
        </div>
        <p className="text-muted" style={{ margin: '0 0 12px', fontSize: 13 }}>
          {format(new Date(log.timestamp), 'PPpp')} · {log.user?.name || '—'} ({log.user?.role})
        </p>
        {newVals && (
          <div style={{ marginBottom: 16 }}>
            <strong style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>New Values</strong>
            {renderObj(newVals)}
          </div>
        )}
        {oldVals && (
          <div>
            <strong style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>Previous Values</strong>
            {renderObj(oldVals)}
          </div>
        )}
        {!newVals && !oldVals && <p className="text-muted">No details available.</p>}
      </div>
    </div>
  );
};

export default function AdminLogs() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const data = await apiFetch(`/admin/audit-logs?take=${PAGE_SIZE}`);
        setLogs(data);
        setHasMore(data.length === PAGE_SIZE);
      } catch (err) {
        console.error(err);
      }
    };
    fetchLogs();
  }, []);

  const loadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await apiFetch(`/admin/audit-logs?take=${PAGE_SIZE}&skip=${logs.length}`);
      setLogs((prev) => [...prev, ...data]);
      setHasMore(data.length === PAGE_SIZE);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1><Activity size={28} /> {t('admin.logs.title')}</h1>
      </div>

      <div className="table-container fade-in">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{t('admin.logs.timestamp')}</th>
              <th>{t('admin.logs.user')}</th>
              <th>{t('admin.logs.action')}</th>
              <th>{t('admin.logs.table')} / {t('admin.logs.record')}</th>
              <th>{t('common.details')}</th>
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
                  <strong>{log.user?.name || '—'}</strong>
                  <br />
                  {log.user?.role && (
                    <span className={`role-badge ${log.user.role}`}>{t(`admin.users.role_${log.user.role}`) || log.user.role}</span>
                  )}
                </td>
                <td>
                  <span className={`action-badge ${log.action.toLowerCase()}`}>{log.action}</span>
                </td>
                <td>
                  {log.tableName} <br/>
                  <small className="mono">{(log.recordId || '').substring(0,8)}...</small>
                </td>
                <td>
                  {(log.newValues || log.oldValues) ? (
                    <button className="btn small" onClick={() => setSelectedLog(log)}>{t('common.view')}</button>
                  ) : <span className="text-muted">—</span>}
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan="5" className="text-center">{t('admin.logs.no_logs')}</td>
              </tr>
            )}
          </tbody>
        </table>
        {hasMore && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0' }}>
            <button className="btn-secondary" onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? t('common.loading') : t('common.show_more')}
            </button>
          </div>
        )}
      </div>
      {selectedLog && <LogDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />}
    </div>
  );
}
