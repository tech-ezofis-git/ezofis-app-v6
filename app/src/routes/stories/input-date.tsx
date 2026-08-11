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
      <p className='mb-10 text-15 text-gray-11'>
        The Input Date component allows users to select a date using a calendar
        picker or manual entry. It supports validation states, date range
        constraints, and clearable inputs.
      </p>

      <p className='mb-4 text-14 text-gray-11'>
        Before using InputDate, import it from its location:
      </p>
      <StoryCode>
        {`import InputDate from '@/components/base/inputs/InputDate'`}
      </StoryCode>

      <div className='space-y-16'>
        {/* Default Section */}
        <section>
          <StorySubTitle>Default Usage</StorySubTitle>
          <p className='mb-4 text-14 text-gray-11'>
            A standard date picker with no extra constraints.
          </p>
          <StoryCode>
            {`<InputDate value={value} onChange={setValue} />`}
          </StoryCode>
          <div className='ml-1 flex max-w-sm items-center gap-4'>
            <InputDate className='w-full' value={value} onChange={setValue} />
          </div>
        </section>

        {/* Meta Section */}
        <section>
          <StorySubTitle>Metadata (Label, Description, Tooltip)</StorySubTitle>
          <p className='mb-4 text-14 text-gray-11'>
            Add context and requirements to the date field:
          </p>
          <ul className='mb-6 ml-2 list-inside list-disc space-y-2 text-14 text-gray-11'>
            <li>
              <strong>Label:</strong> A clear title for the date input.
            </li>
            <li>
              <strong>Description:</strong> Contextual help text below the
              label.
            </li>
            <li>
              <strong>Tooltip:</strong> Detailed information on hover.
            </li>
            <li>
              <strong>Required / Optional:</strong> Visual necessity indicators.
            </li>
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
          <div className='ml-1 flex max-w-sm items-center gap-4'>
            <InputDate
              className='w-full'
              description='Select your date of birth'
              label='Birth Date'
              placeholder='YYYY-MM-DD'
              tooltip='You must be at least 18 years old'
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
            Visual feedback for different interaction levels:
          </p>
          <div className='grid max-w-2xl grid-cols-1 gap-8 md:grid-cols-2'>
            <div>
              <p className='mb-3 text-13 font-medium'>Disabled State</p>
              <StoryCode>
                {"<InputDate disabled value='2025-01-01' />"}
              </StoryCode>
              <div className='ml-1'>
                <InputDate value='2025-01-01' disabled onChange={() => {}} />
              </div>
            </div>
            <div>
              <p className='mb-3 text-13 font-medium'>Error State</p>
              <StoryCode>{"<InputDate error='Invalid date' />"}</StoryCode>
              <div className='ml-1'>
                <InputDate
                  error='Date is too far in the future'
                  value={value}
                  onChange={setValue}
                />
              </div>
            </div>
            <div>
              <p className='mb-3 text-13 font-medium'>Read Only State</p>
              <StoryCode>
                {"<InputDate readOnly value='2025-05-20' />"}
              </StoryCode>
              <div className='ml-1'>
                <InputDate value='2025-05-20' readOnly onChange={() => {}} />
              </div>
            </div>
          </div>
        </section>

        {/* Constraints Section */}
        <section>
          <StorySubTitle>Date Constraints</StorySubTitle>
          <p className='mb-4 text-14 text-gray-11'>
            Restrict the range of selectable dates using <code>minDate</code>{' '}
            and <code>maxDate</code>.
          </p>
          <StoryCode>
            {`<InputDate minDate='2025-04-01' maxDate='2025-10-30' />`}
          </StoryCode>
          <div className='ml-1 flex max-w-2xl flex-wrap items-center gap-4'>
            <div className='flex-1'>
              <p className='mb-2 text-12 font-medium text-gray-10'>
                Min Date (Apr 2025+)
              </p>
              <InputDate
                className='w-full'
                minDate='2025-04-01'
                value={value}
                onChange={setValue}
              />
            </div>
            <div className='flex-1'>
              <p className='mb-2 text-12 font-medium text-gray-10'>
                Max Date (Oct 2025-)
              </p>
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
          <p className='mb-4 text-14 text-gray-11'>
            Allow users to reset the date to null using a clear button.
          </p>
          <StoryCode>{`<InputDate clearable />`}</StoryCode>
          <div className='ml-1 flex max-w-sm items-center gap-4'>
            <InputDate
              className='w-full'
              placeholder='Click X to clear'
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
