import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import InputSwitch from '@/components/base/inputs/InputSwitch'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/input-switch')({
  component: RouteComponent,
})

function RouteComponent() {
  const [checked, setChecked] = useState(false)

  return (
    <div>
      <StoryTitle>27. Input Switch</StoryTitle>

      <div className='space-y-16'>
        <StorySubTitle>Default</StorySubTitle>
        <InputSwitch checked={checked} label='Label' onChange={setChecked} />

        <StorySubTitle>Description</StorySubTitle>
        <InputSwitch
          checked={checked}
          description='Lorem ipsum dolar sit amit'
          label='Label'
          onChange={setChecked}
        />

        <StorySubTitle>Error</StorySubTitle>
        <InputSwitch
          checked={checked}
          error='Error'
          label='Label'
          onChange={setChecked}
        />

        <StorySubTitle>Disabled</StorySubTitle>
        <InputSwitch
          checked={checked}
          label='Label'
          disabled
          onChange={setChecked}
        />
      </div>
    </div>
  )
}
