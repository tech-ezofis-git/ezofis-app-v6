import {
  createColumnHelper,
  getFilteredRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useLingui } from '@lingui/react/macro'
import { useMemo, useState } from 'react'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import DataTable from '@/components/base/data-table/DataTable'
import Divider from '@/components/base/Divider'
import Icon from '@/components/base/icon/Icon'
import Menu from '@/components/base/menu/Menu'
import MenuItem from '@/components/base/menu/MenuItem'
import Pagination from '@/components/base/pagination/Pagination'
import showToast from '@/components/base/toast/showToast'
import cn from '@/utils/cn'
import {
  settingsTableCoreOptions,
  useSettingsTablePagination,
} from '../../helpers/settingsDataTable'
import useSettingsTableToolbar from '../useSettingsTableToolbar'
import {
  actionMeta,
  fieldLabel,
  type RetentionPolicy,
} from './retentionMockData'

export type FolderRetentionProps = {
  folderName: string
  policies: RetentionPolicy[]
  onAddPolicy: () => void
  onEditPolicy: (index: number) => void
  onDeletePolicy: (index: number) => void
}

const ACTION_BADGE_CLASS: Record<string, string> = {
  amber: 'border-amber-4 bg-amber-2 text-amber-11',
  primary: 'border-primary-4 bg-primary-2 text-primary-11',
  red: 'border-red-4 bg-red-2 text-red-11',
}

export default function FolderRetention({
  folderName,
  policies,
  onAddPolicy,
  onEditPolicy,
  onDeletePolicy,
}: FolderRetentionProps) {
  const { t } = useLingui()
  const {
    page,
    pageSize,
    pagination,
    paginationModel,
    onPageChange,
    onPageSizeChange,
    onPaginationChange,
  } = useSettingsTablePagination(10)

  const handleAddPolicy = () => {
    onAddPolicy()
  }

  const handleEditPolicy = (index: number) => {
    onEditPolicy(index)
  }

  const handleDeletePolicy = (index: number) => {
    onDeletePolicy(index)
  }

  const columnHelper = useMemo(() => createColumnHelper<RetentionPolicy>(), [])

  const columns = useMemo(
    () => [
      columnHelper.accessor((row) => row, {
        header: t`Policy`,
        id: 'name',
        cell: (info) => {
          const policy = info.getValue()
          return (
            <div className='flex flex-col gap-0.5 py-1'>
              <span className='text-xs font-semibold text-gray-13'>
                {policy.name}
              </span>
              {policy.description && (
                <span className='max-w-md truncate text-[11px] text-gray-10'>
                  {policy.description}
                </span>
              )}
            </div>
          )
        },
      }),
      columnHelper.accessor((row) => row, {
        header: t`Trigger`,
        id: 'trigger',
        cell: (info) => {
          const policy = info.getValue()
          return (
            <div className='flex items-center gap-1.5 py-1'>
              <Icon
                className='size-4 shrink-0 text-gray-11'
                name='tabler:clock-hour-4'
              />
              <span className='text-xs font-semibold text-gray-13'>
                {fieldLabel(policy.triggerField)} &gt; {policy.durationValue}{' '}
                {policy.durationUnit}
              </span>
            </div>
          )
        },
      }),
      columnHelper.accessor('action', {
        header: t`Action`,
        id: 'action',
        cell: (info) => {
          const meta = actionMeta(info.getValue())
          return (
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold',
                ACTION_BADGE_CLASS[meta.color],
              )}
            >
              <Icon className='size-3.5' name={meta.icon} />
              {meta.name}
            </span>
          )
        },
      }),
      columnHelper.accessor('conditions', {
        header: t`Conditions`,
        id: 'conditions',
        cell: (info) => {
          const count = (info.getValue() || []).filter((c) => c.field).length
          return (
            <div className='flex items-center gap-1.5 py-1'>
              <Icon
                className='size-4 shrink-0 text-gray-11'
                name='tabler:square-check'
              />
              <span className='text-xs font-semibold text-gray-13'>
                {count}
              </span>
            </div>
          )
        },
      }),
      columnHelper.display({
        header: t`Status`,
        id: 'status',
        cell: () => (
          <span className='inline-flex items-center gap-1.5 rounded-md border border-green-3 bg-green-2 px-2.5 py-1 text-xs font-semibold text-green-11'>
            <Icon
              className='size-3.5 text-green-9'
              name='tabler:circle-check'
            />
            {t`Active`}
          </span>
        ),
      }),
      columnHelper.display({
        header: '',
        id: 'actions',
        size: 56,
        cell: (info) => {
          const index = info.row.index
          return (
            <div
              className='flex items-center justify-end gap-1'
              onClick={(event) => event.stopPropagation()}
            >
              <Menu
                position='bottom-end'
                width={160}
                withinPortal
                target={
                  <IconButton
                    color='gray'
                    icon='lucide:more-horizontal'
                    size='md'
                    variant='ghost'
                  />
                }
              >
                <MenuItem
                  icon='lucide:pencil'
                  label={t`Edit`}
                  onClick={() => handleEditPolicy(index)}
                />
                <MenuItem
                  className='text-red-11'
                  icon='lucide:trash-2'
                  iconClass='text-red-11'
                  label={t`Delete`}
                  onClick={() => handleDeletePolicy(index)}
                />
              </Menu>
            </div>
          )
        },
      }),
    ],
    [columnHelper, t],
  )

  const table = useReactTable({
    ...settingsTableCoreOptions,
    ...paginationModel,
    columns,
    data: policies,
    state: { pagination },
    getFilteredRowModel: getFilteredRowModel(),
    getRowId: (_, index) => String(index),
    onPaginationChange,
  })

  const { rowSize, onRowSizeChange } = useSettingsTableToolbar({
    isReLoading: false,
    table,
    onReload: () => {},
  })

  return (
    <div className='flex min-h-0 flex-1 flex-col gap-4'>
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-15 font-semibold text-gray-13'>
            {t`Retention Policies`}
          </h2>
          <p className='mt-0.5 text-xs text-gray-11'>
            {t`AI-assisted lifecycle rules that archive, soft delete, or permanently delete documents in folder "${folderName}" once they meet your retention criteria.`}
          </p>
        </div>
        <Button
          icon='tabler:plus'
          label={t`Create Policy`}
          size='sm'
          onClick={handleAddPolicy}
        />
      </div>

      <Divider />

      <div className='mt-2 flex min-h-0 flex-1 flex-col overflow-hidden'>
        <div className='min-h-0 flex-1 overflow-hidden rounded-lg border border-[var(--border-default)] bg-surface shadow-2xs'>
          <DataTable
            emptyDescription={t`No retention policies configured yet. Click 'Create Policy' to set up the trigger, action, and conditions.`}
            emptyIcon='tabler:clock-hour-4'
            emptyTitle={t`No Retention Policies`}
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

        <Pagination
          className='mt-4 shrink-0'
          itemLabel={t`Policies`}
          page={page}
          pageSize={pageSize}
          showPageNumbers={false}
          totalItems={table.getFilteredRowModel().rows.length}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      </div>
    </div>
  )
}
