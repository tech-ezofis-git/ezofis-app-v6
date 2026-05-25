import { useEffect, useMemo, useRef, useState } from 'react'
import type { FileItem } from '../types/folderTypes'
import { Breadcrumbs, type BreadcrumbItem } from './Breadcrumbs'
import { DynamicIcon } from './icons'
import { Button, StatusPill } from './Ui'

export function DocumentsListView({
  files,
  breadcrumbs,
  onBreadcrumbSelect,
  onOpenFile,
  onEdit,
  onAiSummary,
  onShare,
  onWorkflow,
}: {
  files: FileItem[]
  breadcrumbs: BreadcrumbItem[]
  onBreadcrumbSelect: (id: string) => void
  onOpenFile: (id: string) => void
  onEdit: () => void
  onAiSummary: () => void
  onShare: () => void
  onWorkflow: () => void
}) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)

  const menuRef = useRef<HTMLDivElement | null>(null)

  const [pageSize, setPageSize] = useState(10)
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    supplier: '',
    department: '',
    risk: '',
    source: '',
  })

  const selectionEnabled = selectedIds.length > 0

  useEffect(() => {
    const closeMenu = (event: MouseEvent) => {
      if (!menuRef.current) return
      if (!menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null)
      }
    }

    document.addEventListener('mousedown', closeMenu)
    return () => document.removeEventListener('mousedown', closeMenu)
  }, [])

  const getUniqueOptions = (key: keyof FileItem | 'department') => {
    return Array.from(
      new Set(
        files
          .map((file) => (file as any)[key])
          .filter(Boolean)
          .map(String)
      )
    ).sort((a, b) => a.localeCompare(b))
  }

  const filteredFiles = useMemo(() => {
    return files.filter((file) => {
      const item = file as any

      return (
        (!filters.type || item.type === filters.type) &&
        (!filters.status || item.status === filters.status) &&
        (!filters.supplier || item.supplier === filters.supplier) &&
        (!filters.department || item.department === filters.department) &&
        (!filters.risk || item.risk === filters.risk) &&
        (!filters.source || item.source === filters.source)
      )
    })
  }, [files, filters])

  const totalPages = Math.max(1, Math.ceil(filteredFiles.length / pageSize))

const paginatedFiles = useMemo(() => {
  const start = (currentPage - 1) * pageSize
  return filteredFiles.slice(start, start + pageSize)
}, [filteredFiles, currentPage, pageSize])

