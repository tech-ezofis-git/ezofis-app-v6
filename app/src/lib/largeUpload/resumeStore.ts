/**
 * Remembers unfinished large uploads in this browser, so picking the same file again (after a refresh,
 * a crash or a lost connection) continues from the chunks already stored instead of starting over.
 * Only ids are kept here — the file itself always comes from the user's disk.
 */
const STORAGE_KEY = 'ezofis.largeUploads.v1'
const MAX_AGE_MS = 6 * 24 * 60 * 60 * 1000 // server cleans unfinished uploads after 7 days

type ResumeMap = Record<string, ResumeRecord>

interface ResumeRecord {
  fileId: string
  repositoryId: string
  savedAt: number
}

export const fileFingerprint = (file: File, repositoryId: string) =>
  [repositoryId, file.name, file.size, file.lastModified].join('|')

const read = (): ResumeMap => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as ResumeMap
    const now = Date.now()
    return Object.fromEntries(
      Object.entries(parsed).filter(
        ([, record]) => record && now - record.savedAt < MAX_AGE_MS,
      ),
    )
  } catch {
    return {}
  }
}

const write = (map: ResumeMap) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    // Storage blocked or full: resume is a convenience, uploads still work.
  }
}

export const getResumeRecord = (fingerprint: string) =>
  read()[fingerprint] ?? null

export const saveResumeRecord = (
  fingerprint: string,
  record: Omit<ResumeRecord, 'savedAt'>,
) => {
  const map = read()
  map[fingerprint] = { ...record, savedAt: Date.now() }
  write(map)
}

export const clearResumeRecord = (fingerprint: string) => {
  const map = read()
  if (!(fingerprint in map)) return
  delete map[fingerprint]
  write(map)
}
