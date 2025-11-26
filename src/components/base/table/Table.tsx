import type { ComponentProps } from 'react'
import cn from '@/utils/cn'

const Table = ({ className, ...props }: ComponentProps<'table'>) => {
  return (
    <table
      className={cn(
        'w-full border-separate border-spacing-0 text-left text-13',
        className,
      )}
      {...props}
    />
  )
}

export default Table
