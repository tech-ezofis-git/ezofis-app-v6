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
      <p className='text-15 text-gray-11 mb-10'>
        The Input Pin component is designed for collecting PIN codes, OTPs, or verification codes. It provides a set of isolated input fields that automatically move focus as the user types.
      </p>

      <p className='text-14 text-gray-11 mb-4'>Before using InputPin, import it from its location:</p>
      <StoryCode>
        {`import InputPin from '@/components/base/inputs/InputPin'`}
      </StoryCode>

      <div className='space-y-16'>
        {/* Default Section */}
        <section>
          <StorySubTitle>Default Usage</StorySubTitle>
          <p className='text-14 text-gray-11 mb-4'>
            A standard 4-digit PIN input with automatic focus management.
          </p>
          <StoryCode>
            {`<InputPin value={value} onChange={setValue} />`}
          </StoryCode>
          <div className='flex items-center gap-4 max-w-sm ml-1'>
            <InputPin value={value} onChange={setValue} />
          </div>
        </section>

        {/* Custom Length Section */}
        <section>
          <StorySubTitle>Custom Length</StorySubTitle>
          <p className='text-14 text-gray-11 mb-4'>
            Adjust the number of input fields using the <code>length</code> prop. Common lengths are 4 or 6 digits.
          </p>
          <StoryCode>
            {`<InputPin length={6} value={value} onChange={setValue} />`}
          </StoryCode>
          <div className='flex items-center gap-4 max-w-sm ml-1'>
            <InputPin length={6} value={value} onChange={setValue} />
          </div>
        </section>

        {/* Placeholder Section */}
        <section>
          <StorySubTitle>Input Formatting (Placeholder)</StorySubTitle>
          <p className='text-14 text-gray-11 mb-4'>
            Customize the appearance of empty fields with a placeholder character.
          </p>
          <StoryCode>
            {`<InputPin placeholder='○' value={value} onChange={setValue} />`}
          </StoryCode>
          <div className='flex items-center gap-4 max-w-sm ml-1'>
            <InputPin placeholder='○' value={value} onChange={setValue} />
          </div>
        </section>

        {/* States Section */}
        <section>
          <StorySubTitle>Interaction States</StorySubTitle>
          <p className='text-14 text-gray-11 mb-6'>
            Visual feedback for invalid inputs or restricted interaction:
          </p>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl'>
            <div>
              <p className='text-13 font-medium mb-3'>Disabled State</p>
              <StoryCode>{"<InputPin disabled value='1234' />"}</StoryCode>
              <div className='ml-1'>
                <InputPin disabled value='1234' onChange={() => { }} />
              </div>
            </div>
            <div>
              <p className='text-13 font-medium mb-3'>Error State</p>
              <StoryCode>{"<InputPin error />"}</StoryCode>
              <div className='ml-1'>
                <InputPin error value={value} onChange={setValue} />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
