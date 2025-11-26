import Button from '@/components/base/button/Button'
import Divider from '@/components/base/Divider'
import Title from '../Title'
import ProfileInformation from './components/ProfileInformation'
import ProfilePicture from './components/ProfilePicture'

const Profile = () => {
  return (
    <div className='mx-auto max-w-4xl p-8'>
      <Title title='Profile' />
      <Divider className='my-6' />
      <ProfilePicture />
      <Divider className='my-6' />
      <ProfileInformation />
      <Divider className='my-6' />
      <div className='flex items-center justify-end gap-2'>
        <Button color='gray' label='Cancel' variant='outline' />
        <Button label='Save' />
      </div>
    </div>
  )
}

Profile.displayName = 'Profile'
export default Profile
