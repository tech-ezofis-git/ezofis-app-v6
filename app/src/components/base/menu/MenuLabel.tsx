import type { ReactNode } from 'react'
import { Menu as Base } from '@mantine/core'
import cn from '@/utils/cn'

interface Props {
  children: ReactNode
  className?: string
}

const MenuLabel = ({ children, className }: Props) => {
  const _className = cn(
    'flex h-6 items-center px-2 py-0 text-12 text-gray-10',
    className,
  )

  return <Base.Label className={_className}>{children}</Base.Label>
}

MenuLabel.displayName = 'MenuLabel'
export default MenuLabel
