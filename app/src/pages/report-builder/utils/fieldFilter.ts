/**
 * Set of field types that are purely visual/structural design elements
 * rather than interactive data input controls.
 */
export const DESIGN_FIELD_TYPES = new Set([
  'DIVIDER',
  'LABEL',
  'HEADING',
  'PARAGRAPH',
  'SPACER',
  'SEPARATOR',
  'SECTION',
  'SECTION_HEADER',
  'STATIC_TEXT',
])

/**
 * Returns true if a field is a decorative/design element (e.g., divider, label, heading)
 * and should not appear as an input control column in reports.
 */
export const isDesignField = (field: any): boolean => {
  if (!field) return true

  if (field.isDesign || field.isDecorative) return true

  const rawType = String(
    field.type || field.control || field.controlType || field.dataType || '',
  )
    .toUpperCase()
    .trim()

  if (DESIGN_FIELD_TYPES.has(rawType)) return true

  if (
    rawType.includes('DIVIDER') ||
    rawType.includes('HEADING') ||
    rawType.includes('PARAGRAPH') ||
    rawType === 'LABEL' ||
    rawType.endsWith('_LABEL')
  ) {
    return true
  }

  // Fallback: If type is missing, check label heuristics
  if (!rawType) {
    const label = String(field.label || field.name || '')
      .trim()
      .toLowerCase()
    if (
      label === 'divider' ||
      label.startsWith('divider ') ||
      label.startsWith('divider(') ||
      label === 'label' ||
      label === 'heading' ||
      label === 'spacer' ||
      label === 'separator'
    ) {
      return true
    }
  }

  return false
}

/**
 * Returns true if the field is a valid input control for reporting.
 */
export const isInputControlField = (field: any): boolean => {
  return Boolean(field && field.id) && !isDesignField(field)
}
