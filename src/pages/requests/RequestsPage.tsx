import Header from './components/Header'
import Request from './components/request/Request'
import Table from './components/Table'

const RequestsPage = () => {
  return (
    <>
      <Header />
      <Table />
      <Request />
    </>
  )
}

RequestsPage.displayName = 'RequestsPage'
export default RequestsPage
