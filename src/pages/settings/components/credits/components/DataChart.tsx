import React from "react";

type DataChartProps = {
  dataValue: number;
  total: number;
};

const DataChart: React.FC<DataChartProps> = ({ dataValue, total }) => {
  const percentage = total > 0 ? Math.min((dataValue / total) * 100, 100) : 0;

  return (
    <div className="data-chart">
      <div className="data-chart-track">
        <div className="data-chart-fill" style={{ width: `${percentage}%` }} />
      </div>
      <span className="data-chart-value">{dataValue.toLocaleString()}</span>
    </div>
  );
};

export default DataChart;
