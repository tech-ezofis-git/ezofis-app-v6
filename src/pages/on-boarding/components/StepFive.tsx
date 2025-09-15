import { useState } from 'react'
import InputRadioCard from '@/components/base/inputs/InputRadioCard'
import StepFooter from './StepFooter'
import StepHeader from './StepHeader'

const experienceOptions = [
  {
    description: 'Just getting started (no automation yet).',
    id: 1,
    name: 'Beginner',
  },
  {
    description: 'Some workflows automated (team-level).',
    id: 2,
    name: 'Intermediate',
  },
  {
    description: 'Department-level automation in place.',
    id: 3,
    name: 'Advanced',
  },
  {
    description: 'Company-wide automation at scale.',
    id: 4,
    name: 'Enterprise',
  },
]

const StepFive = () => {
  const [experience, setExperience] = useState<number | null>(null)

  return (
    <>
      <StepHeader
        description="We'll adjust our recommendations, tutorials, and interface complexity based on your comfort level. Everyone starts somewhere!"
        icon='tabler:settings-automation'
        title="What's Your Automation Experience?"
      />

      <div className='space-y-3'>
        {experienceOptions.map((option) => (
          <InputRadioCard
            checked={experience === option.id}
            description={option.description}
            key={option.id}
            label={option.name}
            onClick={() => setExperience(option.id)}
          />
        ))}
      </div>

      <StepFooter />
    </>
  )
}

StepFive.displayName = 'StepFive'
export default StepFive
