import Button from './Button'
import cn from '@/utils/cn'

interface Props {
  className?: string
  label?: string
  onClick: () => void
}

const MicrosoftButton = ({
  className,
  label = 'Continue with Microsoft',
  onClick,
}: Props) => {
  return (
    <Button
      className={cn('min-w-0 w-full justify-center gap-2', className)}
      color='gray'
      icon='logos:microsoft-icon'
      label={label}
      variant='outline'
      onClick={onClick}
    />
  )
}

MicrosoftButton.displayName = 'MicrosoftButton'
export default MicrosoftButton
