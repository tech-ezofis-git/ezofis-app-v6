import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import InputCheckboxCard from '@/components/base/inputs/InputCheckboxCard'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/input-checkbox-card')({
  component: RouteComponent,
})

function RouteComponent() {
  const [checked, setChecked] = useState(false)

  return (
    <div>
      <StoryTitle>37. Input Checkbox Card</StoryTitle>

      <div className='space-y-16'>
        <StorySubTitle>Default</StorySubTitle>
        <InputCheckboxCard
          checked={checked}
          className='w-80'
          label='Label'
          onClick={() => setChecked(!checked)}
        />

        <StorySubTitle>Meta</StorySubTitle>
        <InputCheckboxCard
          checked={checked}
          className='w-80'
          description='Lorem ipsum dolar sit amit '
          icon='tabler:user'
          label='Label'
          onClick={() => setChecked(!checked)}
        />
      </div>
    </div>
  )
}
