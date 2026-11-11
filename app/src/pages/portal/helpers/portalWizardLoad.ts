import type { RepositoryFieldDto } from '@/api/v6/folder/folder'
import formApi from '@/api/form/form'
import workflowsApiV6, { type V6WorkflowDetail } from '@/api/v6/workflows'
import folderApi from '@/pages/folders/api/folderApi'
import { ensureNormalizedRuntimeFormJson } from '@/pages/requests/components/workflow-request/utils/fieldRendering'
import { isAccountsPayableWorkflow } from '@/pages/requests/utils/workflow.utils'
import {
  collectFormPanels,
  type FormPanel,
  normalizeFormPanels,
  parseFileFields,
  parseQuestionPanels,
  type PortalFileField,
  type PortalFormQuestion,
  type PortalQuestionPanel,
} from './portalForm'

export type PortalWizardSource = {
  fileFields: PortalFileField[]
  // Form rules (conditional logic, formulas), as the in-app new request reads them
  formRules: any[]
  isAccountsPayable: boolean
  panels: FormPanel[]
  questionPanels: PortalQuestionPanel[]
  questions: PortalFormQuestion[]
  repositoryFields: RepositoryFieldDto[]
  repositoryId?: string
  workflow: WorkflowDetail
  workflowId: string
  workflowName: string
}

type WorkflowDetail = V6WorkflowDetail & {
  repositoryId?: number | string
}

// The API can answer with a JSON body (for example a 403 or 404 problem object)
// instead of text; new Error(object) would show "[object Object]".
const readLoadError = (error: unknown): string => {
  if (typeof error === 'string' && error.trim()) return error
  if (error && typeof error === 'object') {
    const body = error as Record<string, unknown>
    const text = [body.error, body.message, body.detail, body.title].find(
      (value) => typeof value === 'string' && value.trim(),
    )
    if (typeof text === 'string') return text
  }
  return 'You do not have access to start this request. Please contact the portal owner.'
}

export const loadPortalWizard = async (
  workflowId: string,
  workflowName?: string,
): Promise<PortalWizardSource> => {
  const detailRes = await workflowsApiV6.getWorkflowById(workflowId)
  if (detailRes.error || !detailRes.data) {
    throw new Error(readLoadError(detailRes.error))
  }

  const workflow = detailRes.data as WorkflowDetail
  let formJson: unknown = workflow.formJson
  const formId =
    workflow.formId ||
    workflow.wFormId ||
    workflow.settings?.general?.initiateUsing?.formId

  if (formId && !formJson) {
    const formRes = await formApi.getFormDataById(String(formId))
    if (formRes?.data) {
      formJson = formRes.data.formJson ?? formRes.data
    }
  }

  const name =
    workflowName ||
    workflow.name ||
    workflow.settings?.general?.name ||
    'Workflow'
  const isPayable =
    isAccountsPayableWorkflow(workflow) ||
    String(name).toLowerCase().includes('payable') ||
    String(name).toLowerCase().includes('invoice')

  const questionPanels = parseQuestionPanels(formJson, name)
  const questions = questionPanels.flatMap((panel) => panel.questions)
  const repositoryId = workflow.repositoryId
    ? String(workflow.repositoryId)
    : undefined
  let repositoryFields: RepositoryFieldDto[] = []
  if (repositoryId) {
    try {
      const repo = await folderApi.getRepositoryFullData(repositoryId)
      repositoryFields = repo?.fields || []
    } catch {
      repositoryFields = []
    }
  }

  return {
    fileFields: parseFileFields(formJson),
    formRules: ensureNormalizedRuntimeFormJson(formJson).rules,
    isAccountsPayable: isPayable,
    panels: normalizeFormPanels(collectFormPanels(formJson)),
    questionPanels,
    questions,
    repositoryFields,
    repositoryId,
    workflow,
    workflowId: String(workflow.id || workflowId),
    workflowName: name,
  }
}
