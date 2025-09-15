import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import InputTextarea from '@/components/base/inputs/InputTextarea'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/input-textarea')({
  component: RouteComponent,
})

function RouteComponent() {
  const [value, setValue] = useState('')

  return (
    <div>
      <StoryTitle>21. Input Textarea</StoryTitle>

      <div className='space-y-16'>
        <StorySubTitle>Default</StorySubTitle>
        <InputTextarea className='max-w-80' value={value} onChange={setValue} />

        <StorySubTitle>Meta</StorySubTitle>
        <InputTextarea
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
        <InputTextarea
          className='max-w-80'
          error='Lorem ipsum dolar sit amit'
          value={value}
          onChange={setValue}
        />

        <StorySubTitle>Read Only</StorySubTitle>
        <InputTextarea
          className='max-w-80'
          value={value}
          readOnly
          onChange={setValue}
        />

        <StorySubTitle>Disabled</StorySubTitle>
        <InputTextarea
          className='max-w-80'
          value={value}
          disabled
          onChange={setValue}
        />

        <StorySubTitle>Resize</StorySubTitle>
        <InputTextarea
          className='max-w-80'
          resize='vertical'
          value={value}
          onChange={setValue}
        />

        <StorySubTitle>Autosize</StorySubTitle>
        <InputTextarea
          className='max-w-80'
          value={value}
          autosize
          onChange={setValue}
        />

        <StorySubTitle>Character Count</StorySubTitle>
        <InputTextarea
          className='max-w-80'
          maxLength={200}
          value={value}
          onChange={setValue}
        />
      </div>
    </div>
  )
}
