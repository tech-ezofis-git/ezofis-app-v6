import {
  authApiV6,
  getRepositoryItems,
  getRepositoryItemWorkspace,
  getRepositoryItemTimeline,
  getRepositoryItemComments,
  addRepositoryItemComment,
  type BrowseChildrenDto,
  type BrowseStructureDto,
  type PagedDto,
  type RepositoryDto,
  type RepositoryFieldDto,
} from "../../../api/v6/folder/folder";
import type { BreadcrumbItem } from "../components/Breadcrumbs";
import type {
  AiSummaryData,
  FileItem,
  FolderItem,
  MetadataSection,
  RepositoryFilePage,
  ShareData,
  TreeNode,
  WorkflowData,
} from "../types/folderTypes";

export interface DynamicRepositoryColumn {
  key: string;
  label: string;
  dataType?: string;
  fieldId?: string;
  isMandatory?: boolean;
  includeInFolderStructure?: boolean;
  level?: number;
}

export interface FolderContentRequest {
  page?: number;
  pageSize?: number;
  cursor?: string | null;
  append?: boolean;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc" | string;
  /** List view: load all repository files without folder filters */
  listAllFiles?: boolean;
  /** Grid tree sync: skip file fetch when only loading folder children */
  includeFiles?: boolean;
}

type RepositoryFolderNode = {
  kind: "repository";
  repositoryId: string;
  label: string;
};
type BrowsePathFolderNode = {
  kind: "browsePath";
  repositoryId: string;
  repositoryName: string;
  pathId: string;
  label: string;
};
type BrowseFolderNode = {
  kind: "browse";
  repositoryId: string;
  repositoryName: string;
  pathId: string;
  pathLabel?: string;
  label: string;
  level: number;
  groupField: string;
  groupValue: string;
  parentFilters: Record<string, string>;
  isLeaf?: boolean;
};
type StaticFolderNode = {
  kind: "static";
  staticId: "recent" | "favorites";
  label: string;
};
type FolderNodePayload =
  | RepositoryFolderNode
  | BrowsePathFolderNode
  | BrowseFolderNode
  | StaticFolderNode;

const structureCache = new Map<string, BrowseStructureDto>();

const getBrowseFolderFieldCount = (structure?: BrowseStructureDto | null) =>
  structure?.folderFields?.length ?? 0;

const isBrowseLeafNode = (
  payload: FolderNodePayload,
  structure?: BrowseStructureDto | null,
) => {
  if (payload.kind !== "browse") return false;
  if (payload.isLeaf) return true;

  const folderFieldCount = getBrowseFolderFieldCount(structure);
  if (!folderFieldCount) return false;

  return Object.keys(payload.parentFilters).length >= folderFieldCount;
};

const nodePrefix = "repo-node:";
const defaultPage = 1;
const defaultGroupPageSize = 100;
const defaultItemPageSize = 50;

export const encodeRepositoryNodeId = (payload: FolderNodePayload) => {
  const json = JSON.stringify(payload);
  const encoded =
    typeof window === "undefined"
      ? Buffer.from(json, "utf8").toString("base64")
      : window.btoa(unescape(encodeURIComponent(json)));
  return `${nodePrefix}${encoded}`;
};

export const decodeRepositoryNodeId = (
  id: string,
): FolderNodePayload | null => {
  if (!id.startsWith(nodePrefix)) return null;

  try {
    const raw = id.slice(nodePrefix.length);
    const json =
      typeof window === "undefined"
        ? Buffer.from(raw, "base64").toString("utf8")
        : decodeURIComponent(escape(window.atob(raw)));
    return JSON.parse(json) as FolderNodePayload;
  } catch (error) {
    console.error("Invalid repository node id", error);
    return null;
  }
};

const getPagedData = <T>(paged: any): T[] => {
  if (Array.isArray(paged)) return paged;
  if (Array.isArray(paged?.data)) return paged.data;
  if (Array.isArray(paged?.items)) return paged.items;
  return [];
};

