import { usePagination, useViewportSize } from '@mantine/hooks'
import { Button, IconButton } from '@/components/base'
import { cn } from '@/utils'

interface Props {
  totalPages: number
  value: number
  onChange: (value: number) => void
}

const PaginationControls: React.FC<Props> = ({
  onChange,
  totalPages,
  value,
}) => {
  const { width } = useViewportSize()
  const { next, previous, range, setPage } = usePagination({
    onChange,
    page: value,
    siblings: width > 640 ? 1 : 0,
    total: totalPages,
  })

  return (
    <div className='flex justify-center md:justify-start xl:justify-center'>
      <div className='flex items-center gap-2'>
        <IconButton
          color='gray'
          disabled={value === 1}
          icon='tabler:chevron-left'
          variant='ghost'
          onClick={previous}
        />
        {range.map((page, index) =>
          page === 'dots' ? (
            <IconButton
              color='gray'
              icon='tabler:dots'
              key={index}
              variant='ghost'
              disabled
            />
          ) : (
            <Button
              aria-current={page === value ? 'page' : undefined}
              color='gray'
              key={index}
              label={page.toString()}
              variant={page === value ? 'outline' : 'ghost'}
              className={cn(
                'min-w-9 justify-center p-2',
                page === value && 'border-gray-600/15 bg-gray-600/5',
              )}
              onClick={() => setPage(page)}
            />
          ),
        )}
        <IconButton
          color='gray'
          disabled={value === totalPages}
          icon='tabler:chevron-right'
          variant='ghost'
          onClick={next}
        />
      </div>
    </div>
  )
}

PaginationControls.displayName = 'PaginationControls'
export default PaginationControls
