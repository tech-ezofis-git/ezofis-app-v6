import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import InputRadio from '@/components/base/inputs/InputRadio'
import StoryCode from './-components/StoryCode'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/input-radio')({
  component: RouteComponent,
})

function RouteComponent() {
  const [checked, setChecked] = useState(false)

  return (
    <div className='max-w-4xl p-6'>
      <StoryTitle>Input Radio</StoryTitle>
      <p className='text-15 text-gray-11 mb-10'>
        The Input Radio component allows users to select exactly one option from a set. It's best used when the list of options is small and mutually exclusive.
      </p>

      <p className='text-14 text-gray-11 mb-4'>Before using InputRadio, import it from its location:</p>
      <StoryCode>
        {`import InputRadio from '@/components/base/inputs/InputRadio'`}
      </StoryCode>

      <div className='space-y-16'>
        {/* Default Section */}
        <section>
          <StorySubTitle>Default Usage</StorySubTitle>
          <p className='text-14 text-gray-11 mb-4'>
            A simple radio button with a label.
          </p>
          <StoryCode>
            {`<InputRadio checked={checked} label='Option One' onChange={setChecked} />`}
          </StoryCode>
          <div className='flex items-center gap-4 max-w-sm ml-1'>
            <InputRadio checked={checked} label='Option One' onChange={setChecked} />
          </div>
        </section>

        {/* Metadata Section */}
        <section>
          <StorySubTitle>Metadata (Description)</StorySubTitle>
          <p className='text-14 text-gray-11 mb-4'>
            Provide additional context below the radio label:
          </p>
          <StoryCode>
            {`<InputRadio
  checked={checked}
  label='Power Saving Mode'
  description='Reduces performance to extend battery life'
  onChange={setChecked}
/>`}
          </StoryCode>
          <div className='flex items-center gap-4 max-w-sm ml-1'>
            <InputRadio
              checked={checked}
              label='Power Saving Mode'
              description='Reduces performance to extend battery life'
              onChange={setChecked}
            />
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
              <StoryCode>{"<InputRadio disabled label='Permanent Selection' />"}</StoryCode>
              <div className='ml-1 mt-4'>
                <InputRadio checked={true} disabled label='Permanent Selection' onChange={() => { }} />
              </div>
            </div>
            <div>
              <p className='text-13 font-medium mb-3'>Error State</p>
              <StoryCode>{"<InputRadio error='This field is required' />"}</StoryCode>
              <div className='ml-1 mt-4'>
                <InputRadio checked={checked} error='This field is required' label='Confirm Selection' onChange={setChecked} />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
