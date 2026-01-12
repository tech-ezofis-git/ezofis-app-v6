import { useState } from 'react'
import InputRadioCard from '@/components/base/inputs/InputRadioCard'
import StepFooter from './StepFooter'
import StepHeader from './StepHeader'

const sizes = [
  { id: 1, name: 'Solo Professional (1)' },
  { id: 2, name: 'Small Team (2-10)' },
  { id: 3, name: 'Growing Business (11-50)' },
  { id: 4, name: 'Mid-Size Company (51-200)' },
  { id: 5, name: 'Large Organization (201-1,000)' },
  { id: 6, name: 'Enterprise (1,000+)' },
]

const StepFour = () => {
  const [size, setSize] = useState<number | null>(null)

  return (
    <>
      <StepHeader
        description="Different company sizes have different automation needs and complexities. We'll recommend solutions that fit your scale."
        icon='lucide:users'
        title='How Big Is Your Company?'
      />

      <div className='space-y-3'>
        {sizes.map((option) => (
          <InputRadioCard
            checked={size === option.id}
            key={option.id}
            label={option.name}
            onClick={() => setSize(option.id)}
          />
        ))}
      </div>

      <StepFooter />
    </>
  )
}

StepFour.displayName = 'StepFour'
export default StepFour
