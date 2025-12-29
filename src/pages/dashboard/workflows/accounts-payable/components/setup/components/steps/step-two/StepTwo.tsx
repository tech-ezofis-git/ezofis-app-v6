import Alert from '@/components/base/Alert'
import Button from '@/components/base/button/Button'
import Divider from '@/components/base/Divider'
import HeroText from '@/components/common/HeroText'
import setupStore from '@/pages/dashboard/workflows/accounts-payable/stores/useSetupStore'
import ErpSettings from './components/ErpSettings'
import ErpSystem from './components/ErpSystem'

const StepTwo = () => {
  const setStep = setupStore((state) => state.setStep)
  const erpSettings = setupStore((state) => state.erpSettings)
  const setErpSettings = setupStore((state) => state.setErpSettings)

  const handleConnect = () => {
    setErpSettings({
      ...erpSettings,
      isConnecting: true,
    })
    setTimeout(() => {
      setErpSettings({
        ...erpSettings,
        isConnected: true,
        isConnecting: false,
      })
    }, 1000)
  }

  return (
    <div className='flex min-h-full w-full flex-col gap-6 px-4 py-6 sm:px-6 md:px-8 lg:px-10'>
      <HeroText
        className='items-start text-left'
        description='Connect your ERP to sync vendors, purchase orders, and payments with your workflows.'
        title='Integrate Your ERP'
      />

      <Divider />
      <ErpSystem />

      {erpSettings.system !== '' && (
        <>
          <Divider />
          <ErpSettings />
        </>
      )}

      {erpSettings.isConnected && erpSettings.system && (
        <Alert
          text={`Your ${erpSettings.system} account has been connected successfully.`}
          variant='green'
        />
      )}

      {erpSettings.templateUploaded && (
        <Alert
          text='Template uploaded successfully. You can proceed to the next step.'
          variant='green'
        />
      )}

      <div className='flex flex-wrap items-center justify-between gap-2 border-t border-gray-3 pt-4'>
        <Button
          color='gray'
          icon='tabler:arrow-left'
          label='Back'
          variant='outline'
          onClick={() => setStep(0)}
        />
        {erpSettings.isConnected || erpSettings.templateUploaded ? (
          <Button
            label='Continue'
            suffixIcon='tabler:arrow-right'
            onClick={() => setStep(2)}
          />
        ) : erpSettings.system ? (
          <Button
            icon='tabler:plug'
            label={`Connect ${erpSettings.system}`}
            loading={erpSettings.isConnecting}
            onClick={handleConnect}
          />
        ) : null}
      </div>
    </div>
  )
}

StepTwo.displayName = 'StepTwo'
export default StepTwo