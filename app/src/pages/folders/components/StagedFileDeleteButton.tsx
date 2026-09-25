import { useLingui } from '@lingui/react/macro'
import { useState } from 'react'
import ConfirmDialog from '@/components/base/ConfirmDialog'
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
