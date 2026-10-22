import { type ReactNode, useLayoutEffect, useRef, useState } from 'react'
import cn from '@/utils/cn'

/**
 * Horizontal scroll container whose scrollbar stays pinned to the bottom of
 * the visible panel. Long tables otherwise put the scrollbar below every row,
 * out of reach while reading the top of the table.
 */
const StickyScrollX = ({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) => {
  const contentRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const [scrollWidth, setScrollWidth] = useState(0)
  const [overflowing, setOverflowing] = useState(false)

  useLayoutEffect(() => {
    const content = contentRef.current
    if (!content) return
    const measure = () => {
      setScrollWidth(content.scrollWidth)
      setOverflowing(content.scrollWidth > content.clientWidth + 1)
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(content)
    if (content.firstElementChild) observer.observe(content.firstElementChild)
    return () => observer.disconnect()
  }, [])

  // Keep the table and the pinned bar at the same horizontal offset; the
  // echoed scroll event finds them equal and stops.
  const sync = (from: HTMLDivElement | null, to: HTMLDivElement | null) => {
    if (!from || !to || to.scrollLeft === from.scrollLeft) return
    to.scrollLeft = from.scrollLeft
  }

  return (
    <>
      <div
        ref={contentRef}
        className={cn(
          'overflow-x-auto',
          // The pinned bar below replaces the native one while overflowing.
          overflowing && '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          className,
        )}
        onScroll={() => sync(contentRef.current, barRef.current)}
      >
        {children}
      </div>
      {overflowing ? (
        <div
          className='sticky bottom-0 z-20 overflow-x-auto overflow-y-hidden rounded-b-lg bg-surface/90 backdrop-blur-sm'
          ref={barRef}
          aria-hidden
          onScroll={() => sync(barRef.current, contentRef.current)}
        >
          {/* Measured content width drives the bar's scroll range. */}
          <div className='h-px' style={{ width: scrollWidth }} />
        </div>
      ) : null}
    </>
  )
}

export default StickyScrollX
