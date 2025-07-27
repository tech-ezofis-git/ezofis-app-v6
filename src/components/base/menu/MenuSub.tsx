import { Menu as Base } from '@mantine/core'
import Icon from '@/components/base/Icon'
import cn from '@/utils/cn'

interface Props {
  children: React.ReactNode
  label: string
  disabled?: boolean
  icon?: string
  iconClass?: string
  width?: number
}

const MenuSub: React.FC<Props> = ({
  children,
  disabled,
  icon,
  iconClass,
  label,
  width,
}) => {
  return (
    <Base.Sub transitionProps={{ transition: 'pop' }} width={width}>
      <Base.Sub.Target>
        <Base.Sub.Item
          disabled={disabled}
          leftSection={
            icon && (
              <Icon className={cn('text-gray-500', iconClass)} name={icon} />
            )
          }
          rightSection={
            <Icon className='text-gray-500' name='tabler:chevron-right' />
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
