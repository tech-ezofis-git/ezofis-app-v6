import CloseButton from '@/components/base/button/CloseButton'

interface Props {
  title?: string
  onClose: () => void
}

const OverlayHeader = ({ title, onClose }: Props) => {
  return (
    <header className='flex h-15 items-center justify-between border-b border-gray-3 px-6 xl:px-10'>
      <h1 className='m-0 font-poppins text-base font-semibold text-gray-13'>
        {title}
      </h1>
      <CloseButton onClick={onClose} />
    </header>
  )
}

OverlayHeader.displayName = 'OverlayHeader'
export default OverlayHeader
