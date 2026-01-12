import { Fragment } from 'react'
import setupStore from '@/pages/dashboard/workflows/accounts-payable/stores/useSetupStore'
// import { ArrowDown, ArrowRight } from 'lucide-react'
// import SectionHeader from '../../components/SectionHeader'
import Integration from './Integration'
import Icon from '@/components/base/icon/Icon'
import Title from '@/components/base/Title'

const Integrations = () => {
  const storageSettings = setupStore((state) => state.storageSettings)
  const emailSettings = setupStore((state) => state.emailSettings)
  const erpSettings = setupStore((state) => state.erpSettings)

  const getEmailDisplayName = () => {
    if (emailSettings.provider === 'DIRECT_UPLOAD') {
      return 'Direct Upload'
    }
    return emailSettings.provider || 'Not selected'
  }

  const getErpDisplayName = () => {
    if (erpSettings.wantsFileBasedImport || erpSettings.system === 'FILE_BASED_IMPORT') {
      return 'Manual PO Import  '
    }
    return erpSettings.system || 'Not selected'
  }

  const getStorageDisplayName = () => {
    if (storageSettings.system === 'Included storage') {
      return 'Default Storage'
    }
    return storageSettings.system || 'Not selected'
  }

  const getEmailIcon = () => {
    if (emailSettings.provider === 'DIRECT_UPLOAD') {
      return 'tabler:upload'
    }
    return 'tabler:mail-filled'
  }

  const getErpIcon = () => {
    if (erpSettings.wantsFileBasedImport || erpSettings.system === 'FILE_BASED_IMPORT') {
      return 'tabler:file-spreadsheet'
    }
    return 'tabler:file-spreadsheet'
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
      account: emailSettings.provider === 'DIRECT_UPLOAD' ? 'N/A' : emailSettings.email || 'Not configured',
      icon: getErpIcon(),
      iconBgColor: getErpIconBg(),
      iconColor: getErpIconColor(),
      name: 'Capture',
      platform: getEmailDisplayName(),
      status: emailSettings.isConnected ? 'connected' : 'pending',
    },
    {
      account: erpSettings.importMethod === 'import'
        ? (erpSettings.selectedFormName || 'Not configured')
        : (erpSettings.uploadedTemplate?.name || (erpSettings.wantsFileBasedImport ? 'N/A' : 'Not configured')),
      icon: getEmailIcon(),
      iconBgColor: getEmailIconBg(),
      iconColor: getEmailIconColor(),
      name: 'File Upload',
      platform: getErpDisplayName(),
      status: erpSettings.isConnected || erpSettings.templateUploaded || erpSettings.selectedFormName ? 'connected' : 'pending',
    },
    {
      account: storageSettings.system === 'Included storage' ? 'Basic' : storageSettings.apiUrl || 'Basic',
      icon: 'tabler:cloud-filled',
      iconBgColor: getStorageIconBg(),
      iconColor: getStorageIconColor(),
      name: ' Storage',
      platform: getStorageDisplayName(),
      status: storageSettings.isConnected ? 'connected' : 'pending',
    },
  ]

  return (
    <div>
      <Title
        description='Review your connections and confirm your setup before activation.'
        level={3}
        title='Configuration Summary'
      />
      <div className='mt-6'>
        {/* Horizontal flow with visual connection */}
        <div className="flex flex-col lg:flex-row w-full max-w-6xl mx-auto px-4 items-stretch gap-6">
          {integrations.map((integration, index) => (
            <Fragment key={integration.name}>
              <div className='flex flex-col flex-1'>
                <Integration
                  account={integration.account}
                  icon={integration.icon}
                  iconBgColor={integration.iconBgColor}
                  iconColor={integration.iconColor}
                  name={integration.name}
                  platform={integration.platform}
                />
              </div>
              {/* Add flow indicator - arrow or line */}
              {index < integrations.length - 1 && (
                <div className="flex flex-col lg:flex-row justify-center items-center shrink-0">
                  <div className="hidden lg:flex items-center w-16 relative justify-center mx-2">
                    <div className="absolute inset-0 top-1/2 -translate-y-1/2 h-[2px] bg-gray-200 w-full" />
                    <div className="relative z-10 bg-gray-50 p-1.5 rounded-full shadow-sm text-gray-400">
                      <Icon className='size-8' name="tabler:arrow-narrow-right-dashed" />
                    </div>
                  </div>

                  {/* Mobile Vertical Line with Arrow */}
                  <div className="lg:hidden flex flex-col items-center h-16 relative justify-center my-2">
                    <div className="absolute inset-0 left-1/2 -translate-x-1/2 w-[2px] bg-gray-200 h-full" />
                    <div className="relative z-10 bg-gray-50 p-1.5 rounded-full border border-gray-200 shadow-sm text-gray-400">
                      <Icon className='size-8' name="tabler:arrow-narrow-down-dashed" />
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