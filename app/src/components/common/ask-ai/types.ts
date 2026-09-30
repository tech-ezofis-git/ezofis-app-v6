export type AskAiActionContext = {
  [key: string]: unknown
  repositoryId?: number | string
  workflowId?: number | string
  workspaceId?: number | string
}

export type AskAiActionTo = 'Repository' | 'Workflow' | string

export type AskAiAnswer = {
  action?: {
    [key: string]: unknown
    browse_request?: AskAiBrowseRequest
  }
  actionContext?: AskAiActionContext
  actionTo?: AskAiActionTo
  conversation_id?: string
  conversationId?: string
  text: { blocks: AskAiTextBlock[] }
}

export type AskAiBrowseFilter = {
  arrayValue?: string[]
  condition?: string
  criteria?: string
  criteriaArray?: string[]
  dataType?: string
  id?: string
  value?: string
}

export type AskAiBrowseFilterGroup = {
  filters?: AskAiBrowseFilter[]
  groupCondition?: string
  id?: string
}

export type AskAiBrowseRequest = {
  contentSearchValue?: string
  currentPage?: number
  filterBy?: AskAiFilterBy
  fuzzy?: number
  groupBy?: string
  itemsPerPage?: number
  level?: number
  mode?: string
  parentNodeId?: number | string
  repositoryId?: number | string
  searchType?: number
  sortBy?: {
    criteria?: string
    order?: string
  }
}

export type AskAiCard = {
  description?: string
  fields?: AskAiField[]
  id?: Record<string, unknown> | string | number
  matchSource?: string | null
  subtitle?: string
  title?: string
  type?: string
}

export type AskAiCtaMode = 'navigate' | 'apply'

export type AskAiField = {
  label: string
  value: string | number
}

/** demo.ezofis.com filter groups, or cloud.ezofis.com flat key→value map */
export type AskAiFilterBy =
  | AskAiBrowseFilterGroup[]
  | Record<string, string | number | boolean | null | undefined>

export type AskAiPageContext = {
  actionFrom: string
  specificId: string
}

export type AskAiPendingAction = {
  /** When true, clear filters/search on leaving the target page (Ask AI only). */
  ephemeral?: boolean
  fileSearch?: string
  filters: Record<string, string>
  itemName?: string
  openItemId?: string
  repositoryId?: string
  repositoryLabel?: string
  target: 'Repository' | 'Workflow'
  workflowId?: string
}

export type AskAiTextBlock =
  | {
      text: string
      type: 'paragraph'
    }
  | {
      items?: AskAiField[]
      title?: string
      type: 'bullets'
      variant?: 'dot' | string
    }
  | ({
      type: 'card'
    } & AskAiCard)
  | {
      items?: AskAiCard[]
      title?: string
      type: 'cards'
    }
  | {
      items?: { name: string; repositoryId: string }[]
      title?: string
      type: 'repo_picker'
    }
