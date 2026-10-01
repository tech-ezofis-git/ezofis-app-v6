import authUserStore from '../../stores/authUserStore'
import { axiosV6 } from '../axios'

const createProcessTransaction = async (payload: any) => {
  const response: any = { data: '', error: '' }
  try {
    const { data, status } = await axiosV6.post(
      `/workflow/transaction`,
      JSON.stringify(payload),
    )
    if (status !== 200 && status !== 201) return
    response.data = data
  } catch (error) {
    console.error(error)
    response.error = 'Error in fetching the request meta data'
  }
  return response
}

const getAllWorkflows = async (payload: any) => {
  try {
    const { data, status } = await axiosV6.post(
      '/workflow/all',
      JSON.stringify(payload),
    )
    if (status === 200) return data
    throw new Error('Failed to fetch workflows')
  } catch (e) {
    console.error(e)
    throw e
  }
}

const getWorkflowById = async (id: string) => {
  try {
    const store = authUserStore.getState()
    const tenantId = store.session?.tenantId || ''
    const { data, status } = await axiosV6.get(`/Workflows/${id}`, {
      headers: {
        'X-Tenant-Id': tenantId,
      },
    })
    if (status === 200) return data
    throw new Error('Failed to fetch workflow')
  } catch (e) {
    console.error(e)
    throw e
  }
}

const createWorkflow = async (payload: any) => {
  const response: any = { error: '', payload: '' }

  try {
    const store = authUserStore.getState()
    const tenantId = store.session?.tenantId || ''
    const { data, status } = await axiosV6.post(
      '/workflows',
      JSON.stringify(payload),
      {
        headers: {
          'X-Tenant-Id': tenantId,
        },
      },
    )

    if (status !== 201) {
      throw new Error('Failed to create workflow')
    }

    response.payload = data
  } catch (e: any) {
    console.error(e)

    if (e.response?.status === 406) {
      response.error = 'workflow with the given name already exists'
    } else {
      response.error = 'error creating workflow'
    }
  }

  return response
}

const updateWorkflow = async (id: number, payload: any) => {
  const response: any = { error: '', payload: '' }

  try {
    const { data, status } = await axiosV6.put(
      `/workflow/${id}`,
      JSON.stringify(payload),
    )

    if (status !== 202) {
      throw new Error('Failed to update workflow')
    }

    response.payload = typeof data === 'string' ? JSON.parse(data) : data
  } catch (e: any) {
    console.error(e)
    if (e.response?.status === 404) {
      response.error = 'workflow with the given id is not found'
    } else if (e.response?.status === 406) {
      response.error = 'workflow with the given name already exists'
    } else {
      response.error = 'error updating workflow'
    }
  }

  return response
}

const moveNextWorkflowInstance = async (
  instanceId: string,
  payload: {
    activityid: string
    activityUserId?: string | null
    AIAGENTHtml?: string | null
    AIAGENTResponse?: string | null
    comments?: string | null
    formData?: any
    formEntryId?: string | null
    formId?: string | null
    instanceId?: string | null
    isItemTable?: boolean | null
    itemId?: string | null
    processId?: string | null
    repositoryId?: string | null
    review?: string | null
    transactionId?: string | number | null
    workflowId?: string | null
  },
) => {
  const { data } = await axiosV6.post(
    `/workflows/instances/${instanceId}/move-next`,
    JSON.stringify(payload),
  )
  return data
}

const workflowApi = {
  createProcessTransaction,
  createWorkflow,
  moveNextWorkflowInstance,
  updateWorkflow,
  getAllWorkflows,
  getWorkflowById,
}

export default workflowApi
