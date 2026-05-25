import { AnimatePresence } from 'motion/react'
import Integrations from './components/Integrations'
import Steps from './components/setup/components/Steps'
// import Overview from './components/Overview'
import SetupCallout from './components/SetupCallout'
import setupStore from './stores/useSetupStore'

const AccountsPayable = () => {
  const isSetupStarted = setupStore((state) => state.isSetupStarted)
  const isApSetUpCompleted = setupStore((state) => state.isApSetUpCompleted)

  // Show Overview and Integrations when setup is not started OR when setup is completed
  const showOverviewAndIntegrations = !isSetupStarted || isApSetUpCompleted

  return (
    <>
      <SetupCallout />

      <AnimatePresence mode='wait'>
        {isSetupStarted && !isApSetUpCompleted ? <Steps key='steps' /> : null}
      </AnimatePresence>

      {showOverviewAndIntegrations && isApSetUpCompleted && !isSetupStarted && (
        <>
          {/* <Overview /> */}
          <Integrations />
        </>
      )}
    </>
  )
}

AccountsPayable.displayName = 'AccountsPayable'
export default AccountsPayable
