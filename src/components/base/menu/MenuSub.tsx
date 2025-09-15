import type { ReactNode } from 'react'
import { Menu as Base } from '@mantine/core'
import Icon from '@/components/base/icon/Icon'

interface Props {
  children: ReactNode
  label: string
  disabled?: boolean
  icon?: string
  iconClass?: string
  width?: number
}

const MenuSub = ({
  children,
  disabled,
  icon,
  iconClass,
  label,
  width,
}: Props) => {
  return (
    <Base.Sub transitionProps={{ transition: 'pop' }} width={width}>
      <Base.Sub.Target>
        <Base.Sub.Item
          disabled={disabled}
          leftSection={icon && <Icon className={iconClass} name={icon} />}
          rightSection={
            <Icon className='text-gray-9' name='tabler:chevron-right' />
          }
        >
          {label}
        </Base.Sub.Item>
      </Base.Sub.Target>
      <Base.Sub.Dropdown>{children}</Base.Sub.Dropdown>
    </Base.Sub>
  )
}

MenuSub.displayName = 'MenuSub'
export default MenuSub
