// Best-effort, frontend-only record of which FILE_UPLOAD/IMAGE_UPLOAD form
// field a given attachment was uploaded through. Attachments aren't part of
// formData once submitted (see WorkflowFormRenderer's original comment), so
// the backend has no notion of "this file belongs to that field" — this
// sidesteps that by remembering the association locally (per browser) the
// moment an upload happens through a specific field, so the Overview can
// show each field's own files underneath it instead of lumping every
// upload under whichever field happens to be the form's only one.
const STORAGE_KEY = 'ezofis:field-attachment-map'

type InstanceMap = Record<string, string> // attachmentKey -> fieldId
type StoredMap = Record<string, InstanceMap> // instanceId -> InstanceMap

const readStore = (): StoredMap => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

const writeStore = (store: StoredMap) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    // Best-effort convenience map — a full/blocked localStorage just means
    // the fallback (sole-field heuristic) keeps being used.
  }
}

export const setFieldForAttachment = (
  instanceId: string | number,
  attachmentKey: string | number,
  fieldId: string,
) => {
  if (!instanceId || !attachmentKey || !fieldId) return
  const store = readStore()
  const key = String(instanceId)
  store[key] = { ...(store[key] || {}), [String(attachmentKey)]: fieldId }
  writeStore(store)
}

// One read for the whole instance — cheaper than looking up per attachment
// per field when rendering a form with several file fields.
export const getFieldAttachmentMap = (
  instanceId: string | number | undefined,
): InstanceMap => {
  if (!instanceId) return {}
  return readStore()[String(instanceId)] || {}
}
