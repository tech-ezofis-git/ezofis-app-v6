import { useLingui } from '@lingui/react/macro'
import { Stepper } from '@mantine/core'

type Props = {
  activeStep: 0 | 1 | 2
}

export default function FlowProgress({ activeStep }: Props) {
  const { t } = useLingui()

  return (
    <Stepper active={activeStep} radius='xl' size='sm'>
      <Stepper.Step
        description={t`Prepare your file`}
        label={t`Template & Upload`}
      />
      <Stepper.Step description={t`Align data fields`} label={t`Map Columns`} />
      <Stepper.Step
        description={t`Validate & submit`}
        label={t`Preview & Confirm`}
      />
    </Stepper>
  )
}
