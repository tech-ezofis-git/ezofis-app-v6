import Button from './Button'
import cn from '@/utils/cn'

interface Props {
  className?: string
  label?: string
  onClick: () => void
}

const GoogleButton = ({
  className,
  label = 'Continue with Google',
  onClick,
}: Props) => {
  return (
    <Button
      className={cn('min-w-0 w-full justify-center gap-2', className)}
      color='gray'
      icon='logos:google-icon'
      label={label}
      variant='outline'
      onClick={onClick}
    />
  )
}

GoogleButton.displayName = 'GoogleButton'
export default GoogleButton
