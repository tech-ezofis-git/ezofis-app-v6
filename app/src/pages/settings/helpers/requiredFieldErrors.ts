import { t as staticT } from '@lingui/macro'

const isFilled = (value: string | number | null | undefined) =>
  Boolean(String(value ?? '').trim())

export const getMissingRequiredLabels = (
  fields: Array<{ label: string; value: string | number | null | undefined }>,
) =>
  fields.filter((field) => !isFilled(field.value)).map((field) => field.label)

export const getRequiredFieldErrorMessage = (labels: string[]) => {
  const validLabels = labels.map((l) => l.trim()).filter(Boolean)
  if (!validLabels.length) return staticT`Please complete all required fields.`

  const normalized = validLabels
  const has = (name: string) =>
    normalized.some((l) => l.toLowerCase() === name.toLowerCase())

  if (validLabels.length === 2) {
    if (has('Role Name') && has('Select Users')) {
      return staticT`Please enter a role name and select at least one user.`
    }
    if (has('Group Name') && has('Group Members')) {
      return staticT`Please enter a group name and select at least one member.`
    }
    if (has('First Name') && has('Last Name')) {
      return staticT`Please enter First Name and Last Name.`
    }
    return staticT`Please complete these required fields: ${validLabels[0]} and ${validLabels[1]}.`
  }

  if (validLabels.length === 1) {
    const label = validLabels[0]
    const lower = label.toLowerCase()
    if (lower === 'role name') return staticT`Please enter a role name.`
    if (lower === 'select users')
      return staticT`Please select at least one user.`
    if (lower === 'group name') return staticT`Please enter a group name.`
    if (lower === 'group members')
      return staticT`Please select at least one group member.`
    if (lower === 'groups' || lower === 'group assignment' || lower === 'select groups')
      return staticT`Please select at least one group.`
    if (lower === 'first name') return staticT`Please enter First Name.`
    if (lower === 'last name') return staticT`Please enter Last Name.`
    if (lower === 'email address' || lower === 'email')
      return staticT`Please enter Email Address.`
    if (lower === 'login type') return staticT`Please enter Login Type.`
    if (lower === 'password') return staticT`Please enter Password.`
    if (lower === 'new password') return staticT`Please enter New Password.`
    if (lower === 'role') return staticT`Please enter Role.`
    if (lower === 'mfa method') return staticT`Please select MFA Method.`
    return staticT`Please enter ${label}.`
  }

  const last = validLabels[validLabels.length - 1]
  const rest = validLabels.slice(0, -1).join(', ')

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
  if (lower === 'first name') return staticT`Please enter First Name.`
  if (lower === 'last name') return staticT`Please enter Last Name.`
  if (lower === 'email address' || lower === 'email')
    return staticT`Please enter Email Address.`
  if (lower === 'login type') return staticT`Please enter Login Type.`
  if (lower === 'password') return staticT`Please enter Password.`
  if (lower === 'new password') return staticT`Please enter New Password.`
  if (lower === 'role') return staticT`Please enter Role.`
  if (lower === 'mfa method') return staticT`Please select MFA Method.`

  return staticT`Please enter ${label}.`
}
