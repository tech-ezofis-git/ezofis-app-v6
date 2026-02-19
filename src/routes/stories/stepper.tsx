import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import Stepper from '@/components/base/Stepper'
import StoryCode from './-components/StoryCode'
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

function RouteComponent() {
  const [active, setActive] = useState(1)

  return (
    <div className='max-w-4xl p-6'>
      <StoryTitle>Stepper</StoryTitle>
      <p className='text-15 text-gray-11 mb-10'>
        The Stepper component provides a visual progress indicator for multi-step workflows. It guides users through a sequence of tasks, showing completed, active, and upcoming steps, along with optional descriptions and state feedback.
      </p>

      <p className='text-14 text-gray-11 mb-4'>Before using Stepper, import it from its location:</p>
      <StoryCode>
        {`import Stepper from '@/components/base/Stepper'`}
      </StoryCode>

      <div className='space-y-16'>
        {/* Default Section */}
        <section>
          <StorySubTitle>Default Usage</StorySubTitle>
          <p className='text-14 text-gray-11 mb-4'>
            A standard horizontal stepper with descriptions for each step.
          </p>
          <StoryCode>
            {`const steps = [
  { id: 1, label: 'Step 1', description: 'Secure Your Account' },
  { id: 2, label: 'Step 2', description: 'Tell Us About You' },
]

<Stepper active={active} steps={steps} setActive={setActive} />`}
          </StoryCode>
          <div className='mt-8 p-6 bg-gray-1 border border-gray-3 rounded-xl'>
            <Stepper active={active} steps={steps} setActive={setActive} />
          </div>
        </section>

        {/* States Section */}
        <section>
          <StorySubTitle>Step States (Disabled & Loading)</StorySubTitle>
          <p className='text-14 text-gray-11 mb-4'>
            Individual steps can be marked as <code>disabled</code> (cannot be selected) or <code>loading</code> (shows a spinner).
          </p>
          <div className='space-y-8 mt-6 p-6 bg-gray-1 border border-gray-3 rounded-xl'>
            <div className='space-y-3'>
              <p className='text-13 font-medium text-gray-11'>Step 3 is Disabled</p>
              <Stepper
                active={active}
                steps={steps.map(s => s.id === 3 ? { ...s, disabled: true } : s)}
                setActive={setActive}
              />
            </div>
            <div className='space-y-3'>
              <p className='text-13 font-medium text-gray-11'>Step 2 is Loading</p>
              <Stepper
                active={active}
                steps={steps.map(s => s.id === 2 ? { ...s, loading: true } : s)}
                setActive={setActive}
              />
            </div>
          </div>
        </section>

        {/* Orientation Section */}
        <section>
          <StorySubTitle>Vertical Orientation</StorySubTitle>
          <p className='text-14 text-gray-11 mb-4'>
            Change the <code>orientation</code> prop to 'vertical' for side-aligned workflows or mobile screens.
          </p>
          <div className='mt-8 p-6 bg-gray-1 border border-gray-3 rounded-xl w-fit min-w-80'>
            <Stepper
              active={active}
              orientation='vertical'
              steps={steps}
              setActive={setActive}
            />
          </div>
        </section>
      </div>
    </div>
  )
}
