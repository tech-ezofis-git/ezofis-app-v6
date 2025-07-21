import { Menu as Primitive } from '@mantine/core'
import { cn } from '@/utils'

interface Props {
  children: React.ReactNode
  className?: string
}

const MenuLabel: React.FC<Props> = ({ children, className }) => {
  return (
    <Primitive.Label
      className={cn(
        'flex h-7 items-center px-2 py-0 text-xs font-medium text-gray-500 dark:text-gray-550',
        className,
      )}
    >
      {children}
    </Primitive.Label>
  )
}

export default MenuLabel
