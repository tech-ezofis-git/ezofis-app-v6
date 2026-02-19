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
      <p className='text-15 text-gray-11 mb-10'>
        The Input Time component allows users to enter or select a specific time of day. It supports time range constraints, validation states, and clearable inputs.
      </p>

      <p className='text-14 text-gray-11 mb-4'>Before using InputTime, import it from its location:</p>
      <StoryCode>
        {`import InputTime from '@/components/base/inputs/InputTime'`}
      </StoryCode>

      <div className='space-y-16'>
        {/* Default Section */}
        <section>
          <StorySubTitle>Default Usage</StorySubTitle>
          <p className='text-14 text-gray-11 mb-4'>
            A standard time picker for 24-hour or 12-hour time entry.
          </p>
          <StoryCode>
            {`<InputTime value={value} onChange={setValue} />`}
          </StoryCode>
          <div className='flex items-center gap-4 max-w-sm ml-1'>
            <InputTime className='w-full' value={value} onChange={setValue} />
          </div>
        </section>

        {/* Meta Section */}
        <section>
          <StorySubTitle>Metadata (Label, Description, Tooltip)</StorySubTitle>
          <p className='text-14 text-gray-11 mb-4'>
            Configure headings and help text to provide context for the time input:
          </p>
          <ul className='list-disc list-inside space-y-2 text-14 text-gray-11 mb-6 ml-2'>
            <li><strong>Label:</strong> A title for the time field.</li>
            <li><strong>Description:</strong> Contextual help text below the label.</li>
            <li><strong>Tooltip:</strong> Detailed info on hover.</li>
            <li><strong>Required / Optional:</strong> Visual necessity indicators.</li>
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
          <div className='flex items-center gap-4 max-w-sm ml-1'>
            <InputTime
              className='w-full'
              label='Appointment Time'
              description='Select your preferred time'
              tooltip='Working hours are 09:00 - 18:00'
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
            Visual feedback for different interaction scenarios:
          </p>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl'>
            <div>
              <p className='text-13 font-medium mb-3'>Disabled State</p>
              <StoryCode>{"<InputTime disabled value='14:30' />"}</StoryCode>
              <div className='ml-1'>
                <InputTime disabled value='14:30' onChange={() => { }} />
              </div>
            </div>
            <div>
              <p className='text-13 font-medium mb-3'>Error State</p>
              <StoryCode>{"<InputTime error='Invalid time' />"}</StoryCode>
              <div className='ml-1'>
                <InputTime error='Selected time is unavailable' value={value} onChange={setValue} />
              </div>
            </div>
            <div>
              <p className='text-13 font-medium mb-3'>Read Only State</p>
              <StoryCode>{"<InputTime readOnly value='09:00' />"}</StoryCode>
              <div className='ml-1'>
                <InputTime readOnly value='09:00' onChange={() => { }} />
              </div>
            </div>
          </div>
        </section>

        {/* Time Constraints Section */}
        <section>
          <StorySubTitle>Time Constraints</StorySubTitle>
          <p className='text-14 text-gray-11 mb-4'>
            Restrict the selectable time range using <code>minTime</code> and <code>maxTime</code>.
          </p>
          <StoryCode>
            {`<InputTime minTime='10:00' maxTime='18:00' />`}
          </StoryCode>
          <div className='flex flex-wrap items-center gap-4 max-w-2xl ml-1'>
            <div className='flex-1'>
              <p className='text-12 text-gray-10 mb-2 font-medium'>Business Hours (10:00 - 18:00)</p>
              <InputTime
                className='w-full'
                minTime='10:00'
                maxTime='18:00'
                value={value}
                onChange={setValue}
              />
            </div>
          </div>
        </section>

        {/* Behavior Section */}
        <section>
          <StorySubTitle>Behavior (Clearable)</StorySubTitle>
          <p className='text-14 text-gray-11 mb-4'>
            Allow users to reset the input using a clear button.
          </p>
          <StoryCode>
            {`<InputTime clearable />`}
          </StoryCode>
          <div className='flex items-center gap-4 max-w-sm ml-1'>
            <InputTime
              className='w-full'
              clearable
              value={value}
              onChange={setValue}
            />
          </div>
        </section>
      </div>
    </div>
  )
}
