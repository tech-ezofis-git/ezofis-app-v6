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
  { description: 'emily.j@example.com', id: 1, name: 'Emily Johnson' },
  { description: 'michael.w@example.com', id: 2, name: 'Michael Williams' },
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
]

function RouteComponent() {
  const [value, setValue] = useState<Option[]>([])

  return (
    <div className='max-w-4xl p-6'>
      <StoryTitle>Input Select Multiple</StoryTitle>
      <p className='mb-10 text-15 text-gray-11'>
        The Multiple Select component allows users to choose several options
        from a dropdown list. Selected items are displayed as removable tags
        within the field.
      </p>

      <p className='mb-4 text-14 text-gray-11'>
        Before using InputSelectMultiple, import it from its location:
      </p>
      <StoryCode>
        {`import InputSelectMultiple from '@/components/base/inputs/InputSelectMultiple'`}
      </StoryCode>

      <div className='space-y-16'>
        {/* Default Section */}
        <section>
          <StorySubTitle>Default Usage</StorySubTitle>
          <p className='mb-4 text-14 text-gray-11'>
            A standard multi-select dropdown with tags.
          </p>
          <StoryCode>
            {`<InputSelectMultiple options={options} value={value} onChange={setValue} />`}
          </StoryCode>
          <div className='ml-1 max-w-sm'>
            <InputSelectMultiple
              className='w-full'
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
            Organize the field with clear labels and help text:
          </p>
          <ul className='mb-6 ml-2 list-inside list-disc space-y-2 text-14 text-gray-11'>
            <li>
              <strong>Label:</strong> Overall field title.
            </li>
            <li>
              <strong>Description:</strong> Contextual help below the tags.
            </li>
            <li>
              <strong>Tooltip:</strong> Specific details on hover icon.
            </li>
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
          <div className='ml-1 max-w-sm'>
            <InputSelectMultiple
              className='w-full'
              description='Select all members involved in the sprint'
              label='Team Members'
              options={optionsDefault}
              placeholder='Add members...'
              tooltip='Only active team members are available'
              value={value}
              required
              onChange={setValue}
            />
          </div>
        </section>

        {/* Features Section */}
        <section>
          <StorySubTitle>Advanced Features</StorySubTitle>
          <p className='mb-6 text-14 text-gray-11'>
            Extended functionality for multi-select workflows:
          </p>
          <div className='grid grid-cols-1 gap-8 md:grid-cols-2'>
            <div>
              <p className='mb-3 text-13 font-medium'>
                Individual Descriptions
              </p>
              <StoryCode>
                {'<InputSelectMultiple options={optionsWithDescription} />'}
              </StoryCode>
              <div className='mt-4'>
                <InputSelectMultiple
                  options={optionsWithDescription}
                  value={[]}
                  onChange={() => {}}
                />
              </div>
            </div>
            <div>
              <p className='mb-3 text-13 font-medium'>Searchable & Clearable</p>
              <StoryCode>
                {'<InputSelectMultiple searchable clearable />'}
              </StoryCode>
              <div className='mt-4'>
                <InputSelectMultiple
                  options={optionsDefault}
                  value={value}
                  clearable
                  searchable
                  onChange={setValue}
                />
              </div>
            </div>
            <div>
              <p className='mb-3 text-13 font-medium'>Creatable Tags</p>
              <StoryCode>{'<InputSelectMultiple creatable />'}</StoryCode>
              <div className='mt-4'>
                <InputSelectMultiple
                  options={optionsDefault}
                  value={value}
                  creatable
                  onChange={setValue}
                />
              </div>
            </div>
            <div>
              <p className='mb-3 text-13 font-medium'>With Disabled Options</p>
              <StoryCode>
                {'<InputSelectMultiple options={optionsWithDisabled} />'}
              </StoryCode>
              <div className='mt-4'>
                <InputSelectMultiple
                  options={optionsWithDisabled}
                  value={value}
                  onChange={setValue}
                />
              </div>
            </div>
            <div>
              <p className='mb-3 text-13 font-medium'>Async Multi-Select</p>
              <p className='mb-4 text-14 text-gray-11'>
                Before using InputSelectMultipleAsync, import it from its
                location:
              </p>
              <StoryCode>{`import InputSelectMultipleAsync from '@/components/base/inputs/InputSelectMultipleAsync'`}</StoryCode>
              <StoryCode>
                {'<InputSelectMultipleAsync getQueryOptions={...} />'}
              </StoryCode>
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
          <p className='mb-6 text-14 text-gray-11'>
            Visual indicators for selection status and constraints:
          </p>
          <div className='grid grid-cols-1 gap-8 md:grid-cols-2'>
            <div>
              <p className='mb-3 text-13 font-medium'>Error State</p>
              <StoryCode>
                {"<InputSelectMultiple error='Invalid selection' />"}
              </StoryCode>
              <div className='mt-4'>
                <InputSelectMultiple
                  error='At least two members required'
                  options={optionsDefault}
                  value={value}
                  onChange={setValue}
                />
              </div>
            </div>
            <div>
              <p className='mb-3 text-13 font-medium'>Disabled State</p>
              <StoryCode>{'<InputSelectMultiple disabled />'}</StoryCode>
              <div className='mt-4'>
                <InputSelectMultiple
                  options={optionsDefault}
                  value={value}
                  disabled
                  onChange={() => {}}
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
