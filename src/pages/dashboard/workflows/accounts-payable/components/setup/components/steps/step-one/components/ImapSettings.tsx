import { useLingui } from '@lingui/react/macro'
import InputNumber from '@/components/base/inputs/InputNumber'
import InputText from '@/components/base/inputs/InputText'
import InputPassword from '@/components/base/inputs/password/InputPassword'
import setupStore from '@/pages/dashboard/workflows/accounts-payable/stores/useSetupStore'
import SectionHeader from '../../components/SectionHeader'

const ImapSettings = () => {
  const { t } = useLingui()
  const emailSettings = setupStore((state) => state.emailSettings)
  const setEmailSettings = setupStore((state) => state.setEmailSettings)

  return (
    <div>
      <SectionHeader
        description={t`Enter IMAP server details for your custom email provider.`}
        title={t`Custom Email Configuration (IMAP)`}
      />

      <div className='grid grid-cols-1 gap-x-4 gap-y-4 md:grid-cols-2'>
        <InputText
          label={t`Email`}
          value={emailSettings.email || ''}
          required
          onChange={(value) =>
            setEmailSettings({ ...emailSettings, email: value })
          }
        />

        <InputPassword
          label={t`Password`}
          value={emailSettings.password || ''}
          required
          onChange={(value) =>
            setEmailSettings({ ...emailSettings, password: value })
          }
        />

        <InputText
          label={t`IMAP Server`}
          value={emailSettings.server || ''}
          required
          onChange={(value) =>
            setEmailSettings({ ...emailSettings, server: value })
          }
        />

        <InputNumber
          label={t`IMAP Port`}
          value={emailSettings.port || ''}
          required
          onChange={(value) =>
            setEmailSettings({ ...emailSettings, port: value })
          }
        />
      </div>
    </div>
  )
}

ImapSettings.displayName = 'ImapSettings'
export default ImapSettings
