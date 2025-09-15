import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import InputSwitchGroup from '@/components/base/inputs/InputSwitchGroup'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/input-switch-group')({
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
  const [value, setValue] = useState<number[]>([])

  return (
    <div>
      <StoryTitle>28. Input Switch Group</StoryTitle>

      <div className='space-y-16'>
        <StorySubTitle>Default</StorySubTitle>
        <InputSwitchGroup
          options={options1}
          value={value}
          onChange={setValue}
        />

        <StorySubTitle>Meta</StorySubTitle>
        <InputSwitchGroup
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
          <InputSwitchGroup
            options={options2}
            optionsPerLine={3}
            value={value}
            onChange={setValue}
          />
        </div>

        <StorySubTitle>Description</StorySubTitle>
        <InputSwitchGroup
          options={options3}
          value={value}
          onChange={setValue}
        />

        <StorySubTitle>Error</StorySubTitle>
        <InputSwitchGroup
          error='Lorem ipsum dolar sit emit'
          options={options1}
          value={value}
          onChange={setValue}
        />

        <StorySubTitle>Disabled</StorySubTitle>
        <InputSwitchGroup
          options={options1}
          value={value}
          disabled
          onChange={setValue}
        />
      </div>
    </div>
  )
}
