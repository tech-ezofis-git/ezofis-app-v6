import { createFileRoute } from '@tanstack/react-router'
import { InputTextarea } from '@/components/base'
import { StorySubTitle, StoryTitle } from './-components'

export const Route = createFileRoute('/stories/input-textarea')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div>
      <StoryTitle>21. Input Textarea</StoryTitle>

      <div className='space-y-16'>
        <StorySubTitle>Default</StorySubTitle>
        <InputTextarea className='max-w-80' />

        <StorySubTitle>Label</StorySubTitle>
        <InputTextarea className='max-w-80' label='Textarea' />

        <StorySubTitle>Required</StorySubTitle>
        <InputTextarea className='max-w-80' label='Textarea' isRequired />

        <StorySubTitle>Optional</StorySubTitle>
        <InputTextarea className='max-w-80' label='Textarea' isOptional />

        <StorySubTitle>Tooltip</StorySubTitle>
        <InputTextarea
          className='max-w-80'
          label='Textarea'
          tooltip='Lorem ipsum dolar sit amit'
        />

        <StorySubTitle>Description</StorySubTitle>
        <InputTextarea
          className='max-w-80'
          description='Lorem ipsum dolar sit amit'
        />

        <StorySubTitle>Placeholder</StorySubTitle>
        <InputTextarea className='max-w-80' placeholder='Placeholder' />

        <StorySubTitle>Error</StorySubTitle>
        <InputTextarea
          className='max-w-80'
          error='Lorem ipsum dolar sit amit'
        />

        <StorySubTitle>Read Only</StorySubTitle>
        <InputTextarea className='max-w-80' isReadOnly />

        <StorySubTitle>Disabled</StorySubTitle>
        <InputTextarea className='max-w-80' isDisabled />

        <StorySubTitle>Resize</StorySubTitle>
        <InputTextarea className='max-w-80' resize='vertical' />

        <StorySubTitle>Autosize</StorySubTitle>
        <InputTextarea className='max-w-80' autosize />

        <StorySubTitle>Character Count</StorySubTitle>
        <InputTextarea className='max-w-80' maxLength={200} />
      </div>
    </div>
  )
}
