import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import InputDateTime from '@/components/base/inputs/InputDateTime'
import StoryCode from './-components/StoryCode'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/input-date-time')({
  component: RouteComponent,
})

function RouteComponent() {
  const [value, setValue] = useState<string | null>(null)

  return (
    <div className='max-w-4xl p-6'>
      <StoryTitle>Input Date Time</StoryTitle>
      <p className='mb-10 text-15 text-gray-11'>
        Combines a date picker and a time picker into a single field. Value is
        a single string in <code>YYYY-MM-DD HH:mm</code> format, or{' '}
        <code>null</code>. The time side is disabled until a date is chosen.
      </p>

      <p className='mb-4 text-14 text-gray-11'>
        Before using InputDateTime, import it from its location:
      </p>
      <StoryCode>
        {`import InputDateTime from '@/components/base/inputs/InputDateTime'`}
      </StoryCode>

      <div className='space-y-16'>
        {/* Default Section */}
        <section>
          <StorySubTitle>Default Usage</StorySubTitle>
          <p className='mb-4 text-14 text-gray-11'>
            Pick a date first, then a time becomes available.
          </p>
          <StoryCode>
            {`<InputDateTime value={value} onChange={setValue} />`}
          </StoryCode>
          <div className='ml-1 max-w-sm'>
            <InputDateTime value={value} onChange={setValue} />
          </div>
        </section>

        {/* Meta Section */}
        <section>
          <StorySubTitle>Metadata (Label, Description, Required)</StorySubTitle>
          <StoryCode>
            {`<InputDateTime
  label='Appointment'
  description='Select a date and time'
  required
  value={value}
  onChange={setValue}
/>`}
          </StoryCode>
          <div className='ml-1 max-w-sm'>
            <InputDateTime
              description='Select a date and time'
              label='Appointment'
              value={value}
              required
              onChange={setValue}
            />
          </div>
        </section>

        {/* States Section */}
        <section>
          <StorySubTitle>States</StorySubTitle>
          <div className='grid max-w-2xl grid-cols-1 gap-8 md:grid-cols-2'>
            <div>
              <p className='mb-3 text-13 font-medium'>Disabled State</p>
              <StoryCode>
                {"<InputDateTime disabled value='2025-01-01 09:00' />"}
              </StoryCode>
              <div className='ml-1'>
                <InputDateTime
                  disabled
                  value='2025-01-01 09:00'
                  onChange={() => {}}
                />
              </div>
            </div>
            <div>
              <p className='mb-3 text-13 font-medium'>Error State</p>
              <StoryCode>
                {"<InputDateTime error='This field is required' />"}
              </StoryCode>
              <div className='ml-1'>
                <InputDateTime
                  error='This field is required'
                  value={value}
                  onChange={setValue}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Constraints Section */}
        <section>
          <StorySubTitle>Date Constraints & 24h Format</StorySubTitle>
          <p className='mb-4 text-14 text-gray-11'>
            <code>minDate</code>/<code>maxDate</code> restrict the date side;{' '}
            <code>format</code> controls the time side (<code>'12h'</code> or{' '}
            <code>'24h'</code>).
          </p>
          <StoryCode>
            {`<InputDateTime minDate='2025-04-01' maxDate='2025-10-30' format='24h' />`}
          </StoryCode>
          <div className='ml-1 max-w-sm'>
            <InputDateTime
              format='24h'
              maxDate='2025-10-30'
              minDate='2025-04-01'
              value={value}
              onChange={setValue}
            />
          </div>
        </section>
      </div>
    </div>
  )
}
