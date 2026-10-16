import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'

import {
  extractScalarStrings,
  fetchMasterFormColumnOptions,
  getFieldOptions,
  getMasterFormInfo,
} from '../utils/fieldRendering'

interface Props {
  field: any
  allFields: any[]
  formModel: Record<string, any>
  value: any
  onChange: (value: any) => void
}

/**
 * Renders nothing. For a MULTIPLE_CHOICE / MULTI_SELECT field with
 * "Pre-select from Master" enabled, looks up the master rows whose
 * source-column equals the source field's current value (e.g. the Existing
 * Product Code) and ticks the options named in the configured master column.
 *
 * Runs whenever the source value changes, including while the field is
 * read-only (the rule engine locks it for some actions but it still needs the
 * pre-selection). A value already present when the field mounts (a saved
 * entry) is left alone until the source value actually changes.
 */
const MasterPreselectSync = ({
  allFields,
  field,
  formModel,
  onChange,
  value,
}: Props) => {
  const specific = field?.settings?.specific || {}
  const sourceId = String(specific.masterPreselectSourceFieldId || '').trim()
  const targetColumn = String(specific.masterPreselectColumn || '').trim()
  const isActive =
    Boolean(specific.masterPreselectEnabled) &&
    Boolean(sourceId) &&
    Boolean(targetColumn)

  const sourceField = sourceId
    ? allFields.find((f: any) => f.id === sourceId || f.jsonId === sourceId)
    : undefined
  const sourceInfo = sourceField ? getMasterFormInfo(sourceField) : undefined
  const sourceValue = sourceField ? formModel?.[sourceField.id] : undefined
  const sourceKey = extractScalarStrings(sourceValue)[0] ?? ''

  const { data: masterValues } = useQuery({
    enabled:
      isActive &&
      Boolean(sourceKey) &&
      Boolean(sourceInfo?.masterFormId && sourceInfo?.masterFormColumn),
    queryKey: [
      'masterPreselect',
      sourceInfo?.masterFormId,
      sourceInfo?.masterFormColumn,
      targetColumn,
      sourceKey,
    ],
    queryFn: async () => {
      const opts = await fetchMasterFormColumnOptions(
        sourceInfo!.masterFormId,
        targetColumn,
        undefined,
        undefined,
        false,
        [{ masterColumn: sourceInfo!.masterFormColumn, value: sourceValue }],
      )
      return opts.map((o) => String(o.name ?? o.id))
    },
  })

  // Last source value we've reacted to; undefined until the first run.
  const handledKey = useRef<string | undefined>(undefined)
  const valueRef = useRef(value)
  valueRef.current = value

  useEffect(() => {
    if (!isActive) return

    const hasValue = Array.isArray(valueRef.current)
      ? valueRef.current.length > 0
      : Boolean(valueRef.current)

    if (!sourceKey) {
      // Source cleared by the user -> clear what we pre-selected.
      if (handledKey.current) onChange([])
      handledKey.current = ''
      return
    }
    if (masterValues === undefined) return

    // Saved entry opened: keep its stored selection.
    if (handledKey.current === undefined && hasValue) {
      handledKey.current = sourceKey
      return
    }
    if (handledKey.current === sourceKey) return
    handledKey.current = sourceKey

    const optionNames = getFieldOptions(field).map((o) => String(o.name))
    const wanted = new Set(masterValues.map((v) => v.trim().toLowerCase()))
    onChange(optionNames.filter((n) => wanted.has(n.trim().toLowerCase())))
  }, [isActive, sourceKey, masterValues, field, onChange])

  return null
}

export default MasterPreselectSync
