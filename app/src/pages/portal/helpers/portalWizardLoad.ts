import type { RepositoryFieldDto } from '@/api/v6/folder/folder'
import formApi from '@/api/form/form'
import workflowsApiV6, { type V6WorkflowDetail } from '@/api/v6/workflows'
import folderApi from '@/pages/folders/api/folderApi'
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

export const loadPortalWizard = async (
  workflowId: string,
  workflowName?: string,
): Promise<PortalWizardSource> => {
  const detailRes = await workflowsApiV6.getWorkflowById(workflowId)
  if (detailRes.error || !detailRes.data) {
    throw new Error(detailRes.error || 'Unable to load this workflow.')
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
