import { useLingui } from '@lingui/react/macro'
import { createColumnHelper, useReactTable } from '@tanstack/react-table'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FolderPiiUserAccess } from '@/pages/folders/utils/folderPiiSettings'
import type { Option } from '@/types/option'
import { updateRepository } from '@/api/createFolder'
import { getRepositoryById } from '@/api/v6/folder/folder'
import type { V6UserListItem } from '@/api/v6/user'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import DataTable from '@/components/base/data-table/DataTable'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputPassword from '@/components/base/inputs/password/InputPassword'
import showToast from '@/components/base/toast/showToast'
import {
  emptyFolderPiiSettings,
  type FolderPiiSettings,
  folderPiiSettingsToApiPayload,
  resolveFolderPiiSettings,
  writeCachedFolderPiiSettings,
} from '@/pages/folders/utils/folderPiiSettings'
import {
  settingsHeaderMeta,
  settingsTableCoreOptions,
} from '../../helpers/settingsDataTable'
import useSettingsTableToolbar from '../useSettingsTableToolbar'

type AccessRow = FolderPiiUserAccess & { rowId: string }

type PiiUnredactedAccessSectionProps = {
  repositoryId: string
  users: V6UserListItem[]
}

const columnHelper = createColumnHelper<AccessRow>()

const toAccessRows = (users: FolderPiiUserAccess[]): AccessRow[] =>
  users.map((entry) => ({
    ...entry,
    rowId: crypto.randomUUID(),
  }))

