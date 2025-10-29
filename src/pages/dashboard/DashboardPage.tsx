import AccountsPayable from './workflows/accounts-payable/AccountsPayable'
import Header from './workflows/shared/components/Header'

const DashboardPage = () => {
  return (
    <>
      <Header />
      <AccountsPayable />
    </>
  )
}

DashboardPage.displayName = 'DashboardPage'
export default DashboardPage
