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
      <div className='flex min-h-10 items-center px-4'>{title}</div>
      <div className='flex min-h-10 items-center px-4 font-medium text-gray-13'>
        {children}
      </div>
    </div>
  )
}

Property.displayName = 'Property'
export default Property
