import type { ReactNode } from 'react'
import { Accordion as Base } from '@mantine/core'

interface Props {
  children: ReactNode
}

const Accordion = ({ children }: Props) => {
  return <Base>{children}</Base>
}

Accordion.displayName = 'Accordion'
export default Accordion
