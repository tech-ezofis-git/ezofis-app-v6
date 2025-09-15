import IconButton from './IconButton'

interface Props {
  onClick: () => void
}

const CloseButton = ({ onClick }: Props) => {
  return (
    <IconButton
      ariaLabel='Close'
      color='gray'
      icon='tabler:x'
      variant='ghost'
      onClick={onClick}
    />
  )
}

CloseButton.displayName = 'CloseButton'
export default CloseButton
