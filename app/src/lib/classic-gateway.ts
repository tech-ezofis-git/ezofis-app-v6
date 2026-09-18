import { setToLocalStorage } from '@/utils/local-storage'

const CLASSIC_RUNTIME_COOKIE = 'ezofis-runtime'
const CLASSIC_RUNTIME_VALUE = 'v5'

type IdentityLike = {
  accessToken?: unknown
  iv?: unknown
  key?: unknown
  token?: unknown
}

const asIdentity = (value: unknown): IdentityLike | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as IdentityLike)
    : null

export const getClassicPath = () => {
  const configured = String(import.meta.env.VITE_V5_CLASSIC_PATH || '/v5')
  if (!configured.startsWith('/')) return '/v5'
  return configured.replace(/\/+$/, '') || '/v5'
}

export const isV6Identity = (value: unknown) => {
  const identity = asIdentity(value)
  return (
    typeof identity?.accessToken === 'string' && identity.accessToken.length > 0
  )
}

export const isClassicIdentity = (value: unknown) => {
  const identity = asIdentity(value)
  return (
    typeof identity?.token === 'string' &&
    identity.token.length > 0 &&
    typeof identity?.key === 'string' &&
    identity.key.length > 0 &&
    typeof identity?.iv === 'string' &&
    identity.iv.length > 0 &&
    !isV6Identity(identity)
  )
}

export const isClassicGatewayEnabled = () => {
  if (globalThis.window === undefined) return false

  const flag = String(import.meta.env.VITE_ENABLE_V5_GATEWAY || '')
    .trim()
    .toLowerCase()
  if (flag === 'false' || flag === '0' || flag === 'off') return false
  if (flag === 'true' || flag === '1' || flag === 'on') return true

  const host = globalThis.location.hostname
  return (
    host === 'cloud.ezofis.com' || host === 'localhost' || host === '127.0.0.1'
  )
}

export const getV5ApiBaseUrl = () => {
  const configured = String(import.meta.env.VITE_V5_API_URL || '').trim()
  if (configured) return configured.replace(/\/+$/, '')

  if (globalThis.window !== undefined) {
    const host = globalThis.location.hostname
    if (
      host === 'cloud.ezofis.com' ||
      host === 'localhost' ||
      host === '127.0.0.1'
    ) {
      return '/v5-api/api'
    }
  }

  return 'https://eztapi.ezofis.com/api'
}

export const setClassicRuntimeCookie = () => {
  if (globalThis.document === undefined) return
  document.cookie = `${CLASSIC_RUNTIME_COOKIE}=${CLASSIC_RUNTIME_VALUE}; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 12}`
}

export const clearClassicRuntimeCookie = () => {
  if (globalThis.document === undefined) return
  document.cookie = `${CLASSIC_RUNTIME_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`
}

export const persistClassicIdentity = (identity: unknown) => {
  if (!isClassicIdentity(identity)) return false
  setToLocalStorage(identity, 'identity')
  globalThis.localStorage.removeItem('session')
  return true
}

export const enterClassic = () => {
  setClassicRuntimeCookie()
  globalThis.location.assign(`${getClassicPath()}/`)
}
