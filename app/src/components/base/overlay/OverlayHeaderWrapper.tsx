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
        'flex flex-wrap items-center border-b border-gray-3',
        className,
      )}
    >
      {children}
    </header>
  )
}

OverlayHeaderWrapper.displayName = 'OverlayHeaderWrapper'
export default OverlayHeaderWrapper
