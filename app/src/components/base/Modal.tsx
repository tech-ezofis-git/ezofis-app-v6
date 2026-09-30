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
    body: cn('p-0', fullScreen && 'flex h-full min-h-0 flex-1 flex-col'),
    content: cn(
      'bg-surface shadow-md',
      fullScreen
        ? 'flex h-screen min-h-0 w-screen max-w-none flex-col rounded-none'
        : 'rounded-lg',
    ),
    overlay: 'bg-[var(--overlay-backdrop)]',
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
      zIndex={30000}
      centered
      onClose={onClose}
    >
      {children}
    </Base>
  )
}

Modal.displayName = 'Modal'
export default Modal
