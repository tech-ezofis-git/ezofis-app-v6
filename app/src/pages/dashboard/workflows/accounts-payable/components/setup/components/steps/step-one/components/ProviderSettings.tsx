import { useState } from 'react'
import {
  AnimateBounce,
  AnimateFadeIn,
  AnimateRotate,
  AnimateScale,
  AnimateSlideUp,
} from '@/components/common/animations'
import setupStore from '@/pages/dashboard/workflows/accounts-payable/stores/useSetupStore'
import BrandCard from '../../components/BrandCard'
import SectionHeader from '../../components/SectionHeader'
import { OrDivider } from '../../components/StepLayout'
import SwitchIntegrationConfirm from '../../components/SwitchIntegrationConfirm'

const directUploadItem = {
  description: 'Quick Drop',
  icon: 'tabler:upload',
  name: 'I will manually upload invoices from my computer.',
  value: 'DIRECT_UPLOAD',
}

const emailProviders = [
  {
    description: 'Connect your Gmail account to sync invoices from your inbox.',
    icon: 'logos:google-gmail',
    name: 'Gmail',
    value: 'gmail',
  },
  {
    description:
      'Connect your Outlook account to sync invoices from your inbox.',
    icon: 'vscode-icons:file-type-outlook',
    name: 'Outlook',
    value: 'outlook',
  },
]

const getProviderLabel = (value: string) => {
  if (value === directUploadItem.value) return 'Direct Upload'
  return emailProviders.find((p) => p.value === value)?.name || value
}

const ProviderSettings = () => {
  const emailSettings = setupStore((state) => state.emailSettings)
  const setEmailSettings = setupStore((state) => state.setEmailSettings)
  const [pendingSwitch, setPendingSwitch] = useState<{
    name: string
    apply: () => void
  } | null>(null)

  const animationVariants = [
    AnimateSlideUp,
    AnimateScale,
    AnimateBounce,
    AnimateRotate,
    AnimateFadeIn,
  ]

  const requestSwitch = (
    nextValue: string,
    nextName: string,
    apply: () => void,
  ) => {
    if (emailSettings.provider === nextValue) return

    const needsConfirm =
      emailSettings.isConnected &&
      emailSettings.provider !== 'DIRECT_UPLOAD' &&
      emailSettings.provider !== nextValue

    if (needsConfirm) {
      setPendingSwitch({ apply, name: nextName })
      return
    }

    apply()
  }

  return (
    <div className='space-y-6'>
      <SwitchIntegrationConfirm
        currentName={getProviderLabel(emailSettings.provider)}
        nextName={pendingSwitch?.name}
        opened={Boolean(pendingSwitch)}
        onCancel={() => setPendingSwitch(null)}
        onConfirm={() => {
          pendingSwitch?.apply()
          setPendingSwitch(null)
        }}
      />

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
            connected={
              emailSettings.provider === directUploadItem.value &&
              emailSettings.isConnected
            }
            onClick={() =>
              requestSwitch(directUploadItem.value, 'Direct Upload', () => {
                const current = setupStore.getState().emailSettings
                setEmailSettings({
                  ...current,
                  account: '',
                  connectorId: '',
                  email: '',
                  isConnected: true,
                  isConnecting: false,
                  provider: directUploadItem.value,
                })
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
            description='Automatically sync invoices sent to your billing address.'
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
                  icon={item.icon}
                  name={item.name}
                  value={item.value}
                  connected={
                    emailSettings.provider === item.value &&
                    emailSettings.isConnected
                  }
                  description={
                    emailSettings.provider === item.value &&
                    emailSettings.isConnected
                      ? emailSettings.account ||
                        emailSettings.email ||
                        'Connected'
                      : item.description
                  }
                  onClick={() =>
                    requestSwitch(item.value, item.name, () => {
                      const current = setupStore.getState().emailSettings
                      setEmailSettings({
                        ...current,
                        account: '',
                        connectorId: '',
                        email: '',
                        isConnected: false,
                        isConnecting: false,
                        provider: item.value,
                      })
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
