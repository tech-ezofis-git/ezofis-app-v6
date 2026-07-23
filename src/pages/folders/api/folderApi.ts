import type { BreadcrumbItem } from '../components/Breadcrumbs'
import type {
  AiSummaryData,
  FileItem,
  FolderItem,
  MetadataSection,
  RepositoryFilePage,
  ShareData,
  TreeNode,
  WorkflowData,
} from '../types/folderTypes'
import {
  addRepositoryItemComment,
  authApiV6,
  type BrowseChildrenDto,
  type BrowseStructureDto,
  getRepositoryItemComments,
  getRepositoryItems,
  getRepositoryItemTimeline,
  getRepositoryItemWorkspace,
  type PagedDto,
  type RepositoryDto,
  type RepositoryFieldDto,
} from '../../../api/v6/folder/folder'
import { splitFilterValues } from '../utils/multiFilterValues'

export interface DynamicRepositoryColumn {
  key: string
  label: string
  dataType?: string
  fieldId?: string
  includeInFolderStructure?: boolean
  isMandatory?: boolean
  level?: number
}

export interface FolderContentRequest {
  append?: boolean
  cursor?: string | null
  /**
   * @deprecated Prefer folderFilters / fileFilters.
   * Kept as a fallback merged into both when specific props are omitted.
   */
  filters?: Record<string, string>
  /** UI filters for browse/children ParentFilters only */
  folderFilters?: Record<string, string>
  /** UI filters for repository items Filters only */
  fileFilters?: Record<string, string>
  /** Grid tree sync: skip file fetch when only loading folder children */
  includeFiles?: boolean
  /** List view: load all repository files without folder filters */
  listAllFiles?: boolean
  page?: number
  pageSize?: number
  /** @deprecated Prefer folderSearch / fileSearch */
  search?: string
  /** Search for browse/children */
  folderSearch?: string
  /** Search for repository items */
  fileSearch?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc' | string
}

const normalizeFilterKey = (key: string) =>
  String(key || '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

/** Prefer sqlColumnName (e.g. PONumber) as the Filters API key. */
const resolveApiFilterKey = (
  uiKey: string,
  fields: Array<{ name?: string; sqlColumnName?: string }> = [],
  fieldKeys: string[] = [],
): string => {
  const lookupKey = uiKey === '__status' ? 'status' : uiKey
  const normalizedLookup = normalizeFilterKey(lookupKey)

  for (const field of fields) {
    const sqlKey = String(field.sqlColumnName || '').trim()
    const nameKey = String(field.name || '').trim()
    const candidates = [sqlKey, nameKey].filter(Boolean)

    if (
      candidates.some(
        (candidate) => normalizeFilterKey(candidate) === normalizedLookup,
      )
    ) {
      return sqlKey || nameKey
    }
  }

  const matchedFieldKey = fieldKeys.find(
    (fieldKey) => normalizeFilterKey(fieldKey) === normalizedLookup,
  )
  if (matchedFieldKey) return matchedFieldKey

  if (lookupKey === 'status') return 'Status'

  // camelCase item keys (poNumber) → PascalCase API keys (PoNumber / PONumber-style)
  if (/^[a-z]/.test(lookupKey)) {
    return lookupKey.charAt(0).toUpperCase() + lookupKey.slice(1)
  }

  return lookupKey.replace(/\s+/g, '')
}

/** Map UI filter ids to API field names and drop empty values.
 * Multi-select values become a string array so the API can OR-match.
 */
export const buildApiFilters = (
  filters: Record<string, string> = {},
  fieldKeys: string[] = [],
  fields: Array<{ name?: string; sqlColumnName?: string }> = [],
): Record<string, string | string[]> => {
  const apiFilters: Record<string, string | string[]> = {}

  Object.entries(filters).forEach(([key, rawValue]) => {
    const parts = splitFilterValues(rawValue)
    if (!parts.length) return

    const apiKey = resolveApiFilterKey(key, fields, fieldKeys)
    if (!apiKey) return

    apiFilters[apiKey] = parts.length === 1 ? parts[0] : parts
  })

  return apiFilters
}

const mergeFilters = (
  ...groups: Array<Record<string, string | string[]> | undefined>
): Record<string, string | string[]> => {
  const merged: Record<string, string | string[]> = {}
  groups.forEach((group) => {
    Object.entries(group || {}).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        const parts = value.map((part) => String(part ?? '').trim()).filter(Boolean)
        if (parts.length) merged[key] = parts.length === 1 ? parts[0] : parts
        return
      }

      const trimmed = String(value ?? '').trim()
      if (trimmed) merged[key] = trimmed
    })
  })
  return merged
}

