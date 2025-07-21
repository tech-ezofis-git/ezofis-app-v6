import { Menu as Primitive } from '@mantine/core'
import { Icon } from '@/components/base'
import { cn } from '@/utils'

interface Props {
  children: React.ReactNode
  label: string
  icon?: string
  iconClass?: string
  isDisabled?: boolean
  width?: number
}

const MenuSub: React.FC<Props> = ({
  children,
  icon,
  iconClass,
  isDisabled,
  label,
  width,
}) => {
  return (
    <Primitive.Sub transitionProps={{ transition: 'pop' }} width={width}>
      <Primitive.Sub.Target>
        <Primitive.Sub.Item
          disabled={isDisabled}
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
        </Primitive.Sub.Item>
      </Primitive.Sub.Target>
      <Primitive.Sub.Dropdown>{children}</Primitive.Sub.Dropdown>
    </Primitive.Sub>
  )
}

MenuSub.displayName = 'MenuSub'
export default MenuSub
