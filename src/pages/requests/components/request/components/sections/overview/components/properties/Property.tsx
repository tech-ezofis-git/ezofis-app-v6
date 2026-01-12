import type { ReactNode } from 'react'
import cn from '@/utils/cn'

interface Props {
  children: ReactNode
  title: string
  className?: string
}

const Property = ({ children, className, title }: Props) => {
  return (
    <div
      className={cn(
        'grid grid-cols-2 divide-x divide-gray-3 border-b border-gray-3 last:border-b-0 odd:border-r',
        className,
      )}
    >
      <div className='px-4 py-2 font-semibold'>{title}</div>
      <div className='px-4 py-2 font-medium text-gray-13'>{children}</div>
    </div>
  )
}

Property.displayName = 'Property'
export default Property