import dayjs from 'dayjs'
import type { FolderItem, TreeNode } from '../types/folderTypes'
import {
  decodeRepositoryNodeId,
  encodeRepositoryNodeId,
  foldersToTreeNodes,
} from '../api/folderApi'
import { getRepositoryFieldStringValue } from './repositoryFieldUtils'

export const DEFAULT_PAGE_SIZE = 50
export const DEFAULT_FOLDER_PAGE_SIZE = 100
export const FOLDER_SEARCH_DEBOUNCE_MS = 350

/** Matches FolderTable visibility: files hide when there are 10+ folders. */
export const FOLDER_FILES_SECTION_MAX_FOLDERS = 10

export type FolderFilterOption = { label: string; value: string }

export type FolderFilterOptionsCache = Record<string, FolderFilterOption[]>

/** Display folder modified timestamps as local DD-MM-YYYY (e.g. 23-07-2026). */
export function formatFolderModifiedDate(value?: string | null) {
  const raw = String(value || '').trim()
  if (!raw || raw === '-') return '-'

  const cleaned = raw.replace(/^modified\s+/i, '')
  const parsed = dayjs(cleaned)
  if (!parsed.isValid()) return raw

  return parsed.format('DD-MMM-YYYY')
}

/**
 * Format repository date/datetime cell values as DD-MM-YYYY (no time).
 * Accepts ISO strings, "YYYY-MM-DD HH:mm:ss.SS", etc.
 */
export function formatRepositoryDateDisplay(value?: unknown) {
  if (value === undefined || value === null || value === '') return '-'
  const raw = String(value).trim()
  if (!raw || raw === '-') return '-'

  const parsed = dayjs(raw)
  if (parsed.isValid()) return parsed.format('DD-MM-YYYY')

  // Fallback for "2024-05-24 16:35:59.00" when dayjs needs a tweak
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (match) return `${match[3]}-${match[2]}-${match[1]}`

  return raw
}
/** True for repository DATE / DATE_TIME (and loose "date" keys). */
export function isRepositoryDateDataType(dataType?: string | null) {
  const normalized = String(dataType || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '')
  return (
    normalized === 'date' ||
    normalized === 'datetime' ||
    normalized === 'timestamp'
  )
}