const FOLDER_TABLE_FILTER_IDS = new Set([
  '__folderName',
  '__folderItems',
  '__folderModified',
])

/** Folder-table-only filters (Name, Items, Date Modified) must not hit the items API. */
export const getFileRelevantFolderFilters = (
  folderFilters: Record<string, string> = {},
): Record<string, string> =>
  Object.fromEntries(
    Object.entries(folderFilters).filter(
      ([key, value]) =>
        !FOLDER_TABLE_FILTER_IDS.has(key) && Boolean(String(value ?? '').trim()),
    ),
  )

export const mergeFileExplorerFilters = (
  folderFilters: Record<string, string> = {},
  fileFilters: Record<string, string> = {},
) => ({
  ...getFileRelevantFolderFilters(folderFilters),
  ...fileFilters,
})

const buildFileUiFilters = (
  request: FolderContentRequest,
  fieldKeys: string[],
  fields: Array<{ name?: string; sqlColumnName?: string }>,
) => {
  const fileRelevantFolderFilters = getFileRelevantFolderFilters(
    request.folderFilters,
  )
  const explicitFileFilters = request.fileFilters ?? {}
  const legacyFilters =
    !request.folderFilters &&
    !request.fileFilters &&
    request.filters
      ? request.filters
      : {}

  return buildApiFilters(
    {
      ...fileRelevantFolderFilters,
      ...explicitFileFilters,
      ...legacyFilters,
    },
    fieldKeys,
    fields,
  )
}

type BrowseFolderNode = {
  groupField: string
  groupValue: string
  isLeaf?: boolean
  kind: 'browse'
  label: string
  level: number
  parentFilters: Record<string, string>
  pathId: string
  pathLabel?: string
  repositoryId: string
  repositoryName: string
}
type BrowsePathFolderNode = {
  kind: 'browsePath'
  label: string
  pathId: string
  repositoryId: string
  repositoryName: string
}
type FolderNodePayload =
  | RepositoryFolderNode
  | BrowsePathFolderNode
  | BrowseFolderNode
  | StaticFolderNode
type RepositoryFolderNode = {
  kind: 'repository'
  label: string
  repositoryId: string
}
type StaticFolderNode = {
  kind: 'static'
  label: string
  staticId: 'recent'
}

const structureCache = new Map<string, BrowseStructureDto>()

const getBrowseFolderFieldCount = (structure?: BrowseStructureDto | null) =>
  structure?.folderFields?.length ?? 0

const isBrowseLeafNode = (
  payload: FolderNodePayload,
  structure?: BrowseStructureDto | null,
) => {
  if (payload.kind !== 'browse') return false
  if (payload.isLeaf) return true

  const folderFieldCount = getBrowseFolderFieldCount(structure)
  if (!folderFieldCount) return false

  return Object.keys(payload.parentFilters).length >= folderFieldCount
}

const nodePrefix = 'repo-node:'
const defaultPage = 1
const defaultGroupPageSize = 100
const defaultItemPageSize = 50

export const encodeRepositoryNodeId = (payload: FolderNodePayload) => {
  const json = JSON.stringify(payload)
  const encoded =
    typeof window === 'undefined'
      ? Buffer.from(json, 'utf8').toString('base64')
      : window.btoa(unescape(encodeURIComponent(json)))
  return `${nodePrefix}${encoded}`
}

export const decodeRepositoryNodeId = (
  id: string,
): FolderNodePayload | null => {
  if (!id.startsWith(nodePrefix)) return null

  try {
    const raw = id.slice(nodePrefix.length)
    const json =
      typeof window === 'undefined'
        ? Buffer.from(raw, 'base64').toString('utf8')
        : decodeURIComponent(escape(window.atob(raw)))
    return JSON.parse(json) as FolderNodePayload
  } catch (error) {
    console.error('Invalid repository node id', error)
    return null
  }
}

/** Browse-path field values (Supplier, Document Type, etc.) for the active folder. */
export const getFolderContextFilters = (
  folderId: string,
): Record<string, string> => {
  const decoded = decodeRepositoryNodeId(folderId)
  if (!decoded || decoded.kind !== 'browse') return {}

  return Object.fromEntries(
    Object.entries(decoded.parentFilters).filter(
      ([, value]) => String(value ?? '').trim().length > 0,
    ),
  )
}

