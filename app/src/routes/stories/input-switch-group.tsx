import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import InputSwitchGroup from '@/components/base/inputs/InputSwitchGroup'
import StoryCode from './-components/StoryCode'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/input-switch-group')({
  component: RouteComponent,
})

const optionsDefault = [
  { id: 1, name: 'Email Alerts' },
  { id: 2, name: 'Push Notifications' },
  { id: 3, name: 'SMS Updates' },
]

const optionsLarge = Array.from({ length: 6 }, (_, i) => ({
  id: i + 1,
  name: `Toggle ${i + 1}`,
}))

const optionsWithDescription = [
  { description: 'Promotional offers and campaigns', id: 1, name: 'Marketing' },
  {
    description: 'Login alerts and MFA notifications',
    id: 2,
    name: 'Security',
  },
  { description: 'Core updates and maintenance news', id: 3, name: 'System' },
]

function RouteComponent() {
  const [value, setValue] = useState<number[]>([])

  return (
    <div className='max-w-4xl p-6'>
      <StoryTitle>Input Switch Group</StoryTitle>
      <p className='mb-10 text-15 text-gray-11'>
        The Switch Group component allows users to manage multiple independent
        on/off settings. It organizes several toggles into a unified logical
        group with shared metadata.
      </p>

      <p className='mb-4 text-14 text-gray-11'>
        Before using InputSwitchGroup, import it from its location:
      </p>
      <StoryCode>
        {`import InputSwitchGroup from '@/components/base/inputs/InputSwitchGroup'`}
      </StoryCode>

      <div className='space-y-16'>
        {/* Default Section */}
        <section>
          <StorySubTitle>Default Usage</StorySubTitle>
          <p className='mb-4 text-14 text-gray-11'>
            A simple group with vertically stacked toggle switches.
          </p>
          <StoryCode>
            {`<InputSwitchGroup options={options} value={value} onChange={setValue} />`}
          </StoryCode>
          <div className='ml-1'>
            <InputSwitchGroup
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
            Define headings and help text for the entire group:
          </p>
          <ul className='mb-6 ml-2 list-inside list-disc space-y-2 text-14 text-gray-11'>
            <li>
              <strong>Label:</strong> The title of the toggle group.
            </li>
            <li>
              <strong>Description:</strong> General instructions or context.
            </li>
            <li>
              <strong>Tooltip:</strong> Detailed information on hover icon.
            </li>
          </ul>
          <StoryCode>
            {`<InputSwitchGroup
  label='Notification Settings'
  description='Choose your preferred communication channels'
  tooltip='Some channels may incur additional carrier charges'
  options={options}
  value={value}
  onChange={setValue}
  required
/>`}
          </StoryCode>
          <div className='ml-1 max-w-sm'>
            <InputSwitchGroup
              className='w-full'
              description='Choose your preferred communication channels'
              label='Notification Settings'
              options={optionsDefault}
              tooltip='Some channels may incur additional carrier charges'
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
            Organize switches into a grid layout using{' '}
            <code>optionsPerLine</code>:
          </p>
          <StoryCode>
            {`<InputSwitchGroup options={options} optionsPerLine={3} />`}
          </StoryCode>
          <div className='ml-1 max-w-lg'>
            <InputSwitchGroup
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
            Individual toggles within the group can include specialized
            descriptions:
          </p>
          <StoryCode>
            {`<InputSwitchGroup options={optionsWithDescription} />`}
          </StoryCode>
          <div className='ml-1 max-w-sm'>
            <InputSwitchGroup
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
            Visual indicators for disabled settings or invalid configurations:
          </p>
          <div className='grid max-w-2xl grid-cols-1 gap-8 md:grid-cols-2'>
            <div>
              <p className='mb-3 text-13 font-medium'>Disabled State</p>
              <StoryCode>
                {'<InputSwitchGroup disabled options={options} />'}
              </StoryCode>
              <div className='mt-4 ml-1'>
                <InputSwitchGroup
                  options={optionsDefault}
                  value={[1]}
                  disabled
                  onChange={() => {}}
                />
              </div>
            </div>
            <div>
              <p className='mb-3 text-13 font-medium'>Error State</p>
              <StoryCode>
                {"<InputSwitchGroup error='Required' options={options} />"}
              </StoryCode>
              <div className='mt-4 ml-1'>
                <InputSwitchGroup
                  error='At least one channel must be enabled'
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
