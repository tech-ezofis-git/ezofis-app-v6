/**
 * Stage "Security & Form Access" settings from the workflow builder
 * (Manual User → Security tab): which form fields the acting user may see
 * and edit at the current step. Shared by the request form and agent tabs.
 */
export type FormAccessMode = 'ALL' | 'CUSTOM' | 'NONE'

type AccessRule = {
  formFields?: unknown[]
  userId?: unknown
  visibilityMode?: unknown
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StageSettings = Record<string, any>

export const formAccessMode = (value: unknown): FormAccessMode => {
  const raw =
    typeof value === 'string' || typeof value === 'number' ? value : 'ALL'
  const access = String(raw).toUpperCase()
  if (access === 'NONE') return 'NONE'
  if (access === 'CUSTOM') return 'CUSTOM'
  // ALL, FULL (legacy dummy/imported workflows), and unknown values.
  return 'ALL'
}

const assignedUserIds = (settings: StageSettings) => {
  const ids = new Set<string>()
  const add = (value: unknown) => {
    const id =
      value && typeof value === 'object'
        ? (value as { id?: unknown }).id
        : value
    if (id != null && String(id).trim()) ids.add(String(id))
  }
  if (Array.isArray(settings.users)) settings.users.forEach(add)
  if (Array.isArray(settings.selectedUsers)) settings.selectedUsers.forEach(add)
  return ids
}

/**
 * The rule for this user: their own rule, else a rule with no user, else the
 * only rule of a single-user step. Never another user's rule.
 */
export const findStageAccessRule = (
  rules: unknown,
  settings: StageSettings,
  userId: string,
): AccessRule | null => {
  const list = (Array.isArray(rules) ? rules : []) as AccessRule[]
  const own = list.find((rule) => String(rule?.userId ?? '') === userId)
  if (own) return own
  const shared = list.find((rule) => !String(rule?.userId ?? '').trim())
  if (shared) return shared
  if (list.length === 1 && assignedUserIds(settings).size <= 1) return list[0]
  return null
}

const ruleFieldIds = (rule: AccessRule | null) =>
  new Set((rule?.formFields || []).map((id) => String(id)))

/** Field ids hidden from this user; undefined = nothing hidden by the stage. */
export const getStageHiddenFieldIds = (
  settings: StageSettings,
  allFieldIds: string[],
  userId: string,
): Set<string> | undefined => {
  const access = formAccessMode(settings.formVisibilityAccess)
  if (access === 'ALL') return undefined
  if (access === 'NONE') return new Set(allFieldIds)
  const rule = findStageAccessRule(
    settings.formSecureControls,
    settings,
    userId,
  )
  // No rule for this user under CUSTOM: keep fields visible rather than
  // hiding fields nobody configured for them.
  if (!rule) return undefined
  const selected = ruleFieldIds(rule)
  const mode = String(rule.visibilityMode || 'HIDE').toUpperCase()
  return mode === 'SHOW'
    ? new Set(allFieldIds.filter((id) => !selected.has(id)))
    : selected
}

/**
 * Field ids this user may see but not edit at this stage; undefined = the
 * stage adds no restriction. The form's own read-only settings still apply
 * on top of this.
 */
export const getStageReadOnlyFieldIds = (
  settings: StageSettings,
  allFieldIds: string[],
  userId: string,
  alwaysLockedIds: Set<string> = new Set(),
): Set<string> | undefined => {
  const access = formAccessMode(settings.formEditAccess)
  let base: Set<string> | undefined
  if (access === 'NONE') {
    base = new Set(allFieldIds)
  } else if (access === 'CUSTOM') {
    const rule = findStageAccessRule(
      settings.formEditControls,
      settings,
      userId,
    )
    // CUSTOM lists who may edit what; a user without a rule edits nothing.
    const editable = ruleFieldIds(rule)
    base = new Set(allFieldIds.filter((id) => !editable.has(id)))
  }
  if (alwaysLockedIds.size === 0) return base
  return new Set([...(base || []), ...alwaysLockedIds])
}
