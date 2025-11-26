import { useState } from 'react'
import InputDate from '@/components/base/inputs/InputDate'
import InputText from '@/components/base/inputs/InputText'
import SectionTitle from '../../SectionTitle'

const ProfileInformation = () => {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('charles@ezofis.com')
  const [dob, setDob] = useState<string | null>(null)

  return (
    <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
      <SectionTitle
        description='Manage your personal details'
        title='Profile Information'
      />

      <div className='space-y-4'>
        <InputText
          className='max-w-105'
          label='Email'
          value={email}
          disabled
          onChange={setEmail}
        />
        <InputText
          className='max-w-105'
          label='Full Name'
          value={fullName}
          onChange={setFullName}
        />
        <InputDate
          className='max-w-105'
          label='DOB'
          value={dob}
          onChange={setDob}
        />
      </div>
    </div>
  )
}

ProfileInformation.displayName = 'ProfileInformation'
export default ProfileInformation
