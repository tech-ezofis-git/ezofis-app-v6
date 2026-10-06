import { useLingui } from '@lingui/react/macro'
import { createColumnHelper, useReactTable } from '@tanstack/react-table'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getUsers, type V6UserListItem } from '@/api/v6/user'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import DataTable from '@/components/base/data-table/DataTable'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputPassword from '@/components/base/inputs/password/InputPassword'
import { AnimateFadeIn } from '@/components/common/animations'
import type {
  FolderPiiSettings,
  FolderPiiUserAccess,
} from '@/pages/folders/utils/folderPiiSettings'
import type { Option } from '@/types/option'
import cn from '@/utils/cn'
import {
  settingsHeaderMeta,
  settingsTableCoreOptions,
} from '../../helpers/settingsDataTable'
import SettingsFormSection from '../SettingsFormSection'
import useSettingsTableToolbar from '../useSettingsTableToolbar'

type AccessRow = FolderPiiUserAccess & { rowId: string }

type PiiRedactionWizardStepProps = {
  settings: FolderPiiSettings
  onChange: (next: FolderPiiSettings) => void
}

const columnHelper = createColumnHelper<AccessRow>()

const toAccessRows = (users: FolderPiiUserAccess[]): AccessRow[] =>
  users.map((entry) => ({
    ...entry,
    rowId: crypto.randomUUID(),
  }))

const PiiRedactionWizardStep = ({
  settings,
  onChange,
}: PiiRedactionWizardStepProps) => {
  const { t } = useLingui()
  const [users, setUsers] = useState<V6UserListItem[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [rows, setRows] = useState<AccessRow[]>(() =>
    toAccessRows(settings.users),
  )

  const settingsRef = useRef(settings)
  settingsRef.current = settings
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const rowsRef = useRef(rows)
  rowsRef.current = rows

  useEffect(() => {
    if (!settings.enabled) setRows([])
  }, [settings.enabled])

  useEffect(() => {
    let cancelled = false
    setIsLoadingUsers(true)
    void getUsers()
      .then((res) => {
        if (cancelled) return
        const next = Array.isArray(res.data) ? res.data : []
        setUsers(next)
      })
      .finally(() => {
        if (!cancelled) setIsLoadingUsers(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

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

  const commitRows = useCallback((nextRows: AccessRow[]) => {
    setRows(nextRows)
    onChangeRef.current({
      ...settingsRef.current,
      users: nextRows.map(({ password, userId }) => ({ password, userId })),
    })
  }, [])

  const updateRow = useCallback(
    (rowId: string, patch: Partial<FolderPiiUserAccess>) => {
      const nextRows = rowsRef.current.map((row) =>
        row.rowId === rowId ? { ...row, ...patch } : row,
      )
      commitRows(nextRows)
    },
    [commitRows],
  )

  const addRow = useCallback(() => {
    if (!settingsRef.current.enabled) return
    commitRows([
      ...rowsRef.current,
      { password: '', rowId: crypto.randomUUID(), userId: '' },
    ])
  }, [commitRows])

  const removeRow = useCallback(
    (rowId: string) => {
      commitRows(rowsRef.current.filter((row) => row.rowId !== rowId))
    },
    [commitRows],
  )

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
                clearable
                searchable
                disabled={!settings.enabled || isLoadingUsers}
                options={options}
                placeholder={
                  isLoadingUsers ? t`Loading users…` : t`Select user`
                }
                searchPlaceholder={t`Search users`}
                value={value}
                width='target'
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
                disabled={!settings.enabled}
                showPlaceholder
                value={row.original.password}
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
              disabled={!settings.enabled}
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isLoadingUsers, settings.enabled, t, updateRow, removeRow, userOptions],
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

  const yesNoOptions = [
    {
      id: 'yes',
      subtitle: t`Scan documents in this folder and mask PII in the preview.`,
      title: t`Yes`,
    },
    {
      id: 'no',
      subtitle: t`Show the original file without PII masking.`,
      title: t`No`,
    },
  ] as const

  return (
    <SettingsFormSection>
      <div className='flex flex-col gap-6'>
        <AnimateFadeIn delay={0.1}>
          <div>
            <h3 className='text-14/5 font-semibold text-gray-12'>
              {t`Enable PII Redaction`}
            </h3>
            <p className='mt-1 text-13 text-gray-11'>
              {t`Choose whether documents in this folder are scanned and redacted when opened.`}
            </p>

            <div className='mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2'>
              {yesNoOptions.map((item) => {
                const isSelected =
                  item.id === 'yes' ? settings.enabled : !settings.enabled
                return (
                  <button
                    key={item.id}
                    type='button'
                    className={cn(
                      'flex w-full items-start gap-3 rounded-[12px] border p-3.5 text-left transition',
                      isSelected
                        ? 'border-primary-8 bg-primary-2 shadow-sm ring-1 ring-primary-8'
                        : 'border-gray-3 bg-surface hover:border-primary-5',
                    )}
                    onClick={() =>
                      onChange({
                        ...settings,
                        enabled: item.id === 'yes',
                        users: item.id === 'yes' ? settings.users : [],
                      })
                    }
                  >
                    <span
                      className={cn(
                        'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition',
                        isSelected
                          ? 'border-primary-9 bg-surface'
                          : 'border-gray-7 bg-surface',
                      )}
                    >
                      {isSelected ? (
                        <span className='h-2 w-2 rounded-full bg-primary-9' />
                      ) : null}
                    </span>
                    <div className='min-w-0 flex-1'>
                      <div className='text-13 font-medium text-gray-12'>
                        {item.title}
                      </div>
                      <div className='mt-0.5 text-13 text-gray-11'>
                        {item.subtitle}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </AnimateFadeIn>

        <AnimateFadeIn delay={0.15}>
          <div
            className={cn(
              'rounded-[12px] border border-gray-3 bg-surface p-4 transition',
              !settings.enabled && 'opacity-55',
            )}
          >
            <div className='flex items-start justify-between gap-3'>
              <div className='min-w-0'>
                <h3 className='text-14/5 font-semibold text-gray-12'>
                  {t`Users who can view unredacted files`}
                </h3>
                <p className='mt-1 text-13 text-gray-11'>
                  {t`Add users and a password for each. In document details, those users enter this password on the eye control to reveal the original file.`}
                </p>
              </div>
              <Button
                disabled={!settings.enabled}
                icon='tabler:plus'
                label={t`Add`}
                size='sm'
                type='button'
                variant='outline'
                onClick={addRow}
              />
            </div>

            <div className='mt-3 overflow-hidden rounded-lg border border-[var(--border-default)] bg-surface shadow-2xs'>
              <DataTable
                emptyDescription={t`Click Add to choose a user and set a password.`}
                emptyIcon='tabler:eye-off'
                emptyTitle={t`No users added`}
                hideActionBar
                hideGrouping
                isReLoading={false}
                rowSize={rowSize}
                stickyHeader
                table={table}
                onReload={() => {}}
                onRowSizeChange={onRowSizeChange}
              />
            </div>
          </div>
        </AnimateFadeIn>
      </div>
    </SettingsFormSection>
  )
}

export default PiiRedactionWizardStep
