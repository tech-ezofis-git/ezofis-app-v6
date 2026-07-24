export type AskAiActionTo = 'Repository' | 'Workflow' | string

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
  filterBy?: AskAiBrowseFilterGroup[]
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

export type AskAiActionContext = {
  repositoryId?: number | string
  workflowId?: number | string
  workspaceId?: number | string
  [key: string]: unknown
}

export type AskAiTextBlock =
  | {
      text: string
      type: 'paragraph'
    }
  | {
      items: Array<{ label: string; value: string | number }>
      title?: string
      type: 'bullets'
      variant?: 'dot' | string
    }
  | {
      fields: Array<{ label: string; value: string | number }>
      subtitle?: string
      title: string
      type: 'card'
    }

export type AskAiAnswer = {
  action?: {
    browse_request?: AskAiBrowseRequest
    [key: string]: unknown
  }
  actionContext?: AskAiActionContext
  actionTo?: AskAiActionTo
  conversationId?: string
  conversation_id?: string
  text: { blocks: AskAiTextBlock[] }
}

export type AskAiCtaMode = 'navigate' | 'apply'

export type AskAiPendingAction = {
  fileSearch?: string
  filters: Record<string, string>
  openItemId?: string
  repositoryId?: string
  repositoryLabel?: string
  target: 'Repository' | 'Workflow'
  workflowId?: string
}

export type AskAiPageContext = {
  actionFrom: string
  specificId: string
}
