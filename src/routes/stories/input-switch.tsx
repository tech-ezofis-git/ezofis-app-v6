import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import InputSwitch from '@/components/base/inputs/InputSwitch'
import StoryCode from './-components/StoryCode'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/input-switch')({
  component: RouteComponent,
})

function RouteComponent() {
  const [checked, setChecked] = useState(false)

  return (
    <div className='max-w-4xl p-6'>
      <StoryTitle>Input Switch</StoryTitle>
      <p className='text-15 text-gray-11 mb-10'>
        The Input Switch component is a toggle that allows users to switch between two states (e.g., On/Off). It's commonly used for settings and preferences that take effect immediately.
      </p>

      <p className='text-14 text-gray-11 mb-4'>Before using InputSwitch, import it from its location:</p>
      <StoryCode>
        {`import InputSwitch from '@/components/base/inputs/InputSwitch'`}
      </StoryCode>

      <div className='space-y-16'>
        {/* Default Section */}
        <section>
          <StorySubTitle>Default Usage</StorySubTitle>
          <p className='text-14 text-gray-11 mb-4'>
            A simple toggle switch with a label.
          </p>
          <StoryCode>
            {`<InputSwitch checked={checked} label='Enable Notifications' onChange={setChecked} />`}
          </StoryCode>
          <div className='flex items-center gap-4 max-w-sm ml-1'>
            <InputSwitch checked={checked} label='Enable Notifications' onChange={setChecked} />
          </div>
        </section>

        {/* Metadata Section */}
        <section>
          <StorySubTitle>Metadata (Description)</StorySubTitle>
          <p className='text-14 text-gray-11 mb-4'>
            Add descriptive text to provide more context for the toggle:
          </p>
          <StoryCode>
            {`<InputSwitch
  checked={checked}
  label='Dark Mode'
  description='Switch to a darker color palette for nighttime use'
  onChange={setChecked}
/>`}
          </StoryCode>
          <div className='flex items-center gap-4 max-w-sm ml-1'>
            <InputSwitch
              checked={checked}
              label='Dark Mode'
              description='Switch to a darker color palette for nighttime use'
              onChange={setChecked}
            />
          </div>
        </section>

        {/* States Section */}
        <section>
          <StorySubTitle>Interaction States</StorySubTitle>
          <p className='text-14 text-gray-11 mb-6'>
            Visual indicators for different selection and availability states:
          </p>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl'>
            <div>
              <p className='text-13 font-medium mb-3'>Disabled State</p>
              <StoryCode>{"<InputSwitch disabled label='Subscription Locked' />"}</StoryCode>
              <div className='ml-1 mt-4'>
                <InputSwitch checked={true} disabled label='Subscription Locked' onChange={() => { }} />
              </div>
            </div>
            <div>
              <p className='text-13 font-medium mb-3'>Error State</p>
              <StoryCode>{"<InputSwitch error='Validation failed' />"}</StoryCode>
              <div className='ml-1 mt-4'>
                <InputSwitch checked={checked} error='Validation failed' label='Enable High Security' onChange={setChecked} />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
