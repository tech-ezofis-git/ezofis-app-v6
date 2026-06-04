import { axiosCrypto, axiosV6 } from '../axios'

const getAllRequests = async (payload: any) => {
  const response: any = { data: '', error: '' }
  try {
    const { data, status } = await axiosCrypto.post(
      '/workflow/all',
      JSON.stringify(payload),
    )
    if (status !== 200) throw new Error('invalid status code')
    response.data = data?.data
  } catch (e) {
    console.error(e)
    response.error = 'error fetching request'
  }
  return response
}

const getInboxListById = async (requestId: number | string, payload: any) => {
  try {
    const { data, status } = await axiosCrypto.post(
      `/workflow/inboxList/${requestId}`,
      JSON.stringify(payload),
    )
    if (status === 200 && data) return data
    return null
  } catch (error) {
    console.error(error)
    throw error
  }
}

const getSentListById = async (requestId: number | string, payload: any) => {
  try {
    const { data, status } = await axiosCrypto.post(
      `/workflow/processList/${requestId}`,
      JSON.stringify(payload),
    )
    if (status === 200 && data) return data
    return null
  } catch (error) {
    console.error(error)
    throw error
  }
}

const getCompletedRequestById = async (
  requestId: number | string,
  payload: any,
) => {
  try {
    const { data, status } = await axiosCrypto.post(
      `/workflow/completedList/${requestId}`,
      JSON.stringify(payload),
    )
    if (status === 200 && data) return data
    return null
  } catch (error) {
    console.error(error)
    throw error
  }
}

// --- NEW FUNCTIONS PORTED FROM VUE ---

const getWorkflow = async (payload: any) => {
  try {
    const { data, status } = await axiosCrypto.get(`/workflow/${payload}`)
    if (status === 200) return data
    throw new Error('Failed to get workflow')
  } catch (e) {
    console.error(e)
    throw e
  }
}

const createWorkflow = async (payload: any) => {
  try {
    const { data, status } = await axiosCrypto.post(
      '/workflow',
      JSON.stringify(payload),
    )
    if (status === 201) return data
    throw new Error('Failed to create workflow')
  } catch (e) {
    console.error(e)
    throw e
  }
}

const updateWorkflow = async (id: number | string, payload: any) => {
  try {
    const { data, status } = await axiosCrypto.put(
      `/workflow/${id}`,
      JSON.stringify(payload),
    )
    if (status === 202) return data
    throw new Error('Failed to update workflow')
  } catch (e) {
    console.error(e)
    throw e
  }
}

const getWorkflowList = async (criteria = '', value = '') => {
  try {
    const { data, status } = await axiosCrypto.post(
      '/workflow/list',
      JSON.stringify({ criteria, value }),
    )
    if (status === 200) return data
    throw new Error('Error fetching workflow list')
  } catch (e) {
    console.error(e)
    throw e
  }
}

const getUserMyInbox = async () => {
  try {
    const { data, status } = await axiosCrypto.get(`/workflow/myInboxCount`)
    if (status === 200) return data
    throw new Error('Error fetching inbox count')
  } catch (e) {
    console.error(e)
    throw e
  }
}

const getUserWorkflowTest = async () => {
  try {
    const { data, status } = await axiosCrypto.get(`/workflowTest/listByUserId`)
    if (status === 200) return data
    throw new Error('Error fetching test workflows')
  } catch (e) {
    console.error(e)
    throw e
  }
}

const processTransaction = async (payload: any) => {
  try {
    const { data, status } = await axiosCrypto.post(
      '/workflow/transaction',
      JSON.stringify(payload),
    )
    if (status === 201) return data
    throw new Error('Error processing transaction')
  } catch (e) {
    console.error(e)
    throw e
  }
}

const getMyInboxList = async (payload: any, workflowId?: number | string) => {
  try {
    const url = workflowId
      ? `/workflow/myInboxList/${workflowId}`
      : `/workflow/myInboxList`
    const { data, status } = await axiosCrypto.post(
      url,
      JSON.stringify(payload),
    )
    if (status === 200) return data
    throw new Error('Error fetching my inbox list')
  } catch (e) {
    console.error(e)
    throw e
  }
}

const getCommonList = async (workflowId: number | string, payload: any) => {
  try {
    const { data, status } = await axiosCrypto.post(
      `/workflow/runningList/${workflowId}`,
      JSON.stringify(payload),
    )
    if (status === 200) return data
    throw new Error('Error fetching common list')
  } catch (e) {
    console.error(e)
    throw e
  }
}

