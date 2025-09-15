import CloseButton from '@/components/base/button/CloseButton'

interface Props {
  title?: string
  onClose: () => void
}

const OverlayHeader = ({ title, onClose }: Props) => {
  return (
    <header className='flex h-15 items-center justify-between border-b border-gray-3 px-4'>
      <h1 className='font-poppins text-lg font-semibold text-gray-13'>
        {title}
      </h1>
      <CloseButton onClick={onClose} />
    </header>
  )
}

OverlayHeader.displayName = 'OverlayHeader'
export default OverlayHeader
