import { useRef, useState } from 'react'
import cn from '@/utils/cn'

interface HoverExpandableTextProps {
  text: string
  className?: string
  /** Expand full text in place (no floating box). Default for multi-line. */
  expandStyle?: 'inline' | 'overlay'
  fallbackText?: string
  /** Clamp to this many lines before ellipsis. Use 1 for single-line truncate. */
  maxLines?: 1 | 2
  normalMaxWidthClass?: string // e.g., 'max-w-[120px]'
}

export default function HoverExpandableText({
  className = '',
  expandStyle = 'overlay',
  fallbackText,
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
  const showExpanded = isHovered && isOverflowing && !isFallback

  const handleMouseEnter = () => {
    const el = measureRef.current
    if (el) {
      setIsOverflowing(
        el.scrollHeight > el.clientHeight + 1 ||
          el.scrollWidth > el.clientWidth + 1,
      )
    }
    setIsHovered(true)
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    setIsOverflowing(false)
  }

  if (expandStyle === 'inline') {
    return (
      <span
        ref={measureRef}
        className={cn(
          'inline-block min-w-0 [overflow-wrap:anywhere] break-words',
          maxLines === 2 ? 'line-clamp-2' : 'truncate',
          showExpanded && 'line-clamp-none whitespace-normal',
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
          className,
        )}
      >
        {displayText}
      </span>
      {showExpanded && (
        <span
          className={cn(
            'absolute top-1/2 left-0 z-30 max-w-[min(480px,70vw)] -translate-y-1/2 break-words whitespace-normal',
            className,
          )}
        >
          {displayText}
        </span>
      )}
    </span>
  )
}
