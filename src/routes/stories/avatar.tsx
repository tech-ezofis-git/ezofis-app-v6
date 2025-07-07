import { createFileRoute } from '@tanstack/react-router'
import avatarImg from '@/assets/avatar.jpg'
import { Avatar } from '@/components/base'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/avatar')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div>
      <StoryTitle>8. Avatar</StoryTitle>

      <div className='space-y-12'>
        <StorySubTitle># Default</StorySubTitle>
        <Avatar initials='CH' />

        <StorySubTitle># Image</StorySubTitle>
        <Avatar image={avatarImg} initials='CH' />
      </div>
    </div>
  )
}
