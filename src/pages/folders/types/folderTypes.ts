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
  infoCards: InfoCardData[]
  lineItems: Array<Record<string, string>>
  tabs: {
    comments: Array<{ author: string; date: string; message: string }>
    relatedDocs: Array<{ name: string; status: string; type: string }>
    timeline: Array<{ iconKey: string; subtitle: string; title: string }>
  }
  alert?: { badge: string; subtitle: string; title: string }
  fileUrl?: string
}
export type ExplorerView = 'list' | 'grid'
export interface FileItem {
  date: string
  id: string
  name: string
  ocr: number
  status: string
  type: string
  amount?: string
  fileUrl?: string
  invoiceNo?: string
  poNo?: string
  risk?: 'low' | 'medium' | 'high'
  source?: string
  supplier?: string
}
export interface FolderItem {
  id: string
  itemsText: string
  modifiedText: string
  sizeText: string
  title: string
  iconKey?: string
}
export interface InfoCardData {
  iconKey: string
  id: string
  rows: KeyValue[]
  title: string
}
export interface KeyValue {
  label: string
  value: string
}
export interface MetadataSection {
  fields: Array<{
    key: string
    label: string
    options?: string[]
    required?: boolean
    type: 'text' | 'date' | 'select'
    value: string
  }>
  id: string
  title: string
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
  id: string
  title: string
  children?: TreeNode[]
  iconKey?: string
  parentId?: string
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
