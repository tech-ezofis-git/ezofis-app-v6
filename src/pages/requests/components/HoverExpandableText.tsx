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
      // Measure overflow synchronously on hover
      setIsOverflowing(el.scrollWidth > el.clientWidth)
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
        className={cn('inline-block truncate', normalMaxWidthClass, className)}
        ref={containerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {displayText}
      </span>
    </Tooltip>
  )
}
