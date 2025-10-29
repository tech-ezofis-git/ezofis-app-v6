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
      <StoryTitle>2. IconButton</StoryTitle>

      <div className='space-y-16'>
        <StorySubTitle>Default</StorySubTitle>
        <div className='flex flex-wrap items-center gap-2'>
          <IconButton icon='tabler:plus' />
        </div>

        <StorySubTitle>Colors</StorySubTitle>
        <div className='flex flex-wrap items-center gap-2'>
          <IconButton icon='tabler:plus' />
          <IconButton color='secondary' icon='tabler:plus' />
          <IconButton color='red' icon='tabler:plus' />
          <IconButton color='green' icon='tabler:plus' />
          <IconButton color='gray' icon='tabler:plus' />
        </div>

        <StorySubTitle>Loading</StorySubTitle>
        <div className='flex flex-wrap items-center gap-2'>
          <IconButton icon='tabler:plus' loading />
        </div>

        <StorySubTitle>Disabled</StorySubTitle>
        <div className='flex flex-wrap items-center gap-2'>
          <IconButton icon='tabler:plus' disabled />
        </div>

        <StorySubTitle>Variants</StorySubTitle>
        <div className='space-y-6'>
          <div className='flex flex-wrap items-center gap-2'>
            <IconButton icon='tabler:plus' />
            <IconButton icon='tabler:plus' variant='outline' />
            <IconButton icon='tabler:plus' variant='subtle' />
            <IconButton icon='tabler:plus' variant='ghost' />
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            <IconButton color='secondary' icon='tabler:plus' />
            <IconButton
              color='secondary'
              icon='tabler:plus'
              variant='outline'
            />
            <IconButton color='secondary' icon='tabler:plus' variant='subtle' />
            <IconButton color='secondary' icon='tabler:plus' variant='ghost' />
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            <IconButton color='red' icon='tabler:plus' />
            <IconButton color='red' icon='tabler:plus' variant='outline' />
            <IconButton color='red' icon='tabler:plus' variant='subtle' />
            <IconButton color='red' icon='tabler:plus' variant='ghost' />
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            <IconButton color='green' icon='tabler:plus' />
            <IconButton color='green' icon='tabler:plus' variant='outline' />
            <IconButton color='green' icon='tabler:plus' variant='subtle' />
            <IconButton color='green' icon='tabler:plus' variant='ghost' />
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            <IconButton color='gray' icon='tabler:plus' />
            <IconButton color='gray' icon='tabler:plus' variant='outline' />
            <IconButton color='gray' icon='tabler:plus' variant='subtle' />
            <IconButton color='gray' icon='tabler:plus' variant='ghost' />
          </div>
        </div>

        <StorySubTitle>Sizes</StorySubTitle>
        <div className='flex flex-wrap items-center gap-2'>
          <IconButton icon='tabler:plus' size='xs' />
          <IconButton icon='tabler:plus' size='sm' />
          <IconButton icon='tabler:plus' size='md' />
          <IconButton icon='tabler:plus' size='lg' />
        </div>
      </div>
    </div>
  )
}
