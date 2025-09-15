import { useState } from 'react'
import InputRadioCard from '@/components/base/inputs/InputRadioCard'
import StepFooter from './StepFooter'
import StepHeader from './StepHeader'

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

const StepThree = () => {
  const [department, setDepartment] = useState<number | null>(null)

  return (
    <>
      <StepHeader
        description="Each department has unique automation opportunities. We'll highlight solutions that are most relevant to your team's daily challenges."
        icon='tabler:building'
        title='Which Department Do You Work In?'
      />

      <div className='grid grid-cols-2 gap-3'>
        {departments.map((option) => (
          <InputRadioCard
            checked={department === option.id}
            key={option.id}
            label={option.name}
            onClick={() => setDepartment(option.id)}
          />
        ))}
      </div>

      <StepFooter />
    </>
  )
}

StepThree.displayName = 'StepThree'
export default StepThree
