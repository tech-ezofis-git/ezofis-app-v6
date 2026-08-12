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
// const options2 = [
//   {
//     description: 'emily.johnson@x.dummyjson.com',
//     disabled: false,
//     id: 1,
//     name: 'Emily Johnson',
//   },
//   {
//     description: 'michael.williams@x.dummyjson.com',
//     disabled: false,
//     id: 2,
//     name: 'Michael Williams',
//   },
//   {
//     description: 'sophia.brown@x.dummyjson.com',
//     disabled: false,
//     id: 3,
//     name: 'Sophia Brown',
//   },
//   {
//     description: 'james.davis@x.dummyjson.com',
//     disabled: false,
//     id: 4,
//     name: 'James Davis',
//   },
//   {
//     description: 'emma.miller@x.dummyjson.com',
//     disabled: false,
//     id: 5,
//     name: 'Emma Miller',
//   },
//   {
//     description: 'olivia.wilson@x.dummyjson.com',
//     disabled: false,
//     id: 6,
//     name: 'Olivia Wilson',
//   },
//   {
//     description: 'alexander.jones@x.dummyjson.com',
//     disabled: false,
//     id: 7,
//     name: 'Alexander Jones',
//   },
//   {
//     description: 'ava.taylor@x.dummyjson.com',
//     disabled: false,
//     id: 8,
//     name: 'Ava Taylor',
//   },
//   {
//     description: 'ethan.martinez@x.dummyjson.com',
//     disabled: false,
//     id: 9,
//     name: 'Ethan Martinez',
//   },
//   {
//     description: 'isabella.anderson@x.dummyjson.com',
//     disabled: false,
//     id: 10,
//     name: 'Isabella Anderson',
//   },
// ]
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

// const optionsDefault1 = [
//   { id: 1, name: 'Emily Johnson' },
//   { id: 2, name: 'Michael Williams' },
//   { id: 3, name: 'Sophia Brown' },
//   { id: 4, name: 'James Davis' },
// ]

const optionsWithDescription = [
  { description: 'emily.j@example.com', id: 1, name: 'Emily Johnson' },
  { description: 'michael.w@example.com', id: 2, name: 'Michael Williams' },
]

// const optionsWithDisabled1 = [
//   { id: 1, name: 'Active User' },
//   { id: 2, name: 'Suspended User', disabled: true },
// ]

function RouteComponent() {
  const [value, setValue] = useState<Option | null>(null)

  return (
    <div className='max-w-4xl p-6'>
      <StoryTitle>Input Select</StoryTitle>
      <p className='mb-10 text-15 text-gray-11'>
        The Select component provides a searchable and customizable dropdown for
        picking a single option from a list. It supports async loading, custom
        item rendering, and creation of new options.
      </p>

      <p className='mb-4 text-14 text-gray-11'>
        Before using InputSelect, import it from its location:
      </p>
      <StoryCode>
        {`import InputSelect from '@/components/base/inputs/InputSelect'`}
      </StoryCode>

      <div className='space-y-16'>
        {/* Default Section */}
        <section>
          <StorySubTitle>Default Usage</StorySubTitle>
          <p className='mb-4 text-14 text-gray-11'>
            A standard searchable dropdown.
          </p>
          <StoryCode>
            {`<InputSelect options={options} value={value} onChange={setValue} />`}
          </StoryCode>
          <div className='ml-1 max-w-sm'>
            <InputSelect
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
            Configure headings and hints to guide the user:
          </p>
          <ul className='mb-6 ml-2 list-inside list-disc space-y-2 text-14 text-gray-11'>
            <li>
              <strong>Label:</strong> The title of the select field.
            </li>
            <li>
              <strong>Description:</strong> Contextual hint below the field.
            </li>
            <li>
              <strong>Tooltip:</strong> Detailed information on hover icon.
            </li>
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
          <div className='ml-1 max-w-sm'>
            <InputSelect
              className='w-full'
              description='Choose a team member to assign this task'
              label='Assignee'
              options={optionsDefault}
              placeholder='Search members...'
              tooltip='Only members of the current workspace are shown'
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
            Additional functionality for complex selection needs:
          </p>
          <div className='grid grid-cols-1 gap-8 md:grid-cols-2'>
            <div>
              <p className='mb-3 text-13 font-medium'>Item Descriptions</p>
              <StoryCode>
                {'<InputSelect options={optionsWithDescription} />'}
              </StoryCode>
              <div className='mt-4'>
                <InputSelect
                  options={optionsWithDescription}
                  value={value}
                  onChange={setValue}
                />
              </div>
            </div>
            <div>
              <p className='mb-3 text-13 font-medium'>Clearable & Searchable</p>
              <StoryCode>{'<InputSelect clearable searchable />'}</StoryCode>
              <div className='mt-4'>
                <InputSelect
                  options={optionsDefault}
                  value={value}
                  clearable
                  searchable
                  onChange={setValue}
                />
              </div>
            </div>
            <div>
              <p className='mb-3 text-13 font-medium'>Creatable Options</p>
              <StoryCode>{'<InputSelect creatable />'}</StoryCode>
              <div className='mt-4'>
                <InputSelect
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
                {'<InputSelect options={optionsWithDisabled} />'}
              </StoryCode>
              <div className='mt-4'>
                <InputSelect
                  options={optionsWithDisabled}
                  value={value}
                  onChange={setValue}
                />
              </div>
            </div>
            <div>
              <p className='mb-3 text-13 font-medium'>Async Loading</p>
              <p className='mb-4 text-14 text-gray-11'>
                before using InputSelectAsync, import it from its location:
              </p>
              <StoryCode>{`import InputSelectAsync from '@/components/base/inputs/InputSelectAsync'`}</StoryCode>
              <StoryCode>
                {'<InputSelectAsync getQueryOptions={...} />'}
              </StoryCode>
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
          <p className='mb-6 text-14 text-gray-11'>
            Visual feedback for invalid inputs or restricted interaction:
          </p>
          <div className='grid grid-cols-1 gap-8 md:grid-cols-2'>
            <div>
              <p className='mb-3 text-13 font-medium'>Error State</p>
              <StoryCode>
                {"<InputSelect error='Invalid selection' />"}
              </StoryCode>
              <div className='mt-4'>
                <InputSelect
                  error='Please select a valid user'
                  options={optionsDefault}
                  value={value}
                  onChange={setValue}
                />
              </div>
            </div>
            <div>
              <p className='mb-3 text-13 font-medium'>Disabled State</p>
              <StoryCode>{'<InputSelect disabled />'}</StoryCode>
              <div className='mt-4'>
                <InputSelect
                  options={optionsDefault}
                  value={value}
                  disabled
                  onChange={() => {}}
                />
              </div>
            </div>
            <div>
              <p className='mb-3 text-13 font-medium'>Read Only State</p>
              <StoryCode>{'<InputSelect readOnly />'}</StoryCode>
              <div className='mt-4'>
                <InputSelect
                  options={optionsDefault}
                  value={optionsDefault[0]}
                  readOnly
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
