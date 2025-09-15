import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import InputPin from '@/components/base/inputs/InputPin'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/input-pin')({
  component: RouteComponent,
})

function RouteComponent() {
  const [value, setValue] = useState('')

  return (
    <div>
      <StoryTitle>22. Input Pin</StoryTitle>

      <div className='space-y-16'>
        <StorySubTitle>Default</StorySubTitle>
        <InputPin className='w-80' value={value} onChange={setValue} />

        <StorySubTitle>Placeholder</StorySubTitle>
        <InputPin
          className='w-80'
          placeholder='0'
          value={value}
          onChange={setValue}
        />

        <StorySubTitle>Disabled</StorySubTitle>
        <InputPin className='w-80' value={value} disabled onChange={setValue} />

        <StorySubTitle>Error</StorySubTitle>
        <InputPin className='w-80' value={value} error onChange={setValue} />

        <StorySubTitle>Length</StorySubTitle>
        <InputPin
          className='w-80'
          length={6}
          value={value}
          onChange={setValue}
        />
      </div>
    </div>
  )
}
