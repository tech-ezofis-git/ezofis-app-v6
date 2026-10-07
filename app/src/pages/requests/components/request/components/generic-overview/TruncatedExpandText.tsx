import cn from '@/utils/cn'

type TruncatedExpandTextProps = {
  as?: 'span' | 'h1'
  className?: string
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
 * Truncates long text; on hover expands with a hand cursor (no tooltip).
 * - maxChars / truncateAfter → show short line; hover wraps full text below
 *   in-flow (e.g. header: `< 1234... >` → `< 1234` / `    45678 >`)
 * - neither → width-based ellipsis; hover expands in-flow (agent columns)
 */
const TruncatedExpandText = ({
  as = 'span',
  className,
  maxChars,
  truncateAfter,
  value,
}: TruncatedExpandTextProps) => {
  const Tag = as
  const fullValue = String(value ?? '').trim() || 'NA'

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

  // Width-based mode (agent columns)
  if (shortValue == null && maxChars == null && !truncateAfter) {
    return (
      <Tag
        className={cn(
          'group block min-w-0 w-full cursor-pointer text-left',
          className,
        )}
      >
        <span className='block min-w-0 truncate whitespace-nowrap group-hover:hidden'>
          {fullValue}
        </span>
        <span className='hidden w-full break-words whitespace-normal group-hover:block'>
          {fullValue}
        </span>
      </Tag>
    )
  }

  if (shortValue == null) {
    return <Tag className={className}>{fullValue}</Tag>
  }

  // Character / @ truncate: expand in-flow on hover (wraps under title)
  return (
    <Tag
      className={cn(
        'group inline-block max-w-[min(100%,16rem)] cursor-pointer align-middle text-left',
        className,
      )}
    >
      <span className='block whitespace-nowrap group-hover:hidden'>
        {shortValue}
      </span>
      <span className='hidden break-words whitespace-normal group-hover:block'>
        {fullValue}
      </span>
    </Tag>
  )
}

export default TruncatedExpandText
