import {
  isFieldHidden,
  isFieldReadOnly,
} from '@/pages/requests/components/workflow-request/utils/fieldRendering'
import { getFieldId } from './qualifierResultUtils'

/**
 * Same rules as the request form page (WorkflowFormRenderer +
 * GenericRequestOverview readOnlyFieldIds / hiddenFieldIds):
 * - formJson field settings (hidden / readOnly)
 * - current activity block formEditControls / formVisibilityAccess Sets
 */
export const canViewAgentFormField = (
  field: any | null | undefined,
  hiddenFieldIds?: Set<string>,
) => {
  if (!field) return true
  if (isFieldHidden(field)) return false
  const id = getFieldId(field)
  if (!id) return true
  if (hiddenFieldIds?.has(id)) return false
  return true
}

export const canEditAgentFormField = (
  field: any | null | undefined,
  options: {
    hiddenFieldIds?: Set<string>
    onFieldChange?: ((fieldId: string, value: any) => void) | undefined
    readOnly?: boolean
    readOnlyFieldIds?: Set<string>
  },
) => {
  const { hiddenFieldIds, onFieldChange, readOnly, readOnlyFieldIds } = options
  if (readOnly || !onFieldChange || !field) return false
  if (isFieldHidden(field) || isFieldReadOnly(field)) return false
  const id = getFieldId(field)
  if (!id) return false
  if (hiddenFieldIds?.has(id)) return false
  if (readOnlyFieldIds?.has(id)) return false
  return true
}
