import { useLingui } from '@lingui/react/macro'
import { Fragment } from 'react'
import Icon from '@/components/base/icon/Icon'
import Title from '@/components/base/Title'
import setupStore from '@/pages/dashboard/workflows/accounts-payable/stores/useSetupStore'
import Integration from './Integration'

const Integrations = () => {
  const { t } = useLingui()
  const storageSettings = setupStore((state) => state.storageSettings)
  const emailSettings = setupStore((state) => state.emailSettings)
  const erpSettings = setupStore((state) => state.erpSettings)

  const getEmailDisplayName = () => {
    if (emailSettings.provider === 'DIRECT_UPLOAD') {
      return t`Direct Upload`
    }
    return emailSettings.provider || t`Not selected`
  }

  const getErpDisplayName = () => {
    if (erpSettings.system === 'PREDEFINED') {
      return t`Predefined Master Data`
    }
    if (
      erpSettings.wantsFileBasedImport ||
      erpSettings.system === 'FILE_BASED_IMPORT'
    ) {
      return t`Manual PO Import`
    }
    return erpSettings.system || t`Not selected`
  }

  const getStorageDisplayName = () => {
    if (storageSettings.system === 'Included storage') {
      return t`Default Storage`
    }
    return storageSettings.system || t`Not selected`
  }

  const getEmailIcon = () => {
    if (emailSettings.provider === 'DIRECT_UPLOAD') {
      return 'tabler:upload'
    }
    return 'tabler:mail-filled'
  }

  const getErpIcon = () => {
    if (erpSettings.system === 'PREDEFINED') {
      return 'tabler:database-search'
    }
    if (
      erpSettings.wantsFileBasedImport ||
      erpSettings.system === 'FILE_BASED_IMPORT'
    ) {
      return 'tabler:file-spreadsheet'
    }
    return 'tabler:database'
  }

  const getEmailIconBg = () => {
    return 'bg-blue-2'
  }

  const getErpIconBg = () => {
    return 'bg-green-2'
  }

  const getStorageIconBg = () => {
    return 'bg-primary-2'
  }

  const getEmailIconColor = () => {
    return '!text-blue-9'
  }

  const getErpIconColor = () => {
    return '!text-green-9'
  }

  const getStorageIconColor = () => {
    return '!text-primary-9'
  }

  const integrations = [
    {
      account:
        emailSettings.provider === 'DIRECT_UPLOAD'
          ? t`N/A`
          : emailSettings.account || emailSettings.email || t`Not configured`,
      icon: getEmailIcon(),
      iconBgColor: getEmailIconBg(),
      iconColor: getEmailIconColor(),
      name: t`Capture`,
      platform: getEmailDisplayName(),
      status: emailSettings.isConnected ? 'connected' : 'pending',
    },
    {
      account:
        erpSettings.system === 'PREDEFINED'
          ? t`System Default`
          : erpSettings.system === 'QuickBooks'
            ? erpSettings.account || t`Not configured`
            : erpSettings.importMethod === 'import'
              ? erpSettings.selectedFormName || t`Not configured`
              : erpSettings.uploadedTemplate?.name ||
                (erpSettings.wantsFileBasedImport ? t`N/A` : t`Not configured`),
      icon: getErpIcon(),
      iconBgColor: getErpIconBg(),
      iconColor: getErpIconColor(),
      name: t`File Upload`,
      platform: getErpDisplayName(),
      status:
        erpSettings.isConnected ||
        erpSettings.templateUploaded ||
        erpSettings.selectedFormName
          ? 'connected'
          : 'pending',
    },
    {
      account:
        storageSettings.system === 'Included storage'
          ? t`Basic`
          : storageSettings.account ||
            storageSettings.apiUrl ||
            t`Not configured`,
      icon: 'tabler:cloud-filled',
      iconBgColor: getStorageIconBg(),
      iconColor: getStorageIconColor(),
      name: t`Storage`,
      platform: getStorageDisplayName(),
      status: storageSettings.isConnected ? 'connected' : 'pending',
    },
  ]

  return (
    <div>
      <Title
        className='items-start text-left'
        description={t`Review your connections and confirm your setup before activation.`}
        descriptionClassName='max-w-2xl text-pretty'
        level={3}
        title={t`Configuration Summary`}
      />
      <div className='mt-5'>
        <div className='mx-auto flex w-full max-w-6xl flex-col items-stretch gap-6 px-4 lg:flex-row'>
          {integrations.map((integration, index) => (
            <Fragment key={integration.name}>
              <div className='flex flex-1 flex-col'>
                <Integration
                  account={integration.account}
                  icon={integration.icon}
                  iconBgColor={integration.iconBgColor}
                  iconColor={integration.iconColor}
                  name={integration.name}
                  platform={integration.platform}
                />
              </div>
              {index < integrations.length - 1 && (
                <div className='flex shrink-0 flex-col items-center justify-center lg:flex-row'>
                  <div className='relative mx-2 hidden w-16 items-center justify-center lg:flex'>
                    <div className='bg-gray-4 absolute inset-0 top-1/2 h-[2px] w-full -translate-y-1/2' />
                    <div className='bg-surface-muted text-gray-8 relative z-10 rounded-full p-1.5 shadow-sm'>
                      <Icon
                        className='size-8'
                        name='tabler:arrow-narrow-right-dashed'
                      />
                    </div>
                  </div>

                  <div className='relative my-2 flex h-16 flex-col items-center justify-center lg:hidden'>
                    <div className='bg-gray-4 absolute inset-0 left-1/2 h-full w-[2px] -translate-x-1/2' />
                    <div className='bg-surface-muted border-gray-4 text-gray-8 relative z-10 rounded-full border p-1.5 shadow-sm'>
                      <Icon
                        className='size-8'
                        name='tabler:arrow-narrow-down-dashed'
                      />
                    </div>
                  </div>
                </div>
              )}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  )
}

Integrations.displayName = 'Integrations'
export default Integrations
