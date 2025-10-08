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
    <div className='flex h-full max-w-max flex-col gap-10 p-6 xl:p-10'>
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

      {erpSettings.isConnected && (
        <Alert
          text={`Your ${erpSettings.system} account has been connected successfully.`}
          variant='green'
        />
      )}
      <Divider />

      <div className='flex flex-wrap items-center justify-between gap-2'>
        <Button
          color='gray'
          icon='tabler:arrow-left'
          label='Back'
          variant='outline'
          onClick={() => setStep(1)}
        />
        {erpSettings.isConnected ? (
          <Button
            label='Continue'
            suffixIcon='tabler:arrow-right'
            onClick={() => setStep(3)}
          />
        ) : (
          <Button
            icon='tabler:plug'
            label={`Connect ${erpSettings.system}`}
            loading={erpSettings.isConnecting}
            onClick={handleConnect}
          />
        )}
      </div>
    </div>
  )
}

StepTwo.displayName = 'StepTwo'
export default StepTwo
