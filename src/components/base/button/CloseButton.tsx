import IconButton from './IconButton'

interface Props {
  onClick: () => void
}

const CloseButton: React.FC<Props> = ({ onClick }) => {
  return (
    <IconButton
      ariaLabel='Close'
      color='gray'
      icon='tabler:x'
      iconClass='text-gray-600'
      variant='ghost'
      onClick={onClick}
    />
  )
}

export default CloseButton
