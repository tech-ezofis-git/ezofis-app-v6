import { createFileRoute } from '@tanstack/react-router'
import { InputPin } from '@/components/base'
import { StorySubTitle, StoryTitle } from './-components'

export const Route = createFileRoute('/stories/input-pin')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div>
      <StoryTitle>22. Input Pin</StoryTitle>

      <div className='space-y-16'>
        <StorySubTitle>Default</StorySubTitle>
        <InputPin />

        <StorySubTitle>Placeholder</StorySubTitle>
        <InputPin placeholder='0' />

        <StorySubTitle>Disabled</StorySubTitle>
        <InputPin isDisabled />

        <StorySubTitle>Error</StorySubTitle>
        <InputPin error />

        <StorySubTitle>Length</StorySubTitle>
        <InputPin length={6} />
      </div>
    </div>
  )
}
