import { createFileRoute } from '@tanstack/react-router'
import Alert from '@/components/base/Alert'
import StoryCode from './-components/StoryCode'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/Alert')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className='max-w-4xl p-6'>
      <StoryTitle>Alert</StoryTitle>
      <p className='mb-10 text-15 text-gray-11'>
        Alerts provide important, high-visibility feedback or information to the
        user. They are typically used to communicate success messages, warnings,
        or errors that require immediate attention.
      </p>

      <p className='mb-4 text-14 text-gray-11'>
        Before using Alert, import it from its location:
      </p>
      <StoryCode>{`import Alert from '@/components/base/Alert'`}</StoryCode>

      <div className='space-y-16'>
        {/* Default Section */}
        <section>
          <StorySubTitle>Default Usage</StorySubTitle>
          <p className='mb-4 text-14 text-gray-11'>
            A standard alert message with a neutral background.
          </p>
          <StoryCode>
            {`<Alert text='Update successful: Your profile has been saved.' />`}
          </StoryCode>
          <div className='ml-1 max-w-md'>
            <Alert text='Update successful: Your profile has been saved.' />
          </div>
        </section>

        {/* Variants Section */}
        <section>
          <StorySubTitle>Semantic Variants</StorySubTitle>
          <p className='mb-6 text-14 text-gray-11'>
            Use variants to communicate the nature of the information:
          </p>
          <div className='max-w-md space-y-4'>
            <div>
              <p className='mb-3 text-13 font-medium'>Success (Green)</p>
              <StoryCode>{`<Alert variant='green' text='Changes applied successfully.' />`}</StoryCode>
              <div className='mt-3'>
                <Alert text='Changes applied successfully.' variant='green' />
              </div>
            </div>
            <div>
              <p className='mb-3 text-13 font-medium'>Error (Red)</p>
              <StoryCode>{`<Alert variant='red' text='Failed to save. Please try again.' />`}</StoryCode>
              <div className='mt-3'>
                <Alert text='Failed to save. Please try again.' variant='red' />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
