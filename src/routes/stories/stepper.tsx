import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import Stepper from '@/components/base/Stepper'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/stepper')({
  component: RouteComponent,
})

const steps = [
  { description: 'Secure Your Account', id: 1, label: 'Step 1' },
  { description: 'Tell Us About You', id: 2, label: 'Step 2' },
  { description: 'What Best Describes You?', id: 3, label: 'Step 3' },
  { description: 'What Would You Like to Achieve?', id: 4, label: 'Step 4' },
]

const disabledSteps = [
  { description: 'Secure Your Account', id: 1, label: 'Step 1' },
  { description: 'Tell Us About You', id: 2, label: 'Step 2' },
  {
    description: 'What Best Describes You?',
    disabled: true,
    id: 3,
    label: 'Step 3',
  },
  { description: 'What Would You Like to Achieve?', id: 4, label: 'Step 4' },
]

const loadingSteps = [
  { description: 'Secure Your Account', id: 1, label: 'Step 1' },
  { description: 'Tell Us About You', id: 2, label: 'Step 2' },
  {
    description: 'What Best Describes You?',
    id: 3,
    label: 'Step 3',
    loading: true,
  },
  { description: 'What Would You Like to Achieve?', id: 4, label: 'Step 4' },
]

function RouteComponent() {
  const [active, setActive] = useState(1)

  return (
    <div>
      <StoryTitle>35. Stepper</StoryTitle>

      <div className='space-y-16'>
        <StorySubTitle>Default</StorySubTitle>
        <Stepper active={active} steps={steps} setActive={setActive} />

        <StorySubTitle>Disabled</StorySubTitle>
        <Stepper active={active} steps={disabledSteps} setActive={setActive} />

        <StorySubTitle>Loading</StorySubTitle>
        <Stepper active={active} steps={loadingSteps} setActive={setActive} />

        <StorySubTitle>Orientation</StorySubTitle>
        <Stepper
          active={active}
          orientation='vertical'
          steps={steps}
          setActive={setActive}
        />
      </div>
    </div>
  )
}
