import { CloseButton } from '@/components/base'

interface Props {
  title?: string
  onClose: () => void
}

const OverlayHeader: React.FC<Props> = ({ onClose, title }) => {
  return (
    <header className='h-15 border-b border-gray-50 py-3 pr-2 pl-4'>
      <div className='flex h-9 items-center justify-between'>
        <h1 className='font-poppins text-lg font-semibold text-fc-1'>
          {title}
        </h1>
        <CloseButton onClick={onClose} />
      </div>
    </header>
  )
}

export default OverlayHeader
