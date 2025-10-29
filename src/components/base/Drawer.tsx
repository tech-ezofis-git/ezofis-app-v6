import type { ReactNode } from 'react'
import { Drawer as Base } from '@mantine/core'
import cn from '@/utils/cn'

interface Props {
  children: ReactNode
  opened: boolean
  closeOnInteractOutside?: boolean
  offset?: number
  position?: 'left' | 'right'
  width?: number | string
  onClose: () => void
}

const Drawer = ({
  children,
  closeOnInteractOutside = true,
  offset = 8,
  opened,
  position = 'right',
  width = 420,
  onClose,
}: Props) => {
  const classNames = {
    body: 'p-0',
    content: cn('bg-surface', offset && 'rounded-lg'),
    overlay: 'bg-overlay/60',
  }

  return (
    <Base
      classNames={classNames}
      closeOnClickOutside={closeOnInteractOutside}
      closeOnEscape={closeOnInteractOutside}
      offset={offset}
      opened={opened}
      position={position}
      size={width}
      trapFocus={false}
      withCloseButton={false}
      onClose={onClose}
    >
      {children}
    </Base>
  )
}

Drawer.displayName = 'Drawer'
export default Drawer
