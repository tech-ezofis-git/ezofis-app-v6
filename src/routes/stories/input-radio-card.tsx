import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import InputRadioCard from '@/components/base/inputs/InputRadioCard'
import StoryCode from './-components/StoryCode'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/input-radio-card')({
  component: RouteComponent,
})

function RouteComponent() {
  const [selected1, setSelected1] = useState(false)
  const [selected2, setSelected2] = useState(false)

  return (
    <div className='max-w-4xl p-6'>
      <StoryTitle>Input Radio Card</StoryTitle>
      <p className='text-15 text-gray-11 mb-10'>
        The Radio Card component provides a large, accessible area for making mutually exclusive selections. Similar to the Checkbox Card, it supports labels, descriptions, and icons to guide user choice.
      </p>

      <p className='text-14 text-gray-11 mb-4'>Before using InputRadioCard, import it from its location:</p>
      <StoryCode>
        {`import InputRadioCard from '@/components/base/inputs/InputRadioCard'`}
      </StoryCode>

      <div className='space-y-16'>
        {/* Default Section */}
        <section>
          <StorySubTitle>Default Usage</StorySubTitle>
          <p className='text-14 text-gray-11 mb-4'>
            A simple card-styled radio selection.
          </p>
          <StoryCode>
            {`<InputRadioCard
  checked={selected}
  label='Monthly Billing'
  onClick={() => setSelected(!selected)}
/>`}
          </StoryCode>
          <div className='flex items-center gap-4 max-w-sm ml-1'>
            <InputRadioCard
              checked={selected1}
              className='w-full'
              label='Monthly Billing'
              onClick={() => setSelected1(!selected1)}
            />
          </div>
        </section>

        {/* Rich Metadata Section */}
        <section>
          <StorySubTitle>Rich Metadata (Description & Icon)</StorySubTitle>
          <p className='text-14 text-gray-11 mb-4'>
            Provide high-impact details for better clarity:
          </p>
          <ul className='list-disc list-inside space-y-2 text-14 text-gray-11 mb-6 ml-2'>
            <li><strong>Label:</strong> The primary name of the option.</li>
            <li><strong>Description:</strong> Contextual help text.</li>
            <li><strong>Icon:</strong> Visual context marker.</li>
          </ul>
          <StoryCode>
            {`<InputRadioCard
  checked={selected}
  label='Annual Billing'
  description='Save 20% with yearly payments'
  icon='lucide:zap'
  onClick={() => setSelected(!selected)}
/>`}
          </StoryCode>
          <div className='flex items-center gap-4 max-w-sm ml-1'>
            <InputRadioCard
              checked={selected2}
              className='w-full'
              description='Save 20% with yearly payments'
              icon='lucide:zap'
              label='Annual Billing'
              onClick={() => setSelected2(!selected2)}
            />
          </div>
        </section>
      </div>
    </div>
  )
}
