import { Modal as Base } from '@mantine/core'
import React from 'react'
import cn from '@/utils/cn'

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
  width,
  onClose,
}) => {
  const classNames = {
    body: 'p-0',
    content: cn('bg-surface', isFullScreen ? 'rounded-none' : 'rounded-lg'),
    overlay: 'bg-overlay/60',
  }

  return (
    <Base
      classNames={classNames}
      closeOnClickOutside={closeOnInteractOutside}
      closeOnEscape={closeOnInteractOutside}
      fullScreen={isFullScreen}
      opened={isOpened}
      overlayProps={{ blur: 3 }}
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