export const resolveCurrentFolderGroupField = (
  structure: { folderFields?: Array<{ level: number; name: string; sqlColumnName: string }> } | null | undefined,
  parentFilters: Record<string, string> = {},
  apiGroupField?: string,
) => {
  if (apiGroupField) return apiGroupField

  const folderFields = structure?.folderFields ?? []
  if (!folderFields.length) return ''

  const sorted = [...folderFields].sort((left, right) => left.level - right.level)
  const depth = Object.keys(parentFilters).length
  const field = sorted[depth]

  return field?.sqlColumnName || field?.name || ''
}

const getPagedData = <T>(paged: any): T[] => {
  if (Array.isArray(paged)) return paged
  if (Array.isArray(paged?.data)) return paged.data
  if (Array.isArray(paged?.items)) return paged.items
  return []
}

const toPage = (paged?: PagedDto<any> | null): RepositoryFilePage => {
  const totalCount = Number(paged?.totalCount ?? 0)
  const pageSize = Number(paged?.pageSize ?? defaultItemPageSize)
  const totalPagesFromApi = Number(paged?.totalPages ?? 0)

  return {
    hasMore: Boolean(paged?.hasMore),
    nextCursor: paged?.nextCursor ?? null,
    page: Math.max(1, Number(paged?.page ?? defaultPage)),
    pageSize,
    totalCount,
    totalPages: Math.max(
      1,
      totalPagesFromApi || Math.ceil(totalCount / pageSize),
    ),
  }
}

const toFileColumns = (
  fields: RepositoryFieldDto[] = [],
): DynamicRepositoryColumn[] =>
  fields
    .map((field, index) => ({ field, index }))
    .filter(({ field }) => field.sqlColumnName || field.name)
    .sort((a, b) => {
      const mandatoryDiff =
        Number(Boolean(b.field.isMandatory)) -
        Number(Boolean(a.field.isMandatory))
      if (mandatoryDiff !== 0) return mandatoryDiff
      return a.index - b.index
    })
    .map(({ field }) => ({
      dataType: field.dataType,
      fieldId: field.id,
      includeInFolderStructure: field.includeInFolderStructure,
      isMandatory: field.isMandatory,
      key: field.sqlColumnName || field.name,
      label: field.name || field.sqlColumnName,
      level: field.level,
    }))

const detailSectionIconMap: Record<string, string> = {
  aiAnalysis: 'bot',
  documentInfo: 'fileText',
  supplierDetails: 'building',
  systemInfo: 'settings',
}

const toWorkspaceDetail = (workspace: any): any => {
  const sections = Array.isArray(workspace?.DetailsRow)
    ? workspace.DetailsRow
    : []
  const lineItems = Array.isArray(workspace?.lineItems)
    ? workspace.lineItems
    : []

  return {
    alert: null,
    documentId: String(workspace?.id ?? ''),
    fileName: String(
      workspace?.fileName ?? workspace?.name ?? 'Untitled document',
    ),
    fileType: String(workspace?.fileType ?? 'pdf').toUpperCase(),
    fileUrl: workspace?.fileUrl || '',
    infoCards: sections
      .filter(
        (section: any) =>
          Array.isArray(section?.fields) && section.fields.length > 0,
      )
      .map((section: any, index: number) => ({
        iconKey: detailSectionIconMap[String(section.sectionKey)] || 'fileText',
        id: String(section.sectionKey || `section-${index}`),
        rows: section.fields
          .filter(
            (field: any) =>
              field &&
              field.value !== null &&
              field.value !== undefined &&
              field.value !== '',
          )
          .map((field: any) => ({
            label: String(field.label || field.key || '-'),
            value: String(field.value),
          })),
        title: String(
          section.title || section.sectionKey || `Section ${index + 1}`,
        ),
      }))
      .filter((card: any) => card.rows.length > 0),
    lineItems,
    tabs: { comments: [], relatedDocs: [], timeline: [] },
  }
}

const toFileItem = (row: Record<string, any>, index: number): FileItem => {
  const id = String(
    row.id ??
    row.Id ??
    row.itemId ??
    row.ItemId ??
    row.documentId ??
    row.DocumentId ??
    row.fileId ??
    row.FileId ??
    `file-${index}`,
  )

  return {
    id,
    ...(row as any),
  } as FileItem
}

