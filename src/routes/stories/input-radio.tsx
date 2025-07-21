import { createFileRoute } from '@tanstack/react-router'
import { InputRadio } from '@/components/base'
import { StorySubTitle, StoryTitle } from './-components'

export const Route = createFileRoute('/stories/input-radio')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div>
      <StoryTitle>23. Input Radio</StoryTitle>

      <div className='space-y-16'>
        <StorySubTitle>Default</StorySubTitle>
        <InputRadio label='Label' />

        <StorySubTitle>Description</StorySubTitle>
        <InputRadio description='Lorem ipsum dolar sit amit' label='Label' />

        <StorySubTitle>Error</StorySubTitle>
        <InputRadio error='Error' label='Label' />

        <StorySubTitle>Disabled</StorySubTitle>
        <InputRadio label='Label' isDisabled />
      </div>
    </div>
  )
}
