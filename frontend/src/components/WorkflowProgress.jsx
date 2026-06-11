import { useTranslation } from '../i18n/index';
import './WorkflowProgress.css';

// Correct clinical order: Doctor → Nurse → Technician → Report
const STEPS = ['Pending_Doctor', 'Pending_Nurse', 'Pending_Technical', 'Pending_Report', 'Completed'];
const LABEL_KEYS = {
  Pending_Doctor: 'workflow.step_doctor',
  Pending_Nurse: 'workflow.step_nurse',
  Pending_Technical: 'workflow.step_technician',
  Pending_Report: 'workflow.step_report',
  Completed: 'workflow.step_completed',
};

const WorkflowProgress = ({ status = 'Pending_Doctor' }) => {
  const { t, isRTL } = useTranslation();
  const currentIndex = STEPS.indexOf(status);
  return (
    <div className="workflow-progress" dir={isRTL ? 'rtl' : 'ltr'}>
      {STEPS.map((step, i) => (
        <div key={step} className={`wf-step ${i <= currentIndex ? 'done' : ''} ${i === currentIndex ? 'active' : ''}`}>
          <span className="wf-dot">{i < currentIndex ? '✓' : i + 1}</span>
          <span className="wf-label">{t(LABEL_KEYS[step])}</span>
        </div>
      ))}
    </div>
  );
};

export default WorkflowProgress;
