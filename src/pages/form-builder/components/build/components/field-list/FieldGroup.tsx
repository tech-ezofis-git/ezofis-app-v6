import type { ReactNode } from 'react'
import { Accordion } from '@mantine/core'

interface Props {
  children: ReactNode
  label: string
}

const FieldGroup = ({ children, label }: Props) => {
  return (
    <Accordion.Item value={label}>
      <Accordion.Control>{label}</Accordion.Control>
      <Accordion.Panel>{children}</Accordion.Panel>
    </Accordion.Item>
  )
}

FieldGroup.displayName = 'FieldGroup'
export default FieldGroup
