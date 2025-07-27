import IconButton from '@/components/base/button/IconButton'
import cn from '@/utils/cn'

interface Props {
  className?: string
  onClick: () => void
}

const ClearButton: React.FC<Props> = ({ className, onClick }) => {
  return (
    <IconButton
      ariaLabel='Clear'
      className={cn('size-6 text-gray-500', className)}
      color='gray'
      icon='tabler:x'
      size='xs'
      variant='ghost'
      onClick={onClick}
    />
  )
}

ClearButton.displayName = 'ClearButton'
export default ClearButton
