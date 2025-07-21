import { createFileRoute } from '@tanstack/react-router'
import { InputDate } from '@/components/base'
import { StorySubTitle, StoryTitle } from './-components'

export const Route = createFileRoute('/stories/input-date')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div>
      <StoryTitle>29. Input Date</StoryTitle>

      <div className='space-y-16'>
        <StorySubTitle>Default</StorySubTitle>
        <InputDate className='max-w-80' />

        <StorySubTitle>Label</StorySubTitle>
        <InputDate className='max-w-80' label='Date' />

        <StorySubTitle>Required</StorySubTitle>
        <InputDate className='max-w-80' label='Date' isRequired />

        <StorySubTitle>Optional</StorySubTitle>
        <InputDate className='max-w-80' label='Date' isOptional />

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

        <StorySubTitle>Read Only</StorySubTitle>
        <InputDate className='max-w-80' isReadOnly />

        <StorySubTitle>Disabled</StorySubTitle>
        <InputDate className='max-w-80' isDisabled />

        <StorySubTitle>Min Date</StorySubTitle>
        <InputDate className='max-w-80' minDate='2025-04-01' />

        <StorySubTitle>Max Date</StorySubTitle>
        <InputDate className='max-w-80' maxDate='2025-10-30' />
      </div>
    </div>
  )
}
