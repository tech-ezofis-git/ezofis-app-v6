import type { ComponentProps } from 'react'
import cn from '@/utils/cn'

const Tr = ({ className, ...props }: ComponentProps<'tr'>) => {
  return (
    <tr
      className={cn(
        'last:[&>td:first-child]:rounded-bl-md last:[&>td:last-child]:rounded-br-md',
        className,
      )}
      {...props}
    />
  )
}

export default Tr
