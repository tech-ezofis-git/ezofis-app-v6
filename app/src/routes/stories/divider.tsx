import { createFileRoute } from '@tanstack/react-router'
import Divider from '@/components/base/Divider'
import StoryCode from './-components/StoryCode'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/divider')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className='max-w-4xl p-6'>
      <StoryTitle>Divider</StoryTitle>
      <p className='mb-10 text-15 text-gray-11'>
        The Divider component is used to separate content into distinct
        sections, improving visual hierarchy and readability. It supports
        horizontal and vertical orientations, along with optional text labels.
      </p>

      <p className='mb-4 text-14 text-gray-11'>
        Before using Divider, import it from its location:
      </p>
      <StoryCode>{`import Divider from '@/components/base/Divider'`}</StoryCode>

      <div className='space-y-16'>
        {/* Default Section */}
        <section>
          <StorySubTitle>Default Usage</StorySubTitle>
          <p className='mb-4 text-14 text-gray-11'>
            A standard horizontal line that spans the width of its container.
          </p>
          <StoryCode>{`<Divider />`}</StoryCode>
          <div className='mt-8 ml-1'>
            <Divider />
          </div>
        </section>

        {/* Labels Section */}
        <section>
          <StorySubTitle>With Labels</StorySubTitle>
          <p className='mb-6 text-14 text-gray-11'>
            Add context to your separators by including a label at various
            positions:
          </p>
          <div className='ml-1 space-y-8'>
            <div>
              <p className='mb-3 text-13 font-medium text-gray-10'>
                Center Label (Default)
              </p>
              <StoryCode>{`<Divider label='Section Title' />`}</StoryCode>
              <div className='mt-4'>
                <Divider label='Section Title' />
              </div>
            </div>
            <div>
              <p className='mb-3 text-13 font-medium text-gray-10'>
                Left Label
              </p>
              <StoryCode>{`<Divider label='Details' labelPosition='left' />`}</StoryCode>
              <div className='mt-4'>
                <Divider label='Details' labelPosition='left' />
              </div>
            </div>
            <div>
              <p className='mb-3 text-13 font-medium text-gray-10'>
                Right Label
              </p>
              <StoryCode>{`<Divider label='Page 1' labelPosition='right' />`}</StoryCode>
              <div className='mt-4'>
                <Divider label='Page 1' labelPosition='right' />
              </div>
            </div>
          </div>
        </section>

        {/* Vertical Section */}
        <section>
          <StorySubTitle>Vertical Orientation</StorySubTitle>
          <p className='mb-4 text-14 text-gray-11'>
            Use the <code>vertical</code> orientation to separate content
            side-by-side. Ensure the divider has a defined height.
          </p>
          <StoryCode>
            {`<Divider className='h-10' orientation='vertical' />`}
          </StoryCode>
          <div className='mt-8 ml-4 flex h-10 items-center gap-4'>
            <span className='text-14 text-gray-11'>Option A</span>
            <Divider className='h-6' orientation='vertical' />
            <span className='text-14 text-gray-11'>Option B</span>
            <Divider className='h-6' orientation='vertical' />
            <span className='text-14 text-gray-11'>Option C</span>
          </div>
        </section>
      </div>
    </div>
  )
}
