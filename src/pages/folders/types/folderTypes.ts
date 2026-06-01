export type ExplorerView = 'grid' | 'list'
export type AppView = 'explorer' | 'documents' | 'details' | 'editMetadata' | 'aiSummary' | 'share' | 'workflow'

export interface TreeNode {
  id: string
  title: string
  iconKey: string
  children?: TreeNode[]
  hasChildren?: boolean
  isLoaded?: boolean
  isLoading?: boolean
  isStatic?: boolean
  filePage?: RepositoryFilePage
}

export interface RepositoryFilePage {
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
  hasMore: boolean
  nextCursor?: string | null
}

export interface FolderItem {
  id: string
  title: string
  iconKey: string
  itemsText: string
  modifiedText?: string
  sizeText?: string
  hasChildren?: boolean
}

export interface FileItem {
  id: string
  name: string
  type: string
  supplier?: string
  invoiceNo?: string
  poNo?: string
  date?: string
  amount?: string
  status: string
  ocr?: number
  risk?: string
  source?: string
  fileUrl?: string
  [key: string]: any
}

export interface DocumentDetail {
  documentId: string
  fileName: string
  fileType: string
  fileUrl?: string
  alert?: { title: string; subtitle: string; badge: string }
  infoCards: Array<{
    id: string
    title: string
    iconKey: string
    rows: Array<{ label: string; value: string }>
  }>
  lineItems: Record<string, string>[]
  tabs: {
    timeline: Array<{ title: string; subtitle: string; iconKey: string }>
    comments: Array<{ author: string; date: string; message: string }>
    relatedDocs: Array<{ name: string; type: string; status: string }>
  }
}

export interface MetadataSection {
  id: string
  title: string
  fields: Array<{
    key: string
    label: string
    type: string
    value: string
    required?: boolean
    options?: string[]
  }>
}

export interface AiSummaryData {
  documentId: string
  engineTitle: string
  engineSubtitle: string
  confidence: number
  summary: string
  facts: Array<{ label: string; value: string }>
  checks: Array<{ label: string; status: string; iconKey: string }>
  recommendations: string[]
  insight: string
}

export interface ShareData {
  documentId: string
  invitePermissions: string[]
  sharedWith: Array<{
    initials: string
    name: string
    email: string
    permission: string
    date: string
  }>
  link: string
  permissions: Array<{ label: string; text: string; iconKey: string }>
}

export interface WorkflowData {
  documentId: string
  document: {
    name: string
    supplier: string
    amount: string
    date: string
    status: string
  }
  templates: Array<{
    id: string
    title: string
    description: string
    levels: string
    eta: string
    recommended?: boolean
  }>
  approvers: Array<{ id: string; name: string }>
  priorities: string[]
}
