import IconButton from './IconButton'

interface Props {
  onClick: () => void
}

const CloseButton: React.FC<Props> = ({ onClick }) => {
  return (
    <IconButton
      ariaLabel='Close'
      className='text-gray-600'
      color='gray'
      icon='tabler:x'
      variant='ghost'
      onClick={onClick}
    />
  )
}

export default CloseButton
