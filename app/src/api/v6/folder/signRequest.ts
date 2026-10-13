import axios from 'axios'
import authUserStore from '../../../stores/authUserStore'
import { axiosV6 } from '../../axios'

const isRequestCanceled = (error: unknown) => {
  const err = error as { code?: string; message?: string; name?: string }
  return (
    axios.isCancel(error) ||
    err?.name === 'CanceledError' ||
    err?.code === 'ERR_CANCELED' ||
    /cancel/i.test(String(err?.message || ''))
  )
}

const unwrap = (payload: any) => payload ?? payload

const getTenantHeaders = (tenantId?: string) => {
  const resolved =
    tenantId ||
    authUserStore.getState().session?.tenantId ||
    authUserStore.getState().identity?.tenantId ||
    ''
  return resolved ? { 'X-Tenant-Id': resolved } : undefined
}

const toErrorMessage = (error: unknown, fallback: string) => {
  const err = error as {
    message?: string
    response?: {
      data?: { error?: string; message?: string; title?: string } | string
    }
  }
  const data = err?.response?.data
  if (typeof data === 'string' && data.trim()) return data
  if (data && typeof data === 'object') {
    return data.error || data.message || data.title || err?.message || fallback
  }
  return err?.message || fallback
}

export type CreateSignRequestPayload = {
  expiresInDays?: number
  /** Signature places on the PDF (points, origin top-left). */
  fields?: SignRequestFieldInput[]
  itemId: string
  message?: string
  repositoryId: string
  signers: CreateSignRequestSigner[]
  signingMode: SignRequestSigningMode
  tenantId?: string
}

export type CreateSignRequestSigner = {
  email: string
  fields?: SignRequestFieldInput[]
  name: string
  order: number
}

export type SignRequestFieldDto = {
  fieldId?: string
  height: number
  pageNumber: number
  signedAtUtc?: string | null
  signerEmail?: string
  signerName?: string
  signerOrder?: number
  status?: string
  width: number
  x: number
  y: number
}

export type SignRequestFieldInput = {
  height: number
  pageNumber: number
  signerEmail?: string
  signerOrder?: number
  width: number
  x: number
  y: number
}

export type SignRequestSigningMode = 'single' | 'multiple' | 'sequential'

export type SubmitSignaturePayload = {
  fieldId?: string
  height: number
  pageNumber: number
  signatureImageBase64: string
  signedAtClientUtc?: string
  tenantId?: string
  width: number
  x: number
  y: number
}

/** Hidden block stored in create `message` so places survive when API drops `fields`. */
const MESSAGE_START = '[[ezofis-sign-fields:'
const MESSAGE_END = ']]'

const toCompactField = (field: SignRequestFieldDto) => ({
  height: Number(field.height),
  pageNumber: Number(field.pageNumber) || 1,
  signerEmail: field.signerEmail || undefined,
  signerName: field.signerName || undefined,
  signerOrder: field.signerOrder || undefined,
  status: field.status || undefined,
  width: Number(field.width),
  x: Number(field.x),
  y: Number(field.y),
})

/** Remove hidden field payload from a user-visible message. */
export const stripSignFieldsFromMessage = (message?: string | null): string => {
  const raw = String(message || '')
  if (!raw.includes(MESSAGE_START)) return raw.trim()
  const pattern = new RegExp(
    `${MESSAGE_START.replace(/[[\]]/g, '\\$&')}[\\s\\S]*?${MESSAGE_END.replace(/[[\]]/g, '\\$&')}`,
    'g',
  )
  return raw.replace(pattern, '').trim()
}

/** Encode signature places into the message body (persisted by the API). */
export const embedSignFieldsInMessage = (
  message: string | undefined,
  fields: SignRequestFieldDto[],
): string => {
  const clean = stripSignFieldsFromMessage(message)
  if (!fields?.length) return clean

  let encoded = ''
  try {
    encoded = globalThis.btoa(
      unescape(encodeURIComponent(JSON.stringify(fields.map(toCompactField)))),
    )
  } catch {
    return clean
  }

  const block = `${MESSAGE_START}${encoded}${MESSAGE_END}`
  return clean ? `${clean}\n\n${block}` : block
}

