import './WorkflowProgress.css';

const STEPS = ['Registered', 'Prepared', 'Scanned', 'Completed'];
const LABELS = {
  Registered: 'مسجّل',
  Prepared: 'محضّر',
  Scanned: 'مُصوَّر',
  Completed: 'مكتمل',
};

const WorkflowProgress = ({ status = 'Registered' }) => {
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
