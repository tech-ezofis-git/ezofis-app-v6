import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import type { Option } from '@/types/option'
import { getUserOptionListQueryOptions } from '@/api/dummy/queries'
import InputSelectMultiple from '@/components/base/inputs/InputSelectMultiple'
import InputSelectMultipleAsync from '@/components/base/inputs/InputSelectMultipleAsync'
import StoryCode from './-components/StoryCode'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/input-select-multiple')({
  component: RouteComponent,
})

const optionsDefault = [
  { id: 1, name: 'Emily Johnson' },
  { id: 2, name: 'Michael Williams' },
  { id: 3, name: 'Sophia Brown' },
  { id: 4, name: 'James Davis' },
]

const optionsWithDescription = [
  { id: 1, name: 'Emily Johnson', description: 'emily.j@example.com' },
  { id: 2, name: 'Michael Williams', description: 'michael.w@example.com' },
]

const optionsWithDisabled = [
  {
    disabled: false,
    id: 1,
    name: 'Emily Johnson',
  },
  {
    disabled: false,
    id: 2,
    name: 'Michael Williams',
  },
  {
    disabled: true,
    id: 3,
    name: 'Sophia Brown',
  },
  {
    disabled: false,
    id: 4,
    name: 'James Davis',
  },
  {
    disabled: false,
    id: 5,
    name: 'Emma Miller',
  },
  {
    disabled: true,
    id: 6,
    name: 'Olivia Wilson',
  },
  {
    disabled: false,
    id: 7,
    name: 'Alexander Jones',
  },
  {
    disabled: false,
    id: 8,
    name: 'Ava Taylor',
  },
  {
    disabled: true,
    id: 9,
    name: 'Ethan Martinez',
  },
  {
    disabled: false,
    id: 10,
    name: 'Isabella Anderson',
  },
];

function RouteComponent() {
  const [value, setValue] = useState<Option[]>([])

  return (
    <div className='max-w-4xl p-6'>
      <StoryTitle>Input Select Multiple</StoryTitle>
      <p className='text-15 text-gray-11 mb-10'>
        The Multiple Select component allows users to choose several options from a dropdown list. Selected items are displayed as removable tags within the field.
      </p>

      <p className='text-14 text-gray-11 mb-4'>Before using InputSelectMultiple, import it from its location:</p>
      <StoryCode>
        {`import InputSelectMultiple from '@/components/base/inputs/InputSelectMultiple'`}
      </StoryCode>

      <div className='space-y-16'>
        {/* Default Section */}
        <section>
          <StorySubTitle>Default Usage</StorySubTitle>
          <p className='text-14 text-gray-11 mb-4'>
            A standard multi-select dropdown with tags.
          </p>
          <StoryCode>
            {`<InputSelectMultiple options={options} value={value} onChange={setValue} />`}
          </StoryCode>
          <div className='max-w-sm ml-1'>
            <InputSelectMultiple options={optionsDefault} value={value} onChange={setValue} className='w-full' />
          </div>
        </section>

        {/* Metadata Section */}
        <section>
          <StorySubTitle>Metadata (Label, Description, Tooltip)</StorySubTitle>
          <p className='text-14 text-gray-11 mb-4'>
            Organize the field with clear labels and help text:
          </p>
          <ul className='list-disc list-inside space-y-2 text-14 text-gray-11 mb-6 ml-2'>
            <li><strong>Label:</strong> Overall field title.</li>
            <li><strong>Description:</strong> Contextual help below the tags.</li>
            <li><strong>Tooltip:</strong> Specific details on hover icon.</li>
          </ul>
          <StoryCode>
            {`<InputSelectMultiple
  label='Team Members'
  description='Select all members involved in the sprint'
  tooltip='Only active team members are available'
  placeholder='Add members...'
  options={options}
  value={value}
  onChange={setValue}
  required
/>`}
          </StoryCode>
          <div className='max-w-sm ml-1'>
            <InputSelectMultiple
              label='Team Members'
              description='Select all members involved in the sprint'
              tooltip='Only active team members are available'
              placeholder='Add members...'
              options={optionsDefault}
              value={value}
              onChange={setValue}
              className='w-full'
              required
            />
          </div>
        </section>

        {/* Features Section */}
        <section>
          <StorySubTitle>Advanced Features</StorySubTitle>
          <p className='text-14 text-gray-11 mb-6'>
            Extended functionality for multi-select workflows:
          </p>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
            <div>
              <p className='text-13 font-medium mb-3'>Individual Descriptions</p>
              <StoryCode>{"<InputSelectMultiple options={optionsWithDescription} />"}</StoryCode>
              <div className='mt-4'>
                <InputSelectMultiple options={optionsWithDescription} value={[]} onChange={() => { }} />
              </div>
            </div>
            <div>
              <p className='text-13 font-medium mb-3'>Searchable & Clearable</p>
              <StoryCode>{"<InputSelectMultiple searchable clearable />"}</StoryCode>
              <div className='mt-4'>
                <InputSelectMultiple searchable clearable options={optionsDefault} value={value} onChange={setValue} />
              </div>
            </div>
            <div>
              <p className='text-13 font-medium mb-3'>Creatable Tags</p>
              <StoryCode>{"<InputSelectMultiple creatable />"}</StoryCode>
              <div className='mt-4'>
                <InputSelectMultiple creatable options={optionsDefault} value={value} onChange={setValue} />
              </div>
            </div>
            <div>
              <p className='text-13 font-medium mb-3'>With Disabled Options</p>
              <StoryCode>{"<InputSelectMultiple options={optionsWithDisabled} />"}</StoryCode>
              <div className='mt-4'>
                <InputSelectMultiple options={optionsWithDisabled} value={value}
                  onChange={setValue} />
              </div>
            </div>
            <div>
              <p className='text-13 font-medium mb-3'>Async Multi-Select</p>
              <p className='text-14 text-gray-11 mb-4'>Before using InputSelectMultipleAsync, import it from its location:</p>
              <StoryCode>{`import InputSelectMultipleAsync from '@/components/base/inputs/InputSelectMultipleAsync'`}</StoryCode>
              <StoryCode>{"<InputSelectMultipleAsync getQueryOptions={...} />"}</StoryCode>
              <div className='mt-4'>
                <InputSelectMultipleAsync
                  description='Load more as you scroll'
                  value={value}
                  getQueryOptions={getUserOptionListQueryOptions}
                  onChange={setValue}
                />
              </div>
            </div>
          </div>
        </section>

        {/* States Section */}
        <section>
          <StorySubTitle>Interaction States</StorySubTitle>
          <p className='text-14 text-gray-11 mb-6'>
            Visual indicators for selection status and constraints:
          </p>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
            <div>
              <p className='text-13 font-medium mb-3'>Error State</p>
              <StoryCode>{"<InputSelectMultiple error='Invalid selection' />"}</StoryCode>
              <div className='mt-4'>
                <InputSelectMultiple error='At least two members required' options={optionsDefault} value={value} onChange={setValue} />
              </div>
            </div>
            <div>
              <p className='text-13 font-medium mb-3'>Disabled State</p>
              <StoryCode>{"<InputSelectMultiple disabled />"}</StoryCode>
              <div className='mt-4'>
                <InputSelectMultiple disabled options={optionsDefault} value={value} onChange={() => { }} />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
