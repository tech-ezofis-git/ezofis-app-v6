import { Menu as Base } from '@mantine/core'
import Icon from '@/components/base/Icon'
import cn from '@/utils/cn'

interface Props {
  label: string
  disabled?: boolean
  icon?: string
  iconClass?: string
  suffixIcon?: string
  suffixIconClass?: string
  onClick?: () => void
}

const MenuItem: React.FC<Props> = ({
  disabled,
  icon,
  iconClass,
  label,
  suffixIcon,
  suffixIconClass,
  onClick,
}) => {
  return (
    <Base.Item
      disabled={disabled}
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
    </Base.Item>
  )
}

MenuItem.displayName = 'MenuItem'
export default MenuItem
