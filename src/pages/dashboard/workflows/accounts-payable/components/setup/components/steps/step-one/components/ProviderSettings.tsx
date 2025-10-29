import CustomLogo from '@/assets/brands/email.svg'
import MsExchangeLogo from '@/assets/brands/exchange.svg'
import GmailLogo from '@/assets/brands/gmail.svg'
import OutlookLogo from '@/assets/brands/outlook.svg'
import setupStore from '@/pages/dashboard/workflows/accounts-payable/stores/useSetupStore'
import BrandCard from '../../components/BrandCard'
import SectionHeader from '../../components/SectionHeader'

const items = [
  { logo: GmailLogo, name: 'Gmail', value: 'Gmail' },
  { logo: OutlookLogo, name: 'Outlook', value: 'Outlook' },
  {
    logo: MsExchangeLogo,
    name: 'Microsoft Exchange',
    value: 'Microsoft Exchange',
  },
  { logo: CustomLogo, name: 'Custom (IMAP)', value: 'Custom' },
]

const ProviderSettings = () => {
  const emailSettings = setupStore((state) => state.emailSettings)
  const setEmailSettings = setupStore((state) => state.setEmailSettings)

  return (
    <div>
      <SectionHeader
        description='Select from popular providers or choose Custom to enter your own settings.'
        title='Choose Your Email Provider'
      />

      <div className='grid grid-cols-1 gap-2 md:grid-cols-2'>
        {items.map((item) => (
          <BrandCard
            checked={emailSettings.provider === item.value}
            key={item.value}
            logo={item.logo}
            name={item.name}
            value={item.value}
            onClick={() =>
              setEmailSettings({
                ...emailSettings,
                isConnected: false,
                provider: item.value,
              })
            }
          />
        ))}
      </div>
    </div>
  )
}

ProviderSettings.displayName = 'ProviderSettings'
export default ProviderSettings
