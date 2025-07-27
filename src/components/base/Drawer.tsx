import type React from 'react'
import { Drawer as Base } from '@mantine/core'

interface Props {
  children: React.ReactNode
  isOpened: boolean
  closeOnInteractOutside?: boolean
  position?: 'left' | 'right'
  width?: number | string
  onClose: () => void
}

const classNames = {
  body: 'p-0',
  content: 'bg-surface',
  overlay: 'bg-overlay/60',
}

const Drawer: React.FC<Props> = ({
  children,
  closeOnInteractOutside = true,
  isOpened,
  position = 'right',
  width = 420,
  onClose,
}) => {
  return (
    <Base
      classNames={classNames}
      closeOnClickOutside={closeOnInteractOutside}
      closeOnEscape={closeOnInteractOutside}
      opened={isOpened}
      overlayProps={{ blur: 3 }}
      position={position}
      size={width}
      withCloseButton={false}
      onClose={onClose}
    >
      {children}
    </Base>
  )
}

Drawer.displayName = 'Drawer'
export default Drawer
