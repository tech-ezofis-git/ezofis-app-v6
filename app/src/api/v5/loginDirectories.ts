import { loginClassic } from '@/api/v5/classicAuth'
import { authApiV6 } from '@/api/v6/auth'
import {
  isClassicGatewayEnabled,
  isClassicIdentity,
} from '@/lib/classic-gateway'

export type DirectoryAccount = {
  email: string
  id: number | string
  label: string
  product: 'v5' | 'v6'
  readyIdentity?: unknown
  value: number | string
}

export type DirectoryLookupResult = {
  accounts: DirectoryAccount[]
  error: string
}

const asTenantRows = (value: unknown): Array<Record<string, unknown>> =>
  Array.isArray(value)
    ? value.filter((row) => row && typeof row === 'object')
    : []

export const lookupLoginDirectories = async (payload: {
  email: string
  password: string
}): Promise<DirectoryLookupResult> => {
  if (!isClassicGatewayEnabled()) {
    return { accounts: [], error: '' }
  }

  const [v6Result, v5Result] = await Promise.allSettled([
    authApiV6.getTenants(payload.email),
    loginClassic(payload),
  ])

  const accounts: DirectoryAccount[] = []

  if (v6Result.status === 'fulfilled' && !v6Result.value.error) {
    const tenants = v6Result.value.data?.tenants || []
    for (const tenant of tenants) {
      const tenantId = tenant?.tenantId
      if (tenantId == null || tenantId === '') continue
      accounts.push({
        email: payload.email,
        id: `v6:${tenantId}`,
        label: tenant.name || String(tenantId),
        product: 'v6',
        value: tenantId,
      })
    }
  }

  if (v5Result.status === 'fulfilled') {
    const classic = v5Result.value
    if (classic.mfa) {
      // MFA must be completed on Classic itself; do not inject a partial session.
    } else if (classic.status === 300) {
      for (const tenant of asTenantRows(classic.data)) {
        const tenantId = tenant.id ?? tenant.tenantId
        if (tenantId == null || tenantId === '') continue
        accounts.push({
          email: String(tenant.email || payload.email),
          id: `v5:${tenantId}`,
          label: `Classic — ${tenant.name || tenantId}`,
          product: 'v5',
          value: tenantId as number | string,
        })
      }
    } else if (!classic.error && isClassicIdentity(classic.data)) {
      accounts.push({
        email: payload.email,
        id: 'v5:current',
        label: 'EZOFIS Classic',
        product: 'v5',
        readyIdentity: classic.data,
        value: 'current',
      })
    }
  }

  if (accounts.length > 0) {
    return { accounts, error: '' }
  }

  const v6Error = v6Result.status === 'fulfilled' ? v6Result.value.error : ''
  const v5Error = v5Result.status === 'fulfilled' ? v5Result.value.error : ''

  return {
    accounts: [],
    error: v6Error || v5Error || '',
  }
}
