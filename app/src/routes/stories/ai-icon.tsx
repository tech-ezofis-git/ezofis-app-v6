import { createFileRoute } from '@tanstack/react-router'
import IconAI from '@/components/base/icon/IconAI'
import StoryCode from './-components/StoryCode'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/ai-icon')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className='max-w-4xl p-6'>
      <StoryTitle>AI Icon</StoryTitle>
      <p className='mb-10 text-15 text-gray-11'>
        The AI Icon component is a specialized visual element used to denote
        AI-powered features within the application. It supports a static state
        and an animated pulse/sparkle effect to signify active AI processing.
      </p>

      <p className='mb-4 text-14 text-gray-11'>
        Before using AI Icon, import it from its location:
      </p>
      <StoryCode>
        {`import IconAI from '@/components/base/icon/IconAI'`}
      </StoryCode>

      <div className='space-y-16'>
        {/* Default Section */}
        <section>
          <StorySubTitle>Default Usage</StorySubTitle>
          <p className='mb-4 text-14 text-gray-11'>
            A static AI icon used for labels or feature indicators.
          </p>
          <StoryCode>{`<IconAI className='size-9' />`}</StoryCode>
          <div className='mt-4 ml-1'>
            <IconAI className='size-9 text-purple-9' />
          </div>
        </section>

        {/* Animated Section */}
        <section>
          <StorySubTitle>Active State (Animated)</StorySubTitle>
          <p className='mb-4 text-14 text-gray-11'>
            Enable the <code>animate</code> prop to show that an AI task is
            currently in progress.
          </p>
          <StoryCode>{`<IconAI className='size-9' animate />`}</StoryCode>
          <div className='mt-4 ml-1'>
            <IconAI className='size-9 text-purple-9' animate />
          </div>
        </section>
      </div>
    </div>
  )
}
