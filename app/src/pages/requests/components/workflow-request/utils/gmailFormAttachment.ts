import { extractBlocks } from '@/pages/requests/utils/workflow.utils'
import { isFieldHidden } from './fieldRendering'

export interface StoredFormFileValue {
  fileName: string
  itemId: string
  repositoryId: string
  fileId?: string
}

const asScalar = (value: unknown): string => {
  if (value == null) return ''
  if (typeof value === 'object') return ''
  return String(value).trim()
}

const blockToolType = (block: any): string =>
  asScalar(
    block?.data?.toolType ||
      block?.toolType ||
      block?.settings?.mailInitiate?.connectorType ||
      block?.data?.mailInitiate?.connectorType,
  ).toLowerCase()

const blockConnectorId = (block: any): string =>
  asScalar(
    block?.data?.connectorId ??
      block?.settings?.mailInitiate?.connectorId ??
      block?.data?.mailInitiate?.connectorId ??
      block?.settings?.connectorId ??
      block?.data?.connection,
  )

const initiateByList = (block: any): string[] => {
  const raw = block?.settings?.initiateBy ?? block?.data?.initiateBy ?? []
  return (Array.isArray(raw) ? raw : [raw]).map((item) =>
    asScalar(item).toUpperCase(),
  )
}

export const getWorkflowRepositoryId = (
  workflow: any,
  extra?: unknown,
): string =>
  asScalar(extra) ||
  asScalar(workflow?.repositoryId) ||
  asScalar(workflow?.settings?.general?.initiateUsing?.repositoryId) ||
  asScalar(
    workflow?.workflowJson?.settings?.general?.initiateUsing?.repositoryId,
  )

export const isEmailStartedWorkflow = (workflow: any): boolean => {
  const initiateType = asScalar(
    workflow?.settings?.general?.initiateUsing?.type ||
      workflow?.workflowJson?.settings?.general?.initiateUsing?.type,
  ).toLowerCase()
  if (
    initiateType.includes('email') ||
    initiateType.includes('gmail') ||
    initiateType.includes('outlook')
  ) {
    return true
  }

  return extractBlocks(workflow).some((block: any) => {
    const toolType = blockToolType(block)
    const hasMailInitiate = Boolean(
      block?.settings?.mailInitiate || block?.data?.mailInitiate,
    )
    return (
      toolType.includes('gmail') ||
      toolType.includes('outlook') ||
      toolType.includes('email') ||
      hasMailInitiate ||
      initiateByList(block).includes('EMAIL')
    )
  })
}

export const isGmailStartedWorkflow = isEmailStartedWorkflow

export const isStartActivity = (
  workflow: any,
  activityId?: unknown,
): boolean => {
  const id = asScalar(activityId)
  if (!id) return false
  return extractBlocks(workflow).some((block: any) => {
    const type = asScalar(block?.type).toUpperCase()
    const toolType = blockToolType(block)
    const isStart =
      type === 'START' ||
      toolType.includes('gmail') ||
      toolType.includes('outlook')
    return isStart && asScalar(block?.id) === id
  })
}

// Request details (inbox/sent/completed) should bind the process attachment
// when the workflow is email-started, or when the current stage is not the
// initiate/START node.
export const shouldSeedFirstFileUploadFromAttachment = (
  workflow: any,
  activityId?: unknown,
): boolean =>
  isEmailStartedWorkflow(workflow) || !isStartActivity(workflow, activityId)

export const getFormPanels = (workflow: any): any[] => {
  const formJson = workflow?.formJson
  if (!formJson) return []
  if (Array.isArray(formJson.panels)) return formJson.panels
  if (Array.isArray(formJson?.formJson?.panels)) return formJson.formJson.panels
  if (typeof formJson === 'string') {
    try {
      const parsed = JSON.parse(formJson)
      return parsed?.panels || parsed?.formJson?.panels || []
    } catch {
      return []
    }
  }
  return []
}

export const isFileUploadField = (field: any): boolean => {
  const type = asScalar(field?.type)
    .toUpperCase()
    .replace(/[\s-]+/g, '_')
  return type === 'FILE_UPLOAD' || type === 'FILEUPLOAD'
}

export const getFirstFileUploadField = (panels: any[]): any | null => {
  for (const panel of panels || []) {
    for (const field of panel?.fields || []) {
      if (isFieldHidden(field)) continue
      if (isFileUploadField(field)) return field
    }
  }
  return null
}

export const hasStoredFileValue = (value: unknown): boolean => {
  if (!value || typeof value !== 'object') return false
  const entry = value as Record<string, unknown>
  const fileName = asScalar(entry.fileName || entry.name)
  const itemId = asScalar(entry.itemId || entry.fileId || entry.id)
  return Boolean(fileName && itemId)
}

const attachmentKey = (
  attachment:
    | {
        fileId?: unknown
        id?: unknown
        itemId?: unknown
      }
    | null
    | undefined,
): string =>
  asScalar(
    attachment?.itemId ??
      attachment?.fileId ??
      attachment?.id ??
      (attachment as { attachmentId?: unknown } | undefined)?.attachmentId,
  )

const attachmentReceivedAt = (
  attachment:
    | {
        createdAt?: unknown
        createdAtUtc?: unknown
        occurredAtUtc?: unknown
      }
    | null
    | undefined,
): number => {
  const raw = asScalar(
    attachment?.createdAtUtc ||
      attachment?.createdAt ||
      attachment?.occurredAtUtc,
  )
  if (!raw) return Number.POSITIVE_INFINITY
  const time = Date.parse(raw)
  return Number.isFinite(time) ? time : Number.POSITIVE_INFINITY
}

