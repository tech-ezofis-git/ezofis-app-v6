import { useMantineColorScheme } from '@mantine/core'
import IconButton from '@/components/base/button/IconButton'

const AuthFooter = () => {
  const { toggleColorScheme } = useMantineColorScheme()

  return (
    <div className='flex items-center justify-between gap-4'>
      <div className='text-sm text-gray-10'>© 2025 ezofis</div>
      <IconButton
        color='gray'
        icon='tabler:percentage-50'
        variant='ghost'
        onClick={toggleColorScheme}
      />
    </div>
  )
}

AuthFooter.displayName = 'AuthFooter'
export default AuthFooter
