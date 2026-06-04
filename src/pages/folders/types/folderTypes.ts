export interface AiSummaryData {
  checks: Array<{ iconKey: string; label: string; status: string }>
  confidence: number
  documentId: string
  engineSubtitle: string
  engineTitle: string
  facts: Array<{ label: string; value: string }>
  insight: string
  recommendations: string[]
  summary: string
}
export type AppView =
  | 'explorer'
  | 'documents'
  | 'details'
  | 'editMetadata'
  | 'aiSummary'
  | 'share'
  | 'workflow'

export interface DocumentDetail {
  documentId: string
  fileName: string
  fileType: string
  infoCards: Array<{
    iconKey: string
    id: string
    rows: Array<{ label: string; value: string }>
    title: string
  }>
  lineItems: Record<string, string>[]
  tabs: {
    comments: Array<{ author: string; date: string; message: string }>
    relatedDocs: Array<{ name: string; status: string; type: string }>
    timeline: Array<{ iconKey: string; subtitle: string; title: string }>
  }
  alert?: { badge: string; subtitle: string; title: string }
  fileUrl?: string
}

export type ExplorerView = 'grid' | 'list'

export interface FileItem {
  [key: string]: any
  id: string
  name: string
  status: string
  type: string
  amount?: string
  date?: string
  fileUrl?: string
  invoiceNo?: string
  ocr?: number
  poNo?: string
  risk?: string
  source?: string
  supplier?: string
}

export interface FolderItem {
  iconKey: string
  id: string
  itemsText: string
  title: string
  hasChildren?: boolean
  modifiedText?: string
  sizeText?: string
}

export interface MetadataSection {
  fields: Array<{
    key: string
    label: string
    options?: string[]
    required?: boolean
    type: string
    value: string
  }>
  id: string
  title: string
}

export interface RepositoryFilePage {
  hasMore: boolean
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
  nextCursor?: string | null
}

export interface ShareData {
  documentId: string
  invitePermissions: string[]
  link: string
  permissions: Array<{ iconKey: string; label: string; text: string }>
  sharedWith: Array<{
    date: string
    email: string
    initials: string
    name: string
    permission: string
  }>
}

export interface TreeNode {
  iconKey: string
  id: string
  title: string
  children?: TreeNode[]
  filePage?: RepositoryFilePage
  hasChildren?: boolean
  isLoaded?: boolean
  isLoading?: boolean
  isStatic?: boolean
}

export interface WorkflowData {
  approvers: Array<{ id: string; name: string }>
  document: {
    amount: string
    date: string
    name: string
    status: string
    supplier: string
  }
  documentId: string
  priorities: string[]
  templates: Array<{
    description: string
    eta: string
    id: string
    levels: string
    recommended?: boolean
    title: string
  }>
}
