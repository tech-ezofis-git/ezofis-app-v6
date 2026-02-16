import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import InputDate from '@/components/base/inputs/InputDate'
import StoryCode from './-components/StoryCode'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/input-date')({
  component: RouteComponent,
})

function RouteComponent() {
  const [value, setValue] = useState<string | null>(null)

  return (
    <div className='max-w-4xl p-6'>
      <StoryTitle>Input Date</StoryTitle>
      <p className='text-15 text-gray-11 mb-10'>
        The Input Date component allows users to select a date using a calendar picker or manual entry. It supports validation states, date range constraints, and clearable inputs.
      </p>

      <p className='text-14 text-gray-11 mb-4'>Before using InputDate, import it from its location:</p>
      <StoryCode>
        {`import InputDate from '@/components/base/inputs/InputDate'`}
      </StoryCode>

      <div className='space-y-16'>
        {/* Default Section */}
        <section>
          <StorySubTitle>Default Usage</StorySubTitle>
          <p className='text-14 text-gray-11 mb-4'>
            A standard date picker with no extra constraints.
          </p>
          <StoryCode>
            {`<InputDate value={value} onChange={setValue} />`}
          </StoryCode>
          <div className='flex items-center gap-4 max-w-sm ml-1'>
            <InputDate className='w-full' value={value} onChange={setValue} />
          </div>
        </section>

        {/* Meta Section */}
        <section>
          <StorySubTitle>Metadata (Label, Description, Tooltip)</StorySubTitle>
          <p className='text-14 text-gray-11 mb-4'>
            Add context and requirements to the date field:
          </p>
          <ul className='list-disc list-inside space-y-2 text-14 text-gray-11 mb-6 ml-2'>
            <li><strong>Label:</strong> A clear title for the date input.</li>
            <li><strong>Description:</strong> Contextual help text below the label.</li>
            <li><strong>Tooltip:</strong> Detailed information on hover.</li>
            <li><strong>Required / Optional:</strong> Visual necessity indicators.</li>
          </ul>
          <StoryCode>
            {`<InputDate
  label='Birth Date'
  description='Select your date of birth'
  placeholder='YYYY-MM-DD'
  tooltip='You must be at least 18 years old'
  required
  value={value}
  onChange={setValue}
/>`}
          </StoryCode>
          <div className='flex items-center gap-4 max-w-sm ml-1'>
            <InputDate
              className='w-full'
              label='Birth Date'
              description='Select your date of birth'
              placeholder='YYYY-MM-DD'
              tooltip='You must be at least 18 years old'
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
            Visual feedback for different interaction levels:
          </p>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl'>
            <div>
              <p className='text-13 font-medium mb-3'>Disabled State</p>
              <StoryCode>{"<InputDate disabled value='2025-01-01' />"}</StoryCode>
              <div className='ml-1'>
                <InputDate disabled value='2025-01-01' onChange={() => { }} />
              </div>
            </div>
            <div>
              <p className='text-13 font-medium mb-3'>Error State</p>
              <StoryCode>{"<InputDate error='Invalid date' />"}</StoryCode>
              <div className='ml-1'>
                <InputDate error='Date is too far in the future' value={value} onChange={setValue} />
              </div>
            </div>
            <div>
              <p className='text-13 font-medium mb-3'>Read Only State</p>
              <StoryCode>{"<InputDate readOnly value='2025-05-20' />"}</StoryCode>
              <div className='ml-1'>
                <InputDate readOnly value='2025-05-20' onChange={() => { }} />
              </div>
            </div>
          </div>
        </section>

        {/* Constraints Section */}
        <section>
          <StorySubTitle>Date Constraints</StorySubTitle>
          <p className='text-14 text-gray-11 mb-4'>
            Restrict the range of selectable dates using <code>minDate</code> and <code>maxDate</code>.
          </p>
          <StoryCode>
            {`<InputDate minDate='2025-04-01' maxDate='2025-10-30' />`}
          </StoryCode>
          <div className='flex flex-wrap items-center gap-4 max-w-2xl ml-1'>
            <div className='flex-1'>
              <p className='text-12 text-gray-10 mb-2 font-medium'>Min Date (Apr 2025+)</p>
              <InputDate
                className='w-full'
                minDate='2025-04-01'
                value={value}
                onChange={setValue}
              />
            </div>
            <div className='flex-1'>
              <p className='text-12 text-gray-10 mb-2 font-medium'>Max Date (Oct 2025-)</p>
              <InputDate
                className='w-full'
                maxDate='2025-10-30'
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
            Allow users to reset the date to null using a clear button.
          </p>
          <StoryCode>
            {`<InputDate clearable />`}
          </StoryCode>
          <div className='flex items-center gap-4 max-w-sm ml-1'>
            <InputDate
              className='w-full'
              clearable
              placeholder='Click X to clear'
              value={value}
              onChange={setValue}
            />
          </div>
        </section>
      </div>
    </div>
  )
}
