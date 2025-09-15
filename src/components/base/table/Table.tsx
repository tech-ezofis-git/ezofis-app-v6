import type { ComponentProps } from 'react'
import cn from '@/utils/cn'

const Table = ({ className, ...props }: ComponentProps<'table'>) => {
  return (
    <div
      className='relative w-full overflow-x-auto'
      style={{ scrollbarWidth: 'thin' }}
    >
      <table
        className={cn(
          'w-full border-separate border-spacing-0 text-left text-sm',
          className,
        )}
        {...props}
      />
    </div>
  )
}

export default Table
