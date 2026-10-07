export type FolderPiiSettings = {
  enabled: boolean
  /** Folder field ids from the Fields step. Only these values are redacted. */
  fieldIds: string[]
  users: FolderPiiUserAccess[]
}

export type FolderPiiUserAccess = {
  password: string
  userId: string
}

const STORAGE_PREFIX = 'ezofis_folder_pii_'

const toUserId = (value: unknown): string => {
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value).trim()
  }
  return String(
    (value as { id?: string | number })?.id ??
      (value as { userId?: string | number })?.userId ??
      (value as { value?: string | number })?.value ??
      '',
  ).trim()
}

const toAccessUsers = (value: unknown): FolderPiiUserAccess[] => {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const out: FolderPiiUserAccess[] = []

  for (const entry of value) {
    if (entry == null) continue

    if (typeof entry === 'string' || typeof entry === 'number') {
      const userId = String(entry).trim()
      if (!userId || seen.has(userId)) continue
      seen.add(userId)
      out.push({ password: '', userId })
      continue
    }

    const row = entry as Record<string, unknown>
    const userId = toUserId(row.userId ?? row.id ?? row.value ?? entry)
    if (!userId || seen.has(userId)) continue
    seen.add(userId)
    out.push({
      password: String(row.password ?? row.pass ?? row.pin ?? ''),
      userId,
    })
  }

  return out
}

const toFieldIds = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const entry of value) {
    const id =
      typeof entry === 'string' || typeof entry === 'number'
        ? String(entry).trim()
        : String(
            (entry as { fieldId?: string | number; id?: string | number })
              ?.fieldId ??
              (entry as { id?: string | number })?.id ??
              '',
          ).trim()
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push(id)
  }
  return out
}

export const emptyFolderPiiSettings = (): FolderPiiSettings => ({
  enabled: false,
  fieldIds: [],
  users: [],
})

export const folderPiiUserIds = (settings: FolderPiiSettings): string[] =>
  settings.users.map((entry) => entry.userId).filter(Boolean)

export const folderPiiHasValidAccessUsers = (settings: FolderPiiSettings) =>
  settings.users.some(
    (entry) => Boolean(entry.userId?.trim()) && Boolean(entry.password?.trim()),
  )

/** Read PII settings from a repository API payload (flexible field names). */
export const parseFolderPiiSettings = (
  source: Record<string, unknown> | null | undefined,
): FolderPiiSettings => {
  if (!source) return emptyFolderPiiSettings()

  const nested =
    source.piiRedaction && typeof source.piiRedaction === 'object'
      ? (source.piiRedaction as Record<string, unknown>)
      : source.piiSettings && typeof source.piiSettings === 'object'
        ? (source.piiSettings as Record<string, unknown>)
        : null

  const enabledRaw =
    nested?.enabled ??
    source.piiRedactionEnabled ??
    source.piiEnabled ??
    source.enablePiiRedaction

  const usersFromNestedOrSource = toAccessUsers(
    nested?.users ??
      nested?.accessUsers ??
      source.piiRedactionUsers ??
      source.piiUsers,
  )

  // Legacy shape: user ids only (no passwords).
  const legacyIds = toAccessUsers(
    nested?.userIds ??
      source.piiRedactionUserIds ??
      source.piiUserIds ??
      source.piiRedactionUsers,
  )

  const users =
    usersFromNestedOrSource.length > 0 ? usersFromNestedOrSource : legacyIds

  const fieldIds = toFieldIds(
    nested?.fieldIds ??
      nested?.fields ??
      source.piiRedactionFieldIds ??
      source.piiFieldIds,
  )

  const enabled =
    enabledRaw === true ||
    enabledRaw === 1 ||
    String(enabledRaw || '').toLowerCase() === 'true' ||
    String(enabledRaw || '').toLowerCase() === 'yes'

  return { enabled, fieldIds, users }
}

export const folderPiiSettingsToApiPayload = (settings: FolderPiiSettings) => {
  const users = settings.users
    .filter(
      (entry) =>
        Boolean(entry.userId?.trim()) && Boolean(entry.password?.trim()),
    )
    .map((entry) => ({
      password: entry.password,
      userId: entry.userId,
    }))

  return {
    piiRedactionEnabled: Boolean(settings.enabled),
    piiRedactionFieldIds: settings.enabled ? settings.fieldIds : [],
    piiRedactionUserIds: users.map((entry) => entry.userId),
    piiRedactionUsers: users,
  }
}

export const readCachedFolderPiiSettings = (
  repositoryId: string | null | undefined,
): FolderPiiSettings | null => {
  const id = String(repositoryId || '').trim()
  if (!id || typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${id}`)
    if (!raw) return null
    return parseFolderPiiSettings(JSON.parse(raw) as Record<string, unknown>)
  } catch {
    return null
  }
}

export const writeCachedFolderPiiSettings = (
  repositoryId: string | null | undefined,
  settings: FolderPiiSettings,
) => {
  const id = String(repositoryId || '').trim()
  if (!id || typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(
      `${STORAGE_PREFIX}${id}`,
      JSON.stringify(folderPiiSettingsToApiPayload(settings)),
    )
  } catch {
    // ignore quota / private mode
  }
}

/** Prefer API values; fall back to local cache when API omits the fields. */
export const resolveFolderPiiSettings = (
  repositoryId: string | null | undefined,
  apiSource?: Record<string, unknown> | null,
): FolderPiiSettings => {
  const fromApi = parseFolderPiiSettings(apiSource)
  const hasApiSignal =
    apiSource != null &&
    ('piiRedactionEnabled' in apiSource ||
      'piiEnabled' in apiSource ||
      'enablePiiRedaction' in apiSource ||
      'piiRedactionFieldIds' in apiSource ||
      'piiFieldIds' in apiSource ||
      'piiRedactionUserIds' in apiSource ||
      'piiRedactionUsers' in apiSource ||
      'piiUserIds' in apiSource ||
      'piiRedaction' in apiSource ||
      'piiSettings' in apiSource)

  if (hasApiSignal) return fromApi
  return readCachedFolderPiiSettings(repositoryId) || emptyFolderPiiSettings()
}

export const userCanToggleFolderPii = (
  settings: FolderPiiSettings,
  userId: string | null | undefined,
) => {
  if (!settings.enabled) return false
  const id = String(userId || '').trim()
  if (!id) return false
  return settings.users.some(
    (entry) =>
      String(entry.userId) === id &&
      Boolean(String(entry.password || '').trim()),
  )
}

export const verifyFolderPiiPassword = (
  settings: FolderPiiSettings,
  userId: string | null | undefined,
  password: string,
) => {
  const id = String(userId || '').trim()
  const entered = String(password || '')
  if (!id || !entered) return false
  const entry = settings.users.find((row) => String(row.userId) === id)
  if (!entry) return false
  return String(entry.password) === entered
}
