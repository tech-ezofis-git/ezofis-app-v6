import type { RedactionArea } from './types'

type RedactionOverlayProps = {
  areas: RedactionArea[]
  /** Restrict to one page (PDF). Omit for image overlays. */
  pageIndex?: number
  className?: string
}

/** Tiny pad so anti-aliased ink is covered without eating neighbor labels. */
const padArea = (area: RedactionArea) => {
  const padX = Math.min(0.15, Math.max(0.04, area.width * 0.02))
  const padY = Math.min(0.12, Math.max(0.03, area.height * 0.12))
  const left = Math.max(0, area.left - padX)
  const top = Math.max(0, area.top - padY)
  const right = Math.min(100, area.left + area.width + padX)
  const bottom = Math.min(100, area.top + area.height + padY)
  return {
    height: Math.max(0.35, bottom - top),
    left,
    top,
    width: Math.max(0.35, right - left),
  }
}

/**
 * Absolute overlays covering only matched PII boxes.
 */
const RedactionOverlay = ({
  areas,
  pageIndex,
  className,
}: RedactionOverlayProps) => {
  const visible =
    typeof pageIndex === 'number'
      ? areas.filter((area) => area.pageIndex === pageIndex)
      : areas

  if (!visible.length) return null

  return (
    <div
      aria-hidden='true'
      className={className || 'pointer-events-none absolute inset-0 z-[30]'}
    >
      {visible.map((area, index) => {
        const box = padArea(area)
        const bg = '#ffffff'
        const fontPx = Math.max(8, Math.min(12, (box.height / 100) * 900))
        return (
          <div
            key={`${area.pageIndex}-${area.left.toFixed(2)}-${area.top.toFixed(2)}-${index}`}
            className='absolute flex items-center justify-center overflow-hidden'
            title='Redacted'
            style={{
              backgroundColor: bg,
              color: '#111827',
              fontFamily:
                'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              fontSize: `${fontPx}px`,
              fontWeight: 700,
              height: `${box.height}%`,
              left: `${box.left}%`,
              letterSpacing: '0.02em',
              lineHeight: 1,
              opacity: 1,
              top: `${box.top}%`,
              width: `${box.width}%`,
            }}
          >
            <span className='max-w-full truncate'>{area.maskedLabel}</span>
          </div>
        )
      })}
    </div>
  )
}

export default RedactionOverlay
