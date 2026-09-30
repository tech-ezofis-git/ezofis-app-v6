import connectorApi, { type OAuthProviderCode } from '@/api/connector'

const PROVIDER_CODE_BY_VALUE: Record<string, OAuthProviderCode> = {
  'GCP': 'GCP',
  'gmail': 'GMAIL',
  'Google Drive': 'GOOGLE_DRIVE',
  'OneDrive': 'ONEDRIVE',
  'outlook': 'OUTLOOK',
  'QuickBooks': 'QUICKBOOKS',
  'SAP': 'SAP_XSUAA',
  'sap': 'SAP_XSUAA',
  'SAP-XSUAA': 'SAP_XSUAA',
  'SAP_XSUAA': 'SAP_XSUAA',
  'sap_xsuaa': 'SAP_XSUAA',
}

export const getApOAuthProviderCode = (
  value: string,
): OAuthProviderCode | null => PROVIDER_CODE_BY_VALUE[value] ?? null

export const openApOAuthAuthorize = async (providerValue: string) => {
  const providerCode = getApOAuthProviderCode(providerValue)
  if (!providerCode) {
    return { error: `Unsupported OAuth provider: ${providerValue}`, url: '' }
  }

  // Pre-open blank popup to prevent browser popup blocker from blocking authorizationUrl
  const popup =
    typeof window !== 'undefined' ? window.open('about:blank', '_blank') : null

  const response = await connectorApi.authorizeOAuth({
    name: `AP ${providerCode}`,
    providerCode,
    successRedirectUrl: `${window.location.origin}/auth`,
  })

  if (response.error || !response.payload) {
    if (popup && !popup.closed) {
      popup.close()
    }
    return { error: response.error || 'Failed to start OAuth', url: '' }
  }

  if (popup && !popup.closed) {
    popup.location.href = response.payload
  } else {
    window.open(response.payload, '_blank')
  }

  return { error: '', url: response.payload }
}
