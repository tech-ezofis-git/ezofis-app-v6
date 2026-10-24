import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import formApi from '@/api/form/form'
import {
  cachedMasterCall,
  extractScalarStrings,
  fetchMasterFormColumnOptions,
  getMasterFormInfo,
} from '@/pages/requests/components/workflow-request/utils/fieldRendering'

type FormField = {
  id?: string
  jsonId?: string
  label?: string
  name?: string
}

type FormPanel = { fields?: FormField[] }

const normalizeLabel = (value: unknown) =>
  String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

const parseFormFields = (data: unknown): FormField[] => {
  const source = (data || {}) as { _json?: unknown; formJson?: unknown }
  let json = source.formJson || source._json
  if (typeof json === 'string') {
    try {
      json = JSON.parse(json)
    } catch {
      return []
    }
  }
  const panels = (json as { panels?: FormPanel[] } | null)?.panels
  return Array.isArray(panels)
    ? panels.flatMap((panel) => panel?.fields || [])
    : []
}

/**
 * Reads one column (e.g. "Budget") from the master form this workflow's
 * lookup fields use: the master row is the one matching the request's
 * current lookup values (Email, Paid Via, Code …). When a linked master
 * form has the column but this row leaves it blank (or no row matches),
 * returns `blankValue`; null only when no linked master form has the column.
 */
export const useMasterFormValue = (
  panels: FormPanel[],
  formModel: Record<string, unknown> | undefined,
  columnLabel: string,
  blankValue: null | string = null,
) => {
  // Lookup fields grouped by master form, with the request's current values.
  const lookups = useMemo(() => {
    const byForm = new Map<
      string,
      Array<{ masterColumn: string; value: unknown }>
    >()
    panels
      .flatMap((panel) => panel?.fields || [])
      .forEach((field) => {
        const { masterFormColumn, masterFormId } = getMasterFormInfo(field)
        if (!masterFormId || !masterFormColumn) return
        const value =
          formModel?.[String(field.id)] ?? formModel?.[String(field.jsonId)]
        const list = byForm.get(masterFormId) || []
        if (extractScalarStrings(value).length > 0) {
          list.push({ masterColumn: masterFormColumn, value })
        }
        byForm.set(masterFormId, list)
      })
    return Array.from(byForm, ([masterFormId, conditions]) => ({
      conditions,
      masterFormId,
    })).filter((entry) => entry.conditions.length > 0)
  }, [formModel, panels])

  const target = normalizeLabel(columnLabel)
  const { data } = useQuery({
    enabled: lookups.length > 0 && Boolean(target),
    queryKey: [
      'masterFormValue',
      target,
      blankValue,
      lookups.map((entry) => [
        entry.masterFormId,
        entry.conditions.map((c) => [
          c.masterColumn,
          extractScalarStrings(c.value),
        ]),
      ]),
    ],
    staleTime: 30_000,
    queryFn: async () => {
      let hasColumn = false
      for (const { conditions, masterFormId } of lookups) {
        const def = await cachedMasterCall('def', masterFormId, () =>
          formApi.getFormDataById(masterFormId),
        )
        const column = parseFormFields(def?.data).find(
          (field) =>
            normalizeLabel(field?.label) === target ||
            normalizeLabel(field?.name) === target,
        )
        if (!column) continue
        hasColumn = true
        const options = await fetchMasterFormColumnOptions(
          masterFormId,
          String(column.label || column.id),
          undefined,
          undefined,
          false,
          conditions,
        )
        const value = options[0]?.name
        if (value != null && String(value).trim() !== '') return String(value)
      }
      return hasColumn ? blankValue : null
    },
  })

  return data ?? null
}
