import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import InputRadioCard from '@/components/base/inputs/InputRadioCard'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/input-radio-card')({
  component: RouteComponent,
})

function RouteComponent() {
  const [checked, setChecked] = useState(false)

  return (
    <div>
      <StoryTitle>36. Input Radio Card</StoryTitle>

      <div className='space-y-16'>
        <StorySubTitle>Default</StorySubTitle>
        <InputRadioCard
          checked={checked}
          className='w-80'
          label='Label'
          onClick={() => setChecked(!checked)}
        />

        <StorySubTitle>Meta</StorySubTitle>
        <InputRadioCard
          checked={checked}
          className='w-80'
          description='Lorem ipsum dolar sit amit '
          icon='lucide:user'
          label='Label'
          onClick={() => setChecked(!checked)}
        />
      </div>
    </div>
  )
}