const getInboxListAgent = async (workflowId: number | string, payload: any) => {
  try {
    const { data, status } = await axiosCrypto.post(
      `/workflow/inboxListAgent/${workflowId}`,
      JSON.stringify(payload),
    )
    if (status === 200) return data
    throw new Error('Error fetching agent list')
  } catch (e) {
    console.error(e)
    throw e
  }
}

const getInboxListTest = async (workflowId: number | string, payload: any) => {
  try {
    const { data, status } = await axiosCrypto.post(
      `/workflowTest/inboxList/${workflowId}`,
      JSON.stringify(payload),
    )
    if (status === 200) return data
    throw new Error('Error fetching test inbox list')
  } catch (e) {
    console.error(e)
    throw e
  }
}

const getSentListTest = async (workflowId: number | string, payload: any) => {
  try {
    const { data, status } = await axiosCrypto.post(
      `/workflowTest/processList/${workflowId}`,
      JSON.stringify(payload),
    )
    if (status === 200) return data
    throw new Error('Error fetching test sent list')
  } catch (e) {
    console.error(e)
    throw e
  }
}

const getCompletedListTest = async (
  workflowId: number | string,
  payload: any,
) => {
  try {
    const { data, status } = await axiosCrypto.post(
      `/workflowTest/completedList/${workflowId}`,
      JSON.stringify(payload),
    )
    if (status === 200) return data
    throw new Error('Error fetching test completed list')
  } catch (e) {
    console.error(e)
    throw e
  }
}

const getPaymentList = async (workflowId: number | string, payload: any) => {
  try {
    const { data, status } = await axiosCrypto.post(
      `/workflow/paymentProcessList/${workflowId}`,
      JSON.stringify(payload),
    )
    if (status === 200) return data
    throw new Error('Error fetching payment list')
  } catch (e) {
    console.error(e)
    throw e
  }
}

const getProcessComments = async (
  workflowId: number | string,
  processId: number | string,
) => {
  try {
    const { data, status } = await axiosCrypto.get(
      `/workflow/comments/${workflowId}/${processId}`,
    )
    if (status === 200) return data
    throw new Error('Error fetching comments')
  } catch (e) {
    console.error(e)
    throw e
  }
}

const insertProcessComment = async (
  workflowId: number | string,
  processId: number | string,
  transactionId: number | string,
  payload: any,
) => {
  try {
    const { data, status } = await axiosCrypto.post(
      `/workflow/comments/${workflowId}/${processId}/${transactionId}`,
      JSON.stringify(payload),
    )
    if (status === 201) return data
    throw new Error('Error inserting comment')
  } catch (e) {
    console.error(e)
    throw e
  }
}

const groupRequestAction = async (payload: any) => {
  try {
    const { data, status } = await axiosCrypto.post(
      `/workflow/transactionBulk`,
      JSON.stringify(payload),
    )
    if (status === 201) return data
    throw new Error('Error in bulk action')
  } catch (e) {
    console.error(e)
    throw e
  }
}

// CRITICAL FOR DRAWER (Detailed History)
const processHistory = async (
  workflowId: number | string,
  processId: number | string,
) => {
  try {
    const { data, status } = await axiosCrypto.get(
      `/workflow/processHistory/${workflowId}/${processId}`,
    )
    if (status === 200) return data
    throw new Error('Error fetching history')
  } catch (e) {
    console.error(e)
    throw e
  }
}

const overviewChart = async (workflowId: number | string, payload: any) => {
  try {
    const { data, status } = await axiosCrypto.post(
      `/overview/workflow/${workflowId}`,
      JSON.stringify(payload),
    )
    if (status === 200) return data
    throw new Error('Error fetching overview chart')
  } catch (e) {
    console.error(e)
    throw e
  }
}

// CRITICAL FOR DRAWER (Attachments)
const getAttachments = async (
  workflowId: number | string,
  processId: number | string,
) => {
  try {
    const { data, status } = await axiosCrypto.get(
      `/workflow/attachmentList/${workflowId}/${processId}`,
    )
    if (status === 200) return data
    throw new Error('Error fetching attachments')
  } catch (e) {
    console.error(e)
    throw e
  }
}

const saveProcessSignature = async (
  workflowId: number | string,
  processId: number | string,
  transactionId: number | string,
  payload: any,
) => {
  try {
    const { data, status } = await axiosCrypto.post(
      `/workflow/signWithProcessId/${workflowId}/${processId}/${transactionId}`,
      JSON.stringify(payload),
    )
    if (status === 200) return data
    throw new Error('Error saving signature')
  } catch (e) {
    console.error(e)
    throw e
  }
}

