// components/base/Card.tsx
import type { ReactNode } from 'react'
import cn from '@/utils/cn'

type Props = {
  children: ReactNode
  className?: string
  right?: ReactNode
  title?: string | ReactNode
}

export default function Card({ children, className, right, title }: Props) {
  return (
    <div
      className={cn(
        'rounded-xl border border-gray-3 bg-surface shadow-sm',
        className,
      )}
    >
      {(title || right) && (
        <div className='flex items-center justify-between border-b border-gray-3 px-5 py-4'>
          <div className='text-sm font-semibold text-gray-13'>{title}</div>
          <div>{right}</div>
        </div>
      )}
      <div className='px-5 py-4'>{children}</div>
    </div>
  )
}
