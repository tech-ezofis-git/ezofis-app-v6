import React from 'react'
import { settingsChartPalette } from '../../../helpers/settingsTheme'

type ChartpieProps = {
  value: PieItem[]
}

type PieItem = {
  label: string
  value: number
}

const palette = [...settingsChartPalette]

const Chartpie: React.FC<ChartpieProps> = ({ value }) => {
  const total = value.reduce((sum, item) => sum + item.value, 0)
  let cumulative = 0

  const gradient = value
    .map((item, index) => {
      const start = total ? (cumulative / total) * 100 : 0
      cumulative += item.value
      const end = total ? (cumulative / total) * 100 : 0
      return `${palette[index % palette.length]} ${start}% ${end}%`
    })
    .join(', ')

  return (
    <div className='pie-chart-card'>
      <div
        className='pie-chart'
        style={{ background: `conic-gradient(${gradient})` }}
      />
      <div className='pie-legend'>
        {value.map((item, index) => (
          <div className='pie-legend-row' key={item.label}>
            <span
              className='legend-dot'
              style={{ backgroundColor: palette[index % palette.length] }}
            />
            <span>{item.label}</span>
            <strong>{item.value.toLocaleString()}</strong>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Chartpie
