import InputText from '@/components/base/inputs/InputText'
import Title from '@/components/base/Title'
import setupStore from '@/pages/dashboard/workflows/accounts-payable/stores/useSetupStore'

const ErpSettings = () => {
  const erpSettings = setupStore((state) => state.erpSettings)
  const setErpSettings = setupStore((state) => state.setErpSettings)

  return (
    <div>
      <Title
        className='mb-6'
        description='Configure authentication and connection details to enable secure data exchange with your ERP.'
        level={3}
        title='ERP Settings'
      />

      <div className='grid grid-cols-1 gap-2 md:grid-cols-2'>
        <InputText
          label='API URL'
          value={erpSettings.apiUrl}
          required
          onChange={(value) =>
            setErpSettings({ ...erpSettings, apiUrl: value })
          }
        />

        <InputText
          label='API Key'
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