import { useState } from 'react'
import InputRadioCard from '@/components/base/inputs/InputRadioCard'
import onBoardingStore from '../stores/onBoardingStore'
import StepFooter from './StepFooter'
import StepHeader from './StepHeader'

const question = 'How Big Is Your Company?'

const sizes = [
  { id: 1, name: 'Solo Professional (1)' },
  { id: 2, name: 'Small Team (2-10)' },
  { id: 3, name: 'Growing Business (11-50)' },
  { id: 4, name: 'Mid-Size Company (51-200)' },
  { id: 5, name: 'Large Organization (201-1,000)' },
  { id: 6, name: 'Enterprise (1,000+)' },
]

const StepThree = () => {
  const answers = onBoardingStore((state) => state.answers)
  const setAnswer = onBoardingStore((state) => state.setAnswer)
  const next = onBoardingStore((state) => state.next)

  const savedValue = answers[question] || ''
  const initialOption = savedValue
    ? sizes.find((s) => s.name === savedValue)?.id || null
    : null

  const [sizeOption, setSizeOption] = useState<number | null>(initialOption)

  const handleSelect = (option: (typeof sizes)[number]) => {
    setSizeOption(option.id)
    setAnswer(question, option.name)
    setTimeout(() => {
      next()
    }, 250)
  }

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
            checked={sizeOption === option.id}
            key={option.id}
            label={option.name}
            onClick={() => handleSelect(option)}
          />
        ))}
      </div>

      <StepFooter disabled={sizeOption === null} />
    </>
  )
}

StepThree.displayName = 'StepThree'
export default StepThree
