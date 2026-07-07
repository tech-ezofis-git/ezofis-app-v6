import { useState } from 'react'
import InputRadioCard from '@/components/base/inputs/InputRadioCard'
import InputText from '@/components/base/inputs/InputText'
import onBoardingStore from '../stores/onBoardingStore'
import StepFooter from './StepFooter'
import StepHeader from './StepHeader'

const question = "What's Your Role?"

const roles = [
  { id: 1, name: 'Manager' },
  { id: 2, name: 'Supervisor' },
  { id: 3, name: 'Team Lead' },
  { id: 4, name: 'Executive' },
  { id: 5, name: 'Coordinator' },
  { id: 7, name: 'Specialist' },
  { id: 8, name: 'Consultant' },
  { id: 9, name: 'Director' },
  { id: 10, name: 'Administrator' },
  { id: 6, name: 'Other' },
]

const StepOne = () => {
  const answers = onBoardingStore((state) => state.answers)
  const setAnswer = onBoardingStore((state) => state.setAnswer)
  const next = onBoardingStore((state) => state.next)

  const savedValue = answers[question] || ''
  const isPredefined = roles.some(
    (r) => r.name === savedValue && r.name !== 'Other',
  )

  const initialOption = savedValue
    ? isPredefined
      ? roles.find((r) => r.name === savedValue)?.id || null
      : 6
    : null

  const initialOtherText = savedValue && !isPredefined ? (savedValue as string) : ''

  const [roleOption, setRoleOption] = useState<number | null>(initialOption)
  const [otherText, setOtherText] = useState<string>(initialOtherText)

  const handleSelect = (option: (typeof roles)[number]) => {
    setRoleOption(option.id)
    if (option.name === 'Other') {
      setAnswer(question, otherText)
    } else {
      setAnswer(question, option.name)
      setTimeout(() => {
        next()
      }, 250)
    }
  }

  const handleOtherChange = (val: string) => {
    setOtherText(val)
    setAnswer(question, val)
  }

  return (
    <>
      <StepHeader
        description='Different roles have different needs. Knowing your position helps us show you the most relevant tools and insights first.'
        icon='lucide:user-star'
        title="What's Your Role?"
      />

      <div className='flex flex-col gap-4'>
        <div className='grid grid-cols-2 gap-3'>
          {roles.map((option) => (
            <InputRadioCard
              checked={roleOption === option.id}
              key={option.id}
              label={option.name}
              onClick={() => handleSelect(option)}
            />
          ))}
        </div>

        {roleOption === 6 && (
          <InputText
            className='animate-in fade-in slide-in-from-top-2 duration-300'
            label='Please specify your role'
            placeholder='e.g. Principal Engineer'
            value={otherText}
            required
            onChange={handleOtherChange}
          />
        )}
      </div>

      <StepFooter
        disabled={
          roleOption === null || (roleOption === 6 && !otherText.trim())
        }
      />
    </>
  )
}

StepOne.displayName = 'StepOne'
export default StepOne
