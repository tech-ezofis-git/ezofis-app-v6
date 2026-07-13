import { Accordion as MantineAccordion, type AccordionProps } from '@mantine/core'

const Accordion = ({ children, ...props }: any) => {
  return <MantineAccordion {...props}>{children}</MantineAccordion>
}

Accordion.displayName = 'Accordion'
export default Accordion
