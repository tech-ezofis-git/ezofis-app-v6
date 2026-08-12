import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import InputPin from '@/components/base/inputs/InputPin'
import StoryCode from './-components/StoryCode'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/input-pin')({
  component: RouteComponent,
})

function RouteComponent() {
  const [value, setValue] = useState('')

  return (
    <div className='max-w-4xl p-6'>
      <StoryTitle>Input Pin</StoryTitle>
      <p className='mb-10 text-15 text-gray-11'>
        The Input Pin component is designed for collecting PIN codes, OTPs, or
        verification codes. It provides a set of isolated input fields that
        automatically move focus as the user types.
      </p>

      <p className='mb-4 text-14 text-gray-11'>
        Before using InputPin, import it from its location:
      </p>
      <StoryCode>
        {`import InputPin from '@/components/base/inputs/InputPin'`}
      </StoryCode>

      <div className='space-y-16'>
        {/* Default Section */}
        <section>
          <StorySubTitle>Default Usage</StorySubTitle>
          <p className='mb-4 text-14 text-gray-11'>
            A standard 4-digit PIN input with automatic focus management.
          </p>
          <StoryCode>
            {`<InputPin value={value} onChange={setValue} />`}
          </StoryCode>
          <div className='ml-1 flex max-w-sm items-center gap-4'>
            <InputPin value={value} onChange={setValue} />
          </div>
        </section>

        {/* Custom Length Section */}
        <section>
          <StorySubTitle>Custom Length</StorySubTitle>
          <p className='mb-4 text-14 text-gray-11'>
            Adjust the number of input fields using the <code>length</code>{' '}
            prop. Common lengths are 4 or 6 digits.
          </p>
          <StoryCode>
            {`<InputPin length={6} value={value} onChange={setValue} />`}
          </StoryCode>
          <div className='ml-1 flex max-w-sm items-center gap-4'>
            <InputPin length={6} value={value} onChange={setValue} />
          </div>
        </section>

        {/* Placeholder Section */}
        <section>
          <StorySubTitle>Input Formatting (Placeholder)</StorySubTitle>
          <p className='mb-4 text-14 text-gray-11'>
            Customize the appearance of empty fields with a placeholder
            character.
          </p>
          <StoryCode>
            {`<InputPin placeholder='○' value={value} onChange={setValue} />`}
          </StoryCode>
          <div className='ml-1 flex max-w-sm items-center gap-4'>
            <InputPin placeholder='○' value={value} onChange={setValue} />
          </div>
        </section>

        {/* States Section */}
        <section>
          <StorySubTitle>Interaction States</StorySubTitle>
          <p className='mb-6 text-14 text-gray-11'>
            Visual feedback for invalid inputs or restricted interaction:
          </p>
          <div className='grid max-w-2xl grid-cols-1 gap-8 md:grid-cols-2'>
            <div>
              <p className='mb-3 text-13 font-medium'>Disabled State</p>
              <StoryCode>{"<InputPin disabled value='1234' />"}</StoryCode>
              <div className='ml-1'>
                <InputPin value='1234' disabled onChange={() => {}} />
              </div>
            </div>
            <div>
              <p className='mb-3 text-13 font-medium'>Error State</p>
              <StoryCode>{'<InputPin error />'}</StoryCode>
              <div className='ml-1'>
                <InputPin value={value} error onChange={setValue} />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
