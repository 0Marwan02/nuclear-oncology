import { useState, useCallback, useRef } from 'react';
import { MapPin, Trash2, Plus, X, AlertCircle, CheckCircle, Info } from 'lucide-react';
import './ThyroidDiagramOverlay.css';

const NOTE_TYPES = {
  observation: { label: 'ملاحظة', labelEn: 'Observation', color: '#2196f3', icon: Info },
  concern: { label: 'قلق', labelEn: 'Concern', color: '#e63946', icon: AlertCircle },
  normal: { label: 'طبيعي', labelEn: 'Normal', color: '#16a34a', icon: CheckCircle },
};

const ThyroidSVG = () => (
  <svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg" className="thyroid-svg">
    <defs>
      <linearGradient id="thyroidGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#e8f5e9" />
        <stop offset="100%" stopColor="#c8e6c9" />
      </linearGradient>
    </defs>
    <ellipse cx="200" cy="140" rx="90" ry="70" fill="url(#thyroidGrad)" stroke="#2d6a4f" strokeWidth="2" />
    <ellipse cx="140" cy="140" rx="45" ry="55" fill="url(#thyroidGrad)" stroke="#2d6a4f" strokeWidth="2" />
    <ellipse cx="260" cy="140" rx="45" ry="55" fill="url(#thyroidGrad)" stroke="#2d6a4f" strokeWidth="2" />
    <path d="M 185 140 Q 200 120 215 140" fill="none" stroke="#2d6a4f" strokeWidth="1.5" strokeDasharray="4 2" />
    <text x="200" y="280" textAnchor="middle" fill="#374151" fontSize="12" fontFamily="system-ui">
      Thyroid Gland / الغدة الدرقية
    </text>
  </svg>
);

const PinPopover = ({ x, y, onSave, onCancel, initialData, onDelete }) => {
  const [note, setNote] = useState(initialData?.note || '');
  const [type, setType] = useState(initialData?.type || 'observation');

  const handleSave = () => {
    if (!note.trim()) return;
    onSave({ note: note.trim(), type });
  };

  return (
    <div className="pin-popover" style={{ left: `${x}%`, top: `${y}%` }}>
      <div className="pin-popover-header">
        <span>{initialData ? 'تعديل الملاحظة' : 'إضافة ملاحظة'}</span>
        <button className="pin-popover-close" onClick={onCancel}><X size={14} /></button>
      </div>
      <div className="pin-popover-types">
        {Object.entries(NOTE_TYPES).map(([key, val]) => (
          <button
            key={key}
            className={`type-btn ${type === key ? 'active' : ''}`}
            style={{ '--type-color': val.color }}
            onClick={() => setType(key)}
          >
            <val.icon size={14} />
            {val.label}
          </button>
        ))}
      </div>
      <textarea
        className="pin-popover-textarea"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="اكتب ملاحظتك هنا..."
        rows={3}
        autoFocus
      />
      <div className="pin-popover-actions">
        {initialData && (
          <button className="pin-delete-btn" onClick={onDelete}>
            <Trash2 size={14} /> حذف
          </button>
        )}
        <div className="pin-popover-actions-right">
          <button className="pin-cancel-btn" onClick={onCancel}>إلغاء</button>
          <button className="pin-save-btn" onClick={handleSave} disabled={!note.trim()}>
            حفظ
          </button>
        </div>
      </div>
    </div>
  );
};

