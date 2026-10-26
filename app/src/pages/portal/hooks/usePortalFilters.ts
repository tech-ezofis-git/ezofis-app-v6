import { useQuery } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import type { V6FilterField } from '@/api/v6/workflows'
import { buildV6FilterClauses } from '@/pages/requests/utils/requestFilterMapper'
import {
  fetchPortalControlValues,
  fetchPortalFilterFields,
  searchPortalInstanceIds,
} from '../helpers/portalFilters'

export type PortalFilterField = {
  id: string
  kind: PortalFilterKind
  label: string
  name: string
}

export type PortalFilterKind = 'category' | 'date'

const toFilterField = (field: V6FilterField): PortalFilterField => {
  const type = String(field.dataType || '').toUpperCase()
  return {
    id: field.sqlColumnName,
    kind: type.includes('DATE') || type.includes('TIME') ? 'date' : 'category',
    label: field.name || field.sqlColumnName,
    name: field.name,
  }
}

/** How many fields show as chips before the rest move behind "+". */
const DEFAULT_CHIP_COUNT = 2

/**
 * Filter state for the portal request list, following the in-app Requests
 * page: fields come from the workflow's filter-fields API, options from
 * control-values, and the active filters are turned into the same search
 * clauses (buildV6FilterClauses) and run on the server.
 */
export const usePortalFilters = (workflowId?: string, tenantId?: string) => {
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>(
    {},
  )
  const [addedFieldIds, setAddedFieldIds] = useState<string[]>([])

  const fieldsQuery = useQuery({
    enabled: Boolean(workflowId),
    queryKey: ['portal-filter-fields', workflowId, tenantId],
    staleTime: 5 * 60_000,
    queryFn: () => fetchPortalFilterFields(String(workflowId), tenantId),
  })
  const schemaFields = useMemo(() => fieldsQuery.data || [], [fieldsQuery.data])
  const fields = useMemo(() => schemaFields.map(toFilterField), [schemaFields])

  const chipFields = useMemo(() => {
    const defaults = fields.slice(0, DEFAULT_CHIP_COUNT)
    const added = fields.filter(
      (field) =>
        addedFieldIds.includes(field.id) &&
        !defaults.some((item) => item.id === field.id),
    )
    // A field with an active value stays visible even if it was not added.
    const active = fields.filter(
      (field) =>
        (activeFilters[field.id]?.length || 0) > 0 &&
        !defaults.some((item) => item.id === field.id) &&
        !added.some((item) => item.id === field.id),
    )
    return [...defaults, ...added, ...active]
  }, [activeFilters, addedFieldIds, fields])

  const addableFields = useMemo(
    () =>
      fields.filter(
        (field) => !chipFields.some((chip) => chip.id === field.id),
      ),
    [chipFields, fields],
  )

  const setFieldValues = useCallback((fieldId: string, values: string[]) => {
    setActiveFilters((prev) => {
      const next = { ...prev }
      if (values.length) next[fieldId] = values
      else delete next[fieldId]
      return next
    })
  }, [])

  const addField = useCallback((fieldId: string) => {
    setAddedFieldIds((prev) =>
      prev.includes(fieldId) ? prev : [...prev, fieldId],
    )
  }, [])

  const removeField = useCallback((fieldId: string) => {
    setAddedFieldIds((prev) => prev.filter((id) => id !== fieldId))
    setActiveFilters((prev) => {
      if (!(fieldId in prev)) return prev
      const next = { ...prev }
      delete next[fieldId]
      return next
    })
  }, [])

  const clearAll = useCallback(() => setActiveFilters({}), [])

  const clauses = useMemo(
    () =>
      Object.keys(activeFilters).length
        ? buildV6FilterClauses(activeFilters, schemaFields)
        : [],
    [activeFilters, schemaFields],
  )
  const isFiltering = clauses.length > 0

  // Keyed by the clauses, so a newer selection always wins over an older
  // response still in flight.
  const matchQuery = useQuery({
    enabled: Boolean(workflowId) && isFiltering,
    queryKey: ['portal-filter-search', workflowId, tenantId, clauses],
    retry: 1,
    staleTime: 15_000,
    queryFn: () =>
      searchPortalInstanceIds(String(workflowId), clauses, tenantId),
  })

  return {
    activeFilters,
    addableFields,
    addField,
    chipFields,
    clearAll,
    fieldsError: fieldsQuery.isError,
    isFiltering,
    matchError: matchQuery.isError,
    matchIds: matchQuery.data,
    matchLoading: isFiltering && matchQuery.isFetching,
    refetchMatches: matchQuery.refetch,
    removeField,
    setFieldValues,
  }
}

/** Option values for one field (loaded when its sheet opens). */
export const usePortalFilterOptions = (
  workflowId: string | undefined,
  field: PortalFilterField | null,
  tenantId?: string,
) =>
  useQuery({
    enabled: Boolean(workflowId && field && field.kind === 'category'),
    queryKey: ['portal-control-values', workflowId, field?.name, tenantId],
    staleTime: 60_000,
    queryFn: () =>
      fetchPortalControlValues(
        String(workflowId),
        String(field?.name),
        tenantId,
      ),
  })