const getProcessSignature = async (
  workflowId: number | string,
  processId: number | string,
) => {
  try {
    const { data, status } = await axiosCrypto.get(
      `/workflow/signWithProcessIdList/${workflowId}/${processId}`,
    )
    if (status === 200) return data
    throw new Error('Error fetching signature')
  } catch (e) {
    console.error(e)
    throw e
  }
}

const getTaskEntries = async (
  workflowId: number | string,
  processId: number | string,
  payload: any,
) => {
  try {
    const { data, status } = await axiosCrypto.post(
      `/workflow/taskList/${workflowId}/${processId}`,
      JSON.stringify(payload),
    )
    if (status === 200) return data
    throw new Error('Error fetching tasks')
  } catch (e) {
    console.error(e)
    throw e
  }
}

const insertTaskEntry = async (payload: any) => {
  try {
    const { data, status } = await axiosCrypto.post(
      `/workflow/task`,
      JSON.stringify(payload),
    )
    if (status === 201) return data
    throw new Error('Error saving task')
  } catch (e) {
    console.error(e)
    throw e
  }
}

const overviewTableReport = async (
  workflowId: number | string,
  payload: any,
) => {
  try {
    const { data, status } = await axiosCrypto.post(
      `/overview/workflowSum/${workflowId}`,
      JSON.stringify(payload),
    )
    if (status === 200) return data
    throw new Error('Error fetching overview report')
  } catch (e) {
    console.error(e)
    throw e
  }
}

const getMailTransactions = async (
  workflowId: number | string,
  processId: number | string,
  payload: any,
) => {
  try {
    const { data, status } = await axiosCrypto.post(
      `/MailSettings/mailTransaction/${workflowId}/${processId}`,
      JSON.stringify(payload),
    )
    if (status === 200) return data
    throw new Error('Error fetching mail transactions')
  } catch (e) {
    console.error(e)
    throw e
  }
}

const resendMail = async (mailId: number | string) => {
  try {
    const { status } = await axiosCrypto.post(
      `/MailSettings/reSendMail/${mailId}`,
    )
    if (status === 200) return true
    throw new Error('Error resending mail')
  } catch (e) {
    console.error(e)
    throw e
  }
}

const documentMerge = async (
  workflowId: number | string,
  processId: number | string,
  transactionId: number | string,
  repositoryId: number | string,
  payload: any,
) => {
  try {
    const { status } = await axiosCrypto.post(
      `/file/mergeFiles/${workflowId}/${processId}/${transactionId}/${repositoryId}`,
      JSON.stringify(payload),
    )
    if (status === 200) return true
    throw new Error('Error merging documents')
  } catch (e) {
    console.error(e)
    throw e
  }
}

const insertProcessComment_Jira = async (issueId: any, payload: any) => {
  try {
    const { data, status } = await axiosCrypto.post(
      `/workflow/commentsByissueId/${issueId}`,
      JSON.stringify(payload),
    )
    if (status === 201) return data
    throw new Error('Error inserting Jira comment')
  } catch (e) {
    console.error(e)
    throw e
  }
}

const getKanbanViewSettings = async (workflowId: number | string) => {
  try {
    const { data, status } = await axiosCrypto.get(
      `/workflow/kanbanView/${workflowId}`,
    )
    if (status === 200) return data
    return null
  } catch (e) {
    console.error(e)
    throw e
  }
}

const reopenRequest = async (
  workflowId: number | string,
  processId: number | string | null,
  payload: any,
) => {
  try {
    const url = processId
      ? `/transaction/reOpenTicket/${workflowId}/${processId}`
      : `/transaction/reOpenTicket/${workflowId}`
    const { data, status } = await axiosCrypto.post(
      url,
      JSON.stringify(payload),
    )
    if (status === 200) return data
    throw new Error('Error reopening request')
  } catch (e) {
    console.error(e)
    throw e
  }
}

const getSubWorkflow = async (
  workflowId: number | string,
  processId: number | string,
) => {
  try {
    const { data, status } = await axiosCrypto.get(
      `/workflow/subWorkflow/${workflowId}/${processId}`,
    )
    if (status === 200) return data
    return null
  } catch (e) {
    console.error(e)
    throw e
  }
}

const addSubWorkflow = async (payload: any) => {
  try {
    const { data, status } = await axiosCrypto.post(
      `/workflow/postSubWorkflow`,
      JSON.stringify(payload),
    )
    if (status === 201) return data
    throw new Error('Error adding subworkflow')
  } catch (e) {
    console.error(e)
    throw e
  }
}

