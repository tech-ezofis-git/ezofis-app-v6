import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import type { Option } from '@/types/option'
import { getUserOptionListQueryOptions } from '@/api/dummy/queries'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputSelectAsync from '@/components/base/inputs/InputSelectAsync'
import StoryCode from './-components/StoryCode'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/input-select')({
  component: RouteComponent,
})

const optionsDefault = [
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
    disabled: false,
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
    disabled: false,
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
    disabled: false,
    id: 9,
    name: 'Ethan Martinez',
  },
  {
    disabled: false,
    id: 10,
    name: 'Isabella Anderson',
  },
]
const options2 = [
  {
    description: 'emily.johnson@x.dummyjson.com',
    disabled: false,
    id: 1,
    name: 'Emily Johnson',
  },
  {
    description: 'michael.williams@x.dummyjson.com',
    disabled: false,
    id: 2,
    name: 'Michael Williams',
  },
  {
    description: 'sophia.brown@x.dummyjson.com',
    disabled: false,
    id: 3,
    name: 'Sophia Brown',
  },
  {
    description: 'james.davis@x.dummyjson.com',
    disabled: false,
    id: 4,
    name: 'James Davis',
  },
  {
    description: 'emma.miller@x.dummyjson.com',
    disabled: false,
    id: 5,
    name: 'Emma Miller',
  },
  {
    description: 'olivia.wilson@x.dummyjson.com',
    disabled: false,
    id: 6,
    name: 'Olivia Wilson',
  },
  {
    description: 'alexander.jones@x.dummyjson.com',
    disabled: false,
    id: 7,
    name: 'Alexander Jones',
  },
  {
    description: 'ava.taylor@x.dummyjson.com',
    disabled: false,
    id: 8,
    name: 'Ava Taylor',
  },
  {
    description: 'ethan.martinez@x.dummyjson.com',
    disabled: false,
    id: 9,
    name: 'Ethan Martinez',
  },
  {
    description: 'isabella.anderson@x.dummyjson.com',
    disabled: false,
    id: 10,
    name: 'Isabella Anderson',
  },
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

const optionsDefault1 = [
  { id: 1, name: 'Emily Johnson' },
  { id: 2, name: 'Michael Williams' },
  { id: 3, name: 'Sophia Brown' },
  { id: 4, name: 'James Davis' },
]

const optionsWithDescription = [
  { id: 1, name: 'Emily Johnson', description: 'emily.j@example.com' },
  { id: 2, name: 'Michael Williams', description: 'michael.w@example.com' },
]

const optionsWithDisabled1 = [
  { id: 1, name: 'Active User' },
  { id: 2, name: 'Suspended User', disabled: true },
]

function RouteComponent() {
  const [value, setValue] = useState<Option | null>(null)

  return (
    <div className='max-w-4xl p-6'>
      <StoryTitle>Input Select</StoryTitle>
      <p className='text-15 text-gray-11 mb-10'>
        The Select component provides a searchable and customizable dropdown for picking a single option from a list. It supports async loading, custom item rendering, and creation of new options.
      </p>

      <p className='text-14 text-gray-11 mb-4'>Before using InputSelect, import it from its location:</p>
      <StoryCode>
        {`import InputSelect from '@/components/base/inputs/InputSelect'`}
      </StoryCode>

      <div className='space-y-16'>
        {/* Default Section */}
        <section>
          <StorySubTitle>Default Usage</StorySubTitle>
          <p className='text-14 text-gray-11 mb-4'>
            A standard searchable dropdown.
          </p>
          <StoryCode>
            {`<InputSelect options={options} value={value} onChange={setValue} />`}
          </StoryCode>
          <div className='max-w-sm ml-1'>
            <InputSelect options={optionsDefault} value={value} onChange={setValue} className='w-full' />
          </div>
        </section>

        {/* Metadata Section */}
        <section>
          <StorySubTitle>Metadata (Label, Description, Tooltip)</StorySubTitle>
          <p className='text-14 text-gray-11 mb-4'>
            Configure headings and hints to guide the user:
          </p>
          <ul className='list-disc list-inside space-y-2 text-14 text-gray-11 mb-6 ml-2'>
            <li><strong>Label:</strong> The title of the select field.</li>
            <li><strong>Description:</strong> Contextual hint below the field.</li>
            <li><strong>Tooltip:</strong> Detailed information on hover icon.</li>
          </ul>
          <StoryCode>
            {`<InputSelect
  label='Assignee'
  description='Choose a team member to assign this task'
  tooltip='Only members of the current workspace are shown'
  placeholder='Search members...'
  options={options}
  value={value}
  onChange={setValue}
  required
/>`}
          </StoryCode>
          <div className='max-w-sm ml-1'>
            <InputSelect
              label='Assignee'
              description='Choose a team member to assign this task'
              tooltip='Only members of the current workspace are shown'
              placeholder='Search members...'
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
            Additional functionality for complex selection needs:
          </p>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
            <div>
              <p className='text-13 font-medium mb-3'>Item Descriptions</p>
              <StoryCode>{"<InputSelect options={optionsWithDescription} />"}</StoryCode>
              <div className='mt-4'>
                <InputSelect options={optionsWithDescription} value={value}
                  onChange={setValue} />
              </div>
            </div>
            <div>
              <p className='text-13 font-medium mb-3'>Clearable & Searchable</p>
              <StoryCode>{"<InputSelect clearable searchable />"}</StoryCode>
              <div className='mt-4'>
                <InputSelect clearable searchable options={optionsDefault} value={value} onChange={setValue} />
              </div>
            </div>
            <div>
              <p className='text-13 font-medium mb-3'>Creatable Options</p>
              <StoryCode>{"<InputSelect creatable />"}</StoryCode>
              <div className='mt-4'>
                <InputSelect creatable options={optionsDefault} value={value} onChange={setValue} />
              </div>
            </div>
            <div>
              <p className='text-13 font-medium mb-3'>With Disabled Options</p>
              <StoryCode>{"<InputSelect options={optionsWithDisabled} />"}</StoryCode>
              <div className='mt-4'>
                <InputSelect options={optionsWithDisabled} value={value}
                  onChange={setValue} />
              </div>
            </div>
            <div>
              <p className='text-13 font-medium mb-3'>Async Loading</p>
              <p className='text-14 text-gray-11 mb-4'>
                before using InputSelectAsync, import it from its location:
              </p>
              <StoryCode>{`import InputSelectAsync from '@/components/base/inputs/InputSelectAsync'`}</StoryCode>
              <StoryCode>{"<InputSelectAsync getQueryOptions={...} />"}</StoryCode>
              <div className='mt-4'>
                <InputSelectAsync
                  description='Loads data on scroll'
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
            Visual feedback for invalid inputs or restricted interaction:
          </p>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
            <div>
              <p className='text-13 font-medium mb-3'>Error State</p>
              <StoryCode>{"<InputSelect error='Invalid selection' />"}</StoryCode>
              <div className='mt-4'>
                <InputSelect error='Please select a valid user' options={optionsDefault} value={value} onChange={setValue} />
              </div>
            </div>
            <div>
              <p className='text-13 font-medium mb-3'>Disabled State</p>
              <StoryCode>{"<InputSelect disabled />"}</StoryCode>
              <div className='mt-4'>
                <InputSelect disabled options={optionsDefault} value={value} onChange={() => { }} />
              </div>
            </div>
            <div>
              <p className='text-13 font-medium mb-3'>Read Only State</p>
              <StoryCode>{"<InputSelect readOnly />"}</StoryCode>
              <div className='mt-4'>
                <InputSelect readOnly options={optionsDefault} value={optionsDefault[0]} onChange={() => { }} />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
