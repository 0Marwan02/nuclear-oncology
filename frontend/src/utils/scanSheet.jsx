import { useState } from 'react';
import { Loader2, FileText } from 'lucide-react';
import { advanceWorkflow, getPatientWorkflow } from './api';

// Read the logged-in user from local storage.
export const getAuthUser = () => {
  try { return JSON.parse(localStorage.getItem('auth_user') || '{}'); } catch { return {}; }
};

/**
 * Role visibility for the scan "sheet".
 * - doctor: sees only the Doctor section, submits to create (→ Pending_Nurse).
 * - admin: sees every section, each with its own "Done for X" button.
 * - nurse / technician: do NOT create here — they process their queue from
 *   their dashboard, so the sheet shows them a notice instead.
 */
export const useScanRole = () => {
  const user = getAuthUser();
  const role = user.role || '';
  const isAdmin = role === 'admin';
  const isDoctor = role === 'doctor';
  return {
    user, role, isAdmin, isDoctor,
    canCreate: isAdmin || isDoctor,
  };
};

/** Local state machine for an admin filling every stage of one scan in the sheet. */
export const useAdminWorkflow = (scanType) => {
  const [scanId, setScanId] = useState(null);
  const [progress, setProgress] = useState({ doctor: false, nurse: false, tech: false, report: false });
  const [advancing, setAdvancing] = useState(false);
  const [error, setError] = useState('');

  // Progress flags implied by a scan already sitting at a given status.
  const PROGRESS_AT_STATUS = {
    Pending_Nurse: { doctor: true, nurse: false, tech: false, report: false },
    Pending_Technical: { doctor: true, nurse: true, tech: false, report: false },
    Pending_Report: { doctor: true, nurse: true, tech: true, report: false },
  };

  // Reset local state; if a patient is given, restore any in-flight scan of
  // this type from the server so a remount can't create a duplicate.
  const reset = async (patientId) => {
    setScanId(null);
    setProgress({ doctor: false, nurse: false, tech: false, report: false });
    setError('');
    if (!patientId) return;
    try {
      const wf = await getPatientWorkflow(patientId);
      const inFlight = (wf?.scans?.[scanType] || []).find((s) => s.workflowStatus !== 'Completed');
      if (inFlight && PROGRESS_AT_STATUS[inFlight.workflowStatus]) {
        setScanId(inFlight.id);
        setProgress(PROGRESS_AT_STATUS[inFlight.workflowStatus]);
      }
    } catch {
      // Restore is best-effort; a failure just leaves the sheet in create mode.
    }
  };
  const onCreated = (id) => {
    setScanId(id);
    setProgress({ doctor: true, nurse: false, tech: false, report: false });
  };
  const advance = async (nextStatus, stage) => {
    if (!scanId || advancing) return;
    setAdvancing(true);
    setError('');
    try {
      await advanceWorkflow(scanType, scanId, { workflowStatus: nextStatus });
      setProgress((p) => ({ ...p, [stage]: true }));
    } catch (e) {
      setError(e.message || 'Failed to advance workflow');
    } finally {
      setAdvancing(false);
    }
  };
  return { scanId, progress, advancing, error, reset, onCreated, advance };
};

/** Footer under the Doctor section: admin's "Done for Doctor" submit, or the doctor's own create button. */
export const DoctorActionFooter = ({ isAdmin, admin, submitting, doctorLabel = 'Save & Send to Nurse' }) => {
  if (isAdmin) {
    return (
      <div className="admin-section-footer">
        {admin.progress.doctor ? (
          <span className="admin-done-badge">✓ Doctor Done</span>
        ) : (
          <button type="submit" className="btn-admin-done btn-admin-doctor" disabled={submitting}>
            {submitting ? <><Loader2 size={16} className="spin" /> Saving…</> : '✓ Done for Doctor'}
          </button>
        )}
      </div>
    );
  }
  return (
    <div className="form-actions">
      <button type="submit" className="btn-primary btn-lg" disabled={submitting}>
        {submitting ? <><Loader2 size={18} className="spin" /> Saving...</> : <><FileText size={18} /> {doctorLabel}</>}
      </button>
    </div>
  );
};

/** Admin "Done for Nurse / Technical" footer between sections. */
export const AdminDoneFooter = ({ stage, label, done, disabled, advancing, onClick }) => (
  <div className="admin-section-footer">
    {done ? (
      <span className="admin-done-badge">✓ {label} Done</span>
    ) : (
      <button type="button" className={`btn-admin-done btn-admin-${stage}`} disabled={disabled || advancing} onClick={onClick}>
        {advancing ? <><Loader2 size={16} className="spin" /> Working…</> : `✓ Done for ${label}`}
      </button>
    )}
  </div>
);

/** Final admin footer in the Results section: Complete & Approve. */
export const AdminReportFooter = ({ admin }) => (
  <div className="form-actions">
    {admin.progress.report ? (
      <span className="admin-done-badge admin-done-badge--lg">✓ Record Completed</span>
    ) : (
      <button
        type="button"
        className="btn-admin-done btn-admin-report btn-lg"
        disabled={!admin.progress.tech || admin.advancing}
        onClick={() => admin.advance('Completed', 'report')}
      >
        {admin.advancing ? <><Loader2 size={18} className="spin" /> Working…</> : '✓ Complete & Approve'}
      </button>
    )}
  </div>
);

/** Shown when a nurse/technician opens the create sheet — they work from their dashboard. */
export const RoleCreateNotice = () => (
  <div className="notification notification-error fade-in">
    <span>This sheet creates new scan requests (doctor / admin only). Process your assigned scans from your dashboard.</span>
  </div>
);
