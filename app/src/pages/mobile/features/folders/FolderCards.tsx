import type { FileItem, FolderItem } from '@/pages/folders/types/folderTypes'
import { formatFolderModifiedDate } from '@/pages/folders/utils/folderExplorerUtils'
import cn from '@/utils/cn'
import { Icon } from '../../components/primitives/Icon'
import {
  getMobileFileAmount,
  getMobileFileCurrency,
  getMobileFileDate,
  getMobileFileDocType,
  getMobileFileName,
  getMobileFilePo,
  getMobileFileStatus,
  getMobileFileSupplier,
  getMobileStatusTone,
} from './fileCardDisplay'

const formatFolderDate = (value?: string) => {
  const formatted = formatFolderModifiedDate(value)
  return formatted === '-' ? '' : formatted
}

const getFolderMeta = (folder: FolderItem) => {
  const items = folder.itemsText?.trim() || ''
  const date = formatFolderDate(folder.modifiedText)
  return [items, date].filter(Boolean).join(' · ') || 'Folder'
}

type FileCardProps = {
  contextFilters?: Record<string, string>
  file: FileItem
  index?: number
  onOpen?: (id: string) => void
}

type FolderRowProps = {
  folder: FolderItem
  index?: number
  onOpen: (id: string) => void
}

export function FileCard({
  contextFilters = {},
  file,
  index = 0,
  onOpen,
}: FileCardProps) {
  const name = getMobileFileName(file)
  const status = getMobileFileStatus(file)
  const supplier = getMobileFileSupplier(file, contextFilters)
  const docType = getMobileFileDocType(file, contextFilters)
  const po = getMobileFilePo(file, contextFilters)
  const date = getMobileFileDate(file, contextFilters)
  const amount = getMobileFileAmount(file, contextFilters)
  const currency = getMobileFileCurrency(file, contextFilters)
  const tone = getMobileStatusTone(status)

  const toneClass = {
    error: 'bg-[var(--red-3)] text-[var(--red-9)]',
    info: 'bg-[var(--blue-3)] text-[var(--blue-9)]',
    neutral: 'text-[var(--gray-9)]',
    success: 'bg-[var(--green-3)] text-[var(--green-9)]',
    warning: 'bg-[var(--orange-3)] text-[var(--orange-9)]',
  }[tone]

  const subtitle = [supplier, docType].filter(Boolean).join(' · ').toUpperCase()

  const metaLeft = [po, date].filter(Boolean).join(' · ')
  const currencyLabel = currency
    ? currency.length <= 3
      ? currency.toUpperCase() === currency
        ? currency.charAt(0) + currency.slice(1).toLowerCase()
        : currency
      : currency
    : ''

  return (
    <button
      style={{ animationDelay: `${Math.min(index, 5) * 40}ms` }}
      type='button'
      className={cn(
        'w-full rounded-2xl border border-[var(--gray-3)] bg-surface-primary px-3.5 py-3 text-left shadow-sm transition-all',
        'animate-in fade-in slide-in-from-bottom-1 duration-300 active:scale-[0.98]',
      )}
      onClick={() => onOpen?.(String(file.id))}
    >
      <div className='flex items-center gap-3'>
        <span className='inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--gray-2)] text-[var(--gray-11)]'>
          <Icon className='size-4' name='FileText' />
        </span>

        <div className='flex min-w-0 flex-1 flex-col gap-0.5'>
          <div className='flex items-center justify-between gap-2'>
            <p className='min-w-0 flex-1 truncate text-[13px] leading-tight font-semibold text-[var(--gray-13)]'>
              {name}
            </p>
            {status ? (
              <span
                className={cn(
                  'inline-flex max-w-[40%] shrink-0 items-center truncate rounded-full px-2 py-0.5 text-[10px] leading-none font-semibold',
                  toneClass,
                )}
              >
                {status}
              </span>
            ) : (
              <span className='shrink-0 text-[12px] leading-none text-[var(--gray-9)]'>
                —
              </span>
            )}
          </div>

          <p className='truncate text-[11px] leading-tight text-[var(--gray-9)]'>
            {subtitle || 'DOCUMENT'}
          </p>

          <div className='mt-0.5 flex items-center justify-between gap-2'>
            <span className='min-w-0 truncate text-[11px] leading-tight text-[var(--gray-9)]'>
              {metaLeft || '—'}
            </span>
            {amount ? (
              <span className='shrink-0 text-[12px] leading-tight font-bold text-[var(--gray-13)]'>
                {amount}
                {currencyLabel ? (
                  <span className='ml-1 font-normal text-[var(--gray-9)]'>
                    {currencyLabel}
                  </span>
                ) : null}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </button>
  )
}

export function FolderRow({ folder, index = 0, onOpen }: FolderRowProps) {
  return (
    <button
      style={{ animationDelay: `${Math.min(index, 5) * 40}ms` }}
      type='button'
      className={cn(
        'flex w-full items-center gap-3 rounded-2xl border border-[var(--gray-3)] bg-surface-primary px-3.5 py-3 text-left shadow-sm transition-all',
        'animate-in fade-in slide-in-from-bottom-1 duration-300 active:scale-[0.98]',
      )}
      onClick={() => onOpen(folder.id)}
    >
      <span className='inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-3)] text-[var(--primary-9)]'>
        <Icon className='size-[18px]' name='Folder' />
      </span>

      <div className='flex min-w-0 flex-1 flex-col justify-center gap-0.5'>
        <p className='truncate text-[13px] leading-tight font-semibold text-[var(--gray-13)]'>
          {folder.title}
        </p>
        <p className='truncate text-[11px] leading-tight text-[var(--gray-9)]'>
          {getFolderMeta(folder)}
        </p>
      </div>

      <Icon
        className='size-4 shrink-0 text-[var(--gray-9)]'
        name='ChevronRight'
      />
    </button>
  )
}
