import { createFileRoute } from '@tanstack/react-router'
import type { ToastVariant } from '@/components/base/toast/types'
import Button from '@/components/base/button/Button'
import showToast from '@/components/base/toast/showToast'
import { StoryTitle } from './-components'

export const Route = createFileRoute('/stories/toast')({
  component: RouteComponent,
})

function RouteComponent() {
  const handleClick = (variant: ToastVariant) => {
    showToast({
      message:
        'Lorem ipsum dolar sit amit Lorem ipsum dolar sit amit Lorem ipsum dolar sit amit',
      variant,
    })
  }

  return (
    <div>
      <StoryTitle>15. Toast</StoryTitle>

      <div className='flex items-center gap-2'>
        <Button
          color='gray'
          label='Default'
          variant='outline'
          onClick={() => handleClick('default')}
        />
        <Button
          color='gray'
          label='Error'
          variant='outline'
          onClick={() => handleClick('error')}
        />
        <Button
          color='gray'
          label='Success'
          variant='outline'
          onClick={() => handleClick('success')}
        />
        <Button
          color='gray'
          label='Warning'
          variant='outline'
          onClick={() => handleClick('warning')}
        />
      </div>
    </div>
  )
}
