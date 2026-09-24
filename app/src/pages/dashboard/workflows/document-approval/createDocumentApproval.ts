import formApi from '@/api/form/form'
import workflowApi from '@/api/workflow/workflow'
import authUserStore from '@/stores/authUserStore'
import documentApprovalPayloads from './documentApprovalPayloads.json'

const replaceTokens = (
  value: unknown,
  tokens: Record<string, string>,
): unknown => {
  if (typeof value === 'string') {
    let result = value
    for (const [key, replacement] of Object.entries(tokens)) {
      result = result.replaceAll(`{{${key}}}`, replacement)
    }
    return result
  }

  if (Array.isArray(value)) {
    return value.map((item) => replaceTokens(item, tokens))
  }

  if (value && typeof value === 'object') {
    const next: Record<string, unknown> = {}
    for (const [key, child] of Object.entries(value)) {
      next[key] = replaceTokens(child, tokens)
    }
    return next
  }

  return value
}

const readCreatedFormId = (data: unknown) => {
  if (typeof data === 'string' || typeof data === 'number') return String(data)
  if (data && typeof data === 'object') {
    const record = data as { data?: unknown; formId?: unknown; id?: unknown }
    const id = record.id ?? record.formId ?? record.data
    if (typeof id === 'string' || typeof id === 'number') return String(id)
  }
  return ''
}

export const createDocumentApprovalFormAndWorkflow = async () => {
  const userId = authUserStore.getState().session?.id || ''
  if (!userId) {
    return { error: 'User session not found' }
  }

  const formRes = await formApi.createForm(
    JSON.parse(JSON.stringify(documentApprovalPayloads.formPayload)),
  )
  if (formRes.error) {
    return {
      error: `Failed to create Document Approval form: ${formRes.error}`,
    }
  }

  const formId = readCreatedFormId(formRes.data)
  if (!formId) {
    return {
      error:
        'Document Approval form created but did not return a valid form ID.',
    }
  }

  const workflowPayload = replaceTokens(
    documentApprovalPayloads.workflowPayload,
    {
      formId,
      users: userId,
    },
  )

  const workflowRes = await workflowApi.createWorkflow(workflowPayload)
  if (workflowRes.error) {
    return {
      error: `Failed to create Document Approval workflow: ${workflowRes.error}`,
    }
  }

  return { error: '' }
}
