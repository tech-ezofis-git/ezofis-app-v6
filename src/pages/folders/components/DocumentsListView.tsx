import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import type { FileItem, RepositoryFilePage } from "../types/folderTypes";
import { Breadcrumbs, type BreadcrumbItem } from "./Breadcrumbs";
import { DynamicIcon } from "./icons";
import { Button, StatusPill } from "./Ui";

type AnyFileItem = FileItem & Record<string, any>;

type DynamicColumn = {
  key: string;
  label: string;
  minWidth?: number;
};

const HIDDEN_FILE_KEYS = new Set([
  "storageproviderid",
  "storageprovidercode",
  "hasfilepath",
]);

const PRIORITY_COLUMN_ORDER = [
  "fileName",
  "name",
  "documentType",
  "type",
  "supplier",
  "invoiceNumber",
  "invoiceNo",
  "poNumber",
  "poNo",
  "documentDate",
  "date",
  "amount",
  "currency",
  "status",
  "ocrPercent",
  "ocr",
  "aiStatus",
  "riskLevel",
  "risk",
  "source",
  "department",
];

const FILTERABLE_KEYS = [
  "documentType",
  "type",
  "status",
  "supplier",
  "department",
  "riskLevel",
  "risk",
  "source",
  "currency",
  "aiStatus",
];

const isHiddenFileKey = (key: string) =>
  HIDDEN_FILE_KEYS.has(key.toLowerCase());

const PAGE_SIZE_OPTIONS = [5, 10, 20, 30, 50, 100];
const ACTION_MENU_WIDTH = 220;
const ACTION_MENU_HEIGHT = 274;

type ActionMenuPosition = {
  top: number;
  left: number;
  placement: "top" | "bottom";
};

const toTitle = (key: string) =>
  key
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (value) => value.toUpperCase());

const formatDateValue = (value: any) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toISOString().slice(0, 10);
};

const formatAmountValue = (value: any, row: AnyFileItem) => {
  if (value === undefined || value === null || value === "") return "-";
  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) return String(value);

  const currency = row.currency ? String(row.currency) : undefined;
  return `${numericValue.toLocaleString("en-IN", { maximumFractionDigits: 2 })}${currency ? ` ${currency}` : ""}`;
};

const getDisplayValue = (row: AnyFileItem, key: string) => {
  const value = row?.[key];
  if (value === undefined || value === null || value === "") return "-";
  if (key.toLowerCase().includes("date")) return formatDateValue(value);
  if (key.toLowerCase().includes("amount"))
    return formatAmountValue(value, row);
  if (key === "ocrPercent" || key === "ocr") return `${value}%`;
  return String(value);
};

const getFileId = (file: AnyFileItem) =>
  String(
    file.id || file.fileId || file.documentId || file.fileName || file.name,
  );

const getFileName = (file: AnyFileItem) =>
  String(
    file.fileName ||
    file.name ||
    file.invoiceNumber ||
    file.id ||
    "Untitled file",
  );

const buildColumns = (files: AnyFileItem[]): DynamicColumn[] => {
  const keySet = new Set<string>();

  files.forEach((file) => {
    Object.keys(file || {}).forEach((key) => {
      if (key === "id") return;
      if (isHiddenFileKey(key)) return;
      keySet.add(key);
    });
  });

  if (keySet.has("fileName") && keySet.has("name")) {
    keySet.delete("name");
  }

  const sortedKeys = Array.from(keySet).sort((a, b) => {
    const aIndex = PRIORITY_COLUMN_ORDER.indexOf(a);
    const bIndex = PRIORITY_COLUMN_ORDER.indexOf(b);
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return a.localeCompare(b);
  });

  return sortedKeys.map((key) => ({
    key,
    label: key === "fileName" || key === "name" ? "File Name" : toTitle(key),
    minWidth:
      key === "fileName" || key === "name"
        ? 260
        : key.toLowerCase().includes("date")
          ? 150
          : key.toLowerCase().includes("amount")
            ? 150
            : 130,
  }));
};

