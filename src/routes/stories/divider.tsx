import { createFileRoute } from '@tanstack/react-router'
import Divider from '@/components/base/Divider'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/divider')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div>
      <StoryTitle>10. Divider</StoryTitle>

      <div className='space-y-16'>
        <StorySubTitle>Default</StorySubTitle>
        <Divider />

        <StorySubTitle>With Label</StorySubTitle>
        <div className='space-y-6'>
          <Divider label='Label' />
          <Divider label='Label' labelPosition='left' />
          <Divider label='Label' labelPosition='right' />
        </div>

        <StorySubTitle>Vertical</StorySubTitle>
        <Divider className='h-10' orientation='vertical' />
      </div>
    </div>
  )
}
