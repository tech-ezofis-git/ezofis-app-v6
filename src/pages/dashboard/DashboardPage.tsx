import { AnimateFadeIn, AnimateSlideUp } from '@/components/common/animations'
import AccountsPayable from './workflows/accounts-payable/AccountsPayable'
import Header from './workflows/shared/components/Header'

const DashboardPage = () => {

  return (
    <>
      <AnimateSlideUp delay={0.1}>
        <Header />
      </AnimateSlideUp>
      <AnimateFadeIn delay={0.2} className='flex-1 min-h-0 flex flex-col relative'>
        <AccountsPayable />
      </AnimateFadeIn>
    </>
  )
}

DashboardPage.displayName = 'DashboardPage'
export default DashboardPage