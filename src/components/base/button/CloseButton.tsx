import IconButton from './IconButton'

interface Props {
  className?: string
  onClick: () => void
}

const CloseButton = ({ className, onClick }: Props) => {
  return (
    <IconButton
      ariaLabel='Close'
      className={className}
      color='gray'
      icon='lucide:x'
      variant='ghost'
      onClick={onClick}
    />
  )
}

CloseButton.displayName = 'CloseButton'
export default CloseButton
