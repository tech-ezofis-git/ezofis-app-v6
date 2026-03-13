import React from 'react'

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
      className={[
        CELL_TEXT,
        'block min-w-0',
        'truncate overflow-hidden text-ellipsis whitespace-nowrap',
        'hover:overflow-visible hover:break-words hover:text-clip hover:whitespace-normal',
        className,
      ].join(' ')}
    >
      {value}
    </span>
  )
}