const edtSubWorkflow = async (
  id: number | string,
  workflowId: number | string,
  subWorkflowId: number | string,
  payload: any,
) => {
  try {
    const { data, status } = await axiosCrypto.put(
      `/workflow/putSubWorkflow/${id}/${workflowId}/${subWorkflowId}`,
      JSON.stringify(payload),
    )
    if (status === 202) return data
    throw new Error('Error editing subworkflow')
  } catch (e) {
    console.error(e)
    throw e
  }
}

const updateRequestReserved = async (payload: any) => {
  try {
    const { data, status } = await axiosCrypto.put(
      `/client/ticketLock`,
      JSON.stringify(payload),
    )
    if (status === 201) return data
    throw new Error('Error updating ticket lock')
  } catch (e) {
    console.error(e)
    throw e
  }
}

// CRITICAL FOR DRAWER (Fetching specific row data + values)
const getProcess = async (
  workflowId: number | string,
  processId: number | string,
  transactionId: number | string,
) => {
  try {
    const { data, status } = await axiosCrypto.get(
      `/transaction/rowInfo/${workflowId}/${processId}/${transactionId}`,
    )
    if (status === 200) return data
    throw new Error('Error fetching process details')
  } catch (e) {
    console.error(e)
    throw e
  }
}

const getWorkflowRecommendation = async (
  workflowId: number | string,
  processId: number | string,
  transactionId: number | string,
) => {
  try {
    const { data, status } = await axiosCrypto.get(
      `/workflow/workflowSummary/${workflowId}/${processId}/${transactionId}`,
    )
    if (status === 200) return data
    throw new Error('Error fetching recommendation')
  } catch (e) {
    console.error(e)
    throw e
  }
}

const calculateAge = async (
  workflowId: number | string,
  processId: number | string,
) => {
  try {
    const { data, status } = await axiosCrypto.get(
      `/client/calculateAge/${workflowId}/${processId}`,
    )
    if (status === 200) return data
    throw new Error('Error calculating age')
  } catch (e) {
    console.error(e)
    throw e
  }
}

const getProductListFrank = async (fId: any, eId: any) => {
  try {
    const { data, status } = await axiosCrypto.get(
      `/client/fm/existProductList/${fId}/${eId}`,
    )
    if (status === 200) return data
    throw new Error('Error fetching product list')
  } catch (e) {
    console.error(e)
    throw e
  }
}

const uploadDocumentCheckList = async (payload: any) => {
  try {
    const { data, status } = await axiosCrypto.post(
      '/form/NewdocumentCheckList',
      JSON.stringify(payload),
    )
    if (status === 201) return data
    throw new Error('Error uploading checklist')
  } catch (e) {
    console.error(e)
    throw e
  }
}

const workflowList = async (payload: any) => {
  try {
    const { data, status } = await axiosCrypto.post(
      '/ai/workflowList',
      JSON.stringify(payload),
    )
    if (status === 200) return data
    throw new Error('Error fetching workflow AI list')
  } catch (e) {
    console.error(e)
    throw e
  }
}

const getDocumentListAll = async (payload: any) => {
  try {
    const { data, status } = await axiosCrypto.post(
      '/form/documentchecklist/all',
      JSON.stringify(payload),
    )
    if (status === 200) return data
    throw new Error('Error fetching document list')
  } catch (e) {
    console.error(e)
    throw e
  }
}

const getDocumentList = async (
  workflowId: number | string,
  processId: number | string,
) => {
  try {
    const { data, status } = await axiosCrypto.get(
      `/form/getdocumentchecklistById/${workflowId}/${processId}`,
    )
    if (status === 200) return data
    throw new Error('Error fetching document list by ID')
  } catch (e) {
    console.error(e)
    throw e
  }
}

const updateCheckList = async (id: number | string, payload: any) => {
  try {
    const { data, status } = await axiosCrypto.put(
      `/form/editdocumentchecklist/${id}`,
      JSON.stringify(payload),
    )
    if (status === 202) return data
    throw new Error('Error updating checklist')
  } catch (e) {
    console.error(e)
    throw e
  }
}

const getPrompt = async (payload: any) => {
  try {
    const { data, status } = await axiosCrypto.post(
      '/ai/getJsonbyPrompt',
      JSON.stringify(payload),
    )
    if (status === 200) return data
    throw new Error('Error fetching prompt')
  } catch (e) {
    console.error(e)
    throw e
  }
}

