import type { NavigateOptions } from '@tanstack/react-router'
import { useLingui } from '@lingui/react/macro'
import { useLocation, useNavigate } from '@tanstack/react-router'
import Button from '@/components/base/button/Button'
import Logo from '@/components/common/Logo'
import cn from '@/utils/cn'
import { resolveAuthPath, useIsWhiteLabel } from '@/utils/whiteLabel'

interface Props {
  className?: string
  logoClassName?: string
}

const AuthHeader = ({ className, logoClassName }: Props) => {
  const { t } = useLingui()
  const location = useLocation()
  const navigate = useNavigate()
  const isWhiteLabel = useIsWhiteLabel()

  const actions = [
    {
      currentPath: resolveAuthPath('/sign-up', isWhiteLabel),
      description: t`Already have an account?`,
      label: t`Sign In`,
      to: resolveAuthPath('/sign-in', isWhiteLabel),
    },
    {
      currentPath: resolveAuthPath('/sign-in', isWhiteLabel),
      description: t`Don't have an account?`,
      label: t`Sign Up`,
      to: resolveAuthPath('/sign-up', isWhiteLabel),
    },
    {
      currentPath: resolveAuthPath('/forgot-password', isWhiteLabel),
      description: t`Remember your password?`,
      label: t`Sign In`,
      to: resolveAuthPath('/sign-in', isWhiteLabel),
    },
    {
      currentPath: resolveAuthPath('/reset-password', isWhiteLabel),
      description: t`Changed your mind?`,
      label: t`Go Back`,
      to: resolveAuthPath('/sign-in', isWhiteLabel),
    },
    {
      currentPath: '/two-step-verification',
      description: t`Changed your mind?`,
      label: t`Go Back`,
      to: resolveAuthPath('/sign-in', isWhiteLabel),
    },
  ]

  const action = actions.find((item) => location.pathname === item.currentPath)

  const handleClick = () => {
    if (action) {
      navigate({ to: action.to as NavigateOptions['to'] })
    }
  }

  return (
    <div
      className={cn(
        'flex items-center gap-4',
        isWhiteLabel ? 'justify-end' : 'justify-between',
        className,
      )}
    >
      {!isWhiteLabel && <Logo className={logoClassName} />}

      {action && (
        <div className='flex items-center gap-2'>
          <div className='hidden text-13 text-gray-10 sm:block'>
            {action.description}
          </div>
          <Button
            color='gray'
            label={action.label}
            variant='outline'
            onClick={handleClick}
          />
        </div>
      )}
    </div>
  )
}

AuthHeader.displayName = 'AuthHeader'
export default AuthHeader
