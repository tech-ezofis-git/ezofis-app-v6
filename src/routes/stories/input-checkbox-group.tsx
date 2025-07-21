import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { InputCheckboxGroup } from '@/components/base'
import { StorySubTitle, StoryTitle } from './-components'

export const Route = createFileRoute('/stories/input-checkbox-group')({
  component: RouteComponent,
})

const options1 = [
  {
    id: 1,
    label: 'Option 1',
  },
  {
    id: 2,
    label: 'Option 2',
  },
  {
    id: 3,
    label: 'Option 3',
  },
]
const options2 = [
  {
    id: 1,
    label: 'Option 1',
  },
  {
    id: 2,
    label: 'Option 2',
  },
  {
    id: 3,
    label: 'Option 3',
  },
  {
    id: 4,
    label: 'Option 4',
  },
  {
    id: 5,
    label: 'Option 5',
  },
]
const options3 = [
  {
    description: 'Lorem ipsum dolar sit amit',
    id: 1,
    label: 'Option 1',
  },
  {
    description: 'Lorem ipsum dolar sit amit',
    id: 2,
    label: 'Option 2',
  },
  {
    description: 'Lorem ipsum dolar sit amit',
    id: 3,
    label: 'Option 3',
  },
]

function RouteComponent() {
  const [value, setValue] = useState<number[]>([])

  return (
    <div>
      <StoryTitle>26. Input Checkbox Group</StoryTitle>

      <div className='space-y-16'>
        <StorySubTitle>Default</StorySubTitle>
        <InputCheckboxGroup
          options={options1}
          value={value}
          onChange={setValue}
        />

        <StorySubTitle>Label</StorySubTitle>
        <InputCheckboxGroup
          label='Label'
          options={options1}
          tooltip='Lorem ipsum dolar sit emit'
          isOptional
        />

        <StorySubTitle>Options Per Line</StorySubTitle>
        <div className='max-w-96'>
          <InputCheckboxGroup options={options2} TOptionsPerLine={3} />
        </div>

        <StorySubTitle>Description</StorySubTitle>
        <InputCheckboxGroup options={options3} />

        <StorySubTitle>Error</StorySubTitle>
        <InputCheckboxGroup
          error='Lorem ipsum dolar sit emit'
          options={options1}
        />

        <StorySubTitle>Disabled</StorySubTitle>
        <InputCheckboxGroup options={options1} isDisabled />
      </div>
    </div>
  )
}
