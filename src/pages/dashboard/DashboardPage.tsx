import ScrollArea from '@/components/base/scroll-area/ScrollArea'
import AccountsPayable from './workflows/accounts-payable/AccountsPayable'
import Header from './workflows/shared/components/Header'

const DashboardPage = () => {
  return (
    <ScrollArea height='calc(100svh - 60px)'>
      <div className='pb-20'>
        <Header />
        <AccountsPayable />
      </div>
    </ScrollArea>
  )
}

DashboardPage.displayName = 'DashboardPage'
export default DashboardPage
