import setupStore from '@/pages/dashboard/workflows/accounts-payable/stores/useSetupStore'
import SectionHeader from '../../components/SectionHeader'
import Integration from './Integration'

const Integrations = () => {
  const storageSettings = setupStore((state) => state.storageSettings)
  const emailSettings = setupStore((state) => state.emailSettings)
  const erpSettings = setupStore((state) => state.erpSettings)

  return (
    <div>
      <SectionHeader
        description='Review your connections and confirm your setup before activation.'
        title='Configuration Summary'
      />
      <div className='space-y-3'>
        <Integration
          account='charles@gmail.com'
          icon='tabler:mail'
          name='Email Integration'
          platform={emailSettings.provider}
          status='connected'
        />
        <Integration
          account='charles@gmail.com'
          icon='tabler:database'
          name='ERP System'
          platform={erpSettings.system}
          status='connected'
        />
        <Integration
          account='charles@gmail.com'
          icon='tabler:cloud'
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
