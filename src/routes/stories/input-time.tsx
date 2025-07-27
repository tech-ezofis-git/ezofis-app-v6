import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import InputTime from '@/components/base/inputs/InputTime'
import { StorySubTitle, StoryTitle } from './-components'

export const Route = createFileRoute('/stories/input-time')({
  component: RouteComponent,
})

function RouteComponent() {
  const [value, setValue] = useState('')

  return (
    <div>
      <StoryTitle>30. Input Time</StoryTitle>

      <div className='space-y-16'>
        <StorySubTitle>Default</StorySubTitle>
        <InputTime className='max-w-80' value={value} onChange={setValue} />

        <StorySubTitle>Label</StorySubTitle>
        <InputTime
          className='max-w-80'
          label='Time'
          value={value}
          onChange={setValue}
        />

        <StorySubTitle>Required</StorySubTitle>
        <InputTime
          className='max-w-80'
          label='Time'
          value={value}
          required
          onChange={setValue}
        />

        <StorySubTitle>Optional</StorySubTitle>
        <InputTime
          className='max-w-80'
          label='Time'
          value={value}
          optional
          onChange={setValue}
        />

        <StorySubTitle>Tooltip</StorySubTitle>
        <InputTime
          className='max-w-80'
          label='Time'
          tooltip='Lorem ipsum dolar sit amit'
          value={value}
          onChange={setValue}
        />

        <StorySubTitle>Description</StorySubTitle>
        <InputTime
          className='max-w-80'
          description='Lorem ipsum dolar sit amit'
          value={value}
          onChange={setValue}
        />

        <StorySubTitle>Error</StorySubTitle>
        <InputTime
          className='max-w-80'
          error='Lorem ipsum dolar sit amit'
          value={value}
          onChange={setValue}
        />

        <StorySubTitle>Clearable</StorySubTitle>
        <InputTime
          className='max-w-80'
          value={value}
          clearable
          onChange={setValue}
        />

        <StorySubTitle>Read Only</StorySubTitle>
        <InputTime
          className='max-w-80'
          value={value}
          readOnly
          onChange={setValue}
        />

        <StorySubTitle>Disabled</StorySubTitle>
        <InputTime
          className='max-w-80'
          value={value}
          disabled
          onChange={setValue}
        />

        <StorySubTitle>Min Time</StorySubTitle>
        <InputTime
          className='max-w-80'
          minTime='10:00:00'
          value={value}
          onChange={setValue}
        />

        <StorySubTitle>Max Time</StorySubTitle>
        <InputTime
          className='max-w-80'
          maxTime='18:00:00'
          value={value}
          onChange={setValue}
        />
      </div>
    </div>
  )
}
