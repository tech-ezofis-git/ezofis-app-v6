import { useRef, useState } from 'react'
import cn from '@/utils/cn'

interface HoverExpandableTextProps {
  text: string
  className?: string
  /** Expand full text in place (no floating box). Default for multi-line. */
  expandStyle?: 'inline' | 'overlay' | 'stack'
  fallbackText?: string
  /** When true, hover uses brand blue with underline. */
  hoverAccent?: boolean
  /** Clamp to this many lines before ellipsis. Use 1 for single-line truncate. */
  maxLines?: 1 | 2
  normalMaxWidthClass?: string // e.g., 'max-w-[120px]'
}

const isElementOverflowing = (el: HTMLElement | null) => {
  if (!el) return false
  return (
    el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1
  )
}

export default function HoverExpandableText({
  className = '',
  expandStyle = 'overlay',
  fallbackText,
  hoverAccent = false,
  maxLines = 1,
  normalMaxWidthClass = 'max-w-[120px]',
  text,
}: HoverExpandableTextProps) {
  const measureRef = useRef<HTMLSpanElement>(null)
  const [isOverflowing, setIsOverflowing] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  if (!text) {
    return <span className={cn('inline-block', className)}>N/A</span>
  }

  const isFallback = !!(fallbackText && text === fallbackText)
  const displayText = isFallback ? 'N/A' : text
  const accentClass =
    hoverAccent && isHovered ? 'text-primary-9 underline' : undefined

  const measureOverflow = () => {
    const overflowing = isElementOverflowing(measureRef.current)
    setIsOverflowing(overflowing)
    return overflowing
  }

  const handleMouseEnter = () => {
    measureOverflow()
    setIsHovered(true)
    // Re-check on next frame after styles apply (more reliable in flex cards).
    requestAnimationFrame(() => {
      measureOverflow()
    })
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    setIsOverflowing(false)
  }

  // Stack mode: always expand on hover (no overflow gate — that was flaky).
  if (expandStyle === 'stack') {
    const expanded = isHovered && !isFallback
    return (
      <span
        className={cn(
          'flex min-w-0 flex-col items-stretch',
          hoverAccent && 'cursor-pointer',
          normalMaxWidthClass,
        )}
        data-no-drag={hoverAccent ? '' : undefined}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <span
          className={cn(
            'block min-w-0',
            expanded
              ? '[overflow-wrap:anywhere] break-all whitespace-normal'
              : 'truncate',
            accentClass,
            className,
          )}
        >
          {displayText}
        </span>
      </span>
    )
  }

  const showExpanded = isHovered && isOverflowing && !isFallback

  if (expandStyle === 'inline') {
    return (
      <span
        ref={measureRef}
        className={cn(
          'inline-block min-w-0 [overflow-wrap:anywhere] break-words',
          maxLines === 2 ? 'line-clamp-2' : 'truncate',
          showExpanded && 'line-clamp-none whitespace-normal',
          accentClass,
          normalMaxWidthClass,
          className,
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {displayText}
      </span>
    )
  }

  return (
    <span
      className={cn(
        'relative inline-block min-w-0 align-bottom',
        normalMaxWidthClass,
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <span
        ref={measureRef}
        className={cn(
          'block truncate [overflow-wrap:anywhere]',
          showExpanded && 'invisible',
          accentClass,
          className,
        )}
      >
        {displayText}
      </span>
      {showExpanded && (
        <span
          className={cn(
            'absolute top-1/2 left-0 z-30 max-w-[min(480px,70vw)] -translate-y-1/2 break-words whitespace-normal',
            accentClass,
            className,
          )}
        >
          {displayText}
        </span>
      )}
    </span>
  )
}
