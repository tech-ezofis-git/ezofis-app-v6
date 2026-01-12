import { usePagination, useViewportSize } from '@mantine/hooks'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import { SCREEN_SM } from '@/constants'
import cn from '@/utils/cn'

interface Props {
  page: number
  totalPages: number
  onPageChange: (value: number) => void
}

const PaginationControls = ({ page, totalPages, onPageChange }: Props) => {
  const { width } = useViewportSize()
  const { next, previous, range, setPage } = usePagination({
    page,
    siblings: width > SCREEN_SM ? 1 : 0,
    total: totalPages,
    onChange: onPageChange,
  })

  return (
    <div className='flex justify-center md:justify-start xl:justify-center'>
      <div className='flex items-center gap-2'>
        <IconButton
          color='gray'
          disabled={page === 1}
          icon='lucide:chevron-left'
          variant='ghost'
          onClick={previous}
        />
        {range.map((_page, index) =>
          _page === 'dots' ? (
            <IconButton
              color='gray'
              icon='lucide:more-horizontal'
              key={index}
              variant='ghost'
              disabled
            />
          ) : (
            <Button
              aria-current={_page === page ? 'page' : undefined}
              color='gray'
              key={index}
              label={_page.toString()}
              variant={_page === page ? 'subtle' : 'ghost'}
              className={cn(
                'min-w-9 justify-center p-2 font-medium',
                _page === page && 'text-gray-13',
              )}
              onClick={() => setPage(_page)}
            />
          ),
        )}
        <IconButton
          color='gray'
          disabled={page === totalPages}
          icon='lucide:chevron-right'
          variant='ghost'
          onClick={next}
        />
      </div>
    </div>
  )
}

PaginationControls.displayName = 'PaginationControls'
export default PaginationControls