/** Read signature places previously embedded in a sign-request message. */
export const extractSignFieldsFromMessage = (
  message?: string | null,
): SignRequestFieldDto[] => {
  const raw = String(message || '')
  const start = raw.indexOf(MESSAGE_START)
  if (start < 0) return []
  const payloadStart = start + MESSAGE_START.length
  const end = raw.indexOf(MESSAGE_END, payloadStart)
  if (end < 0) return []

  try {
    const encoded = raw.slice(payloadStart, end).trim()
    const json = decodeURIComponent(escape(globalThis.atob(encoded)))
    const parsed = JSON.parse(json)
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((item: any) => {
        const pageNumber = Number(item?.pageNumber ?? item?.page)
        const x = Number(item?.x)
        const y = Number(item?.y)
        const width = Number(item?.width)
        const height = Number(item?.height)
        if (
          ![pageNumber, x, y, width, height].every((n) => Number.isFinite(n))
        ) {
          return null
        }
        return {
          height,
          pageNumber: pageNumber || 1,
          signerEmail:
            String(item?.signerEmail || item?.email || '').trim() || undefined,
          signerName: item?.signerName || item?.name || undefined,
          signerOrder: Number(item?.signerOrder ?? item?.order) || undefined,
          status: item?.status || 'REQUESTED',
          width,
          x,
          y,
        } as SignRequestFieldDto
      })
      .filter(Boolean) as SignRequestFieldDto[]
  } catch {
    return []
  }
}

export type SignRequestDto = {
  completedAtUtc?: string | null
  createdAtUtc?: string | null
  expiresAtUtc?: string | null
  fields?: SignRequestFieldDto[]
  fileName?: string
  initiatedByEmail?: string
  initiatedByName?: string
  initiatedByUserId?: string
  inviteToken?: string | null
  itemId: string
  message?: string | null
  repositoryId: string
  signers?: SignRequestSignerDto[]
  signingMode?: string
  signRequestId: string
  status?: string
}

export type SignRequestSignerDto = {
  email: string
  fields?: SignRequestFieldDto[]
  invitedAtUtc?: string | null
  inviteUrl?: string | null
  name: string
  order: number
  signedAtUtc?: string | null
  signerId?: string
  status?: string
}

const normalizeField = (
  raw: any,
  fallbackEmail?: string,
  fallbackOrder?: number,
): SignRequestFieldDto | null => {
  if (!raw || typeof raw !== 'object') return null
  const pageNumber = Number(raw.pageNumber ?? raw.page ?? raw.PageNumber)
  const x = Number(raw.x ?? raw.X)
  const y = Number(raw.y ?? raw.Y)
  const width = Number(raw.width ?? raw.w ?? raw.Width)
  const height = Number(raw.height ?? raw.h ?? raw.Height)
  if (
    ![pageNumber, x, y, width, height].every((value) => Number.isFinite(value))
  ) {
    return null
  }
  return {
    fieldId: raw.fieldId || raw.id || raw.signatureFieldId || undefined,
    height,
    pageNumber: pageNumber || 1,
    signedAtUtc: raw.signedAtUtc ?? null,
    signerEmail:
      String(raw.signerEmail || raw.email || fallbackEmail || '').trim() ||
      undefined,
    signerName: raw.signerName || raw.name || undefined,
    signerOrder:
      Number(raw.signerOrder ?? raw.order ?? fallbackOrder) || undefined,
    status: raw.status || undefined,
    width,
    x,
    y,
  }
}

/** Collect signature places from create/get/preview payloads. */
export const collectSignRequestFields = (
  payload:
    | {
        fields?: any[]
        message?: string | null
        placements?: any[]
        signatureFields?: any[]
        signers?: Array<{
          email?: string
          fields?: any[]
          name?: string
          order?: number
        }>
      }
    | null
    | undefined,
): SignRequestFieldDto[] => {
  if (!payload) return []
  const collected: SignRequestFieldDto[] = []
  const seen = new Set<string>()

  const pushUnique = (field: SignRequestFieldDto) => {
    const key = [
      field.pageNumber,
      field.x,
      field.y,
      field.width,
      field.height,
      String(field.signerEmail || '').toLowerCase(),
    ].join(':')
    if (seen.has(key)) return
    seen.add(key)
    collected.push(field)
  }

  const lists = [payload.fields, payload.signatureFields, payload.placements]
  for (const list of lists) {
    if (!Array.isArray(list)) continue
    for (const field of list) {
      const normalized = normalizeField(field)
      if (normalized) pushUnique(normalized)
    }
  }

  if (Array.isArray(payload.signers)) {
    for (const signer of payload.signers) {
      const signerFields = Array.isArray(signer?.fields) ? signer.fields : []
      for (const field of signerFields) {
        const normalized = normalizeField(field, signer.email, signer.order)
        if (!normalized) continue
        if (!normalized.signerName && signer.name) {
          normalized.signerName = signer.name
        }
        pushUnique(normalized)
      }
    }
  }

  // Backend may ignore top-level `fields`; places are also embedded in `message`.
  for (const field of extractSignFieldsFromMessage(payload.message)) {
    pushUnique(field)
  }

  return collected
}

