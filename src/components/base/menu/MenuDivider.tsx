import { Menu as Primitive } from '@mantine/core'
import { cn } from '@/utils'

interface Props {
  className?: string
}

const MenuDivider: React.FC<Props> = ({ className }) => {
  return (
    <Primitive.Divider className={cn('my-1.5 border-gray-600/10', className)} />
  )
}

MenuDivider.displayName = 'MenuDivider'
export default MenuDivider
