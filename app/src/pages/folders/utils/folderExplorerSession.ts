export const FOLDER_EXPLORER_SESSION_KEY = 'ezofis_folder_explorer_state'
export const FOLDER_ASK_AI_QUERY_MARKER = 'ezofis_folder_ask_ai_query'
export const FOLDER_ENTERING_FROM_OUTSIDE_KEY = 'ezofis_entering_folders'

export type FolderExplorerStoredState = {
  activeFolder?: string
  appView?: string
  expandedIds?: string[]
  fileFilters?: Record<string, string>
  fileSearch?: string
  filterSource?: 'ask-ai' | 'manual' | null
  folderFilters?: Record<string, string>
  folderSearch?: string
  pageSize?: number
  selectedFile?: string
  viewMode?: string
}

export function readFolderExplorerStoredState(): FolderExplorerStoredState | null {
  try {
    const raw = sessionStorage.getItem(FOLDER_EXPLORER_SESSION_KEY)
    return raw ? (JSON.parse(raw) as FolderExplorerStoredState) : null
  } catch {
    return null
  }
}

export function writeFolderExplorerStoredState(
  patch: Partial<FolderExplorerStoredState>,
) {
  try {
    const stored = readFolderExplorerStoredState() || {}
    sessionStorage.setItem(
      FOLDER_EXPLORER_SESSION_KEY,
      JSON.stringify({ ...stored, ...patch }),
    )
  } catch {
    // ignore
  }
}

/** Chatbot-applied folder search/filters — cleared when leaving /folders. */
export function markFolderExplorerAskAiQuery() {
  try {
    sessionStorage.setItem(FOLDER_ASK_AI_QUERY_MARKER, '1')
    writeFolderExplorerStoredState({ filterSource: 'ask-ai' })
  } catch {
    // ignore
  }
}

export function clearFolderExplorerAskAiQueryMarker() {
  try {
    sessionStorage.removeItem(FOLDER_ASK_AI_QUERY_MARKER)
  } catch {
    // ignore
  }
}

export function hasFolderExplorerAskAiQueryMarker() {
  try {
    return sessionStorage.getItem(FOLDER_ASK_AI_QUERY_MARKER) === '1'
  } catch {
    return false
  }
}

/** Remove Ask AI search/filters from session storage (sidebar navigation away). */
export function clearAskAiFolderExplorerQuery() {
  try {
    const stored = readFolderExplorerStoredState()
    const fromAskAi =
      stored?.filterSource === 'ask-ai' || hasFolderExplorerAskAiQueryMarker()

    // Manual filters/search must survive sidebar navigation.
    if (!fromAskAi) return

    sessionStorage.setItem(
      FOLDER_EXPLORER_SESSION_KEY,
      JSON.stringify({
        ...stored,
        fileFilters: {},
        fileSearch: '',
        filterSource: null,
        folderFilters: {},
        folderSearch: '',
      }),
    )
    clearFolderExplorerAskAiQueryMarker()
  } catch {
    // ignore
  }
}
