import { createFileRoute } from '@tanstack/react-router'
import IconButton from '@/components/base/button/IconButton'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/icon-button')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div>
      <StoryTitle>2. Icon Button</StoryTitle>

      <div className='space-y-16'>
        <StorySubTitle>Default</StorySubTitle>
        <div className='flex flex-wrap items-center gap-2'>
          <IconButton icon='lucide:plus' />
        </div>

        <StorySubTitle>Colors</StorySubTitle>
        <div className='flex flex-wrap items-center gap-2'>
          <IconButton icon='lucide:plus' />
          <IconButton color='secondary' icon='lucide:plus' />
          <IconButton color='red' icon='lucide:plus' />
          <IconButton color='green' icon='lucide:plus' />
          <IconButton color='gray' icon='lucide:plus' />
        </div>

        <StorySubTitle>Loading</StorySubTitle>
        <div className='flex flex-wrap items-center gap-2'>
          <IconButton icon='lucide:plus' loading />
        </div>

        <StorySubTitle>Disabled</StorySubTitle>
        <div className='flex flex-wrap items-center gap-2'>
          <IconButton icon='lucide:plus' disabled />
        </div>

        <StorySubTitle>Variants</StorySubTitle>
        <div className='space-y-6'>
          <div className='flex flex-wrap items-center gap-2'>
            <IconButton icon='lucide:plus' />
            <IconButton icon='lucide:plus' variant='outline' />
            <IconButton icon='lucide:plus' variant='subtle' />
            <IconButton icon='lucide:plus' variant='ghost' />
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            <IconButton color='secondary' icon='lucide:plus' />
            <IconButton
              color='secondary'
              icon='lucide:plus'
              variant='outline'
            />
            <IconButton color='secondary' icon='lucide:plus' variant='subtle' />
            <IconButton color='secondary' icon='lucide:plus' variant='ghost' />
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            <IconButton color='red' icon='lucide:plus' />
            <IconButton color='red' icon='lucide:plus' variant='outline' />
            <IconButton color='red' icon='lucide:plus' variant='subtle' />
            <IconButton color='red' icon='lucide:plus' variant='ghost' />
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            <IconButton color='green' icon='lucide:plus' />
            <IconButton color='green' icon='lucide:plus' variant='outline' />
            <IconButton color='green' icon='lucide:plus' variant='subtle' />
            <IconButton color='green' icon='lucide:plus' variant='ghost' />
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            <IconButton color='gray' icon='lucide:plus' />
            <IconButton color='gray' icon='lucide:plus' variant='outline' />
            <IconButton color='gray' icon='lucide:plus' variant='subtle' />
            <IconButton color='gray' icon='lucide:plus' variant='ghost' />
          </div>
        </div>

        <StorySubTitle>Sizes</StorySubTitle>
        <div className='flex flex-wrap items-center gap-2'>
          <IconButton icon='lucide:plus' size='xs' />
          <IconButton icon='lucide:plus' size='sm' />
          <IconButton icon='lucide:plus' />
          <IconButton icon='lucide:plus' size='lg' />
          <IconButton icon='lucide:plus' size='xl' />
        </div>
      </div>
    </div>
  )
}
