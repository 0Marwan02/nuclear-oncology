import './WorkflowProgress.css';

// Correct clinical order: Doctor → Nurse → Technician → Report
const STEPS = ['Pending_Doctor', 'Pending_Nurse', 'Pending_Technical', 'Pending_Report', 'Completed'];
const LABELS = {
  Pending_Doctor: 'الطبيب (بداية)',
  Pending_Nurse:   'تحضير التمريض',
  Pending_Technical: 'التصوير',
  Pending_Report: 'تقرير الطبيب',
  Completed:  'مكتمل',
};

const WorkflowProgress = ({ status = 'Pending_Doctor' }) => {
  const currentIndex = STEPS.indexOf(status);
  return (
    <div className="workflow-progress" dir="rtl">
      {STEPS.map((step, i) => (
        <div key={step} className={`wf-step ${i <= currentIndex ? 'done' : ''} ${i === currentIndex ? 'active' : ''}`}>
          <span className="wf-dot">{i < currentIndex ? '✓' : i + 1}</span>
          <span className="wf-label">{LABELS[step]}</span>
        </div>
      ))}
    </div>
  );
};

export default WorkflowProgress;
