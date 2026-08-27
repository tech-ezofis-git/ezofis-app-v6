import authUserStore from '../../stores/authUserStore'
import { axiosV6 } from '../axios'
import { getV6ApiErrorMessage } from './auth'

export type BrandingDetailsResponse = {
  branding?: BrandingRecord
  brandingName?: string
  encryptedBrandingName?: string
}

export type BrandingJson = {
  applySurfaceBackground?: boolean
  brandName?: string
  colorPreferences?: {
    dark?: Record<string, string>
    light?: Record<string, string>
  }
  favicon?: string
  logo?: string
  palettes?: unknown
  savedAt?: string
}

export type BrandingRecord = {
  brandingJson?: string
  brandingName?: string
  id?: string
  tenantId?: string
  userEmail?: string
  userId?: string
}

export type ResolvedBranding = {
  encryptedBrandingName?: string
  json: BrandingJson | null
  name: string
}

export type SaveBrandingPayload = {
  brandingJson: string
  brandingName: string
  tenantId: string
  userEmail: string
  userId: string
}

export type SaveBrandingResponse = {
  brandingName?: string
  encryptedBrandingName?: string
}

const tenantHeaders = (tenantId?: string) =>
  tenantId ? { 'X-Tenant-Id': tenantId } : undefined

const resolveTenantId = (explicit?: string) => {
  const store = authUserStore.getState()
  return explicit || store.session?.tenantId || store.identity?.tenantId || ''
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null

export const parseBrandingJson = (raw: unknown): BrandingJson | null => {
  if (!raw) return null
  if (typeof raw === 'object') return raw as BrandingJson
  if (typeof raw !== 'string') return null
  try {
    const parsed = JSON.parse(raw) as BrandingJson
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

const looksLikeBrandingJson = (value: unknown): value is BrandingJson => {
  const record = asRecord(value)
  if (!record) return false
  return Boolean(
    record.brandName ||
    record.logo ||
    record.favicon ||
    record.colorPreferences ||
    record.palettes ||
    record.brandingJson,
  )
}

export const resolveBrandingFromResponse = (
  data: unknown,
  depth = 0,
): ResolvedBranding => {
  const empty: ResolvedBranding = { json: null, name: '' }
  if (!data || depth > 5) return empty

  if (Array.isArray(data)) {
    return resolveBrandingFromResponse(data[0], depth + 1)
  }

  const record = asRecord(data)
  if (!record) return empty

  const nested =
    record.data ??
    record.result ??
    record.payload ??
    record.branding ??
    record.item

  const nestedJson = Array.isArray(nested)
    ? resolveBrandingFromResponse(nested[0], depth + 1)
    : nested
      ? resolveBrandingFromResponse(nested, depth + 1)
      : empty

  const json =
    parseBrandingJson(record.brandingJson) ||
    nestedJson.json ||
    (!record.brandingJson && looksLikeBrandingJson(record)
      ? parseBrandingJson(record)
      : null)

  const nameCandidate = [
    record.brandingName,
    nestedJson.name,
    json?.brandName,
  ].find((value) => typeof value === 'string' && value.trim())

  const encryptedCandidate = [
    record.encryptedBrandingName,
    nestedJson.encryptedBrandingName,
  ].find((value) => typeof value === 'string' && value.trim())

  return {
    encryptedBrandingName:
      typeof encryptedCandidate === 'string'
        ? encryptedCandidate.trim()
        : undefined,
    json,
    name: typeof nameCandidate === 'string' ? nameCandidate.trim() : '',
  }
}

export const readSaveBrandingResponse = (
  data: unknown,
): SaveBrandingResponse | null => {
  if (!data || typeof data !== 'object') return null
  const record = data as Record<string, unknown>
  const inner =
    record.data && typeof record.data === 'object'
      ? (record.data as Record<string, unknown>)
      : record
  const encrypted = inner.encryptedBrandingName
  return {
    brandingName:
      typeof inner.brandingName === 'string' ? inner.brandingName : '',
    encryptedBrandingName:
      typeof encrypted === 'string' && encrypted.trim()
        ? encrypted.trim()
        : undefined,
  }
}

export const saveBranding = async (payload: SaveBrandingPayload) => {
  const response: { data: SaveBrandingResponse | null; error: string } = {
    data: null,
    error: '',
  }

  try {
    const tenantId = resolveTenantId(payload.tenantId)
    const { data, status } = await axiosV6({
      data: {
        brandingJson: payload.brandingJson,
        brandingName: payload.brandingName,
        tenantId,
        userEmail: payload.userEmail,
        userId: payload.userId,
      },
      headers: tenantHeaders(tenantId),
      method: 'POST',
      url: '/branding',
    })

    if (status !== 200 && status !== 201) {
      throw new Error('invalid status code')
    }

    const parsed = readSaveBrandingResponse(data)
    response.data = {
      brandingName: parsed?.brandingName || payload.brandingName,
      encryptedBrandingName: parsed?.encryptedBrandingName,
    }
  } catch (e: unknown) {
    const err = e as { response?: { data?: unknown } }
    console.error(e)
    response.error = getV6ApiErrorMessage(
      err?.response?.data,
      'Failed to save branding',
    )
  }

  return response
}

export const encryptBrandingName = async (brandingName: string) => {
  const response: { data: SaveBrandingResponse | null; error: string } = {
    data: null,
    error: '',
  }

  try {
    const tenantId = resolveTenantId()
    const { data, status } = await axiosV6({
      data: { brandingName },
      headers: tenantHeaders(tenantId),
      method: 'POST',
      skipCancellation: true,
      url: '/branding/encrypt',
    })

    if (status !== 200 && status !== 201) {
      throw new Error('invalid status code')
    }

    const parsed = readSaveBrandingResponse(data)
    if (!parsed?.encryptedBrandingName) {
      throw new Error('invalid encrypt response')
    }

    response.data = parsed
  } catch (e: unknown) {
    const err = e as { response?: { data?: unknown } }
    console.error(e)
    response.error = getV6ApiErrorMessage(
      err?.response?.data,
      'Failed to encrypt branding name',
    )
  }

  return response
}

export const getBrandingByEncryptedName = async (encryptedName: string) => {
  const response: { data: BrandingDetailsResponse | null; error: string } = {
    data: null,
    error: '',
  }

  try {
    const tenantId = resolveTenantId()
    const { data, status } = await axiosV6({
      headers: tenantHeaders(tenantId),
      method: 'GET',
      skipCancellation: true,
      url: `/branding/${encodeURIComponent(encryptedName)}`,
    })

    if (status !== 200 && status !== 201) {
      throw new Error('invalid status code')
    }

    response.data = (data ?? null) as BrandingDetailsResponse | null
  } catch (e: unknown) {
    const err = e as { response?: { data?: unknown } }
    console.error(e)
    response.error = getV6ApiErrorMessage(
      err?.response?.data,
      'Failed to load branding',
    )
  }

  return response
}

export const getTenantBranding = async () => {
  const response: { data: BrandingDetailsResponse | null; error: string } = {
    data: null,
    error: '',
  }

  try {
    const tenantId = resolveTenantId()
    const { data, status } = await axiosV6({
      headers: tenantHeaders(tenantId),
      method: 'GET',
      skipCancellation: true,
      url: '/branding',
    })

    if (status !== 200 && status !== 201) {
      throw new Error('invalid status code')
    }

    response.data = (data ?? null) as BrandingDetailsResponse | null
  } catch (e: unknown) {
    const err = e as { response?: { data?: unknown } }
    console.error(e)
    response.error = getV6ApiErrorMessage(
      err?.response?.data,
      'Failed to load branding',
    )
  }

  return response
}
