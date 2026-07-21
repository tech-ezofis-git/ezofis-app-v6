import authUserStore from '../../stores/authUserStore'
import { axiosV6 } from '../axios'
import { getV6ApiErrorMessage } from './auth'

export interface CreateSupportTicketPayload {
  supportCategory: string
  Priorty: string
  PreferredContact: string
  PhoneNO: string
  RequestDescription: string
  isEmailSend: boolean
  fullName?: string
  orgName?: string
  email?: string
  tenantId?: string
}

export interface SupportTicketResponse {
  id?: string
  jiraIssueKey?: string
  jiraIssueUrl?: string
  jiraSuccess?: boolean
}

export const createSupportTicket = async (
  payload: CreateSupportTicketPayload,
) => {
  const response: {
    data: SupportTicketResponse | null
    error: string
  } = {
    data: null,
    error: '',
  }

  try {
    const store = authUserStore.getState()
    const tenantId = store.session?.tenantId || (store.identity as any)?.tenantId || ''

    const { data, status } = await axiosV6({
      data: payload,
      headers: tenantId ? { 'X-Tenant-Id': tenantId } : undefined,
      method: 'POST',
      url: '/support-tickets',
    })

    if (status !== 200 && status !== 201) {
      throw new Error('invalid status code')
    }

    const rawData = typeof data === 'string' ? JSON.parse(data) : data
    const ticketData = rawData as SupportTicketResponse

    if (ticketData && ticketData.jiraSuccess === false) {
      response.error = getV6ApiErrorMessage(
        rawData,
        'Failed to create Jira support ticket',
      )
    } else {
      response.data = ticketData
    }
  } catch (error: any) {
    console.error(error)
    response.error = getV6ApiErrorMessage(
      error?.response?.data,
      'Failed to submit support ticket',
    )
  }

  return response
}

export default {
  createSupportTicket,
}
