import MondayLogo from '@/assets/brands/monday.svg'
import OracleLogo from '@/assets/brands/oracle.svg'
import QuickBooksLogo from '@/assets/brands/quickbooks.svg'
import SapLogo from '@/assets/brands/sap.svg'
import XeroLogo from '@/assets/brands/xero.svg'
import setupStore from '@/pages/dashboard/workflows/accounts-payable/stores/useSetupStore'
import BrandCard from '../../components/BrandCard'
import SectionHeader from '../../components/SectionHeader'

const items = [
  { logo: SapLogo, name: 'SAP', value: 'SAP' },
  { logo: OracleLogo, name: 'Oracle NetSuite', value: 'Oracle NetSuite' },
  {
    logo: QuickBooksLogo,
    name: 'QuickBooks',
    value: 'QuickBooks',
  },
  { logo: MondayLogo, name: 'Monday.com', value: 'Monday.com' },
  { logo: XeroLogo, name: 'Xero', value: 'Xero' },
]

const ErpSystem = () => {
  const erpSettings = setupStore((state) => state.erpSettings)
  const setErpSettings = setupStore((state) => state.setErpSettings)

  return (
    <div>
      <SectionHeader
        description='Select your ERP provider to connect and synchronize invoices, and payments seamlessly.'
        title='Choose Your ERP System'
      />

      <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
        {items.map((item) => (
          <BrandCard
            checked={erpSettings.system === item.value}
            key={item.value}
            logo={item.logo}
            name={item.name}
            value={item.value}
            onClick={() =>
              setErpSettings({
                ...erpSettings,
                isConnected: false,
                system: item.value,
              })
            }
          />
        ))}
      </div>
    </div>
  )
}

ErpSystem.displayName = 'ErpSystem'
export default ErpSystem
