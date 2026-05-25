import { AnimateFadeIn, AnimateSlideUp } from '@/components/common/animations'
import AccountsPayable from './workflows/accounts-payable/AccountsPayable'
import Header from './workflows/shared/components/Header'

const DashboardPage = () => {
  return (
    <>
      <AnimateSlideUp delay={0.1}>
        <Header />
      </AnimateSlideUp>
      <AnimateFadeIn
        className='relative flex min-h-0 flex-1 flex-col'
        delay={0.2}
      >
        <AccountsPayable />
      </AnimateFadeIn>
    </>
  )
}

DashboardPage.displayName = 'DashboardPage'
export default DashboardPage
