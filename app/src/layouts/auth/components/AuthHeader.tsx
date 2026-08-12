import { useLocation, useNavigate } from '@tanstack/react-router'
import { useLingui } from '@lingui/react/macro'
import Button from '@/components/base/button/Button'
import Logo from '@/components/common/Logo'
import cn from '@/utils/cn'

interface Props {
  className?: string
  logoClassName?: string
}

const AuthHeader = ({ className, logoClassName }: Props) => {
  const { t } = useLingui()
  const location = useLocation()
  const navigate = useNavigate()

  const actions = [
    {
      currentPath: '/sign-up',
      description: t`Already have an account?`,
      label: t`Sign In`,
      to: '/sign-in',
    },
    {
      currentPath: '/sign-in',
      description: t`Don't have an account?`,
      label: t`Sign Up`,
      to: '/sign-up',
    },
    {
      currentPath: '/forgot-password',
      description: t`Remember your password?`,
      label: t`Sign In`,
      to: '/sign-in',
    },
    {
      currentPath: '/reset-password',
      description: t`Changed your mind?`,
      label: t`Go Back`,
      to: '/sign-in',
    },
    {
      currentPath: '/two-step-verification',
      description: t`Changed your mind?`,
      label: t`Go Back`,
      to: '/sign-in',
    },
  ]

  const action = actions.find(
    (item) => location.pathname === item.currentPath,
  )

  const handleClick = () => {
    if (action) {
      navigate({ to: action.to })
    }
  }

  return (
    <div className={cn('flex items-center justify-between gap-4', className)}>
      <Logo className={logoClassName} />

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
