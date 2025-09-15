import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import Icon from '@/components/base/icon/Icon'
import InputPassword from '@/components/base/inputs/password/InputPassword'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/input-password')({
  component: RouteComponent,
})

function RouteComponent() {
  const [value, setValue] = useState('')

  return (
    <div>
      <StoryTitle>20. Input Password</StoryTitle>

      <div className='space-y-16'>
        <StorySubTitle>Default</StorySubTitle>
        <InputPassword className='max-w-80' value={value} onChange={setValue} />

        <StorySubTitle>Meta</StorySubTitle>
        <InputPassword
          className='max-w-80'
          description='Lorem ipsum dolar sit amit'
          label='Label'
          tooltip='Lorem ipsum dolar sit amit'
          value={value}
          optional
          required
          onChange={setValue}
        />

        <StorySubTitle>Error</StorySubTitle>
        <InputPassword
          className='max-w-80'
          error='Lorem ipsum dolar sit amit'
          value={value}
          onChange={setValue}
        />

        <StorySubTitle>Disabled</StorySubTitle>
        <InputPassword
          className='max-w-80'
          value={value}
          disabled
          onChange={setValue}
        />

        <StorySubTitle>Left Section</StorySubTitle>
        <InputPassword
          className='max-w-80'
          leftSection={<Icon className='text-gray-9' name='tabler:lock' />}
          value={value}
          onChange={setValue}
        />
      </div>
    </div>
  )
}
