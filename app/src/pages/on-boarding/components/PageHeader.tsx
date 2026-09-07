import type { NavigateOptions } from '@tanstack/react-router'
import { useNavigate } from '@tanstack/react-router'
import Button from '@/components/base/button/Button'
import Logo from '@/components/common/Logo'
import cn from '@/utils/cn'
import { resolveAuthPath, useIsWhiteLabel } from '@/utils/whiteLabel'

interface Props {
  isTokenValid: boolean
}

const PageHeader = ({ isTokenValid }: Props) => {
  const navigate = useNavigate()
  const isWhiteLabel = useIsWhiteLabel()
  const signOut = () =>
    navigate({
      to: resolveAuthPath('/sign-in', isWhiteLabel) as NavigateOptions['to'],
    })

  return (
    <div
      className={cn(
        'flex items-center gap-4',
        isWhiteLabel ? 'justify-end' : 'justify-between',
      )}
    >
      {!isWhiteLabel && <Logo />}

      {isTokenValid && (
        <div className='flex items-center gap-2'>
          <div className='hidden text-13 text-gray-10 sm:block'>
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
