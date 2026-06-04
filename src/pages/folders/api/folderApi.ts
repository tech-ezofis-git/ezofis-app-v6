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
  getRepositoryItemComments,
  getRepositoryItems,
  getRepositoryItemTimeline,
  getRepositoryItemWorkspace,
  type PagedDto,
  type RepositoryDto,
  type RepositoryFieldDto,
} from '../../../api/v6/folder/folder'

export interface DynamicRepositoryColumn {
  key: string
  label: string
  dataType?: string
}

export interface FolderContentRequest {
  append?: boolean
  cursor?: string | null
  page?: number
  pageSize?: number
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc' | (string & {})
}

type BrowseFolderNode = {
  groupField: string
  groupValue: string
  kind: 'browse'
  label: string
  level: number
  parentFilters: Record<string, string>
  pathId: string
  repositoryId: string
  repositoryName: string
}
type FolderNodePayload =
  | RepositoryFolderNode
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
  staticId: 'recent' | 'favorites'
}

const nodePrefix = 'repo-node:'
const defaultPage = 1
const defaultGroupPageSize = 100
const defaultItemPageSize = 50

export const encodeRepositoryNodeId = (payload: FolderNodePayload) => {
  const json = JSON.stringify(payload)
  if (globalThis.window === undefined) {
    const encoded = Buffer.from(json, 'utf8').toString('base64')
    return `${nodePrefix}${encoded}`
  } else {
    const bytes = new TextEncoder().encode(json)
    const binString = Array.from(bytes, (byte) =>
      String.fromCodePoint(byte),
    ).join('')
    const encoded = globalThis.btoa(binString)
    return `${nodePrefix}${encoded}`
  }
}

export const decodeRepositoryNodeId = (
  id: string,
): FolderNodePayload | null => {
  if (!id.startsWith(nodePrefix)) return null

  try {
    const raw = id.slice(nodePrefix.length)
    if (globalThis.window === undefined) {
      const json = Buffer.from(raw, 'base64').toString('utf8')
      return JSON.parse(json) as FolderNodePayload
    } else {
      const binString = globalThis.atob(raw)
      const bytes = Uint8Array.from(
        binString,
        (char) => char.codePointAt(0) ?? 0,
      )
      const json = new TextDecoder().decode(bytes)
      return JSON.parse(json) as FolderNodePayload
    }
  } catch (error) {
    console.error('Invalid repository node id', error)
    return null
  }
}

const getPagedData = <T>(paged: any): T[] => {
  if (Array.isArray(paged)) return paged
  if (Array.isArray(paged?.data)) return paged.data
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
): DynamicRepositoryColumn[] => {
  const metadataColumns = fields
    .filter((field) => !field.includeInFolderStructure)
    .map((field) => ({
      dataType: field.dataType,
      key: field.sqlColumnName || field.name,
      label: field.name || field.sqlColumnName,
    }))

  return [{ key: 'name', label: 'Name' }, ...metadataColumns]
}

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
              field?.value !== null &&
              field?.value !== undefined &&
              field?.value !== '',
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

