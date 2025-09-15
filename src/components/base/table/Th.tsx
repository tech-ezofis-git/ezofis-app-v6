import type { ComponentProps } from 'react'
import cn from '@/utils/cn'

const Th = ({ className, ...props }: ComponentProps<'th'>) => {
  return (
    <th
      className={cn(
        'border-t border-r border-b border-gray-3 bg-surface-pinned px-4 py-2 align-middle font-semibold text-gray-11 first:rounded-tl-md first:border-l last:rounded-tr-md',
        className,
      )}
      {...props}
    />
  )
}

export default Th
