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
  {
    description: 'Slowest but most sustainable shipping',
    id: 1,
    name: 'Eco-Friendly',
  },
  {
    description: 'Next-day delivery for urgent orders',
    id: 2,
    name: 'Express',
  },
  { description: 'Wait 7-10 days to save on costs', id: 3, name: 'Free' },
]

function RouteComponent() {
  const [value, setValue] = useState<number | null>(null)

  return (
    <div className='max-w-4xl p-6'>
      <StoryTitle>Input Radio Group</StoryTitle>
      <p className='mb-10 text-15 text-gray-11'>
        The Radio Group component manages a collection of radio buttons,
        ensuring that only one option can be selected at a time. It provides a
        cohesive interface for mutually exclusive choices.
      </p>

      <p className='mb-4 text-14 text-gray-11'>
        Before using InputRadioGroup, import it from its location:
      </p>
      <StoryCode>
        {`import InputRadioGroup from '@/components/base/inputs/InputRadioGroup'`}
      </StoryCode>

      <div className='space-y-16'>
        {/* Default Section */}
        <section>
          <StorySubTitle>Default Usage</StorySubTitle>
          <p className='mb-4 text-14 text-gray-11'>
            A simple group with vertically stacked radio buttons.
          </p>
          <StoryCode>
            {`<InputRadioGroup options={options} value={value} onChange={setValue} />`}
          </StoryCode>
          <div className='ml-1'>
            <InputRadioGroup
              options={optionsDefault}
              value={value}
              onChange={setValue}
            />
          </div>
        </section>

        {/* Metadata Section */}
        <section>
          <StorySubTitle>Metadata (Label, Description, Tooltip)</StorySubTitle>
          <p className='mb-4 text-14 text-gray-11'>
            Add high-level context and instructions to the group:
          </p>
          <ul className='mb-6 ml-2 list-inside list-disc space-y-2 text-14 text-gray-11'>
            <li>
              <strong>Label:</strong> A clear title for the selection group.
            </li>
            <li>
              <strong>Description:</strong> Contextual help text below the
              label.
            </li>
            <li>
              <strong>Tooltip:</strong> Detailed info on hover.
            </li>
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
          <div className='ml-1 max-w-sm'>
            <InputRadioGroup
              className='w-full'
              description='Choose your preferred way to pay'
              label='Payment Method'
              options={optionsDefault}
              tooltip='Transactions are encrypted and secure'
              value={value}
              required
              onChange={setValue}
            />
          </div>
        </section>

        {/* Layout Section */}
        <section>
          <StorySubTitle>Grid Layout (Options Per Line)</StorySubTitle>
          <p className='mb-4 text-14 text-gray-11'>
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
          <p className='mb-4 text-14 text-gray-11'>
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
          <p className='mb-6 text-14 text-gray-11'>
            Visual feedback for user selection states and input validity:
          </p>
          <div className='grid max-w-2xl grid-cols-1 gap-8 md:grid-cols-2'>
            <div>
              <p className='mb-3 text-13 font-medium'>Disabled State</p>
              <StoryCode>
                {'<InputRadioGroup disabled options={options} />'}
              </StoryCode>
              <div className='mt-4 ml-1'>
                <InputRadioGroup
                  options={optionsDefault}
                  value={1}
                  disabled
                  onChange={() => {}}
                />
              </div>
            </div>
            <div>
              <p className='mb-3 text-13 font-medium'>Error State</p>
              <StoryCode>
                {"<InputRadioGroup error='Required' options={options} />"}
              </StoryCode>
              <div className='mt-4 ml-1'>
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
