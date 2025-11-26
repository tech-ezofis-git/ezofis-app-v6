import type { ReactNode } from 'react'
import cn from '@/utils/cn'

interface Props {
  children: ReactNode
  className?: string
}

const OverlayHeaderWrapper = ({ children, className }: Props) => {
  return (
    <header
      className={cn(
        'flex h-13 flex-wrap items-center border-b border-gray-3 px-4',
        className,
      )}
    >
      {children}
    </header>
  )
}

OverlayHeaderWrapper.displayName = 'OverlayHeaderWrapper'
export default OverlayHeaderWrapper
