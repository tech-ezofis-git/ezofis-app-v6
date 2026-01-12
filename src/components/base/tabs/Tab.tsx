import { Tabs as Base } from '@mantine/core'
import Icon from '@/components/base/icon/Icon'
import type React from 'react'

interface Props {
  label: string | React.ReactNode
  value: string
  disabled?: boolean
  icon?: string
  iconClass?: string
}

const Tab = ({ disabled, icon, iconClass, label, value }: Props) => {
  return (
    <Base.Tab
      disabled={disabled}
      leftSection={icon && <Icon className={iconClass} name={icon} />}
      value={value}
    >
      {label}
    </Base.Tab>
  )
}

Tab.displayName = 'Tab'
export default Tab