import './WorkflowProgress.css';

const STEPS = ['Registered', 'Assessed', 'Prepared', 'Scanned', 'Completed'];
const LABELS = {
  Registered: 'استقبال',
  Assessed: 'تقييم الطبيب',
  Prepared: 'تحضير التمريض',
  Scanned: 'التصوير',
  Completed: 'التقرير',
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