const formatDate = (value: any) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toISOString().slice(0, 10)
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
  const name = String(
    row.name ??
      row.Name ??
      row.fileName ??
      row.FileName ??
      row.documentName ??
      row.DocumentName ??
      row.invoiceNumber ??
      row.InvoiceNumber ??
      id,
  )
  const amountValue = row.Amount ?? row.amount
  const currency = row.Currency ?? row.currency

  const amount =
    amountValue === undefined || amountValue === null
      ? '-'
      : currency
        ? `${amountValue} ${currency}`
        : String(amountValue)

  const file: FileItem = {
    amount,
    date: formatDate(
      row.DocumentDate ?? row.documentDate ?? row.date ?? row.Date,
    ),
    fileUrl: row.fileUrl ?? row.FileUrl ?? row.url ?? row.Url,
    id,
    invoiceNo: String(
      row.InvoiceNumber ?? row.invoiceNumber ?? row.invoiceNo ?? '-',
    ),
    name,
    ocr: Number(row.Ocr ?? row.ocr ?? row.ocrPercent ?? row.OcrPercent ?? 0),
    poNo: String(row.PoNumber ?? row.poNumber ?? row.poNo ?? '-'),
    risk: String(row.RiskLevel ?? row.risk ?? row.riskLevel ?? '-'),
    source: String(row.Source ?? row.source ?? '-'),
    status: String(row.Status ?? row.status ?? '-'),
    supplier: String(row.Supplier ?? row.supplier ?? '-'),
    type: String(
      row.DocumentType ?? row.documentType ?? row.type ?? row.Type ?? '-',
    ),
  }

  Object.entries(row).forEach(([key, value]) => {
    ;(file as any)[key] = value
    const pascalKey = key.charAt(0).toUpperCase() + key.slice(1)
    ;(file as any)[pascalKey] = value
  })
  ;(file as any).FileName = name
  ;(file as any).DocumentDate = file.date
  ;(file as any).Amount = file.amount
  ;(file as any).Status = file.status
  ;(file as any).DocumentType = file.type

  return file
}