useEffect(() => {
  setCurrentPage(1)
}, [filters, pageSize])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const getVisiblePages = () => {
    const pages = new Set<number>()

    pages.add(1)
    pages.add(totalPages)
    pages.add(currentPage)

    if (currentPage - 1 >= 1) pages.add(currentPage - 1)
    if (currentPage + 1 <= totalPages) pages.add(currentPage + 1)

    return Array.from(pages).sort((a, b) => a - b)
  }

  const activeFilters = [
    { key: 'type', label: 'Type', value: filters.type },
    { key: 'status', label: 'Status', value: filters.status },
    { key: 'supplier', label: 'Supplier', value: filters.supplier },
    { key: 'department', label: 'Department', value: filters.department },
    { key: 'risk', label: 'Risk', value: filters.risk },
    { key: 'source', label: 'Source', value: filters.source },
  ].filter((item) => item.value)

  const selectedVisibleCount = paginatedFiles.filter((file) =>
    selectedIds.includes(file.id)
  ).length

  const allVisibleSelected =
    paginatedFiles.length > 0 && selectedVisibleCount === paginatedFiles.length

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedIds((prev) =>
        prev.filter((id) => !paginatedFiles.some((file) => file.id === id))
      )
      return
    }

    setSelectedIds((prev) =>
      Array.from(new Set([...prev, ...paginatedFiles.map((file) => file.id)]))
    )
  }

  const updateFilter = (key: keyof typeof filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const removeFilter = (key: keyof typeof filters) => {
    setFilters((prev) => ({ ...prev, [key]: '' }))
  }

  const resetFilters = () => {
    setFilters({
      type: '',
      status: '',
      supplier: '',
      department: '',
      risk: '',
      source: '',
    })
  }

  const closeAndRun = (callback: () => void) => {
    setOpenMenuId(null)
    callback()
  }

  const visiblePages = getVisiblePages()

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-surface-secondary text-sm text-gray-11 animate-in fade-in duration-300">
      <Breadcrumbs items={breadcrumbs} onSelect={onBreadcrumbSelect} />

      <div className="flex h-12 shrink-0 items-center justify-between border-b border-gray-3 bg-surface-primary px-5">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-gray-13">
            {filteredFiles.length} files
          </span>

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

      <div className="ez-scrollbar min-h-0 flex-1 overflow-y-auto pb-20">
        <div className="space-y-5 p-6">
          <section className="rounded-xl border border-gray-3 bg-surface-primary p-5 shadow-sm">
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
              <FilterSelect
                label="All Types"
                value={filters.type}
                options={getUniqueOptions('type')}
                onChange={(value) => updateFilter('type', value)}
              />
              <FilterSelect
                label="All Statuses"
                value={filters.status}
                options={getUniqueOptions('status')}
                onChange={(value) => updateFilter('status', value)}
              />
              <FilterSelect
                label="All Suppliers"
                value={filters.supplier}
                options={getUniqueOptions('supplier')}
                onChange={(value) => updateFilter('supplier', value)}
              />
              <FilterSelect
                label="All Departments"
                value={filters.department}
                options={getUniqueOptions('department')}
                onChange={(value) => updateFilter('department', value)}
              />
              <FilterSelect
                label="All Risk Levels"
                value={filters.risk}
                options={getUniqueOptions('risk')}
                onChange={(value) => updateFilter('risk', value)}
              />
              <FilterSelect
                label="All Sources"
                value={filters.source}
                options={getUniqueOptions('source')}
                onChange={(value) => updateFilter('source', value)}
              />
            </div>

            {activeFilters.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {activeFilters.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => removeFilter(item.key as keyof typeof filters)}
                    className="rounded-lg bg-gray-2 px-3 py-1 text-xs font-semibold text-gray-13 hover:bg-gray-4"
                  >
                    {item.label}: {item.value}
                    <span className="ml-1 text-gray-9">×</span>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="overflow-visible rounded-xl border border-gray-3 bg-surface-primary shadow-sm">
            <div className="grid grid-cols-[44px_1.6fr_1fr_1fr_0.9fr_0.8fr_0.9fr_0.7fr_0.9fr_0.5fr_0.5fr_0.5fr_0.7fr_0.7fr] border-b border-gray-3 px-4 py-3 text-sm font-semibold text-gray-10">
              <span>
                {selectionEnabled && (
                  <CheckBoxButton
                    checked={allVisibleSelected}
                    onClick={toggleSelectAllVisible}
                  />
                )}
              </span>
              <span>File Name</span>
              <span>Type</span>
              <span>Supplier</span>
              <span>Invoice #</span>
              <span>PO #</span>
              <span>Date ↕</span>
              <span>Amount ↕</span>
              <span>Status</span>
              <span>OCR</span>
              <span>AI</span>
              <span>Risk</span>
              <span>Source</span>
              <span>Actions</span>
            </div>

            {paginatedFiles.length === 0 ? (
              <div className="flex min-h-[180px] flex-col items-center justify-center gap-2 px-6 py-10 text-center">
                <DynamicIcon name="search" className="h-8 w-8 text-gray-8" />
                <b className="text-gray-13">No documents found</b>
                <p className="text-sm text-gray-10">
                  Try changing or resetting the selected filters.
                </p>
                <Button onClick={resetFilters} className="mt-2 h-9 px-4 text-sm">
                  <DynamicIcon name="refresh" className="h-4 w-4" />
                  Reset Filters
                </Button>
              </div>
            ) : (
              paginatedFiles.map((file) => {
                const isSelected = selectedIds.includes(file.id)

                return (
                  <div
                    key={file.id}
                    className={`group grid grid-cols-[44px_1.6fr_1fr_1fr_0.9fr_0.8fr_0.9fr_0.7fr_0.9fr_0.5fr_0.5fr_0.5fr_0.7fr_0.7fr] items-center border-b border-gray-3 px-4 py-3 text-sm transition-all ${isSelected ? 'bg-blue-2' : 'hover:bg-gray-4'
                      }`}
                  >
                    <span>
                      {selectionEnabled ? (
                        <CheckBoxButton
                          checked={isSelected}
                          onClick={() => toggleSelect(file.id)}
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => toggleSelect(file.id)}
                          className="h-5 w-5 rounded-md border border-transparent transition-all group-hover:border-blue-9 group-hover:bg-blue-1"
                          title="Select"
                        />
                      )}
                    </span>

                    <button
                      type="button"
                      onClick={() => onOpenFile(file.id)}
                      className="flex items-center gap-2 text-left font-semibold text-gray-13 hover:text-blue-11"
                    >
                      <DynamicIcon
                        name="fileText"
                        className="h-4 w-4 text-gray-9"
                      />
                      <span className="truncate">{file.name}</span>
                    </button>

                    <span className="text-gray-10">{file.type}</span>
                    <b className="truncate text-gray-13">{file.supplier}</b>
                    <span className="font-mono text-gray-10">
                      {file.invoiceNo || '-'}
                    </span>
                    <span className="font-mono text-gray-10">
                      {file.poNo || '-'}
                    </span>
                    <span className="text-gray-10">{file.date}</span>
                    <b className="text-gray-13">{file.amount || '-'}</b>
                    <StatusPill status={file.status} />

                    <b
                      className={
                        file.ocr < 80
                          ? 'text-red-9'
                          : file.ocr < 95
                            ? 'text-orange-9'
                            : 'text-green-9'
                      }
                    >
                      {file.ocr}%
                    </b>

                    <DynamicIcon
                      name={file.ocr < 80 ? 'xCircle' : 'checkCircle'}
                      className={
                        file.ocr < 80
                          ? 'h-5 w-5 text-red-9'
                          : 'h-5 w-5 text-green-9'
                      }
                    />

                    <span
                      className={
                        file.risk === 'high'
                          ? 'h-3 w-3 rounded-full bg-red-9'
                          : file.risk === 'medium'
                            ? 'h-3 w-3 rounded-full bg-orange-9'
                            : 'h-3 w-3 rounded-full bg-green-9'
                      }
                    />

                    <span className="text-gray-10">{file.source}</span>

                    <div
                      className="relative flex gap-3 text-gray-13"
                      ref={openMenuId === file.id ? menuRef : null}
                    >
                      <button
                        type="button"
                        onClick={() => onOpenFile(file.id)}
                        className="hover:text-accent-primary"
                        title="View"
                      >
                        <DynamicIcon name="eye" />
                      </button>

                      <button
                        type="button"
                        className="hover:text-accent-primary"
                        title="Download"
                      >
                        <DynamicIcon name="download" />
                      </button>

                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          setOpenMenuId((current) =>
                            current === file.id ? null : file.id
                          )
                        }}
                        className="hover:text-accent-primary"
                        title="More actions"
                      >
                        <DynamicIcon name="more" />
                      </button>

                      {openMenuId === file.id && (
                        <div className="absolute right-0 top-8 z-[999] w-[220px] overflow-hidden rounded-xl border border-gray-3 bg-white py-2 shadow-xl ring-1 ring-black/5">
                          <MenuItem
                            icon="eye"
                            label="View Details"
                            onClick={() => closeAndRun(() => onOpenFile(file.id))}
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
                              closeAndRun(() =>
                                console.log('delete file:', file.id)
                              )
                            }
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </section>
        </div>
      </div>

      <div className="sticky bottom-0 z-50 flex h-[60px] shrink-0 items-center justify-between border-t border-gray-3 bg-white px-4 shadow-[0_-6px_18px_rgba(15,23,42,0.08)]">
        <div className="flex items-center gap-3">
          <DynamicIcon name="fileText" className="h-4 w-4 text-gray-9" />

          <div className="text-xs font-semibold leading-tight text-gray-13">
            Showing{' '}
            <span>
              {filteredFiles.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}-
              {Math.min(currentPage * pageSize, filteredFiles.length)}
            </span>
            {' '} of {filteredFiles.length} documents
          </div>

          {/* <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-2 text-[11px] font-bold leading-tight text-blue-11">
            <span>
              {filteredFiles.length}
              total
            </span>
          </div> */}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            className="flex h-9 items-center gap-2 rounded-lg border border-gray-3 bg-gray-1 px-4 text-sm font-semibold text-gray-10 transition-all hover:bg-gray-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <DynamicIcon name="chevronRight" className="h-4 w-4 rotate-180" />
            Previous
          </button>

          <div className="flex items-center gap-2">
            {visiblePages.map((page, index) => {
              const previousPage = visiblePages[index - 1]
              const showDots = previousPage && page - previousPage > 1

              return (
                <div key={page} className="flex items-center gap-2">
                  {showDots && (
                    <span className="text-sm font-bold text-gray-8">...</span>
                  )}

                  <button
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={`h-9 min-w-9 rounded-lg border px-3 text-sm font-bold transition-all ${currentPage === page
                      ? 'border-blue-9 bg-white text-blue-10 shadow-sm'
                      : 'border-gray-3 bg-white text-gray-13 hover:bg-gray-2'
                      }`}
                  >
                    {page}
                  </button>
                </div>
              )
            })}
          </div>

          <button
            type="button"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            className="flex h-9 items-center gap-2 rounded-lg border border-gray-3 bg-white px-4 text-sm font-semibold text-gray-13 transition-all hover:bg-gray-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
            <DynamicIcon name="chevronRight" className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-3 text-sm text-gray-13">
          <span className="font-semibold">Rows</span>

          <select
            value={pageSize}
            onChange={(event) => {
              setPageSize(Number(event.target.value))
              setCurrentPage(1)
            }}
            className="h-9 rounded-lg border border-gray-3 bg-white px-2 text-sm font-semibold outline-none hover:bg-gray-2 focus:border-blue-8 focus:ring-2 focus:ring-blue-3"
          >
            <option value={1}>1</option>
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>

          <span className="font-semibold">
            Go to <span className="text-blue-10">{currentPage}</span>
          </span>
        </div>
      </div>
    </div>
  )
}

function CheckBoxButton({
  checked,
  onClick,
}: {
  checked: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
      className={`flex h-5 w-5 items-center justify-center rounded-[6px] border transition-all focus:outline-none focus:ring-2 focus:ring-blue-3 ${checked
        ? 'border-[#2196f3] bg-[#2196f3] text-white'
        : 'border-[#2196f3] bg-white text-transparent'
        }`}
    >
      <span className="text-[10px] leading-none">✓</span>
    </button>
  )
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
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
  )
}

function MenuItem({
  icon,
  label,
  danger = false,
  onClick,
}: {
  icon: string
  label: string
  danger?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-[14px] hover:bg-gray-2 ${danger ? 'text-red-9' : 'text-gray-13'
        }`}
    >
      <DynamicIcon name={icon} className="h-4 w-4 text-current" />
      <span>{label}</span>
    </button>
  )
}