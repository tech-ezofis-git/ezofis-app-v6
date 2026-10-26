import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import formApi from '@/api/form/form'
import {
  cachedMasterCall,
  extractScalarStrings,
  fetchMasterFormColumnOptions,
  getMasterFormInfo,
} from '@/pages/requests/components/workflow-request/utils/fieldRendering'
import {
  buildMasterFillConditions,
  isMasterFillField,
  type MasterFillCondition,
} from '@/pages/requests/components/workflow-request/utils/masterFillConditions'

type FormField = Parameters<typeof buildMasterFillConditions>[0]

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

type Lookup = {
  conditions: MasterFillCondition[]
  masterFormId: string
  /** The fill field's own master column (sync lookups only). */
  syncColumn?: string
}

const hasValue = (value: unknown) => extractScalarStrings(value).length > 0

/**
 * Reads one column (e.g. "Remaining Budget") from a master form linked to
 * this workflow's form.
 *
 * The row is found the way the form's own sync settings find it: each field
 * set to "Use values from a master table" names a parent (sync) control,
 * e.g. Email, plus optional condition mappings, and the master row matching
 * those values is used. A sync field whose own column is the one asked for
 * is tried first. Only when the form has no such sync on a master form with
 * that column does it fall back to matching every master-linked field's
 * value (Email, Paid Via, Code …) at once.
 *
 * Returns `blankValue` when a linked master form has the column but the
 * matching row leaves it blank (or no row matches); null when no linked
 * master form has the column.
 */
export const useMasterFormValue = (
  panels: FormPanel[],
  formModel: Record<string, unknown> | undefined,
  columnLabel: string,
  blankValue: null | string = null,
) => {
  const lookups = useMemo(() => {
    const allFields = panels.flatMap((panel) => panel?.fields || [])

    // 1. Sync settings: "Use values from a master table" fields.
    const sync: Lookup[] = []
    const seen = new Set<string>()
    allFields.filter(isMasterFillField).forEach((field) => {
      const { masterFormColumn, masterFormId } = getMasterFormInfo(field)
      const conditions = buildMasterFillConditions(field, allFields, formModel)
      if (!conditions.some((c) => hasValue(c.value))) return
      const key = `${masterFormId}|${JSON.stringify(
        conditions.map((c) => [c.masterColumn, extractScalarStrings(c.value)]),
      )}`
      if (seen.has(key)) return
      seen.add(key)
      sync.push({ conditions, masterFormId, syncColumn: masterFormColumn })
    })

    // 2. Fallback: every master-linked field's value, per master form.
    const byForm = new Map<string, MasterFillCondition[]>()
    allFields.forEach((field) => {
      const { masterFormColumn, masterFormId } = getMasterFormInfo(field)
      if (!masterFormId || !masterFormColumn) return
      const value =
        formModel?.[String(field.id)] ?? formModel?.[String(field.jsonId)]
      const list = byForm.get(masterFormId) || []
      if (hasValue(value)) list.push({ masterColumn: masterFormColumn, value })
      byForm.set(masterFormId, list)
    })
    const fallback: Lookup[] = Array.from(
      byForm,
      ([masterFormId, conditions]) => ({ conditions, masterFormId }),
    ).filter((entry) => entry.conditions.length > 0)

    return { fallback, sync }
  }, [formModel, panels])

  const target = normalizeLabel(columnLabel)
  const lookupKey = (entry: Lookup) => [
    entry.masterFormId,
    entry.syncColumn || '',
    entry.conditions.map((c) => [
      c.masterColumn,
      extractScalarStrings(c.value),
    ]),
  ]
  const { data } = useQuery({
    enabled:
      Boolean(target) && lookups.sync.length + lookups.fallback.length > 0,
    queryKey: [
      'masterFormValue',
      target,
      blankValue,
      lookups.sync.map(lookupKey),
      lookups.fallback.map(lookupKey),
    ],
    staleTime: 30_000,
    queryFn: async () => {
      const findColumn = async (masterFormId: string) => {
        const def = await cachedMasterCall('def', masterFormId, () =>
          formApi.getFormDataById(masterFormId),
        )
        const fields = parseFormFields(def?.data)
        return {
          column: fields.find(
            (field) =>
              normalizeLabel(field?.label) === target ||
              normalizeLabel(field?.name) === target,
          ),
          fields,
        }
      }
      const readValue = async (
        masterFormId: string,
        column: FormField,
        conditions: MasterFillCondition[],
      ) => {
        const options = await fetchMasterFormColumnOptions(
          masterFormId,
          String(column.label || column.id),
          undefined,
          undefined,
          false,
          conditions,
        )
        const value = options[0]?.name
        return value != null && String(value).trim() !== ''
          ? String(value)
          : null
      }

      let hasColumn = false
      const syncedForms = new Set<string>()

      // Sync lookups whose own column is the one asked for come first.
      const resolved = await Promise.all(
        lookups.sync.map(async (entry) => {
          const { column, fields } = await findColumn(entry.masterFormId)
          const syncKey = normalizeLabel(entry.syncColumn)
          const own = fields.find(
            (field) =>
              normalizeLabel(field?.id) === syncKey ||
              normalizeLabel(field?.label) === syncKey ||
              normalizeLabel(field?.name) === syncKey,
          )
          return { column, entry, isOwn: Boolean(column && own === column) }
        }),
      )
      resolved.sort((a, b) => Number(b.isOwn) - Number(a.isOwn))
      for (const { column, entry } of resolved) {
        if (!column) continue
        hasColumn = true
        syncedForms.add(entry.masterFormId)
        const value = await readValue(
          entry.masterFormId,
          column,
          entry.conditions,
        )
        if (value) return value
      }

      for (const entry of lookups.fallback) {
        if (syncedForms.has(entry.masterFormId)) continue
        const { column } = await findColumn(entry.masterFormId)
        if (!column) continue
        hasColumn = true
        const value = await readValue(
          entry.masterFormId,
          column,
          entry.conditions,
        )
        if (value) return value
      }
      return hasColumn ? blankValue : null
    },
  })

  return data ?? null
}

/**
 * Header "Budget": the master form's "Remaining Budget" column for the row
 * the form's sync settings point at (e.g. the Email control), read directly
 * from the master ("0" when blank).
 */
export const useHeaderBudget = (
  panels: FormPanel[],
  formModel: Record<string, unknown> | undefined,
) => useMasterFormValue(panels, formModel, 'Remaining Budget', '0')
