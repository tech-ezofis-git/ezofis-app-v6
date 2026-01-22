import type { ComponentProps } from 'react'
import cn from '@/utils/cn'

const Th = ({
  className,
  colSpan,
  rowSpan,
  ...props
}: ComponentProps<'th'>) => {
  return (
    <th
      colSpan={colSpan}
      rowSpan={rowSpan}
      className={cn(
        'px-4 py-3 text-left align-middle text-13 font-medium bg-[var(--gray-2)] text-[var(--gray-11)] border-b border-[var(--gray-3)] first:pl-6 last:pr-6',
        className,
      )}
      {...props}
    />
  )
}

export default Th