const PiiUnredactedAccessSection = ({
  repositoryId,
  users,
}: PiiUnredactedAccessSectionProps) => {
  const { t } = useLingui()
  const [isSaving, setIsSaving] = useState(false)
  const [settings, setSettings] = useState<FolderPiiSettings>(
    emptyFolderPiiSettings,
  )
  const [rows, setRows] = useState<AccessRow[]>([])

  const rowsRef = useRef(rows)
  rowsRef.current = rows
  const settingsRef = useRef(settings)
  settingsRef.current = settings

  useEffect(() => {
    if (!repositoryId) return
    let cancelled = false
    void getRepositoryById(repositoryId).then((response) => {
      if (cancelled || response.error || !response.data) return
      const details = response.data as Record<string, unknown>
      const next = resolveFolderPiiSettings(repositoryId, details)
      setSettings(next)
      setRows(toAccessRows(next.users))
    })
    return () => {
      cancelled = true
    }
  }, [repositoryId])

  const userOptions: Option[] = useMemo(
    () =>
      users.map((user) => ({
        id: String(user.id),
        name:
          user.displayName ||
          [user.firstName, user.lastName].filter(Boolean).join(' ') ||
          user.email ||
          String(user.id),
        value: String(user.id),
      })),
    [users],
  )

  const updateRow = useCallback(
    (rowId: string, patch: Partial<FolderPiiUserAccess>) => {
      setRows((current) =>
        current.map((row) =>
          row.rowId === rowId ? { ...row, ...patch } : row,
        ),
      )
    },
    [],
  )

  const addRow = useCallback(() => {
    setRows((current) => [
      ...current,
      { password: '', rowId: crypto.randomUUID(), userId: '' },
    ])
  }, [])

  const removeRow = useCallback((rowId: string) => {
    setRows((current) => current.filter((row) => row.rowId !== rowId))
  }, [])

  const saveAccess = useCallback(async () => {
    const nextUsers = rowsRef.current
      .map(({ password, userId }) => ({
        password: password.trim(),
        userId: userId.trim(),
      }))
      .filter((entry) => entry.userId || entry.password)

    if (nextUsers.some((entry) => entry.userId && !entry.password)) {
      showToast({
        message: t`Enter a password for each selected user.`,
        variant: 'info',
      })
      return
    }
    if (nextUsers.some((entry) => !entry.userId && entry.password)) {
      showToast({
        message: t`Select a user for each password.`,
        variant: 'info',
      })
      return
    }

    setIsSaving(true)
    try {
      const loaded = await getRepositoryById(repositoryId)
      if (loaded.error || !loaded.data) {
        showToast({
          message: t`Failed to load folder details.`,
          variant: 'error',
        })
        return
      }
      const details = loaded.data as Record<string, unknown>
      const nextSettings: FolderPiiSettings = {
        ...settingsRef.current,
        users: nextUsers.filter((entry) => entry.userId && entry.password),
      }
      const response = await updateRepository(repositoryId, {
        description: details.description,
        fields: details.fields,
        name: details.name,
        storageDrive: details.storageDrive,
        storageProviderCode: details.storageProviderCode,
        storageProviderId: details.storageProviderId,
        ...folderPiiSettingsToApiPayload(nextSettings),
      })
      if (response.error) {
        showToast({
          message: t`Failed to save unredacted access.`,
          variant: 'error',
        })
        return
      }
      setSettings(nextSettings)
      writeCachedFolderPiiSettings(repositoryId, nextSettings)
      showToast({
        message: t`Unredacted access saved.`,
        variant: 'success',
      })
    } finally {
      setIsSaving(false)
    }
  }, [repositoryId, t])

  const columns = useMemo(
    () => [
      columnHelper.accessor('userId', {
        enableSorting: false,
        header: t`User`,
        id: 'user',
        meta: { ...settingsHeaderMeta.start, disableEllipsis: true },
        minSize: 220,
        size: 280,
        cell: ({ row }) => {
          const rowId = row.original.rowId
          const currentId = row.original.userId
          const selectedIds = new Set(
            rowsRef.current.map((entry) => entry.userId).filter(Boolean),
          )
          const options = userOptions.filter(
            (option) =>
              !selectedIds.has(String(option.value || option.id)) ||
              String(option.value || option.id) === currentId,
          )
          const value =
            userOptions.find(
              (option) => String(option.value || option.id) === currentId,
            ) || null

          return (
            <div className='w-full min-w-0 py-1'>
              <InputSelect
                disabled={users.length === 0}
                options={options}
                searchPlaceholder={t`Search users`}
                value={value}
                width='target'
                clearable
                searchable
                placeholder={
                  users.length === 0 ? t`Loading users…` : t`Select user`
                }
                onChange={(selected) =>
                  updateRow(rowId, {
                    userId: selected
                      ? String(selected.value || selected.id)
                      : '',
                  })
                }
              />
            </div>
          )
        },
      }),
      columnHelper.accessor('password', {
        enableSorting: false,
        header: t`Password`,
        id: 'password',
        meta: { ...settingsHeaderMeta.start, disableEllipsis: true },
        minSize: 180,
        size: 220,
        cell: ({ row }) => {
          const rowId = row.original.rowId
          return (
            <div className='w-full min-w-0 py-1'>
              <InputPassword
                autoComplete='new-password'
                value={row.original.password}
                showPlaceholder
                onChange={(value) => updateRow(rowId, { password: value })}
              />
            </div>
          )
        },
      }),
      columnHelper.display({
        enableResizing: false,
        enableSorting: false,
        header: '',
        id: 'actions',
        meta: settingsHeaderMeta.end,
        minSize: 56,
        size: 56,
        cell: ({ row }) => (
          <div className='flex justify-end'>
            <IconButton
              color='gray'
              icon='lucide:trash-2'
              size='md'
              variant='ghost'
              onClick={() => removeRow(row.original.rowId)}
            />
          </div>
        ),
      }),
    ],
    // Keep columns stable while typing so the password input does not remount.

    [t, updateRow, removeRow, userOptions, users.length],
  )

  const table = useReactTable({
    ...settingsTableCoreOptions,
    columns,
    data: rows,
    getRowId: (row) => row.rowId,
  })

  const { rowSize, onRowSizeChange } = useSettingsTableToolbar({
    isReLoading: false,
    table,
    onReload: () => {},
  })

  return (
    <div className='rounded-[12px] border border-gray-3 bg-surface p-4'>
      <div className='flex items-start justify-between gap-3'>
        <div className='min-w-0'>
          <h3 className='text-14/5 font-semibold text-gray-12'>
            {t`Users who can view unredacted files`}
          </h3>
          <p className='mt-1 text-13 text-gray-11'>
            {t`Add users and a password for each. In document details, those users enter this password on the eye control to reveal the original file.`}
          </p>
        </div>
        <div className='flex shrink-0 items-center gap-2'>
          <Button
            icon='tabler:plus'
            label={t`Add`}
            size='sm'
            type='button'
            variant='outline'
            onClick={addRow}
          />
          <Button
            label={t`Save`}
            loading={isSaving}
            size='sm'
            type='button'
            onClick={() => {
              void saveAccess()
            }}
          />
        </div>
      </div>

      <div className='mt-3 overflow-hidden rounded-lg border border-[var(--border-default)] bg-surface shadow-2xs'>
        <DataTable
          emptyDescription={t`Click Add to choose a user and set a password.`}
          emptyIcon='tabler:eye-off'
          emptyTitle={t`No users added`}
          isReLoading={false}
          rowSize={rowSize}
          table={table}
          hideActionBar
          hideGrouping
          stickyHeader
          onReload={() => {}}
          onRowSizeChange={onRowSizeChange}
        />
      </div>
    </div>
  )
}

export default PiiUnredactedAccessSection
