import { CloseButton } from '@/components/base'

interface Props {
  title?: string
  onClose: () => void
}

const OverlayHeader: React.FC<Props> = ({ onClose, title }) => {
  return (
    <header className='flex h-17 items-center justify-between border-b border-gray-600/5 px-4'>
      <h1 className='font-poppins text-lg font-semibold text-gray-900'>
        {title}
      </h1>
      <CloseButton onClick={onClose} />
    </header>
  )
}

OverlayHeader.displayName = 'OverlayHeader'
export default OverlayHeader
