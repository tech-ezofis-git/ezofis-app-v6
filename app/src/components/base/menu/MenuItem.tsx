import type { ReactNode } from 'react'
import { Menu as Base } from '@mantine/core'
import Icon from '@/components/base/icon/Icon'
import cn from '@/utils/cn'

interface Props {
  label: string
  className?: string
  disabled?: boolean
  icon?: string
  iconClass?: string
  leftSection?: ReactNode
  rightSection?: ReactNode
  suffixIcon?: string
  suffixIconClass?: string
  onClick?: () => void
}

const MenuItem = ({
  className,
  disabled,
  icon,
  iconClass,
  label,
  leftSection,
  rightSection,
  suffixIcon,
  suffixIconClass,
  onClick,
}: Props) => {
  return (
    <Base.Item
      className={className}
      disabled={disabled}
      leftSection={
        leftSection ??
        (icon && (
          <Icon
            height={16}
            width={16}
            className={cn('size-4 shrink-0 transition-colors', iconClass)}
            name={icon}
          />
        ))
      }
      rightSection={
        rightSection ??
        (suffixIcon && (
          <Icon
            height={16}
            width={16}
            className={cn('size-4 shrink-0 transition-colors', suffixIconClass)}
            name={suffixIcon}
          />
        ))
      }
      onClick={onClick}
    >
      {label}
    </Base.Item>
  )
}

MenuItem.displayName = 'MenuItem'
export default MenuItem
