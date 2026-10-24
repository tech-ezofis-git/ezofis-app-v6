import authUserStore from '../../stores/authUserStore'
import { axiosV6 } from '../axios'
import { getV6ApiErrorMessage } from './auth'

export type FieldMappingMatch = {
  dataType?: string
  excelField?: string
  masterField?: string
}

export type FieldMappingRequest = {
  excelSheets: { columns: string[]; sheetName: string }[]
  headerFields: { dataType: string; name: string }[]
  lineItemFields: { dataType: string; name: string }[]
}

export type FieldMappingResponse = {
  headerFields?: FieldMappingMatch[]
  lineItemFields?: FieldMappingMatch[]
}

/**
 * POST /field-mapping — the AI field matcher the Accounts Payable onboarding
 * (ERP template upload) uses. `excelSheets` hold the source column names;
 * `headerFields` / `lineItemFields` are the target fields to match them to.
 * Each returned item pairs a target `masterField` with a source `excelField`.
 */
export const suggestFieldMapping = async (
  payload: FieldMappingRequest,
  signal?: AbortSignal,
): Promise<{ data: FieldMappingResponse | null; error: string }> => {
  try {
    const tenantId = authUserStore.getState().session?.tenantId || ''
    const { data, status } = await axiosV6.post('/field-mapping', payload, {
      headers: { 'X-Tenant-Id': String(tenantId) },
      signal,
    })
    if (status === 200 && data && typeof data === 'object') {
      return { data: data as FieldMappingResponse, error: '' }
    }
    return { data: null, error: 'Unexpected field-mapping response' }
  } catch (error) {
    const response = (error as { response?: { data?: unknown } })?.response
    return {
      data: null,
      error: getV6ApiErrorMessage(
        response?.data,
        'Could not get field mapping suggestions.',
      ),
    }
  }
}
