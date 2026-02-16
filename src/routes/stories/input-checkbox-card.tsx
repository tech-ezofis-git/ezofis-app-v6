import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import InputCheckboxCard from '@/components/base/inputs/InputCheckboxCard'
import StoryCode from './-components/StoryCode'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/input-checkbox-card')({
  component: RouteComponent,
})

function RouteComponent() {
  const [checked1, setChecked1] = useState(false)
  const [checked2, setChecked2] = useState(false)

  return (
    <div className='max-w-4xl p-6'>
      <StoryTitle>Input Checkbox Card</StoryTitle>
      <p className='text-15 text-gray-11 mb-10'>
        The Checkbox Card component provides a rich, selectable area that can include labels, descriptions, and icons. It's ideal for prominent binary choices or selection lists where extra context is beneficial.
      </p>

      <p className='text-14 text-gray-11 mb-4'>Before using InputCheckboxCard, import it from its location:</p>
      <StoryCode>
        {`import InputCheckboxCard from '@/components/base/inputs/InputCheckboxCard'`}
      </StoryCode>

      <div className='space-y-16'>
        {/* Default Section */}
        <section>
          <StorySubTitle>Default Usage</StorySubTitle>
          <p className='text-14 text-gray-11 mb-4'>
            A simple card-styled checkbox.
          </p>
          <StoryCode>
            {`<InputCheckboxCard
  checked={checked}
  label='Accept Terms'
  onClick={() => setChecked(!checked)}
/>`}
          </StoryCode>
          <div className='flex items-center gap-4 max-w-sm ml-1'>
            <InputCheckboxCard
              checked={checked1}
              className='w-full'
              label='Accept Terms'
              onClick={() => setChecked1(!checked1)}
            />
          </div>
        </section>

        {/* Rich Metadata Section */}
        <section>
          <StorySubTitle>Rich Metadata (Description & Icon)</StorySubTitle>
          <p className='text-14 text-gray-11 mb-4'>
            Enhance the card with descriptive text and an icon for better visual communication:
          </p>
          <ul className='list-disc list-inside space-y-2 text-14 text-gray-11 mb-6 ml-2'>
            <li><strong>Label:</strong> Primary heading for the selection.</li>
            <li><strong>Description:</strong> Supporting details below the label.</li>
            <li><strong>Icon:</strong> A visual marker displayed at the start of the card.</li>
          </ul>
          <StoryCode>
            {`<InputCheckboxCard
  checked={checked}
  label='Individual Account'
  description='Manage personal projects and settings'
  icon='lucide:user'
  onClick={() => setChecked(!checked)}
/>`}
          </StoryCode>
          <div className='flex items-center gap-4 max-w-sm ml-1'>
            <InputCheckboxCard
              checked={checked2}
              className='w-full'
              description='Manage personal projects and settings'
              icon='lucide:user'
              label='Individual Account'
              onClick={() => setChecked2(!checked2)}
            />
          </div>
        </section>
      </div>
    </div>
  )
}