const toPage = (paged?: PagedDto<any> | null): RepositoryFilePage => {
  const totalCount = Number(paged?.totalCount ?? 0);
  const pageSize = Number(paged?.pageSize ?? defaultItemPageSize);
  const totalPagesFromApi = Number(paged?.totalPages ?? 0);

  return {
    page: Math.max(1, Number(paged?.page ?? defaultPage)),
    pageSize,
    totalCount,
    totalPages: Math.max(
      1,
      totalPagesFromApi || Math.ceil(totalCount / pageSize),
    ),
    hasMore: Boolean(paged?.hasMore),
    nextCursor: paged?.nextCursor ?? null,
  };
};

const toFileColumns = (
  fields: RepositoryFieldDto[] = [],
): DynamicRepositoryColumn[] =>
  fields
    .filter((field) => field.sqlColumnName || field.name)
    .map((field) => ({
      key: field.sqlColumnName || field.name,
      label: field.name || field.sqlColumnName,
      dataType: field.dataType,
      fieldId: field.id,
      isMandatory: field.isMandatory,
      includeInFolderStructure: field.includeInFolderStructure,
      level: field.level,
    }));

const detailSectionIconMap: Record<string, string> = {
  documentInfo: "fileText",
  supplierDetails: "building",
  aiAnalysis: "bot",
  systemInfo: "settings",
};

const toWorkspaceDetail = (workspace: any): any => {
  const sections = Array.isArray(workspace?.DetailsRow)
    ? workspace.DetailsRow
    : [];
  const lineItems = Array.isArray(workspace?.lineItems)
    ? workspace.lineItems
    : [];

  return {
    documentId: String(workspace?.id ?? ""),
    fileName: String(
      workspace?.fileName ?? workspace?.name ?? "Untitled document",
    ),
    fileType: String(workspace?.fileType ?? "pdf").toUpperCase(),
    fileUrl: workspace?.fileUrl || "",
    alert: null,
    infoCards: sections
      .filter(
        (section: any) =>
          Array.isArray(section?.fields) && section.fields.length > 0,
      )
      .map((section: any, index: number) => ({
        id: String(section.sectionKey || `section-${index}`),
        title: String(
          section.title || section.sectionKey || `Section ${index + 1}`,
        ),
        iconKey: detailSectionIconMap[String(section.sectionKey)] || "fileText",
        rows: section.fields
          .filter(
            (field: any) =>
              field &&
              field.value !== null &&
              field.value !== undefined &&
              field.value !== "",
          )
          .map((field: any) => ({
            label: String(field.label || field.key || "-"),
            value: String(field.value),
          })),
      }))
      .filter((card: any) => card.rows.length > 0),
    lineItems,
    tabs: { timeline: [], comments: [], relatedDocs: [] },
  };
};



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
  );

  return {
    id,
    ...(row as any),
  } as FileItem;
};

const getRepositoryBrowseStructure = async (repositoryId: string) => {
  if (structureCache.has(repositoryId)) {
    return structureCache.get(repositoryId)!;
  }

  const result = await authApiV6.getRepositoryBrowseStructure(repositoryId);
  if (result.error) throw new Error(String(result.error));

  const structure = (result.data || {
    browsePaths: [],
    folderFields: [],
  }) as BrowseStructureDto;

  structureCache.set(repositoryId, structure);
  return structure;
};

const toBrowsePathItem = (args: {
  repositoryId: string;
  repositoryName: string;
  pathId: string;
  label: string;
}): FolderItem => ({
  id: encodeRepositoryNodeId({
    kind: "browsePath",
    repositoryId: args.repositoryId,
    repositoryName: args.repositoryName,
    pathId: args.pathId,
    label: args.label,
  }),
  title: args.label,
  iconKey: "folder",
  itemsText: "-",
  modifiedText: "-",
  sizeText: "-",
  hasChildren: true,
});

const toFolderItem = (args: {
  repositoryId: string;
  repositoryName: string;
  groupField: string;
  groupValue: string;
  level: number;
  pathId: string;
  pathLabel?: string;
  parentFilters: Record<string, string>;
  itemCount?: number;
  dateModified?: string | null;
  hasChildren?: boolean;
  isLeaf?: boolean;
}): FolderItem => {
  const nextFilters = {
    ...args.parentFilters,
    [args.groupField]: args.groupValue,
  };

  return {
    id: encodeRepositoryNodeId({
      kind: "browse",
      repositoryId: args.repositoryId,
      repositoryName: args.repositoryName,
      pathId: args.pathId,
      pathLabel: args.pathLabel,
      label: args.groupValue,
      level: args.level,
      groupField: args.groupField,
      groupValue: args.groupValue,
      parentFilters: nextFilters,
      isLeaf: args.isLeaf,
    }),
    title: args.groupValue,
    iconKey: "folder",
    itemsText: `${args.itemCount ?? 0} items`,
    modifiedText: args.dateModified || "-",
    sizeText: "-",
    hasChildren: args.hasChildren ?? true,
  };
};

