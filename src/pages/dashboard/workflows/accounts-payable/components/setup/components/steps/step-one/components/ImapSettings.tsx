import InputNumber from '@/components/base/inputs/InputNumber'
import InputText from '@/components/base/inputs/InputText'
import InputPassword from '@/components/base/inputs/password/InputPassword'
import setupStore from '@/pages/dashboard/workflows/accounts-payable/stores/useSetupStore'
import SectionHeader from '../../components/SectionHeader'

const ImapSettings = () => {
  const emailSettings = setupStore((state) => state.emailSettings)
  const setEmailSettings = setupStore((state) => state.setEmailSettings)

  return (
    <div>
      <SectionHeader
        description='Enter IMAP server details for your custom email provider.'
        title='Custom Email Configuration (IMAP)'
      />

      <div className='grid grid-cols-1 gap-x-2 gap-y-4 md:grid-cols-2'>
        <InputText
          label='Email'
          value={emailSettings.email || ''}
          required
          onChange={(value) =>
            setEmailSettings({ ...emailSettings, email: value })
          }
        />

        <InputPassword
          label='Password'
          value={emailSettings.password || ''}
          required
          onChange={(value) =>
            setEmailSettings({ ...emailSettings, password: value })
          }
        />

        <InputText
          label='IMAP Server'
          value={emailSettings.server || ''}
          required
          onChange={(value) =>
            setEmailSettings({ ...emailSettings, server: value })
          }
        />

        <InputNumber
          label='IMAP Port'
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
