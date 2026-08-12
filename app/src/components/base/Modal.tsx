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
    body: cn('p-0', fullScreen && 'h-full flex-1 flex flex-col min-h-0'),
    content: cn(
      'bg-surface shadow-md',
      fullScreen
        ? 'h-screen w-screen max-w-none rounded-none flex flex-col min-h-0'
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
      centered
      onClose={onClose}
    >
      {children}
    </Base>
  )
}

Modal.displayName = 'Modal'
export default Modal
