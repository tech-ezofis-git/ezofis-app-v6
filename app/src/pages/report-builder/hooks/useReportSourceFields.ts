import { useQuery } from '@tanstack/react-query'
import type { Question, QuestionType } from '@/pages/form-builder/store/formStore'
import { getField } from '@/helpers/new-field'
import formApi from '@/api/form/form'
import { getRepositoryById } from '@/api/v6/folder/folder'
import { workflowsApiV6 } from '@/api/v6/workflows'
import type { ReportSourceType } from '../types'

const mapDataTypeToQuestionType = (dataType?: string): QuestionType => {
  const dt = (dataType || '').toLowerCase()
  if (
    dt.includes('number') ||
    dt.includes('int') ||
    dt.includes('decimal') ||
    dt.includes('float') ||
    dt.includes('double') ||
    dt.includes('amount') ||
    dt.includes('currency')
  ) {
    return 'NUMBER'
  }
  if (dt.includes('date') && dt.includes('time')) {
    return 'DATE_TIME'
  }
  if (dt.includes('date')) {
    return 'DATE'
  }
  if (
    dt.includes('choice') ||
    dt.includes('select') ||
    dt.includes('dropdown')
  ) {
    return 'SINGLE_SELECT'
  }
  if (dt.includes('user') || dt.includes('assignee')) {
    return 'SHORT_TEXT'
  }
  if (
    dt.includes('long') ||
    dt.includes('textarea') ||
    dt.includes('text_area')
  ) {
    return 'LONG_TEXT'
  }
  return 'SHORT_TEXT'
}

const createField = (
  id: string,
  label: string,
  type: QuestionType,
  isMandatory = false,
): Question => {
  const base = getField(type) as unknown as Question
  return {
    ...base,
    id,
    label,
    type,
    settings: {
      ...base.settings,
      validation: {
        ...base.settings?.validation,
        fieldRule: isMandatory ? 'REQUIRED' : 'OPTIONAL',
      },
    },
  }
}

const mapRepositoryFieldToQuestion = (field: any): Question => {
  const id = field.sqlColumnName || field.id || field.name || ''
  const label = field.name || field.sqlColumnName || field.id || ''
  const type = mapDataTypeToQuestionType(field.dataType)
  return createField(id, label, type, Boolean(field.isMandatory))
}

const STANDARD_FOLDER_FIELDS: Question[] = [
  createField('documentName', 'Document Name', 'SHORT_TEXT'),
  createField('fileSize', 'File Size (KB)', 'NUMBER'),
  createField('uploadedDate', 'Uploaded Date', 'DATE'),
  createField('documentStatus', 'Status', 'SINGLE_SELECT'),
  createField('owner', 'Owner', 'SHORT_TEXT'),
  createField('version', 'Version', 'SHORT_TEXT'),
]

/**
 * Loads the field list (Question[]) for a Report Builder source.
 * Supports:
 * - Workflow: resolves the workflow's form and extracts form fields.
 * - Folder: loads repository metadata fields + standard document fields.
 * - Master/Custom forms: loads form panels and extracts fields.
 */
const useReportSourceFields = (
  formIdOrSourceId: string,
  sourceType?: ReportSourceType,
  sourceId?: string,
): { fields: Question[]; isError: boolean; isLoading: boolean } => {
  const isFolder = sourceType === 'Folder'
  const isWorkflow = sourceType === 'Workflow'
  const targetFolderId = isFolder ? sourceId || formIdOrSourceId : ''

  const formQuery = useQuery({
    enabled: Boolean(formIdOrSourceId || sourceId) && !isFolder,
    queryKey: ['report-source-fields', 'form', formIdOrSourceId, sourceId],
    queryFn: async () => {
      let targetFormId = formIdOrSourceId
      if (!targetFormId && isWorkflow && sourceId) {
        const wfRes = await workflowsApiV6.getWorkflowById(sourceId)
        if (wfRes.data) {
          const wf = wfRes.data
          targetFormId = String(
            wf.formId ??
              wf.wFormId ??
              wf.settings?.general?.initiateUsing?.formId ??
              '',
          )
          if (!targetFormId && wf.formJson?.panels) {
            return wf.formJson.panels.flatMap((p: any) => p.fields ?? [])
          }
        }
      }

      if (!targetFormId) return []

      const { data, error } = await formApi.getFormDataById(targetFormId)
      if (error) throw new Error(error)
      const panels: Array<{ fields?: Question[] }> =
        data?.formJson?.panels ?? []
      return panels.flatMap((p) => p.fields ?? [])
    },
  })

  const folderQuery = useQuery({
    enabled: Boolean(targetFolderId) && isFolder,
    queryKey: ['report-source-fields', 'folder', targetFolderId],
    queryFn: async () => {
      const res = await getRepositoryById(targetFolderId)
      if (res.error || !res.data)
        throw new Error(res.error || 'Failed to load folder fields')
      const repo = res.data
      const customFields = (repo.fields || []).map(mapRepositoryFieldToQuestion)

      const existingIds = new Set(customFields.map((f: Question) => f.id))
      const combined = [
        ...STANDARD_FOLDER_FIELDS.filter((f) => !existingIds.has(f.id)),
        ...customFields,
      ]
      return combined
    },
  })

  if (isFolder) {
    return {
      fields: folderQuery.data ?? [],
      isError: folderQuery.isError,
      isLoading: Boolean(targetFolderId) && folderQuery.isLoading,
    }
  }

  return {
    fields: formQuery.data ?? [],
    isError: formQuery.isError,
    isLoading: Boolean(formIdOrSourceId || sourceId) && formQuery.isLoading,
  }
}

export default useReportSourceFields
