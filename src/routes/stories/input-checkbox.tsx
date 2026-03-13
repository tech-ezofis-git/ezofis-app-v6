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
      <p className='mb-10 text-15 text-gray-11'>
        The Input Checkbox component allows users to select one or more options
        from a set. It can also stand alone for binary choices (e.g., terms and
        conditions).
      </p>

      <p className='mb-4 text-14 text-gray-11'>
        Before using InputCheckbox, import it from its location:
      </p>
      <StoryCode>
        {`import InputCheckbox from '@/components/base/inputs/InputCheckbox'`}
      </StoryCode>

      <div className='space-y-16'>
        {/* Default Section */}
        <section>
          <StorySubTitle>Default Usage</StorySubTitle>
          <p className='mb-4 text-14 text-gray-11'>
            A simple checkbox with a label.
          </p>
          <StoryCode>
            {`<InputCheckbox checked={checked} label='I agree to the terms' onChange={setChecked} />`}
          </StoryCode>
          <div className='ml-1 flex max-w-sm items-center gap-4'>
            <InputCheckbox
              checked={checked}
              label='I agree to the terms'
              onChange={setChecked}
            />
          </div>
        </section>

        {/* Metadata Section */}
        <section>
          <StorySubTitle>Metadata (Description)</StorySubTitle>
          <p className='mb-4 text-14 text-gray-11'>
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
          <div className='ml-1 flex max-w-sm items-center gap-4'>
            <InputCheckbox
              checked={checked}
              description='Receive email updates about your account activity'
              label='Notifications'
              onChange={setChecked}
            />
          </div>
        </section>

        {/* States Section */}
        <section>
          <StorySubTitle>Interaction States</StorySubTitle>
          <p className='mb-6 text-14 text-gray-11'>
            Visual indicators for different selection and availability states:
          </p>
          <div className='grid max-w-2xl grid-cols-1 gap-8 md:grid-cols-2'>
            <div>
              <p className='mb-3 text-13 font-medium'>Disabled State</p>
              <StoryCode>
                {"<InputCheckbox disabled label='Cannot change' />"}
              </StoryCode>
              <div className='mt-4 ml-1'>
                <InputCheckbox
                  checked={true}
                  label='Cannot change'
                  disabled
                  onChange={() => {}}
                />
              </div>
            </div>
            <div>
              <p className='mb-3 text-13 font-medium'>Error State</p>
              <StoryCode>
                {"<InputCheckbox error='Selection required' />"}
              </StoryCode>
              <div className='mt-4 ml-1'>
                <InputCheckbox
                  checked={checked}
                  error='Selection required'
                  label='Accept terms'
                  onChange={setChecked}
                />
              </div>
            </div>
            <div>
              <p className='mb-3 text-13 font-medium'>Indeterminate State</p>
              <StoryCode>
                {"<InputCheckbox indeterminate label='Partially selected' />"}
              </StoryCode>
              <div className='mt-4 ml-1'>
                <InputCheckbox
                  checked={false}
                  label='Partially selected'
                  indeterminate
                  onChange={setChecked}
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
