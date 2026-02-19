import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import InputNumber from '@/components/base/inputs/InputNumber'
import StoryCode from './-components/StoryCode'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/input-number')({
  component: RouteComponent,
})

function RouteComponent() {
  const [value, setValue] = useState<string | number>('')

  return (
    <div className='max-w-4xl p-6'>
      <StoryTitle>Input Number</StoryTitle>
      <p className='text-15 text-gray-11 mb-10'>
        The Input Number component allows users to enter and edit numerical values. It includes features for formatting (prefix/suffix), step controls, and validation states.
      </p>

      <p className='text-14 text-gray-11 mb-4'>Before using InputNumber, import it from its location:</p>
      <StoryCode>
        {`import InputNumber from '@/components/base/inputs/InputNumber'`}
      </StoryCode>

      <div className='space-y-16'>
        {/* Default Section */}
        <section>
          <StorySubTitle>Default Usage</StorySubTitle>
          <p className='text-14 text-gray-11 mb-4'>
            A standard numerical input with no extra step controls or formatting.
          </p>
          <StoryCode>
            {`<InputNumber value={value} onChange={setValue} />`}
          </StoryCode>
          <div className='flex items-center gap-4 max-w-sm'>
            <InputNumber className='w-full' value={value} onChange={setValue} />
          </div>
        </section>

        {/* Meta Section */}
        <section>
          <StorySubTitle>Metadata (Label, Description, Tooltip)</StorySubTitle>
          <p className='text-14 text-gray-11 mb-4'>
            Add labels, descriptions, and necessity indicators to guide users:
          </p>
          <ul className='list-disc list-inside space-y-2 text-14 text-gray-11 mb-6 ml-2'>
            <li><strong>Label:</strong> A title indicating what the number represents.</li>
            <li><strong>Description:</strong> Contextual help text.</li>
            <li><strong>Tooltip:</strong> Extra details on hover.</li>
            <li><strong>Required / Optional:</strong> Visual necessity indicators.</li>
          </ul>
          <StoryCode>
            {`<InputNumber
  label='Quantity'
  description='Enter the number of items'
  placeholder='0'
  tooltip='Minimum quantity is 1'
  required
  value={value}
  onChange={setValue}
/>`}
          </StoryCode>
          <div className='flex items-center gap-4 max-w-sm'>
            <InputNumber
              className='w-full'
              label='Quantity'
              description='Enter the number of items'
              placeholder='0'
              tooltip='Minimum quantity is 1'
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
            Visual indicators for different interaction levels:
          </p>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl'>
            <div>
              <p className='text-13 font-medium mb-3'>Disabled State</p>
              <StoryCode>{"<InputNumber disabled value={10} />"}</StoryCode>
              <InputNumber disabled value={10} onChange={() => { }} />
            </div>
            <div>
              <p className='text-13 font-medium mb-3'>Error State</p>
              <StoryCode>{"<InputNumber error='Input required' />"}</StoryCode>
              <InputNumber error='Required field' value={value} onChange={setValue} />
            </div>
            <div>
              <p className='text-13 font-medium mb-3'>Read Only State</p>
              <StoryCode>{"<InputNumber readOnly value={100} />"}</StoryCode>
              <InputNumber readOnly value={100} onChange={() => { }} />
            </div>
          </div>
        </section>

        {/* Formatting Section */}
        <section>
          <StorySubTitle>Formatting (Prefix & Suffix)</StorySubTitle>
          <p className='text-14 text-gray-11 mb-4'>
            Enhance the input with units or symbols:
          </p>
          <StoryCode>
            {`<InputNumber prefix='$' placeholder='Price' />
<InputNumber suffix='%' placeholder='Percentage' />`}
          </StoryCode>
          <div className='flex flex-wrap items-center gap-4 max-w-2xl'>
            <InputNumber
              className='flex-1'
              prefix='$'
              placeholder='Price'
              value={value}
              onChange={setValue}
            />
            <InputNumber
              className='flex-1'
              suffix='%'
              placeholder='Percentage'
              value={value}
              onChange={setValue}
            />
          </div>
        </section>

        {/* Controls Section */}
        <section>
          <StorySubTitle>Behavior (Controls & Clearable)</StorySubTitle>
          <p className='text-14 text-gray-11 mb-4'>
            Add increment/decrement buttons or a clear button for better UX:
          </p>
          <StoryCode>
            {`<InputNumber withControls />
<InputNumber clearable />`}
          </StoryCode>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl'>
            <div>
              <p className='text-12 text-gray-10 mb-2 font-medium'>Step Controls</p>
              <InputNumber
                className='w-full'
                withControls
                value={value}
                onChange={setValue}
              />
            </div>
            <div>
              <p className='text-12 text-gray-10 mb-2 font-medium'>Clearable</p>
              <InputNumber
                className='w-full'
                clearable
                placeholder='Click X to clear'
                value={value}
                onChange={setValue}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
