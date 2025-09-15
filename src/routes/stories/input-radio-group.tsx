import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import InputRadioGroup from '@/components/base/inputs/InputRadioGroup'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/input-radio-group')({
  component: RouteComponent,
})

const options1 = [
  {
    id: 1,
    name: 'Option 1',
  },
  {
    id: 2,
    name: 'Option 2',
  },
  {
    id: 3,
    name: 'Option 3',
  },
]
const options2 = [
  {
    id: 1,
    name: 'Option 1',
  },
  {
    id: 2,
    name: 'Option 2',
  },
  {
    id: 3,
    name: 'Option 3',
  },
  {
    id: 4,
    name: 'Option 4',
  },
  {
    id: 5,
    name: 'Option 5',
  },
]
const options3 = [
  {
    description: 'Lorem ipsum dolar sit amit',
    id: 1,
    name: 'Option 1',
  },
  {
    description: 'Lorem ipsum dolar sit amit',
    id: 2,
    name: 'Option 2',
  },
  {
    description: 'Lorem ipsum dolar sit amit',
    id: 3,
    name: 'Option 3',
  },
]

function RouteComponent() {
  const [value, setValue] = useState<number | null>(null)

  return (
    <div>
      <StoryTitle>24. Input Radio Group</StoryTitle>

      <div className='space-y-16'>
        <StorySubTitle>Default</StorySubTitle>
        <InputRadioGroup options={options1} value={value} onChange={setValue} />

        <StorySubTitle>Meta</StorySubTitle>
        <InputRadioGroup
          className='max-w-80'
          description='Lorem ipsum dolar sit amit'
          label='Label'
          options={options1}
          tooltip='Lorem ipsum dolar sit amit'
          value={value}
          optional
          required
          onChange={setValue}
        />

        <StorySubTitle>Options Per Line</StorySubTitle>
        <div className='max-w-96'>
          <InputRadioGroup
            options={options2}
            optionsPerLine={3}
            value={value}
            onChange={setValue}
          />
        </div>

        <StorySubTitle>Description</StorySubTitle>
        <InputRadioGroup options={options3} value={value} onChange={setValue} />

        <StorySubTitle>Error</StorySubTitle>
        <InputRadioGroup
          error='Lorem ipsum dolar sit emit'
          options={options1}
          value={value}
          onChange={setValue}
        />

        <StorySubTitle>Disabled</StorySubTitle>
        <InputRadioGroup
          options={options1}
          value={value}
          disabled
          onChange={setValue}
        />
      </div>
    </div>
  )
}
