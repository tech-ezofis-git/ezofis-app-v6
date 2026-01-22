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
        'border-b border-gray-3 bg-surface px-4 py-3 align-middle font-normal wrap-anywhere text-gray-12 first:pl-6 last:pr-6',
        className,
      )}
      {...props}
    />
  )
}

export default Td
