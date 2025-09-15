import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import InputCheckbox from '@/components/base/inputs/InputCheckbox'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/input-checkbox')({
  component: RouteComponent,
})

function RouteComponent() {
  const [checked, setChecked] = useState(false)

  return (
    <div>
      <StoryTitle>25. Input Checkbox</StoryTitle>

      <div className='space-y-16'>
        <StorySubTitle>Default</StorySubTitle>
        <InputCheckbox checked={checked} label='Label' onChange={setChecked} />

        <StorySubTitle>Description</StorySubTitle>
        <InputCheckbox
          checked={checked}
          description='Lorem ipsum dolar sit amit'
          label='Label'
          onChange={setChecked}
        />

        <StorySubTitle>Error</StorySubTitle>
        <InputCheckbox
          checked={checked}
          error='Error'
          label='Label'
          onChange={setChecked}
        />

        <StorySubTitle>Disabled</StorySubTitle>
        <InputCheckbox
          checked={checked}
          label='Label'
          disabled
          onChange={setChecked}
        />

        <StorySubTitle>Indeterminate</StorySubTitle>
        <InputCheckbox
          checked={checked}
          label='Label'
          indeterminate
          onChange={setChecked}
        />
      </div>
    </div>
  )
}
