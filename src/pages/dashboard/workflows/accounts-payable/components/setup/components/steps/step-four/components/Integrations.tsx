import Title from '@/components/base/Title'
import setupStore from '@/pages/dashboard/workflows/accounts-payable/stores/useSetupStore'
import Integration from './Integration'

const Integrations = () => {
  const storageSettings = setupStore((state) => state.storageSettings)
  const emailSettings = setupStore((state) => state.emailSettings)
  const erpSettings = setupStore((state) => state.erpSettings)

  return (
    <div>
      <Title
        className='mb-6'
        description='Review your connections and confirm your setup before activation.'
        level={3}
        title='Configuration Summary'
      />
      <div className='space-y-4'>
        <Integration
          account='charles@gmail.com'
          icon='lucide:mail'
          name='Email Integration'
          platform={emailSettings.provider}
          status='connected'
        />
        <Integration
          account='charles@gmail.com'
          icon='lucide:database'
          name='ERP System'
          platform={erpSettings.system}
          status='connected'
        />
        <Integration
          account='charles@gmail.com'
          icon='lucide:cloud'
          name='Document Storage'
          platform={storageSettings.system}
          status='connected'
        />
      </div>
    </div>
  )
}

Integrations.displayName = 'Integrations'
export default Integrations