const toFolderItem = (args: {
  dateModified?: string | null
  groupField: string
  groupValue: string
  hasChildren?: boolean
  itemCount?: number
  level: number
  parentFilters: Record<string, string>
  pathId: string
  repositoryId: string
  repositoryName: string
}): FolderItem => {
  const nextFilters = {
    ...args.parentFilters,
    [args.groupField]: args.groupValue,
  }

  return {
    hasChildren: args.hasChildren ?? true,
    iconKey: 'folder',
    id: encodeRepositoryNodeId({
      groupField: args.groupField,
      groupValue: args.groupValue,
      kind: 'browse',
      label: args.groupValue,
      level: args.level,
      parentFilters: nextFilters,
      pathId: args.pathId,
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
    return [
      { id: payload.repositoryId, label: 'EZOFIS' },
      { id: encodeRepositoryNodeId(payload), label: payload.label },
    ]
  }

  const crumbs: BreadcrumbItem[] = [
    { id: payload.repositoryId, label: 'EZOFIS' },
    {
      id: encodeRepositoryNodeId({
        kind: 'repository',
        label: payload.repositoryName,
        repositoryId: payload.repositoryId,
      }),
      label: payload.repositoryName,
    },
  ]

  Object.entries(payload.parentFilters).forEach(
    ([field, value], index, entries) => {
      const filters = Object.fromEntries(entries.slice(0, index + 1))
      crumbs.push({
        id: encodeRepositoryNodeId({
          groupField: field,
          groupValue: value,
          kind: 'browse',
          label: value,
          level: index + 1,
          parentFilters: filters,
          pathId: payload.pathId,
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
) => {
  let repositoryId = ''
  if (payload.kind === 'repository' || payload.kind === 'browse') {
    repositoryId = payload.repositoryId
  }
  let repositoryName = ''
  if (payload.kind === 'repository') {
    repositoryName = payload.label
  } else if (payload.kind === 'browse') {
    repositoryName = payload.repositoryName
  }
  const currentFilters = payload.kind === 'browse' ? payload.parentFilters : {}
  const pathId =
    response.pathId || (payload.kind === 'browse' ? payload.pathId : 'default')
  const groups = getPagedData<any>(response.groups)
  const groupField = response.groupField || response.groupFieldName || 'Folder'

  return groups.map((group) =>
    toFolderItem({
      dateModified: group.dateModified,
      groupField,
      groupValue: String(group.name),
      hasChildren: !response.isLeafLevel,
      itemCount: group.itemCount,
      level: response.level ?? Object.keys(currentFilters).length + 1,
      parentFilters: currentFilters,
      pathId,
      repositoryId,
      repositoryName,
    }),
  )
}

const getDecodedRepositoryInfo = (payload: FolderNodePayload) => {
  if (payload.kind === 'repository')
    return {
      filters: {} as Record<string, string>,
      pathId: 'default',
      repositoryId: payload.repositoryId,
      repositoryName: payload.label,
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
    request: { page?: number; pageSize?: number; search?: string } = {},
  ): Promise<{
    folderPage: RepositoryFilePage
    folders: FolderItem[]
  }> {
    const decoded = decodeRepositoryNodeId(folderId)

    if (!decoded || decoded.kind === 'static') {
      return { folderPage: toPage(null), folders: [] }
    }

    const { filters, pathId, repositoryId } = getDecodedRepositoryInfo(decoded)

    const childrenResult = await authApiV6.getRepositoryBrowseChildren({
      id: repositoryId,
      page: request.page ?? defaultPage,
      pageSize: request.pageSize ?? defaultGroupPageSize,
      parentFilters: filters,
      pathId,
      search: request.search?.trim() || undefined,
    } as any)

    if (childrenResult.error) throw new Error(String(childrenResult.error))

    const folders = normalizeChildren(childrenResult.data, decoded)
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
    const fields = await getRepositoryFields(decoded.repositoryId, repository)
    const { filters, pathId, repositoryId } = getDecodedRepositoryInfo(decoded)

    let folders: FolderItem[] = []

    // Children API powers the tree/folder hierarchy.
    const childrenResult = await authApiV6.getRepositoryBrowseChildren({
      id: repositoryId,
      page: defaultPage,
      pageSize: defaultGroupPageSize,
      parentFilters: filters,
      pathId,
      search: request.search?.trim() || undefined,
    } as any)

    if (childrenResult.error) throw new Error(String(childrenResult.error))
    folders = normalizeChildren(childrenResult.data, decoded)
    const folderPage = toPage(childrenResult.data?.groups)

    // Items API powers the file list. Same filters as the clicked folder.
    const itemResult = await getRepositoryItems({
      cursor: request.cursor ?? null,
      filters,
      id: repositoryId,
      page: request.page ?? defaultPage,
      pageSize: request.pageSize ?? defaultItemPageSize,
      search: request.search,
      skipTotal: true, // required so UI can show totalCount / totalPages from API
      sortBy: request.sortBy || 'DocumentDate',
      sortOrder: request.sortOrder || 'desc',
    })

    if (itemResult.error) throw new Error(String(itemResult.error))

    const rawFiles = getPagedData<Record<string, any>>(itemResult.data)
    const files = rawFiles.map((row, index) => toFileItem(row, index))

    return {
      breadcrumbs: buildBreadcrumbs(decoded),
      fileColumns: toFileColumns(fields),
      filePage: toPage(itemResult.data),
      files,
      // Folder/group total is different from file/item total.
      // Example: 50 supplier folders can represent 100000 files through itemCount = 2000 each.
      folderPage,
      folders,
    }
  },

  async getMetadataSections(): Promise<MetadataSection[]> {
    return []
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
    const result = await authApiV6.repositories()
    if (result.error) throw new Error(String(result.error))

    const repositories = (
      Array.isArray(result.data) ? result.data : []
    ) as RepositoryDto[]
    const repositoryNodes: TreeNode[] = repositories.map((repository) => ({
      children: [],
      hasChildren: true,
      iconKey: 'folder',
      id: encodeRepositoryNodeId({
        kind: 'repository',
        label: repository.name,
        repositoryId: repository.id,
      }),
      isLoaded: false,
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
      {
        hasChildren: false,
        iconKey: 'sparkles',
        id: encodeRepositoryNodeId({
          kind: 'static',
          label: 'Favorites',
          staticId: 'favorites',
        }),
        isLoaded: true,
        isStatic: true,
        title: 'Favorites',
      },
    ]
  },
  async getWorkflowData(): Promise<WorkflowData> {
    return {
      approvers: [],
      document: { amount: '', date: '', name: '', status: '', supplier: '' },
      documentId: '',
      priorities: ['Low', 'Medium', 'High'],
      templates: [],
    }
  },
}

export default folderApi
