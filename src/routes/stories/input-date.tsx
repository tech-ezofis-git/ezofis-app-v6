import { createFileRoute } from '@tanstack/react-router'
import React from 'react'
import InputDate from '@/components/base/inputs/InputDate'
import { StorySubTitle, StoryTitle } from './-components'

export const Route = createFileRoute('/stories/input-date')({
  component: RouteComponent,
})

function RouteComponent() {
  const [value, setValue] = React.useState<string | null>(null)

  return (
    <div>
      <StoryTitle>29. Input Date</StoryTitle>

      <div className='space-y-16'>
        <StorySubTitle>Default</StorySubTitle>
        <InputDate className='max-w-80' />

        <StorySubTitle>Label</StorySubTitle>
        <InputDate className='max-w-80' label='Date' />

        <StorySubTitle>Required</StorySubTitle>
        <InputDate className='max-w-80' label='Date' required />

        <StorySubTitle>Optional</StorySubTitle>
        <InputDate className='max-w-80' label='Date' optional />

        <StorySubTitle>Tooltip</StorySubTitle>
        <InputDate
          className='max-w-80'
          label='Date'
          tooltip='Lorem ipsum dolar sit amit'
        />

        <StorySubTitle>Description</StorySubTitle>
        <InputDate
          className='max-w-80'
          description='Lorem ipsum dolar sit amit'
        />

        <StorySubTitle>Placeholder</StorySubTitle>
        <InputDate className='max-w-80' placeholder='Placeholder' />

        <StorySubTitle>Error</StorySubTitle>
        <InputDate className='max-w-80' error='Lorem ipsum dolar sit amit' />

        <StorySubTitle>Clearable</StorySubTitle>
        <InputDate
          className='max-w-80'
          value={value}
          clearable
          onChange={setValue}
        />

        <StorySubTitle>Read Only</StorySubTitle>
        <InputDate className='max-w-80' readOnly />

        <StorySubTitle>Disabled</StorySubTitle>
        <InputDate className='max-w-80' disabled />

        <StorySubTitle>Min Date</StorySubTitle>
        <InputDate className='max-w-80' minDate='2025-04-01' />

        <StorySubTitle>Max Date</StorySubTitle>
        <InputDate className='max-w-80' maxDate='2025-10-30' />
      </div>
    </div>
  )
}
