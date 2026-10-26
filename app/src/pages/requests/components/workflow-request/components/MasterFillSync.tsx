import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useRef } from 'react'
import {
  extractScalarStrings,
  fetchMasterFormColumnOptions,
  getMasterFormInfo,
} from '../utils/fieldRendering'
import { buildMasterFillConditions } from '../utils/masterFillConditions'

interface Props {
  allFields: any[]
  field: any
  formModel: Record<string, any>
  value: any
  readOnly?: boolean
  onChange: (value: any) => void
  // Reports while the master value is being fetched, so the input can show
  // its loader.
  onLoadingChange?: (loading: boolean) => void
}

/**
 * Renders nothing. For a SHORT_TEXT / NUMBER / DATE / DATE_TIME field
 * configured with "Use values from a master table" (fillValueType ===
 * 'MASTER'), finds the master row whose parent-column equals the parent
 * field's value and writes the configured column of that row into this field.
 * With "Use values from another field" (fillValueType ===
 * 'ASSIGN_PARENT_FIELD') it mirrors that field's value instead.
 */
const MasterFillSync = ({
  allFields,
  field,
  formModel,
  readOnly,
  value,
  onChange,
  onLoadingChange,
}: Props) => {
  const specific = field?.settings?.specific || {}
  const info = getMasterFormInfo(field)
  const parentId = String(specific.masterFormParentColumn || '').trim()
  const parentField = parentId
    ? allFields.find(
        (f: any) =>
          f.id === parentId ||
          f.jsonId === parentId ||
          f.label?.trim().toLowerCase() === parentId.toLowerCase(),
      )
    : undefined

  const isActive =
    specific.fillValueType === 'MASTER' &&
    Boolean(info.masterFormId) &&
    Boolean(parentId)

  const parentValue = parentField ? formModel?.[parentField.id] : undefined
  const parentKey = extractScalarStrings(parentValue)[0]
  const parentMasterColumn = parentField
    ? getMasterFormInfo(parentField).masterFormColumn ||
      parentField.label ||
      parentField.id
    : parentId

  // Parent (sync) control value + parent / own condition mappings
  // (e.g. Email -> Vendor Email).
  const conditions = useMemo(
    () => buildMasterFillConditions(field, allFields, formModel),
    [field, allFields, formModel],
  )

  const conditionsKey = JSON.stringify(conditions)

  // A submitted request already carries the filled value in its form data.
  // The first time a parent value and a field value show up together, treat
  // that pair as stored and only look the master up again once the parent
  // changes (or while the field is still empty, as on a new request).
  const storedParentKeyRef = useRef<string | null>(null)
  const hasValue = value !== undefined && value !== null && value !== ''
  if (storedParentKeyRef.current === null && parentKey && hasValue) {
    storedParentKeyRef.current = parentKey
  } else if (
    storedParentKeyRef.current &&
    parentKey &&
    parentKey !== storedParentKeyRef.current
  ) {
    // The parent changed after load: from now on every parent value is
    // looked up ('' never matches a real parent key).
    storedParentKeyRef.current = ''
  }
  const shouldFetch =
    isActive &&
    !readOnly &&
    Boolean(parentKey) &&
    parentKey !== storedParentKeyRef.current

  const { data: fillValue, isFetching } = useQuery({
    enabled: shouldFetch,
    queryKey: [
      'masterFillValue',
      info.masterFormId,
      info.masterFormColumn,
      parentMasterColumn,
      parentKey,
      conditionsKey,
    ],
    queryFn: async () => {
      const opts = await fetchMasterFormColumnOptions(
        info.masterFormId,
        info.masterFormColumn,
        undefined,
        undefined,
        false,
        conditions,
      )
      return opts[0]?.name ?? ''
    },
  })

  useEffect(() => {
    onLoadingChange?.(shouldFetch && isFetching)
  }, [shouldFetch, isFetching, onLoadingChange])

  useEffect(() => {
    if (!isActive || readOnly) return
    if (!parentKey) {
      if (value) onChange('')
      return
    }
    // Cached data from another request must not overwrite a stored value.
    if (!shouldFetch) return
    if (fillValue !== undefined && fillValue !== (value ?? '')) {
      onChange(fillValue)
    }
  }, [isActive, parentKey, fillValue, readOnly, shouldFetch, value, onChange])

  // "Use values from another field": mirror the chosen field's value.
  const copyParentId = String(specific.parentFieldId || '').trim()
  const isParentCopy =
    specific.fillValueType === 'ASSIGN_PARENT_FIELD' && Boolean(copyParentId)
  const copySource = isParentCopy
    ? allFields.find(
        (f: any) => f.id === copyParentId || f.jsonId === copyParentId,
      )
    : undefined
  const copyValue = copySource
    ? (extractScalarStrings(formModel?.[copySource.id])[0] ?? '')
    : ''

  useEffect(() => {
    if (!isParentCopy || readOnly || !copySource) return
    if (String(copyValue) !== String(value ?? '')) onChange(copyValue)
  }, [isParentCopy, copySource, copyValue, readOnly, value, onChange])

  return null
}

export default MasterFillSync
