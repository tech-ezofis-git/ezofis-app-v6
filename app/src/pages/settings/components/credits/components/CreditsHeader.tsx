import React from 'react'
import { timelineData } from '../sampleCreditData'

type CreditsHeaderProps = {
  selectedMonth: string
}

const CreditsHeader: React.FC<CreditsHeaderProps> = ({ selectedMonth }) => {
  const max = Math.max(...timelineData.map((item) => item.value))
  const points = timelineData
    .map((item, index) => {
      const x = 40 + index * 90
      const y = 190 - (item.value / max) * 140
      return `${x},${y}`
    })
    .join(' ')

  return (
    <div id='chartHeader'>
      <div className='card-header-with-actions compact-header'>
        <div>
          <div className='title'>Control with Readiness Timelines</div>
          <div className='subtitle'>
            Static credit trend for {selectedMonth}
          </div>
        </div>
      </div>

      <div className='line-chart-wrapper'>
        <svg
          aria-label='Credit timeline chart'
          className='line-chart-svg'
          role='img'
          viewBox='0 0 360 220'
        >
          <line className='axis' x1='30' x2='340' y1='195' y2='195' />
          <line className='axis' x1='30' x2='30' y1='30' y2='195' />
          <polyline className='trend-line' points={points} />
          {timelineData.map((item, index) => {
            const x = 40 + index * 90
            const y = 190 - (item.value / max) * 140
            return (
              <g key={item.label}>
                <circle className='trend-point' cx={x} cy={y} r='5' />
                <text
                  className='chart-value-text'
                  textAnchor='middle'
                  x={x}
                  y={y - 12}
                >
                  {item.value}
                </text>
                <text
                  className='chart-label-text'
                  textAnchor='middle'
                  x={x}
                  y='212'
                >
                  {item.label}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

export default CreditsHeader
