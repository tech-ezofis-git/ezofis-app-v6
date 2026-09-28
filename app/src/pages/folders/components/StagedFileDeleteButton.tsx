import { useLingui } from '@lingui/react/macro'
import { useState } from 'react'
import ConfirmDialog from '@/components/base/ConfirmDialog'
import Icon from '@/components/base/icon/Icon'
import { getRepositoryFieldRawValue } from '../utils/repositoryFieldUtils'
import { DynamicIcon } from './icons'

export const isUnarchivedStageFile = (file: {
  isArchived?: boolean
  isStaged?: boolean
  rawStatus?: string
  stageFileId?: string
  status?: string
} | null | undefined) => {
  if (!file?.isStaged && !file?.stageFileId) return false
  if (file.isArchived) return false
  const status = String(file.status || (file as any)?.rawStatus || '').toUpperCase()
  return status !== 'ARCHIVED'
}

export const isArchivedFile = (file: {
  isArchived?: boolean
  isStaged?: boolean
  rawStatus?: string
  stageFileId?: string
  status?: string
} | null | undefined) => {
  if (!file) return false
  return !isUnarchivedStageFile(file)
}

export const hasAllMandatoryFieldsFilled = (
  file: any,
  columns?: Array<{
    key: string
    label?: string
    fieldId?: string
    isMandatory?: boolean
  }>,
  contextFilters: Record<string, string> = {},
): boolean => {
  if (!columns || !columns.length) return true
  const mandatoryCols = columns.filter((col) => col.isMandatory)
  if (mandatoryCols.length === 0) return true

  return mandatoryCols.every((col) => {
    let val = getRepositoryFieldRawValue(file, col.key, contextFilters)
    if (val === undefined && col.label) {
      val = getRepositoryFieldRawValue(file, col.label, contextFilters)
    }
    if (val === undefined && col.fieldId) {
      val = getRepositoryFieldRawValue(file, col.fieldId, contextFilters)
    }

    if (val === undefined || val === null) return false
    if (typeof val === 'string' && val.trim() === '') return false
    if (typeof val === 'number') return true
    if (typeof val === 'boolean') return true
    if (Array.isArray(val)) return val.length > 0
    if (typeof val === 'object') {
      const str = JSON.stringify(val)
      return str !== '{}' && str !== '[]' && str !== 'null'
    }
    return String(val).trim() !== ''
  })
}

export function StagedFileExportButton({
  disabled = false,
  fileName,
  onExport,
}: {
  disabled?: boolean
  fileName: string
  onExport: () => Promise<void>
}) {
  const { t } = useLingui()
  const [opened, setOpened] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)

  return (
    <>
      <button
        aria-label={t`Export`}
        title={t`Export staged file`}
        className='inline-flex h-8 w-8 items-center justify-center rounded-lg text-primary-10 transition-all hover:bg-primary-2 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40'
        disabled={disabled || isConfirming}
        type='button'
        onClick={(event) => {
          event.stopPropagation()
          setOpened(true)
        }}
      >
        <Icon className='size-4' name='tabler:file-export' />
      </button>
      <ConfirmDialog
        cancelLabel={t`Cancel`}
        confirmLabel={t`Export`}
        description={t`Export ${fileName} to the repository?`}
        isConfirming={isConfirming}
        opened={opened}
        title={t`Export staged file`}
        variant='default'
        onCancel={() => {
          if (!isConfirming) setOpened(false)
        }}
        onConfirm={() => {
          void (async () => {
            setIsConfirming(true)
            try {
              await onExport()
              setOpened(false)
            } catch {
              // The caller reports the error. Keep the dialog open.
            } finally {
              setIsConfirming(false)
            }
          })()
        }}
      />
    </>
  )
}

export function StagedFileDeleteButton({
  disabled = false,
  fileName,
  onDelete,
}: {
  disabled?: boolean
  fileName: string
  onDelete: () => Promise<void>
}) {
  const { t } = useLingui()
  const [opened, setOpened] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)

  return (
    <>
      <button
        aria-label={t`Delete`}
        title={t`Delete staged file`}
        className='inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-9 transition-all hover:bg-red-2 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40'
        disabled={disabled || isConfirming}
        type='button'
        onClick={(event) => {
          event.stopPropagation()
          setOpened(true)
        }}
      >
        <DynamicIcon className='h-4 w-4' name='trash' />
      </button>
      <ConfirmDialog
        cancelLabel={t`Cancel`}
        confirmLabel={t`Delete`}
        description={t`Delete ${fileName} from the staged list?`}
        isConfirming={isConfirming}
        opened={opened}
        title={t`Delete staged file`}
        variant='danger'
        onCancel={() => {
          if (!isConfirming) setOpened(false)
        }}
        onConfirm={() => {
          void (async () => {
            setIsConfirming(true)
            try {
              await onDelete()
              setOpened(false)
            } catch {
              // The caller reports the error. Keep the dialog open.
            } finally {
              setIsConfirming(false)
            }
          })()
        }}
      />
    </>
  )
}
