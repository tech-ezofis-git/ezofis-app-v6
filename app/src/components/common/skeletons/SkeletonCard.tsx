import cn from '@/utils/cn'

interface Props {
  className?: string
  height?: string
}

const SkeletonCard = ({ className, height = 'h-32' }: Props) => {
  return (
    <div
      className={cn(
        'animate-pulse overflow-hidden rounded-xl border border-gray-3 bg-surface',
        height,
        className,
      )}
    >
      <div className='flex h-full flex-col justify-between p-3.5 sm:p-4'>
        <div className='space-y-2.5'>
          <div className='flex items-center justify-between '>
            <div className='h-3.5 w-24 rounded bg-gray-3' />
            <div className='h-7 w-7 shrink-0 rounded bg-gray-3' />
          </div>
          <div className='h-5 w-16 rounded bg-gray-3 mb-1' />
        </div>
        <div className='mt-auto flex items-center justify-between border-t border-gray-3 mt-3 pt-3'>
          <div className='h-3 w-20 rounded bg-gray-3' />
          <div className='h-3.5 w-3.5 rounded bg-gray-3' />
        </div>
      </div>
    </div>
  )
}

SkeletonCard.displayName = 'SkeletonCard'
export default SkeletonCard
