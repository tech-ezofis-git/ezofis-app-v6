import React from 'react'

interface BarLoaderProps {
  className?: string
  /**
   * Any valid CSS color string.
   * Defaults to your grey token.
   */
  color?: string

  /**
   * Overall loader height in px.
   * Optimized for inline text: default 12px.
   * Recommended range: 10–16px.
   */
  size?: number

  style?: React.CSSProperties
}

const BarLoader: React.FC<BarLoaderProps> = ({
  className = '',
  color = 'var(--gray-9)',
  size = 10, // inline-text default (10–12px sweet spot)
  style,
}) => {
  // Preserve original proportions
  const barW = (13.6 / 32) * size
  const barH = size
  const lift = (8 / 32) * size
  const peakH = (40 / 32) * size
  const centerGap = (19.992 / 32) * size

  const containerW = barW * 3 + centerGap * 2

  return (
    <span
      aria-label='Loading'
      className={`relative inline-flex items-center justify-center align-middle ${className}`}
      role='status'
      style={{
        ...style,
        ['--barloader-color' as any]: color,
        height: barH,
        width: containerW,
      }}
    >
      <style>{`
        @keyframes barloader-pulse {
          0%, 80%, 100% {
            opacity: .75;
            box-shadow: 0 0 var(--barloader-color);
            height: ${barH}px;
          }
          40% {
            opacity: 1;
            box-shadow: 0 -${lift}px var(--barloader-color);
            height: ${peakH}px;
          }
        }
        .barloader-bar {
          width: ${barW}px;
          height: ${barH}px;
          background: var(--barloader-color);
          animation: barloader-pulse .8s infinite ease-in-out;
          border-radius: 1px; /* optional: helps at tiny sizes */
        }
      `}</style>

      <span
        className='flex items-center justify-center'
        style={{ gap: centerGap }}
      >
        <span className='barloader-bar' style={{ animationDelay: '0s' }} />
        <span className='barloader-bar' style={{ animationDelay: '0.16s' }} />
        <span className='barloader-bar' style={{ animationDelay: '0.32s' }} />
      </span>
    </span>
  )
}

export default BarLoader