const getMainProcessDetails = async (
  wId: number | string,
  pId: number | string,
) => {
  try {
    const { data, status } = await axiosCrypto.get(
      `workflow/getDetailsforMainworkflow/${wId}/${pId}`,
    )
    if (status === 200) return data
    throw new Error('Error fetching main process details')
  } catch (e) {
    console.error(e)
    throw e
  }
}

const linkedRequestedTicket = async (payload: any) => {
  try {
    const { data, status } = await axiosCrypto.post(
      `workflow/linkedRequestedTicket`,
      JSON.stringify(payload),
    )
    if (status === 200) return data
    throw new Error('Error linking ticket')
  } catch (e) {
    console.error(e)
    throw e
  }
}

const getLinkedRequestDetails = async (
  wId: number | string,
  pId: number | string,
) => {
  try {
    const { data, status } = await axiosCrypto.get(
      `workflow/getDetailoflinkedProcess/${wId}/${pId}`,
    )
    if (status === 200) return data
    throw new Error('Error fetching linked details')
  } catch (e) {
    console.error(e)
    // Handle 'No Records' specifically if needed, or let query handle empty
    throw e
  }
}

const deleteLinkedProcessId = async (
  wId: number | string,
  pId: number | string,
  linkedProcessId: number | string,
) => {
  try {
    const { data, status } = await axiosCrypto.delete(
      `workflow/removeLinkedProcess/${wId}/${pId}/${linkedProcessId}`,
    )
    if (status === 200) return data
    throw new Error('Error deleting linked process')
  } catch (e) {
    console.error(e)
    throw e
  }
}

const getDocumentListPost = async (Wid: number | string, payload: any) => {
  try {
    const { data, status } = await axiosCrypto.post(
      `/form/getdocumentchecklist/all/${Wid}`,
      JSON.stringify(payload),
    )
    if (status === 200) return data
    throw new Error('Error fetching document list post')
  } catch (e) {
    console.error(e)
    throw e
  }
}

const updateVerifyStatus = async (payload: any) => {
  try {
    const { data, status } = await axiosCrypto.post(
      `/workflow/updateAttachmentVerifyStatus`,
      JSON.stringify(payload),
    )
    if (status === 200) return data
    throw new Error('Error updating verify status')
  } catch (e) {
    console.error(e)
    throw e
  }
}

const getOcrTemplate = async (payload: any) => {
  try {
    const { data, status } = await axiosCrypto.post(
      `/OCR/getOCRTemplate`,
      payload,
    )
    if (status === 200) return data
    throw new Error('Error fetching OCR template')
  } catch (e) {
    console.error(e)
    throw e
  }
}

// Use this for getting Form Definitions (Logic inferred from useRequestDetail needs)
const getForm = async (formId: number | string) => {
  try {
    // Assuming a standard endpoint for fetching form json by ID based on your workflow patterns
    // If you don't have this exact endpoint, use the one that returns formJson
    const { data, status } = await axiosV6.get(`/form/${formId}`)
    if (status === 200) return data
    throw new Error('Error fetching form')
  } catch (e) {
    console.error(e)
    throw e
  }
}

// --- EXPORT OBJECT ---

export const requestApi = {
  addSubWorkflow,
  calculateAge,
  createWorkflow,
  deleteLinkedProcessId,
  documentMerge,
  edtSubWorkflow,
  groupRequestAction,
  insertProcessComment,
  insertProcessComment_Jira,
  insertTaskEntry,
  linkedRequestedTicket,
  overviewChart,
  overviewTableReport,
  processHistory,
  processTransaction,
  reopenRequest,
  resendMail,
  saveProcessSignature,
  updateCheckList,
  updateRequestReserved,
  updateVerifyStatus,
  updateWorkflow,
  uploadDocumentCheckList,
  workflowList,
  // Existing
  getAllRequests,
  getAttachments,
  getCommonList,
  getCompletedListTest,
  getCompletedRequestById,
  getDocumentList,
  getDocumentListAll,
  getDocumentListPost,
  getForm, // Added helper
  getInboxListAgent,
  getInboxListById,
  getInboxListTest,
  getKanbanViewSettings,
  getLinkedRequestDetails,
  getMailTransactions,
  getMainProcessDetails,
  getMyInboxList,
  getOcrTemplate,
  getPaymentList,
  getProcess,
  getProcessComments,
  getProcessSignature,
  getProductListFrank,
  getPrompt,
  getSentListById,
  getSentListTest,
  getSubWorkflow,
  getTaskEntries,
  getUserMyInbox,
  getUserWorkflowTest,
  // New
  getWorkflow,
  getWorkflowList,
  getWorkflowRecommendation,
}

export default requestApi
