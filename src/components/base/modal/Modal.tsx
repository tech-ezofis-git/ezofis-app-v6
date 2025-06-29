import { Modal as Primitive } from '@mantine/core'
import { cn } from '@/utils'

interface Props {
  children: React.ReactNode
  isOpened: boolean
  closeOnInteractOutside?: boolean
  isFullScreen?: boolean
  width?: number | string
  onClose: () => void
}

const Modal: React.FC<Props> = ({
  children,
  closeOnInteractOutside = true,
  isFullScreen,
  isOpened,
  onClose,
  width,
}) => {
  return (
    <Primitive
      closeOnClickOutside={closeOnInteractOutside}
      closeOnEscape={closeOnInteractOutside}
      fullScreen={isFullScreen}
      opened={isOpened}
      overlayProps={{ blur: 3 }}
      size={width}
      withCloseButton={false}
      centered
      classNames={{
        body: 'p-0',
        content: cn('bg-body', isFullScreen ? 'rounded-none' : 'rounded-lg'),
        overlay: 'bg-gray-800/60 dark:bg-gray-200/60',
      }}
      onClose={onClose}
    >
      {children}
    </Primitive>
  )
}

export default Modal
