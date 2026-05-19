import type { ButtonSize } from './types'
import IconButton from './IconButton'

interface Props {
  className?: string
  onClick: () => void
  size?: ButtonSize
}

const CloseButton = ({ className, onClick, size = 'md' }: Props) => {
  return (
    <IconButton
      ariaLabel='Close'
      className={className}
      color='gray'
      icon='lucide:x'
      variant='ghost'
      onClick={onClick}
      size={size}
    />
  )
}

CloseButton.displayName = 'CloseButton'
export default CloseButton
