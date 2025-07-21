import { Tabs as Primitive } from '@mantine/core'
import { Icon } from '@/components/base'

interface Props {
  label: string
  value: string
  icon?: string
  iconClass?: string
  isDisabled?: boolean
}

const Tab: React.FC<Props> = ({
  icon,
  iconClass,
  isDisabled,
  label,
  value,
}) => {
  return (
    <Primitive.Tab
      disabled={isDisabled}
      leftSection={icon && <Icon className={iconClass} name={icon} />}
      value={value}
    >
      {label}
    </Primitive.Tab>
  )
}

Tab.displayName = 'Tab'
export default Tab
