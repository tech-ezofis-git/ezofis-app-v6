import { Stepper as Base } from '@mantine/core'
import { motion } from 'motion/react'
import Icon from './icon/Icon'

const MotionStep = motion.create(Base.Step)

export interface Step {
  id: number
  label: string
  clickable?: boolean
  description?: string
  disabled?: boolean
  icon?: string
  loading?: boolean
}

interface Props {
  active: number
  steps: Step[]
  orientation?: 'horizontal' | 'vertical'
  setActive: (step: number) => void
}

const Stepper = ({
  active,
  orientation = 'horizontal',
  steps,
  setActive,
}: Props) => {
  return (
    <Base
      active={active}
      orientation={orientation}
      size='xs'
      classNames={{
        separator: 'rounded-full bg-gray-3',
        step: 'disabled:opacity-50',
        stepBody: 'ml-4',
        stepCompletedIcon: 'text-primary-11 [&>svg]:!size-3.5',
        stepDescription: 'm-0 text-small font-medium text-gray-12',
        stepIcon:
          'border-0 bg-gray-3 text-small font-semibold text-gray-11 data-[completed]:bg-primary-4 data-[progress]:bg-primary-9 data-[progress]:text-white',
        stepLabel: 'text-mini text-gray-10',
        stepLoader: 'after:border-gray-11 after:border-t-transparent',
        verticalSeparator: 'rounded-full border-gray-3 bg-gray-3',
      }}
      onStepClick={setActive}
    >
      {steps.map((step, index) => (
        <MotionStep
          allowStepSelect={step.clickable}
          animate={{ opacity: 1, scale: 1 }}
          description={step.description}
          disabled={step.disabled}
          icon={step.icon ? <Icon name={step.icon} /> : undefined}
          initial={{ opacity: 0, scale: 0.5 }}
          key={step.id}
          label={step.label}
          loading={step.loading}
          transition={{ delay: index * 0.1, duration: 0.25 }}
        />
      ))}
    </Base>
  )
}

Stepper.displayName = 'Stepper'
export default Stepper
