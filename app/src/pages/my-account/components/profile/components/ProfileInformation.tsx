import { useEffect, useState } from 'react'
import InputDate from '@/components/base/inputs/InputDate'
import InputText from '@/components/base/inputs/InputText'
import Title from '@/components/base/Title'
import authUserStore from '@/stores/authUserStore'

const ProfileInformation = () => {
  const session = authUserStore((state) => state.session)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [dob, setDob] = useState<string | null>(null)

  useEffect(() => {
    if (session) {
      const name =
        session.name ||
        (session.firstName
          ? `${session.firstName} ${session.lastName || ''}`.trim()
          : '')
      setFullName(name)
      setEmail(session.email || '')
    }
  }, [session])

  return (
    <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
      <Title
        description='Manage your personal details'
        level={4}
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