const normalizeFilterOptionKey = (value: string) =>
  String(value || '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

export const mergeFilterOptionLists = (
  ...optionLists: Array<FolderFilterOption[]>
): FolderFilterOption[] => {
  const map = new Map<string, FolderFilterOption>()
  optionLists.flat().forEach((option) => {
    const value = String(option.value || '').trim()
    if (!value) return
    const key = value.toLowerCase()
    if (!map.has(key)) map.set(key, { label: option.label || value, value })
  })
  return Array.from(map.values()).sort((left, right) =>
    left.label.localeCompare(right.label),
  )
}

export const extractFolderFilterOptionsFromFolders = (
  folders: FolderItem[] = [],
): FolderFilterOptionsCache => {
  const cache: FolderFilterOptionsCache = {}

  folders.forEach((folder) => {
    const decoded = decodeRepositoryNodeId(folder.id)
    if (!decoded || decoded.kind !== 'browse') return

    const fieldKey = normalizeFilterOptionKey(decoded.groupField)
    if (!fieldKey) return

    const value = String(
      decoded.groupValue || folder.title || decoded.label || '',
    ).trim()
    if (!value) return

    cache[fieldKey] = mergeFilterOptionLists(cache[fieldKey] || [], [
      { label: value, value },
    ])
  })

  return cache
}

export const mergeFolderFilterOptionsCache = (
  ...caches: Array<FolderFilterOptionsCache | undefined>
): FolderFilterOptionsCache => {
  return caches.reduce<FolderFilterOptionsCache>((previous, incoming = {}) => {
    const next: FolderFilterOptionsCache = { ...previous }

    Object.entries(incoming).forEach(([fieldKey, options]) => {
      next[fieldKey] = mergeFilterOptionLists(previous[fieldKey] || [], options)
    })

    return next
  }, {})
}

export const getCachedFilterOptionsForId = (
  cache: FolderFilterOptionsCache = {},
  filterId: string,
): FolderFilterOption[] => {
  const normalizedFilterId = normalizeFilterOptionKey(filterId)
  if (cache[normalizedFilterId]?.length) return cache[normalizedFilterId]

  const matchedEntry = Object.entries(cache).find(
    ([fieldKey]) => normalizeFilterOptionKey(fieldKey) === normalizedFilterId,
  )

  return matchedEntry?.[1] || []
}

export const extractFolderTableFilterOptionsFromFolders = (
  folders: FolderItem[] = [],
): FolderFilterOptionsCache => {
  const cache: FolderFilterOptionsCache = {}
  const specs = [
    {
      id: '__folderName',
      getValue: (folder: FolderItem) => String(folder.title || '').trim(),
    },
    {
      id: '__folderItems',
      isValid: (value: string) => Boolean(value) && value !== '-',
      getValue: (folder: FolderItem) => String(folder.itemsText || '').trim(),
    },
    {
      id: '__folderModified',
      isValid: (value: string) => Boolean(value) && value !== '-',
      getValue: (folder: FolderItem) =>
        formatFolderModifiedDate(folder.modifiedText),
    },
  ] as const

  specs.forEach((spec) => {
    const { id, getValue } = spec
    const isValid = 'isValid' in spec ? spec.isValid : undefined
    const options = folders
      .map(getValue)
      .filter((value) => (isValid ? isValid(value) : Boolean(value)))
      .map((value) => ({ label: value, value }))

    if (!options.length) return

    cache[normalizeFilterOptionKey(id)] = mergeFilterOptionLists([], options)
  })

  return cache
}

const FILE_OPTION_HIDDEN_KEYS = new Set([
  'id',
  'raw',
  'storageproviderid',
  'storageprovidercode',
  'hasfilepath',
  'filename',
  'name',
  '__name',
  'fileversion',
  'ocrpercent',
  'workflowinstanceid',
])

export const discoverFileFieldKeys = (
  files: Array<Record<string, any>> = [],
  columns: Array<{ key?: string; label?: string }> = [],
) => {
  const keys = new Set<string>()

  columns.forEach((column) => {
    if (column.key) keys.add(column.key)
    if (column.label) keys.add(column.label)
  })

  files.forEach((file) => {
    Object.keys(file || {}).forEach((key) => {
      if (!FILE_OPTION_HIDDEN_KEYS.has(normalizeFilterOptionKey(key))) {
        keys.add(key)
      }
    })
  })

  return Array.from(keys)
}

export const buildFilterOptionsCacheFromData = ({
  columns = [],
  files = [],
  folders = [],
}: {
  columns?: Array<{ key?: string; label?: string }>
  files?: Array<Record<string, any>>
  folders?: FolderItem[]
}): FolderFilterOptionsCache =>
  mergeFolderFilterOptionsCache(
    extractFolderFilterOptionsFromFolders(folders),
    extractFolderTableFilterOptionsFromFolders(folders),
    extractFileFilterOptionsFromFiles(
      files,
      discoverFileFieldKeys(files, columns),
    ),
  )

export const extractFileFilterOptionsFromFiles = (
  files: Array<Record<string, any>> = [],
  fieldKeys: string[] = [],
): FolderFilterOptionsCache => {
  const cache: FolderFilterOptionsCache = {}
  if (!files.length || !fieldKeys.length) return cache

  fieldKeys.forEach((fieldKey) => {
    const normalizedFieldKey = normalizeFilterOptionKey(fieldKey)
    if (!normalizedFieldKey) return

    const options = files
      .map((file) => getRepositoryFieldStringValue(file, fieldKey))
      .filter((value) => value.length > 0)
      .map((value) => ({ label: value, value }))

    if (!options.length) return
    cache[normalizedFieldKey] = mergeFilterOptionLists(
      cache[normalizedFieldKey] || [],
      options,
    )
  })

  return cache
}

export type ExplorerFilterMode = 'folders' | 'files' | 'both' | 'none'

export const getExplorerSectionVisibility = ({
  filesLength,
  folderSearch = '',
  foldersLength,
  hasActiveFileFilters = false,
  hasActiveFolderFilters = false,
  loading = false,
  loadingFolders = false,
  loadingPage = false,
}: {
  filesLength: number
  folderSearch?: string
  foldersLength: number
  hasActiveFileFilters?: boolean
  hasActiveFolderFilters?: boolean
  loading?: boolean
  loadingFolders?: boolean
  loadingPage?: boolean
}) => {
  const showFoldersSection =
    foldersLength > 0 ||
    Boolean(folderSearch.trim()) ||
    loadingFolders ||
    hasActiveFolderFilters

  const showFilesSection =
    ((filesLength > 0 || loading || loadingPage) &&
      foldersLength < FOLDER_FILES_SECTION_MAX_FOLDERS) ||
    (hasActiveFileFilters && foldersLength < FOLDER_FILES_SECTION_MAX_FOLDERS)

  return { showFilesSection, showFoldersSection }
}

export const getExplorerFilterMode = (visibility: {
  showFilesSection: boolean
  showFoldersSection: boolean
}): ExplorerFilterMode => {
  const { showFilesSection, showFoldersSection } = visibility
  if (showFoldersSection && showFilesSection) return 'both'
  if (showFilesSection) return 'files'
  if (showFoldersSection) return 'folders'
  return 'none'
}

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

/** Resolve the sidebar tree node id for a repository GUID (label-safe). */
export const findRepositoryNodeId = (
  tree: TreeNode[],
  repositoryId: string,
): string => {
  const target = String(repositoryId || '')
    .trim()
    .toLowerCase()
  if (!target) return ''

  const walk = (nodes: TreeNode[]): string => {
    for (const node of nodes) {
      const decoded = decodeRepositoryNodeId(node.id)
      if (
        decoded?.kind === 'repository' &&
        String(decoded.repositoryId || '')
          .trim()
          .toLowerCase() === target
      ) {
        return node.id
      }
      if (node.children?.length) {
        const nested = walk(node.children)
        if (nested) return nested
      }
    }
    return ''
  }

  return walk(tree)
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

export const mergeFilesById = <T extends Record<string, any>>(
  current: T[],
  next: T[],
): T[] => {
  const map = new Map<string, T>()
  current.forEach((file) => {
    const id = getFileId(file)
    if (id) map.set(id, file)
  })
  next.forEach((file) => {
    const id = getFileId(file)
    if (id) map.set(id, file)
  })
  return Array.from(map.values())
}

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
