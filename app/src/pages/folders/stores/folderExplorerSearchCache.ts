import type { FileItem, FolderItem, TreeNode } from '../types/folderTypes'
import { getFileId } from '../utils/folderExplorerUtils'

export type FolderExplorerSearchSnapshot = {
  activeFolder: string
  contextFilters: Record<string, string>
  files: FileItem[]
  folders: FolderItem[]
  /** Recently viewed files across folder navigations (capped). */
  recentFiles: FileItem[]
  repositoryId: string
  repositoryName: string
  tree: TreeNode[]
}

const MAX_RECENT_FILES = 500

let snapshot: FolderExplorerSearchSnapshot = {
  activeFolder: '',
  contextFilters: {},
  files: [],
  folders: [],
  recentFiles: [],
  repositoryId: '',
  repositoryName: '',
  tree: [],
}

const mergeRecentFiles = (
  previous: FileItem[],
  next: FileItem[],
): FileItem[] => {
  const map = new Map<string, FileItem>()
  for (const file of previous) {
    const id = getFileId(file)
    if (id) map.set(id, file)
  }
  for (const file of next) {
    const id = getFileId(file)
    if (id) map.set(id, file)
  }
  const merged = Array.from(map.values())
  if (merged.length <= MAX_RECENT_FILES) return merged
  return merged.slice(merged.length - MAX_RECENT_FILES)
}

export function setFolderExplorerSearchSnapshot(
  next: Omit<FolderExplorerSearchSnapshot, 'recentFiles'> & {
    recentFiles?: FileItem[]
  },
) {
  snapshot = {
    ...next,
    recentFiles: mergeRecentFiles(
      snapshot.recentFiles,
      next.files || next.recentFiles || [],
    ),
  }
}

export function getFolderExplorerSearchSnapshot(): FolderExplorerSearchSnapshot {
  return snapshot
}
