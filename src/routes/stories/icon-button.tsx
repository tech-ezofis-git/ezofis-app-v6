import { createFileRoute } from '@tanstack/react-router'
import { IconButton } from '@/components/base'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/icon-button')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div>
      <StoryTitle>2. IconButton</StoryTitle>

      <div className='space-y-12'>
        <StorySubTitle># Default</StorySubTitle>
        <div className='flex flex-wrap items-center gap-2'>
          <IconButton icon='tabler:cloud-download' />
        </div>

        <StorySubTitle># Colors</StorySubTitle>
        <div className='flex flex-wrap items-center gap-2'>
          <IconButton icon='tabler:cloud-download' />
          <IconButton color='red' icon='tabler:cloud-download' />
          <IconButton color='gray' icon='tabler:cloud-download' />
        </div>

        <StorySubTitle># Loading</StorySubTitle>
        <div className='flex flex-wrap items-center gap-2'>
          <IconButton icon='tabler:cloud-download' isLoading />
        </div>

        <StorySubTitle># Disabled</StorySubTitle>
        <div className='flex flex-wrap items-center gap-2'>
          <IconButton icon='tabler:cloud-download' isDisabled />
        </div>

        <StorySubTitle># Variants</StorySubTitle>
        <div className='space-y-6'>
          <div className='flex flex-wrap items-center gap-2'>
            <IconButton icon='tabler:cloud-download' />
            <IconButton icon='tabler:cloud-download' variant='outline' />
            <IconButton icon='tabler:cloud-download' variant='subtle' />
            <IconButton icon='tabler:cloud-download' variant='ghost' />
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            <IconButton color='red' icon='tabler:cloud-download' />
            <IconButton
              color='red'
              icon='tabler:cloud-download'
              variant='outline'
            />
            <IconButton
              color='red'
              icon='tabler:cloud-download'
              variant='subtle'
            />
            <IconButton
              color='red'
              icon='tabler:cloud-download'
              variant='ghost'
            />
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            <IconButton color='gray' icon='tabler:cloud-download' />
            <IconButton
              color='gray'
              icon='tabler:cloud-download'
              variant='outline'
            />
            <IconButton
              color='gray'
              icon='tabler:cloud-download'
              variant='subtle'
            />
            <IconButton
              color='gray'
              icon='tabler:cloud-download'
              variant='ghost'
            />
          </div>
        </div>

        <StorySubTitle># Sizes</StorySubTitle>
        <div className='flex flex-wrap items-center gap-2'>
          <IconButton icon='tabler:cloud-download' size='xs' />
          <IconButton icon='tabler:cloud-download' size='sm' />
          <IconButton icon='tabler:cloud-download' size='md' />
        </div>
      </div>
    </div>
  )
}
