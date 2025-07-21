import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { InputNumber } from '@/components/base'
import { StorySubTitle, StoryTitle } from './-components'

export const Route = createFileRoute('/stories/input-number')({
  component: RouteComponent,
})

function RouteComponent() {
  const [value, setValue] = useState<string | number>(100)

  return (
    <div>
      <StoryTitle>19. Input Number</StoryTitle>

      <div className='space-y-16'>
        <StorySubTitle>Default</StorySubTitle>

        <InputNumber className='max-w-80' />

        <StorySubTitle>Label</StorySubTitle>

        <InputNumber className='max-w-80' label='Number' />

        <StorySubTitle>Required</StorySubTitle>

        <InputNumber className='max-w-80' label='Number' isRequired />

        <StorySubTitle>Optional</StorySubTitle>

        <InputNumber className='max-w-80' label='Number' isOptional />

        <StorySubTitle>Tooltip</StorySubTitle>

        <InputNumber
          className='max-w-80'
          label='Number'
          tooltip='Lorem ipsum dolar sit amit'
        />

        <StorySubTitle>Description</StorySubTitle>

        <InputNumber
          className='max-w-80'
          description='Lorem ipsum dolar sit amit'
        />

        <StorySubTitle>Placeholder</StorySubTitle>

        <InputNumber className='max-w-80' placeholder='Placeholder' />

        <StorySubTitle>Error</StorySubTitle>

        <InputNumber className='max-w-80' error='Lorem ipsum dolar sit amit' />

        <StorySubTitle>Read Only</StorySubTitle>

        <InputNumber className='max-w-80' isReadOnly />

        <StorySubTitle>Disabled</StorySubTitle>

        <InputNumber className='max-w-80' isDisabled />

        <StorySubTitle>Prefix</StorySubTitle>

        <InputNumber
          className='max-w-80'
          prefix='$'
          value={value}
          onChange={setValue}
        />

        <StorySubTitle>Suffix</StorySubTitle>

        <InputNumber
          className='max-w-80'
          suffix='%'
          value={value}
          onChange={setValue}
        />

        <StorySubTitle>Controls</StorySubTitle>

        <InputNumber className='max-w-80' withControls />
      </div>
    </div>
  )
}
