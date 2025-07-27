import { Menu as Base } from '@mantine/core'
import cn from '@/utils/cn'

interface Props {
  children: React.ReactNode
  className?: string
}

const MenuLabel: React.FC<Props> = ({ children, className }) => {
  const computedClassName = cn(
    'flex h-7 items-center px-2 py-0 text-sx font-medium text-gray-500',
    className,
  )

  return <Base.Label className={computedClassName}>{children}</Base.Label>
}

MenuLabel.displayName = 'MenuLabel'
export default MenuLabel
