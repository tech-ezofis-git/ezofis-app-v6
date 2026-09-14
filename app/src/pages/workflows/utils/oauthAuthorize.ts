import connectorApi, { type OAuthProviderCode } from '@/api/connector'

const PROVIDER_CODE_BY_VALUE: Record<string, OAuthProviderCode> = {
  GCP: 'GCP',
  GMAIL: 'GMAIL',
  GOOGLE_DRIVE: 'GOOGLE_DRIVE',
  ONEDRIVE: 'ONEDRIVE',
  ONE_DRIVE: 'ONEDRIVE',
  OUTLOOK: 'OUTLOOK',
  QUICKBOOKS: 'QUICKBOOKS',
  SAP: 'SAP_XSUAA',
  'SAP-XSUAA': 'SAP_XSUAA',
  SAP_XSUAA: 'SAP_XSUAA',
  gmail: 'GMAIL',
  google: 'GOOGLE_DRIVE',
  onedrive: 'ONEDRIVE',
  outlook: 'OUTLOOK',
  sap: 'SAP_XSUAA',
  sap_xsuaa: 'SAP_XSUAA',
}

export const getWorkflowOAuthProviderCode = (
  value: string,
): OAuthProviderCode | null => PROVIDER_CODE_BY_VALUE[value] ?? null

export const openWorkflowOAuthAuthorize = async (
  providerValue: string,
  name: string,
) => {
  const providerCode = getWorkflowOAuthProviderCode(providerValue)
  if (!providerCode) {
    return { error: `Unsupported OAuth provider: ${providerValue}` }
  }

  // Pre-open blank popup to prevent browser popup blocker from blocking authorizationUrl
  const popup = typeof window !== 'undefined' ? window.open('about:blank', '_blank') : null

  const response = await connectorApi.authorizeOAuth({
    name,
    providerCode,
    successRedirectUrl: `${window.location.origin}/auth`,
  })

  if (response.error || !response.payload) {
    if (popup && !popup.closed) {
      popup.close()
    }
    return { error: response.error || 'Failed to start OAuth' }
  }

  // Navigate popup window to authorizationUrl
  if (popup && !popup.closed) {
    popup.location.href = response.payload
  } else {
    window.open(response.payload, '_blank')
  }

  return { error: '' }
}

export const parseOAuthConnectionSuccess = (data: Record<string, unknown>) => {
  const connectorId =
    typeof data.connectorId === 'string' ? data.connectorId : ''
  const connector = typeof data.connector === 'string' ? data.connector : ''
  let email = ''
  if (typeof data.externalAccountEmail === 'string') {
    email = data.externalAccountEmail
  } else if (typeof data.email === 'string') {
    email = data.email
  }

  return {
    connector,
    connectorId,
    email,
    label: connector || email,
  }
}
