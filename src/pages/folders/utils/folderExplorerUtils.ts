import type { FolderItem, TreeNode } from '../types/folderTypes'
import {
  decodeRepositoryNodeId,
  encodeRepositoryNodeId,
  foldersToTreeNodes,
} from '../api/folderApi'

export const DEFAULT_PAGE_SIZE = 50
export const DEFAULT_FOLDER_PAGE_SIZE = 100
export const FOLDER_SEARCH_DEBOUNCE_MS = 350

export type FolderPageMeta = {
  hasMore: boolean
  nextCursor?: string | null
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}

export const updateTreeNode = (
  nodes: TreeNode[],
  id: string,
  updater: (node: TreeNode) => TreeNode,
): TreeNode[] =>
  nodes.map((node) => {
    if (node.id === id) return updater(node)
    if (node.children?.length) {
      return { ...node, children: updateTreeNode(node.children, id, updater) }
    }
    return node
  })

export const findPathToNode = (
  nodes: TreeNode[],
  targetId: string,
  path: string[] = [],
): string[] => {
  for (const node of nodes) {
    const currentPath = [...path, node.id]
    if (node.id === targetId) return currentPath

    if (node.children?.length) {
      const childPath = findPathToNode(node.children, targetId, currentPath)
      if (childPath.length) return childPath
    }
  }
  return []
}

export const findNodeById = (
  nodes: TreeNode[],
  targetId: string,
): TreeNode | null => {
  for (const node of nodes) {
    if (node.id === targetId) return node
    if (node.children?.length) {
      const found = findNodeById(node.children, targetId)
      if (found) return found
    }
  }
  return null
}

export const getChildIds = (node: TreeNode): string[] => {
  const children = node.children || []
  return children.flatMap((child) => [child.id, ...getChildIds(child)])
}

export const getRepositoryIdFromFolder = (folderId: string) => {
  const decoded = decodeRepositoryNodeId(folderId)
  if (decoded?.kind === 'repository') return decoded.repositoryId
  if (decoded?.kind === 'browsePath') return decoded.repositoryId
  if (decoded?.kind === 'browse') return decoded.repositoryId
  return ''
}

export const getRepositoryRootNodeId = (folderId: string, tree: TreeNode[]) => {
  const decoded = decodeRepositoryNodeId(folderId)

  if (decoded?.kind === 'repository') return folderId

  if (decoded?.kind === 'browsePath' || decoded?.kind === 'browse') {
    return encodeRepositoryNodeId({
      kind: 'repository',
      label: decoded.repositoryName,
      repositoryId: decoded.repositoryId,
    })
  }

  const firstRepository = tree.find((node) => !node.isStatic)
  return firstRepository?.id || folderId
}

export const getFolderPageMeta = (response: any): FolderPageMeta => {
  const candidate =
    response?.folderPage ||
    response?.foldersPage ||
    response?.groupPage ||
    response?.groups ||
    null

  const folderCount = response?.folders?.length || 0
  const pageSize = Number(candidate?.pageSize || DEFAULT_FOLDER_PAGE_SIZE)
  const totalCount = Number(candidate?.totalCount ?? folderCount)
  const page = Number(candidate?.page || 1)
  const totalPages = Math.max(
    1,
    Number(candidate?.totalPages || Math.ceil(totalCount / pageSize) || 1),
  )

  return {
    hasMore:
      folderCount < totalCount &&
      (page < totalPages || Boolean(candidate?.hasMore)),
    nextCursor: candidate?.nextCursor ?? null,
    page,
    pageSize,
    totalCount,
    totalPages,
  }
}

export const mergeFoldersById = (current: FolderItem[], next: FolderItem[]) => {
  const map = new Map<string, FolderItem>()
  current.forEach((folder) => map.set(folder.id, folder))
  next.forEach((folder) => map.set(folder.id, folder))
  return Array.from(map.values())
}

export const getFileId = (file: { [key: string]: any; id?: string }) =>
  String(
    file.id ||
      file.fileId ||
      file.documentId ||
      file.itemId ||
      file.FileId ||
      file.DocumentId ||
      file.ItemId ||
      file.fileName ||
      file.name ||
      '',
  )

export const syncTreeChildren = (
  tree: TreeNode[],
  folderId: string,
  childFolders: FolderItem[],
) => {
  const childNodes = foldersToTreeNodes(childFolders)
  return updateTreeNode(tree, folderId, (node) => ({
    ...node,
    children: childNodes,
    hasChildren: childNodes.length > 0,
    isLoaded: true,
    isLoading: false,
  }))
}
