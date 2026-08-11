import type { ButtonSize } from './types'
import IconButton from './IconButton'

interface Props {
  className?: string
  size?: ButtonSize
  onClick: () => void
}

const CloseButton = ({ className, size = 'md', onClick }: Props) => {
  return (
    <IconButton
      ariaLabel='Close'
      className={className}
      color='gray'
      icon='lucide:x'
      size={size}
      variant='ghost'
      onClick={onClick}
    />
  )
}

CloseButton.displayName = 'CloseButton'
export default CloseButton
