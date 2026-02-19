import { createFileRoute } from '@tanstack/react-router'
import Highlight from '@/components/base/Highlight'
import StoryCode from './-components/StoryCode'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/highlight')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className='max-w-4xl p-6'>
      <StoryTitle>Highlight</StoryTitle>
      <p className='text-15 text-gray-11 mb-10'>
        The Highlight component is used to emphasize specific words or phrases within a block of text. It's particularly useful for displaying search results or draw attention to key terms.
      </p>

      <p className='text-14 text-gray-11 mb-4'>Before using Highlight, import it from its location:</p>
      <StoryCode>
        {`import Highlight from '@/components/base/Highlight'`}
      </StoryCode>

      <div className='space-y-16'>
        {/* Default Section */}
        <section>
          <div className='w-full max-w-xl'>
            <p className='text-14 text-gray-11 mb-4'>
              Pass an array of <code>words</code> to be highlighted within the component's children:
            </p>
            <StoryCode>
              {`<Highlight words={['highlighted', 'text']}>
  This is some text that contains highlighted words.
</Highlight>`}
            </StoryCode>
            <div className='mt-8 p-4 bg-gray-2 rounded-lg border border-gray-3 leading-relaxed text-15'>
              <Highlight words={['elit', 'omnis', 'Nemo']}>
                Lorem ipsum dolor sit omnis, consectetur adipisicing elit. Culpa vel
                et autem asperiores ipsa impedit quod ut omnis at sed. Nemo totam in
                repellat iusto doloribus elit unde maiores nam.
              </Highlight>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
