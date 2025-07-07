import { Menu as Primitive } from '@mantine/core'
import { cn } from '@/utils'

interface Props {
  className?: string
}

const MenuDivider: React.FC<Props> = ({ className }) => {
  return (
    <Primitive.Divider
      className={cn('my-1.5 border-gray-100 dark:border-gray-150', className)}
    />
  )
}

export default MenuDivider
