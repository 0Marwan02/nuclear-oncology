import { useState } from 'react';
import { Undo2, Loader2 } from 'lucide-react';
import { advanceWorkflow } from '../utils/api';
import { useTranslation } from '../i18n/index';
import './ReturnAction.css';

/**
 * "Send back one step" action for queue cards.
 * Physician (Pending_Report) → returns to technician for a re-scan.
 * Technician (Pending_Technical) → returns to nurse.
 * A reason is mandatory; the backend stores it on the record and unlocks it.
 */
const ReturnAction = ({ record, targetStatus, label, onReturned }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const handleReturn = async () => {
    if (!reason.trim()) {
      setError(t('workflow.return_reason_required'));
      return;
    }
    setSending(true);
    setError('');
    try {
      await advanceWorkflow(record._scanType || record.scanType, record.id, {
        workflowStatus: targetStatus,
        returnReason: reason.trim(),
      });
      setOpen(false);
      setReason('');
      onReturned?.(record);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  if (!open) {
    return (
      <button type="button" className="btn-return" onClick={() => setOpen(true)}>
        <Undo2 size={15} /> {label}
      </button>
    );
  }

  return (
    <div className="return-panel fade-in">
      <label className="return-panel-label">{t('workflow.return_reason')}</label>
      <textarea
        className="touch-input"
        rows="2"
        value={reason}
        autoFocus
        onChange={(e) => setReason(e.target.value)}
        placeholder={t('workflow.return_reason_placeholder')}
      />
      {error && <span className="return-panel-error">{error}</span>}
      <div className="return-panel-actions">
        <button type="button" className="btn-return btn-return--confirm" disabled={sending} onClick={handleReturn}>
          {sending ? <Loader2 size={14} className="spin" /> : <Undo2 size={14} />} {label}
        </button>
        <button type="button" className="btn-return btn-return--cancel" disabled={sending} onClick={() => { setOpen(false); setError(''); }}>
          {t('common.cancel')}
        </button>
      </div>
    </div>
  );
};

/** Banner shown on a card that was sent back, with the stored reason. */
export const ReturnReasonBanner = ({ record }) => {
  const { t } = useTranslation();
  if (!record?.returnReason) return null;
  return (
    <div className="return-reason-banner">
      <Undo2 size={14} />
      <span><strong>{t('workflow.returned_note')}:</strong> {record.returnReason}</span>
    </div>
  );
};

export default ReturnAction;
