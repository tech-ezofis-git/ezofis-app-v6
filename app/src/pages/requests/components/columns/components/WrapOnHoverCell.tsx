import React from 'react'
import HoverExpandableText from '@/pages/requests/components/HoverExpandableText'
import cn from '@/utils/cn'

const CELL_TEXT = 'text-xs font-normal text-gray-12'

export default function WrapOnHoverCell({
  className = '',
  value,
}: {
  className?: string
  value: React.ReactNode
}) {
  if (typeof value === 'string' || typeof value === 'number') {
    return (
      <HoverExpandableText
        className={cn('text-11 font-medium text-gray-10', className)}
        expandStyle='inline'
        maxLines={1}
        normalMaxWidthClass='max-w-full'
        text={String(value)}
      />
    )
  }

  return (
    <span
      className={cn(
        CELL_TEXT,
        'inline-block max-w-full min-w-0 truncate [overflow-wrap:anywhere]',
        'hover:break-words hover:whitespace-normal',
        className,
      )}
    >
      {value}
    </span>
  )
}
