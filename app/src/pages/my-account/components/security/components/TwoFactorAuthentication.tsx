import { useState } from 'react'
import InputRadioCard from '@/components/base/inputs/InputRadioCard'
import Title from '@/components/base/Title'

const TwoFactorAuthentication = () => {
  const options = [
    {
      description: 'Send a code to charles@ezofis.com',
      id: 1,
      name: 'Email',
    },
    {
      description: 'Send a code to +91 70#-###-##20',
      id: 2,
      name: 'SMS',
    },
    {
      description: 'Use your authenticator app to get a code',
      id: 3,
      name: 'Authenticator App',
    },
  ]
  const [value, setValue] = useState<number | null>(null)

  return (
    <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
      <Title
        description='Choose a method to receive your verification code'
        level={4}
        title='Two Factor Authentication'
      />

      <div className='space-y-3'>
        {options.map((option) => (
          <InputRadioCard
            checked={value === option.id}
            description={option.description}
            key={option.id}
            label={option.name}
            onClick={() => setValue(option.id)}
          />
        ))}
      </div>
    </div>
  )
}

TwoFactorAuthentication.displayName = 'TwoFactorAuthentication'
export default TwoFactorAuthentication
