import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import InputRadio from '@/components/base/inputs/InputRadio'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/input-radio')({
  component: RouteComponent,
})

function RouteComponent() {
  const [checked, setChecked] = useState(false)

  return (
    <div>
      <StoryTitle>23. Input Radio</StoryTitle>

      <div className='space-y-16'>
        <StorySubTitle>Default</StorySubTitle>
        <InputRadio checked={checked} label='Label' onChange={setChecked} />

        <StorySubTitle>Description</StorySubTitle>
        <InputRadio
          checked={checked}
          description='Lorem ipsum dolar sit amit'
          label='Label'
          onChange={setChecked}
        />

        <StorySubTitle>Error</StorySubTitle>
        <InputRadio
          checked={checked}
          error='Error'
          label='Label'
          onChange={setChecked}
        />

        <StorySubTitle>Disabled</StorySubTitle>
        <InputRadio
          checked={checked}
          label='Label'
          disabled
          onChange={setChecked}
        />
      </div>
    </div>
  )
}
