import { AnimateSlideUp } from '@/components/common/animations'
import AccountsPayable from './workflows/accounts-payable/AccountsPayable'
import Setup from './workflows/accounts-payable/components/setup/Setup'
import setupStore from './workflows/accounts-payable/stores/useSetupStore'
import DashboardCharts from './workflows/shared/components/Header'

const DashboardPage = () => {
  const isActivatingAutomation = setupStore(
    (state) => state.isActivatingAutomation,
  )
  const isApSetUpCompleted = setupStore((state) => state.isApSetUpCompleted)

  if (isActivatingAutomation) {
    return (
      <div className='bg-gray-50/50 flex h-full min-h-[50vh] flex-col items-center justify-center' />
    )
  }

  return (
    <div className='bg-gray-1 flex h-full flex-col overflow-y-auto'>
      {isApSetUpCompleted && (
        <AnimateSlideUp delay={0.1}>
          <DashboardCharts />
        </AnimateSlideUp>
      )}
      <AccountsPayable />
      <Setup />
    </div>
  )
}

DashboardPage.displayName = 'DashboardPage'
export default DashboardPage
