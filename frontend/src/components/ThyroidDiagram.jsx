import React, { useState, useCallback, useMemo } from 'react';
import './ThyroidDiagram.css';

const getUptakeColor = (percentage) => {
  if (percentage === null || percentage === undefined || percentage === '') return '#e5e7eb';
  const val = parseFloat(percentage);
  if (isNaN(val)) return '#e5e7eb';
  if (val < 2) return '#1e3a8a';
  if (val < 5) return '#3b82f6';
  if (val <= 25) return '#22c55e';
  if (val <= 40) return '#eab308';
  if (val <= 60) return '#f97316';
  return '#ef4444';
};

const getUptakeLabel = (percentage) => {
  if (percentage === null || percentage === undefined || percentage === '') return 'N/A';
  const val = parseFloat(percentage);
  if (isNaN(val)) return 'N/A';
  return `${val}%`;
};

const ThyroidDiagram = ({ diagramData, onChange, editable = true, width = 400 }) => {
  const [activeRegion, setActiveRegion] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const data = useMemo(() => ({
    rightLobeUptake: diagramData?.rightLobeUptake ?? '',
    leftLobeUptake: diagramData?.leftLobeUptake ?? '',
    totalUptake: diagramData?.totalUptake ?? '',
    rightLobeSize: diagramData?.rightLobeSize ?? '',
    leftLobeSize: diagramData?.leftLobeSize ?? '',
    isthmusSize: diagramData?.isthmusSize ?? '',
    hotNodules: diagramData?.hotNodules ?? '',
    coldNodules: diagramData?.coldNodules ?? '',
    diffuseUptake: diagramData?.diffuseUptake ?? false,
    heterogenousUptake: diagramData?.heterogenousUptake ?? false,
    glandPosition: diagramData?.glandPosition ?? '',
    rightNodules: diagramData?.rightNodules ?? [],
    leftNodules: diagramData?.leftNodules ?? [],
  }), [diagramData]);

  const height = width * 0.7;
  const viewBox = '0 0 400 280';

  const rightColor = getUptakeColor(data.rightLobeUptake);
  const leftColor = getUptakeColor(data.leftLobeUptake);
  const diffuseColor = data.diffuseUptake
    ? getUptakeColor(data.totalUptake || ((parseFloat(data.rightLobeUptake) + parseFloat(data.leftLobeUptake)) / 2))
    : null;

  const handleRegionClick = useCallback((region) => {
    if (!editable) return;
    setActiveRegion(region);
    setShowModal(true);
  }, [editable]);

  const handleNoduleAdd = useCallback((lobe, type) => {
    if (!editable) return;
    const size = prompt(`Enter ${type} nodule size (cm):`);
    if (!size) return;
    const position = prompt(`Enter position (upper/middle/lower):`) || 'middle';
    const nodules = lobe === 'right' ? [...data.rightNodules] : [...data.leftNodules];
    nodules.push({ type, position, size });
    const field = lobe === 'right' ? 'rightNodules' : 'leftNodules';
    onChange(field, nodules);
  }, [editable, data, onChange]);

  const handleNoduleRemove = useCallback((lobe, index) => {
    if (!editable) return;
    const nodules = lobe === 'right' ? [...data.rightNodules] : [...data.leftNodules];
    nodules.splice(index, 1);
    const field = lobe === 'right' ? 'rightNodules' : 'leftNodules';
    onChange(field, nodules);
  }, [editable, data, onChange]);

  const renderNodules = (nodules, lobeX, lobeY) => {
    if (!nodules || nodules.length === 0) return null;
    return nodules.map((n, i) => {
      const color = n.type === 'hot' ? '#ef4444' : '#1e3a8a';
      const x = lobeX + (n.position === 'upper' ? 30 : n.position === 'lower' ? 30 : 50);
      const y = lobeY + (n.position === 'upper' ? 40 : n.position === 'lower' ? 100 : 70);
      return (
        <g key={`${lobeX}-${i}`}>
          <circle
            cx={x}
            cy={y}
            r={8 + parseFloat(n.size) * 2}
            fill={color}
            fillOpacity={0.3}
            stroke={color}
            strokeWidth={2}
            className="nodule-glow"
          />
          <circle cx={x} cy={y} r={4} fill={color} />
          {editable && (
            <text
              x={x}
              y={y - 14}
              textAnchor="middle"
              fontSize="9"
              fill={color}
              fontWeight="600"
              className="nodule-label"
            >
              {n.size}cm
            </text>
          )}
          {editable && (
            <text
              x={x + 12}
              y={y + 3}
              fontSize="10"
              fill="#ef4444"
              cursor="pointer"
              onClick={() => handleNoduleRemove(lobeX < 200 ? 'right' : 'left', i)}
              className="remove-btn"
            >✕</text>
          )}
        </g>
      );
    });
  };

  return (
    <div className="thyroid-diagram-container" style={{ width: width + 40 }}>
      <svg
        viewBox={viewBox}
        width={width}
        height={height}
        className="thyroid-svg"
      >
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <linearGradient id="rightGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={diffuseColor || rightColor} stopOpacity="0.9"/>
            <stop offset="100%" stopColor={diffuseColor || rightColor} stopOpacity="0.7"/>
          </linearGradient>
          <linearGradient id="leftGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={diffuseColor || leftColor} stopOpacity="0.9"/>
            <stop offset="100%" stopColor={diffuseColor || leftColor} stopOpacity="0.7"/>
          </linearGradient>
          <pattern id="heterogeneous" width="10" height="10" patternUnits="userSpaceOnUse">
            <rect width="10" height="10" fill={diffuseColor || rightColor}/>
            <circle cx="5" cy="5" r="2" fill={diffuseColor || rightColor} fillOpacity="0.5"/>
          </pattern>
        </defs>

        {/* Background */}
        <rect width="400" height="280" fill="transparent" />

        {/* Thyroid Gland Shadow */}
        <ellipse cx="200" cy="142" rx="140" ry="70" fill="rgba(0,0,0,0.05)" />

        {/* Right Lobe */}
        <path
          d="M 200,100 C 240,90 290,95 320,110 C 340,120 350,140 345,155 C 340,175 320,185 295,185 C 270,190 245,185 225,180 C 210,170 205,150 200,140 Z"
          fill={data.heterogenousUptake ? 'url(#heterogeneous)' : (diffuseColor || rightColor)}
          stroke={diffuseColor || rightColor}
          strokeWidth="2"
          className={editable ? 'lobe-clickable' : ''}
          onClick={() => handleRegionClick('rightLobe')}
          style={{ cursor: editable ? 'pointer' : 'default' }}
          filter={data.rightLobeUptake > 60 ? 'url(#glow)' : undefined}
        />

        {/* Left Lobe */}
        <path
          d="M 200,100 C 160,90 110,95 80,110 C 60,120 50,140 55,155 C 60,175 80,185 105,185 C 130,190 155,185 175,180 C 190,170 195,150 200,140 Z"
          fill={data.heterogenousUptake ? 'url(#heterogeneous)' : (diffuseColor || leftColor)}
          stroke={diffuseColor || leftColor}
          strokeWidth="2"
          className={editable ? 'lobe-clickable' : ''}
          onClick={() => handleRegionClick('leftLobe')}
          style={{ cursor: editable ? 'pointer' : 'default' }}
          filter={data.leftLobeUptake > 60 ? 'url(#glow)' : undefined}
        />

        {/* Isthmus */}
        <path
          d="M 185,135 C 190,145 210,145 215,135 C 210,150 190,150 185,140 Z"
          fill={diffuseColor || rightColor}
          stroke={diffuseColor || rightColor}
          strokeWidth="1.5"
          className={editable ? 'lobe-clickable' : ''}
          onClick={() => handleRegionClick('isthmus')}
          style={{ cursor: editable ? 'pointer' : 'default' }}
        />

        {/* Right Lobe Label */}
        <text x="280" y="130" textAnchor="middle" className="lobe-label" fontWeight="600">
          Right Lobe
        </text>
        <text x="280" y="148" textAnchor="middle" className="uptake-value">
          {getUptakeLabel(data.rightLobeUptake)}
        </text>
        {data.rightLobeSize && (
          <text x="280" y="165" textAnchor="middle" className="size-label">
            {data.rightLobeSize} cm
          </text>
        )}

        {/* Left Lobe Label */}
        <text x="120" y="130" textAnchor="middle" className="lobe-label" fontWeight="600">
          Left Lobe
        </text>
        <text x="120" y="148" textAnchor="middle" className="uptake-value">
          {getUptakeLabel(data.leftLobeUptake)}
        </text>
        {data.leftLobeSize && (
          <text x="120" y="165" textAnchor="middle" className="size-label">
            {data.leftLobeSize} cm
          </text>
        )}

        {/* Isthmus Label */}
        <text x="200" y="170" textAnchor="middle" className="isthmus-label">
          Isthmus: {data.isthmusSize ? `${data.isthmusSize} cm` : 'N/A'}
        </text>

        {/* Gland Position */}
        {data.glandPosition && (
          <text x="200" y="200" textAnchor="middle" className="position-label">
            Position: {data.glandPosition}
          </text>
        )}

        {/* Total Uptake */}
        {data.totalUptake && (
          <text x="200" y="220" textAnchor="middle" className="total-uptake-label">
            Total Uptake: {data.totalUptake}%
          </text>
        )}

        {/* Nodules */}
        {renderNodules(data.rightNodules, 280, 130)}
        {renderNodules(data.leftNodules, 120, 130)}

        {/* Pattern Indicators */}
        {data.diffuseUptake && (
          <text x="200" y="245" textAnchor="middle" className="pattern-label diffuse">
            ● Diffuse Uptake
          </text>
        )}
        {data.heterogenousUptake && (
          <text x="200" y="260" textAnchor="middle" className="pattern-label heterogenous">
            ● Heterogeneous Pattern
          </text>
        )}

        {/* Interactive nodule add buttons */}
        {editable && (
          <>
            <circle cx="320" cy="160" r="12" fill="#ef4444" fillOpacity="0.2" stroke="#ef4444" strokeWidth="1" className="add-nodule-btn" onClick={() => handleNoduleAdd('right', 'hot')} />
            <text x="320" y="164" textAnchor="middle" fontSize="14" fill="#ef4444" fontWeight="bold" className="add-nodule-btn" onClick={() => handleNoduleAdd('right', 'hot')}>+</text>

            <circle cx="80" cy="160" r="12" fill="#ef4444" fillOpacity="0.2" stroke="#ef4444" strokeWidth="1" className="add-nodule-btn" onClick={() => handleNoduleAdd('left', 'hot')} />
            <text x="80" y="164" textAnchor="middle" fontSize="14" fill="#ef4444" fontWeight="bold" className="add-nodule-btn" onClick={() => handleNoduleAdd('left', 'hot')}>+</text>
          </>
        )}
      </svg>

      {/* Color Scale Legend */}
      <div className="thyroid-legend">
        <div className="legend-title">Uptake Scale</div>
        <div className="legend-items">
          <div className="legend-item"><span className="legend-color" style={{background: '#1e3a8a'}}></span><span>&lt;2%</span></div>
          <div className="legend-item"><span className="legend-color" style={{background: '#3b82f6'}}></span><span>2-5%</span></div>
          <div className="legend-item"><span className="legend-color" style={{background: '#22c55e'}}></span><span>5-25%</span></div>
          <div className="legend-item"><span className="legend-color" style={{background: '#eab308'}}></span><span>25-40%</span></div>
          <div className="legend-item"><span className="legend-color" style={{background: '#f97316'}}></span><span>40-60%</span></div>
          <div className="legend-item"><span className="legend-color" style={{background: '#ef4444'}}></span><span>&gt;60%</span></div>
        </div>
      </div>

      {/* Modal for data entry */}
      {showModal && editable && (
        <div className="thyroid-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="thyroid-modal" onClick={(e) => e.stopPropagation()}>
            <h3>
              {activeRegion === 'rightLobe' && 'Right Lobe Data'}
              {activeRegion === 'leftLobe' && 'Left Lobe Data'}
              {activeRegion === 'isthmus' && 'Isthmus Data'}
            </h3>
            <div className="modal-form">
              {activeRegion === 'rightLobe' && (
                <>
                  <div className="modal-field">
                    <label>Uptake (%)</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      max="100"
                      placeholder="e.g., 22"
                      value={data.rightLobeUptake}
                      onChange={(e) => onChange('rightLobeUptake', e.target.value)}
                    />
                  </div>
                  <div className="modal-field">
                    <label>Size (cm)</label>
                    <input
                      type="text"
                      placeholder="e.g., 4.5 x 2.0"
                      value={data.rightLobeSize}
                      onChange={(e) => onChange('rightLobeSize', e.target.value)}
                    />
                  </div>
                  <div className="modal-field">
                    <label>Add Nodule</label>
                    <div className="nodule-btns">
                      <button type="button" className="btn-nodule hot" onClick={() => handleNoduleAdd('right', 'hot')}>+ Hot</button>
                      <button type="button" className="btn-nodule cold" onClick={() => handleNoduleAdd('right', 'cold')}>+ Cold</button>
                    </div>
                  </div>
                </>
              )}
              {activeRegion === 'leftLobe' && (
                <>
                  <div className="modal-field">
                    <label>Uptake (%)</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      max="100"
                      placeholder="e.g., 18"
                      value={data.leftLobeUptake}
                      onChange={(e) => onChange('leftLobeUptake', e.target.value)}
                    />
                  </div>
                  <div className="modal-field">
                    <label>Size (cm)</label>
                    <input
                      type="text"
                      placeholder="e.g., 4.2 x 1.8"
                      value={data.leftLobeSize}
                      onChange={(e) => onChange('leftLobeSize', e.target.value)}
                    />
                  </div>
                  <div className="modal-field">
                    <label>Add Nodule</label>
                    <div className="nodule-btns">
                      <button type="button" className="btn-nodule hot" onClick={() => handleNoduleAdd('left', 'hot')}>+ Hot</button>
                      <button type="button" className="btn-nodule cold" onClick={() => handleNoduleAdd('left', 'cold')}>+ Cold</button>
                    </div>
                  </div>
                </>
              )}
              {activeRegion === 'isthmus' && (
                <div className="modal-field">
                  <label>Isthmus Size (cm)</label>
                  <input
                    type="text"
                    placeholder="e.g., 0.3"
                    value={data.isthmusSize}
                    onChange={(e) => onChange('isthmusSize', e.target.value)}
                  />
                </div>
              )}
              <div className="modal-field">
                <label>Total Uptake (%)</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  max="100"
                  placeholder="e.g., 40"
                  value={data.totalUptake}
                  onChange={(e) => onChange('totalUptake', e.target.value)}
                />
              </div>
              <div className="modal-checkboxes">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={data.diffuseUptake}
                    onChange={(e) => onChange('diffuseUptake', e.target.checked)}
                  />
                  <span>Diffuse Uptake</span>
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={data.heterogenousUptake}
                    onChange={(e) => onChange('heterogenousUptake', e.target.checked)}
                  />
                  <span>Heterogeneous Uptake</span>
                </label>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThyroidDiagram;
