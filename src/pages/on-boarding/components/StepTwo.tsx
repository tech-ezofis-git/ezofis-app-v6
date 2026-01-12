import { useState } from 'react'
import InputRadioCard from '@/components/base/inputs/InputRadioCard'
import StepFooter from './StepFooter'
import StepHeader from './StepHeader'

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

const StepTwo = () => {
  const [role, setRole] = useState<number | null>(null)

  return (
    <>
      <StepHeader
        description='Different roles have different needs. Knowing your position helps us show you the most relevant tools and insights first.'
        icon='lucide:user-star'
        title="What's Your Role?"
      />

      <div className='grid grid-cols-2 gap-3'>
        {roles.map((option) => (
          <InputRadioCard
            checked={role === option.id}
            key={option.id}
            label={option.name}
            onClick={() => setRole(option.id)}
          />
        ))}
      </div>

      <StepFooter />
    </>
  )
}

StepTwo.displayName = 'StepTwo'
export default StepTwo
