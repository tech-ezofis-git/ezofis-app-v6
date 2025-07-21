import { createFileRoute } from '@tanstack/react-router'
import { Icon, InputPassword } from '@/components/base'
import { StorySubTitle, StoryTitle } from './-components'

export const Route = createFileRoute('/stories/input-password')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div>
      <StoryTitle>20. Input Password</StoryTitle>

      <div className='space-y-16'>
        <StorySubTitle>Default</StorySubTitle>
        <InputPassword className='max-w-80' />

        <StorySubTitle>Label</StorySubTitle>
        <InputPassword className='max-w-80' label='Password' />

        <StorySubTitle>Required</StorySubTitle>
        <InputPassword className='max-w-80' label='Password' isRequired />

        <StorySubTitle>Optional</StorySubTitle>
        <InputPassword className='max-w-80' label='Password' isOptional />

        <StorySubTitle>Tooltip</StorySubTitle>
        <InputPassword
          className='max-w-80'
          label='Password'
          tooltip='Lorem ipsum dolar sit amit'
        />

        <StorySubTitle>Description</StorySubTitle>
        <InputPassword
          className='max-w-80'
          description='Lorem ipsum dolar sit amit'
        />

        <StorySubTitle>Error</StorySubTitle>
        <InputPassword
          className='max-w-80'
          error='Lorem ipsum dolar sit amit'
        />

        <StorySubTitle>Disabled</StorySubTitle>
        <InputPassword className='max-w-80' isDisabled />

        <StorySubTitle>Left Section</StorySubTitle>
        <InputPassword
          className='max-w-80'
          leftSection={<Icon className='text-gray-500' name='tabler:lock' />}
        />
      </div>
    </div>
  )
}
