import { Icon } from '@iconify/react'
import { useLingui } from '@lingui/react/macro'
import {
  type MouseEvent,
  type ReactNode,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import Tooltip from '@/components/base/Tooltip'
import cn from '@/utils/cn'

/**
 * Wraps a table and shows a "+" just outside its left border at the edges of
 * the hovered row. Clicking inserts an empty row at that boundary. Lives
 * outside the table's scroll container so the button is never clipped.
 */
const RowInsertRail = ({
  children,
  className,
  enabled = true,
  layoutKey = '',
  rowCount,
  onInsert,
}: {
  children: ReactNode
  className?: string
  enabled?: boolean
  /** Changes when rows are reordered, so boundaries are re-measured. */
  layoutKey?: string
  rowCount: number
  onInsert: (index: number) => void
}) => {
  const { t } = useLingui()
  const frameRef = useRef<HTMLDivElement>(null)
  const [boundaries, setBoundaries] = useState<number[]>([])
  const [hoveredRow, setHoveredRow] = useState<number | null>(null)

  // Y offset of each row boundary (top of every row, then bottom of the last).
  useLayoutEffect(() => {
    const frame = frameRef.current
    if (!frame || !enabled) return
    const measure = () => {
      const rows = Array.from(frame.querySelectorAll('tbody > tr'))
      const top = frame.getBoundingClientRect().top
      const next = rows.map((row) => row.getBoundingClientRect().top - top)
      const last = rows[rows.length - 1]
      if (last) next.push(last.getBoundingClientRect().bottom - top)
      setBoundaries((prev) =>
        prev.length === next.length &&
        prev.every((value, i) => Math.abs(value - next[i]) < 0.5)
          ? prev
          : next,
      )
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(frame)
    frame.querySelectorAll('tbody > tr').forEach((row) => observer.observe(row))
    return () => observer.disconnect()
  }, [enabled, layoutKey, rowCount])

  useLayoutEffect(() => {
    if (!enabled) setHoveredRow(null)
  }, [enabled])

  const trackRow = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement
    if (target.closest('[data-row-insert]')) return
    const row = target.closest('tbody > tr')
    if (!row?.parentElement) {
      setHoveredRow(null)
      return
    }
    setHoveredRow(Array.from(row.parentElement.children).indexOf(row))
  }

  return (
    <div
      className={cn('relative', className)}
      ref={frameRef}
      onMouseLeave={() => setHoveredRow(null)}
      onMouseMove={enabled ? trackRow : undefined}
    >
      {children}
      {enabled
        ? boundaries.map((y, index) => {
            const visible =
              hoveredRow !== null &&
              (index === hoveredRow || index === hoveredRow + 1)
            const label =
              index === 0
                ? t`Insert row above`
                : index === boundaries.length - 1
                  ? t`Insert row below`
                  : t`Insert row here`
            return (
              // Measured row offset — the only dynamic position here.
              <div
                key={index}
                style={{ top: y }}
                data-row-insert
                className={cn(
                  'absolute -left-2.5 z-20 -translate-y-1/2 transition-opacity duration-150',
                  visible
                    ? 'opacity-100'
                    : 'pointer-events-none opacity-0 focus-within:pointer-events-auto focus-within:opacity-100',
                )}
                onMouseEnter={() =>
                  setHoveredRow((prev) =>
                    prev === null ? Math.min(index, rowCount - 1) : prev,
                  )
                }
              >
                <Tooltip content={label} position='left'>
                  <button
                    aria-label={label}
                    className='inline-flex size-5 cursor-pointer items-center justify-center rounded-full border border-[var(--primary-6)] bg-surface text-[var(--primary-11)] shadow-sm transition-all hover:scale-110 hover:bg-[var(--primary-2)] active:scale-95'
                    type='button'
                    onClick={() => onInsert(index)}
                  >
                    <Icon className='h-3 w-3' icon='tabler:plus' />
                  </button>
                </Tooltip>
              </div>
            )
          })
        : null}
    </div>
  )
}

export default RowInsertRail
