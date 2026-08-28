import connectorApi, { type OAuthProviderCode } from '@/api/connector'

const PROVIDER_CODE_BY_VALUE: Record<string, OAuthProviderCode> = {
  GCP: 'GCP',
  GMAIL: 'GMAIL',
  GOOGLE_DRIVE: 'GOOGLE_DRIVE',
  ONEDRIVE: 'ONEDRIVE',
  ONE_DRIVE: 'ONEDRIVE',
  OUTLOOK: 'OUTLOOK',
  QUICKBOOKS: 'QUICKBOOKS',
  gmail: 'GMAIL',
  google: 'GOOGLE_DRIVE',
  onedrive: 'ONEDRIVE',
  outlook: 'OUTLOOK',
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

  const response = await connectorApi.authorizeOAuth({
    name,
    providerCode,
    successRedirectUrl: `${window.location.origin}/auth`,
  })

  if (response.error || !response.payload) {
    return { error: response.error || 'Failed to start OAuth' }
  }

  window.open(response.payload, '_blank')
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
