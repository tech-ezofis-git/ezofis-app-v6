const getIdentifierList = (item: any, docId?: string): string[] => {
  const ids = [
    item?.transactionId,
    item?.requestNo,
    item?.reqNo,
    item?.workflowInstanceId,
    item?.instanceId,
    item?.processId,
    docId,
    item?.id,
  ].filter((id) => {
    if (!id) return false
    const str = String(id).trim()
    return str !== '' && str !== 'NaN' && str !== 'undefined' && str !== 'null'
  })
  return Array.from(new Set(ids.map(String)))
}

export const getAppliedSuggestionsStorageKeys = (
  item: any,
  docId?: string,
): string[] => {
  const ids = getIdentifierList(item, docId)
  return ids.map((id) => `ezofis_applied_suggestions_${id}`)
}

export const loadAppliedSuggestions = (
  item: any,
  docId?: string,
): Record<string, boolean> => {
  const keys = getAppliedSuggestionsStorageKeys(item, docId)
  const result: Record<string, boolean> = {}
  for (const k of keys) {
    try {
      const raw = localStorage.getItem(k)
      if (raw) {
        Object.assign(result, JSON.parse(raw))
      }
    } catch {}
  }
  return result
}

export const saveAppliedSuggestions = (
  item: any,
  docId: string | undefined,
  data: Record<string, boolean>,
) => {
  const keys = getAppliedSuggestionsStorageKeys(item, docId)
  for (const k of keys) {
    try {
      localStorage.setItem(k, JSON.stringify(data))
    } catch {
      // ignore
    }
  }
}

export const loadAppliedValues = (
  item: any,
  docId?: string,
): Record<string, any> => {
  const ids = getIdentifierList(item, docId)
  const result: Record<string, any> = {}
  for (const id of ids) {
    try {
      const raw = localStorage.getItem(`ezofis_applied_values_${id}`)
      if (raw) {
        Object.assign(result, JSON.parse(raw))
      }
    } catch {}
  }
  return result
}

export const saveAppliedValues = (
  item: any,
  docId: string | undefined,
  values: Record<string, any>,
) => {
  const ids = getIdentifierList(item, docId)
  for (const id of ids) {
    try {
      let existing: Record<string, any> = {}
      const raw = localStorage.getItem(`ezofis_applied_values_${id}`)
      if (raw) {
        try {
          existing = JSON.parse(raw)
        } catch {}
      }
      const merged = { ...existing, ...values }
      localStorage.setItem(`ezofis_applied_values_${id}`, JSON.stringify(merged))
    } catch {
      // ignore
    }
  }
}
