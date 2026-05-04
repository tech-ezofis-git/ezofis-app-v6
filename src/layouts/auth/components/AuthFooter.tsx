import ThemeSwitcher from './ThemeSwitcher'

const AuthFooter = () => {
  return (
    <div className='flex items-center justify-between gap-4'>
      <div className='text-13 text-gray-10'>© 2025 EZOFIS</div>
      <ThemeSwitcher />
    </div>
  )
}

AuthFooter.displayName = 'AuthFooter'
export default AuthFooter
