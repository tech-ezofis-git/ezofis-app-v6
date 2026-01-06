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
        'border-t border-r border-b border-gray-3 px-4 py-3 text-left align-middle text-13 font-medium first:rounded-tl first:border-l last:rounded-tr',
        className,
      )}
      {...props}
    />
  )
}

export default Th
