import { createFileRoute } from '@tanstack/react-router'
import avatarImg from '@/assets/avatar.jpg'
import Avatar from '@/components/base/Avatar'
import StoryCode from './-components/StoryCode'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/avatar')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className='max-w-4xl p-6'>
      <StoryTitle>Avatar</StoryTitle>
      <p className='mb-10 text-15 text-gray-11'>
        The Avatar component is used to represent a user or an entity visually.
        It supports images, initials, and fallback icons to ensure a consistent
        representation even when user data is partially missing.
      </p>

      <p className='mb-4 text-14 text-gray-11'>
        Before using Avatar, import it from its location:
      </p>
      <StoryCode>{`import Avatar from '@/components/base/Avatar'`}</StoryCode>

      <div className='space-y-16'>
        {/* Default Section */}
        <section>
          <StorySubTitle>Default Usage (Initials)</StorySubTitle>
          <p className='mb-4 text-14 text-gray-11'>
            When an image is unavailable, the component displays initials as a
            fallback.
          </p>
          <StoryCode>{`<Avatar initials='CH' />`}</StoryCode>
          <div className='ml-1'>
            <Avatar initials='CH' />
          </div>
        </section>

        {/* Image Section */}
        <section>
          <StorySubTitle>Image Representation</StorySubTitle>
          <p className='mb-4 text-14 text-gray-11'>
            Pass an image source to display a user's profile photo.
          </p>
          <StoryCode>
            {`import avatarImg from '@/assets/avatar.jpg'

<Avatar image={avatarImg} initials='CH' />`}
          </StoryCode>
          <div className='ml-1'>
            <Avatar image={avatarImg} initials='CH' />
          </div>
        </section>
      </div>
    </div>
  )
}
