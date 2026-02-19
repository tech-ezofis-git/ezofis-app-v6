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
      <p className='text-15 text-gray-11 mb-10'>
        The Input Password component provides a secure way for users to enter passwords. It includes a built-in visibility toggle and supports labels, descriptions, and validation states.
      </p>

      <p className='text-14 text-gray-11 mb-4'>Before using InputPassword, import it from its location:</p>
      <StoryCode>
        {`import InputPassword from '@/components/base/inputs/password/InputPassword'`}
      </StoryCode>

      <div className='space-y-16'>
        {/* Default Section */}
        <section>
          <StorySubTitle>Default Usage</StorySubTitle>
          <p className='text-14 text-gray-11 mb-4'>
            A standard password input with a visibility toggle.
          </p>
          <StoryCode>
            {`<InputPassword value={value} onChange={setValue} />`}
          </StoryCode>
          <div className='flex items-center gap-4 max-w-sm'>
            <InputPassword className='w-full' value={value} onChange={setValue} />
          </div>
        </section>

        {/* Meta Section */}
        <section>
          <StorySubTitle>Metadata (Label, Description, Tooltip)</StorySubTitle>
          <p className='text-14 text-gray-11 mb-4'>
            Guide users with contextual information and necessity indicators:
          </p>
          <ul className='list-disc list-inside space-y-2 text-14 text-gray-11 mb-6 ml-2'>
            <li><strong>Label:</strong> A title for the password field.</li>
            <li><strong>Description:</strong> Security requirements or hints.</li>
            <li><strong>Tooltip:</strong> Detailed help text.</li>
            <li><strong>Required / Optional:</strong> Visual necessity indicators.</li>
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
          <div className='flex items-center gap-4 max-w-sm'>
            <InputPassword
              className='w-full'
              label='Password'
              description='Must be at least 8 characters long'
              showPlaceholder
              tooltip='Include uppercase and symbols'
              required
              value={value}
              onChange={setValue}
            />
          </div>
        </section>

        {/* States Section */}
        <section>
          <StorySubTitle>States</StorySubTitle>
          <p className='text-14 text-gray-11 mb-6'>
            Visual indicators for different interaction levels:
          </p>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl'>
            <div>
              <p className='text-13 font-medium mb-3'>Disabled State</p>
              <StoryCode>{"<InputPassword disabled value='password123' />"}</StoryCode>
              <InputPassword disabled value='password123' onChange={() => { }} />
            </div>
            <div>
              <p className='text-13 font-medium mb-3'>Error State</p>
              <StoryCode>{"<InputPassword error='Incorrect password' />"}</StoryCode>
              <InputPassword error='Incorrect password' value={value} onChange={setValue} />
            </div>
          </div>
        </section>

        {/* Sections Section */}
        <section>
          <StorySubTitle>Left Section</StorySubTitle>
          <p className='text-14 text-gray-11 mb-4'>
            Embed icons at the start of the input for better visual context:
          </p>
          <StoryCode>
            {`<InputPassword leftSection={<Icon name='lucide:lock' />} />`}
          </StoryCode>
          <div className='flex items-center gap-4 max-w-sm'>
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
