import { useState } from 'react';
import { Activity, Stethoscope, FileText, ChevronDown, ChevronUp, Beaker, Camera, Zap } from 'lucide-react';
import { format } from 'date-fns';
import { LabUploadModal, ImagingUploadModal, DoseModal } from './ResourceModals';
import './VisitsTimeline.css';

const VisitsTimeline = ({ visits, onVisitUpdated }) => {
  if (!visits || visits.length === 0) {
    return <div className="timeline-empty">No visits recorded yet.</div>;
  }

  return (
    <div className="timeline-container">
      {visits.map((visit, index) => (
        <VisitItem 
          key={visit.id} 
          visit={visit} 
          isLast={index === visits.length - 1} 
          onUpdated={onVisitUpdated} 
        />
      ))}
    </div>
  );
};

const VisitItem = ({ visit, isLast, onUpdated }) => {
  const [expanded, setExpanded] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const rawDate = visit.visitDate || visit.createdAt;
  const date = rawDate ? new Date(rawDate) : null;
  const validDate = date && !isNaN(date.getTime()) ? date : null;
  const caseLabel = visit.caseId ? `Case: ${visit.caseId.substring(0, 8)}...` : (visit.category ? visit.category.replace(/_/g, ' ') : 'Visit');

  const handleSuccess = () => {
    setActiveModal(null);
    if(onUpdated) onUpdated(); // trigger refresh of profile
  };

  return (
    <div className="timeline-item">
      <div className="timeline-marker">
        <div className="timeline-dot"></div>
        {!isLast && <div className="timeline-line"></div>}
      </div>
      
      <div className="timeline-content">
        <div className="visit-summary" onClick={() => setExpanded(!expanded)}>
          <div className="visit-date-header">
            <span className="visit-date">{validDate ? format(validDate, 'MMM dd, yyyy - HH:mm') : '—'}</span>
            <span className="visit-id">{caseLabel}</span>
          </div>
          
          <div className="visit-brief">
            {visit.generalCondition || "No general condition recorded"}
          </div>
          
          <div className="expand-toggle">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>

        {expanded && (
          <div className="visit-details">
            <div className="vitals-grid">
              <div className="vital-box">
                <span className="vital-label">Weight</span>
                <span className="vital-value">{visit.weight ? `${visit.weight} kg` : '--'}</span>
              </div>
              <div className="vital-box">
                <span className="vital-label">Temp</span>
                <span className="vital-value">{visit.temperature ? `${visit.temperature} °C` : '--'}</span>
              </div>
              <div className="vital-box">
                <span className="vital-label">BP</span>
                <span className="vital-value">{visit.bloodPressure || '--'}</span>
              </div>
            </div>

            <div className="notes-section">
              <div className="note-card nurse-note">
                <div className="note-header">
                  <Activity size={16} />
                  <span>Nurse Notes</span>
                </div>
                <p>{visit.nurseNotes || "No notes provided."}</p>
              </div>

              <div className="note-card doctor-note">
                <div className="note-header">
                  <Stethoscope size={16} />
                  <span>Doctor Notes</span>
                </div>
                <p>{visit.doctorNotes || "No notes provided."}</p>
              </div>
            </div>
            
            <div className="attachments-section">
              <div className="attachments-summary">
                <FileText size={16} />
                <span>Includes {visit.labResults?.length || 0} lab results, {visit.imagingResults?.length || 0} imaging results, and {visit.radiationDoses?.length || 0} doses</span>
              </div>
              
              <div className="action-buttons">
                 <button className="btn-secondary btn-sm action-btn" onClick={() => setActiveModal('lab')}>
                   <Beaker size={14} /> Add Lab
                 </button>
                 <button className="btn-secondary btn-sm action-btn" onClick={() => setActiveModal('imaging')}>
                   <Camera size={14} /> Add Scan
                 </button>
                 <button className="btn-secondary btn-sm action-btn" onClick={() => setActiveModal('dose')}>
                   <Zap size={14} /> Log Dose
                 </button>
              </div>
            </div>

            {/* Sub-modals for resources */}
            {activeModal === 'lab' && <LabUploadModal visitId={visit.id} onSuccess={handleSuccess} onCancel={() => setActiveModal(null)} />}
            {activeModal === 'imaging' && <ImagingUploadModal visitId={visit.id} onSuccess={handleSuccess} onCancel={() => setActiveModal(null)} />}
            {activeModal === 'dose' && <DoseModal visitId={visit.id} caseId={visit.caseId} onSuccess={handleSuccess} onCancel={() => setActiveModal(null)} />}

          </div>
        )}
      </div>
    </div>
  );
};

export default VisitsTimeline;
