import { useState } from 'react'
import InputRadioCard from '@/components/base/inputs/InputRadioCard'
import StepFooter from './StepFooter'
import StepHeader from './StepHeader'

const recommendations = [
  {
    description: 'Save time with pre-built invoice templates.',
    id: 1,
    name: 'Automate Invoice Processing',
  },
  {
    description: 'Create consistent, automated new hire experiences.',
    id: 2,
    name: 'Build Employee Onboarding Flow',
  },
  {
    description: 'Explore EZOFIS with guided, hands-on examples.',
    id: 3,
    name: 'Take the Interactive Tour',
  },
  {
    description: 'Start quickly with industry-ready workflows.',
    id: 4,
    name: 'Browse Template Gallery',
  },
]

const StepSeven = () => {
  const [recommendation, setRecommendation] = useState<number | null>(null)

  return (
    <>
      <StepHeader
        description="Let's get you started with EZOFIS - here's what we recommend:"
        icon='tabler:rocket'
        title="You're Almost Ready!"
      />

      <div className='space-y-3'>
        {recommendations.map((option) => (
          <InputRadioCard
            checked={recommendation === option.id}
            description={option.description}
            key={option.id}
            label={option.name}
            onClick={() => setRecommendation(option.id)}
          />
        ))}
      </div>

      <StepFooter />
    </>
  )
}

StepSeven.displayName = 'StepSeven'
export default StepSeven
