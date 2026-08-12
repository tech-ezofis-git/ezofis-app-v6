import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import Icon from '@/components/base/icon/Icon'
import InputPassword from '@/components/base/inputs/password/InputPassword'
import StoryCode from './-components/StoryCode'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/input-password')({
  component: RouteComponent,
})

function RouteComponent() {
  const [value, setValue] = useState('')

  return (
    <div className='max-w-4xl p-6'>
      <StoryTitle>Input Password</StoryTitle>
      <p className='mb-10 text-15 text-gray-11'>
        The Input Password component provides a secure way for users to enter
        passwords. It includes a built-in visibility toggle and supports labels,
        descriptions, and validation states.
      </p>

      <p className='mb-4 text-14 text-gray-11'>
        Before using InputPassword, import it from its location:
      </p>
      <StoryCode>
        {`import InputPassword from '@/components/base/inputs/password/InputPassword'`}
      </StoryCode>

      <div className='space-y-16'>
        {/* Default Section */}
        <section>
          <StorySubTitle>Default Usage</StorySubTitle>
          <p className='mb-4 text-14 text-gray-11'>
            A standard password input with a visibility toggle.
          </p>
          <StoryCode>
            {`<InputPassword value={value} onChange={setValue} />`}
          </StoryCode>
          <div className='flex max-w-sm items-center gap-4'>
            <InputPassword
              className='w-full'
              value={value}
              onChange={setValue}
            />
          </div>
        </section>

        {/* Meta Section */}
        <section>
          <StorySubTitle>Metadata (Label, Description, Tooltip)</StorySubTitle>
          <p className='mb-4 text-14 text-gray-11'>
            Guide users with contextual information and necessity indicators:
          </p>
          <ul className='mb-6 ml-2 list-inside list-disc space-y-2 text-14 text-gray-11'>
            <li>
              <strong>Label:</strong> A title for the password field.
            </li>
            <li>
              <strong>Description:</strong> Security requirements or hints.
            </li>
            <li>
              <strong>Tooltip:</strong> Detailed help text.
            </li>
            <li>
              <strong>Required / Optional:</strong> Visual necessity indicators.
            </li>
          </ul>
          <StoryCode>
            {`<InputPassword
  label='Password'
  description='Must be at least 8 characters long'
  showPlaceholder
  tooltip='Include uppercase and symbols'
  required
  value={value}
  onChange={setValue}
/>`}
          </StoryCode>
          <div className='flex max-w-sm items-center gap-4'>
            <InputPassword
              className='w-full'
              description='Must be at least 8 characters long'
              label='Password'
              tooltip='Include uppercase and symbols'
              value={value}
              required
              showPlaceholder
              onChange={setValue}
            />
          </div>
        </section>

        {/* States Section */}
        <section>
          <StorySubTitle>States</StorySubTitle>
          <p className='mb-6 text-14 text-gray-11'>
            Visual indicators for different interaction levels:
          </p>
          <div className='grid max-w-2xl grid-cols-1 gap-8 md:grid-cols-2'>
            <div>
              <p className='mb-3 text-13 font-medium'>Disabled State</p>
              <StoryCode>
                {"<InputPassword disabled value='password123' />"}
              </StoryCode>
              <InputPassword value='password123' disabled onChange={() => {}} />
            </div>
            <div>
              <p className='mb-3 text-13 font-medium'>Error State</p>
              <StoryCode>
                {"<InputPassword error='Incorrect password' />"}
              </StoryCode>
              <InputPassword
                error='Incorrect password'
                value={value}
                onChange={setValue}
              />
            </div>
          </div>
        </section>

        {/* Sections Section */}
        <section>
          <StorySubTitle>Left Section</StorySubTitle>
          <p className='mb-4 text-14 text-gray-11'>
            Embed icons at the start of the input for better visual context:
          </p>
          <StoryCode>
            {`<InputPassword leftSection={<Icon name='lucide:lock' />} />`}
          </StoryCode>
          <div className='flex max-w-sm items-center gap-4'>
            <InputPassword
              className='w-full'
              leftSection={<Icon className='text-gray-9' name='lucide:lock' />}
              value={value}
              onChange={setValue}
            />
          </div>
        </section>
      </div>
    </div>
  )
}
