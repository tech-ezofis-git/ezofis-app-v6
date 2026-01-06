import type { MouseEvent, ReactNode } from 'react'
import cn from '@/utils/cn'

interface Props {
  children: ReactNode
  description: string
  selected: boolean
  title: string
  className?: string
  onClick: (e: MouseEvent) => void
}

const Layout = ({
  children,
  className,
  description,
  selected = false,
  title,
  onClick,
}: Props) => {
  return (
    <div
      className={cn(
        'h-68 w-64 cursor-pointer rounded border border-gray-3 text-center transition-colors hover:bg-gray-2',
        selected && 'border-primary-9',
        className,
      )}
      onClick={onClick}
    >
      <div className='flex h-48 items-center justify-center px-10'>
        {children}
      </div>

      <div className='border-t border-gray-3 p-4'>
        <div className='mb-1 text-15 font-medium text-gray-13'>{title}</div>
        <p className='text-13 text-pretty text-gray-11'>{description}</p>
      </div>
    </div>
  )
}

Layout.displayName = 'Layout'
export default Layout
