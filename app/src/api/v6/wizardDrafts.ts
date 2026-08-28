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
  currentStep?: number
  currentStepKey?: string
  draftJson?: string
  id?: string
  isCompleted?: boolean
  tenantId?: string
  userId?: string
}

const DRAFT_BASE: Record<WizardDraftKind, string> = {
  folder: '/folder-creation/drafts',
  user: '/user-creation/drafts',
}

const tenantHeaders = () => {
  const store = authUserStore.getState()
  const tenantId = store.session?.tenantId || store.identity?.tenantId || ''
  return tenantId ? { 'X-Tenant-Id': tenantId } : undefined
}

const resolveIds = () => {
  const store = authUserStore.getState()
  return {
    tenantId: store.session?.tenantId || store.identity?.tenantId || '',
    userId: store.session?.id || '',
  }
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null

export const unwrapWizardDraft = (data: unknown): WizardDraftRecord | null => {
  if (!data) return null
  if (Array.isArray(data)) return unwrapWizardDraft(data[0])

  const record = asRecord(data)
  if (!record) return null

  const nested = record.data ?? record.result ?? record.payload ?? record.draft
  if (nested && nested !== record) {
    const inner = unwrapWizardDraft(nested)
    if (inner?.id || inner?.draftJson) return inner
  }

  const id =
    (typeof record.id === 'string' && record.id) ||
    (typeof record.draftId === 'string' && record.draftId) ||
    ''

  const draftJson =
    typeof record.draftJson === 'string'
      ? record.draftJson
      : record.draftJson && typeof record.draftJson === 'object'
        ? JSON.stringify(record.draftJson)
        : undefined

  if (!id && !draftJson) return null

  return {
    currentStep:
      typeof record.currentStep === 'number' ? record.currentStep : undefined,
    currentStepKey:
      typeof record.currentStepKey === 'string'
        ? record.currentStepKey
        : undefined,
    draftJson,
    id: id || undefined,
    isCompleted: Boolean(record.isCompleted),
    tenantId: typeof record.tenantId === 'string' ? record.tenantId : undefined,
    userId: typeof record.userId === 'string' ? record.userId : undefined,
  }
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
      headers: tenantHeaders(),
      method: 'GET',
      skipCancellation: true,
      url: DRAFT_BASE[kind],
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
        draftJson: payload.draftJson,
        tenantId: ids.tenantId,
        userId: ids.userId,
      },
      headers: tenantHeaders(),
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
      headers: tenantHeaders(),
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
      headers: tenantHeaders(),
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