const getRepositoryFields = async (
  repositoryId: string,
  fallback?: RepositoryDto,
) => {
  if (fallback?.fields?.length) return fallback.fields;
  const result = await authApiV6.getRepositoryById(repositoryId);
  if (result.error) throw new Error(String(result.error));
  return (result.data as RepositoryDto)?.fields ?? [];
};

const buildBreadcrumbs = (payload: FolderNodePayload): BreadcrumbItem[] => {
  if (payload.kind === "static")
    return [{ id: encodeRepositoryNodeId(payload), label: payload.label }];

  if (payload.kind === "repository") {
    return [
      { id: encodeRepositoryNodeId(payload), label: payload.label },
    ];
  }

  if (payload.kind === "browsePath") {
    return [
      {
        id: encodeRepositoryNodeId({
          kind: "repository",
          repositoryId: payload.repositoryId,
          label: payload.repositoryName,
        }),
        label: payload.repositoryName,
      },
      {
        id: encodeRepositoryNodeId(payload),
        label: payload.label,
      },
    ];
  }

  const crumbs: BreadcrumbItem[] = [
    {
      id: encodeRepositoryNodeId({
        kind: "repository",
        repositoryId: payload.repositoryId,
        label: payload.repositoryName,
      }),
      label: payload.repositoryName,
    },
  ];

  if (payload.pathLabel) {
    crumbs.push({
      id: encodeRepositoryNodeId({
        kind: "browsePath",
        repositoryId: payload.repositoryId,
        repositoryName: payload.repositoryName,
        pathId: payload.pathId,
        label: payload.pathLabel,
      }),
      label: payload.pathLabel,
    });
  }

  Object.entries(payload.parentFilters).forEach(
    ([field, value], index, entries) => {
      const filters = Object.fromEntries(entries.slice(0, index + 1));
      crumbs.push({
        id: encodeRepositoryNodeId({
          kind: "browse",
          repositoryId: payload.repositoryId,
          repositoryName: payload.repositoryName,
          pathId: payload.pathId,
          pathLabel: payload.pathLabel,
          label: value,
          level: index + 1,
          groupField: field,
          groupValue: value,
          parentFilters: filters,
          isLeaf: index === entries.length - 1 ? payload.isLeaf : false,
        }),
        label: value,
      });
    },
  );

  return crumbs;
};

const normalizeChildren = (
  response: BrowseChildrenDto,
  payload: FolderNodePayload,
  folderFieldCount = 0,
) => {
  const repositoryId =
    payload.kind === "repository"
      ? payload.repositoryId
      : payload.kind === "browse" || payload.kind === "browsePath"
        ? payload.repositoryId
        : "";
  const repositoryName =
    payload.kind === "repository"
      ? payload.label
      : payload.kind === "browse"
        ? payload.repositoryName
        : payload.kind === "browsePath"
          ? payload.repositoryName
          : "";
  const currentFilters = payload.kind === "browse" ? payload.parentFilters : {};
  const pathId =
    response.pathId ||
    (payload.kind === "browse"
      ? payload.pathId
      : payload.kind === "browsePath"
        ? payload.pathId
        : "default");
  const pathLabel =
    payload.kind === "browse"
      ? payload.pathLabel
      : payload.kind === "browsePath"
        ? payload.label
        : undefined;
  const groups = getPagedData<any>(response.groups);
  const groupField = response.groupField || response.groupFieldName || "Folder";
  const childIsLeaf = response.isLeafLevel === true;

  return groups.map((group) => {
    const nextFilters = {
      ...currentFilters,
      [groupField]: String(group.name),
    };
    const isLeaf =
      childIsLeaf ||
      (folderFieldCount > 0 &&
        Object.keys(nextFilters).length >= folderFieldCount);

    return toFolderItem({
      repositoryId,
      repositoryName,
      groupField,
      groupValue: String(group.name),
      level: response.level ?? Object.keys(currentFilters).length + 1,
      pathId,
      pathLabel,
      parentFilters: currentFilters,
      itemCount: group.itemCount,
      dateModified: group.dateModified,
      hasChildren: !isLeaf,
      isLeaf,
    });
  });
};

