export interface AdminNotificationData {
  targetUserId?: string
  targetUserName?: string
}

export interface FolderNotificationData {
  repositoryId: string
  folderId?: string
  itemId?: string
  itemName?: string
}

export interface FormNotificationData {
  formId: string
  entryId?: string
  formName?: string
}

export interface NotificationActor {
  name: string
  avatarUrl?: string
  email?: string
  id?: string
}

export type NotificationCategory =
  | 'request.submitted'
  | 'request.assigned'
  | 'request.approved'
  | 'request.rejected'
  | 'request.commented'
  | 'request.reopened'
  | 'request.completed'
  | 'ocr.processing_completed'
  | 'ocr.discrepancy_found'
  | 'ocr.processing_failed'
  | 'signrequest.awaiting_signature'
  | 'signrequest.signed'
  | 'signrequest.cancelled'
  | 'signrequest.expiring_soon'
  | 'form.entry_submitted'
  | 'form.published'
  | 'folder.item_uploaded'
  | 'folder.item_shared'
  | 'folder.share_revoked'
  | 'folder.commented'
  | 'folder.security_changed'
  | 'ticket.created'
  | 'ticket.sync_failed'
  | 'admin.user_added'
  | 'admin.role_changed'

export type NotificationItem =
  | (NotificationBase & {
      category: Extract<NotificationCategory, `request.${string}`>
      data: RequestNotificationData
    })
  | (NotificationBase & {
      category: Extract<NotificationCategory, `ocr.${string}`>
      data: OcrNotificationData
    })
  | (NotificationBase & {
      category: Extract<NotificationCategory, `signrequest.${string}`>
      data: SignRequestNotificationData
    })
  | (NotificationBase & {
      category: Extract<NotificationCategory, `form.${string}`>
      data: FormNotificationData
    })
  | (NotificationBase & {
      category: Extract<NotificationCategory, `folder.${string}`>
      data: FolderNotificationData
    })
  | (NotificationBase & {
      category: Extract<NotificationCategory, `ticket.${string}`>
      data: TicketNotificationData
    })
  | (NotificationBase & {
      category: Extract<NotificationCategory, `admin.${string}`>
      data: AdminNotificationData
    })

export type NotificationSeverity =
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'workflow'

export interface NotificationTarget {
  route:
    | 'requests'
    | 'folders'
    | 'sign-request'
    | 'form-builder'
    | 'form-entries'
    | 'settings'
    | 'support-tickets'
  params?: Record<string, string>
  search?: Record<string, string | number | boolean>
}

export interface OcrNotificationData extends RequestNotificationData {
  jobId: string
  discrepancyCount?: number
  fileName?: string
}

export interface RequestNotificationData {
  processId: string
  workflowId: string | number
  activityId?: string | number
  requestNo?: string
  stageName?: string
  tab?: 'Details' | 'History' | 'Comments' | 'Attachments'
  /** Transaction id for requestApi.getProcess; defaults to processId when absent. */
  transactionId?: string
}

export interface SignRequestNotificationData {
  inviteToken: string
  signRequestId: string
  documentName?: string
  expiresAtUtc?: string
}

export interface TicketNotificationData {
  ticketId: string
  jiraSynced?: boolean
}

interface NotificationBase {
  category: NotificationCategory
  createdAtUtc: string
  id: string
  isRead: boolean
  message: string
  severity: NotificationSeverity
  target: NotificationTarget
  title: string
  actor?: NotificationActor
  priority?: 'low' | 'normal' | 'high'
}
