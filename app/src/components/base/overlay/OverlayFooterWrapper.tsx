import type { ReactNode } from 'react'
import cn from '@/utils/cn'

interface Props {
  children: ReactNode
  className?: string
}

const OverlayFooterWrapper = ({ children, className }: Props) => {
  return (
    <footer
      className={cn(
        'flex h-14 items-center border-t border-gray-3 px-4 xl:px-6',
        className,
      )}
    >
      {children}
    </footer>
  )
}

OverlayFooterWrapper.displayName = 'OverlayFooterWrapper'
export default OverlayFooterWrapper
