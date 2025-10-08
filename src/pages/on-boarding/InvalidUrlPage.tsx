import EmptyState from '@/components/base/EmptyState'
import Logo from '@/components/common/Logo'
import AuthFooter from '@/layouts/auth/components/AuthFooter'

const InvalidUrlPage = () => {
  return (
    <div className='p-6'>
      <div className='flex h-9 items-center'>
        <Logo />
      </div>

      <div
        className='flex items-center justify-center py-10 xl:py-24'
        style={{ minHeight: 'calc(100svh - 120px)' }}
      >
        <EmptyState
          description='The link you followed may be broken or the page may have been removed. Please double-check the URL for errors and try again.'
          icon='tabler:plug-connected-x'
          primaryActionLabel='Go Home'
          title='The link is not valid'
        />
      </div>

      <AuthFooter />
    </div>
  )
}

InvalidUrlPage.displayName = 'InvalidUrlPage'
export default InvalidUrlPage
