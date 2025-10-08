import type { ReactNode } from 'react'
import { Modal as Base } from '@mantine/core'
import cn from '@/utils/cn'

interface Props {
  children: ReactNode
  opened: boolean
  closeOnInteractOutside?: boolean
  fullScreen?: boolean
  width?: number | string
  onClose: () => void
}

const Modal = ({
  children,
  closeOnInteractOutside = true,
  fullScreen,
  opened,
  width,
  onClose,
}: Props) => {
  const classNames = {
    body: 'p-0',
    content: cn(
      'bg-surface shadow-lg',
      fullScreen ? 'rounded-none' : 'rounded-md',
    ),
    overlay: 'bg-overlay/60',
  }

  return (
    <Base
      classNames={classNames}
      closeOnClickOutside={closeOnInteractOutside}
      closeOnEscape={closeOnInteractOutside}
      fullScreen={fullScreen}
      opened={opened}
      size={width}
      withCloseButton={false}
      centered
      onClose={onClose}
    >
      {children}
    </Base>
  )
}

Modal.displayName = 'Modal'
export default Modal
