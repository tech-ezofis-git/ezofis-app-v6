import { AnimatePresence } from 'motion/react'
import Steps from './components/setup/components/Steps'
import setupStore from './stores/useSetupStore'

const AccountsPayable = () => {
  const isSetupStarted = setupStore((state) => state.isSetupStarted)

  return (
    <AnimatePresence mode='wait'>
      {isSetupStarted ? <Steps key='steps' /> : null}
    </AnimatePresence>
  )
}

AccountsPayable.displayName = 'AccountsPayable'
export default AccountsPayable