const getRepositoryBrowseStructure = async (repositoryId: string) => {
  if (structureCache.has(repositoryId)) {
    return structureCache.get(repositoryId)!
  }

  const result = await authApiV6.getRepositoryBrowseStructure(repositoryId)
  if (result.error) throw new Error(String(result.error))

  const structure = (result.data || {
    browsePaths: [],
    folderFields: [],
  }) as BrowseStructureDto

  structureCache.set(repositoryId, structure)
  return structure
}

export const resolveFolderDisplayIcon = (
  title: string,
  iconKey?: string,
  level = 0,
) => {
  const normalizedTitle = (title || '').trim().toLowerCase()

  if (normalizedTitle === 'by supplier') return 'building'
  if (normalizedTitle === 'by document type') return 'fileText'
  if (normalizedTitle === 'email attachments') return 'mail'

  if (level >= 2) return 'folder'

  return iconKey || 'folder'
}

const toBrowsePathItem = (args: {
  label: string
  pathId: string
  repositoryId: string
  repositoryName: string
}): FolderItem => ({
  hasChildren: true,
  iconKey: resolveFolderDisplayIcon(args.label),
  id: encodeRepositoryNodeId({
    kind: 'browsePath',
    label: args.label,
    pathId: args.pathId,
    repositoryId: args.repositoryId,
    repositoryName: args.repositoryName,
  }),
  itemsText: '-',
  modifiedText: '-',
  sizeText: '-',
  title: args.label,
})

const buildFieldIconMap = (fields: Array<Record<string, any>> = []) => {
  const map = new Map<string, string>()

  fields.forEach((field) => {
    if (!field.includeInFolderStructure || !field.iconKey) return

    if (field.sqlColumnName) {
      map.set(String(field.sqlColumnName), String(field.iconKey))
    }

    if (field.name) {
      map.set(String(field.name), String(field.iconKey))
    }
  })

  return map
}

const toFolderItem = (args: {
  dateModified?: string | null
  groupField: string
  groupValue: string
  hasChildren?: boolean
  iconKey?: string
  isLeaf?: boolean
  itemCount?: number
  level: number
  parentFilters: Record<string, string>
  pathId: string
  pathLabel?: string
  repositoryId: string
  repositoryName: string
}): FolderItem => {
  const nextFilters = {
    ...args.parentFilters,
    [args.groupField]: args.groupValue,
  }

  return {
    hasChildren: args.hasChildren ?? true,
    iconKey: args.iconKey || 'folder',
    id: encodeRepositoryNodeId({
      groupField: args.groupField,
      groupValue: args.groupValue,
      isLeaf: args.isLeaf,
      kind: 'browse',
      label: args.groupValue,
      level: args.level,
      parentFilters: nextFilters,
      pathId: args.pathId,
      pathLabel: args.pathLabel,
      repositoryId: args.repositoryId,
      repositoryName: args.repositoryName,
    }),
    itemsText: `${args.itemCount ?? 0} items`,
    modifiedText: args.dateModified || '-',
    sizeText: '-',
    title: args.groupValue,
  }
}

const getRepositoryFields = async (
  repositoryId: string,
  fallback?: RepositoryDto,
) => {
  if (fallback?.fields?.length) return fallback.fields
  const result = await authApiV6.getRepositoryById(repositoryId)
  if (result.error) throw new Error(String(result.error))
  return (result.data as RepositoryDto)?.fields ?? []
}

