import React from 'react'
import cn from '@/utils/cn'

const CELL_TEXT = 'text-xs font-normal text-gray-12'

export default function WrapOnHoverCell({
  className = '',
  value,
}: {
  className?: string
  value: React.ReactNode
}) {
  return (
    <span
      className={cn(
        CELL_TEXT,
        'block max-w-full min-w-0 [overflow-wrap:anywhere] break-words',
        'line-clamp-2',
        'hover:line-clamp-none',
        className,
      )}
    >
      {value}
    </span>
  )
}
