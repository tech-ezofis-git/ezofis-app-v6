import Skeleton from '@/components/base/Skeleton'

export const PortalStatCardsSkeleton = () => (
  <div className='grid grid-cols-2 gap-3 lg:grid-cols-4'>
    {[0, 1, 2, 3].map((index) => (
      <div
        className='flex items-center gap-3 rounded-xl border border-gray-4 bg-surface p-3.5 sm:p-4'
        key={index}
      >
        <Skeleton className='size-9 shrink-0 rounded-lg' />
        <div className='min-w-0 flex-1 space-y-2'>
          <Skeleton className='h-5 w-10' />
          <Skeleton className='h-3 w-20' />
        </div>
      </div>
    ))}
  </div>
)

export const PortalWizardSkeleton = () => (
  <div className='mx-auto flex w-full max-w-3xl flex-col gap-5'>
    <div className='flex items-end justify-between gap-3'>
      <Skeleton className='h-4 w-28' />
      <Skeleton className='h-4 w-24' />
    </div>
    <Skeleton className='h-1.5 w-full rounded-full' />
    <div className='relative flex flex-col gap-3 pl-10'>
      <div className='absolute top-4 bottom-4 left-[13px] w-px bg-gray-4' />
      <div className='rounded-xl border border-primary-4 bg-surface p-5'>
        <Skeleton className='mb-2 h-3 w-16' />
        <Skeleton className='mb-4 h-5 w-48' />
        <Skeleton className='h-10 w-full rounded-lg' />
        <div className='mt-5 flex justify-between'>
          <Skeleton className='h-8 w-20 rounded-lg' />
          <Skeleton className='h-8 w-24 rounded-lg' />
        </div>
      </div>
      {[0, 1, 2].map((index) => (
        <div
          className='flex items-center gap-2 rounded-xl border border-gray-3 bg-gray-1 px-4 py-3'
          key={index}
        >
          <Skeleton className='size-4 rounded-full' />
          <Skeleton className='h-4 w-40' />
        </div>
      ))}
    </div>
  </div>
)

export const PortalWorkflowCardsSkeleton = () => (
  <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
    {[0, 1, 2].map((index) => (
      <div
        className='flex flex-col gap-3 rounded-xl border border-gray-4 bg-surface p-4'
        key={index}
      >
        <div className='flex items-start gap-3'>
          <Skeleton className='size-10 shrink-0 rounded-xl' />
          <div className='min-w-0 flex-1 space-y-2'>
            <Skeleton className='h-4 w-2/3' />
            <Skeleton className='h-3 w-16' />
          </div>
        </div>
        <Skeleton className='h-4 w-full' />
        <Skeleton className='h-4 w-3/4' />
        <div className='border-t border-gray-3 pt-3'>
          <Skeleton className='h-4 w-24' />
        </div>
      </div>
    ))}
  </div>
)

export const PortalSubmissionsTableSkeleton = () => (
  <div className='-mx-4 sm:mx-0'>
    <div className='flex flex-col'>
      <div className='flex items-center gap-3 px-4 pb-3'>
        <Skeleton className='h-3 w-24' />
        <Skeleton className='ml-auto h-3 w-16' />
        <Skeleton className='h-3 w-20' />
        <Skeleton className='h-3 w-16' />
      </div>
      {[0, 1, 2, 3, 4].map((index) => (
        <div
          className='flex items-center gap-3 border-t border-gray-3 px-4 py-3.5'
          key={index}
        >
          <Skeleton className='size-8 shrink-0 rounded-lg' />
          <div className='min-w-0 flex-1 space-y-2'>
            <Skeleton className='h-3.5 w-48 max-w-full' />
            <Skeleton className='h-3 w-28' />
          </div>
          <Skeleton className='h-6 w-20 rounded-full' />
          <Skeleton className='hidden h-3.5 w-24 sm:block' />
          <Skeleton className='hidden h-3.5 w-16 sm:block' />
        </div>
      ))}
    </div>
  </div>
)

export const PortalDetailSkeleton = () => (
  <div className='flex h-full min-h-0'>
    <div className='hidden h-full w-72 shrink-0 border-r border-gray-4 bg-surface p-4 lg:block xl:w-80'>
      <Skeleton className='mb-5 h-4 w-20' />
      <div className='flex flex-col gap-3'>
        {[0, 1, 2, 3, 4].map((index) => (
          <div className='flex items-center gap-3 py-2' key={index}>
            <Skeleton className='size-8 shrink-0 rounded-full' />
            <Skeleton className='h-3.5 w-32' />
          </div>
        ))}
      </div>
    </div>
    <div className='flex min-h-0 w-full min-w-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5'>
      <div className='rounded-xl border border-gray-4 bg-surface p-5'>
        <Skeleton className='mb-4 h-4 w-40' />
        <Skeleton className='mb-3 h-10 w-full rounded-lg' />
        <Skeleton className='mb-3 h-10 w-full rounded-lg' />
        <Skeleton className='h-10 w-2/3 rounded-lg' />
      </div>
      <div className='rounded-xl border border-gray-4 bg-surface p-5'>
        <Skeleton className='mb-4 h-4 w-28' />
        <Skeleton className='h-16 w-full rounded-xl' />
      </div>
    </div>
  </div>
)

export const PortalFieldFillSkeleton = ({ label }: { label?: string }) => (
  <div className='flex flex-col gap-3 rounded-xl border border-gray-3 bg-gray-1 p-4'>
    <Skeleton className='h-3 w-24' />
    <Skeleton className='h-10 w-full rounded-lg' />
    <Skeleton className='h-10 w-full rounded-lg' />
    <Skeleton className='h-10 w-2/3 rounded-lg' />
    {label ? <p className='text-12 text-gray-10'>{label}</p> : null}
  </div>
)