const buildBreadcrumbs = (payload: FolderNodePayload): BreadcrumbItem[] => {
  if (payload.kind === 'static')
    return [{ id: encodeRepositoryNodeId(payload), label: payload.label }]

  if (payload.kind === 'repository') {
    return [{ id: encodeRepositoryNodeId(payload), label: payload.label }]
  }

  if (payload.kind === 'browsePath') {
    return [
      {
        id: encodeRepositoryNodeId({
          kind: 'repository',
          label: payload.repositoryName,
          repositoryId: payload.repositoryId,
        }),
        label: payload.repositoryName,
      },
      {
        id: encodeRepositoryNodeId(payload),
        label: payload.label,
      },
    ]
  }

  const crumbs: BreadcrumbItem[] = [
    {
      id: encodeRepositoryNodeId({
        kind: 'repository',
        label: payload.repositoryName,
        repositoryId: payload.repositoryId,
      }),
      label: payload.repositoryName,
    },
  ]

  if (payload.pathLabel) {
    crumbs.push({
      id: encodeRepositoryNodeId({
        kind: 'browsePath',
        label: payload.pathLabel,
        pathId: payload.pathId,
        repositoryId: payload.repositoryId,
        repositoryName: payload.repositoryName,
      }),
      label: payload.pathLabel,
    })
  }

  Object.entries(payload.parentFilters).forEach(
    ([field, value], index, entries) => {
      const filters = Object.fromEntries(entries.slice(0, index + 1))
      crumbs.push({
        id: encodeRepositoryNodeId({
          groupField: field,
          groupValue: value,
          isLeaf: index === entries.length - 1 ? payload.isLeaf : false,
          kind: 'browse',
          label: value,
          level: index + 1,
          parentFilters: filters,
          pathId: payload.pathId,
          pathLabel: payload.pathLabel,
          repositoryId: payload.repositoryId,
          repositoryName: payload.repositoryName,
        }),
        label: value,
      })
    },
  )

  return crumbs
}

const normalizeChildren = (
  response: BrowseChildrenDto,
  payload: FolderNodePayload,
  folderFieldCount = 0,
  fieldIconMap: Map<string, string> = new Map(),
) => {
  const repositoryId =
    payload.kind === 'repository'
      ? payload.repositoryId
      : payload.kind === 'browse' || payload.kind === 'browsePath'
        ? payload.repositoryId
        : ''
  const repositoryName =
    payload.kind === 'repository'
      ? payload.label
      : payload.kind === 'browse'
        ? payload.repositoryName
        : payload.kind === 'browsePath'
          ? payload.repositoryName
          : ''
  const currentFilters = payload.kind === 'browse' ? payload.parentFilters : {}
  const pathId =
    response.pathId ||
    (payload.kind === 'browse'
      ? payload.pathId
      : payload.kind === 'browsePath'
        ? payload.pathId
        : 'default')
  const pathLabel =
    payload.kind === 'browse'
      ? payload.pathLabel
      : payload.kind === 'browsePath'
        ? payload.label
        : undefined
  const groups = getPagedData<any>(response.groups)
  const groupField = response.groupField || response.groupFieldName || 'Folder'
  const childIsLeaf = response.isLeafLevel === true

  return groups.map((group) => {
    const nextFilters = {
      ...currentFilters,
      [groupField]: String(group.name),
    }
    const isLeaf =
      childIsLeaf ||
      (folderFieldCount > 0 &&
        Object.keys(nextFilters).length >= folderFieldCount)

    return toFolderItem({
      dateModified: group.dateModified,
      groupField,
      groupValue: String(group.name),
      hasChildren: !isLeaf,
      iconKey: fieldIconMap.get(groupField) || 'folder',
      isLeaf,
      itemCount: group.itemCount,
      level: response.level ?? Object.keys(currentFilters).length + 1,
      parentFilters: currentFilters,
      pathId,
      pathLabel,
      repositoryId,
      repositoryName,
    })
  })
}

const getDecodedRepositoryInfo = (payload: FolderNodePayload) => {
  if (payload.kind === 'repository')
    return {
      filters: {} as Record<string, string>,
      pathId: '',
      repositoryId: payload.repositoryId,
      repositoryName: payload.label,
    }
  if (payload.kind === 'browsePath')
    return {
      filters: {} as Record<string, string>,
      pathId: payload.pathId,
      repositoryId: payload.repositoryId,
      repositoryName: payload.repositoryName,
    }
  if (payload.kind === 'browse')
    return {
      filters: payload.parentFilters,
      pathId: payload.pathId || 'default',
      repositoryId: payload.repositoryId,
      repositoryName: payload.repositoryName,
    }
  return {
    filters: {} as Record<string, string>,
    pathId: 'default',
    repositoryId: '',
    repositoryName: '',
  }
}

export const foldersToTreeNodes = (folders: FolderItem[]): TreeNode[] =>
  folders.map((folder) => ({
    children: folder.hasChildren === false ? undefined : [],
    hasChildren: folder.hasChildren !== false,
    iconKey: folder.iconKey || 'folder',
    id: folder.id,
    isLoaded: false,
    title: folder.title,
  }))

