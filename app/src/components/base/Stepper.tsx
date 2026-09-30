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
  status?: StepStatus
}

export type StepStatus = 'active' | 'upcoming' | 'completed'

interface Props {
  active: number
  steps: Step[]
  orientation?: 'horizontal' | 'vertical'
  setActive: (step: number) => void
}

const resolveStatus = (
  index: number,
  active: number,
  status?: StepStatus,
): StepStatus => {
  if (status) return status
  if (index < active) return 'completed'
  if (index === active) return 'active'
  return 'upcoming'
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
        stepBody: 'ml-3',
        stepCompletedIcon: 'text-primary-11 [&>svg]:!size-3.5',
        stepDescription: 'text-xs/5 text-gray-10',
        stepIcon:
          'border border-gray-5 bg-transparent text-13 font-semibold text-gray-9 data-[completed]:border-transparent data-[completed]:bg-primary-4 data-[completed]:text-primary-11 data-[progress]:border-transparent data-[progress]:bg-primary-9 data-[progress]:text-white',
        stepLabel: 'm-0 text-13/6 font-medium text-gray-12',
        stepLoader: 'after:border-gray-11 after:border-t-transparent',
        verticalSeparator: 'rounded-full border-gray-3 bg-gray-3',
      }}
      onStepClick={setActive}
    >
      {steps.map((step, index) => {
        const status = resolveStatus(index, active, step.status)

        return (
          <MotionStep
            allowStepSelect={step.clickable}
            animate={{ opacity: 1, scale: 1 }}
            completedIcon={<Icon name='lucide:check' />}
            data-status={status}
            description={step.description}
            disabled={step.disabled}
            icon={step.icon ? <Icon name={step.icon} /> : undefined}
            initial={{ opacity: 0, scale: 0.5 }}
            key={step.id}
            label={step.label}
            loading={step.loading}
            transition={{ delay: index * 0.1, duration: 0.25 }}
          />
        )
      })}
    </Base>
  )
}

Stepper.displayName = 'Stepper'
export default Stepper
