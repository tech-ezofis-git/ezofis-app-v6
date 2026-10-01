type WorkflowLike = {
  blocks?: Array<Record<string, any>>
  settings?: { general?: { initiateUsing?: { formId?: string } } }
  workflowJson?: {
    blocks?: Array<Record<string, any>>
    settings?: { general?: { initiateUsing?: { formId?: string } } }
  }
}

const isDocumentGenerateBlock = (block: Record<string, any> | null | undefined) => {
  if (!block) return false
  const type = String(block.type || '')
  const toolType = String(block.settings?.toolType || '').toLowerCase()
  const subtype = String(block.settings?.subtype || '').toUpperCase()
  const label = String(block.settings?.label || '')
  return (
    type === 'DOCUMENT_GENERATE_AGENT' ||
    toolType === 'document_generate_agent' ||
    subtype === 'DOCUMENT_GENERATE' ||
    label.includes('Document Generate') ||
    label.includes('Document Agent')
  )
}

const readRawTemplate = (block: Record<string, any>): unknown => {
  const candidates = [
    block.settings?.templateJson,
    block.templateJson,
    block.settings?.documentGenerateAgent?.templateJson,
    block.settings?.documentGenerate?.templateJson,
    block.settings?.pdfTemplateJson,
    block.pdfTemplateJson,
  ]
  return candidates.find((value) => {
    if (typeof value === 'string') return value.trim().length > 0
    return value != null && typeof value === 'object'
  })
}

/** Parse DOCUMENT_GENERATE_AGENT templateJson from workflow; null if missing/invalid. */
export const getDocumentGenerateTemplateJson = (
  workflow: WorkflowLike | null | undefined,
): Record<string, unknown> | null => {
  const blocks =
    workflow?.workflowJson?.blocks ||
    workflow?.blocks ||
    []
  const docBlock = blocks.find(isDocumentGenerateBlock)
  if (!docBlock) return null

  const raw = readRawTemplate(docBlock)
  if (raw == null) return null

  let parsed: Record<string, unknown> | null = null
  if (typeof raw === 'string') {
    try {
      const value = JSON.parse(raw)
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        parsed = value as Record<string, unknown>
      }
    } catch {
      return null
    }
  } else if (typeof raw === 'object' && !Array.isArray(raw)) {
    parsed = { ...(raw as Record<string, unknown>) }
  }

  if (!parsed) return null

  const id =
    (typeof parsed.id === 'string' && parsed.id.trim()) ||
    (typeof parsed.template === 'string' && parsed.template.trim()) ||
    ''
  if (id && !parsed.id) {
    parsed = { ...parsed, id }
  }

  const hasSchemas =
    Array.isArray(parsed.schemas) && (parsed.schemas as unknown[]).length > 0
  if (!id && !hasSchemas) return null

  return parsed
}

export const getWorkflowFormId = (
  workflow: WorkflowLike | null | undefined,
): string => {
  return String(
    workflow?.settings?.general?.initiateUsing?.formId ||
      workflow?.workflowJson?.settings?.general?.initiateUsing?.formId ||
      '',
  ).trim()
}

/** Build preview formData from the live form model (field-id keys). */
export const buildDocumentPreviewFormData = (
  formModel: Record<string, unknown> | null | undefined,
): Record<string, unknown> => {
  if (!formModel || typeof formModel !== 'object') return {}
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(formModel)) {
    if (!key || key.startsWith('_')) continue
    if (value === undefined) continue
    out[key] = value
  }
  return out
}
