import { createFileRoute } from '@tanstack/react-router'
import InputCheckbox from '@/components/base/inputs/InputCheckbox'
import { StorySubTitle, StoryTitle } from './-components'

export const Route = createFileRoute('/stories/input-checkbox')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div>
      <StoryTitle>25. Input Checkbox</StoryTitle>

      <div className='space-y-16'>
        <StorySubTitle>Default</StorySubTitle>
        <InputCheckbox label='Label' />

        <StorySubTitle>Description</StorySubTitle>
        <InputCheckbox description='Lorem ipsum dolar sit amit' label='Label' />

        <StorySubTitle>Error</StorySubTitle>
        <InputCheckbox error='Error' label='Label' />

        <StorySubTitle>Disabled</StorySubTitle>
        <InputCheckbox label='Label' disabled />

        <StorySubTitle>Indeterminate</StorySubTitle>
        <InputCheckbox label='Label' indeterminate />
      </div>
    </div>
  )
}
