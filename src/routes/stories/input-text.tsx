import { createFileRoute } from '@tanstack/react-router'
import React from 'react'
import Icon from '@/components/base/Icon'
import InputText from '@/components/base/inputs/InputText'
import { StorySubTitle, StoryTitle } from './-components'

export const Route = createFileRoute('/stories/input-text')({
  component: RouteComponent,
})

function RouteComponent() {
  const [value, setValue] = React.useState('')

  return (
    <div>
      <StoryTitle>18. Input Text</StoryTitle>

      <div className='space-y-16'>
        <StorySubTitle>Default</StorySubTitle>
        <InputText className='max-w-80' />

        <StorySubTitle>Label</StorySubTitle>
        <InputText className='max-w-80' label='Text' />

        <StorySubTitle>Required</StorySubTitle>
        <InputText className='max-w-80' label='Text' required />

        <StorySubTitle>Optional</StorySubTitle>
        <InputText className='max-w-80' label='Text' optional />

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

        <StorySubTitle>Clearable</StorySubTitle>
        <InputText
          className='max-w-80'
          value={value}
          clearable
          onChange={setValue}
        />

        <StorySubTitle>Read Only</StorySubTitle>
        <InputText className='max-w-80' readOnly />

        <StorySubTitle>Disabled</StorySubTitle>
        <InputText className='max-w-80' disabled />

        <StorySubTitle>Left Section</StorySubTitle>
        <InputText
          className='max-w-80'
          leftSection={<Icon className='text-gray-500' name='tabler:search' />}
        />

        <StorySubTitle>Right Section</StorySubTitle>
        <InputText
          className='max-w-80'
          rightSectionPointerEvents='auto'
          rightSection={
            <Icon className='text-gray-500' name='tabler:calendar' />
          }
        />
      </div>
    </div>
  )
}
