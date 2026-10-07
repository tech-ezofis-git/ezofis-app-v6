import { t as staticT } from '@lingui/macro'

const isFilled = (value: string | number | null | undefined) =>
  Boolean(String(value ?? '').trim())

export const getMissingRequiredLabels = (
  fields: Array<{ label: string; value: string | number | null | undefined }>,
) =>
  fields.filter((field) => !isFilled(field.value)).map((field) => field.label)

export const getRequiredFieldErrorMessage = (labels: string[]) => {
  if (!labels.length) return ''

  const normalized = labels.map((l) => l.trim())
  const has = (name: string) =>
    normalized.some((l) => l.toLowerCase() === name.toLowerCase())

  if (labels.length === 2) {
    if (has('Role Name') && has('Select Users')) {
      return staticT`Please enter a role name and select at least one user.`
    }
    if (has('Group Name') && has('Group Members')) {
      return staticT`Please enter a group name and select at least one member.`
    }
    return staticT`Please complete these required fields: ${labels[0]} and ${labels[1]}.`
  }

  if (labels.length === 1) {
    const label = labels[0]
    const lower = label.trim().toLowerCase()
    if (lower === 'role name') return staticT`Please enter a role name.`
    if (lower === 'select users')
      return staticT`Please select at least one user.`
    if (lower === 'group name') return staticT`Please enter a group name.`
    if (lower === 'group members')
      return staticT`Please select at least one group member.`
    if (lower === 'groups' || lower === 'group assignment' || lower === 'select groups')
      return staticT`Please select at least one group.`
    return staticT`Please enter ${label}.`
  }

  const last = labels[labels.length - 1]
  const rest = labels.slice(0, -1).join(', ')

  return staticT`Please complete these required fields: ${rest}, and ${last}.`
}

export const getFieldRequiredError = (
  label: string,
  showErrors: boolean,
  value: string | number | null | undefined,
) => {
  if (!showErrors || isFilled(value)) return undefined

  const lower = label.trim().toLowerCase()
  if (lower === 'role name') return staticT`Please enter a role name.`
  if (lower === 'select users') return staticT`Please select at least one user.`
  if (lower === 'group name') return staticT`Please enter a group name.`
  if (lower === 'group members')
    return staticT`Please select at least one group member.`
  if (lower === 'groups' || lower === 'group assignment' || lower === 'select groups')
    return staticT`Please select at least one group.`

  return staticT`Please enter ${label}.`
}
