import IconButton from '@/components/base/button/IconButton'

interface Props {
  className?: string
  onClick: () => void
}

const ClearButton = ({ className, onClick }: Props) => {
  return (
    <IconButton
      ariaLabel='Clear'
      className={className}
      color='gray'
      icon='tabler:x'
      size='sm'
      variant='ghost'
      onClick={onClick}
    />
  )
}

ClearButton.displayName = 'ClearButton'
export default ClearButton
