import React from "react";
import { timelineData } from "../sampleCreditData";

type CreditsHeaderProps = {
  selectedMonth: string;
};

const CreditsHeader: React.FC<CreditsHeaderProps> = ({ selectedMonth }) => {
  const max = Math.max(...timelineData.map((item) => item.value));
  const points = timelineData
    .map((item, index) => {
      const x = 40 + index * 90;
      const y = 190 - (item.value / max) * 140;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div id="chartHeader">
      <div className="card-header-with-actions compact-header">
        <div>
          <div className="title">Control with Readiness Timelines</div>
          <div className="subtitle">Static credit trend for {selectedMonth}</div>
        </div>
      </div>

      <div className="line-chart-wrapper">
        <svg viewBox="0 0 360 220" className="line-chart-svg" role="img" aria-label="Credit timeline chart">
          <line x1="30" y1="195" x2="340" y2="195" className="axis" />
          <line x1="30" y1="30" x2="30" y2="195" className="axis" />
          <polyline points={points} className="trend-line" />
          {timelineData.map((item, index) => {
            const x = 40 + index * 90;
            const y = 190 - (item.value / max) * 140;
            return (
              <g key={item.label}>
                <circle cx={x} cy={y} r="5" className="trend-point" />
                <text x={x} y={y - 12} textAnchor="middle" className="chart-value-text">{item.value}</text>
                <text x={x} y="212" textAnchor="middle" className="chart-label-text">{item.label}</text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

export default CreditsHeader;
