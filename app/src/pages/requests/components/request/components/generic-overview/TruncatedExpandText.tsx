import { useLayoutEffect, useRef, useState } from 'react'
import Tooltip from '@/components/base/Tooltip'
import cn from '@/utils/cn'

const TOOLTIP_MAX_WIDTH = 480

type TruncatedExpandTextProps = {
  as?: 'span' | 'h1'
  className?: string
  /**
   * Size to the text, then ellipsis only when the parent runs out of width.
   * The full value stays in a tooltip so the row does not grow.
   */
  fit?: boolean
  /**
   * When set, truncate to this many characters + "...".
   * Ignored when `truncateAfter` is set.
   * When omitted (and no truncateAfter), truncate by available width.
   */
  maxChars?: number
  /**
   * Truncate right after the first occurrence of this character
   * (character included). E.g. truncateAfter="@" → "Pending with admin@..."
   */
  truncateAfter?: string
  value?: string | null
}

/**
 * Truncates long text.
 * - fit → use the available width; ellipsis only when the text does not fit.
 *   Hover shows the full value in a tooltip so the row does not grow.
 * - maxChars / truncateAfter → short line stays in the row; hover shows the
 *   full value in a tooltip so surrounding header items do not wrap.
 * - neither → width-based ellipsis; hover expands in-flow (agent columns)
 */
const TruncatedExpandText = ({
  as = 'span',
  className,
  fit = false,
  maxChars,
  truncateAfter,
  value,
}: TruncatedExpandTextProps) => {
  const Tag = as
  const textRef = useRef<HTMLElement>(null)
  const [overflowing, setOverflowing] = useState(false)
  const fullValue = String(value ?? '').trim() || 'NA'

  useLayoutEffect(() => {
    if (!fit) return
    const el = textRef.current
    if (!el) return

    const measure = () => {
      setOverflowing(el.scrollWidth > el.clientWidth + 1)
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    if (el.parentElement) observer.observe(el.parentElement)
    return () => observer.disconnect()
  }, [fit, fullValue])

  let shortValue: string | null = null

  if (truncateAfter) {
    const at = fullValue.indexOf(truncateAfter)
    if (at >= 0 && at < fullValue.length - 1) {
      shortValue = `${fullValue.slice(0, at + truncateAfter.length)}...`
    }
  } else if (typeof maxChars === 'number' && maxChars > 0) {
    if (fullValue.length > maxChars) {
      shortValue = `${fullValue.slice(0, maxChars)}...`
    }
  }

  if (fit) {
    const estimatedWidth = Math.ceil(fullValue.length * 6.75) + 16
    const tooltipWidth =
      estimatedWidth > TOOLTIP_MAX_WIDTH ? TOOLTIP_MAX_WIDTH : undefined

    return (
      <Tooltip
        className='block max-w-full min-w-0 shrink overflow-hidden'
        content={fullValue}
        disabled={!overflowing}
        position='bottom-start'
        width={tooltipWidth}
      >
        <Tag
          className={cn('block max-w-full min-w-0 truncate', className)}
          ref={textRef}
        >
          {fullValue}
        </Tag>
      </Tooltip>
    )
  }

  // Width-based mode: stay on one line next to "Label :" (truncate, don't wrap).
  if (shortValue == null && maxChars == null && !truncateAfter) {
    return (
      <Tag
        className={cn(
          'group block max-w-full min-w-0 cursor-pointer text-left',
          className,
        )}
      >
        <span className='block min-w-0 truncate whitespace-nowrap group-hover:hidden'>
          {fullValue}
        </span>
        <span className='hidden min-w-0 break-words whitespace-normal group-hover:block'>
          {fullValue}
        </span>
      </Tag>
    )
  }

  if (shortValue == null) {
    return <Tag className={className}>{fullValue}</Tag>
  }

  // Character / @ truncate: full text is a tooltip, so the row width stays put.
  // Width follows the text. Only long values get a cap so they wrap.
  const estimatedWidth = Math.ceil(fullValue.length * 6.75) + 16
  const tooltipWidth =
    estimatedWidth > TOOLTIP_MAX_WIDTH ? TOOLTIP_MAX_WIDTH : undefined

  return (
    <Tag
      className={cn(
        'inline-block max-w-[min(100%,16rem)] text-left align-middle',
        className,
      )}
    >
      <Tooltip content={fullValue} position='bottom-start' width={tooltipWidth}>
        <span className='block max-w-full cursor-pointer truncate whitespace-nowrap'>
          {shortValue}
        </span>
      </Tooltip>
    </Tag>
  )
}

export default TruncatedExpandText
