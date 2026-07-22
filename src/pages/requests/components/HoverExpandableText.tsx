import { useRef, useState } from 'react'
import Tooltip from '@/components/base/Tooltip'
import cn from '@/utils/cn'

interface HoverExpandableTextProps {
  text: string
  className?: string
  fallbackText?: string
  normalMaxWidthClass?: string // e.g., 'max-w-[120px]'
}

export default function HoverExpandableText({
  className = '',
  fallbackText,
  normalMaxWidthClass = 'max-w-[120px]',
  text,
}: HoverExpandableTextProps) {
  const containerRef = useRef<HTMLSpanElement>(null)
  const [isOverflowing, setIsOverflowing] = useState(false)

  if (!text) {
    return <span className={cn('inline-block', className)}>N/A</span>
  }

  const handleMouseEnter = () => {
    const el = containerRef.current
    if (el) {
      setIsOverflowing(
        el.scrollHeight > el.clientHeight + 1 ||
          el.scrollWidth > el.clientWidth + 1,
      )
    }
  }

  const handleMouseLeave = () => {
    setIsOverflowing(false)
  }

  const isFallback = !!(fallbackText && text === fallbackText)
  const displayText = isFallback ? 'N/A' : text

  return (
    <Tooltip content={text} disabled={!isOverflowing || isFallback}>
      <span
        ref={containerRef}
        className={cn(
          'inline-block min-w-0 [overflow-wrap:anywhere] break-words',
          'line-clamp-2 hover:line-clamp-none',
          normalMaxWidthClass,
          className,
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {displayText}
      </span>
    </Tooltip>
  )
}
