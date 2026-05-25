// import { motion } from 'motion/react'
// import CustomLogo from '@/assets/brands/email.svg'
// import MsExchangeLogo from '@/assets/brands/exchange.svg'
import GmailLogo from '@/assets/brands/gmail.svg'
import OutlookLogo from '@/assets/brands/outlook.svg'
// import Icon from '@/components/base/icon/Icon'
import {
  AnimateBounce,
  AnimateFadeIn,
  AnimateRotate,
  AnimateScale,
  AnimateSlideUp,
} from '@/components/common/animations'
import setupStore from '@/pages/dashboard/workflows/accounts-payable/stores/useSetupStore'
import BrandCard from '../../components/BrandCard'
import { OrDivider } from '../../components/StepLayout'
import SectionHeader from '../../components/SectionHeader'

const directUploadItem = {
  description: 'Quickly upload any document saved to your current device.',
  icon: 'tabler:upload',
  name: 'Quick Drop',
  value: 'DIRECT_UPLOAD',
}

const emailProviders = [
  { logo: GmailLogo, name: 'Gmail', value: 'gmail' },
  { logo: OutlookLogo, name: 'Outlook', value: 'outlook' },
  // {
  //   logo: MsExchangeLogo,
  //   name: 'Microsoft Exchange',
  //   value: 'Microsoft Exchange',
  // },
  // { logo: CustomLogo, name: 'Custom (IMAP)', value: 'Custom' },
]

const ProviderSettings = () => {
  const emailSettings = setupStore((state) => state.emailSettings)
  const setEmailSettings = setupStore((state) => state.setEmailSettings)

  const animationVariants = [
    AnimateSlideUp,
    AnimateScale,
    AnimateBounce,
    AnimateRotate,
    AnimateFadeIn,
  ]

  return (
    <div className='space-y-6'>
      {/* File Upload Section */}
      <div>
        <AnimateSlideUp delay={0.1}>
          <SectionHeader
            description='Upload your documents manually from your device.'
            title='Direct Upload'
          />
        </AnimateSlideUp>
        <AnimateSlideUp delay={0.15}>
          <BrandCard
            checked={emailSettings.provider === directUploadItem.value}
            description={directUploadItem.description}
            icon={directUploadItem.icon}
            name={directUploadItem.name}
            value={directUploadItem.value}
            onClick={() =>
              setEmailSettings({
                ...emailSettings,
                isConnected: directUploadItem.value === 'DIRECT_UPLOAD',
                provider: directUploadItem.value,
              })
            }
          />
        </AnimateSlideUp>
      </div>

      <OrDivider />

      {/* Email Integrations Section */}
      <div>
        <AnimateSlideUp delay={0.2}>
          <SectionHeader
            description='Connect your email account to automatically capture and process invoices. Select from popular providers or choose Custom to enter your own settings.'
            title='Email Integration'
          />
        </AnimateSlideUp>
        <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
          {emailProviders.map((item, index) => {
            const AnimationComponent =
              animationVariants[index % animationVariants.length]
            return (
              <AnimationComponent delay={0.25 + index * 0.08} key={item.value}>
                <BrandCard
                  checked={emailSettings.provider === item.value}
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
              </AnimationComponent>
            )
          })}
        </div>
      </div>
    </div>
  )
}

ProviderSettings.displayName = 'ProviderSettings'
export default ProviderSettings
