import connectorApi, { type OAuthProviderCode } from '@/api/connector'

const PROVIDER_CODE_BY_VALUE: Record<string, OAuthProviderCode> = {
  'GCP': 'GCP',
  'GMAIL': 'GMAIL',
  'gmail': 'GMAIL',
  'google': 'GOOGLE_DRIVE',
  'GOOGLE_DRIVE': 'GOOGLE_DRIVE',
  'ONE_DRIVE': 'ONEDRIVE',
  'ONEDRIVE': 'ONEDRIVE',
  'OUTLOOK': 'OUTLOOK',
  'outlook': 'OUTLOOK',
  'QUICKBOOKS': 'QUICKBOOKS',
  'SAP': 'SAP_XSUAA',
  'sap': 'SAP_XSUAA',
  'SAP-XSUAA': 'SAP_XSUAA',
  'SAP_XSUAA': 'SAP_XSUAA',
  'sap_xsuaa': 'SAP_XSUAA',
  'onedrive': 'ONEDRIVE',
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
  const popup =
    typeof window !== 'undefined' ? window.open('about:blank', '_blank') : null

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
