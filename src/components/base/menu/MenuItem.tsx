import { Menu as Primitive } from '@mantine/core'
import { Icon } from '@/components/base'
import { cn } from '@/utils'

interface Props {
  label: string
  icon?: string
  iconClass?: string
  isDisabled?: boolean
  suffixIcon?: string
  suffixIconClass?: string
  onClick?: () => void
}

const MenuItem: React.FC<Props> = ({
  icon,
  iconClass,
  isDisabled,
  label,
  onClick,
  suffixIcon,
  suffixIconClass,
}) => {
  return (
    <Primitive.Item
      disabled={isDisabled}
      leftSection={
        icon && <Icon className={cn('text-gray-500', iconClass)} name={icon} />
      }
      rightSection={
        suffixIcon && (
          <Icon
            className={cn('text-gray-500', suffixIconClass)}
            name={suffixIcon}
          />
        )
      }
      onClick={onClick}
    >
      {label}
    </Primitive.Item>
  )
}

MenuItem.displayName = 'MenuItem'
export default MenuItem
