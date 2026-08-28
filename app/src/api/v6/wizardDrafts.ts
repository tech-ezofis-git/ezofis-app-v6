import authUserStore from '../../stores/authUserStore'
import { axiosV6 } from '../axios'
import { getV6ApiErrorMessage } from './auth'

export type SaveWizardDraftPayload = {
  currentStep: number
  currentStepKey: string
  draftId?: string | null
  draftJson: string
}

export type WizardDraftKind = 'folder' | 'user'

export type WizardDraftRecord = {
  createdAtUtc?: string
  currentStep?: number
  currentStepKey?: string
  draftJson?: string
  id?: string
  isCompleted?: boolean
  modifiedAtUtc?: string
  tenantId?: string
  userId?: string
}

const DRAFT_BASE: Record<WizardDraftKind, string> = {
  folder: '/folder-creation/drafts',
  user: '/user-creation/drafts',
}

const resolveIds = () => {
  const store = authUserStore.getState()
  return {
    tenantId: store.session?.tenantId || store.identity?.tenantId || '',
    userId: store.session?.id || '',
  }
}

const asString = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value.trim() : ''

const parseStepNumber = (value: unknown) => {
  const step = Number(value)
  return Number.isFinite(step) && step >= 1 ? step : undefined
}

const draftRequestHeaders = () => {
  const { tenantId, userId } = resolveIds()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (tenantId) headers['X-Tenant-Id'] = tenantId
  if (userId) {
    headers['X-User-Id'] = userId
    headers.userId = userId
  }
  return headers
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null

export const unwrapWizardDraft = (data: unknown): WizardDraftRecord | null => {
  const list = unwrapWizardDraftList(data)
  return list[0] || null
}

export const unwrapWizardDraftList = (data: unknown): WizardDraftRecord[] => {
  if (!data) return []
  if (Array.isArray(data)) {
    return data.flatMap((item) => unwrapWizardDraftList(item))
  }

  const record = asRecord(data)
  if (!record) return []

  const nested =
    record.data ??
    record.result ??
    record.payload ??
    record.drafts ??
    record.draft
  if (Array.isArray(nested)) {
    return nested.flatMap((item) => unwrapWizardDraftList(item))
  }
  if (nested && nested !== record && typeof nested === 'object') {
    const inner = unwrapWizardDraftList(nested)
    if (inner.length) return inner
  }

  const id =
    asString(record.id) ||
    asString(record.draftId) ||
    asString(record.Id) ||
    asString(record.DraftId)

  const rawJson = record.draftJson ?? record.DraftJson
  const draftJson =
    typeof rawJson === 'string'
      ? rawJson
      : rawJson && typeof rawJson === 'object'
        ? JSON.stringify(rawJson)
        : undefined

  if (!id && !draftJson) return []

  const isCompleted = record.isCompleted ?? record.IsCompleted

  return [
    {
      createdAtUtc:
        asString(record.createdAtUtc) ||
        asString(record.CreatedAtUtc) ||
        undefined,
      currentStep: parseStepNumber(record.currentStep ?? record.CurrentStep),
      currentStepKey:
        asString(record.currentStepKey) ||
        asString(record.CurrentStepKey) ||
        undefined,
      draftJson,
      id: id || undefined,
      isCompleted: Boolean(isCompleted),
      modifiedAtUtc:
        asString(record.modifiedAtUtc) ||
        asString(record.ModifiedAtUtc) ||
        undefined,
      tenantId:
        asString(record.tenantId) || asString(record.TenantId) || undefined,
      userId: asString(record.userId) || asString(record.UserId) || undefined,
    },
  ]
}

export const getActiveWizardDraft = async (kind: WizardDraftKind) => {
  const response: {
    data: WizardDraftRecord | null
    error: string
    notFound: boolean
  } = {
    data: null,
    error: '',
    notFound: false,
  }

  try {
    const { data, status } = await axiosV6({
      headers: draftRequestHeaders(),
      method: 'GET',
      skipCancellation: true,
      url: DRAFT_BASE[kind],
      validateStatus: (nextStatus: number) =>
        nextStatus === 404 || (nextStatus >= 200 && nextStatus < 300),
    })

    if (status === 404) {
      response.notFound = true
      return response
    }

    if (status !== 200 && status !== 201) {
      throw new Error('invalid status code')
    }

    response.data = unwrapWizardDraft(data)
  } catch (error: unknown) {
    const err = error as { response?: { data?: unknown; status?: number } }
    if (err?.response?.status === 404) {
      response.notFound = true
      return response
    }
    console.error(error)
    response.error = getV6ApiErrorMessage(
      err?.response?.data,
      'Failed to load draft',
    )
  }

  return response
}

export const getWizardDraftById = async (
  kind: WizardDraftKind,
  draftId: string,
) => {
  const response: {
    data: WizardDraftRecord | null
    error: string
    notFound: boolean
  } = {
    data: null,
    error: '',
    notFound: false,
  }

  try {
    const { data, status } = await axiosV6({
      headers: draftRequestHeaders(),
      method: 'GET',
      skipCancellation: true,
      url: `${DRAFT_BASE[kind]}/${encodeURIComponent(draftId)}`,
      validateStatus: (nextStatus: number) =>
        nextStatus === 404 || (nextStatus >= 200 && nextStatus < 300),
    })

    if (status === 404) {
      response.notFound = true
      return response
    }

    if (status !== 200 && status !== 201) {
      throw new Error('invalid status code')
    }

    response.data = unwrapWizardDraft(data)
  } catch (error: unknown) {
    const err = error as { response?: { data?: unknown; status?: number } }
    if (err?.response?.status === 404) {
      response.notFound = true
      return response
    }
    console.error(error)
    response.error = getV6ApiErrorMessage(
      err?.response?.data,
      'Failed to load draft',
    )
  }

  return response
}

export const listWizardDrafts = async (kind: WizardDraftKind) => {
  const active = await getActiveWizardDraft(kind)
  return {
    data: active.data && !active.data.isCompleted ? [active.data] : [],
    error: active.error,
  }
}

export const saveWizardDraft = async (
  kind: WizardDraftKind,
  payload: SaveWizardDraftPayload,
) => {
  const response: { data: WizardDraftRecord | null; error: string } = {
    data: null,
    error: '',
  }

  try {
    const ids = resolveIds()
    const { data, status } = await axiosV6({
      data: {
        currentStep: payload.currentStep,
        currentStepKey: payload.currentStepKey,
        draftId: payload.draftId || null,
        draftJson:
          typeof payload.draftJson === 'string'
            ? payload.draftJson
            : JSON.stringify(payload.draftJson ?? {}),
        tenantId: ids.tenantId,
        userId: ids.userId,
      },
      headers: draftRequestHeaders(),
      method: 'PUT',
      skipCancellation: true,
      url: DRAFT_BASE[kind],
    })

    if (status !== 200 && status !== 201) {
      throw new Error('invalid status code')
    }

    response.data = unwrapWizardDraft(data)
  } catch (error: unknown) {
    const err = error as { response?: { data?: unknown } }
    console.error(error)
    response.error = getV6ApiErrorMessage(
      err?.response?.data,
      'Failed to save draft',
    )
  }

  return response
}

export const completeWizardDraft = async (
  kind: WizardDraftKind,
  draftId?: string | null,
) => {
  if (!draftId) return { error: '' }

  try {
    await axiosV6({
      headers: draftRequestHeaders(),
      method: 'POST',
      skipCancellation: true,
      url: `${DRAFT_BASE[kind]}/${encodeURIComponent(draftId)}/complete`,
    })
  } catch (error: unknown) {
    const err = error as { response?: { data?: unknown } }
    console.error(error)
    return {
      error: getV6ApiErrorMessage(
        err?.response?.data,
        'Failed to complete draft',
      ),
    }
  }

  return { error: '' }
}

export const deleteWizardDraft = async (
  kind: WizardDraftKind,
  draftId?: string | null,
) => {
  if (!draftId) return { error: '' }

  try {
    await axiosV6({
      headers: draftRequestHeaders(),
      method: 'DELETE',
      skipCancellation: true,
      url: `${DRAFT_BASE[kind]}/${encodeURIComponent(draftId)}`,
    })
  } catch (error: unknown) {
    const err = error as { response?: { data?: unknown; status?: number } }
    if ((err as { response?: { status?: number } })?.response?.status === 404) {
      return { error: '' }
    }
    console.error(error)
    return {
      error: getV6ApiErrorMessage(
        err?.response?.data,
        'Failed to delete draft',
      ),
    }
  }

  return { error: '' }
}
