import { useState } from 'react'
import InputRadioCard from '@/components/base/inputs/InputRadioCard'
import InputText from '@/components/base/inputs/InputText'
import onBoardingStore from '../stores/onBoardingStore'
import StepFooter from './StepFooter'
import StepHeader from './StepHeader'

const question = 'Which Department Do You Work In?'

const departments = [
  { id: 1, name: 'Human Resources' },
  { id: 2, name: 'Finance & Accounting' },
  { id: 3, name: 'Sales & Marketing' },
  { id: 4, name: 'Operations' },
  { id: 5, name: 'Customer Support' },
  { id: 6, name: 'IT & Technology' },
  { id: 7, name: 'Product Development' },
  { id: 8, name: 'Healthcare' },
  { id: 9, name: 'Education & Training' },
  { id: 10, name: 'Manufacturing' },
  { id: 11, name: 'Legal & Compliance' },
  { id: 12, name: 'Other' },
]

const StepTwo = () => {
  const answers = onBoardingStore((state) => state.answers)
  const setAnswer = onBoardingStore((state) => state.setAnswer)
  const next = onBoardingStore((state) => state.next)

  const savedValue = answers[question] || ''
  const isPredefined = departments.some(
    (d) => d.name === savedValue && d.name !== 'Other',
  )

  const initialOption = savedValue
    ? isPredefined
      ? departments.find((d) => d.name === savedValue)?.id || null
      : 12
    : null

  const initialOtherText = savedValue && !isPredefined ? (savedValue as string) : ''

  const [deptOption, setDeptOption] = useState<number | null>(initialOption)
  const [otherText, setOtherText] = useState<string>(initialOtherText)

  const handleSelect = (option: (typeof departments)[number]) => {
    setDeptOption(option.id)
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
        description="Each department has unique automation opportunities. We'll highlight solutions that are most relevant to your team's daily challenges."
        icon='lucide:building'
        title='Which Department Do You Work In?'
      />

      <div className='flex flex-col gap-4'>
        <div className='grid grid-cols-2 gap-3'>
          {departments.map((option) => (
            <InputRadioCard
              checked={deptOption === option.id}
              key={option.id}
              label={option.name}
              onClick={() => handleSelect(option)}
            />
          ))}
        </div>

        {deptOption === 12 && (
          <InputText
            className='animate-in fade-in slide-in-from-top-2 duration-300'
            label='Please specify your department'
            placeholder='e.g. Quality Assurance'
            value={otherText}
            required
            onChange={handleOtherChange}
          />
        )}
      </div>

      <StepFooter
        disabled={
          deptOption === null || (deptOption === 12 && !otherText.trim())
        }
      />
    </>
  )
}

StepTwo.displayName = 'StepTwo'
export default StepTwo
