import CloseButton from '@/components/base/button/CloseButton'
import OverlayHeaderWrapper from './OverlayHeaderWrapper'

interface Props {
  title: string
  onClose: () => void
}

const OverlayHeader = ({ title, onClose }: Props) => {
  return (
    <OverlayHeaderWrapper className='justify-between'>
      <h1 className='m-0 text-15 font-semibold text-gray-13'>{title}</h1>
      <CloseButton onClick={onClose} />
    </OverlayHeaderWrapper>
  )
}

OverlayHeader.displayName = 'OverlayHeader'
export default OverlayHeader
