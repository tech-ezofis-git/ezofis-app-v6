import { useEffect, useMemo, useRef, useState } from 'react'
import type { FileItem } from '../types/folderTypes'
import { DynamicIcon } from './icons'
import { Button, StatusPill } from './Ui'

export function DocumentsListView({
  files,
  onAiSummary,
  onBack,
  onEdit,
  onOpenFile,
  onShare,
  onWorkflow,
}: {
  files: FileItem[]
  onAiSummary: () => void
  onBack: () => void
  onEdit: () => void
  onOpenFile: (id: string) => void
  onShare: () => void
  onWorkflow: () => void
}) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)

  const [filters, setFilters] = useState({
    department: '',
    risk: '',
    source: '',
    status: '',
    supplier: '',
    type: '',
  })

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
          .map(String),
      ),
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

  const activeFilters = [
    { key: 'type', label: 'Type', value: filters.type },
    { key: 'status', label: 'Status', value: filters.status },
    { key: 'supplier', label: 'Supplier', value: filters.supplier },
    { key: 'department', label: 'Department', value: filters.department },
    { key: 'risk', label: 'Risk', value: filters.risk },
    { key: 'source', label: 'Source', value: filters.source },
  ].filter((x) => x.value)

  const updateFilter = (key: keyof typeof filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const removeFilter = (key: keyof typeof filters) => {
    setFilters((prev) => ({ ...prev, [key]: '' }))
  }

  const resetFilters = () => {
    setFilters({
      department: '',
      risk: '',
      source: '',
      status: '',
      supplier: '',
      type: '',
    })
  }

  const closeAndRun = (callback: () => void) => {
    setOpenMenuId(null)
    callback()
  }

  return (
    <div className='ez-scrollbar animate-in fade-in min-h-0 flex-1 overflow-y-scroll bg-surface-secondary text-sm text-gray-11 duration-300'>
      <div className='space-y-5 p-8'>
        <div className='flex items-center gap-2 text-sm text-gray-10'>
          <button
            className='transition-all hover:text-gray-12 active:scale-95'
            type='button'
            onClick={onBack}
          >
            Root
          </button>
          <span>/</span>
          <span>Accounts Payable</span>
          <span>/</span>
          <b className='text-gray-13'>Invoices 2024</b>
          <span className='inline-flex w-fit items-center rounded-full bg-gray-2 px-2 py-1 text-xs font-semibold whitespace-nowrap text-gray-13'>
            {filteredFiles.length} files
          </span>
        </div>

        <section className='rounded-xl border border-gray-3 bg-surface-primary p-5 shadow-sm'>
          <div className='mb-5 flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <DynamicIcon className='h-5 w-5 text-gray-10' name='filter' />
              <b className='text-gray-13'>Filters</b>
              <span className='inline-flex w-fit items-center rounded-full bg-gray-2 px-2 py-1 text-xs font-semibold whitespace-nowrap text-gray-13'>
                {activeFilters.length} active
              </span>
            </div>

            <div className='flex gap-5 text-sm font-semibold text-gray-13'>
              <button
                className='transition-all hover:text-accent-primary active:scale-95'
                type='button'
              >
                <DynamicIcon className='mr-1 inline h-4 w-4' name='save' />
                Save View
              </button>

              <button
                className='transition-all hover:text-accent-primary active:scale-95'
                type='button'
                onClick={resetFilters}
              >
                <DynamicIcon className='mr-1 inline h-4 w-4' name='refresh' />
                Reset
              </button>
            </div>
          </div>

          <div className='flex flex-wrap gap-3'>
            <FilterSelect
              label='All Types'
              options={getUniqueOptions('type')}
              value={filters.type}
              onChange={(value) => updateFilter('type', value)}
            />
            <FilterSelect
              label='All Statuses'
              options={getUniqueOptions('status')}
              value={filters.status}
              onChange={(value) => updateFilter('status', value)}
            />
            <FilterSelect
              label='All Suppliers'
              options={getUniqueOptions('supplier')}
              value={filters.supplier}
              onChange={(value) => updateFilter('supplier', value)}
            />
            <FilterSelect
              label='All Departments'
              options={getUniqueOptions('department')}
              value={filters.department}
              onChange={(value) => updateFilter('department', value)}
            />
            <FilterSelect
              label='All Risk Levels'
              options={getUniqueOptions('risk')}
              value={filters.risk}
              onChange={(value) => updateFilter('risk', value)}
            />
            <FilterSelect
              label='All Sources'
              options={getUniqueOptions('source')}
              value={filters.source}
              onChange={(value) => updateFilter('source', value)}
            />
          </div>

          {activeFilters.length > 0 && (
            <div className='mt-4 flex flex-wrap gap-2'>
              {activeFilters.map((item) => (
                <button
                  className='inline-flex w-fit items-center gap-1 rounded-lg bg-gray-2 px-3 py-1 text-xs font-semibold whitespace-nowrap text-gray-13 transition-all hover:bg-gray-4 active:scale-95'
                  key={item.key}
                  type='button'
                  onClick={() => removeFilter(item.key as keyof typeof filters)}
                >
                  {item.label}: {item.value}
                  <span className='text-gray-9'>×</span>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className='overflow-visible rounded-xl border border-gray-3 bg-surface-primary shadow-sm'>
          <div className='grid grid-cols-[44px_1.6fr_1fr_1fr_0.9fr_0.8fr_0.9fr_0.7fr_0.9fr_0.5fr_0.5fr_0.5fr_0.7fr_0.7fr] border-b border-gray-3 px-4 py-3 text-sm font-semibold text-gray-10'>
            <span className='h-5 w-5 rounded-md border border-blue-9' />
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

          {filteredFiles.length === 0 ? (
            <div className='flex min-h-[180px] flex-col items-center justify-center gap-2 px-6 py-10 text-center'>
              <DynamicIcon className='h-8 w-8 text-gray-8' name='search' />
              <b className='text-gray-13'>No documents found</b>
              <p className='text-sm text-gray-10'>
                Try changing or resetting the selected filters.
              </p>
              <Button className='mt-2 h-9 px-4 text-sm' onClick={resetFilters}>
                <DynamicIcon className='h-4 w-4' name='refresh' />
                Reset Filters
              </Button>
            </div>
          ) : (
            filteredFiles.map((file) => (
              <div
                className='group grid grid-cols-[44px_1.6fr_1fr_1fr_0.9fr_0.8fr_0.9fr_0.7fr_0.9fr_0.5fr_0.5fr_0.5fr_0.7fr_0.7fr] items-center border-b border-gray-3 px-4 py-3 text-sm transition-all hover:bg-gray-4'
                key={file.id}
              >
                <span className='h-5 w-5 rounded-md border border-blue-9' />

                <button
                  className='flex items-center gap-2 text-left font-semibold text-gray-13 transition-all hover:text-blue-11 active:scale-[0.99]'
                  type='button'
                  onClick={() => onOpenFile(file.id)}
                >
                  <DynamicIcon
                    className='h-4 w-4 text-gray-9'
                    name='fileText'
                  />
                  <span className='truncate'>{file.name}</span>
                </button>

                <span className='text-gray-10'>{file.type}</span>
                <b className='truncate text-gray-13'>{file.supplier}</b>
                <span className='font-mono text-gray-10'>
                  {file.invoiceNo || '-'}
                </span>
                <span className='font-mono text-gray-10'>
                  {file.poNo || '-'}
                </span>
                <span className='text-gray-10'>{file.date}</span>
                <b className='text-gray-13'>{file.amount || '-'}</b>
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
                <span className='text-gray-10'>{file.source}</span>

                <div
                  className='relative flex gap-3 text-gray-13'
                  ref={openMenuId === file.id ? menuRef : null}
                >
                  <button
                    className='transition-all hover:text-accent-primary active:scale-95'
                    title='View'
                    type='button'
                    onClick={() => onOpenFile(file.id)}
                  >
                    <DynamicIcon name='eye' />
                  </button>

                  <button
                    className='transition-all hover:text-accent-primary active:scale-95'
                    title='Download'
                    type='button'
                  >
                    <DynamicIcon name='download' />
                  </button>

                  <button
                    className='transition-all hover:text-accent-primary active:scale-95'
                    title='More actions'
                    type='button'
                    onClick={(event) => {
                      event.stopPropagation()
                      setOpenMenuId((current) =>
                        current === file.id ? null : file.id,
                      )
                    }}
                  >
                    <DynamicIcon name='more' />
                  </button>

                  {openMenuId === file.id && (
                    <div className='absolute top-8 right-0 z-[999] w-[220px] overflow-hidden rounded-xl border border-gray-3 bg-white py-2 shadow-xl ring-1 ring-black/5'>
                      <MenuItem
                        icon='eye'
                        label='View Details'
                        onClick={() => closeAndRun(() => onOpenFile(file.id))}
                      />
                      <MenuItem
                        icon='edit'
                        label='Edit Metadata'
                        onClick={() => closeAndRun(onEdit)}
                      />
                      <MenuItem
                        icon='bot'
                        label='AI Summary'
                        onClick={() => closeAndRun(onAiSummary)}
                      />
                      <MenuItem
                        icon='share'
                        label='Share'
                        onClick={() => closeAndRun(onShare)}
                      />
                      <MenuItem
                        icon='clock'
                        label='Start Workflow'
                        onClick={() => closeAndRun(onWorkflow)}
                      />

                      <div className='my-2 border-t border-gray-3' />

                      <MenuItem
                        icon='trash'
                        label='Delete'
                        danger
                        onClick={() =>
                          closeAndRun(() =>
                            console.log('delete file:', file.id),
                          )
                        }
                      />
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  )
}

function FilterSelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: string[]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className='relative'>
      <select
        className='h-10 min-w-[180px] appearance-none rounded-lg border border-gray-3 bg-surface px-3 pr-9 text-sm text-gray-13 shadow-sm transition-all outline-none hover:bg-gray-4 focus:border-blue-8 focus:ring-2 focus:ring-blue-3'
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value=''>{label}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>

      <DynamicIcon
        className='pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-gray-9'
        name='chevronDown'
      />
    </div>
  )
}

function MenuItem({
  danger = false,
  icon,
  label,
  onClick,
}: {
  danger?: boolean
  icon: string
  label: string
  onClick: () => void
}) {
  return (
    <button
      type='button'
      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-[14px] transition-all hover:bg-gray-2 ${
        danger ? 'text-red-9' : 'text-gray-13'
      }`}
      onClick={onClick}
    >
      <DynamicIcon className='h-4 w-4 text-current' name={icon} />
      <span>{label}</span>
    </button>
  )
}
