export type EditingRights = 'HIDDEN' | 'NORMAL' | 'READ_ONLY'

interface GeneralSettings {
  hidden?: boolean
  readOnly?: boolean
  visibility?: string
}

/**
 * Whether people can change a field, only see it, or not see it. "Locked" and
 * "hidden" are each saved in two places (`visibility`, and `readOnly` / `hidden`),
 * and the request form treats a field as locked or hidden if either one says so.
 * This reads both, so any saved form comes back as one of the three choices.
 */
export const getEditingRights = (
  general: GeneralSettings | undefined,
): EditingRights => {
  if (general?.hidden || general?.visibility === 'HIDDEN') return 'HIDDEN'
  if (
    general?.readOnly ||
    general?.visibility === 'READ_ONLY' ||
    general?.visibility === 'DISABLE'
  ) {
    return 'READ_ONLY'
  }
  return 'NORMAL'
}

/** The settings to save for a choice. Both saved places are set, so they never disagree. */
export const editingRightsPatch = (rights: string) => ({
  hidden: rights === 'HIDDEN',
  readOnly: rights === 'READ_ONLY',
  visibility: rights,
})
