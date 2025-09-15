import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import Icon from '@/components/base/icon/Icon'
import InputText from '@/components/base/inputs/InputText'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/input-text')({
  component: RouteComponent,
})

function RouteComponent() {
  const [value, setValue] = useState('')

  return (
    <div>
      <StoryTitle>18. Input Text</StoryTitle>

      <div className='space-y-16'>
        <StorySubTitle>Default</StorySubTitle>
        <InputText className='max-w-80' value={value} onChange={setValue} />

        <StorySubTitle>Meta</StorySubTitle>
        <InputText
          className='max-w-80'
          description='Lorem ipsum dolar sit amit'
          label='Label'
          placeholder='Placeholder'
          tooltip='Lorem ipsum dolar sit amit'
          value={value}
          optional
          required
          onChange={setValue}
        />

        <StorySubTitle>Error</StorySubTitle>
        <InputText
          className='max-w-80'
          error='Lorem ipsum dolar sit amit'
          value={value}
          onChange={setValue}
        />

        <StorySubTitle>Clearable</StorySubTitle>
        <InputText
          className='max-w-80'
          value={value}
          clearable
          onChange={setValue}
        />

        <StorySubTitle>Read Only</StorySubTitle>
        <InputText
          className='max-w-80'
          value={value}
          readOnly
          onChange={setValue}
        />

        <StorySubTitle>Disabled</StorySubTitle>
        <InputText
          className='max-w-80'
          value={value}
          disabled
          onChange={setValue}
        />

        <StorySubTitle>Left Section</StorySubTitle>
        <InputText
          className='max-w-80'
          leftSection={<Icon className='text-gray-9' name='tabler:search' />}
          value={value}
          onChange={setValue}
        />

        <StorySubTitle>Right Section</StorySubTitle>
        <InputText
          className='max-w-80'
          rightSection={<Icon className='text-gray-9' name='tabler:calendar' />}
          rightSectionPointerEvents='auto'
          value={value}
          onChange={setValue}
        />
      </div>
    </div>
  )
}
