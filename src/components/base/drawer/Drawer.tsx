import type React from 'react'
import { Drawer as Primitive } from '@mantine/core'

interface Props {
  children: React.ReactNode
  isOpened: boolean
  closeOnInteractOutside?: boolean
  position?: 'left' | 'right'
  width?: number | string
  onClose: () => void
}

const Drawer: React.FC<Props> = ({
  children,
  closeOnInteractOutside = true,
  isOpened,
  onClose,
  position = 'right',
  width = 420,
}) => {
  return (
    <Primitive
      closeOnClickOutside={closeOnInteractOutside}
      closeOnEscape={closeOnInteractOutside}
      opened={isOpened}
      overlayProps={{ blur: 3 }}
      position={position}
      size={width}
      withCloseButton={false}
      classNames={{
        body: 'p-0',
        content: 'bg-surface',
        overlay: 'bg-overlay/60',
      }}
      onClose={onClose}
    >
      {children}
    </Primitive>
  )
}

export default Drawer