const getDecodedRepositoryInfo = (payload: FolderNodePayload) => {
  if (payload.kind === "repository")
    return {
      repositoryId: payload.repositoryId,
      repositoryName: payload.label,
      filters: {} as Record<string, string>,
      pathId: "",
    };
  if (payload.kind === "browsePath")
    return {
      repositoryId: payload.repositoryId,
      repositoryName: payload.repositoryName,
      filters: {} as Record<string, string>,
      pathId: payload.pathId,
    };
  if (payload.kind === "browse")
    return {
      repositoryId: payload.repositoryId,
      repositoryName: payload.repositoryName,
      filters: payload.parentFilters,
      pathId: payload.pathId || "default",
    };
  return {
    repositoryId: "",
    repositoryName: "",
    filters: {} as Record<string, string>,
    pathId: "default",
  };
};

export const foldersToTreeNodes = (folders: FolderItem[]): TreeNode[] =>
  folders.map((folder) => ({
    id: folder.id,
    title: folder.title,
    iconKey: folder.iconKey || "folder",
    children: folder.hasChildren === false ? undefined : [],
    hasChildren: folder.hasChildren !== false,
    isLoaded: false,
  }));

export const folderApi = {
  async getRepositoryFullData(repositoryId: string): Promise<RepositoryDto> {
    const result = await authApiV6.getRepositoryById(repositoryId);
    if (result.error) throw new Error(String(result.error));
    return result.data as RepositoryDto;
  },

  async getTree(): Promise<TreeNode[]> {
    const result = await authApiV6.getRepositorys();
    if (result.error) throw new Error(String(result.error));

    const repositories = (
      Array.isArray(result.data) ? result.data : []
    ) as RepositoryDto[];
    const repositoryNodes: TreeNode[] = repositories.map((repository) => ({
      id: encodeRepositoryNodeId({
        kind: "repository",
        repositoryId: repository.id,
        label: repository.name,
      }),
      title: repository.name,
      iconKey: "folder",
      children: [],
      hasChildren: true,
      isLoaded: false,
      description:repository.description,
      storageProviderId: repository.storageProviderId,
        itemsTableName: repository.itemsTableName,
        createdAtUtc: repository.createdAtUtc,
        createdBy: repository.createdBy,
        modifiedBy: repository.modifiedBy,
        createdByName: repository.createdByName,
        modifiedByName: repository.modifiedByName
    }));

    return [
      ...repositoryNodes,
      {
        id: encodeRepositoryNodeId({
          kind: "static",
          staticId: "recent",
          label: "Recent",
        }),
        title: "Recent",
        iconKey: "clock",
        hasChildren: false,
        isLoaded: true,
        isStatic: true,
      },
      {
        id: encodeRepositoryNodeId({
          kind: "static",
          staticId: "favorites",
          label: "Favorites",
        }),
        title: "Favorites",
        iconKey: "sparkles",
        hasChildren: false,
        isLoaded: true,
        isStatic: true,
      },
    ];
  },

  async getFolderContent(
    folderId: string,
    request: FolderContentRequest = {},
  ): Promise<{
    breadcrumbs: BreadcrumbItem[];
    folders: FolderItem[];
    files: FileItem[];
    fileColumns: DynamicRepositoryColumn[];
    filePage: RepositoryFilePage;
    folderPage: RepositoryFilePage;
  }> {
    const decoded = decodeRepositoryNodeId(folderId);

    if (!decoded) {
      return {
        breadcrumbs: [{ id: folderId, label: "Repository" }],
        folders: [],
        files: [],
        fileColumns: [],
        filePage: toPage(null),
        folderPage: toPage(null),
      };
    }

    if (decoded.kind === "static") {
      return {
        breadcrumbs: buildBreadcrumbs(decoded),
        folders: [],
        files: [],
        fileColumns: [],
        filePage: toPage(null),
        folderPage: toPage(null),
      };
    }

    const repository =
      decoded.kind === "repository"
        ? ((await authApiV6.getRepositoryById(decoded.repositoryId))
            .data as RepositoryDto)
        : undefined;
    const fields = await getRepositoryFields(
      decoded.kind === "repository"
        ? decoded.repositoryId
        : decoded.repositoryId,
      repository,
    );
    const structure =
      decoded.kind === "repository" ||
      decoded.kind === "browsePath" ||
      decoded.kind === "browse"
        ? await getRepositoryBrowseStructure(
            decoded.kind === "repository"
              ? decoded.repositoryId
              : decoded.repositoryId,
          )
        : null;
    const { repositoryId, filters, pathId } = getDecodedRepositoryInfo(decoded);

    const fetchRepositoryFiles = async (itemFilters: Record<string, string>) => {
      const itemResult = await getRepositoryItems({
        id: repositoryId,
        filters: itemFilters,
        search: request.search,
        sortBy: request.sortBy || "DocumentDate",
        sortOrder: request.sortOrder || "desc",
        page: request.page ?? defaultPage,
        pageSize: request.pageSize ?? defaultItemPageSize,
        cursor: request.cursor ?? null,
        skipTotal: true,
      });

      if (itemResult.error) throw new Error(String(itemResult.error));

      const rawFiles = getPagedData<Record<string, any>>(itemResult.data);
      return {
        files: rawFiles.map(toFileItem),
        filePage: toPage(itemResult.data),
      };
    };

    const includeFiles = request.includeFiles !== false;
    const listAllFiles = request.listAllFiles === true;

    let folders: FolderItem[] = [];
    let folderPage = toPage(null);
    let files: FileItem[] = [];
    let filePageResult = toPage(null);

    if (listAllFiles) {
      const fileResult = await fetchRepositoryFiles({});
      files = fileResult.files;
      filePageResult = fileResult.filePage;
    } else if (decoded.kind === "repository") {
      folders = (structure?.browsePaths || []).map((browsePath) =>
        toBrowsePathItem({
          repositoryId,
          repositoryName: decoded.label,
          pathId: browsePath.id,
          label: browsePath.label,
        }),
      );
      folderPage = {
        page: 1,
        pageSize: folders.length || defaultGroupPageSize,
        totalCount: folders.length,
        totalPages: 1,
        hasMore: false,
        nextCursor: null,
      };
    } else if (isBrowseLeafNode(decoded, structure)) {
      const fileResult = await fetchRepositoryFiles(filters);
      files = fileResult.files;
      filePageResult = fileResult.filePage;
    } else {
      const childrenResult = await authApiV6.getRepositoryBrowseChildren({
        id: repositoryId,
        pathId,
        page: defaultPage,
        pageSize: defaultGroupPageSize,
        parentFilters: filters,
        search: request.search?.trim() || undefined,
      } as any);

      if (childrenResult.error) throw new Error(String(childrenResult.error));
      folders = normalizeChildren(
        childrenResult.data,
        decoded,
        getBrowseFolderFieldCount(structure),
      );
      folderPage = toPage(childrenResult.data?.groups);

      if (
        includeFiles &&
        (decoded.kind === "browse" || decoded.kind === "browsePath")
      ) {
        const fileResult = await fetchRepositoryFiles(filters);
        files = fileResult.files;
        filePageResult = fileResult.filePage;
      } else if (
        decoded.kind === "browse" &&
        !folders.length &&
        Object.keys(filters).length >= getBrowseFolderFieldCount(structure)
      ) {
        const fileResult = await fetchRepositoryFiles(filters);
        files = fileResult.files;
        filePageResult = fileResult.filePage;
      }
    }

    return {
      breadcrumbs: buildBreadcrumbs(decoded),
      folders,
      files,
      fileColumns: toFileColumns(fields),
      filePage: filePageResult,
      folderPage,
    };
  },

  async getFolderChildren(
    folderId: string,
    request: { page?: number; pageSize?: number; search?: string } = {},
  ): Promise<{
    folders: FolderItem[];
    folderPage: RepositoryFilePage;
  }> {
    const decoded = decodeRepositoryNodeId(folderId);

    if (!decoded || decoded.kind === "static") {
      return { folders: [], folderPage: toPage(null) };
    }

    const { repositoryId, filters, pathId } = getDecodedRepositoryInfo(decoded);

    if (decoded.kind === "repository") {
      const structure = await getRepositoryBrowseStructure(repositoryId);
      const folders = (structure.browsePaths || []).map((browsePath) =>
        toBrowsePathItem({
          repositoryId,
          repositoryName: decoded.label,
          pathId: browsePath.id,
          label: browsePath.label,
        }),
      );

      return {
        folders,
        folderPage: {
          page: 1,
          pageSize: folders.length || defaultGroupPageSize,
          totalCount: folders.length,
          totalPages: 1,
          hasMore: false,
          nextCursor: null,
        },
      };
    }

    const structure = await getRepositoryBrowseStructure(repositoryId);

    if (isBrowseLeafNode(decoded, structure)) {
      return { folders: [], folderPage: toPage(null) };
    }

    const childrenResult = await authApiV6.getRepositoryBrowseChildren({
      id: repositoryId,
      pathId,
      page: request.page ?? defaultPage,
      pageSize: request.pageSize ?? defaultGroupPageSize,
      parentFilters: filters,
      search: request.search?.trim() || undefined,
    } as any);

    if (childrenResult.error) throw new Error(String(childrenResult.error));

    const folders = normalizeChildren(
      childrenResult.data,
      decoded,
      getBrowseFolderFieldCount(structure),
    );
    const folderPage = toPage(childrenResult.data?.groups);

    return {
      folders,
      folderPage: {
        ...folderPage,
        page: request.page ?? folderPage.page,
        pageSize: request.pageSize ?? folderPage.pageSize,
        hasMore: (request.page ?? folderPage.page) < folderPage.totalPages,
      },
    };
  },

  async getDocumentDetail(repositoryId: string, itemId: string): Promise<any> {
    const result = await getRepositoryItemWorkspace({ repositoryId, itemId });
    if (result.error) throw new Error(String(result.error));
    return toWorkspaceDetail(result.data);
  },

  async getDocumentTimeline(
    repositoryId: string,
    itemId: string,
  ): Promise<any> {
    const result = await getRepositoryItemTimeline({ repositoryId, itemId });
    if (result.error) throw new Error(String(result.error));
    return result.data || { events: [], totalCount: 0 };
  },

  async getDocumentComments(
    repositoryId: string,
    itemId: string,
    request: { page?: number; pageSize?: number } = {},
  ): Promise<any> {
    const result = await getRepositoryItemComments({
      repositoryId,
      itemId,
      page: request.page ?? 1,
      pageSize: request.pageSize ?? 50,
    });
    if (result.error) throw new Error(String(result.error));
    return (
      result.data || {
        comments: [],
        totalCount: 0,
        page: request.page ?? 1,
        pageSize: request.pageSize ?? 50,
      }
    );
  },

  async addDocumentComment(
    repositoryId: string,
    itemId: string,
    payload: { body: string },
  ): Promise<any> {
    const result = await addRepositoryItemComment({
      repositoryId,
      itemId,
      body: payload.body,
    });

    if (result.error) throw new Error(String(result.error));
    return result.data;
  },

  async getMetadataSections(): Promise<MetadataSection[]> {
    return [];
  },
  async getAiSummary(): Promise<AiSummaryData> {
    return {
      documentId: "",
      engineTitle: "EZOFIS AI Engine",
      engineSubtitle: "",
      confidence: 0,
      summary: "",
      facts: [],
      checks: [],
      recommendations: [],
      insight: "",
    };
  },
  async getShareData(): Promise<ShareData> {
    return {
      documentId: "",
      invitePermissions: ["Can View", "Can Edit"],
      sharedWith: [],
      link: "",
      permissions: [],
    };
  },
  async getWorkflowData(): Promise<WorkflowData> {
    return {
      documentId: "",
      document: {} as any,
      templates: [],
      approvers: [],
      priorities: ["Low", "Medium", "High"],
    };
  },
};

export default folderApi;