const isInitiateAttachment = (
  attachment:
    | {
        initiate?: unknown
      }
    | null
    | undefined,
): boolean => {
  const flag = attachment?.initiate
  if (flag === true || flag === 1) return true
  if (typeof flag !== 'string') return false
  return flag.toLowerCase() === 'true'
}

// Process attachments are usually newest-first. The form's first FILE_UPLOAD
// field should show the original incoming file (email initiate, or oldest).
export const getFirstReceivedAttachment = <T>(
  attachments: T[] | null | undefined,
): T | undefined => {
  if (!attachments?.length) return undefined

  const initiate = attachments.find((item) =>
    isInitiateAttachment(item as { initiate?: unknown }),
  )
  if (initiate) return initiate

  const ranked = [...attachments].sort((left, right) => {
    const timeDelta =
      attachmentReceivedAt(left as { createdAt?: unknown }) -
      attachmentReceivedAt(right as { createdAt?: unknown })
    if (timeDelta !== 0) return timeDelta

    const idA = Number(attachmentKey(left as { id?: unknown }))
    const idB = Number(attachmentKey(right as { id?: unknown }))
    if (Number.isFinite(idA) && Number.isFinite(idB) && idA !== idB) {
      return idA - idB
    }
    return 0
  })

  const hasKnownTime = ranked.some(
    (item) =>
      attachmentReceivedAt(item as { createdAt?: unknown }) !==
      Number.POSITIVE_INFINITY,
  )
  if (hasKnownTime) return ranked[0]

  const withNumericId = ranked.filter((item) =>
    Number.isFinite(Number(attachmentKey(item as { id?: unknown }))),
  )
  if (withNumericId.length > 0) return withNumericId[0]

  // Newest-first APIs with no dates/ids: last item is the first received.
  return attachments.at(-1)
}

/** Newest attachment (generated PDF, latest upload) — opposite of first received. */
export const getLatestAttachment = <T>(
  attachments: T[] | null | undefined,
): T | undefined => {
  if (!attachments?.length) return undefined

  const ranked = [...attachments].sort((left, right) => {
    const timeDelta =
      attachmentReceivedAt(right as { createdAt?: unknown }) -
      attachmentReceivedAt(left as { createdAt?: unknown })
    if (timeDelta !== 0) return timeDelta

    const idA = Number(attachmentKey(left as { id?: unknown }))
    const idB = Number(attachmentKey(right as { id?: unknown }))
    if (Number.isFinite(idA) && Number.isFinite(idB) && idA !== idB) {
      return idB - idA
    }
    return 0
  })

  const hasKnownTime = ranked.some(
    (item) =>
      attachmentReceivedAt(item as { createdAt?: unknown }) !==
      Number.POSITIVE_INFINITY,
  )
  if (hasKnownTime) {
    // Prefer a non-initiate file when one exists (generated doc vs inbound RFQ).
    const nonInitiate = ranked.find(
      (item) => !isInitiateAttachment(item as { initiate?: unknown }),
    )
    return nonInitiate || ranked[0]
  }

  const withNumericId = ranked.filter((item) =>
    Number.isFinite(Number(attachmentKey(item as { id?: unknown }))),
  )
  if (withNumericId.length > 0) {
    const nonInitiate = withNumericId.find(
      (item) => !isInitiateAttachment(item as { initiate?: unknown }),
    )
    return nonInitiate || withNumericId[0]
  }

  // Newest-first APIs: first list item is the most recent.
  const head = attachments[0]
  if (
    attachments.length > 1 &&
    isInitiateAttachment(head as { initiate?: unknown })
  ) {
    return (
      attachments.find(
        (item) => !isInitiateAttachment(item as { initiate?: unknown }),
      ) || head
    )
  }
  return head
}

export const attachmentToFormFileValue = (
  attachment:
    | {
        fileId?: unknown
        fileName?: string
        id?: unknown
        itemId?: unknown
        name?: string
        repositoryId?: unknown
      }
    | null
    | undefined,
  fallbackRepositoryId?: unknown,
): StoredFormFileValue | null => {
  if (!attachment) return null
  const itemId = asScalar(
    attachment.itemId ??
      attachment.fileId ??
      attachment.id ??
      (attachment as { attachmentId?: unknown }).attachmentId ??
      (attachment as { documentId?: unknown }).documentId,
  )
  const fileName = asScalar(attachment.fileName || attachment.name)
  const repositoryId = asScalar(attachment.repositoryId || fallbackRepositoryId)
  if (!itemId || !fileName) return null
  return { fileId: itemId, fileName, itemId, repositoryId }
}

export const seedGmailFirstFileUpload = (
  formModel: Record<string, any>,
  workflow: any,
  attachments: Parameters<typeof attachmentToFormFileValue>[0][],
  activityId?: unknown,
  fallbackRepositoryId?: unknown,
): Record<string, any> => {
  const firstField = getFirstFileUploadField(getFormPanels(workflow))
  if (!firstField) return formModel
  const fieldId = firstField.id || firstField.jsonId
  if (!fieldId) return formModel

  const stored = attachmentToFormFileValue(
    getFirstReceivedAttachment(attachments),
    getWorkflowRepositoryId(workflow, fallbackRepositoryId),
  )
  if (!stored) return formModel

  const current = formModel[fieldId]
  if (hasStoredFileValue(current)) {
    const currentId = asScalar(current.itemId || current.fileId || current.id)
    if (currentId === stored.itemId) return formModel
    // In-session pick that hasn't been persisted yet — don't clobber it.
    if (current.rawFile) return formModel
  }

  return { ...formModel, [fieldId]: stored }
}
