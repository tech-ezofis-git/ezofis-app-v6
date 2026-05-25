import { AnimateFadeIn, AnimateSlideUp } from '@/components/common/animations'
import AccountsPayable from './workflows/accounts-payable/AccountsPayable'
import Header from './workflows/shared/components/Header'
import setupStore from './workflows/accounts-payable/stores/useSetupStore'

const DashboardPage = () => {
  const isSetupStarted = setupStore((state) => state.isSetupStarted)
  const isApSetUpCompleted = setupStore((state) => state.isApSetUpCompleted)

  return (
    <div className='flex h-full flex-col overflow-y-auto bg-gray-50/50'>
      <AnimateSlideUp delay={0.1}>
        <Header />
      </AnimateSlideUp>
      <AnimateFadeIn
        className='relative flex flex-col'
        delay={0.2}
      >
        {!isSetupStarted && !isApSetUpCompleted ? <AccountsPayable /> : null}
      </AnimateFadeIn>
    </div>
  )
}

DashboardPage.displayName = 'DashboardPage'
export default DashboardPage
