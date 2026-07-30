import { useLingui } from '@lingui/react/macro'
import Divider from '@/components/base/Divider'
import Title from '@/components/base/Title'
import ChangePassword from './components/ChangePassword'
import DeleteAccount from './components/DeleteAccount'
import TwoFactorAuthentication from './components/TwoFactorAuthentication'

const Security = () => {
  const { t } = useLingui()

  return (
    <div className='mx-auto max-w-4xl p-8'>
      <Title level={1} title={t`Security`} />
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
