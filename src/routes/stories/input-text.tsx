import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import Icon from '@/components/base/icon/Icon'
import InputText from '@/components/base/inputs/InputText'
import StoryCode from './-components/StoryCode'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/input-text')({
  component: RouteComponent,
})

function RouteComponent() {
  const [value, setValue] = useState('')

  return (
    <div className='max-w-4xl p-6'>
      <StoryTitle>Input Text</StoryTitle>
      <p className='mb-10 text-15 text-gray-11'>
        Input Text component is use to allow users to enter and edit text. It
        supports labels, descriptions, errors, and various other configurations
        like icons and clear buttons.
      </p>

      <p className='mb-4 text-14 text-gray-11'>
        Before using InputText, import it from its location:
      </p>
      <StoryCode>
        {`import InputText from '@/components/base/inputs/InputText'`}
      </StoryCode>

      <div className='space-y-16'>
        {/* Default Section */}
        <section>
          <StorySubTitle>Default Usage</StorySubTitle>
          <p className='mb-4 text-14 text-gray-11'>
            A simple text input with no extra metadata.
          </p>
          <StoryCode>
            {`<InputText value={value} onChange={setValue} />`}
          </StoryCode>
          <div className='flex max-w-sm items-center gap-4'>
            <InputText className='w-full' value={value} onChange={setValue} />
          </div>
        </section>

        {/* Meta Section */}
        <section>
          <StorySubTitle>Metadata (Label, Description, Tooltip)</StorySubTitle>
          <p className='mb-4 text-14 text-gray-11'>
            You can add labels, descriptions, tooltips, and mark fields as
            required or optional:
          </p>
          <ul className='mb-6 ml-2 list-inside list-disc space-y-2 text-14 text-gray-11'>
            <li>
              <strong>Label:</strong> Provides a title for the input.
            </li>
            <li>
              <strong>Description:</strong> Offers additional context below the
              label.
            </li>
            <li>
              <strong>Tooltip:</strong> Shows extra information on hover (info
              icon).
            </li>
            <li>
              <strong>Required / Optional:</strong> Visual indicators for field
              necessity.
            </li>
          </ul>
          <StoryCode>
            {`<InputText
  label='Username'
  description='Choose a unique username'
  placeholder='e.g. johndoe'
  tooltip='Only letters and numbers are allowed'
  required
  value={value}
  onChange={setValue}
/>`}
          </StoryCode>
          <div className='flex max-w-sm items-center gap-4'>
            <InputText
              className='w-full'
              description='Choose a unique username'
              label='Username'
              placeholder='e.g. johndoe'
              tooltip='Only letters and numbers are allowed'
              value={value}
              required
              onChange={setValue}
            />
          </div>
        </section>

        {/* States Section */}
        <section>
          <StorySubTitle>States</StorySubTitle>
          <p className='mb-6 text-14 text-gray-11'>
            The input supports different states to reflect user interaction and
            validation:
          </p>
          <div className='grid max-w-2xl grid-cols-1 gap-8 md:grid-cols-2'>
            <div>
              <p className='mb-3 text-13 font-medium'>Disabled State</p>
              <StoryCode>
                {"<InputText disabled value='Disabled value' />"}
              </StoryCode>
              <InputText value='Disabled value' disabled onChange={() => {}} />
            </div>
            <div>
              <p className='mb-3 text-13 font-medium'>Error State</p>
              <StoryCode>{"<InputText error='Invalid input' />"}</StoryCode>
              <InputText
                error='This field is required'
                value={value}
                onChange={setValue}
              />
            </div>
            <div>
              <p className='mb-3 text-13 font-medium'>Read Only State</p>
              <StoryCode>
                {"<InputText readOnly value='Cannot edit this' />"}
              </StoryCode>
              <InputText
                value='Cannot edit this'
                readOnly
                onChange={() => {}}
              />
            </div>
          </div>
        </section>

        {/* Sections Section */}
        <section>
          <StorySubTitle>Left & Right Sections</StorySubTitle>
          <p className='mb-4 text-14 text-gray-11'>
            You can embed icons or other components at the start or end of the
            input:
          </p>
          <StoryCode>
            {`<InputText 
  leftSection={<Icon name='lucide:search' />} 
  placeholder='Search...' 
/>`}
          </StoryCode>
          <div className='flex max-w-sm flex-wrap items-center gap-4'>
            <InputText
              className='w-full'
              placeholder='Search...'
              value={value}
              leftSection={
                <Icon className='text-gray-9' name='lucide:search' />
              }
              onChange={setValue}
            />
            <InputText
              className='w-full'
              placeholder='Pick a date'
              value={value}
              rightSection={
                <Icon className='text-gray-9' name='lucide:calendar' />
              }
              onChange={setValue}
            />
          </div>
        </section>

        {/* Clearable Section */}
        <section>
          <StorySubTitle>Clearable</StorySubTitle>
          <p className='mb-4 text-14 text-gray-11'>
            Enabling the `clearable` prop adds a button to remove the input
            value.
          </p>
          <StoryCode>
            {`<InputText clearable value={value} onChange={setValue} />`}
          </StoryCode>
          <div className='flex max-w-sm items-center gap-4'>
            <InputText
              className='w-full'
              placeholder='Type something to see clear button'
              value={value}
              clearable
              onChange={setValue}
            />
          </div>
        </section>
      </div>
    </div>
  )
}
