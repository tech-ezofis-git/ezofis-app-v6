
import React from 'react'

const CELL_TEXT = 'text-xs font-normal text-gray-12'

export default function WrapOnHoverCell({
    value,
    className = '',
}: {
    value: React.ReactNode
    className?: string
}) {
    return (
        <span
            className={[
                CELL_TEXT,
                'block min-w-0',
                'truncate whitespace-nowrap overflow-hidden text-ellipsis',
                'hover:whitespace-normal hover:break-words hover:overflow-visible hover:text-clip',
                className,
            ].join(' ')}
        >
            {value}
        </span>
    )
}
