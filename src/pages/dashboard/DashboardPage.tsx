import Button from '@/components/base/button/Button'
import { AnimateFadeIn, AnimateSlideUp } from '@/components/common/animations'
import cn from '@/utils/cn'
import AccountsPayable from './workflows/accounts-payable/AccountsPayable'
import setupStore from './workflows/accounts-payable/stores/useSetupStore'
import DocumentRepositorySetup from './workflows/document-repository/DocumentRepositorySetup'
import useDmsSetupStore from './workflows/document-repository/stores/useDmsSetupStore'
import {
  openApSetupPreview,
  openDmsSetupPreview,
} from './workflows/setupPreview'
import DashboardCharts from './workflows/shared/components/Header'

const DashboardPage = () => {
  const isActivatingAutomation = setupStore(
    (state) => state.isActivatingAutomation,
  )
  const isApSetUpCompleted = setupStore((state) => state.isApSetUpCompleted)
  const isSetupStarted = setupStore((state) => state.isSetupStarted)
  const isDmsSetupStarted = useDmsSetupStore((state) => state.isSetupStarted)

  if (isActivatingAutomation) {
    return (
      <div className='bg-gray-50/50 flex h-full min-h-[50vh] flex-col items-center justify-center' />
    )
  }

  return (
    <div
      className={cn(
        'flex h-full flex-col bg-gray-1',
        isDmsSetupStarted || isSetupStarted
          ? 'overflow-hidden'
          : 'overflow-y-auto',
      )}
    >
      {isDmsSetupStarted ? (
        <DocumentRepositorySetup />
      ) : (
        <>
          {!isSetupStarted && (
            <AnimateFadeIn delay={0.05}>
              <div className='flex flex-wrap items-center justify-between gap-3 border-b border-gray-3 px-6 py-3 md:px-8'>
                <div className='min-w-0'>
                  <p className='text-14 font-medium text-gray-13'>
                    Accounts Payable Automation
                  </p>
                  <p className='mt-0.5 text-12 text-gray-10'>
                    Connect email, ERP, and storage to start invoice processing.
                  </p>
                </div>
                <Button
                  label='Get Started'
                  size='md'
                  suffixIcon='lucide:arrow-right'
                  onClick={openApSetupPreview}
                />
              </div>
            </AnimateFadeIn>
          )}

          {isApSetUpCompleted && !isSetupStarted && (
            <AnimateSlideUp delay={0.1}>
              <DashboardCharts />
            </AnimateSlideUp>
          )}

          <AccountsPayable />
        </>
      )}
    </div>
  )
}

DashboardPage.displayName = 'DashboardPage'
export default DashboardPage
