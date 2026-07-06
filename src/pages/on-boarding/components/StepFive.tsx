import { useState } from 'react'
import InputRadioCard from '@/components/base/inputs/InputRadioCard'
import onBoardingStore from '../stores/onBoardingStore'
import StepFooter from './StepFooter'
import StepHeader from './StepHeader'

const question = "What's Your Automation Experience?"

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
  const answers = onBoardingStore((state) => state.answers)
  const setAnswer = onBoardingStore((state) => state.setAnswer)
  const next = onBoardingStore((state) => state.next)

  const savedValue = answers[question] || ''
  const initialOption = savedValue
    ? experienceOptions.find((o) => o.name === savedValue)?.id || null
    : null

  const [experience, setExperience] = useState<number | null>(initialOption)

  const handleSelect = (option: (typeof experienceOptions)[number]) => {
    setExperience(option.id)
    setAnswer(question, option.name)
    setTimeout(() => {
      next()
    }, 250)
  }

  return (
    <>
      <StepHeader
        description="We'll adjust our recommendations, tutorials, and interface complexity based on your comfort level. Everyone starts somewhere!"
        icon='lucide:cog'
        title="What's Your Automation Experience?"
      />

      <div className='space-y-3'>
        {experienceOptions.map((option) => (
          <InputRadioCard
            checked={experience === option.id}
            description={option.description}
            key={option.id}
            label={option.name}
            onClick={() => handleSelect(option)}
          />
        ))}
      </div>

      <StepFooter disabled={experience === null} />
    </>
  )
}

StepFive.displayName = 'StepFive'
export default StepFive
