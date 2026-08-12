import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import InputTime from '@/components/base/inputs/InputTime'
import StoryCode from './-components/StoryCode'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/input-time')({
  component: RouteComponent,
})

function RouteComponent() {
  const [value, setValue] = useState('')

  return (
    <div className='max-w-4xl p-6'>
      <StoryTitle>Input Time</StoryTitle>
      <p className='mb-10 text-15 text-gray-11'>
        The Input Time component allows users to enter or select a specific time
        of day. It supports time range constraints, validation states, and
        clearable inputs.
      </p>

      <p className='mb-4 text-14 text-gray-11'>
        Before using InputTime, import it from its location:
      </p>
      <StoryCode>
        {`import InputTime from '@/components/base/inputs/InputTime'`}
      </StoryCode>

      <div className='space-y-16'>
        {/* Default Section */}
        <section>
          <StorySubTitle>Default Usage</StorySubTitle>
          <p className='mb-4 text-14 text-gray-11'>
            A standard time picker for 24-hour or 12-hour time entry.
          </p>
          <StoryCode>
            {`<InputTime value={value} onChange={setValue} />`}
          </StoryCode>
          <div className='ml-1 flex max-w-sm items-center gap-4'>
            <InputTime className='w-full' value={value} onChange={setValue} />
          </div>
        </section>

        {/* Meta Section */}
        <section>
          <StorySubTitle>Metadata (Label, Description, Tooltip)</StorySubTitle>
          <p className='mb-4 text-14 text-gray-11'>
            Configure headings and help text to provide context for the time
            input:
          </p>
          <ul className='mb-6 ml-2 list-inside list-disc space-y-2 text-14 text-gray-11'>
            <li>
              <strong>Label:</strong> A title for the time field.
            </li>
            <li>
              <strong>Description:</strong> Contextual help text below the
              label.
            </li>
            <li>
              <strong>Tooltip:</strong> Detailed info on hover.
            </li>
            <li>
              <strong>Required / Optional:</strong> Visual necessity indicators.
            </li>
          </ul>
          <StoryCode>
            {`<InputTime
  label='Appointment Time'
  description='Select your preferred time'
  tooltip='Working hours are 09:00 - 18:00'
  required
  value={value}
  onChange={setValue}
/>`}
          </StoryCode>
          <div className='ml-1 flex max-w-sm items-center gap-4'>
            <InputTime
              className='w-full'
              description='Select your preferred time'
              label='Appointment Time'
              tooltip='Working hours are 09:00 - 18:00'
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
            Visual feedback for different interaction scenarios:
          </p>
          <div className='grid max-w-2xl grid-cols-1 gap-8 md:grid-cols-2'>
            <div>
              <p className='mb-3 text-13 font-medium'>Disabled State</p>
              <StoryCode>{"<InputTime disabled value='14:30' />"}</StoryCode>
              <div className='ml-1'>
                <InputTime value='14:30' disabled onChange={() => {}} />
              </div>
            </div>
            <div>
              <p className='mb-3 text-13 font-medium'>Error State</p>
              <StoryCode>{"<InputTime error='Invalid time' />"}</StoryCode>
              <div className='ml-1'>
                <InputTime
                  error='Selected time is unavailable'
                  value={value}
                  onChange={setValue}
                />
              </div>
            </div>
            <div>
              <p className='mb-3 text-13 font-medium'>Read Only State</p>
              <StoryCode>{"<InputTime readOnly value='09:00' />"}</StoryCode>
              <div className='ml-1'>
                <InputTime value='09:00' readOnly onChange={() => {}} />
              </div>
            </div>
          </div>
        </section>

        {/* Time Constraints Section */}
        <section>
          <StorySubTitle>Time Constraints</StorySubTitle>
          <p className='mb-4 text-14 text-gray-11'>
            Restrict the selectable time range using <code>minTime</code> and{' '}
            <code>maxTime</code>.
          </p>
          <StoryCode>
            {`<InputTime minTime='10:00' maxTime='18:00' />`}
          </StoryCode>
          <div className='ml-1 flex max-w-2xl flex-wrap items-center gap-4'>
            <div className='flex-1'>
              <p className='mb-2 text-12 font-medium text-gray-10'>
                Business Hours (10:00 - 18:00)
              </p>
              <InputTime
                className='w-full'
                maxTime='18:00'
                minTime='10:00'
                value={value}
                onChange={setValue}
              />
            </div>
          </div>
        </section>

        {/* Behavior Section */}
        <section>
          <StorySubTitle>Behavior (Clearable)</StorySubTitle>
          <p className='mb-4 text-14 text-gray-11'>
            Allow users to reset the input using a clear button.
          </p>
          <StoryCode>{`<InputTime clearable />`}</StoryCode>
          <div className='ml-1 flex max-w-sm items-center gap-4'>
            <InputTime
              className='w-full'
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
