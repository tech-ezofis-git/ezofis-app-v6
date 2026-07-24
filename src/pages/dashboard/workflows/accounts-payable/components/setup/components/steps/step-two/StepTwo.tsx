import { useEffect } from 'react'
import Alert from '@/components/base/Alert'
import Button from '@/components/base/button/Button'
import { AnimateFadeIn, AnimateSlideUp } from '@/components/common/animations'
import setupStore from '@/pages/dashboard/workflows/accounts-payable/stores/useSetupStore'
import { openApOAuthAuthorize } from '@/pages/dashboard/workflows/accounts-payable/utils/oauthAuthorize'
import { LINE_ITEM_TEMPLATE_COLUMNS } from '@/pages/requests/components/request/components/newrequest/poFlow/utils/lineItemSchema'
import { SYSTEM_TEMPLATE_COLUMNS } from '@/pages/requests/components/request/components/newrequest/poFlow/utils/templateSchema'
import authUserStore from '@/stores/authUserStore'
import { StepFooter, StepLayout } from '../components/StepLayout'
import ErpSystem from './components/ErpSystem'

const OAUTH_ERP_SYSTEMS = ['QuickBooks'] as const

const StepTwo = () => {
  const setStep = setupStore((state) => state.setStep)
  const erpSettings = setupStore((state) => state.erpSettings)
  const setErpSettings = setupStore((state) => state.setErpSettings)
  const session = authUserStore((state) => state.session)

  const isOAuthErp =
    erpSettings.system &&
    OAUTH_ERP_SYSTEMS.includes(
      erpSettings.system as (typeof OAUTH_ERP_SYSTEMS)[number],
    )

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      if (event.data.type !== 'CONNECTION_SUCCESS') return

      const externalAccountEmail =
        typeof event.data.externalAccountEmail === 'string'
          ? event.data.externalAccountEmail
          : typeof event.data.email === 'string'
            ? event.data.email
            : ''
      const connectorId =
        typeof event.data.connectorId === 'string'
          ? event.data.connectorId
          : ''
      const connector =
        typeof event.data.connector === 'string' ? event.data.connector : ''
      const current = setupStore.getState().erpSettings

      // Ignore late OAuth success after the user switched away from ERP OAuth
      if (
        !current.system ||
        !OAUTH_ERP_SYSTEMS.includes(
          current.system as (typeof OAUTH_ERP_SYSTEMS)[number],
        )
      ) {
        return
      }

      setErpSettings({
        ...current,
        account:
          externalAccountEmail ||
          connector ||
          session?.email ||
          current.account ||
          '',
        connectorId,
        isConnected: true,
        isConnecting: false,
      })
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [session?.email, setErpSettings])

  const handleConnect = async () => {
    setErpSettings({
      ...erpSettings,
      isConnecting: true,
    })

    const { error } = await openApOAuthAuthorize(erpSettings.system)
    if (error) {
      console.error(error)
      setErpSettings({
        ...erpSettings,
        isConnecting: false,
      })
    }
  }

  const requiredHeaderColumns = SYSTEM_TEMPLATE_COLUMNS.filter(
    (c) => c.required,
  )
  const isHeaderMappingComplete =
    requiredHeaderColumns.length > 0 &&
    requiredHeaderColumns.every(
      (col) =>
        !!erpSettings.mapping?.[col.key] &&
        erpSettings.mapping[col.key] !== 'Skip to Import',
    )

  const hasLineItems =
    erpSettings.lineItemHeaders && erpSettings.lineItemHeaders.length > 0
  const requiredLineItemColumns = LINE_ITEM_TEMPLATE_COLUMNS.filter(
    (c) => c.required,
  )

  const isLineItemMappingComplete =
    !hasLineItems ||
    (requiredLineItemColumns.length > 0 &&
      requiredLineItemColumns.every(
        (col) =>
          !!erpSettings.lineItemMapping?.[col.key] &&
          erpSettings.lineItemMapping[col.key] !== 'Skip to Import',
      ))

  const isMappingComplete = isHeaderMappingComplete && isLineItemMappingComplete

  const canContinue =
    erpSettings.system === 'PREDEFINED' ||
    (erpSettings.system === 'FILE_BASED_IMPORT' &&
      erpSettings.templateUploaded &&
      isMappingComplete) ||
    (erpSettings.isConnected &&
      erpSettings.system !== 'FILE_BASED_IMPORT' &&
      erpSettings.system !== 'PREDEFINED')

  const showConnect = Boolean(isOAuthErp && !erpSettings.isConnected)

  const selectionAlert = (() => {
    if (erpSettings.system === 'PREDEFINED') {
      return {
        text: 'Demo data selected. This data will be used for invoice processing.',
        variant: 'green' as const,
      }
    }
    if (
      erpSettings.system === 'FILE_BASED_IMPORT' &&
      !erpSettings.templateUploaded &&
      !erpSettings.isParsingTemplate
    ) {
      return {
        text: 'Upload PO master file selected. A PO master file is required to proceed with the setup.',
        variant: 'primary' as const,
      }
    }
    if (isOAuthErp && !erpSettings.isConnected) {
      return {
        text: `${erpSettings.system} selected. Click Connect ${erpSettings.system} to link your account.`,
        variant: 'primary' as const,
      }
    }
    return null
  })()

  return (
    <StepLayout
      description='ERP data will be used to validate incoming invoices to match with PO information and supplier data.'
      title='Connect your accounting software'
      footer={
        <StepFooter>
          <Button
            color='gray'
            icon='lucide:arrow-left'
            label='Back'
            variant='outline'
            onClick={() => setStep(0)}
          />
          {showConnect ? (
            <div className='flex items-center gap-3'>
              {erpSettings.isConnecting && (
                <Button
                  color='gray'
                  label='Cancel'
                  variant='outline'
                  onClick={() =>
                    setErpSettings({ ...erpSettings, isConnecting: false })
                  }
                />
              )}
              <Button
                icon='lucide:plug'
                label={`Connect ${erpSettings.system}`}
                loading={erpSettings.isConnecting}
                onClick={handleConnect}
              />
            </div>
          ) : (
            <Button
              disabled={!canContinue}
              label='Continue'
              suffixIcon='tabler:arrow-right'
              onClick={() => setStep(2)}
            />
          )}
        </StepFooter>
      }
    >
      <AnimateFadeIn delay={0.3}>
        <ErpSystem />
      </AnimateFadeIn>

      {selectionAlert && (
        <AnimateSlideUp delay={0.35}>
          <Alert text={selectionAlert.text} variant={selectionAlert.variant} />
        </AnimateSlideUp>
      )}

      {erpSettings.system === 'FILE_BASED_IMPORT' &&
        erpSettings.templateUploaded && (
          <AnimateSlideUp delay={0.4}>
            <Alert
              text='Your PO master file uploaded successfully. You can proceed to the next step.'
              variant='green'
            />
          </AnimateSlideUp>
        )}

      {erpSettings.isConnected &&
        isOAuthErp &&
        erpSettings.system !== 'FILE_BASED_IMPORT' && (
          <AnimateSlideUp delay={0.4}>
            <Alert
              text={
                erpSettings.account
                  ? `Connected as ${erpSettings.account}`
                  : `Your ${erpSettings.system} account has been connected successfully.`
              }
              variant='green'
            />
          </AnimateSlideUp>
        )}
    </StepLayout>
  )
}

StepTwo.displayName = 'StepTwo'
export default StepTwo
