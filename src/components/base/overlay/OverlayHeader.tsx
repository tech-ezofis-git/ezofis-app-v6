import CloseButton from '@/components/base/button/CloseButton'
import cn from '@/utils/cn'
import Title from '../Title'
import OverlayHeaderWrapper from './OverlayHeaderWrapper'

interface Props {
  title: string
  description?: string
  className?: string
  onClose: () => void
}

const OverlayHeader = ({ className, description, title, onClose }: Props) => {
  return (
    <OverlayHeaderWrapper className={cn('justify-between', className)}>
      <Title description={description} level={3} title={title} />

      <CloseButton onClick={onClose} />
    </OverlayHeaderWrapper>
  )
}

OverlayHeader.displayName = 'OverlayHeader'
export default OverlayHeader