export function DocumentsListView({
  files,
  breadcrumbs,
  filePage,
  loading = false,
  loadingPage = false,
  error = "",
  onBreadcrumbSelect,
  onOpenFile,
  onPageChange,
  onPageSizeChange,
  onEdit,
  onAiSummary,
  onShare,
  onWorkflow,
}: {
  files: FileItem[];
  breadcrumbs: BreadcrumbItem[];
  filePage?: RepositoryFilePage;
  loading?: boolean;
  loadingPage?: boolean;
  error?: string;
  onBreadcrumbSelect: (id: string) => void;
  onOpenFile: (id: string) => void;
  onPageChange?: (page: number, cursor?: string | null) => void;
  onPageSizeChange?: (pageSize: number) => void;
  onEdit: () => void;
  onAiSummary: () => void;
  onShare: () => void;
  onWorkflow: () => void;
}) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [actionMenuPosition, setActionMenuPosition] =
    useState<ActionMenuPosition | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const menuRef = useRef<HTMLDivElement | null>(null);

  const normalizedFiles = useMemo(() => files as AnyFileItem[], [files]);
  const columns = useMemo(
    () => buildColumns(normalizedFiles),
    [normalizedFiles],
  );

  const currentPage = filePage?.page || 1;
  const pageSize = filePage?.pageSize || 50;
  const totalCount = filePage?.totalCount || normalizedFiles.length;
  const totalPages = Math.max(
    1,
    filePage?.totalPages || Math.ceil(totalCount / pageSize),
  );
  const hasMore = Boolean(filePage?.hasMore);
  const fromItem = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const toItem = Math.min(
    (currentPage - 1) * pageSize + normalizedFiles.length,
    totalCount,
  );
  const filterColumns = useMemo(() => {
    const availableKeys = new Set(columns.map((column) => column.key));
    return FILTERABLE_KEYS.filter((key) => availableKeys.has(key)).map(
      (key) => ({
        key,
        label: `All ${toTitle(key)}`,
      }),
    );
  }, [columns]);

  const selectionEnabled = selectedIds.length > 0;

  useEffect(() => {
    const closeMenu = (event: globalThis.MouseEvent) => {
      if (!menuRef.current) return
      if (!menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null)
      }
    }

    document.addEventListener('mousedown', closeMenu)
    return () => document.removeEventListener('mousedown', closeMenu)
  }, [])

  useEffect(() => {
    if (!openMenuId) return;

    const closeFloatingMenu = () => {
      setOpenMenuId(null);
      setActionMenuPosition(null);
    };

    window.addEventListener("resize", closeFloatingMenu);
    window.addEventListener("scroll", closeFloatingMenu, true);

    return () => {
      window.removeEventListener("resize", closeFloatingMenu);
      window.removeEventListener("scroll", closeFloatingMenu, true);
    };
  }, [openMenuId]);

  const getUniqueOptions = (key: string) =>
    Array.from(
      new Set(
        normalizedFiles
          .map((file) => file?.[key])
          .filter(
            (value) => value !== undefined && value !== null && value !== "",
          )
          .map(String),
      ),
    ).sort((a, b) => a.localeCompare(b));

  const visibleFiles = useMemo(() => {
    return normalizedFiles.filter((file) =>
      Object.entries(filters).every(([key, value]) => {
        if (!value) return true;
        return String(file?.[key] ?? "") === value;
      }),
    );
  }, [normalizedFiles, filters]);

  const visibleCountLabel = Object.values(filters).some(Boolean)
    ? `${visibleFiles.length} filtered from ${normalizedFiles.length} loaded`
    : `${totalCount} files`;

  const activeFilters = Object.entries(filters)
    .filter(([, value]) => value)
    .map(([key, value]) => ({ key, label: toTitle(key), value }));

  const selectedVisibleCount = visibleFiles.filter((file) =>
    selectedIds.includes(getFileId(file)),
  ).length;
  const allVisibleSelected =
    visibleFiles.length > 0 && selectedVisibleCount === visibleFiles.length;

  const tableGridTemplate = useMemo(() => {
    const dynamicColumns = columns
      .map((column) => `minmax(${column.minWidth || 130}px, 1fr)`)
      .join(" ");
    return `44px ${dynamicColumns} 120px`;
  }, [columns]);

  const tableMinWidth = useMemo(() => {
    const columnsWidth = columns.reduce(
      (total, column) => total + (column.minWidth || 130),
      0,
    );
    return Math.max(1200, 44 + columnsWidth + 120);
  }, [columns]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedIds((prev) =>
        prev.filter(
          (id) => !visibleFiles.some((file) => getFileId(file) === id),
        ),
      );
      return;
    }
    setSelectedIds((prev) =>
      Array.from(new Set([...prev, ...visibleFiles.map(getFileId)])),
    );
  };

  const updateFilter = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const removeFilter = (key: string) => {
    setFilters((prev) => ({ ...prev, [key]: "" }));
  };

  const resetFilters = () => setFilters({});

  const closeAndRun = (callback: () => void) => {
    setOpenMenuId(null);
    setActionMenuPosition(null);
    callback();
  };

  const goPrevious = () => {
    if (currentPage <= 1 || loadingPage) return;
    onPageChange?.(currentPage - 1, null);
  };

  const goNext = () => {
    if ((!hasMore && currentPage >= totalPages) || loadingPage) return;
    onPageChange?.(currentPage + 1, filePage?.nextCursor || null);
  };

  const openActionMenu = (
    event: MouseEvent<HTMLButtonElement>,
    fileId: string,
  ) => {
    event.stopPropagation();

    if (openMenuId === fileId) {
      setOpenMenuId(null);
      setActionMenuPosition(null);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const hasBottomSpace =
      rect.bottom + ACTION_MENU_HEIGHT + 12 <= viewportHeight;
    const placement: ActionMenuPosition["placement"] = hasBottomSpace
      ? "bottom"
      : "top";

    const left = Math.min(
      Math.max(16, rect.right - ACTION_MENU_WIDTH),
      viewportWidth - ACTION_MENU_WIDTH - 16,
    );

    const top =
      placement === "bottom"
        ? rect.bottom + 8
        : Math.max(16, rect.top - ACTION_MENU_HEIGHT - 8);

    setOpenMenuId(fileId);
    setActionMenuPosition({ top, left, placement });
  };

  if (error) {
    return (
      <div className="m-4 rounded-xl border border-red-4 bg-red-1 p-4 text-sm font-semibold text-red-10">
        {error}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-surface text-sm text-gray-11 animate-in fade-in duration-300">
      <Breadcrumbs items={breadcrumbs} onSelect={onBreadcrumbSelect} />

      <div className="flex h-12 shrink-0 items-center justify-between border-b border-gray-3 bg-surface px-5">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-gray-13">
            {visibleCountLabel}
          </span>
          {loadingPage && (
            <span className="text-xs font-semibold text-blue-10">
              Loading page...
            </span>
          )}
          {selectedIds.length > 0 && (
            <span className="rounded-full bg-blue-1 px-3 py-1 text-xs font-semibold text-blue-11">
              {selectedIds.length} selected
            </span>
          )}
        </div>

        {selectedIds.length > 0 && (
          <button
            type="button"
            onClick={() => setSelectedIds([])}
            className="font-semibold text-gray-11 transition-all hover:text-red-9"
          >
            Clear selection
          </button>
        )}
      </div>

      <div className="ez-scrollbar min-h-0 flex-1 overflow-y-auto ">
        <div className="space-y-5 p-6 min-w-0">
          <section className="rounded-xl border border-gray-3 bg-surface p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <DynamicIcon name="filter" className="h-5 w-5 text-gray-10" />
                <b className="text-gray-13">Filters</b>
                <span className="rounded-full bg-gray-2 px-2 py-1 text-xs font-semibold text-gray-13">
                  {activeFilters.length} active
                </span>
              </div>

              <div className="flex gap-5 text-sm font-semibold text-gray-13">
                <button type="button" className="hover:text-accent-primary">
                  <DynamicIcon name="save" className="mr-1 inline h-4 w-4" />
                  Save View
                </button>

                <button
                  type="button"
                  onClick={resetFilters}
                  className="hover:text-accent-primary"
                >
                  <DynamicIcon name="refresh" className="mr-1 inline h-4 w-4" />
                  Reset
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {filterColumns.map((column) => (
                <FilterSelect
                  key={column.key}
                  label={column.label}
                  value={filters[column.key] || ""}
                  options={getUniqueOptions(column.key)}
                  onChange={(value) => updateFilter(column.key, value)}
                />
              ))}
            </div>

            {activeFilters.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {activeFilters.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => removeFilter(item.key)}
                    className="rounded-lg bg-gray-2 px-3 py-1 text-xs font-semibold text-gray-13 hover:bg-gray-4"
                  >
                    {item.label}: {item.value}
                    <span className="ml-1 text-gray-9">×</span>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="min-w-0 overflow-hidden rounded-xl border border-gray-3 bg-surface-primary shadow-sm">
            {/* <div className="flex h-12 items-center justify-between border-b border-gray-3 bg-surface px-5">
              <div className="flex items-center gap-2">
                <DynamicIcon name="fileText" className="h-4 w-4 text-gray-9" />
                <b className="text-sm font-semibold text-gray-13">Documents</b>
                <span className="rounded-full bg-gray-2 px-2 py-0.5 text-xs font-semibold text-gray-10">
                  {visibleFiles.length}
                </span>
              </div>

              {loadingPage && (
                <span className="text-xs font-semibold text-blue-10">
                  Loading page...
                </span>
              )}
            </div> */}

            <div className="ez-scrollbar max-h-[calc(100vh-365px)] min-h-[calc(100vh-365px)] overflow-auto bg-surface">
              <div style={{ minWidth: tableMinWidth }} className="relative">
                <div
                  className="sticky top-0 z-40 grid border-b border-gray-3 bg-surface px-0 text-sm font-semibold text-gray-10 shadow-[0_1px_0_rgba(15,23,42,0.04)]"
                  style={{ gridTemplateColumns: tableGridTemplate }}
                >
                  <div className="sticky left-0 z-50 flex h-12 items-center justify-center  bg-surface">
                    {selectionEnabled && (
                      <CheckBoxButton
                        checked={allVisibleSelected}
                        onClick={toggleSelectAllVisible}
                      />
                    )}
                  </div>

                  {columns.map((column, columnIndex) => (
                    <div
                      key={column.key}
                      className={`flex h-12 items-center truncate  px-4 ${columnIndex === 0
                        ? "sticky left-[44px] z-50 bg-surface "
                        : "bg-surface"
                        }`}
                    >
                      {column.label}
                    </div>
                  ))}

                  <div className="sticky right-0 z-50 flex h-12 items-center border-l border-gray-3 bg-surface px-4 ">
                    Actions
                  </div>
                </div>

                {loading || loadingPage ? (
                  <TableSkeletonRows
                    columns={columns.length}
                    gridTemplate={tableGridTemplate}
                  />
                ) : visibleFiles.length === 0 ? (
                  <div className="flex min-h-[320px] flex-col items-center justify-center gap-2 px-6 py-10 text-center">
                    <DynamicIcon
                      name="search"
                      className="h-8 w-8 text-gray-8"
                    />
                    <b className="text-gray-13">No documents found</b>
                    <p className="text-sm text-gray-10">
                      Try changing or resetting the selected filters.
                    </p>
                    <Button
                      onClick={resetFilters}
                      className="mt-2 h-9 px-4 text-sm"
                    >
                      <DynamicIcon name="refresh" className="h-4 w-4" />
                      Reset Filters
                    </Button>
                  </div>
                ) : (
                  visibleFiles.map((file) => {
                    const fileId = getFileId(file);
                    const isSelected = selectedIds.includes(fileId);

                    return (
                      <div
                        key={fileId}
                        className={`group grid min-h-[48px] items-center border-b border-gray-3 px-0 text-sm transition-all ${isSelected ? "bg-blue-2" : "bg-surface transition-all hover:z-10 hover:bg-[var(--gray-1)] hover:shadow-sm [--pinned-bg:var(--surface)] hover:[--pinned-bg:var(--gray-1)]"
                          }`}
                        style={{ gridTemplateColumns: tableGridTemplate }}
                      >
                        <div
                          className={`sticky left-0 z-10 flex h-full w-[44px] items-center justify-center  ${isSelected
                            ? "bg-blue-2"
                            : "bg-surface transition-all hover:z-10 hover:bg-[var(--gray-1)] hover:shadow-sm [--pinned-bg:var(--surface)] hover:[--pinned-bg:var(--gray-1)]"
                            }`}
                        >
                          {selectionEnabled ? (
                            <CheckBoxButton
                              checked={isSelected}
                              onClick={() => toggleSelect(fileId)}
                            />
                          ) : (
                            <button
                              type="button"
                              disabled={loadingPage}
                              onClick={() => toggleSelect(fileId)}
                              className="h-5 w-5 rounded-md border border-transparent transition-all group-hover:border-blue-9 group-hover:bg-blue-1 disabled:cursor-not-allowed disabled:opacity-40"
                              title="Select"
                            />
                          )}
                        </div>

                        {columns.map((column, columnIndex) => {
                          const value = getDisplayValue(file, column.key);
                          const isNameColumn =
                            column.key === "fileName" || column.key === "name";
                          const isStatusColumn = column.key === "status";

                          if (isNameColumn) {
                            return (
                              <button
                                key={column.key}
                                type="button"
                                disabled={loadingPage}
                                onClick={() => onOpenFile(fileId)}
                                className={`flex h-full min-w-0 items-center gap-2  px-4 text-left font-semibold text-gray-13 hover:text-blue-11 disabled:cursor-not-allowed disabled:opacity-60 ${columnIndex === 0
                                  ? `sticky left-[44px] z-10 ${isSelected ? "bg-blue-2" : "bg-surface group-hover:bg-gray-4"} `
                                  : ""
                                  }`}
                              >
                                <DynamicIcon
                                  name="fileText"
                                  className="h-4 w-4 shrink-0 text-gray-9"
                                />
                                <span className="truncate">
                                  {getFileName(file)}
                                </span>
                              </button>
                            );
                          }

                          if (isStatusColumn) {
                            return (
                              <div
                                key={column.key}
                                className={`flex h-full items-center  px-4 ${columnIndex === 0
                                  ? `sticky left-[44px] z-10 ${isSelected ? "bg-blue-2" : "bg-surface group-hover:bg-gray-4"} `
                                  : ""
                                  }`}
                              >
                                <StatusPill status={value} />
                              </div>
                            );
                          }

                          return (
                            <span
                              key={column.key}
                              className={`group cursor-pointer flex h-full min-w-0 items-center  px-4 text-gray-10 ${columnIndex === 0
                                  ? `sticky left-[44px] z-10 ${isSelected ? 'bg-blue-2' : 'bg-surface group-hover:bg-gray-4'}`
                                  : ''
                                }`}
                            >
                              <span className="block max-w-full truncate group-hover:whitespace-normal group-hover:break-words group-hover:leading-5 group-hover:[overflow:visible] group-hover:[text-overflow:clip]">
                                {value}
                              </span>
                            </span>
                          );
                        })}

                        <div
                          className={`sticky right-0 z-10 flex h-full items-center gap-3 border-l border-gray-3 px-4 text-gray-13  ${isSelected
                            ? "bg-blue-2"
                            : "bg-surface group-hover:bg-gray-4"
                            }`}
                        >
                          <button
                            type="button"
                            disabled={loadingPage}
                            onClick={() => onOpenFile(fileId)}
                            className="hover:text-accent-primary disabled:cursor-not-allowed disabled:opacity-40"
                            title="View"
                          >
                            <DynamicIcon name="eye" />
                          </button>

                          <button
                            type="button"
                            disabled={loadingPage}
                            className="hover:text-accent-primary disabled:cursor-not-allowed disabled:opacity-40"
                            title="Download"
                          >
                            <DynamicIcon name="download" />
                          </button>

                          <button
                            type="button"
                            disabled={loadingPage}
                            onClick={(event) => openActionMenu(event, fileId)}
                            className="hover:text-accent-primary disabled:cursor-not-allowed disabled:opacity-40"
                            title="More actions"
                          >
                            <DynamicIcon name="more" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

      <div className="sticky bottom-0 z-50 flex h-[60px] shrink-0 items-center justify-between border-t border-gray-3 bg-surface px-6 shadow-[0_-6px_18px_rgba(15,23,42,0.08)]">
        <div className="text-sm font-semibold text-gray-13">
          Showing {fromItem} - {toItem} of {totalCount} Requests
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-[#24285b]">
            Requests per page:
          </span>

          <PageSizeDropdown
            value={pageSize}
            options={PAGE_SIZE_OPTIONS}
            disabled={loadingPage}
            onChange={(value) => onPageSizeChange?.(value)}
          />

          <button
            type="button"
            disabled={currentPage <= 1 || loadingPage}
            onClick={goPrevious}
            className="flex h-9 w-10 items-center justify-center rounded-lg border border-[#d8dcea] bg-surface text-[#9aa3bd] shadow-sm transition-all hover:bg-[#f7f8fc] hover:text-[#24285b] disabled:cursor-not-allowed disabled:opacity-45"
            title="Previous page"
          >
            <DynamicIcon name="chevronRight" className="h-4 w-4 rotate-180" />
          </button>

          <button
            type="button"
            disabled={(!hasMore && currentPage >= totalPages) || loadingPage}
            onClick={goNext}
            className="flex h-9 w-10 items-center justify-center rounded-lg border border-[#d8dcea] bg-surface text-[#24285b] shadow-sm transition-all hover:bg-[#f7f8fc] disabled:cursor-not-allowed disabled:opacity-45"
            title="Next page"
          >
            <DynamicIcon name="chevronRight" className="h-4 w-4" />
          </button>
        </div>
      </div>

      {openMenuId && actionMenuPosition ? (
        <div
          ref={menuRef}
          className="fixed z-[9999] w-[220px] overflow-hidden rounded-xl border border-gray-3 bg-surface py-2 shadow-[0_18px_45px_rgba(15,23,42,0.22)] ring-1 ring-black/5"
          style={{
            top: actionMenuPosition.top,
            left: actionMenuPosition.left,
          }}
        >
          <span
            className={`absolute right-7 h-3 w-3 rotate-45 border-gray-3 bg-surface ${actionMenuPosition.placement === "bottom"
              ? "-top-1.5 border-l border-t"
              : "-bottom-1.5 border-b border-r"
              }`}
          />
          <MenuItem
            icon="eye"
            label="View Details"
            onClick={() => closeAndRun(() => onOpenFile(openMenuId))}
          />
          <MenuItem
            icon="edit"
            label="Edit Metadata"
            onClick={() => closeAndRun(onEdit)}
          />
          <MenuItem
            icon="bot"
            label="AI Summary"
            onClick={() => closeAndRun(onAiSummary)}
          />
          <MenuItem
            icon="share"
            label="Share"
            onClick={() => closeAndRun(onShare)}
          />
          <MenuItem
            icon="clock"
            label="Start Workflow"
            onClick={() => closeAndRun(onWorkflow)}
          />
          <div className="my-2 border-t border-gray-3" />
          <MenuItem
            icon="trash"
            label="Delete"
            danger
            onClick={() =>
              closeAndRun(() => console.log("delete file:", openMenuId))
            }
          />
        </div>
      ) : null}
    </div>
  );
}

function TableSkeletonRows({
  columns,
  gridTemplate,
}: {
  columns: number;
  gridTemplate: string;
}) {
  return (
    <>
      {Array.from({ length: 8 }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="grid items-center border-b border-gray-3 px-4 py-3"
          style={{ gridTemplateColumns: gridTemplate }}
        >
          <span className="h-5 w-5 animate-pulse rounded bg-[#e9ebf3]" />
          {Array.from({ length: columns }).map((__, columnIndex) => (
            <span
              key={columnIndex}
              className={`h-4 animate-pulse rounded bg-[#e9ebf3] ${columnIndex === 0 ? "w-[70%]" : columnIndex % 2 === 0 ? "w-[52%]" : "w-[38%]"}`}
            />
          ))}
          <span className="ml-auto h-8 w-20 animate-pulse rounded-full bg-[#e9ebf3]" />
        </div>
      ))}
    </>
  );
}

function PageSizeDropdown({
  value,
  options,
  disabled = false,
  onChange,
}: {
  value: number;
  options: number[];
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const closeDropdown: EventListener = (event) => {
      const target = event.target as Node | null

      if (dropdownRef.current && target && !dropdownRef.current.contains(target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', closeDropdown)

    return () => {
      document.removeEventListener('mousedown', closeDropdown)
    }
  }, [])

  const selectValue = (nextValue: number) => {
    setOpen(false);
    if (nextValue !== value) onChange(nextValue);
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className="flex h-9 min-w-[74px] items-center justify-between gap-3 rounded-lg border border-[#d8dcea] bg-surface px-3 text-sm font-medium text-[#24285b] shadow-sm transition-all hover:bg-[#f7f8fc] focus:border-[#9aa8d9] focus:outline-none focus:ring-2 focus:ring-[#dbe2ff] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span>{value}</span>
        <DynamicIcon
          name="chevronDown"
          className={`h-4 w-4 text-[#7f89a8] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute bottom-[46px] right-0 z-[1000] w-[74px] overflow-hidden rounded-xl border border-[#e1e5f0] bg-surface py-2 shadow-[0_10px_28px_rgba(15,23,42,0.16)]">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => selectValue(option)}
              className={`flex h-8 w-full items-center px-4 text-left text-sm font-medium transition-all hover:bg-[#f3f5fb] ${option === value ? "text-[#24285b]" : "text-[#24285b]"
                }`}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CheckBoxButton({
  checked,
  onClick,
}: {
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={`flex h-5 w-5 items-center justify-center rounded-[6px] border transition-all focus:outline-none focus:ring-2 focus:ring-blue-3 ${checked ? "border-[#2196f3] bg-[#2196f3] text-white" : "border-[#2196f3] bg-surface text-transparent"}`}
    >
      <span className="text-[10px] leading-none">✓</span>
    </button>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 min-w-[180px] appearance-none rounded-lg border border-gray-3 bg-surface px-3 pr-9 text-sm text-gray-13 shadow-sm outline-none hover:bg-gray-4 focus:border-blue-8 focus:ring-2 focus:ring-blue-3"
      >
        <option value="">{label}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>

      <DynamicIcon
        name="chevronDown"
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-9"
      />
    </div>
  );
}

function MenuItem({
  icon,
  label,
  danger = false,
  onClick,
}: {
  icon: string;
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-[14px] hover:bg-gray-2 ${danger ? "text-red-9" : "text-gray-13"}`}
    >
      <DynamicIcon name={icon} className="h-4 w-4 text-current" />
      <span>{label}</span>
    </button>
  );
}
