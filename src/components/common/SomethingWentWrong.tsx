import Button from '@/components/base/button/Button'
import Title from '@/components/base/Title'
import IconIllustrated from '../base/icon/IconIllustrated'

const SomethingWentWrong = () => {
  const goHome = () => {
    window.location.href = window.location.origin
  }

  const reloadPage = () => {
    window.location.reload()
  }

  return (
    <div className='flex h-dvh w-dvw items-center justify-center'>
      <div className='flex max-w-xl flex-col items-center gap-4 p-10'>
        <IconIllustrated color='red' icon='lucide:alert-triangle' />
        <Title
          title='Oops! Something Went Wrong'
          description='An unexpected error occurred. Please try reloading the page or come
          back later. We apologize for the inconvenience.'
        />

        <div className='mt-2 flex justify-center gap-3'>
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

SomethingWentWrong.displayName = 'SomethingWentWrong'
export default SomethingWentWrong
