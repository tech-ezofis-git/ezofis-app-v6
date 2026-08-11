import { useState } from 'react'
import InputRadioCard from '@/components/base/inputs/InputRadioCard'
import InputText from '@/components/base/inputs/InputText'
import onBoardingStore from '../stores/onBoardingStore'
import StepFooter from './StepFooter'
import StepHeader from './StepHeader'

const question = 'Which industry is your company?'

const industries = [
  { id: 1, name: 'Banking, Finance & Insurance (BFSI)' },
  { id: 2, name: 'Healthcare & Life Sciences' },
  { id: 3, name: 'Legal & Compliance' },
  { id: 4, name: 'Government & Public Sector' },
  { id: 5, name: 'Manufacturing, Logistics & Supply Chain' },
  { id: 6, name: 'Real Estate & Construction' },
  { id: 7, name: 'Professional Services & Consulting' },
  { id: 8, name: 'Education & Academia' },
  { id: 9, name: 'Energy, Utilities & Resources' },
  { id: 10, name: 'Retail & E-commerce' },
  { id: 11, name: 'Technology & IT Services' },
  { id: 12, name: 'Other' },
]

const StepFour = () => {
  const answers = onBoardingStore((state) => state.answers)
  const setAnswer = onBoardingStore((state) => state.setAnswer)
  const next = onBoardingStore((state) => state.next)

  const otherId = industries.find((ind) => ind.name === 'Other')?.id || 12

  const savedValue = answers[question] || ''
  const isPredefined = industries.some(
    (ind) => ind.name === savedValue && ind.name !== 'Other',
  )

  const initialOption = savedValue
    ? isPredefined
      ? industries.find((ind) => ind.name === savedValue)?.id || null
      : otherId
    : null

  const initialOtherText =
    savedValue && !isPredefined ? (savedValue as string) : ''

  const [industryOption, setIndustryOption] = useState<number | null>(
    initialOption,
  )
  const [otherText, setOtherText] = useState<string>(initialOtherText)

  const handleSelect = (option: (typeof industries)[number]) => {
    setIndustryOption(option.id)
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
        description='Understanding your industry helps us recommend workflows, templates, and compliance features tailored to your sector.'
        icon='lucide:briefcase'
        title='Which industry is your company?'
      />

      <div className='flex flex-col gap-4'>
        <div className='grid grid-cols-2 gap-3'>
          {industries.map((option) => (
            <InputRadioCard
              checked={industryOption === option.id}
              key={option.id}
              label={option.name}
              onClick={() => handleSelect(option)}
            />
          ))}
        </div>

        {industryOption === otherId && (
          <InputText
            className='animate-in fade-in slide-in-from-top-2 duration-300'
            label='Please specify your industry'
            placeholder='e.g. Agriculture / Real Estate'
            value={otherText}
            required
            onChange={handleOtherChange}
          />
        )}
      </div>

      <StepFooter
        disabled={
          industryOption === null ||
          (industryOption === otherId && !otherText.trim())
        }
      />
    </>
  )
}

StepFour.displayName = 'StepFour'
export default StepFour
