import Divider from '@/components/base/Divider'
import Title from '../Title'
import ChangePassword from './components/ChangePassword'
import DeleteAccount from './components/DeleteAccount'
import TwoFactorAuthentication from './components/TwoFactorAuthentication'

const Security = () => {
  return (
    <div className='mx-auto max-w-4xl p-8'>
      <Title title='Security' />
      <Divider className='my-6' />
      <ChangePassword />
      <Divider className='my-6' />
      <TwoFactorAuthentication />
      <Divider className='my-6' />
      <DeleteAccount />
    </div>
  )
}

Security.displayName = 'Security'
export default Security
