import { createFileRoute } from '@tanstack/react-router'
import Avatar from '@/components/base/Avatar'
import Indicator from '@/components/base/Indicator'
import StoryCode from './-components/StoryCode'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/indicator')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className='max-w-4xl p-6'>
      <StoryTitle>Indicator</StoryTitle>
      <p className='text-15 text-gray-11 mb-10'>
        The Indicator component is used to draw attention to a specific element, typically denoting status (e.g., online/offline), notifications, or processing states. It is designed to be anchored to children like Avatars or Icons.
      </p>

      <p className='text-14 text-gray-11 mb-4'>Before using Indicator, import it from its location:</p>
      <StoryCode>
        {`import Indicator from '@/components/base/Indicator'`}
      </StoryCode>

      <div className='space-y-16'>
        {/* Default Section */}
        <section>
          <StorySubTitle>Default Usage</StorySubTitle>
          <p className='text-14 text-gray-11 mb-4'>
            A static indicator anchored to a child component.
          </p>
          <StoryCode>
            {`<Indicator offset={5}>
  <Avatar initials='JD' />
</Indicator>`}
          </StoryCode>
          <div className='ml-1 mt-4'>
            <Indicator offset={5}>
              <Avatar initials='JD' />
            </Indicator>
          </div>
        </section>

        {/* Animation Section */}
        <section>
          <StorySubTitle>Processing State (Animated)</StorySubTitle>
          <p className='text-14 text-gray-11 mb-4'>
            Enable the <code>animate</code> prop to add a pulse effect, useful for "live" statuses.
          </p>
          <StoryCode>
            {`<Indicator offset={5} animate>
  <Avatar initials='JD' />
</Indicator>`}
          </StoryCode>
          <div className='ml-1 mt-4'>
            <Indicator offset={5} animate>
              <Avatar initials='JD' />
            </Indicator>
          </div>
        </section>

        {/* Colors Section */}
        <section>
          <StorySubTitle>Semantic Colors</StorySubTitle>
          <p className='text-14 text-gray-11 mb-6'>
            Visual indicators for different status types:
          </p>
          <div className='flex items-center gap-12 ml-1 mt-4'>
            <div>
              <p className='text-13 font-medium mb-3'>Primary (Online)</p>
              <StoryCode>{`<Indicator color='primary' />`}</StoryCode>
              <div className='mt-3'>
                <Indicator offset={5} animate>
                  <Avatar initials='ON' />
                </Indicator>
              </div>
            </div>
            <div>
              <p className='text-13 font-medium mb-3'>Secondary (Away)</p>
              <StoryCode>{`<Indicator color='secondary' />`}</StoryCode>
              <div className='mt-3'>
                <Indicator color='secondary' offset={5} animate>
                  <Avatar initials='AW' />
                </Indicator>
              </div>
            </div>
            <div>
              <p className='text-13 font-medium mb-3'>Error (Alert)</p>
              <StoryCode>{`<Indicator color='red' />`}</StoryCode>
              <div className='mt-3'>
                <Indicator color='red' offset={5} animate>
                  <Avatar initials='ER' />
                </Indicator>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
