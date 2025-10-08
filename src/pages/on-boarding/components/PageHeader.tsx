import { useNavigate } from '@tanstack/react-router'
import Button from '@/components/base/button/Button'
import Logo from '@/components/common/Logo'

interface Props {
  isTokenValid: boolean
}

const PageHeader = ({ isTokenValid }: Props) => {
  const navigate = useNavigate()
  const signOut = () => navigate({ to: '/' })

  return (
    <div className='flex items-center justify-between gap-4'>
      <Logo />

      {isTokenValid && (
        <div className='flex items-center gap-2'>
          <div className='hidden text-sm text-gray-10 sm:block'>
            Want to do this later?
          </div>
          <Button
            color='gray'
            label='Sign Out'
            variant='outline'
            onClick={signOut}
          />
        </div>
      )}
    </div>
  )
}

PageHeader.displayName = 'PageHeader'
export default PageHeader
