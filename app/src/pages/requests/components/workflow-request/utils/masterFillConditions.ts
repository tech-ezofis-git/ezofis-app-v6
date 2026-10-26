import { getMasterFormInfo } from './fieldRendering'

export type MasterFillCondition = { masterColumn: string; value: unknown }

type FillField = {
  id?: string
  jsonId?: string
  label?: string
  name?: string
  settings?: {
    specific?: {
      fillValueType?: string
      masterFormConditionColumn?: Array<{
        formColumn?: string
        formField?: string
        masterColumn?: string
      }>
      masterFormParentColumn?: string
    }
  }
}

/** A field's value in formModel by its id, jsonId, or label. */
export const getFieldValueFromModel = (
  fieldKey: string,
  allFields: FillField[],
  formModel: Record<string, unknown> | undefined,
) => {
  if (!fieldKey || !formModel) return undefined
  if (formModel[fieldKey] !== undefined) return formModel[fieldKey]

  const target = String(fieldKey).trim().toLowerCase()
  const matched = allFields.find(
    (f) =>
      f.id === fieldKey ||
      f.jsonId === fieldKey ||
      f.label?.trim().toLowerCase() === target ||
      f.name?.trim().toLowerCase() === target,
  )
  if (matched) {
    return (
      formModel[String(matched.id)] ??
      (matched.jsonId ? formModel[matched.jsonId] : undefined)
    )
  }
  return undefined
}

/** The parent ("sync") control of a "Use values from a master table" field. */
export const getMasterFillParentField = (
  field: FillField,
  allFields: FillField[],
) => {
  const parentId = String(
    field?.settings?.specific?.masterFormParentColumn || '',
  ).trim()
  if (!parentId) return undefined
  return allFields.find(
    (f) =>
      f.id === parentId ||
      f.jsonId === parentId ||
      f.label?.trim().toLowerCase() === parentId.toLowerCase(),
  )
}

/** True for a field set to "Use values from a master table" with a parent. */
export const isMasterFillField = (field: FillField) =>
  field?.settings?.specific?.fillValueType === 'MASTER' &&
  Boolean(getMasterFormInfo(field).masterFormId) &&
  Boolean(String(field?.settings?.specific?.masterFormParentColumn || ''))

/**
 * The master-row conditions a "Use values from a master table" field syncs
 * on: its parent (sync) control's value, the parent's condition mappings
 * (e.g. Email -> Vendor Email), then the field's own condition mappings.
 */
export const buildMasterFillConditions = (
  field: FillField,
  allFields: FillField[],
  formModel: Record<string, unknown> | undefined,
): MasterFillCondition[] => {
  const conds: MasterFillCondition[] = []
  const seenCols = new Set<string>()
  const addCondition = (masterCol: string, val: unknown) => {
    if (!masterCol) return
    const norm = masterCol.trim().toLowerCase()
    if (seenCols.has(norm)) return
    seenCols.add(norm)
    conds.push({ masterColumn: String(masterCol), value: val })
  }

  const parentId = String(
    field?.settings?.specific?.masterFormParentColumn || '',
  ).trim()
  const parentField = getMasterFillParentField(field, allFields)
  const parentValue = parentField
    ? formModel?.[String(parentField.id)]
    : undefined
  const parentMasterColumn = parentField
    ? getMasterFormInfo(parentField).masterFormColumn ||
      parentField.label ||
      parentField.id
    : parentId

  // 1. The parent field's own selected value
  if (
    parentMasterColumn &&
    parentValue !== undefined &&
    parentValue !== null &&
    parentValue !== ''
  ) {
    addCondition(String(parentMasterColumn), parentValue)
  }

  // 2. Parent field's condition mappings (e.g. Email -> Vendor Email)
  for (const m of parentField?.settings?.specific?.masterFormConditionColumn ||
    []) {
    const srcKey = m?.formField || m?.formColumn
    if (m?.masterColumn && srcKey) {
      addCondition(
        String(m.masterColumn),
        getFieldValueFromModel(srcKey, allFields, formModel),
      )
    }
  }

  // 3. Any direct condition mappings on this field itself
  for (const m of field?.settings?.specific?.masterFormConditionColumn || []) {
    const srcKey = m?.formField || m?.formColumn
    if (m?.masterColumn && srcKey) {
      addCondition(
        String(m.masterColumn),
        getFieldValueFromModel(srcKey, allFields, formModel),
      )
    }
  }

  return conds
}
