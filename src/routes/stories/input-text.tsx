import { createFileRoute } from '@tanstack/react-router'
import { Icon, InputText } from '@/components/base'
import { StorySubTitle, StoryTitle } from './-components'

export const Route = createFileRoute('/stories/input-text')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div>
      <StoryTitle>18. Input Text</StoryTitle>

      <div className='space-y-16'>
        <StorySubTitle>Default</StorySubTitle>
        <InputText className='max-w-80' />

        <StorySubTitle>Label</StorySubTitle>
        <InputText className='max-w-80' label='Text' />

        <StorySubTitle>Required</StorySubTitle>
        <InputText className='max-w-80' label='Text' isRequired />

        <StorySubTitle>Optional</StorySubTitle>
        <InputText className='max-w-80' label='Text' isOptional />

        <StorySubTitle>Tooltip</StorySubTitle>
        <InputText
          className='max-w-80'
          label='Text'
          tooltip='Lorem ipsum dolar sit amit'
        />

        <StorySubTitle>Description</StorySubTitle>
        <InputText
          className='max-w-80'
          description='Lorem ipsum dolar sit amit'
        />

        <StorySubTitle>Placeholder</StorySubTitle>
        <InputText className='max-w-80' placeholder='Placeholder' />

        <StorySubTitle>Error</StorySubTitle>
        <InputText className='max-w-80' error='Lorem ipsum dolar sit amit' />

        <StorySubTitle>Read Only</StorySubTitle>
        <InputText className='max-w-80' isReadOnly />

        <StorySubTitle>Disabled</StorySubTitle>
        <InputText className='max-w-80' isDisabled />

        <StorySubTitle>Left Section</StorySubTitle>
        <InputText
          className='max-w-80'
          leftSection={<Icon className='text-gray-500' name='tabler:search' />}
        />

        <StorySubTitle>Right Section</StorySubTitle>
        <InputText
          className='max-w-80'
          rightSection={<Icon className='text-gray-500' name='tabler:x' />}
          rightSectionPointerEvents='auto'
        />
      </div>
    </div>
  )
}
