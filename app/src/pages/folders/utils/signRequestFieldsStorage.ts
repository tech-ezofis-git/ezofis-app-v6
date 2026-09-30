import type { SignRequestFieldDto } from '@/api/v6/folder/signRequest'

const STORAGE_PREFIX = 'ezofis.signFields.'

type StoredSignFields = {
  fields: SignRequestFieldDto[]
  itemId: string
  repositoryId: string
  signRequestId: string
  updatedAtUtc: string
}

const storageKey = (signRequestId: string) =>
  `${STORAGE_PREFIX}${String(signRequestId || '').trim()}`

const itemKey = (repositoryId: string, itemId: string) =>
  `${STORAGE_PREFIX}item.${String(repositoryId || '').trim()}.${String(itemId || '').trim()}`

export const saveSignRequestFields = (payload: {
  fields: SignRequestFieldDto[]
  itemId: string
  repositoryId: string
  signRequestId: string
}) => {
  if (typeof globalThis.window === 'undefined') return
  const signRequestId = String(payload.signRequestId || '').trim()
  if (!signRequestId || !payload.fields?.length) return

  const record: StoredSignFields = {
    fields: payload.fields,
    itemId: String(payload.itemId || '').trim(),
    repositoryId: String(payload.repositoryId || '').trim(),
    signRequestId,
    updatedAtUtc: new Date().toISOString(),
  }

  try {
    const raw = JSON.stringify(record)
    globalThis.localStorage.setItem(storageKey(signRequestId), raw)
    if (record.repositoryId && record.itemId) {
      globalThis.localStorage.setItem(
        itemKey(record.repositoryId, record.itemId),
        raw,
      )
    }
  } catch (error) {
    console.error(error)
  }
}

export const loadSignRequestFields = (payload: {
  itemId?: string
  repositoryId?: string
  signRequestId?: string
}): SignRequestFieldDto[] => {
  if (typeof globalThis.window === 'undefined') return []

  try {
    const byRequest = String(payload.signRequestId || '').trim()
    if (byRequest) {
      const raw = globalThis.localStorage.getItem(storageKey(byRequest))
      if (raw) {
        const parsed = JSON.parse(raw) as StoredSignFields
        if (Array.isArray(parsed?.fields)) return parsed.fields
      }
    }

    const repositoryId = String(payload.repositoryId || '').trim()
    const itemId = String(payload.itemId || '').trim()
    if (repositoryId && itemId) {
      const raw = globalThis.localStorage.getItem(itemKey(repositoryId, itemId))
      if (raw) {
        const parsed = JSON.parse(raw) as StoredSignFields
        if (Array.isArray(parsed?.fields)) return parsed.fields
      }
    }
  } catch (error) {
    console.error(error)
  }

  return []
}

export const clearSignRequestFields = (signRequestId: string) => {
  if (typeof globalThis.window === 'undefined') return
  const id = String(signRequestId || '').trim()
  if (!id) return
  try {
    const raw = globalThis.localStorage.getItem(storageKey(id))
    if (raw) {
      const parsed = JSON.parse(raw) as StoredSignFields
      if (parsed?.repositoryId && parsed?.itemId) {
        globalThis.localStorage.removeItem(
          itemKey(parsed.repositoryId, parsed.itemId),
        )
      }
    }
    globalThis.localStorage.removeItem(storageKey(id))
  } catch (error) {
    console.error(error)
  }
}