export const createSignRequest = async (payload: CreateSignRequestPayload) => {
  const response: { data: SignRequestDto | null; error: string } = {
    data: null,
    error: '',
  }

  const repositoryId = String(payload.repositoryId || '').trim()
  const itemId = String(payload.itemId || '').trim()
  if (!repositoryId || !itemId) {
    response.error = 'Repository and item are required'
    return response
  }
  if (!payload.signers?.length) {
    response.error = 'Add at least one signer'
    return response
  }

  try {
    const topLevelFields = (payload.fields || []).map((field) => ({
      height: Number(field.height),
      pageNumber: Number(field.pageNumber) || 1,
      signerEmail: field.signerEmail,
      signerOrder: field.signerOrder,
      width: Number(field.width),
      x: Number(field.x),
      y: Number(field.y),
    }))

    const fieldsForMessage: SignRequestFieldDto[] = topLevelFields.map(
      (field) => ({
        height: field.height,
        pageNumber: field.pageNumber,
        signerEmail: field.signerEmail,
        signerOrder: field.signerOrder,
        status: 'REQUESTED',
        width: field.width,
        x: field.x,
        y: field.y,
      }),
    )

    const body = {
      expiresInDays: payload.expiresInDays,
      fields: topLevelFields.length ? topLevelFields : undefined,
      // Persist places inside message so get/preview return them even if
      // the API drops the dedicated `fields` property.
      message:
        embedSignFieldsInMessage(
          payload.message?.trim() || undefined,
          fieldsForMessage,
        ) || undefined,
      signers: payload.signers.map((signer, index) => {
        const order = Number(signer.order) || index + 1
        const signerFields = (
          signer.fields?.length
            ? signer.fields
            : topLevelFields.filter(
                (field) =>
                  String(field.signerEmail || '').toLowerCase() ===
                    String(signer.email || '').toLowerCase() ||
                  Number(field.signerOrder) === order,
              )
        ).map((field) => ({
          height: Number(field.height),
          pageNumber: Number(field.pageNumber) || 1,
          width: Number(field.width),
          x: Number(field.x),
          y: Number(field.y),
        }))
        return {
          email: String(signer.email || '').trim(),
          fields: signerFields.length ? signerFields : undefined,
          name: String(signer.name || '').trim(),
          order,
        }
      }),
      signingMode: payload.signingMode,
    }

    const { data, status } = await axiosV6({
      data: body,
      headers: getTenantHeaders(payload.tenantId),
      method: 'POST',
      url: `/repositories/${repositoryId}/items/${itemId}/sign-requests`,
    })

    if (status !== 200 && status !== 201) throw new Error('invalid status code')
    response.data = unwrap(data) as SignRequestDto
  } catch (error: unknown) {
    if (isRequestCanceled(error)) return response
    console.error(error)
    response.error = toErrorMessage(error, 'Unable to create sign request')
  }

  return response
}

export const listItemSignRequests = async (payload: {
  itemId: string
  repositoryId: string
  tenantId?: string
}) => {
  const response: { data: SignRequestDto[]; error: string } = {
    data: [],
    error: '',
  }

  const repositoryId = String(payload.repositoryId || '').trim()
  const itemId = String(payload.itemId || '').trim()
  if (!repositoryId || !itemId) {
    response.error = 'Repository and item are required'
    return response
  }

  try {
    const { data, status } = await axiosV6({
      headers: getTenantHeaders(payload.tenantId),
      method: 'GET',
      url: `/repositories/${repositoryId}/items/${itemId}/sign-requests`,
    })
    if (status !== 200) throw new Error('invalid status code')
    const payloadData = unwrap(data)
    response.data = Array.isArray(payloadData)
      ? payloadData
      : Array.isArray(payloadData?.data)
        ? payloadData.data
        : Array.isArray(payloadData?.items)
          ? payloadData.items
          : []
  } catch (error: unknown) {
    if (isRequestCanceled(error)) return response
    console.error(error)
    response.error = toErrorMessage(error, 'Unable to load sign requests')
  }

  return response
}

