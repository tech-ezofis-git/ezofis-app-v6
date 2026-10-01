import { AnimatePresence } from 'motion/react'
import Overview from './components/Overview'
import Steps from './components/setup/components/Steps'
import setupStore from './stores/useSetupStore'

const AccountsPayable = () => {
  const isSetupStarted = setupStore((state) => state.isSetupStarted)
  const isApSetUpCompleted = setupStore((state) => state.isApSetUpCompleted)

  return (
    <AnimatePresence mode='wait'>
      {isSetupStarted ? (
        <Steps key='steps' />
      ) : !isApSetUpCompleted ? (
        <Overview key='overview' />
      ) : null}
    </AnimatePresence>
  )
}

AccountsPayable.displayName = 'AccountsPayable'
export default AccountsPayable
