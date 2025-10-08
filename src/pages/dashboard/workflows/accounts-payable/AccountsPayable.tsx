import Integrations from './components/Integrations'
import Overview from './components/Overview'
import Setup from './components/setup/Setup'
import SetupCallout from './components/SetupCallout'

const AccountsPayable = () => {
  return (
    <>
      <SetupCallout />
      <Overview />
      <Integrations />
      <Setup />
    </>
  )
}

AccountsPayable.displayName = 'AccountsPayable'
export default AccountsPayable