export const getSignRequest = async (payload: {
  signRequestId: string
  tenantId?: string
}) => {
  const response: { data: SignRequestDto | null; error: string } = {
    data: null,
    error: '',
  }

  const signRequestId = String(payload.signRequestId || '').trim()
  if (!signRequestId) {
    response.error = 'Sign request id is required'
    return response
  }

  try {
    const { data, status } = await axiosV6({
      headers: getTenantHeaders(payload.tenantId),
      method: 'GET',
      url: `/sign-requests/${signRequestId}`,
    })
    if (status !== 200) throw new Error('invalid status code')
    response.data = unwrap(data) as SignRequestDto
  } catch (error: unknown) {
    if (isRequestCanceled(error)) return response
    console.error(error)
    response.error = toErrorMessage(error, 'Unable to load sign request')
  }

  return response
}

export const cancelSignRequest = async (payload: {
  signRequestId: string
  tenantId?: string
}) => {
  const response: { data: unknown; error: string } = {
    data: null,
    error: '',
  }

  const signRequestId = String(payload.signRequestId || '').trim()
  if (!signRequestId) {
    response.error = 'Sign request id is required'
    return response
  }

  try {
    const { data, status } = await axiosV6({
      headers: getTenantHeaders(payload.tenantId),
      method: 'POST',
      url: `/sign-requests/${signRequestId}/cancel`,
    })
    if (status !== 200 && status !== 204) throw new Error('invalid status code')
    response.data = unwrap(data)
  } catch (error: unknown) {
    if (isRequestCanceled(error)) return response
    console.error(error)
    response.error = toErrorMessage(error, 'Unable to cancel sign request')
  }

  return response
}

export const listPendingSignRequestsForMe = async (tenantId?: string) => {
  const response: { data: SignRequestDto[]; error: string } = {
    data: [],
    error: '',
  }

  try {
    const { data, status } = await axiosV6({
      headers: getTenantHeaders(tenantId),
      method: 'GET',
      url: `/sign-requests/pending-for-me`,
    })
    if (status !== 200) throw new Error('invalid status code')
    const payloadData = unwrap(data)
    response.data = Array.isArray(payloadData)
      ? payloadData
      : Array.isArray(payloadData?.data)
        ? payloadData.data
        : Array.isArray(payloadData?.items)
          ? payloadData.items
          : []
  } catch (error: unknown) {
    if (isRequestCanceled(error)) return response
    console.error(error)
    response.error = toErrorMessage(
      error,
      'Unable to load pending sign requests',
    )
  }

  return response
}

const buildSubmitBody = (payload: SubmitSignaturePayload) => ({
  fieldId: payload.fieldId || undefined,
  height: Number(payload.height),
  pageNumber: Number(payload.pageNumber) || 1,
  signatureImageBase64: payload.signatureImageBase64,
  signedAtClientUtc: payload.signedAtClientUtc || new Date().toISOString(),
  width: Number(payload.width),
  x: Number(payload.x),
  y: Number(payload.y),
})

/** Path B — logged-in user submits signature */
export const submitSignRequest = async (payload: {
  signature: SubmitSignaturePayload
  signRequestId: string
  tenantId?: string
}) => {
  const response: { data: SignRequestDto | null; error: string } = {
    data: null,
    error: '',
  }

  const signRequestId = String(payload.signRequestId || '').trim()
  if (!signRequestId) {
    response.error = 'Sign request id is required'
    return response
  }
  if (!payload.signature?.signatureImageBase64) {
    response.error = 'Signature image is required'
    return response
  }

  try {
    const { data, status } = await axiosV6({
      data: buildSubmitBody(payload.signature),
      headers: getTenantHeaders(payload.tenantId || payload.signature.tenantId),
      method: 'POST',
      url: `/sign-requests/${signRequestId}/sign`,
    })
    if (status !== 200 && status !== 201) throw new Error('invalid status code')
    response.data = unwrap(data) as SignRequestDto
  } catch (error: unknown) {
    if (isRequestCanceled(error)) return response
    console.error(error)
    response.error = toErrorMessage(error, 'Unable to submit signature')
  }

  return response
}

export type SignRequestInvitePreview = {
  createdAtUtc?: string | null
  expiresAtUtc?: string | null
  fields?: SignRequestFieldDto[]
  fileName?: string
  invitedAtUtc?: string | null
  inviteToken: string
  itemId: string
  message?: string | null
  recipientEmail?: string
  repositoryId: string
  requiredSocialProvider?: string | null
  requiresLogin?: boolean
  requiresOtp?: boolean
  requiresPasswordSetup?: boolean
  senderEmail?: string
  senderName?: string
  signerCount?: number
  signerOrder?: number
  signers?: SignRequestSignerDto[]
  signerStatus?: string
  signingMode?: string
  signRequestId: string
  signRequestStatus?: string
  sourceOrganizationName?: string
  tenantId: string
}

