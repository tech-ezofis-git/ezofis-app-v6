import { axiosV6 } from '@/api/axios'
import {
  isExcludedFilterFieldDataType,
  type V6FilterField,
  type V6SearchFilterClause,
} from '@/api/v6/workflows'

/**
 * Portal access to the same filter APIs the in-app Requests page uses
 * (filter-fields, control-values, filter/search), sent with the portal's
 * tenant id like the portal's own list calls.
 */

const tenantHeaders = (tenantId?: string) =>
  tenantId ? { 'X-Tenant-Id': tenantId } : undefined

/** GET /workflows/{id}/filter-fields: the workflow's filterable fields. */
export const fetchPortalFilterFields = async (
  workflowId: string,
  tenantId?: string,
): Promise<V6FilterField[]> => {
  const { data } = await axiosV6({
    headers: tenantHeaders(tenantId),
    method: 'GET',
    skipCancellation: true,
    url: `/workflows/${workflowId}/filter-fields`,
  })
  const fields = Array.isArray(data?.fields) ? data.fields : []
  return fields.filter(
    (field: V6FilterField) =>
      field?.sqlColumnName && !isExcludedFilterFieldDataType(field.dataType),
  )
}

/** GET /workflows/{id}/control-values/{name}: values used in a field. */
export const fetchPortalControlValues = async (
  workflowId: string,
  controlName: string,
  tenantId?: string,
): Promise<string[]> => {
  const { data } = await axiosV6({
    headers: tenantHeaders(tenantId),
    method: 'GET',
    skipCancellation: true,
    url: `/workflows/${workflowId}/control-values/${encodeURIComponent(controlName)}`,
  })
  const values: unknown[] = Array.isArray(data?.values) ? data.values : []
  return Array.from(
    new Set(values.map((value) => String(value ?? '').trim()).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b))
}

const instanceIdOf = (item: Record<string, unknown>) =>
  String(
    item.workflowInstanceId ||
      item.processId ||
      item.instanceId ||
      item.id ||
      '',
  )

/** Instance ids from a (possibly grouped) search response. */
const collectInstanceIds = (node: unknown, ids: Set<string>) => {
  if (Array.isArray(node)) {
    node.forEach((child) => collectInstanceIds(child, ids))
    return
  }
  if (!node || typeof node !== 'object') return
  const record = node as Record<string, unknown>
  const nested = [record.value, record.data, record.items, record.rows].find(
    Array.isArray,
  )
  if (nested) {
    collectInstanceIds(nested, ids)
    return
  }
  const id = instanceIdOf(record)
  if (id) ids.add(id)
}

/**
 * POST /workflows/{id}/filter/search with the active filter clauses.
 * Returns the matching instance ids; the caller keeps only the user's own
 * submissions, since this search covers the whole workflow.
 */
export const searchPortalInstanceIds = async (
  workflowId: string,
  clauses: V6SearchFilterClause[],
  tenantId?: string,
): Promise<Set<string>> => {
  const { data } = await axiosV6({
    data: {
      currentPage: 1,
      filterBy: clauses,
      groupBy: '',
      itemsPerPage: 500,
      sortBy: { criteria: 'raisedAt', order: 'DESC' },
    },
    headers: tenantHeaders(tenantId),
    method: 'POST',
    skipCancellation: true,
    url: `/workflows/${workflowId}/filter/search`,
  })
  const ids = new Set<string>()
  collectInstanceIds(data?.data ?? data, ids)
  return ids
}
