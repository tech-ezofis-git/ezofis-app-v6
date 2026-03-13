import { Stepper } from '@mantine/core'

type Props = {
  activeStep: 0 | 1 | 2
}

export default function FlowProgress({ activeStep }: Props) {
  return (
    <Stepper active={activeStep} radius='xl' size='sm'>
      <Stepper.Step description='Prepare your file' label='Template & Upload' />
      <Stepper.Step description='Align data fields' label='Map Columns' />
      <Stepper.Step description='Validate & submit' label='Preview & Confirm' />
    </Stepper>
  )
}
