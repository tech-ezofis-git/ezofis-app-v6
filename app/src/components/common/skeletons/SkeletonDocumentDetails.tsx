import Skeleton from '@/components/base/Skeleton'
import SkeletonDocumentPreview from './SkeletonDocumentPreview'

interface Props {
  /** Hide the metadata column when the details view runs in signing mode. */
  showMetadata?: boolean
  /** Hide the timeline/comments tabs when the details view runs in signing mode. */
  showTabs?: boolean
}

const cardClass = 'rounded-xl border border-gray-3 bg-surface-primary shadow-sm'

/** Full-page placeholder for the document details view (viewer + metadata). */
const SkeletonDocumentDetails = ({
  showMetadata = true,
  showTabs = true,
}: Props) => {
  return (
    <div
      aria-busy='true'
      className='flex h-full min-h-0 flex-1 flex-col bg-surface-secondary'
    >
      <div className='flex h-[60px] shrink-0 items-center justify-between gap-2 border-b border-gray-3 bg-surface-primary px-5'>
        <Skeleton className='h-8 w-[72px] rounded-lg' />
        <div className='flex items-center gap-1.5'>
          <Skeleton className='h-8 w-28 rounded-lg' />
          <Skeleton className='h-8 w-24 rounded-lg' />
        </div>
      </div>

      <div className='min-h-0 flex-1 overflow-hidden p-5'>
        <div
          className={`grid gap-5 ${
            showMetadata ? 'grid-cols-[minmax(0,1fr)_400px]' : 'grid-cols-1'
          }`}
        >
          <main className='min-w-0 space-y-4'>
            <section className={`${cardClass} overflow-hidden`}>
              <div className='flex items-center justify-between gap-3 border-b border-gray-3 px-5 py-4'>
                <div className='flex min-w-0 flex-1 items-center gap-3'>
                  <Skeleton className='h-5 w-5 shrink-0 rounded' />
                  <Skeleton className='h-5 w-2/5' />
                </div>
                <div className='flex shrink-0 items-center gap-1.5'>
                  <Skeleton className='h-8 w-8 rounded-lg' />
                  <Skeleton className='h-8 w-8 rounded-lg' />
                </div>
              </div>
              <SkeletonDocumentPreview className='h-[560px]' />
            </section>

            {showTabs ? (
              <>
                <div className='flex w-fit gap-1 rounded-xl bg-gray-2 p-1'>
                  {['w-24', 'w-28', 'w-32'].map((width) => (
                    <Skeleton
                      className={`h-8 rounded-lg ${width}`}
                      key={width}
                    />
                  ))}
                </div>

                <section className={`${cardClass} min-h-[320px] p-5`}>
                  <div className='space-y-4'>
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div className='flex gap-3' key={`event-${index}`}>
                        <Skeleton className='h-9 w-9 shrink-0 rounded-full' />
                        <div className='min-w-0 flex-1 space-y-2'>
                          <Skeleton className='h-3.5 w-1/3' />
                          <Skeleton className='h-3 w-1/4' />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            ) : null}
          </main>

          {showMetadata ? (
            <aside className='min-w-0 space-y-4'>
              {Array.from({ length: 2 }).map((_, cardIndex) => (
                <section
                  className={`${cardClass} overflow-hidden`}
                  key={`card-${cardIndex}`}
                >
                  <div className='flex items-center gap-2 border-b border-gray-3 px-4 py-3'>
                    <Skeleton className='h-4 w-4 rounded' />
                    <Skeleton className='h-4 w-1/3' />
                  </div>
                  <div>
                    {Array.from({ length: 5 }).map((_, rowIndex) => (
                      <div
                        className='flex items-center justify-between gap-3 border-b border-gray-3 px-3 py-3 last:border-0'
                        key={`row-${cardIndex}-${rowIndex}`}
                      >
                        <Skeleton className='h-3.5 w-1/3' />
                        <Skeleton className='h-3.5 w-2/5' />
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </aside>
          ) : null}
        </div>
      </div>
    </div>
  )
}

SkeletonDocumentDetails.displayName = 'SkeletonDocumentDetails'
export default SkeletonDocumentDetails
