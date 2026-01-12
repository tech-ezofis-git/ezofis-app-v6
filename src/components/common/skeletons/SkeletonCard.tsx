import cn from '@/utils/cn'

interface Props {
    className?: string
    height?: string
}

const SkeletonCard = ({ className, height = 'h-32' }: Props) => {
    return (
        <div
            className={cn(
                'animate-pulse rounded border border-gray-3 bg-surface',
                height,
                className,
            )}
        >
            <div className='flex h-full flex-col gap-4 p-4'>
                <div className='flex items-center justify-between'>
                    <div className='h-4 w-24 rounded bg-gray-3' />
                    <div className='h-10 w-10 rounded bg-gray-3' />
                </div>
                <div className='h-6 w-16 rounded bg-gray-3' />
                <div className='mt-auto flex items-center justify-between border-t border-gray-3 pt-4'>
                    <div className='h-3 w-20 rounded bg-gray-3' />
                    <div className='h-5 w-5 rounded bg-gray-3' />
                </div>
            </div>
        </div>
    )
}

SkeletonCard.displayName = 'SkeletonCard'
export default SkeletonCard