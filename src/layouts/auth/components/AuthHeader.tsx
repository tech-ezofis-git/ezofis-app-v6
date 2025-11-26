import { useLocation, useNavigate } from '@tanstack/react-router'
import Button from '@/components/base/button/Button'
import Logo from '@/components/common/Logo'
import cn from '@/utils/cn'

interface Props {
  className?: string
  logoClassName?: string
}

const actions = [
  {
    currentPath: '/sign-up',
    description: 'Already have an account?',
    label: 'Sign In',
    to: '/sign-in',
  },
  {
    currentPath: '/sign-in',
    description: "Don't have an account?",
    label: 'Sign Up',
    to: '/sign-up',
  },
  {
    currentPath: '/forgot-password',
    description: 'Remember your password?',
    label: 'Sign In',
    to: '/sign-in',
  },
  {
    currentPath: '/reset-password',
    description: 'Changed your mind?',
    label: 'Go Back',
    to: '/sign-in',
  },
  {
    currentPath: '/two-step-verification',
    description: 'Changed your mind?',
    label: 'Go Back',
    to: '/sign-in',
  },
]

const AuthHeader = ({ className, logoClassName }: Props) => {
  const location = useLocation()
  const navigate = useNavigate()

  const action = actions.find(
    (action) => location.pathname === action.currentPath,
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
