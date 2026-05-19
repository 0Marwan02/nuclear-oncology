import React, { useMemo } from 'react';
import './ThyroidDiagramViewer.css';

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

const ThyroidDiagramViewer = ({ diagramData, width = 300 }) => {
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

  const renderNodules = (nodules, lobeX) => {
    if (!nodules || nodules.length === 0) return null;
    return nodules.map((n, i) => {
      const color = n.type === 'hot' ? '#ef4444' : '#1e3a8a';
      const x = lobeX;
      const y = 130 + (i * 25);
      return (
        <g key={`view-${lobeX}-${i}`}>
          <circle
            cx={x}
            cy={y}
            r={6 + parseFloat(n.size || 0.5) * 1.5}
            fill={color}
            fillOpacity={0.25}
            stroke={color}
            strokeWidth={1.5}
          />
          <circle cx={x} cy={y} r={3} fill={color} />
          <text
            x={x + 10}
            y={y + 3}
            fontSize="8"
            fill={color}
            fontWeight="600"
          >
            {n.size}cm
          </text>
        </g>
      );
    });
  };

  return (
    <div className="thyroid-viewer-container" style={{ width: width + 20 }}>
      <svg
        viewBox={viewBox}
        width={width}
        height={height}
        className="thyroid-viewer-svg"
      >
        <defs>
          <linearGradient id="viewRightGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={diffuseColor || rightColor} stopOpacity="0.85"/>
            <stop offset="100%" stopColor={diffuseColor || rightColor} stopOpacity="0.65"/>
          </linearGradient>
          <linearGradient id="viewLeftGrad" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={diffuseColor || leftColor} stopOpacity="0.85"/>
            <stop offset="100%" stopColor={diffuseColor || leftColor} stopOpacity="0.65"/>
          </linearGradient>
        </defs>

        <path
          d="M 200,100 C 240,90 290,95 320,110 C 340,120 350,140 345,155 C 340,175 320,185 295,185 C 270,190 245,185 225,180 C 210,170 205,150 200,140 Z"
          fill={data.heterogenousUptake ? diffuseColor || rightColor : (diffuseColor || rightColor)}
          fillOpacity={data.heterogenousUptake ? 0.6 : 0.85}
          stroke={diffuseColor || rightColor}
          strokeWidth="1.5"
        />

        <path
          d="M 200,100 C 160,90 110,95 80,110 C 60,120 50,140 55,155 C 60,175 80,185 105,185 C 130,190 155,185 175,180 C 190,170 195,150 200,140 Z"
          fill={data.heterogenousUptake ? diffuseColor || leftColor : (diffuseColor || leftColor)}
          fillOpacity={data.heterogenousUptake ? 0.6 : 0.85}
          stroke={diffuseColor || leftColor}
          strokeWidth="1.5"
        />

        <path
          d="M 185,135 C 190,145 210,145 215,135 C 210,150 190,150 185,140 Z"
          fill={diffuseColor || rightColor}
          fillOpacity="0.7"
          stroke={diffuseColor || rightColor}
          strokeWidth="1"
        />

        <text x="280" y="128" textAnchor="middle" className="viewer-lobe-label" fontWeight="600">
          R
        </text>
        <text x="280" y="142" textAnchor="middle" className="viewer-uptake-value">
          {getUptakeLabel(data.rightLobeUptake)}
        </text>

        <text x="120" y="128" textAnchor="middle" className="viewer-lobe-label" fontWeight="600">
          L
        </text>
        <text x="120" y="142" textAnchor="middle" className="viewer-uptake-value">
          {getUptakeLabel(data.leftLobeUptake)}
        </text>

        <text x="200" y="160" textAnchor="middle" className="viewer-isthmus-label">
          I: {data.isthmusSize ? `${data.isthmusSize}cm` : 'N/A'}
        </text>

        {data.totalUptake && (
          <text x="200" y="210" textAnchor="middle" className="viewer-total-label">
            Total: {data.totalUptake}%
          </text>
        )}

        {renderNodules(data.rightNodules, 310)}
        {renderNodules(data.leftNodules, 90)}

        {(data.diffuseUptake || data.heterogenousUptake) && (
          <text x="200" y="230" textAnchor="middle" className="viewer-pattern-label">
            {data.diffuseUptake && <tspan fill="#22c55e">●Diffuse </tspan>}
            {data.heterogenousUptake && <tspan fill="#f97316">●Heterog</tspan>}
          </text>
        )}
      </svg>

      <div className="viewer-summary">
        {data.rightLobeSize && (
          <span className="viewer-tag">R: {data.rightLobeSize}cm</span>
        )}
        {data.leftLobeSize && (
          <span className="viewer-tag">L: {data.leftLobeSize}cm</span>
        )}
        {data.glandPosition && (
          <span className="viewer-tag position">{data.glandPosition}</span>
        )}
      </div>
    </div>
  );
};

export default ThyroidDiagramViewer;
