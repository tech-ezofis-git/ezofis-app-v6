import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import InputTextarea from '@/components/base/inputs/InputTextarea'
import StoryCode from './-components/StoryCode'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/input-textarea')({
  component: RouteComponent,
})

function RouteComponent() {
  const [value, setValue] = useState('')

  return (
    <div className='max-w-4xl p-6'>
      <StoryTitle>Input Textarea</StoryTitle>
      <p className='text-15 text-gray-11 mb-10'>
        The Textarea component allows users to enter and edit multi-line text. It is ideal for long-form content like comments, descriptions, or messages.
      </p>

      <p className='text-14 text-gray-11 mb-4'>Before using InputTextarea, import it from its location:</p>
      <StoryCode>
        {`import InputTextarea from '@/components/base/inputs/InputTextarea'`}
      </StoryCode>

      <div className='space-y-16'>
        {/* Default Section */}
        <section>
          <StorySubTitle>Default Usage</StorySubTitle>
          <p className='text-14 text-gray-11 mb-4'>
            A standard textarea with basic multi-line input capabilities.
          </p>
          <StoryCode>
            {`<InputTextarea value={value} onChange={setValue} />`}
          </StoryCode>
          <div className='flex items-center gap-4 max-w-sm'>
            <InputTextarea className='w-full' value={value} onChange={setValue} />
          </div>
        </section>

        {/* Meta Section */}
        <section>
          <StorySubTitle>Metadata (Label, Description, Tooltip)</StorySubTitle>
          <p className='text-14 text-gray-11 mb-4'>
            Configure headings, hints, and necessity indicators:
          </p>
          <ul className='list-disc list-inside space-y-2 text-14 text-gray-11 mb-6 ml-2'>
            <li><strong>Label:</strong> A clear title for the textarea.</li>
            <li><strong>Description:</strong> Contextual help text below the label.</li>
            <li><strong>Tooltip:</strong> Detailed info accessible via hover icon.</li>
            <li><strong>Required / Optional:</strong> Visual labels for field requirements.</li>
          </ul>
          <StoryCode>
            {`<InputTextarea
  label='Comments'
  description='Provide any additional feedback'
  placeholder='Enter your comments here...'
  tooltip='Max 500 characters'
  required
  value={value}
  onChange={setValue}
/>`}
          </StoryCode>
          <div className='flex items-center gap-4 max-w-sm'>
            <InputTextarea
              className='w-full'
              label='Comments'
              description='Provide any additional feedback'
              placeholder='Enter your comments here...'
              tooltip='Max 500 characters'
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
              <StoryCode>{"<InputTextarea disabled value='Read-only content' />"}</StoryCode>
              <InputTextarea disabled value='This area is disabled' onChange={() => { }} />
            </div>
            <div>
              <p className='text-13 font-medium mb-3'>Error State</p>
              <StoryCode>{"<InputTextarea error='Submission failed' />"}</StoryCode>
              <InputTextarea error='Comments are required' value={value} onChange={setValue} />
            </div>
          </div>
        </section>

        {/* Sizing & Resize Section */}
        <section>
          <StorySubTitle>Sizing & Resize</StorySubTitle>
          <p className='text-14 text-gray-11 mb-4'>
            Control how the textarea grows and whether users can manually resize it:
          </p>
          <StoryCode>
            {`<InputTextarea autosize minRows={4} />
<InputTextarea resize='vertical' />`}
          </StoryCode>
          <div className='flex flex-wrap items-start gap-4 max-w-2xl'>
            <div className='flex-1'>
              <p className='text-12 text-gray-10 mb-2 font-medium'>Autosize (Grows with content)</p>
              <InputTextarea
                className='w-full'
                autosize
                minRows={2}
                placeholder='Type to grow...'
                value={value}
                onChange={setValue}
              />
            </div>
            <div className='flex-1'>
              <p className='text-12 text-gray-10 mb-2 font-medium'>Manual Vertical Resize</p>
              <InputTextarea
                className='w-full'
                resize='vertical'
                placeholder='Resize me vertically'
                value={value}
                onChange={setValue}
              />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section>
          <StorySubTitle>Character Count</StorySubTitle>
          <p className='text-14 text-gray-11 mb-4'>
            Limit input length and display a native character count:
          </p>
          <StoryCode>
            {`<InputTextarea maxLength={100} value={value} onChange={setValue} />`}
          </StoryCode>
          <div className='flex items-center gap-4 max-w-sm'>
            <InputTextarea
              className='w-full'
              maxLength={100}
              placeholder='Try typing beyond 100 chars'
              value={value}
              onChange={setValue}
            />
          </div>
        </section>
      </div>
    </div>
  )
}
