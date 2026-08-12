import cn from '@/utils/cn'

interface Props {
  className?: string
}

const SkeletonIntegrationCard = ({ className }: Props) => {
  return (
    <div
      className={cn(
        'animate-pulse rounded border border-gray-3 bg-surface p-4',
        className,
      )}
    >
      <div className='mb-4 flex items-center gap-4 border-b border-gray-3 pb-4'>
        <div className='h-10 w-10 rounded bg-gray-3' />
        <div className='h-5 w-32 rounded bg-gray-3' />
      </div>
      <div className='space-y-3'>
        <div className='flex items-center justify-between'>
          <div className='h-3 w-12 rounded bg-gray-3' />
          <div className='h-5 w-16 rounded bg-gray-3' />
        </div>
        <div className='flex items-center justify-between'>
          <div className='h-3 w-16 rounded bg-gray-3' />
          <div className='h-3 w-24 rounded bg-gray-3' />
        </div>
        <div className='flex items-center justify-between'>
          <div className='h-3 w-16 rounded bg-gray-3' />
          <div className='h-3 w-32 rounded bg-gray-3' />
        </div>
      </div>
    </div>
  )
}

SkeletonIntegrationCard.displayName = 'SkeletonIntegrationCard'
export default SkeletonIntegrationCard
