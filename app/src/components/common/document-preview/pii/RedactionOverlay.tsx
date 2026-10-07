import type { RedactionArea } from './types'

type RedactionOverlayProps = {
  areas: RedactionArea[]
  className?: string
  /** Restrict to one page (PDF). Omit for image overlays. */
  pageIndex?: number
}

/** Pad so trailing glyphs stay covered (tight boxes were leaving last letters). */
const padArea = (area: RedactionArea) => {
  const fillers = (String(area.sourceValue || '').match(/</g) || []).length
  const isMrz = fillers >= 3 || /^P</i.test(String(area.sourceValue || ''))
  const padX = isMrz
    ? 0.35
    : Math.max(0.45, Math.min(1.4, area.width * 0.1 + 0.25))
  const padY = isMrz
    ? 0.15
    : Math.max(0.12, Math.min(0.4, area.height * 0.18))
  const left = Math.max(0, area.left - padX)
  const top = Math.max(0, area.top - padY)
  const right = Math.min(100, area.left + area.width + padX)
  const bottom = Math.min(100, area.top + area.height + padY)
  return {
    height: Math.max(0.45, bottom - top),
    left,
    top,
    width: Math.max(0.45, right - left),
  }
}

/**
 * Absolute overlays covering only matched PII boxes.
 */
const RedactionOverlay = ({
  areas,
  className,
  pageIndex,
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
        return (
          <div
            className='absolute overflow-hidden rounded-[2px] bg-gray-3'
            key={`${area.pageIndex}-${area.left.toFixed(2)}-${area.top.toFixed(2)}-${index}`}
            title='Redacted'
            style={{
              height: `${box.height}%`,
              left: `${box.left}%`,
              top: `${box.top}%`,
              width: `${box.width}%`,
            }}
          />
        )
      })}
    </div>
  )
}

export default RedactionOverlay
