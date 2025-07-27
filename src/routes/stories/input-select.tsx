import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import type { Option } from '@/types/option'
import { getUserOptionListQueryOptions } from '@/api/dummy/queries'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputSelectAsync from '@/components/base/inputs/InputSelectAsync'
import { StorySubTitle, StoryTitle } from './-components'

export const Route = createFileRoute('/stories/input-select')({
  component: RouteComponent,
})

const options1 = [
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
const options3 = [
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
  const [selected, setSelected] = useState<Option | null>(null)

  return (
    <div>
      <StoryTitle>31. Input Select</StoryTitle>

      <div className='space-y-16'>
        <StorySubTitle>Default</StorySubTitle>
        <InputSelect
          className='max-w-80'
          options={options1}
          value={selected}
          onChange={setSelected}
        />

        <StorySubTitle>With Description</StorySubTitle>
        <InputSelect
          className='max-w-80'
          options={options2}
          value={selected}
          onChange={setSelected}
        />

        <StorySubTitle>With Disabled Options</StorySubTitle>
        <InputSelect
          className='max-w-80'
          options={options3}
          value={selected}
          onChange={setSelected}
        />

        <StorySubTitle>Searchable</StorySubTitle>
        <InputSelect
          className='max-w-80'
          options={options1}
          value={selected}
          searchable
          onChange={setSelected}
        />

        <StorySubTitle>Creatable</StorySubTitle>
        <InputSelect
          className='max-w-80'
          options={options1}
          value={selected}
          creatable
          onChange={setSelected}
        />

        <StorySubTitle>Dynamic Options</StorySubTitle>
        <InputSelectAsync
          className='max-w-80'
          description='Load more data on scroll'
          getQueryOptions={getUserOptionListQueryOptions}
          value={selected}
          onChange={setSelected}
        />

        <StorySubTitle>Label</StorySubTitle>
        <InputSelect
          className='max-w-80'
          label='Label'
          options={options1}
          value={selected}
          onChange={setSelected}
        />

        <StorySubTitle>Required</StorySubTitle>
        <InputSelect
          className='max-w-80'
          label='Label'
          options={options1}
          value={selected}
          required
          onChange={setSelected}
        />

        <StorySubTitle>Optional</StorySubTitle>
        <InputSelect
          className='max-w-80'
          label='Label'
          options={options1}
          value={selected}
          optional
          onChange={setSelected}
        />

        <StorySubTitle>Tooltip</StorySubTitle>
        <InputSelect
          className='max-w-80'
          label='Label'
          options={options1}
          tooltip='Lorem ipsum dolar sit amit'
          value={selected}
          onChange={setSelected}
        />

        <StorySubTitle>Description</StorySubTitle>
        <InputSelect
          className='max-w-80'
          description='Lorem ipsum dolar sit amit'
          options={options1}
          value={selected}
          onChange={setSelected}
        />

        <StorySubTitle>Placeholder</StorySubTitle>
        <InputSelect
          className='max-w-80'
          options={options1}
          placeholder='Select User'
          value={selected}
          onChange={setSelected}
        />

        <StorySubTitle>Error</StorySubTitle>
        <InputSelect
          className='max-w-80'
          error='Lorem ipsum dolar sit amit'
          options={options1}
          value={selected}
          onChange={setSelected}
        />

        <StorySubTitle>Clearable</StorySubTitle>
        <InputSelect
          className='max-w-80'
          label='Label'
          options={options1}
          value={selected}
          clearable
          onChange={setSelected}
        />

        <StorySubTitle>Read Only</StorySubTitle>
        <InputSelect
          className='max-w-80'
          options={options1}
          value={selected}
          readOnly
          onChange={setSelected}
        />

        <StorySubTitle>Disabled</StorySubTitle>
        <InputSelect
          className='max-w-80'
          options={options1}
          value={selected}
          disabled
          onChange={setSelected}
        />
      </div>
    </div>
  )
}
