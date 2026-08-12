import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import InputCheckboxGroup from '@/components/base/inputs/InputCheckboxGroup'
import StoryCode from './-components/StoryCode'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/input-checkbox-group')({
  component: RouteComponent,
})

const options1 = [
  { id: 1, name: 'Standard Delivery' },
  { id: 2, name: 'Express Delivery' },
  { id: 3, name: 'Pick-up from Store' },
]

const optionsLarge = Array.from({ length: 6 }, (_, i) => ({
  id: i + 1,
  name: `Option ${i + 1}`,
}))

const optionsWithDescription = [
  {
    description: 'Up to 5 projects and limited storage',
    id: 1,
    name: 'Basic Plan',
  },
  {
    description: 'Unlimited projects and 50GB storage',
    id: 2,
    name: 'Pro Plan',
  },
  {
    description: 'Custom solutions for large teams',
    id: 3,
    name: 'Enterprise Plan',
  },
]

function RouteComponent() {
  const [value, setValue] = useState<number[]>([])

  return (
    <div className='max-w-4xl p-6'>
      <StoryTitle>Input Checkbox Group</StoryTitle>
      <p className='mb-10 text-15 text-gray-11'>
        The Checkbox Group component manages a collection of checkboxes as a
        single field. It's ideal for multi-select scenarios where users can
        choose several options from a list.
      </p>

      <p className='mb-4 text-14 text-gray-11'>
        Before using InputCheckboxGroup, import it from its location:
      </p>
      <StoryCode>
        {`import InputCheckboxGroup from '@/components/base/inputs/InputCheckboxGroup'`}
      </StoryCode>

      <div className='space-y-16'>
        {/* Default Section */}
        <section>
          <StorySubTitle>Default Usage</StorySubTitle>
          <p className='mb-4 text-14 text-gray-11'>
            A simple group with vertically stacked checkboxes.
          </p>
          <StoryCode>
            {`<InputCheckboxGroup options={options} value={value} onChange={setValue} />`}
          </StoryCode>
          <div className='ml-1'>
            <InputCheckboxGroup
              options={options1}
              value={value}
              onChange={setValue}
            />
          </div>
        </section>

        {/* Metadata Section */}
        <section>
          <StorySubTitle>Metadata (Label, Description, Tooltip)</StorySubTitle>
          <p className='mb-4 text-14 text-gray-11'>
            Configure headings, instructions, and necessity indicators for the
            group:
          </p>
          <ul className='mb-6 ml-2 list-inside list-disc space-y-2 text-14 text-gray-11'>
            <li>
              <strong>Label:</strong> A clear title for the whole group.
            </li>
            <li>
              <strong>Description:</strong> Contextual help text below the
              label.
            </li>
            <li>
              <strong>Tooltip:</strong> Detailed info accessible via hover icon.
            </li>
          </ul>
          <StoryCode>
            {`<InputCheckboxGroup
  label='Shipping Methods'
  description='Choose all methods you would like to enable'
  tooltip='Standard delivery takes 3-5 business days'
  options={options}
  value={value}
  onChange={setValue}
  required
/>`}
          </StoryCode>
          <div className='ml-1 max-w-sm'>
            <InputCheckboxGroup
              className='w-full'
              description='Choose all methods you would like to enable'
              label='Shipping Methods'
              options={options1}
              tooltip='Standard delivery takes 3-5 business days'
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
            Organize options into a multi-column grid using the{' '}
            <code>optionsPerLine</code> prop:
          </p>
          <StoryCode>
            {`<InputCheckboxGroup options={options} optionsPerLine={3} />`}
          </StoryCode>
          <div className='ml-1 max-w-lg'>
            <InputCheckboxGroup
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
            Individual options within the group can also have their own
            descriptions:
          </p>
          <StoryCode>
            {`<InputCheckboxGroup options={optionsWithDescription} />`}
          </StoryCode>
          <div className='ml-1 max-w-sm'>
            <InputCheckboxGroup
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
            Visual feedback for invalid inputs or restricted interaction:
          </p>
          <div className='grid max-w-2xl grid-cols-1 gap-8 md:grid-cols-2'>
            <div>
              <p className='mb-3 text-13 font-medium'>Disabled State</p>
              <StoryCode>
                {'<InputCheckboxGroup disabled options={options} />'}
              </StoryCode>
              <div className='mt-4 ml-1'>
                <InputCheckboxGroup
                  options={options1}
                  value={[1]}
                  disabled
                  onChange={() => {}}
                />
              </div>
            </div>
            <div>
              <p className='mb-3 text-13 font-medium'>Error State</p>
              <StoryCode>
                {
                  "<InputCheckboxGroup error='Selection required' options={options} />"
                }
              </StoryCode>
              <div className='mt-4 ml-1'>
                <InputCheckboxGroup
                  error='Please select at least one plan'
                  options={options1}
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
