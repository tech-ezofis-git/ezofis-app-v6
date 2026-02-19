import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import InputRadioGroup from '@/components/base/inputs/InputRadioGroup'
import StoryCode from './-components/StoryCode'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/input-radio-group')({
  component: RouteComponent,
})

const optionsDefault = [
  { id: 1, name: 'Paypal' },
  { id: 2, name: 'Credit Card' },
  { id: 3, name: 'Bank Transfer' },
]

const optionsLarge = Array.from({ length: 6 }, (_, i) => ({
  id: i + 1,
  name: `Choice ${i + 1}`,
}))

const optionsWithDescription = [
  { id: 1, name: 'Eco-Friendly', description: 'Slowest but most sustainable shipping' },
  { id: 2, name: 'Express', description: 'Next-day delivery for urgent orders' },
  { id: 3, name: 'Free', description: 'Wait 7-10 days to save on costs' },
]

function RouteComponent() {
  const [value, setValue] = useState<number | null>(null)

  return (
    <div className='max-w-4xl p-6'>
      <StoryTitle>Input Radio Group</StoryTitle>
      <p className='text-15 text-gray-11 mb-10'>
        The Radio Group component manages a collection of radio buttons, ensuring that only one option can be selected at a time. It provides a cohesive interface for mutually exclusive choices.
      </p>

      <p className='text-14 text-gray-11 mb-4'>Before using InputRadioGroup, import it from its location:</p>
      <StoryCode>
        {`import InputRadioGroup from '@/components/base/inputs/InputRadioGroup'`}
      </StoryCode>

      <div className='space-y-16'>
        {/* Default Section */}
        <section>
          <StorySubTitle>Default Usage</StorySubTitle>
          <p className='text-14 text-gray-11 mb-4'>
            A simple group with vertically stacked radio buttons.
          </p>
          <StoryCode>
            {`<InputRadioGroup options={options} value={value} onChange={setValue} />`}
          </StoryCode>
          <div className='ml-1'>
            <InputRadioGroup options={optionsDefault} value={value} onChange={setValue} />
          </div>
        </section>

        {/* Metadata Section */}
        <section>
          <StorySubTitle>Metadata (Label, Description, Tooltip)</StorySubTitle>
          <p className='text-14 text-gray-11 mb-4'>
            Add high-level context and instructions to the group:
          </p>
          <ul className='list-disc list-inside space-y-2 text-14 text-gray-11 mb-6 ml-2'>
            <li><strong>Label:</strong> A clear title for the selection group.</li>
            <li><strong>Description:</strong> Contextual help text below the label.</li>
            <li><strong>Tooltip:</strong> Detailed info on hover.</li>
          </ul>
          <StoryCode>
            {`<InputRadioGroup
  label='Payment Method'
  description='Choose your preferred way to pay'
  tooltip='Transactions are encrypted and secure'
  options={options}
  value={value}
  onChange={setValue}
  required
/>`}
          </StoryCode>
          <div className='max-w-sm ml-1'>
            <InputRadioGroup
              label='Payment Method'
              description='Choose your preferred way to pay'
              tooltip='Transactions are encrypted and secure'
              options={optionsDefault}
              value={value}
              onChange={setValue}
              className='w-full'
              required
            />
          </div>
        </section>

        {/* Layout Section */}
        <section>
          <StorySubTitle>Grid Layout (Options Per Line)</StorySubTitle>
          <p className='text-14 text-gray-11 mb-4'>
            Display options in a grid using <code>optionsPerLine</code>:
          </p>
          <StoryCode>
            {`<InputRadioGroup options={options} optionsPerLine={3} />`}
          </StoryCode>
          <div className='ml-1 max-w-lg'>
            <InputRadioGroup
              options={optionsLarge}
              optionsPerLine={3}
              value={value}
              onChange={setValue}
            />
          </div>
        </section>

        {/* Item Descriptions */}
        <section>
          <StorySubTitle>Item Descriptions</StorySubTitle>
          <p className='text-14 text-gray-11 mb-4'>
            Provide extra detail for each specific choice within the group:
          </p>
          <StoryCode>
            {`<InputRadioGroup options={optionsWithDescription} />`}
          </StoryCode>
          <div className='ml-1 max-w-sm'>
            <InputRadioGroup
              options={optionsWithDescription}
              value={value}
              onChange={setValue}
            />
          </div>
        </section>

        {/* States Section */}
        <section>
          <StorySubTitle>Interaction States</StorySubTitle>
          <p className='text-14 text-gray-11 mb-6'>
            Visual feedback for user selection states and input validity:
          </p>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl'>
            <div>
              <p className='text-13 font-medium mb-3'>Disabled State</p>
              <StoryCode>{"<InputRadioGroup disabled options={options} />"}</StoryCode>
              <div className='ml-1 mt-4'>
                <InputRadioGroup disabled options={optionsDefault} value={1} onChange={() => { }} />
              </div>
            </div>
            <div>
              <p className='text-13 font-medium mb-3'>Error State</p>
              <StoryCode>{"<InputRadioGroup error='Required' options={options} />"}</StoryCode>
              <div className='ml-1 mt-4'>
                <InputRadioGroup
                  error='Please select a shipping method'
                  options={optionsDefault}
                  value={value}
                  onChange={setValue}
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
