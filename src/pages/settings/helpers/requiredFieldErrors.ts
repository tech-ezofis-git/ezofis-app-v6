const isFilled = (value: string | number | null | undefined) =>
  Boolean(String(value ?? '').trim())

export const getMissingRequiredLabels = (
  fields: Array<{ label: string; value: string | number | null | undefined }>,
) =>
  fields
    .filter((field) => !isFilled(field.value))
    .map((field) => field.label)

export const getRequiredFieldErrorMessage = (labels: string[]) => {
  if (!labels.length) return ''

  if (labels.length === 1) {
    return `Please fill the required field: ${labels[0]}`
  }

  if (labels.length === 2) {
    return `Please fill the required fields: ${labels[0]} and ${labels[1]}`
  }

  const last = labels[labels.length - 1]
  const rest = labels.slice(0, -1).join(', ')

  return `Please fill the required fields: ${rest}, and ${last}`
}

export const getFieldRequiredError = (
  label: string,
  showErrors: boolean,
  value: string | number | null | undefined,
) =>
  showErrors && !isFilled(value)
    ? `Please fill the required field: ${label}`
    : undefined
