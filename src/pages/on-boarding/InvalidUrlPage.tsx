import { useNavigate } from '@tanstack/react-router'
import PageEmptyState from '@/components/common/PageEmptyState'
import Logo from '@/components/common/Logo'
import AuthFooter from '@/layouts/auth/components/AuthFooter'

const InvalidUrlPage = () => {
  const navigate = useNavigate()

  return (
    <div className='p-6'>
      <div className='flex h-9 items-center'>
        <Logo />
      </div>

      <PageEmptyState
        containerClassName='min-h-[calc(100dvh-120px)] py-10 xl:py-24'
        description='This link is invalid or has expired. Please request a new invitation.'
        fill={false}
        icon='lucide:link-2-off'
        primaryActionLabel='Go Home'
        title='Invalid link'
        onPrimaryAction={() => navigate({ to: '/' })}
      />

      <AuthFooter />
    </div>
  )
}

InvalidUrlPage.displayName = 'InvalidUrlPage'
export default InvalidUrlPage
