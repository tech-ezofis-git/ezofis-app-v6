import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import InputDate from '@/components/base/inputs/InputDate'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/input-date')({
  component: RouteComponent,
})

function RouteComponent() {
  const [value, setValue] = useState<string | null>(null)

  return (
    <div>
      <StoryTitle>29. Input Date</StoryTitle>

      <div className='space-y-16'>
        <StorySubTitle>Default</StorySubTitle>
        <InputDate className='max-w-80' value={value} onChange={setValue} />

        <StorySubTitle>Meta</StorySubTitle>
        <InputDate
          className='max-w-80'
          description='Lorem ipsum dolar sit amit'
          label='Label'
          placeholder='Placeholder'
          tooltip='Lorem ipsum dolar sit amit'
          value={value}
          optional
          required
          onChange={setValue}
        />

        <StorySubTitle>Error</StorySubTitle>
        <InputDate
          className='max-w-80'
          error='Lorem ipsum dolar sit amit'
          value={value}
          onChange={setValue}
        />

        <StorySubTitle>Clearable</StorySubTitle>
        <InputDate
          className='max-w-80'
          value={value}
          clearable
          onChange={setValue}
        />

        <StorySubTitle>Read Only</StorySubTitle>
        <InputDate
          className='max-w-80'
          value={value}
          readOnly
          onChange={setValue}
        />

        <StorySubTitle>Disabled</StorySubTitle>
        <InputDate
          className='max-w-80'
          value={value}
          disabled
          onChange={setValue}
        />

        <StorySubTitle>Min Date</StorySubTitle>
        <InputDate
          className='max-w-80'
          minDate='2025-04-01'
          value={value}
          onChange={setValue}
        />

        <StorySubTitle>Max Date</StorySubTitle>
        <InputDate
          className='max-w-80'
          maxDate='2025-10-30'
          value={value}
          onChange={setValue}
        />
      </div>
    </div>
  )
}
