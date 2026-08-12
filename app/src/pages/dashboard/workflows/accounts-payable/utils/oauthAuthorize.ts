import connectorApi, { type OAuthProviderCode } from '@/api/connector'

const PROVIDER_CODE_BY_VALUE: Record<string, OAuthProviderCode> = {
  gmail: 'GMAIL',
  outlook: 'OUTLOOK',
  QuickBooks: 'QUICKBOOKS',
  'Google Drive': 'GOOGLE_DRIVE',
  GCP: 'GCP',
  OneDrive: 'ONEDRIVE',
}

export const getApOAuthProviderCode = (
  value: string,
): OAuthProviderCode | null => PROVIDER_CODE_BY_VALUE[value] ?? null

export const openApOAuthAuthorize = async (providerValue: string) => {
  const providerCode = getApOAuthProviderCode(providerValue)
  if (!providerCode) {
    return { error: `Unsupported OAuth provider: ${providerValue}`, url: '' }
  }

  const response = await connectorApi.authorizeOAuth({
    name: `AP ${providerCode}`,
    providerCode,
    successRedirectUrl: `${window.location.origin}/auth`,
  })

  if (response.error || !response.payload) {
    return { error: response.error || 'Failed to start OAuth', url: '' }
  }

  window.open(response.payload, '_blank')
  return { error: '', url: response.payload }
}