export const folderApi = {
  async addDocumentComment(
    repositoryId: string,
    itemId: string,
    payload: { body: string },
  ): Promise<any> {
    const result = await addRepositoryItemComment({
      body: payload.body,
      itemId,
      repositoryId,
    })

    if (result.error) throw new Error(String(result.error))
    return result.data
  },

  async getAiSummary(): Promise<AiSummaryData> {
    return {
      checks: [],
      confidence: 0,
      documentId: '',
      engineSubtitle: '',
      engineTitle: 'EZOFIS AI Engine',
      facts: [],
      insight: '',
      recommendations: [],
      summary: '',
    }
  },

  async getDocumentComments(
    repositoryId: string,
    itemId: string,
    request: { page?: number; pageSize?: number } = {},
  ): Promise<any> {
    const result = await getRepositoryItemComments({
      itemId,
      page: request.page ?? 1,
      pageSize: request.pageSize ?? 50,
      repositoryId,
    })
    if (result.error) throw new Error(String(result.error))
    return (
      result.data || {
        comments: [],
        page: request.page ?? 1,
        pageSize: request.pageSize ?? 50,
        totalCount: 0,
      }
    )
  },

  async getDocumentDetail(repositoryId: string, itemId: string): Promise<any> {
    const result = await getRepositoryItemWorkspace({ itemId, repositoryId })
    if (result.error) throw new Error(String(result.error))
    return toWorkspaceDetail(result.data)
  },

  async getDocumentTimeline(
    repositoryId: string,
    itemId: string,
  ): Promise<any> {
    const result = await getRepositoryItemTimeline({ itemId, repositoryId })
    if (result.error) throw new Error(String(result.error))
    return result.data || { events: [], totalCount: 0 }
  },

  async getFolderChildren(
    folderId: string,
    request: {
      filters?: Record<string, string>
      folderFilters?: Record<string, string>
      page?: number
      pageSize?: number
      search?: string
      folderSearch?: string
    } = {},
  ): Promise<{
    folderPage: RepositoryFilePage
    folders: FolderItem[]
  }> {
    const decoded = decodeRepositoryNodeId(folderId)

    if (!decoded || decoded.kind === 'static') {
      return { folderPage: toPage(null), folders: [] }
    }

    const { filters, pathId, repositoryId } = getDecodedRepositoryInfo(decoded)

    if (decoded.kind === 'repository') {
      const structure = await getRepositoryBrowseStructure(repositoryId)
      const folders = (structure.browsePaths || []).map((browsePath) =>
        toBrowsePathItem({
          label: browsePath.label,
          pathId: browsePath.id,
          repositoryId,
          repositoryName: decoded.label,
        }),
      )

      return {
        folderPage: {
          hasMore: false,
          nextCursor: null,
          page: 1,
          pageSize: folders.length || defaultGroupPageSize,
          totalCount: folders.length,
          totalPages: 1,
        },
        folders,
      }
    }

    const structure = await getRepositoryBrowseStructure(repositoryId)
    const repositoryFields = await getRepositoryFields(repositoryId)
    const fieldIconMap = buildFieldIconMap(repositoryFields)
    const fieldKeys = repositoryFields
      .map((field) => field.sqlColumnName || field.name)
      .filter(Boolean) as string[]
    const parentFilters = mergeFilters(
      filters,
      buildApiFilters(
        request.folderFilters ?? request.filters,
        fieldKeys,
        repositoryFields,
      ),
    )

    if (isBrowseLeafNode(decoded, structure)) {
      return { folderPage: toPage(null), folders: [] }
    }

    const childrenResult = await authApiV6.getRepositoryBrowseChildren({
      id: repositoryId,
      page: request.page ?? defaultPage,
      pageSize: request.pageSize ?? defaultGroupPageSize,
      parentFilters,
      pathId,
      search:
        (request.folderSearch ?? request.search)?.trim() || undefined,
    } as any)

    if (childrenResult.error) throw new Error(String(childrenResult.error))

    const folders = normalizeChildren(
      childrenResult.data,
      decoded,
      getBrowseFolderFieldCount(structure),
      fieldIconMap,
    )
    const folderPage = toPage(childrenResult.data?.groups)

    return {
      folderPage: {
        ...folderPage,
        hasMore: (request.page ?? folderPage.page) < folderPage.totalPages,
        page: request.page ?? folderPage.page,
        pageSize: request.pageSize ?? folderPage.pageSize,
      },
      folders,
    }
  },

  async getFolderContent(
    folderId: string,
    request: FolderContentRequest = {},
  ): Promise<{
    breadcrumbs: BreadcrumbItem[]
    currentFolderGroupField: string
    fileColumns: DynamicRepositoryColumn[]
    filePage: RepositoryFilePage
    files: FileItem[]
    folderPage: RepositoryFilePage
    folders: FolderItem[]
  }> {
    const decoded = decodeRepositoryNodeId(folderId)

    if (!decoded) {
      return {
        breadcrumbs: [{ id: folderId, label: 'Repository' }],
        currentFolderGroupField: '',
        fileColumns: [],
        filePage: toPage(null),
        files: [],
        folderPage: toPage(null),
        folders: [],
      }
    }

    if (decoded.kind === 'static') {
      return {
        breadcrumbs: buildBreadcrumbs(decoded),
        currentFolderGroupField: '',
        fileColumns: [],
        filePage: toPage(null),
        files: [],
        folderPage: toPage(null),
        folders: [],
      }
    }

    const repository =
      decoded.kind === 'repository'
        ? ((await authApiV6.getRepositoryById(decoded.repositoryId))
          .data as RepositoryDto)
        : undefined
    const fields = await getRepositoryFields(
      decoded.kind === 'repository'
        ? decoded.repositoryId
        : decoded.repositoryId,
      repository,
    )
    const fieldIconMap = buildFieldIconMap(fields)
    const structure =
      decoded.kind === 'repository' ||
        decoded.kind === 'browsePath' ||
        decoded.kind === 'browse'
        ? await getRepositoryBrowseStructure(
          decoded.kind === 'repository'
            ? decoded.repositoryId
            : decoded.repositoryId,
        )
        : null
    const { filters, pathId, repositoryId } = getDecodedRepositoryInfo(decoded)
    const fieldKeys = fields
      .map((field) => field.sqlColumnName || field.name)
      .filter(Boolean) as string[]

    const folderUiFilters = buildApiFilters(
      request.folderFilters ??
        (request.fileFilters ? {} : request.filters) ??
        {},
      fieldKeys,
      fields,
    )
    const fileUiFilters = buildFileUiFilters(request, fieldKeys, fields)
    const folderParentFilters = mergeFilters(filters, folderUiFilters)
    const fileItemFilters = mergeFilters(filters, fileUiFilters)
    const folderSearchText =
      (request.folderSearch ?? request.search)?.trim() || undefined
    const fileSearchText =
      (request.fileSearch ?? request.search)?.trim() || undefined

    const fetchRepositoryFiles = async (
      itemFilters: Record<string, string | string[]>,
      searchText?: string,
    ) => {
      const itemResult = await getRepositoryItems({
        cursor: request.cursor ?? null,
        filters: itemFilters,
        id: repositoryId,
        page: request.page ?? defaultPage,
        pageSize: request.pageSize ?? defaultItemPageSize,
        search: searchText,
        skipTotal: false,
        sortBy: request.sortBy || 'DocumentDate',
        sortOrder: request.sortOrder || 'desc',
      })

      if (itemResult.error) throw new Error(String(itemResult.error))

      const rawFiles = getPagedData<Record<string, any>>(itemResult.data)
      return {
        filePage: toPage(itemResult.data),
        files: rawFiles.map(toFileItem),
      }
    }

    const includeFiles = request.includeFiles !== false
    const listAllFiles = request.listAllFiles === true

    let folders: FolderItem[] = []
    let folderPage = toPage(null)
    let files: FileItem[] = []
    let filePageResult = toPage(null)
    let currentFolderGroupField = resolveCurrentFolderGroupField(
      structure,
      filters,
    )

    if (listAllFiles) {
      const fileResult = await fetchRepositoryFiles(
        fileItemFilters,
        fileSearchText,
      )
      files = fileResult.files
      filePageResult = fileResult.filePage
    } else if (decoded.kind === 'repository') {
      folders = (structure?.browsePaths || []).map((browsePath) =>
        toBrowsePathItem({
          label: browsePath.label,
          pathId: browsePath.id,
          repositoryId,
          repositoryName: decoded.label,
        }),
      )
      folderPage = {
        hasMore: false,
        nextCursor: null,
        page: 1,
        pageSize: folders.length || defaultGroupPageSize,
        totalCount: folders.length,
        totalPages: 1,
      }

      if (
        includeFiles &&
        (Object.keys(fileUiFilters).length > 0 || Boolean(fileSearchText))
      ) {
        const fileResult = await fetchRepositoryFiles(
          fileUiFilters,
          fileSearchText,
        )
        files = fileResult.files
        filePageResult = fileResult.filePage
      }
    } else if (isBrowseLeafNode(decoded, structure)) {
      const fileResult = await fetchRepositoryFiles(
        fileItemFilters,
        fileSearchText,
      )
      files = fileResult.files
      filePageResult = fileResult.filePage
    } else {
      const childrenResult = await authApiV6.getRepositoryBrowseChildren({
        id: repositoryId,
        page: defaultPage,
        pageSize: defaultGroupPageSize,
        parentFilters: folderParentFilters,
        pathId,
        search: folderSearchText,
      } as any)

      if (childrenResult.error) throw new Error(String(childrenResult.error))
      currentFolderGroupField = resolveCurrentFolderGroupField(
        structure,
        folderParentFilters,
        childrenResult.data?.groupField || childrenResult.data?.groupFieldName,
      )
      folders = normalizeChildren(
        childrenResult.data,
        decoded,
        getBrowseFolderFieldCount(structure),
        fieldIconMap,
      )
      folderPage = toPage(childrenResult.data?.groups)

      if (
        includeFiles &&
        (decoded.kind === 'browse' || decoded.kind === 'browsePath')
      ) {
        const fileResult = await fetchRepositoryFiles(
          fileItemFilters,
          fileSearchText,
        )
        files = fileResult.files
        filePageResult = fileResult.filePage
      } else if (
        decoded.kind === 'browse' &&
        !folders.length &&
        Object.keys(folderParentFilters).length >=
          getBrowseFolderFieldCount(structure)
      ) {
        const fileResult = await fetchRepositoryFiles(
          fileItemFilters,
          fileSearchText,
        )
        files = fileResult.files
        filePageResult = fileResult.filePage
      }
    }

    return {
      breadcrumbs: buildBreadcrumbs(decoded),
      currentFolderGroupField,
      fileColumns: toFileColumns(fields),
      filePage: filePageResult,
      files,
      folderPage,
      folders,
    }
  },

  async getMetadataSections(): Promise<MetadataSection[]> {
    return []
  },

  async getRepositoryFullData(repositoryId: string): Promise<RepositoryDto> {
    const result = await authApiV6.getRepositoryById(repositoryId)
    if (result.error) throw new Error(String(result.error))
    return result.data as RepositoryDto
  },
  async getShareData(): Promise<ShareData> {
    return {
      documentId: '',
      invitePermissions: ['Can View', 'Can Edit'],
      link: '',
      permissions: [],
      sharedWith: [],
    }
  },

  async getTree(): Promise<TreeNode[]> {
    const result = await authApiV6.getRepositorys()
    if (result.error) throw new Error(String(result.error))

    const repositories = (
      Array.isArray(result.data) ? result.data : []
    ) as RepositoryDto[]
    const repositoryNodes: TreeNode[] = repositories.map((repository) => ({
      children: [],
      createdAtUtc: repository.createdAtUtc,
      createdBy: repository.createdBy,
      createdByName: repository.createdByName,
      description: repository.description,
      hasChildren: true,
      iconKey: 'folder',
      id: encodeRepositoryNodeId({
        kind: 'repository',
        label: repository.name,
        repositoryId: repository.id,
      }),
      isLoaded: false,
      itemsTableName: repository.itemsTableName,
      modifiedBy: repository.modifiedBy,
      modifiedByName: repository.modifiedByName,
      storageProviderId: repository.storageProviderId,
      title: repository.name,
    }))

    return [
      ...repositoryNodes,
      {
        hasChildren: false,
        iconKey: 'clock',
        id: encodeRepositoryNodeId({
          kind: 'static',
          label: 'Recent',
          staticId: 'recent',
        }),
        isLoaded: true,
        isStatic: true,
        title: 'Recent',
      },
      // {
      //   hasChildren: false,
      //   iconKey: 'sparkles',
      //   id: encodeRepositoryNodeId({
      //     kind: 'static',
      //     label: 'Favorites',
      //     staticId: 'favorites',
      //   }),
      //   isLoaded: true,
      //   isStatic: true,
      //   title: 'Favorites',
      // },
    ]
  },
  async getWorkflowData(): Promise<WorkflowData> {
    return {
      approvers: [],
      document: {} as any,
      documentId: '',
      priorities: ['Low', 'Medium', 'High'],
      templates: [],
    }
  },
}

export default folderApi
