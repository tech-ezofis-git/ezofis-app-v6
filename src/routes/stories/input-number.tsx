import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import InputNumber from '@/components/base/inputs/InputNumber'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/input-number')({
  component: RouteComponent,
})

function RouteComponent() {
  const [value, setValue] = useState<string | number>('')

  return (
    <div>
      <StoryTitle>19. Input Number</StoryTitle>

      <div className='space-y-16'>
        <StorySubTitle>Default</StorySubTitle>
        <InputNumber className='max-w-80' value={value} onChange={setValue} />

        <StorySubTitle>Meta</StorySubTitle>
        <InputNumber
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
        <InputNumber
          className='max-w-80'
          error='Lorem ipsum dolar sit amit'
          value={value}
          onChange={setValue}
        />

        <StorySubTitle>Clearable</StorySubTitle>
        <InputNumber
          className='max-w-80'
          value={value}
          clearable
          onChange={setValue}
        />

        <StorySubTitle>Read Only</StorySubTitle>
        <InputNumber
          className='max-w-80'
          value={value}
          readOnly
          onChange={setValue}
        />

        <StorySubTitle>Disabled</StorySubTitle>
        <InputNumber
          className='max-w-80'
          value={value}
          disabled
          onChange={setValue}
        />

        <StorySubTitle>Prefix</StorySubTitle>
        <InputNumber
          className='max-w-80'
          prefix='$'
          value={value}
          onChange={setValue}
        />

        <StorySubTitle>Suffix</StorySubTitle>
        <InputNumber
          className='max-w-80'
          suffix='%'
          value={value}
          onChange={setValue}
        />

        <StorySubTitle>Controls</StorySubTitle>
        <InputNumber
          className='max-w-80'
          value={value}
          withControls
          onChange={setValue}
        />
      </div>
    </div>
  )
}
