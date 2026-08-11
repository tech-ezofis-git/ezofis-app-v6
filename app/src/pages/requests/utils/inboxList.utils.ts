const getParsedFormDataFromItem = (item: any): Record<string, unknown> => {
  if (!item?.formData) return {}

  if (typeof item.formData === 'object') {
    return item.formData.fields || item.formData || {}
  }

  if (typeof item.formData === 'string') {
    try {
      const parsed = JSON.parse(item.formData)
      return parsed.fields || parsed || {}
    } catch {
      return {}
    }
  }

  return {}
}

export const getAgentDataFromItem = (item: any) => {
  if (item?._agentResponse && typeof item._agentResponse === 'object') {
    return item._agentResponse
  }

  if (Array.isArray(item?._agentData) && item._agentData.length > 0) {
    return item._agentData[0]
  }

  return item?._agentData || {}
}

export const getItemDecision = (item: any): string => {
  const agentData = getAgentDataFromItem(item)
  const parsedForm = getParsedFormDataFromItem(item)

  return String(
    parsedForm['2MH_BMDFEVKsU0uAQjoI1'] ||
      item?.review ||
      agentData?.decision ||
      item?.decision ||
      item?.status ||
      '',
  ).trim()
}

export const isRejectedInboxItem = (item: any): boolean => {
  const decision = getItemDecision(item).toUpperCase()
  const review = String(item?.review || '').toUpperCase()

  return (
    decision === 'REJECTED' ||
    decision === 'NO MATCH' ||
    decision.includes('REJECT') ||
    review.includes('REJECT')
  )
}

export const isDuplicatedInboxItem = (item: any): boolean => {
  if (item?.isDuplicateInvoice) return true

  const agentData = getAgentDataFromItem(item)
  if (agentData?.is_duplicate_invoice) return true

  const duplicateStatus = String(
    agentData?.duplicate_check?.status || '',
  ).toUpperCase()

  if (duplicateStatus === 'DUPLICATE' || duplicateStatus === 'DUPLICATED') {
    return true
  }

  const decision = getItemDecision(item).toUpperCase()
  return decision.includes('DUPLICATE') || decision.includes('DUPLICATED')
}

export const isNoAgentDataInboxItem = (item: any): boolean => {
  if (item?.isProcessing) return false

  const agentData = getAgentDataFromItem(item)
  const hasAgentPayload =
    Boolean(item?._agentResponse) ||
    (Array.isArray(item?._agentData) &&
      item._agentData.length > 0 &&
      agentData &&
      Object.keys(agentData).length > 0)

  if (hasAgentPayload) return false

  const stage = String(item?.stage || item?.stageType || '').toLowerCase()
  return stage.includes('no agent') || !hasAgentPayload
}

export const isExceptionInboxItem = (item: any): boolean =>
  isRejectedInboxItem(item) ||
  isDuplicatedInboxItem(item) ||
  isNoAgentDataInboxItem(item)

export const filterInboxItemsByTab = <T extends Record<string, any>>(
  items: T[],
  activeTab: string,
): T[] => {
  if (activeTab === 'Exceptions') {
    return items.filter(isExceptionInboxItem)
  }

  if (activeTab === 'Inbox') {
    // Show all invoices including exception items in the main Invoices (Inbox) tab
    return items
  }

  return items
}

export const countInboxSplit = (items: any[]) => {
  const exceptionsCount = items.filter(isExceptionInboxItem).length

  return {
    exceptionsCount,
    inboxTabCount: items.length, // Count includes all invoices (with exceptions)
  }
}
