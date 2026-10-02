import Skeleton from '@/components/base/Skeleton'
import cn from '@/utils/cn'

interface Props {
  className?: string
  /** Fill the viewer edge to edge, with no page outline or inset. */
  flush?: boolean
}

/** Placeholder page shown while a document preview is being fetched/rendered. */
const SkeletonDocumentPreview = ({ className, flush = false }: Props) => {
  return (
    <div
      aria-busy='true'
      className={cn(
        'flex h-full w-full overflow-hidden bg-surface',
        flush
          ? 'min-h-0 items-stretch'
          : 'min-h-[320px] items-start justify-center bg-gray-1 p-6',
        className,
      )}
    >
      <div
        className={cn(
          'w-full bg-surface',
          flush
            ? 'h-full p-6'
            : 'max-w-[620px] rounded-lg border border-gray-3 p-8 shadow-sm',
        )}
      >
        <Skeleton className='h-7 w-1/2' />
        <Skeleton className='mt-2 h-4 w-1/3' />

        <div className='mt-8 grid grid-cols-2 gap-x-8 gap-y-3'>
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton className='h-3.5' key={`meta-${index}`} />
          ))}
        </div>

        <div className='mt-8 space-y-3'>
          {['w-full', 'w-11/12', 'w-full', 'w-10/12', 'w-full', 'w-2/3'].map(
            (width, index) => (
              <Skeleton className={`h-3.5 ${width}`} key={`line-${index}`} />
            ),
          )}
        </div>

        <div className='mt-8 space-y-2 border-t border-gray-3 pt-6'>
          {['w-full', 'w-9/12', 'w-11/12'].map((width, index) => (
            <Skeleton className={`h-3.5 ${width}`} key={`footer-${index}`} />
          ))}
        </div>
      </div>
    </div>
  )
}

SkeletonDocumentPreview.displayName = 'SkeletonDocumentPreview'
export default SkeletonDocumentPreview
