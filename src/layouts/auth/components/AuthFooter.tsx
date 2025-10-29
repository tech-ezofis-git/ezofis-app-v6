import ThemeSwitcher from '@/components/common/ThemeSwitcher'

const AuthFooter = () => {
  return (
    <div className='flex items-center justify-between gap-4'>
      <div className='text-small text-gray-10'>© 2025 ezofis</div>
      <ThemeSwitcher />
    </div>
  )
}

AuthFooter.displayName = 'AuthFooter'
export default AuthFooter
