import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'

import {
  extractScalarStrings,
  fetchMasterFormColumnOptions,
  getMasterFormInfo,
} from '../utils/fieldRendering'

interface Props {
  field: any
  allFields: any[]
  formModel: Record<string, any>
  value: any
  readOnly?: boolean
  onChange: (value: any) => void
}

/**
 * Renders nothing. For a SHORT_TEXT field configured with
 * "Use values from a master table" (fillValueType === 'MASTER'), finds the
 * master row whose parent-column equals the parent field's value and writes
 * the configured column of that row into this field.
 */
const MasterFillSync = ({
  allFields,
  field,
  formModel,
  onChange,
  readOnly,
  value,
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

  const { data: fillValue } = useQuery({
    enabled: isActive && Boolean(parentKey),
    queryKey: [
      'masterFillValue',
      info.masterFormId,
      info.masterFormColumn,
      parentMasterColumn,
      parentKey,
    ],
    queryFn: async () => {
      const opts = await fetchMasterFormColumnOptions(
        info.masterFormId,
        info.masterFormColumn,
        undefined,
        undefined,
        false,
        [{ masterColumn: String(parentMasterColumn), value: parentValue }],
      )
      return opts[0]?.name ?? ''
    },
  })

  useEffect(() => {
    if (!isActive || readOnly) return
    if (!parentKey) {
      if (value) onChange('')
      return
    }
    if (fillValue !== undefined && fillValue !== (value ?? '')) {
      onChange(fillValue)
    }
  }, [isActive, parentKey, fillValue, readOnly, value, onChange])

  return null
}

export default MasterFillSync
