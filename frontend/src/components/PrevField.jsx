import { useState, useEffect, useMemo } from 'react';
import { History } from 'lucide-react';
import { format } from 'date-fns';
import { getScanHistory } from '../utils/api';
import './PrevField.css';

// Format a previous value for the inline hint.
const fmtPrev = (val) => {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (typeof val === 'object') return null;
  const s = String(val);
  // ISO datetime strings → short date
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) return format(d, 'dd MMM yyyy');
  }
  return s.length > 60 ? s.slice(0, 60) + '…' : s;
};

/**
 * Per-field "what was written last time" hints for the scan sheets.
 *
 * const Prev = usePrevHint('petct', selectedPatient?.id);
 * ...
 * <input ... /><Prev k="surgeryDate" />
 *
 * Renders nothing when the patient has no previous scan of this type or the
 * field was empty on it. Shows: previous value · date · author.
 */
export const usePrevHint = (scanType, patientId) => {
  const [prev, setPrev] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setPrev(null);
    if (!patientId) return undefined;
    getScanHistory(scanType, patientId)
      .then((data) => {
        if (cancelled) return;
        const records = Array.isArray(data) ? data : data?.records || [];
        // Most recent record is the "previous" one for the sheet being filled.
        setPrev(records[0] || null);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [scanType, patientId]);

  return useMemo(() => {
    const meta = prev
      ? {
          date: prev.createdAt ? format(new Date(prev.createdAt), 'dd MMM yyyy') : null,
          author: prev.reporter?.name || prev.performer?.name || null,
        }
      : null;

    const Prev = ({ k }) => {
      if (!prev) return null;
      const value = fmtPrev(prev[k]);
      if (value === null) return null;
      return (
        <span className="prev-field-hint fade-in" title={`Previous ${k}`}>
          <History size={11} />
          <span className="prev-field-value">{value}</span>
          {meta.date && <span className="prev-field-meta">· {meta.date}</span>}
          {meta.author && <span className="prev-field-meta">· {meta.author}</span>}
        </span>
      );
    };
    return Prev;
  }, [prev]);
};

export default usePrevHint;
