import type { ReactNode } from 'react'
import { Drawer as Base } from '@mantine/core'

interface Props {
  children: ReactNode
  opened: boolean
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

const Drawer = ({
  children,
  closeOnInteractOutside = true,
  opened,
  position = 'right',
  width = 420,
  onClose,
}: Props) => {
  return (
    <Base
      classNames={classNames}
      closeOnClickOutside={closeOnInteractOutside}
      closeOnEscape={closeOnInteractOutside}
      opened={opened}
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
