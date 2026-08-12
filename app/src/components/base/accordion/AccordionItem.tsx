import type { ReactNode } from 'react'
import { Accordion as Base } from '@mantine/core'

interface Props {
  children: ReactNode
  label: string
  value: string
}

const AccordionItem = ({ children, label, value }: Props) => {
  return (
    <Base.Item value={value}>
      <Base.Control className='p-0 text-15! font-semibold! text-gray-12!'>
        {label}
      </Base.Control>
      <Base.Panel>{children}</Base.Panel>
    </Base.Item>
  )
}

AccordionItem.displayName = 'AccordionItem'
export default AccordionItem
