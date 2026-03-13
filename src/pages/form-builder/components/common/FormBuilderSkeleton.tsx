const FormBuilderSkeleton = () => {
  return (
    <div className='flex h-dvh flex-col overflow-hidden bg-white select-none'>
      {/* Header Skeleton */}
      <header className='flex h-16 shrink-0 items-center justify-between border-b border-gray-3 px-6'>
        <div className='flex items-center gap-4'>
          <div className='h-8 w-8 animate-pulse rounded-full bg-gray-2' />
          <div className='flex flex-col gap-1.5'>
            <div className='h-4 w-32 animate-pulse rounded bg-gray-3' />
            <div className='h-3 w-48 animate-pulse rounded bg-gray-2' />
          </div>
        </div>
        <div className='flex items-center gap-3'>
          <div className='h-8 w-16 animate-pulse rounded-lg bg-gray-2' />
          <div className='h-8 w-16 animate-pulse rounded-lg bg-gray-2' />
          <div className='h-8 w-24 animate-pulse rounded-lg bg-gray-3' />
        </div>
      </header>

      <div className='flex flex-1 overflow-hidden'>
        {/* Main Canvas Skeleton */}
        <div className='bg-gray-50/50 flex-1 overflow-auto px-4 py-8'>
          <div className='mx-auto max-w-[800px] space-y-8'>
            {/* Mock Title/Welcome Page */}
            <div className='h-28 w-full space-y-3 rounded-2xl border border-gray-2 bg-white p-6 shadow-sm'>
              <div className='h-3 w-20 animate-pulse rounded bg-gray-2' />
              <div className='h-6 w-3/4 animate-pulse rounded bg-gray-3' />
              <div className='h-4 w-1/2 animate-pulse rounded bg-gray-2' />
            </div>

            {/* Mock Question Cards */}
            {[1, 2, 3].map((i) => (
              <div
                className='flex h-32 w-full gap-4 rounded-2xl border border-gray-2 bg-white p-6 shadow-sm'
                key={i}
              >
                <div className='h-10 w-10 shrink-0 animate-pulse rounded-xl bg-gray-2' />
                <div className='flex-1 space-y-3'>
                  <div className='flex items-center gap-2'>
                    <div className='h-3 w-16 animate-pulse rounded bg-gray-2' />
                    <div className='h-3 w-12 animate-pulse rounded bg-gray-2' />
                  </div>
                  <div className='h-5 w-2/3 animate-pulse rounded bg-gray-3' />
                  <div className='h-4 w-1/2 animate-pulse rounded bg-gray-2' />
                </div>
              </div>
            ))}

            {/* Add Button Skeleton */}
            <div className='flex justify-center'>
              <div className='bg-gray-100/50 h-10 w-40 animate-pulse rounded-xl border-2 border-dashed border-gray-3' />
            </div>
          </div>
        </div>

        {/* Sidebar Skeleton */}
        <div className='h-full w-[380px] shrink-0 space-y-6 border-l border-gray-3 bg-white p-6'>
          <div className='flex items-center justify-between'>
            <div className='h-6 w-32 animate-pulse rounded bg-gray-3' />
            <div className='h-6 w-6 animate-pulse rounded bg-gray-2' />
          </div>
          <div className='h-px w-full bg-gray-2' />
          <div className='space-y-4'>
            <div className='h-10 w-full animate-pulse rounded-lg bg-gray-1' />
            <div className='h-10 w-full animate-pulse rounded-lg bg-gray-1' />
            <div className='h-24 w-full animate-pulse rounded-lg bg-gray-1' />
          </div>
        </div>
      </div>
    </div>
  )
}

export default FormBuilderSkeleton
