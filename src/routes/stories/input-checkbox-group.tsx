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
  { id: 1, name: 'Basic Plan', description: 'Up to 5 projects and limited storage' },
  { id: 2, name: 'Pro Plan', description: 'Unlimited projects and 50GB storage' },
  { id: 3, name: 'Enterprise Plan', description: 'Custom solutions for large teams' },
]

function RouteComponent() {
  const [value, setValue] = useState<number[]>([])

  return (
    <div className='max-w-4xl p-6'>
      <StoryTitle>Input Checkbox Group</StoryTitle>
      <p className='text-15 text-gray-11 mb-10'>
        The Checkbox Group component manages a collection of checkboxes as a single field. It's ideal for multi-select scenarios where users can choose several options from a list.
      </p>

      <p className='text-14 text-gray-11 mb-4'>Before using InputCheckboxGroup, import it from its location:</p>
      <StoryCode>
        {`import InputCheckboxGroup from '@/components/base/inputs/InputCheckboxGroup'`}
      </StoryCode>

      <div className='space-y-16'>
        {/* Default Section */}
        <section>
          <StorySubTitle>Default Usage</StorySubTitle>
          <p className='text-14 text-gray-11 mb-4'>
            A simple group with vertically stacked checkboxes.
          </p>
          <StoryCode>
            {`<InputCheckboxGroup options={options} value={value} onChange={setValue} />`}
          </StoryCode>
          <div className='ml-1'>
            <InputCheckboxGroup options={options1} value={value} onChange={setValue} />
          </div>
        </section>

        {/* Metadata Section */}
        <section>
          <StorySubTitle>Metadata (Label, Description, Tooltip)</StorySubTitle>
          <p className='text-14 text-gray-11 mb-4'>
            Configure headings, instructions, and necessity indicators for the group:
          </p>
          <ul className='list-disc list-inside space-y-2 text-14 text-gray-11 mb-6 ml-2'>
            <li><strong>Label:</strong> A clear title for the whole group.</li>
            <li><strong>Description:</strong> Contextual help text below the label.</li>
            <li><strong>Tooltip:</strong> Detailed info accessible via hover icon.</li>
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
          <div className='max-w-sm ml-1'>
            <InputCheckboxGroup
              label='Shipping Methods'
              description='Choose all methods you would like to enable'
              tooltip='Standard delivery takes 3-5 business days'
              options={options1}
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
            Organize options into a multi-column grid using the <code>optionsPerLine</code> prop:
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
          <p className='text-14 text-gray-11 mb-4'>
            Individual options within the group can also have their own descriptions:
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
          <p className='text-14 text-gray-11 mb-6'>
            Visual feedback for invalid inputs or restricted interaction:
          </p>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl'>
            <div>
              <p className='text-13 font-medium mb-3'>Disabled State</p>
              <StoryCode>{"<InputCheckboxGroup disabled options={options} />"}</StoryCode>
              <div className='ml-1 mt-4'>
                <InputCheckboxGroup disabled options={options1} value={[1]} onChange={() => { }} />
              </div>
            </div>
            <div>
              <p className='text-13 font-medium mb-3'>Error State</p>
              <StoryCode>{"<InputCheckboxGroup error='Selection required' options={options} />"}</StoryCode>
              <div className='ml-1 mt-4'>
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
