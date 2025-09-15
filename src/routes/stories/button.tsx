import { createFileRoute } from '@tanstack/react-router'
import Button from '@/components/base/button/Button'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/button')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div>
      <StoryTitle>1. Button</StoryTitle>

      <div className='space-y-16'>
        <StorySubTitle>Default</StorySubTitle>
        <div className='flex flex-wrap items-center gap-2'>
          <Button label='Button' />
        </div>

        <StorySubTitle>Colors</StorySubTitle>
        <div className='flex flex-wrap items-center gap-2'>
          <Button label='Button' />
          <Button color='secondary' label='Button' />
          <Button color='red' label='Button' />
          <Button color='green' label='Button' />
          <Button color='gray' label='Button' />
        </div>

        <StorySubTitle>Loading</StorySubTitle>
        <div className='flex flex-wrap items-center gap-2'>
          <Button label='Button' loading />
        </div>

        <StorySubTitle>Disabled</StorySubTitle>
        <div className='flex flex-wrap items-center gap-2'>
          <Button label='Button' disabled />
        </div>

        <StorySubTitle>With Icons</StorySubTitle>
        <div className='flex flex-wrap items-center gap-2'>
          <Button icon='tabler:plus' label='Button' />
          <Button label='Button' suffixIcon='tabler:plus' />
        </div>

        <StorySubTitle>Variants</StorySubTitle>
        <div className='space-y-6'>
          <div className='flex flex-wrap items-center gap-2'>
            <Button label='Button' />
            <Button label='Button' variant='outline' />
            <Button label='Button' variant='subtle' />
            <Button label='Button' variant='ghost' />
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            <Button color='secondary' label='Button' />
            <Button color='secondary' label='Button' variant='outline' />
            <Button color='secondary' label='Button' variant='subtle' />
            <Button color='secondary' label='Button' variant='ghost' />
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            <Button color='red' label='Button' />
            <Button color='red' label='Button' variant='outline' />
            <Button color='red' label='Button' variant='subtle' />
            <Button color='red' label='Button' variant='ghost' />
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            <Button color='green' label='Button' />
            <Button color='green' label='Button' variant='outline' />
            <Button color='green' label='Button' variant='subtle' />
            <Button color='green' label='Button' variant='ghost' />
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            <Button color='gray' label='Button' />
            <Button color='gray' label='Button' variant='outline' />
            <Button color='gray' label='Button' variant='subtle' />
            <Button color='gray' label='Button' variant='ghost' />
          </div>
        </div>

        <StorySubTitle>Sizes</StorySubTitle>
        <div className='flex flex-wrap items-center gap-2'>
          <Button label='Button' size='xs' />
          <Button label='Button' size='sm' />
          <Button label='Button' size='md' />
          <Button label='Button' size='lg' />
          <Button label='Button' size='xl' />
        </div>
      </div>
    </div>
  )
}
