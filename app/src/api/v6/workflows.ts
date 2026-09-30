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
  flowJson?: any
  formId?: string | number
  formJson?: any
  id?: string
  name?: string
  steps?: any[]
  wFormId?: string | number
  workflowJson?: any
  settings?: {
    general?: {
      initiateUsing?: { formId?: string | number }
      name?: string
      requestTabs?: { id: string; label: string }[]
    }
  }
}

const getTenantHeaders = () => {
  const store = authUserStore.getState()
  const tenantId =
    store.session?.tenantId ||
    (store.identity as { tenantId?: string } | null)?.tenantId ||
    ''
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

const startWorkflow = async (workflowId: string, formData: FormData) => {
  const response: { data: any; error: string } = { data: null, error: '' }
  try {
    const { data, status } = await axiosV6({
      data: formData,
      headers: {
        ...getTenantHeaders(),
        'accept': 'text/plain',
        'Content-Type': 'multipart/form-data',
      },
      method: 'POST',
      url: `/Workflows/${workflowId}/start`,
    })
    if (status !== 200 && status !== 201) throw new Error('invalid status code')
    response.data = data
  } catch (e: unknown) {
    console.error(e)
    const err = e as { message?: string; response?: { data?: string } }
    response.error =
      err?.response?.data || err?.message || 'error starting workflow'
  }
  return response
}

export interface StartWorkflowJsonPayload {
  context?: string
  envType?: string
  formData?: Record<string, any>
  stagedFiles?: {
    fieldId?: string
    fieldName?: string
    fileId: string
    fileName?: string
    jsonId?: string
    repositoryId: string
  }[]
}

// Preferred start endpoint for normal (non-AP-Agent) workflows — see the
// "Normal Workflow — Frontend Integration Guide" (PR #40, Aug 2026).
// formData is a flat object keyed by field jsonId; uploaded files go in
// stagedFiles (via uploadAndIndex.uploadWithOcr), not in formData.
const startWorkflowJson = async (
  workflowId: string,
  payload: StartWorkflowJsonPayload,
) => {
  const response: { data: any; error: string } = { data: null, error: '' }
  try {
    const { data, status } = await axiosV6({
      data: payload,
      headers: getTenantHeaders(),
      method: 'POST',
      url: `/Workflows/${workflowId}/start/json`,
    })
    if (status !== 200 && status !== 201) throw new Error('invalid status code')
    response.data = data
  } catch (e: unknown) {
    console.error(e)
    const err = e as { message?: string; response?: { data?: string } }
    response.error =
      err?.response?.data || err?.message || 'error starting workflow'
  }
  return response
}

const raiseTicket = async (workflowId: string, payload: any) => {
  const response: { data: any; error: string } = { data: null, error: '' }
  try {
    const { data, status } = await axiosV6({
      data: payload,
      headers: getTenantHeaders(),
      method: 'POST',
      url: `/workflows/${workflowId}/raise-ticket`,
    })
    if (status !== 200 && status !== 201) throw new Error('invalid status code')
    response.data = data
  } catch (e: unknown) {
    console.error(e)
    const err = e as { message?: string; response?: { data?: string } }
    response.error =
      err?.response?.data || err?.message || 'error raising ticket'
  }
  return response
}

const updateWorkflow = async (workflowId: string, payload: any) => {
  const response: { data: any; error: string } = {
    data: null,
    error: '',
  }
  try {
    const { data, status } = await axiosV6({
      data: payload,
      headers: getTenantHeaders(),
      method: 'PUT',
      url: `/workflows/${workflowId}`,
    })
    if (![200, 201, 202, 204].includes(status))
      throw new Error('invalid status code')
    response.data = data
  } catch (e: unknown) {
    console.error(e)
    const err = e as { response?: { data?: string } }
    response.error = err?.response?.data || 'error updating workflow'
  }
  return response
}

const createWorkflow = async (payload: any) => {
  const response: { data: any; error: string } = {
    data: null,
    error: '',
  }
  try {
    const { data, status } = await axiosV6({
      data: payload,
      headers: getTenantHeaders(),
      method: 'POST',
      url: '/workflows',
    })
    if (![200, 201, 202, 204].includes(status))
      throw new Error('invalid status code')
    response.data = data
  } catch (e: unknown) {
    console.error(e)
    const err = e as { response?: { data?: string } }
    response.error = err?.response?.data || 'error creating workflow'
  }
  return response
}

const getInboxList = async (
  workflowId: string,
  pageNumber: number,
  pageSize: number,
  instanceId?: string,
  transactionId?: string,
) => {
  const response: { data: any; error: string } = { data: null, error: '' }
  try {
    const { data, status } = await axiosV6({
      headers: getTenantHeaders(),
      method: 'GET',
      params: {
        pageNumber,
        pageSize,
        skipTotal: false,
        workflowId,
        ...(instanceId ? { instanceId } : {}),
        ...(transactionId ? { transactionId } : {}),
      },
      url: `/Workflows/inbox`,
    })
    if (status !== 200) throw new Error('invalid status code')
    response.data = data
  } catch (e: unknown) {
    console.error(e)
    const err = e as { message?: string; response?: { data?: string } }
    response.error =
      err?.response?.data || err?.message || 'error fetching inbox list'
  }
  return response
}

const getSentList = async (
  workflowId: string,
  pageNumber: number,
  pageSize: number,
  instanceId?: string,
  transactionId?: string,
) => {
  const response: { data: any; error: string } = { data: null, error: '' }
  try {
    const { data, status } = await axiosV6({
      headers: getTenantHeaders(),
      method: 'GET',
      params: {
        pageNumber,
        pageSize,
        skipTotal: false,
        workflowId,
        ...(instanceId ? { instanceId } : {}),
        ...(transactionId ? { transactionId } : {}),
      },
      url: `/Workflows/sent`,
    })
    if (status !== 200) throw new Error('invalid status code')
    response.data = data
  } catch (e: unknown) {
    console.error(e)
    const err = e as { message?: string; response?: { data?: string } }
    response.error =
      err?.response?.data || err?.message || 'error fetching sent list'
  }
  return response
}

const getCompletedList = async (
  workflowId: string,
  pageNumber: number,
  pageSize: number,
  instanceId?: string,
  transactionId?: string,
) => {
  const response: { data: any; error: string } = { data: null, error: '' }
  try {
    const { data, status } = await axiosV6({
      headers: getTenantHeaders(),
      method: 'GET',
      params: {
        pageNumber,
        pageSize,
        skipTotal: false,
        workflowId,
        ...(instanceId ? { instanceId } : {}),
        ...(transactionId ? { transactionId } : {}),
      },
      url: `/Workflows/completed`,
    })
    if (status !== 200) throw new Error('invalid status code')
    response.data = data
  } catch (e: unknown) {
    console.error(e)
    const err = e as { message?: string; response?: { data?: string } }
    response.error =
      err?.response?.data || err?.message || 'error fetching completed list'
  }
  return response
}

export interface V6WorkflowInstanceCount {
  completedCount: number
  completedTableExists: boolean
  inboxCount: number
  inboxTableExists: boolean
  sentCount: number
  sentTableExists: boolean
  workflowId: string
}

const getInstanceCount = async (workflowId: string) => {
  const response: { data: V6WorkflowInstanceCount | null; error: string } = {
    data: null,
    error: '',
  }
  try {
    const { data, status } = await axiosV6({
      headers: getTenantHeaders(),
      method: 'GET',
      params: { workflowId },
      url: `/Workflows/instance-count`,
    })
    if (status !== 200) throw new Error('invalid status code')
    response.data = data as V6WorkflowInstanceCount
  } catch (e: unknown) {
    console.error(e)
    const err = e as { message?: string; response?: { data?: string } }
    response.error =
      err?.response?.data || err?.message || 'error fetching instance count'
  }
  return response
}

const deleteWorkflow = async (workflowId: string) => {
  const response: { data: any; error: string } = {
    data: null,
    error: '',
  }
  try {
    const { data, status } = await axiosV6({
      headers: getTenantHeaders(),
      method: 'DELETE',
      url: `/workflows/${workflowId}`,
    })
    if (![200, 202, 204].includes(status))
      throw new Error('invalid status code')
    response.data = data
  } catch (e: unknown) {
    console.error(e)
    const err = e as { response?: { data?: string } }
    response.error = err?.response?.data || 'error deleting workflow'
  }
  return response
}

const moveNext = async (instanceId: string, payload: any) => {
  const response: { data: any; error: string } = { data: null, error: '' }
  try {
    const { data, status } = await axiosV6({
      data: JSON.stringify(payload),
      headers: getTenantHeaders(),
      method: 'POST',
      url: `/Workflows/instances/${instanceId}/move-next`,
    })
    if (status !== 200 && status !== 201 && status !== 204)
      throw new Error('invalid status code')
    response.data = data
  } catch (e: unknown) {
    console.error(e)
    const err = e as { message?: string; response?: { data?: string } }
    response.error =
      err?.response?.data || err?.message || 'error moving to next step'
  }
  return response
}

const getApAgentJobStatus = async (jobId: string) => {
  const response: { data: any; error: string } = { data: null, error: '' }
  try {
    const { data, status } = await axiosV6({
      headers: getTenantHeaders(),
      method: 'GET',
      url: `/Workflows/ap-agent/jobs/${jobId}`,
    })
    if (status !== 200) throw new Error('invalid status code')
    if (data && data.message === 'Linking related records') {
      data.message = 'Linking PO Records'
    }
    response.data = data
  } catch (e: unknown) {
    console.error(e)
    const err = e as { message?: string; response?: { data?: string } }
    response.error =
      err?.response?.data ||
      err?.message ||
      'error fetching ap agent job status'
  }
  return response
}

const getInstanceHistory = async (
  workflowId: number | string,
  instanceId: number | string,
) => {
  const response: { data: any; error: string } = { data: null, error: '' }
  try {
    const { data, status } = await axiosV6({
      headers: getTenantHeaders(),
      method: 'GET',
      url: `/workflows/${workflowId}/instances/${instanceId}/history`,
    })
    if (status !== 200) throw new Error('invalid status code')
    response.data = data
  } catch (e: unknown) {
    console.error(e)
    const err = e as { message?: string; response?: { data?: string } }
    response.error =
      err?.response?.data || err?.message || 'error fetching instance history'
  }
  return response
}

const getInstanceComments = async (
  workflowId: number | string,
  instanceId: number | string,
) => {
  const response: { data: any; error: string } = { data: null, error: '' }
  try {
    const { data, status } = await axiosV6({
      headers: getTenantHeaders(),
      method: 'GET',
      url: `/workflows/${workflowId}/instances/${instanceId}/comments`,
    })
    if (status !== 200) throw new Error('invalid status code')
    response.data = data
  } catch (e: unknown) {
    console.error(e)
    const err = e as { message?: string; response?: { data?: string } }
    response.error =
      err?.response?.data || err?.message || 'error fetching comments'
  }
  return response
}

const addInstanceComment = async (
  workflowId: number | string,
  instanceId: number | string,
  payload: { comments: string; showTo: number },
) => {
  const response: { data: any; error: string } = { data: null, error: '' }
  try {
    const { data, status } = await axiosV6({
      data: JSON.stringify(payload),
      headers: getTenantHeaders(),
      method: 'POST',
      url: `/workflows/${workflowId}/instances/${instanceId}/comments`,
    })
    if (status !== 200 && status !== 201 && status !== 204)
      throw new Error('invalid status code')
    response.data = data
  } catch (e: unknown) {
    console.error(e)
    const err = e as { message?: string; response?: { data?: string } }
    response.error =
      err?.response?.data || err?.message || 'error adding comment'
  }
  return response
}

const getInstanceAttachments = async (
  workflowId: number | string,
  instanceId: number | string,
) => {
  const response: { data: any; error: string } = { data: null, error: '' }
  try {
    const { data, status } = await axiosV6({
      headers: getTenantHeaders(),
      method: 'GET',
      url: `/workflows/${workflowId}/instances/${instanceId}/attachments`,
    })
    if (status !== 200) throw new Error('invalid status code')
    response.data = data
  } catch (e: unknown) {
    console.error(e)
    const err = e as { message?: string; response?: { data?: string } }
    response.error =
      err?.response?.data || err?.message || 'error fetching attachments'
  }
  return response
}

const addInstanceAttachment = async (
  workflowId: number | string,
  instanceId: number | string,
  payload:
    | FormData
    | {
        [key: string]: any
        contentType?: string
        file: string
        fileName?: string
        fileSize?: number
        repositoryId: number | string
        transactionId?: number | string
      },
) => {
  const response: { data: any; error: string } = { data: null, error: '' }
  try {
    let requestData: any
    let contentTypeHeader: string | undefined

    if (payload instanceof FormData) {
      requestData = payload
      contentTypeHeader = 'multipart/form-data'
    } else {
      const { repositoryId, ...rest } = payload
      requestData = JSON.stringify({
        ...rest,
        repositoryid: repositoryId,
      })
    }

    const { data, status } = await axiosV6({
      data: requestData,
      headers: {
        ...getTenantHeaders(),
        ...(contentTypeHeader ? { 'Content-Type': contentTypeHeader } : {}),
      },
      method: 'POST',
      url: `/workflows/${workflowId}/instances/${instanceId}/attachments`,
    })
    if (status !== 200 && status !== 201 && status !== 204)
      throw new Error('invalid status code')
    response.data = data
  } catch (e: unknown) {
    console.error(e)
    const err = e as { message?: string; response?: { data?: string } }
    response.error =
      err?.response?.data || err?.message || 'error adding attachment'
  }
  return response
}

export interface V6FilterField {
  dataType: string
  name: string
  sqlColumnName: string
  supportedOperators: string[]
}

const EXCLUDED_FILTER_FIELD_DATA_TYPES = new Set([
  'FILE_UPLOAD',
  'DYNAMIC_TABLE',
  'TABLE',
])

export const isExcludedFilterFieldDataType = (dataType: unknown) =>
  EXCLUDED_FILTER_FIELD_DATA_TYPES.has(String(dataType || '').toUpperCase())

export interface V6ControlValuesResponse {
  columnName: string
  jsonId: string
  status: string
  values: string[]
  wFormControlName: string
  wFormId: string
}

export interface V6FilterFieldsResponse {
  fields: V6FilterField[]
  formId: string
  workflowId: string
}

export interface V6SearchFilterClause {
  condition: string
  criteria: string
  dataType?: string
  value?: any
  values?: any[]
  valueTo?: string
}

export interface V6SearchPayload {
  filterBy: V6SearchFilterClause[]
  currentPage?: number
  groupBy?: string
  itemsPerPage?: number
  sortBy?: V6SearchSortBy
}

export interface V6SearchResponse {
  data: {
    key: string
    value: any[]
  }[]
  meta: {
    currentPage: number
    itemsPerPage: number
    totalItems: number
  }
  tableExists?: boolean
}

export interface V6SearchSortBy {
  criteria: string
  order: string
}

const getFilterFields = async (workflowId: string) => {
  const response: { data: V6FilterFieldsResponse | null; error: string } = {
    data: null,
    error: '',
  }
  try {
    const { data, status } = await axiosV6({
      headers: getTenantHeaders(),
      method: 'GET',
      url: `/workflows/${workflowId}/filter-fields`,
    })
    if (status !== 200) throw new Error('invalid status code')
    const payload = data as V6FilterFieldsResponse
    response.data = {
      ...payload,
      fields: Array.isArray(payload?.fields)
        ? payload.fields.filter(
            (field) => !isExcludedFilterFieldDataType(field.dataType),
          )
        : [],
    }
  } catch (e: unknown) {
    console.error(e)
    const err = e as { message?: string; response?: { data?: string } }
    response.error =
      err?.response?.data || err?.message || 'error fetching filter fields'
  }
  return response
}

const getControlValues = async (workflowId: string, controlName: string) => {
  const response: { data: V6ControlValuesResponse | null; error: string } = {
    data: null,
    error: '',
  }
  try {
    const { data, status } = await axiosV6({
      headers: getTenantHeaders(),
      method: 'GET',
      url: `/workflows/${workflowId}/control-values/${encodeURIComponent(controlName)}`,
    })
    if (status !== 200) throw new Error('invalid status code')
    response.data = data as V6ControlValuesResponse
  } catch (e: unknown) {
    console.error(e)
    const err = e as { message?: string; response?: { data?: string } }
    response.error =
      err?.response?.data || err?.message || 'error fetching control values'
  }
  return response
}

const searchTickets = async (workflowId: string, payload: V6SearchPayload) => {
  const response: { data: V6SearchResponse | null; error: string } = {
    data: null,
    error: '',
  }
  try {
    const { data, status } = await axiosV6({
      data: payload,
      headers: getTenantHeaders(),
      method: 'POST',
      url: `/workflows/${workflowId}/filter/search`,
    })
    if (status !== 200) throw new Error('invalid status code')
    response.data = data as V6SearchResponse
  } catch (e: unknown) {
    console.error(e)
    const err = e as { message?: string; response?: { data?: string } }
    response.error =
      err?.response?.data || err?.message || 'error searching tickets'
  }
  return response
}

export const shareFile = async (
  instanceId: string,
  payload: {
    action?: number
    email: string
    itemId: string
    message: string
    repositoryId: string
  },
) => {
  const res = await axiosV6.post(
    `/workflows/instances/${instanceId}/share-file`,
    payload,
  )
  return res.data
}

export const workflowsApiV6 = {
  addInstanceAttachment,
  addInstanceComment,
  createWorkflow,
  deleteWorkflow,
  moveNext,
  raiseTicket,
  searchTickets,
  shareFile,
  startWorkflow,
  startWorkflowJson,
  updateWorkflow,
  getAllWorkflows,
  getApAgentJobStatus,
  getCompletedList,
  getControlValues,
  getFilterFields,
  getInboxList,
  getInstanceAttachments,
  getInstanceComments,
  getInstanceCount,
  getInstanceHistory,
  getSentList,
  getWorkflowById,
  getWorkflows,
}

export default workflowsApiV6