export const getSignRequestInvitePreview = async (inviteToken: string) => {
  const response: { data: SignRequestInvitePreview | null; error: string } = {
    data: null,
    error: '',
  }

  const token = String(inviteToken || '').trim()
  if (!token) {
    response.error = 'Invite token is required'
    return response
  }

  try {
    const { data, status } = await axiosV6({
      method: 'GET',
      skipCancellation: true,
      url: `/sign-requests/invite/${encodeURIComponent(token)}/preview`,
    })
    if (status !== 200) throw new Error('invalid status code')
    response.data = unwrap(data) as SignRequestInvitePreview
  } catch (error: unknown) {
    if (isRequestCanceled(error)) return response
    console.error(error)
    response.error = toErrorMessage(error, 'Unable to load sign request invite')
  }

  return response
}

export const getSignRequestInviteFile = async (payload: {
  accessToken?: string
  disposition?: 'inline' | 'attachment'
  inviteToken: string
  tenantId?: string
}) => {
  const response: { data: Blob | null; error: string } = {
    data: null,
    error: '',
  }

  const inviteToken = String(payload.inviteToken || '').trim()
  if (!inviteToken) {
    response.error = 'Invite token is required'
    return response
  }

  try {
    const headers: Record<string, string> = {
      ...getTenantHeaders(payload.tenantId),
    }
    if (payload.accessToken) {
      headers.Authorization = `Bearer ${payload.accessToken}`
    }

    const { data, status } = await axiosV6({
      headers,
      method: 'GET',
      params: {
        disposition: payload.disposition || 'inline',
      },
      responseType: 'blob',
      skipCancellation: true,
      url: `/sign-requests/invite/${encodeURIComponent(inviteToken)}/file`,
    })
    if (status !== 200) throw new Error('invalid status code')
    response.data = data as Blob
  } catch (error: unknown) {
    if (isRequestCanceled(error)) return response
    console.error(error)
    response.error = toErrorMessage(
      error,
      'Unable to load document for signing',
    )
  }

  return response
}

export const setSignRequestPassword = async (payload: {
  email: string
  inviteToken: string
  password: string
  tenantId?: string
}) => {
  const response: {
    data: {
      accessToken?: string
      expiresIn?: number
      tokenType?: string
      userId?: string
    } | null
    error: string
  } = {
    data: null,
    error: '',
  }

  try {
    const { data, status } = await axiosV6({
      data: {
        email: payload.email,
        inviteToken: payload.inviteToken,
        password: payload.password,
      },
      headers: getTenantHeaders(payload.tenantId),
      method: 'POST',
      url: `/auth/sign-request/set-password`,
    })
    if (status !== 200 && status !== 201) throw new Error('invalid status code')
    response.data = unwrap(data)
  } catch (error: unknown) {
    if (isRequestCanceled(error)) return response
    console.error(error)
    response.error = toErrorMessage(error, 'Unable to set password')
  }

  return response
}

export const signRequestSocialLogin = async (payload: {
  email: string
  inviteToken: string
  provider: string
  tenantId?: string
}) => {
  const response: {
    data: {
      accessToken?: string
      expiresIn?: number
      tokenType?: string
      userId?: string
    } | null
    error: string
  } = {
    data: null,
    error: '',
  }

  try {
    const { data, status } = await axiosV6({
      data: {
        email: payload.email,
        inviteToken: payload.inviteToken,
        provider: payload.provider,
      },
      headers: getTenantHeaders(payload.tenantId),
      method: 'POST',
      url: `/auth/sign-request/social-login`,
    })
    if (status !== 200 && status !== 201) throw new Error('invalid status code')
    response.data = unwrap(data)
  } catch (error: unknown) {
    if (isRequestCanceled(error)) return response
    console.error(error)
    response.error = toErrorMessage(error, 'Unable to complete social login')
  }

  return response
}

