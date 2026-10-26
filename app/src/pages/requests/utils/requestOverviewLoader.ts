import formApi from '@/api/form/form'
import requestApi from '@/api/requests/requests'
import workflowsApiV6 from '@/api/v6/workflows'
import type { WorkflowOption } from '../types'

/**
 * Loaders the request overview (`Request`) depends on, shared by the Requests
 * page and pages that open a request in place (e.g. a report's Req No link).
 */

const parseJsonSafe = (val: any) => {
  if (!val) return null
  if (typeof val === 'object') return val
  if (typeof val === 'string') {
    try {
      return JSON.parse(val)
    } catch {
      return null
    }
  }
  return null
}

export interface LoadedOverviewWorkflow {
  /** For requestStore.rawWorkflowData. */
  rawWorkflow: any
  /** For requestStore.selectedWorkflow (via openRequest). */
  selectedWorkflow: WorkflowOption
}

/**
 * Loads a workflow and its form schema in the shape the request overview
 * reads from the store. Throws when the workflow can't be loaded.
 */
export const loadOverviewWorkflow = async (
  workflowId: string,
  workflowName?: string,
): Promise<LoadedOverviewWorkflow> => {
  const workflowRes = await workflowsApiV6.getWorkflowById(workflowId)
  if (workflowRes.error || !workflowRes.data) {
    throw new Error(workflowRes.error || 'Failed to load workflow')
  }

  const wf = workflowRes.data
  const wfJson = parseJsonSafe(wf.workflowJson)
  const flowJsonParsed = parseJsonSafe(wf.flowJson)

  const wFormId =
    wf.formId ??
    wf.wFormId ??
    wf.settings?.general?.initiateUsing?.formId ??
    wfJson?.settings?.general?.initiateUsing?.formId ??
    flowJsonParsed?.settings?.general?.initiateUsing?.formId ??
    wf.form ??
    ''

  let formJson = wf.formJson
  if (wFormId) {
    try {
      const formRes = await formApi.getFormDataById(String(wFormId))
      if (formRes?.data) {
        formJson = formRes.data._json ?? formRes.data.formJson ?? formRes.data
      }
    } catch (e) {
      console.warn('Failed to fetch form schema for workflow', e)
    }
  }

  let flowJson = ''
  if (typeof wf.flowJson === 'string') {
    flowJson = wf.flowJson
  } else if (wf.flowJson) {
    flowJson = JSON.stringify(wf.flowJson)
  } else if (wf.workflowJson) {
    // The real V6 workflow detail response only returns workflowJson
    // (no separate flowJson string) — fall back to it so consumers
    // of selectedWorkflow.flowJson (getActionsForActivity, etc.)
    // still see the actual blocks/rules instead of an empty flow.
    flowJson = JSON.stringify(wf.workflowJson)
  }

  return {
    rawWorkflow: { ...wf, formJson, id: workflowId },
    selectedWorkflow: {
      flowJson,
      formJson: formJson ?? '',
      id: workflowId,
      name: wf.name ?? wf.settings?.general?.name ?? workflowName ?? 'Workflow',
      wFormId: wFormId || '',
      workflowJson: wf.workflowJson,
    },
  }
}

export const matchesRequestRow = (
  item: any,
  instanceId: string,
  transactionId?: string,
) =>
  String(item.workflowInstanceId || item.processId || item.id) ===
    String(instanceId) ||
  Boolean(transactionId && String(item.transactionId) === String(transactionId))

/** The instance object from a GET instance response (bare or wrapped). */
const unwrapInstance = (data: any) => {
  const candidate =
    data?.data && typeof data.data === 'object' && !Array.isArray(data.data)
      ? data.data
      : data
  return candidate && typeof candidate === 'object' && !Array.isArray(candidate)
    ? candidate
    : null
}

/**
 * Finds one request (process instance) of a workflow in the V6 inbox / sent /
 * completed lists, then via the legacy getProcess lookup. With `useLocate`
 * it first tries GET /Workflows/{workflowId}/instances/{instanceId}/locate,
 * which finds any request, not only the user's own — only the report page
 * opts in for now. Returns the raw row (not yet transformed), or null.
 */
export const findRequestRow = async (
  workflowId: string,
  instanceId: string,
  transactionId?: string,
  options: { useLocate?: boolean } = {},
): Promise<any> => {
  if (options.useLocate) {
    const located = await workflowsApiV6.locateInstance(workflowId, instanceId)
    // TEMP: inspecting the new /locate response shape before mapping it.
    console.log('[requestOverviewLoader] /locate response', located)
    const instance = located.error ? null : unwrapInstance(located.data)
    if (instance) return instance
  }

  try {
    const [inboxRes, sentRes, completedRes] = await Promise.all([
      workflowsApiV6.getInboxList(workflowId, 1, 10, instanceId, transactionId),
      workflowsApiV6.getSentList(workflowId, 1, 10, instanceId, transactionId),
      workflowsApiV6.getCompletedList(
        workflowId,
        1,
        10,
        instanceId,
        transactionId,
      ),
    ])
    const row = [
      ...(inboxRes.data?.items || []),
      ...(sentRes.data?.items || []),
      ...(completedRes.data?.items || []),
    ].find((item: any) => matchesRequestRow(item, instanceId, transactionId))
    if (row) return row
  } catch (e) {
    console.warn('⚠️ V6 instance fetch error', e)
  }

  try {
    const row = await requestApi.getProcess(
      workflowId,
      instanceId,
      transactionId ?? instanceId,
    )
    if (row) return row
  } catch (e) {
    console.warn('⚠️ getProcess request failed', e)
  }
  return null
}
