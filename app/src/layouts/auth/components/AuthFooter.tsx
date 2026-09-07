import cn from '@/utils/cn'
import { useIsWhiteLabel } from '@/utils/whiteLabel'
import ThemeSwitcher from './ThemeSwitcher'

const AuthFooter = () => {
  const isWhiteLabel = useIsWhiteLabel()

  return (
    <div
      className={cn(
        'flex items-center gap-4',
        isWhiteLabel ? 'justify-end' : 'justify-between',
      )}
    >
      {!isWhiteLabel && (
        <div className='text-13 text-gray-10'>© 2026 EZOFIS</div>
      )}
      <ThemeSwitcher />
    </div>
  )
}

AuthFooter.displayName = 'AuthFooter'
export default AuthFooter
