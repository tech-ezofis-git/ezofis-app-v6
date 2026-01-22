import type { ComponentProps } from 'react'
import cn from '@/utils/cn'

const Tr = ({ className, ...props }: ComponentProps<'tr'>) => {
  return (
    <tr
      className={cn(
        'transition-colors hover:bg-[var(--gray-2)]',
        className,
      )}
      {...props}
    />
  )
}

export default Tr
