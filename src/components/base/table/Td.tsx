import type { ComponentProps } from 'react'
import cn from '@/utils/cn'

const Td = ({
  className,
  colSpan,
  rowSpan,
  ...props
}: ComponentProps<'td'>) => {
  return (
    <td
      colSpan={colSpan}
      rowSpan={rowSpan}
      className={cn(
        'border-r border-b border-gray-3 bg-surface px-4 py-2 align-middle wrap-anywhere text-gray-11 first:border-l',
        className,
      )}
      {...props}
    />
  )
}

export default Td
