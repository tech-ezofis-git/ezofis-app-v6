import { createFileRoute } from '@tanstack/react-router'
import type { ToastVariant } from '@/components/base/toast/types'
import Button from '@/components/base/button/Button'
import showToast from '@/components/base/toast/showToast'
import StoryCode from './-components/StoryCode'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/toast')({
  component: RouteComponent,
})

function RouteComponent() {
  const handleClick = (variant: ToastVariant) => {
    showToast({
      message:
        'This is a notification message that providing feedback about an action.',
      variant,
    })
  }

  return (
    <div className='max-w-4xl p-6'>
      <StoryTitle>Toast</StoryTitle>
      <p className='mb-10 text-15 text-gray-11'>
        Toasts are brief, non-intrusive notifications that appear at the corner
        of the screen to provide feedback about an operation’s success, failure,
        or status. They stay visible for a few seconds before automatically
        disappearing.
      </p>

      <p className='mb-4 text-14 text-gray-11'>
        Before using toasts, import the trigger function:
      </p>
      <StoryCode>
        {`import showToast from '@/components/base/toast/showToast'`}
      </StoryCode>

      <div className='space-y-16'>
        {/* Variants Section */}
        <section>
          <StorySubTitle>Notification Variants</StorySubTitle>
          <p className='mb-6 text-14 text-gray-11'>
            Choose a variant that matches the semantic meaning of the
            notification:
          </p>
          <StoryCode>
            {`showToast({ message: 'Operation successful', variant: 'success' })
showToast({ message: 'Action failed', variant: 'error' })`}
          </StoryCode>
          <div className='mt-8 ml-1 flex flex-wrap items-center gap-3'>
            <Button
              color='gray'
              label='Default'
              variant='outline'
              onClick={() => handleClick('default')}
            />
            <Button
              color='green'
              label='Success'
              variant='outline'
              onClick={() => handleClick('success')}
            />
            <Button
              color='red'
              label='Error'
              variant='outline'
              onClick={() => handleClick('error')}
            />
            <Button
              color='secondary'
              label='Warning'
              variant='outline'
              onClick={() => handleClick('warning')}
            />
          </div>
        </section>

        {/* Usage Section */}
        <section>
          <StorySubTitle>How to Trigger</StorySubTitle>
          <p className='mb-4 text-14 text-gray-11'>
            Trigger a toast from any part of your application without needing a
            local state or hook:
          </p>
          <StoryCode>
            {`const handleSubmit = async () => {
  try {
    await saveSettings();
    showToast({ message: 'Settings saved', variant: 'success' });
  } catch {
    showToast({ message: 'Failed to save', variant: 'error' });
  }
}`}
          </StoryCode>
        </section>
      </div>
    </div>
  )
}
