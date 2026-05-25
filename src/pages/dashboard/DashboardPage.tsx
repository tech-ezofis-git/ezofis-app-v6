import { AnimateSlideUp } from '@/components/common/animations'
import AccountsPayable from './workflows/accounts-payable/AccountsPayable'
import DashboardCharts from './workflows/shared/components/Header'
import setupStore from './workflows/accounts-payable/stores/useSetupStore'

const DashboardPage = () => {
  const isActivatingAutomation = setupStore(
    (state) => state.isActivatingAutomation,
  )
  const isApSetUpCompleted = setupStore((state) => state.isApSetUpCompleted)

  if (isActivatingAutomation) {
    return (
      <div className='flex h-full min-h-[50vh] flex-col items-center justify-center bg-gray-50/50' />
    )
  }

  return (
    <div className='flex h-full flex-col overflow-y-auto bg-gray-50/50'>
      {isApSetUpCompleted ? (
        <AnimateSlideUp delay={0.1}>
          <DashboardCharts />
        </AnimateSlideUp>
      ) : (
        <AccountsPayable />
      )}
    </div>
  )
}

DashboardPage.displayName = 'DashboardPage'
export default DashboardPage
