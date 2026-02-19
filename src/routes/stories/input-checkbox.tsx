import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import InputCheckbox from '@/components/base/inputs/InputCheckbox'
import StoryCode from './-components/StoryCode'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/input-checkbox')({
  component: RouteComponent,
})

function RouteComponent() {
  const [checked, setChecked] = useState(false)

  return (
    <div className='max-w-4xl p-6'>
      <StoryTitle>Input Checkbox</StoryTitle>
      <p className='text-15 text-gray-11 mb-10'>
        The Input Checkbox component allows users to select one or more options from a set. It can also stand alone for binary choices (e.g., terms and conditions).
      </p>

      <p className='text-14 text-gray-11 mb-4'>Before using InputCheckbox, import it from its location:</p>
      <StoryCode>
        {`import InputCheckbox from '@/components/base/inputs/InputCheckbox'`}
      </StoryCode>

      <div className='space-y-16'>
        {/* Default Section */}
        <section>
          <StorySubTitle>Default Usage</StorySubTitle>
          <p className='text-14 text-gray-11 mb-4'>
            A simple checkbox with a label.
          </p>
          <StoryCode>
            {`<InputCheckbox checked={checked} label='I agree to the terms' onChange={setChecked} />`}
          </StoryCode>
          <div className='flex items-center gap-4 max-w-sm ml-1'>
            <InputCheckbox checked={checked} label='I agree to the terms' onChange={setChecked} />
          </div>
        </section>

        {/* Metadata Section */}
        <section>
          <StorySubTitle>Metadata (Description)</StorySubTitle>
          <p className='text-14 text-gray-11 mb-4'>
            Add secondary information or instructions below the label:
          </p>
          <StoryCode>
            {`<InputCheckbox
  checked={checked}
  label='Notifications'
  description='Receive email updates about your account activity'
  onChange={setChecked}
/>`}
          </StoryCode>
          <div className='flex items-center gap-4 max-w-sm ml-1'>
            <InputCheckbox
              checked={checked}
              label='Notifications'
              description='Receive email updates about your account activity'
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
              <StoryCode>{"<InputCheckbox disabled label='Cannot change' />"}</StoryCode>
              <div className='ml-1 mt-4'>
                <InputCheckbox checked={true} disabled label='Cannot change' onChange={() => { }} />
              </div>
            </div>
            <div>
              <p className='text-13 font-medium mb-3'>Error State</p>
              <StoryCode>{"<InputCheckbox error='Selection required' />"}</StoryCode>
              <div className='ml-1 mt-4'>
                <InputCheckbox checked={checked} error='Selection required' label='Accept terms' onChange={setChecked} />
              </div>
            </div>
            <div>
              <p className='text-13 font-medium mb-3'>Indeterminate State</p>
              <StoryCode>{"<InputCheckbox indeterminate label='Partially selected' />"}</StoryCode>
              <div className='ml-1 mt-4'>
                <InputCheckbox checked={false} indeterminate label='Partially selected' onChange={setChecked} />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
