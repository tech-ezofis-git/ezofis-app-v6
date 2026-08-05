import { useLingui } from '@lingui/react/macro'
import InputText from '@/components/base/inputs/InputText'
import setupStore from '@/pages/dashboard/workflows/accounts-payable/stores/useSetupStore'
import SectionHeader from '../../components/SectionHeader'

const ErpSettings = () => {
  const erpSettings = setupStore((state) => state.erpSettings)
  const setErpSettings = setupStore((state) => state.setErpSettings)

  return (
    <div>
      <SectionHeader
        description='Configure authentication and connection details to enable secure data exchange with your ERP.'
        title={t`ERP Settings`}
      />

      <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
        <InputText
          label={t`API URL`}
          value={erpSettings.apiUrl}
          required
          onChange={(value) =>
            setErpSettings({ ...erpSettings, apiUrl: value })
          }
        />

        <InputText
          label={t`API Key`}
          value={erpSettings.apiKey}
          required
          onChange={(value) =>
            setErpSettings({ ...erpSettings, apiKey: value })
          }
        />
      </div>
    </div>
  )
}

ErpSettings.displayName = 'ErpSettings'
export default ErpSettings
