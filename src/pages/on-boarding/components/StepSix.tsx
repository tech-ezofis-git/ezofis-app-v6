import { useState } from 'react'
import InputCheckboxCard from '@/components/base/inputs/InputCheckboxCard'
import StepFooter from './StepFooter'
import StepHeader from './StepHeader'

const businessChallenges = [
  { id: 1, name: 'Time-consuming manual processes' },
  { id: 2, name: 'Disconnected systems and data silos' },
  { id: 3, name: 'Scaling operations efficiently' },
  { id: 4, name: 'Compliance and audit challenges' },
  { id: 5, name: 'Poor team collaboration and communication' },
  { id: 6, name: 'High costs and frequent errors' },
]

const StepSix = () => {
  const [challenges, setChallenges] = useState<number[]>([])

  const handleClick = (id: number) => {
    if (!challenges.includes(id)) {
      setChallenges([...challenges, id])
    } else {
      setChallenges(challenges.filter((item) => item !== id))
    }
  }

  return (
    <>
      <StepHeader
        description='Understanding your pain points helps us prioritize which automations and features to show you first. We want to solve your most pressing problems quickly.'
        icon='tabler:briefcase-2'
        title='What Are Your Business Challenges?'
      />

      <div className='space-y-3'>
        {businessChallenges.map((option) => (
          <InputCheckboxCard
            checked={challenges.includes(option.id)}
            key={option.id}
            label={option.name}
            onClick={() => handleClick(option.id)}
          />
        ))}
      </div>

      <StepFooter />
    </>
  )
}

StepSix.displayName = 'StepSix'
export default StepSix
