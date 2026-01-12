// components/base/Card.tsx
import type { ReactNode } from 'react'
import cn from '@/utils/cn'

type Props = {
    title?: string | ReactNode
    right?: ReactNode
    children: ReactNode
    className?: string
}

export default function Card({ title, right, children, className }: Props) {
    return (
        <div className={cn('rounded-xl border border-gray-3 bg-white shadow-sm', className)}>
            {(title || right) && (
                <div className="flex items-center justify-between border-b border-gray-3 px-5 py-4">
                    <div className="text-sm font-semibold text-gray-13">{title}</div>
                    <div>{right}</div>
                </div>
            )}
            <div className="px-5 py-4">{children}</div>
        </div>
    )
}
