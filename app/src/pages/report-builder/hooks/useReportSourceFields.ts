import { useQuery } from '@tanstack/react-query'
import type { Question } from '@/pages/form-builder/store/formStore'
import { getFormFieldsQueryOptions } from '@/api/form/queries'

/**
 * Loads the field list (Question[]) for a Report Builder source form. Only
 * fetches when `formId` is set — the underlying query options already gate
 * `enabled` on that, so this hook simply exposes a small, purpose-fit shape.
 */
const useReportSourceFields = (
  formId: string,
): { fields: Question[]; isError: boolean; isLoading: boolean } => {
  const { data, isError, isLoading } = useQuery(
    getFormFieldsQueryOptions(formId),
  )

  return {
    fields: data ?? [],
    isError,
    isLoading: Boolean(formId) && isLoading,
  }
}

export default useReportSourceFields
