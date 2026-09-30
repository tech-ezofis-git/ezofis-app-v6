import { queryOptions } from '@tanstack/react-query'
import type { Question } from '@/pages/form-builder/store/formStore'
import formApi from './form'

export const formQueries = {
  all: () => ['forms'] as const,
  detail: (id: string) => [...formQueries.all(), 'detail', id] as const,
  list: (
    page: number,
    size: number,
    groupBy: string = 'type',
    filterBy: any[] = [],
  ) =>
    [...formQueries.all(), 'list', { filterBy, groupBy, page, size }] as const,
}

export const getFormsListQueryOptions = (
  page: number = 1,
  size: number = 100,
  groupBy: string = 'type',
  filterBy: any[] = [],
) => {
  return queryOptions({
    queryKey: formQueries.list(page, size, groupBy, filterBy),
    queryFn: () => formApi.listAllForms(page, size, groupBy, filterBy),
  })
}

export const getMasterFormsQueryOptions = () => {
  const payload = {
    currentPage: 1,
    filterBy: [
      {
        filters: [
          {
            condition: 'IS_EQUALS_TO',
            criteria: 'type',
            dataType: '',
            value: 'MASTER',
          },
          {
            condition: 'IS_EQUALS_TO',
            criteria: 'publishOption',
            dataType: '',
            value: 'PUBLISHED',
          },
        ],
        groupCondition: '',
      },
    ],
    groupBy: '',
    hasSecurity: false,
    itemsPerPage: 500,
    mode: 'BROWSE',
    sortBy: { criteria: '', order: 'DESC' },
  }

  return queryOptions({
    queryKey: [...formQueries.all(), 'master-forms'] as const,
    queryFn: async () => {
      const { data, error } = await formApi.getForms(payload)
      if (error) throw new Error(error)

      // A more robust data extraction helper to handle grouped or flat responses
      const extractData = (obj: any): any[] => {
        if (!obj) return []
        // If it's already an array, return it
        if (Array.isArray(obj)) return obj
        // Check for standard wrapper patterns
        const inner = obj.data || obj.value
        if (Array.isArray(inner)) {
          // If first item looks like a group { key, value }, extract first group's value
          if (
            inner.length > 0 &&
            inner[0]?.value &&
            Array.isArray(inner[0].value)
          ) {
            return inner[0].value
          }
          return inner
        }
        // Recurse if needed
        if (typeof obj === 'object') {
          for (const key in obj) {
            const result = extractData(obj[key])
            if (result.length > 0) return result
          }
        }
        return []
      }

      const forms = extractData(data)

      return forms.map((f: any) => ({
        formId: f.formId ?? f.id ?? f.uid,
        // Prefer numeric/form id — this is what workflow apAgent.formId stores
        id: f.id ?? f.formId ?? f.uid ?? String(Math.random()),
        name: f.name || f.label || f.title || 'Untitled Form',
        uid: f.uid ?? f.formId ?? f.id,
      }))
    },
  })
}

/**
 * Generic query to fetch published forms of a specific type (MASTER, WORKFLOW, etc.)
 * Returns a list of options { id, name }
 */
export const getPublishedFormsByType = (
  type: 'MASTER' | 'WORKFLOW' | 'FEEDBACK',
) => {
  const payload = {
    currentPage: 1,
    filterBy: [
      {
        filters: [
          {
            condition: 'IS_EQUALS_TO',
            criteria: 'type',
            dataType: '',
            value: type,
          },
          {
            condition: 'IS_EQUALS_TO',
            criteria: 'publishOption',
            dataType: '',
            value: 'PUBLISHED',
          },
        ],
        groupCondition: '',
      },
    ],
    groupBy: '',
    hasSecurity: false,
    itemsPerPage: 500,
    mode: 'BROWSE',
    sortBy: { criteria: '', order: 'DESC' },
  }

  return queryOptions({
    queryKey: [...formQueries.all(), 'published-forms', type] as const,
    queryFn: async () => {
      const { data, error } = await formApi.getForms(payload)
      if (error) throw new Error(error)

      const extractData = (obj: any): any[] => {
        if (!obj) return []
        if (Array.isArray(obj)) return obj
        const inner = obj.data || obj.value
        if (Array.isArray(inner)) {
          if (
            inner.length > 0 &&
            inner[0]?.value &&
            Array.isArray(inner[0].value)
          ) {
            return inner[0].value
          }
          return inner
        }
        if (typeof obj === 'object') {
          for (const key in obj) {
            const result = extractData(obj[key])
            if (result.length > 0) return result
          }
        }
        return []
      }

      const forms = extractData(data)
      return forms.map((f: any) => ({
        formId: f.formId ?? f.id ?? f.uid,
        id: f.id ?? f.formId ?? f.uid ?? String(Math.random()),
        name: f.name || f.label || f.title || 'Untitled Form',
        uid: f.uid ?? f.formId ?? f.id,
      }))
    },
  })
}

export const getWorkflowFormsQueryOptions = () =>
  getPublishedFormsByType('WORKFLOW')

/**
 * Fetches a single form's schema and flattens it to the list of fields
 * (Question[]) across all panels — used by Report Builder to derive the
 * available fields for a selected source form.
 */
export const getFormFieldsQueryOptions = (formId: string) =>
  queryOptions({
    enabled: Boolean(formId),
    queryKey: [...formQueries.detail(formId), 'fields'] as const,
    queryFn: async () => {
      const { data, error } = await formApi.getFormDataById(formId)
      if (error) throw new Error(error)
      const panels: Array<{ fields?: Question[] }> =
        data?.formJson?.panels ?? []
      return panels.flatMap((p) => p.fields ?? [])
    },
  })
