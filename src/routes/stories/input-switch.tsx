import { createFileRoute } from '@tanstack/react-router'
import { InputSwitch } from '@/components/base'
import { StorySubTitle, StoryTitle } from './-components'

export const Route = createFileRoute('/stories/input-switch')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div>
      <StoryTitle>27. Input Switch</StoryTitle>

      <div className='space-y-16'>
        <StorySubTitle>Default</StorySubTitle>
        <InputSwitch label='Label' />

        <StorySubTitle>Description</StorySubTitle>
        <InputSwitch description='Lorem ipsum dolar sit amit' label='Label' />

        <StorySubTitle>Error</StorySubTitle>
        <InputSwitch error='Error' label='Label' />

        <StorySubTitle>Disabled</StorySubTitle>
        <InputSwitch label='Label' isDisabled />
      </div>
    </div>
  )
}
