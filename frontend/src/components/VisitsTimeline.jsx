import { useState } from 'react';
import { Activity, Stethoscope, FileText, ChevronDown, ChevronUp, Beaker, Camera, Zap } from 'lucide-react';
import { format } from 'date-fns';
import { LabUploadModal, ImagingUploadModal, DoseModal } from './ResourceModals';
import './VisitsTimeline.css';

const VisitsTimeline = ({ visits, scans = [], onVisitUpdated }) => {
  const allEvents = [
    ...(visits || []).map(v => ({ ...v, _type: 'visit', _date: v.visitDate || v.createdAt })),
    ...(scans || []).map(s => ({ ...s, _type: 'scan', _date: s.date || s.createdAt }))
  ].sort((a, b) => new Date(b._date) - new Date(a._date));

  if (allEvents.length === 0) {
    return <div className="timeline-empty">No events recorded yet.</div>;
  }

  return (
    <div className="timeline-container">
      {allEvents.map((event, index) => (
        event._type === 'visit' ? (
          <VisitItem 
            key={`v-${event.id}`} 
            visit={event} 
            isLast={index === allEvents.length - 1} 
            onUpdated={onVisitUpdated} 
          />
        ) : (
          <ScanItem 
            key={`s-${event.id}`} 
            scan={event} 
            isLast={index === allEvents.length - 1} 
          />
        )
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

const TYPE_META = {
  petct:   { label: 'PET/CT',    color: '#8b5cf6' },
  psma:    { label: 'PSMA',      color: '#ec4899' },
  thyroid: { label: 'Thyroid',   color: '#f59e0b' },
  bone:    { label: 'Bone',      color: '#6b7280' },
  renal:   { label: 'Renal',     color: '#3b82f6' },
  gastric: { label: 'Gastric',   color: '#10b981' },
  meckel:  { label: "Meckel's",  color: '#f97316' },
  cardiac: { label: 'Cardiac',   color: '#ef4444' },
};

const ScanItem = ({ scan, isLast }) => {
  const date = scan._date ? new Date(scan._date) : null;
  const meta = TYPE_META[scan.scanType] || { label: scan.scanType, color: '#9ca3af' };
  
  return (
    <div className="timeline-item">
      <div className="timeline-marker">
        <div className="timeline-dot" style={{ backgroundColor: meta.color }}></div>
        {!isLast && <div className="timeline-line"></div>}
      </div>
      
      <div className="timeline-content">
        <div className="visit-summary" style={{ borderLeft: `3px solid ${meta.color}` }}>
          <div className="visit-date-header" style={{ marginBottom: '8px' }}>
            <span className="visit-date">{date ? format(date, 'MMM dd, yyyy - HH:mm') : '—'}</span>
            <span style={{ backgroundColor: `${meta.color}20`, color: meta.color, padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>{meta.label}</span>
          </div>
          <div className="visit-brief">
            {scan.impression ? `Impression: ${scan.impression}` : "No impression recorded yet."}
          </div>
        </div>
      </div>
    </div>
  );
};
