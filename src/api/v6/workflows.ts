import authUserStore from '../../stores/authUserStore'
import { axiosV6 } from '../axios'

export interface WorkflowBrowseCluster {
  key: string
  value: WorkflowBrowseItem[]
}

export interface WorkflowBrowseFilter {
  condition: string
  criteria: string
  value: string
}

export interface WorkflowBrowseFilterGroup {
  filters: WorkflowBrowseFilter[]
  groupCondition: string
}

export interface WorkflowBrowseItem {
  createdAt: string
  createdBy: string
  description: string
  flowStatus: string
  id: string
  modifiedAt: string | null
  modifiedBy: string | null
  name: string
}

export interface WorkflowBrowseMeta {
  currentPage: number
  itemsPerPage: number
  totalItems: number
}

export interface WorkflowBrowsePayload {
  currentPage: number
  filterBy: WorkflowBrowseFilterGroup[]
  groupBy: string
  hasReport: boolean
  hasSecurity: boolean
  itemsPerPage: number
  mode: string
  sortBy: {
    criteria: string
    order: string
  }
}

export interface WorkflowBrowseResponse {
  data: WorkflowBrowseCluster[]
  meta: WorkflowBrowseMeta
}

/** Normalized row shape used by the workflows table columns. */
export type WorkflowTableRow = WorkflowBrowseItem & {
  flowstatus: string
}

export const mapWorkflowBrowseItem = (
  item: WorkflowBrowseItem,
  groupKey?: string,
): WorkflowTableRow => ({
  ...item,
  flowstatus: item.flowStatus || groupKey || '',
})

export interface WorkflowOptionItem {
  disabled: boolean
  id: string
  name: string
}

export const createPublishedWorkflowBrowsePayload = (
  overrides?: Partial<WorkflowBrowsePayload>,
): WorkflowBrowsePayload => ({
  currentPage: 1,
  filterBy: [
    {
      filters: [
        {
          condition: 'IS_EQUALS_TO',
          criteria: 'flowStatus',
          value: 'PUBLISHED',
        },
      ],
      groupCondition: '',
    },
  ],
  groupBy: '',
  hasReport: true,
  hasSecurity: true,
  itemsPerPage: 100,
  mode: 'BROWSE',
  sortBy: { criteria: 'name', order: 'ASC' },
  ...overrides,
})

export const mapPublishedBrowseResponseToOptions = (
  response: WorkflowBrowseResponse | null,
): WorkflowOptionItem[] => {
  if (!response?.data?.length) return []

  const items = response.data.flatMap((cluster) => cluster.value ?? [])

  return items.map((workflow) => ({
    disabled: false,
    id: workflow.id,
    name: workflow.name || 'Untitled Workflow',
  }))
}

/** Published workflow status from GET /workflows (0 = draft, 1 = published). */
export const WORKFLOW_STATUS_PUBLISHED = 1

export interface V6WorkflowListItem {
  createdAtUtc: string
  description: string
  id: string
  name: string
  status: number
  triggerType: number
  version: number
}

export interface V6WorkflowListResponse {
  items: V6WorkflowListItem[]
}

export const mapPublishedWorkflowListToOptions = (
  response: V6WorkflowListResponse | null,
): WorkflowOptionItem[] =>
  (response?.items ?? [])
    .filter((workflow) => workflow.status === WORKFLOW_STATUS_PUBLISHED)
    .map((workflow) => ({
      disabled: false,
      id: workflow.id,
      name: workflow.name || 'Untitled Workflow',
    }))

export interface V6WorkflowDetail {
  flowJson?: string
  workflowJson?: string
  formJson?: string
  id?: string
  name?: string
  wFormId?: string | number
  settings?: {
    general?: {
      initiateUsing?: { formId?: string | number }
      name?: string
    }
  }
}

const getTenantHeaders = () => {
  const store = authUserStore.getState()
  const tenantId = store.session?.tenantId || ''
  return { 'X-Tenant-Id': tenantId }
}

const getAllWorkflows = async (payload: WorkflowBrowsePayload) => {
  const response: { data: WorkflowBrowseResponse | null; error: string } = {
    data: null,
    error: '',
  }
  try {
    const { data, status } = await axiosV6({
      data: JSON.stringify(payload),
      headers: getTenantHeaders(),
      method: 'POST',
      url: '/workflow/all',
    })
    if (status !== 200) throw new Error('invalid status code')
    response.data = data as WorkflowBrowseResponse
  } catch (e: unknown) {
    console.error(e)
    const err = e as { response?: { data?: string } }
    response.error = err?.response?.data || 'error fetching workflows'
  }
  return response
}

const getWorkflows = async () => {
  const response: { data: V6WorkflowListResponse | null; error: string } = {
    data: null,
    error: '',
  }
  try {
    const { data, status } = await axiosV6({
      headers: getTenantHeaders(),
      method: 'GET',
      url: '/workflows',
    })
    if (status !== 200) throw new Error('invalid status code')
    response.data = data as V6WorkflowListResponse
  } catch (e: unknown) {
    console.error(e)
    const err = e as { response?: { data?: string } }
    response.error = err?.response?.data || 'error fetching workflows'
  }
  return response
}

const getWorkflowById = async (workflowId: string) => {
  const response: { data: V6WorkflowDetail | null; error: string } = {
    data: null,
    error: '',
  }
  try {
    const { data, status } = await axiosV6({
      headers: getTenantHeaders(),
      method: 'GET',
      url: `/workflows/${workflowId}`,
    })
    if (status !== 200) throw new Error('invalid status code')
    response.data = data as V6WorkflowDetail
  } catch (e: unknown) {
    console.error(e)
    const err = e as { response?: { data?: string } }
    response.error = err?.response?.data || 'error fetching workflow'
  }
  return response
}

export const workflowsApiV6 = {
  getAllWorkflows,
  getWorkflowById,
  getWorkflows,
}

export default workflowsApiV6
