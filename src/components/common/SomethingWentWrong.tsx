import Button from '@/components/base/button/Button'
import Icon from '@/components/base/Icon'

const SomethingWentWrong = () => {
  const goHome = () => {
    window.location.href = window.location.origin
  }

  const reloadPage = () => {
    window.location.reload()
  }

  return (
    <div className='flex h-screen w-screen items-center justify-center'>
      <div className='flex max-w-2xl flex-col items-center'>
        <div className='mb-8 flex size-24 items-center justify-center rounded-full bg-gray-600/10'>
          <Icon className='size-10 text-red' name='tabler:alert-triangle' />
        </div>

        <h1 className='font-poppins text-xl font-bold text-gray-900'>
          Oops! Something Went Wrong
        </h1>
        <p className='mt-2 text-center text-sm text-balance text-gray-600'>
          An unexpected error occurred. Please try reloading the page or come
          back later. We apologize for the inconvenience.
        </p>

        <div className='mt-6 flex justify-center gap-3'>
          <Button
            color='gray'
            label='Reload Page'
            variant='outline'
            onClick={reloadPage}
          />
          <Button color='red' label='Go Home' onClick={goHome} />
        </div>
      </div>
    </div>
  )
}

export default SomethingWentWrong