/** Path A — invite-token submit signature */
export const submitInviteSignRequest = async (payload: {
  accessToken?: string
  inviteToken: string
  signature: SubmitSignaturePayload
}) => {
  const response: { data: SignRequestDto | null; error: string } = {
    data: null,
    error: '',
  }

  const inviteToken = String(payload.inviteToken || '').trim()
  if (!inviteToken) {
    response.error = 'Invite token is required'
    return response
  }

  try {
    const headers: Record<string, string> = {
      ...getTenantHeaders(payload.signature.tenantId),
    }
    if (payload.accessToken) {
      headers.Authorization = `Bearer ${payload.accessToken}`
    }

    const { data, status } = await axiosV6({
      data: buildSubmitBody(payload.signature),
      headers,
      method: 'POST',
      url: `/sign-requests/invite/${encodeURIComponent(inviteToken)}/sign`,
    })
    if (status !== 200 && status !== 201) throw new Error('invalid status code')
    response.data = unwrap(data) as SignRequestDto
  } catch (error: unknown) {
    if (isRequestCanceled(error)) return response
    console.error(error)
    response.error = toErrorMessage(error, 'Unable to submit signature')
  }

  return response
}

export const sendSignRequestOtp = async (payload: {
  email: string
  inviteToken: string
  tenantId?: string
}) => {
  const response: { data: { sent: boolean } | null; error: string } = {
    data: null,
    error: '',
  }
  const token = String(payload.inviteToken || '').trim()
  const email = String(payload.email || '').trim()
  if (!token) {
    response.error = 'Invite token is required'
    return response
  }
  if (!email) {
    response.error = 'Email is required'
    return response
  }

  try {
    const { data, status } = await axiosV6({
      data: JSON.stringify({ email }),
      headers: getTenantHeaders(payload.tenantId),
      method: 'POST',
      skipAuthToken: true,
      url: `/sign-requests/invite/${encodeURIComponent(token)}/otp`,
    })

    if (status !== 200 && status !== 201) throw new Error('invalid status code')
    response.data = data?.sent !== undefined ? data : { sent: true }
  } catch (error: unknown) {
    if (isRequestCanceled(error)) return response
    console.error(error)
    response.error = toErrorMessage(
      error,
      'Failed to send verification code. Please try again.',
    )
  }
  return response
}

export const verifySignRequestOtp = async (payload: {
  email: string
  inviteToken: string
  otp: string
  tenantId?: string
}) => {
  const response: {
    data: {
      accessToken?: string
      expiresIn?: number
      tokenType?: string
      userId?: string
      [key: string]: any
    } | null
    error: string
  } = {
    data: null,
    error: '',
  }
  const token = String(payload.inviteToken || '').trim()
  const email = String(payload.email || '').trim()
  const otp = String(payload.otp || '').trim()
  if (!token) {
    response.error = 'Invite token is required'
    return response
  }
  if (!email) {
    response.error = 'Email is required'
    return response
  }
  if (!otp) {
    response.error = 'Verification code is required'
    return response
  }

  try {
    const { data, status } = await axiosV6({
      data: JSON.stringify({ email, otp }),
      headers: getTenantHeaders(payload.tenantId),
      method: 'POST',
      skipAuthToken: true,
      url: `/sign-requests/invite/${encodeURIComponent(token)}/otp/verify`,
    })

    if (status !== 200 && status !== 201) throw new Error('invalid status code')
    response.data = unwrap(data)
  } catch (error: unknown) {
    if (isRequestCanceled(error)) return response
    console.error(error)
    response.error = toErrorMessage(
      error,
      'Invalid or expired verification code.',
    )
  }
  return response
}

export const declineSignRequestInvite = async (payload: {
  accessToken?: string
  inviteToken: string
  reason?: string
  tenantId?: string
}) => {
  const response: { data: unknown; error: string } = {
    data: null,
    error: '',
  }
  const token = String(payload.inviteToken || '').trim()
  if (!token) {
    response.error = 'Invite token is required'
    return response
  }

  try {
    const headers: Record<string, string> = {
      ...getTenantHeaders(payload.tenantId),
    }
    if (payload.accessToken) {
      headers.Authorization = `Bearer ${payload.accessToken}`
    }

    const { data, status } = await axiosV6({
      data: JSON.stringify({
        reason: payload.reason?.trim() || 'Not my document',
      }),
      headers,
      method: 'POST',
      url: `/sign-requests/invite/${encodeURIComponent(token)}/decline`,
    })

    if (status !== 200 && status !== 201 && status !== 204) {
      throw new Error('invalid status code')
    }
    response.data = unwrap(data)
  } catch (error: unknown) {
    if (isRequestCanceled(error)) return response
    console.error(error)
    response.error = toErrorMessage(error, 'Unable to decline sign request')
  }
  return response
}