const ThyroidDiagramOverlay = ({ diagramData = [], onChange, editable = true, width = '100%' }) => {
  const [pins, setPins] = useState(diagramData);
  const [addMode, setAddMode] = useState(false);
  const [popover, setPopover] = useState(null);
  const [selectedPin, setSelectedPin] = useState(null);
  const imageRef = useRef(null);

  const handleImageClick = useCallback((e) => {
    if (!addMode || !editable) return;
    const rect = imageRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPopover({ x, y, isNew: true });
  }, [addMode, editable]);

  const handlePinClick = useCallback((e, pin, index) => {
    e.stopPropagation();
    if (!editable) {
      setSelectedPin(selectedPin?.index === index ? null : { ...pin, index });
      return;
    }
    setPopover({ ...pin, index, isNew: false, x: pin.x, y: pin.y });
  }, [editable, selectedPin]);

  const savePin = (data) => {
    let updated;
    if (popover.isNew) {
      updated = [...pins, { ...data, x: popover.x, y: popover.y, createdAt: new Date().toISOString() }];
    } else {
      updated = pins.map((p, i) => i === popover.index ? { ...p, ...data } : p);
    }
    setPins(updated);
    onChange?.(updated);
    setPopover(null);
  };

  const deletePin = () => {
    const updated = pins.filter((_, i) => i !== popover.index);
    setPins(updated);
    onChange?.(updated);
    setPopover(null);
  };

  const pinCount = (type) => pins.filter(p => p.type === type).length;

  return (
    <div className="thyroid-diagram-overlay" style={{ width }}>
      <div className="thyroid-diagram-toolbar">
        <div className="toolbar-left">
          <h3 className="thyroid-diagram-title">Thyroid Diagram / رسم الغدة الدرقية</h3>
          <div className="pin-stats">
            <span className="pin-stat observation">{pinCount('observation')} ملاحظة</span>
            <span className="pin-stat concern">{pinCount('concern')} قلق</span>
            <span className="pin-stat normal">{pinCount('normal')} طبيعي</span>
          </div>
        </div>
        {editable && (
          <button
            className={`add-pin-toggle ${addMode ? 'active' : ''}`}
            onClick={() => setAddMode(!addMode)}
          >
            <Plus size={16} />
            {addMode ? 'إلغاء الإضافة' : 'إضافة دبوس'}
          </button>
        )}
      </div>

      {addMode && editable && (
        <div className="add-mode-hint">
          <MapPin size={16} />
          انقر على صورة الغدة لإضافة ملاحظة
        </div>
      )}

      <div className="thyroid-image-container" ref={imageRef} onClick={handleImageClick}>
        <ThyroidSVG />
        {pins.map((pin, index) => (
          <div
            key={index}
            className={`thyroid-pin ${selectedPin?.index === index ? 'selected' : ''}`}
            style={{
              left: `${pin.x}%`,
              top: `${pin.y}%`,
              '--pin-color': NOTE_TYPES[pin.type]?.color || '#2196f3',
            }}
            onClick={(e) => handlePinClick(e, pin, index)}
          >
            <div className="pin-pulse" />
            <div className="pin-dot" />
            {selectedPin?.index === index && (
              <div className="pin-tooltip">
                <strong>{NOTE_TYPES[pin.type]?.label}</strong>
                <p>{pin.note}</p>
                {pin.createdAt && (
                  <small>{new Date(pin.createdAt).toLocaleDateString('ar-EG')}</small>
                )}
              </div>
            )}
          </div>
        ))}
        {popover && (
          <PinPopover
            x={popover.x}
            y={popover.y}
            initialData={popover.isNew ? null : pins[popover.index]}
            onSave={savePin}
            onCancel={() => setPopover(null)}
            onDelete={deletePin}
          />
        )}
      </div>

      {pins.length > 0 && (
        <div className="pins-list">
          <h4>الملاحظات ({pins.length})</h4>
          <div className="pins-list-items">
            {pins.map((pin, index) => {
              const typeInfo = NOTE_TYPES[pin.type] || NOTE_TYPES.observation;
              return (
                <div key={index} className="pin-list-item" onClick={() => setSelectedPin({ ...pin, index })}>
                  <div className="pin-list-color" style={{ background: typeInfo.color }} />
                  <div className="pin-list-content">
                    <span className="pin-list-type">{typeInfo.label}</span>
                    <span className="pin-list-note">{pin.note}</span>
                  </div>
                  {editable && (
                    <button
                      className="pin-list-delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        const updated = pins.filter((_, i) => i !== index);
                        setPins(updated);
                        onChange?.(updated);
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ThyroidDiagramOverlay;
