import { createColumnHelper, useReactTable } from '@tanstack/react-table'
import { msg } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import { Check, MoreHorizontal, UsersRound } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  createGroup as createGroupApi,
  deleteGroup as deleteGroupApi,
  getGroupById,
  getGroups,
  getUsers,
  updateGroup as updateGroupApi,
} from '@/api/v6/user'
import TableExport from '@/components/base/data-table/actions/TableExport'
import TableSearch from '@/components/base/data-table/actions/TableSearch'
import DataTable from '@/components/base/data-table/DataTable'
import InputSelectMultiple from '@/components/base/inputs/InputSelectMultiple'
import InputText from '@/components/base/inputs/InputText'
import InputTextarea from '@/components/base/inputs/InputTextarea'
import Menu from '@/components/base/menu/Menu'
import MenuItem from '@/components/base/menu/MenuItem'
import Pagination from '@/components/base/pagination/Pagination'
import showToast from '@/components/base/toast/showToast'
import CustomFilter from '@/components/common/CustomFilter'
import { matchesCategoryFilterValue } from '@/utils/filterUtils'
import {
  getFieldRequiredError,
  getMissingRequiredLabels,
  getRequiredFieldErrorMessage,
} from '../helpers/requiredFieldErrors'
import {
  settingsHeaderMeta,
  settingsTableCoreOptions,
  useSettingsTablePagination,
  useSettingsTableSearch,
} from '../helpers/settingsDataTable'
import { calculateGroupSetupProgress } from '../helpers/settingsSetupProgress'
import {
  mapApiGroupsToSettingsGroups,
  mapUsersToOptions,
  type SettingsGroup,
  type SettingsOption,
} from '../helpers/userGroupMappers'
import SettingsFormSection from './SettingsFormSection'
import SettingsPageHeader from './SettingsPageHeader'
import SettingsSelectedChips from './SettingsSelectedChips'
import SettingsSelectField from './SettingsSelectField'
import SettingsSetupContent from './SettingsSetupContent'
import SettingsSetupHeader from './SettingsSetupHeader'
import useSettingsTableToolbar from './useSettingsTableToolbar'

type GroupStep = {
  caption: string
  description: string
  key: GroupStepKey
  title: string
}

type GroupStepKey = 'details' | 'members' | 'review'

const groupStepDefs: Array<{
  caption: ReturnType<typeof msg>
  description: ReturnType<typeof msg>
  key: GroupStepKey
  title: ReturnType<typeof msg>
}> = [
  {
    caption: msg`Step 1`,
    description: msg`Provide a name and details for this group.`,
    key: 'details',
    title: msg`Group Details`,
  },
  {
    caption: msg`Step 2`,
    description: msg`Select users to be members of this group.`,
    key: 'members',
    title: msg`Members`,
  },
  {
    caption: msg`Step 3`,
    description: msg`Validate the group configuration before saving.`,
    key: 'review',
    title: msg`Review`,
  },
]

const emptyGroup: SettingsGroup = {
  created: '—',
  description: '',
  id: 0,
  memberIds: [],
  members: [],
  name: '',
  status: 'active',
}

const groupColumnHelper = createColumnHelper<SettingsGroup>()

export default function GroupManagement({ onBack }: { onBack?: () => void }) {
  const { t } = useLingui()
  const [groups, setGroups] = useState<SettingsGroup[]>([])
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({})
  const [userOptions, setUserOptions] = useState<SettingsOption[]>([])
  const [isLoadingGroups, setIsLoadingGroups] = useState(true)
  const [isLoadingGroupDetails, setIsLoadingGroupDetails] = useState(false)
  const [isSavingGroup, setIsSavingGroup] = useState(false)

  const statusOptions = useMemo(
    () => [
      { label: t`Active`, value: 'active' },
      { label: t`Inactive`, value: 'inactive' },
    ],
    [t],
  )

  const [isSetupOpen, setIsSetupOpen] = useState(false)
  const [editingGroupId, setEditingGroupId] = useState<string | number | null>(
    null,
  )
  const [activeStep, setActiveStep] = useState(0)
  const [draftGroup, setDraftGroup] = useState<SettingsGroup>(emptyGroup)
  const [selectedMembers, setSelectedMembers] = useState<SettingsOption[]>([])

  const filteredGroups = useMemo(() => {
    return groups.filter((group) => {
      let matches = true
      Object.entries(activeFilters).forEach(([key, value]) => {
        if (!value) return
        if (key === 'name') {
          if (!matchesCategoryFilterValue(group.name, value, 'contains')) {
            matches = false
          }
        } else if (key === 'status') {
          if (!matchesCategoryFilterValue(group.status, value)) matches = false
        }
      })
      return matches
    })
  }, [groups, activeFilters])

  const tableSearchOptions = useSettingsTableSearch()

  const loadGroups = useCallback(async () => {
    setIsLoadingGroups(true)

    try {
      const [groupsResponse, usersResponse] = await Promise.all([
        getGroups(),
        getUsers(),
      ])

      if (usersResponse.error) {
        showToast({ message: usersResponse.error, variant: 'error' })
      } else {
        setUserOptions(mapUsersToOptions(usersResponse.data))
      }

      if (groupsResponse.error) {
        showToast({ message: groupsResponse.error, variant: 'error' })
        setGroups([])
        return
      }

      setGroups(mapApiGroupsToSettingsGroups(groupsResponse.data))
    } finally {
      setIsLoadingGroups(false)
    }
  }, [])

  useEffect(() => {
    void loadGroups()
  }, [loadGroups])

  const openCreateGroup = () => {
    setEditingGroupId(null)
    setDraftGroup({ ...emptyGroup, id: Date.now() })
    setSelectedMembers([])
    setActiveStep(0)
    setIsSetupOpen(true)
  }

  const openEditGroup = useCallback(
    async (group: SettingsGroup) => {
      setIsLoadingGroupDetails(true)

      try {
        const response = await getGroupById(String(group.id))

        if (response.error || !response.data) {
          showToast({
            message: response.error || t`Failed to load group`,
            variant: 'error',
          })
          return
        }

        const mappedGroup = mapApiGroupsToSettingsGroups([response.data])[0]
        setEditingGroupId(mappedGroup.id)
        setDraftGroup(mappedGroup)
        setSelectedMembers(
          userOptions.filter((option) =>
            mappedGroup.memberIds.includes(String(option.id)),
          ),
        )
        setActiveStep(0)
        setIsSetupOpen(true)
      } finally {
        setIsLoadingGroupDetails(false)
      }
    },
    [t, userOptions],
  )

  const deleteGroup = useCallback(
    async (groupId: string | number) => {
      const confirmed = window.confirm(
        t`Are you sure you want to delete this group?`,
      )
      if (!confirmed) return

      setIsLoadingGroups(true)
      try {
        const response = await deleteGroupApi(String(groupId))

        if (response.error) {
          showToast({ message: response.error, variant: 'error' })
          return
        }

        showToast({ message: t`Group deleted successfully`, variant: 'success' })
        await loadGroups()
      } finally {
        setIsLoadingGroups(false)
      }
    },
    [loadGroups, t],
  )

  const saveGroup = async () => {
    const description = draftGroup.description.trim()
    const groupName = draftGroup.name.trim()
    const users = selectedMembers.map((member) => String(member.id))

    if (editingGroupId) {
      if (!groupName) return

      setIsSavingGroup(true)
      try {
        const response = await updateGroupApi(String(editingGroupId), {
          description,
          groupName,
          users,
        })

        if (response.error) {
          showToast({ message: response.error, variant: 'error' })
          return
        }

        showToast({ message: t`Group updated successfully`, variant: 'success' })
        setIsSetupOpen(false)
        await loadGroups()
      } finally {
        setIsSavingGroup(false)
      }

      return
    }

    if (!groupName || !description) return

    setIsSavingGroup(true)
    try {
      const response = await createGroupApi({
        description,
        groupName,
        users,
      })

      if (response.error) {
        showToast({ message: response.error, variant: 'error' })
        return
      }

      showToast({ message: t`Group created successfully`, variant: 'success' })
      setIsSetupOpen(false)
      await loadGroups()
    } finally {
      setIsSavingGroup(false)
    }
  }

  const groupColumns = useMemo(
    () => [
      groupColumnHelper.display({
        enableResizing: false,
        enableSorting: false,
        header: '',
        id: 'icon',
        maxSize: 48,
        meta: settingsHeaderMeta.center,
        minSize: 48,
        size: 48,
        cell: () => (
          <div className='flex justify-center'>
            <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[var(--primary-3)] text-[var(--primary-9)]'>
              <UsersRound size={16} />
            </div>
          </div>
        ),
      }),
      groupColumnHelper.accessor(
        (row) => `${row.name} ${row.description} ${row.members.length}`,
        {
          enableSorting: false,
          header: t`Group`,
          id: 'group',
          meta: { ...settingsHeaderMeta.start, label: t`Group` },
          minSize: 40,
          size: 240,
          cell: ({ row }) => {
            const group = row.original

            return (
              <div className='min-w-0'>
                <div className='truncate font-semibold text-[var(--gray-13)]'>
                  {group.name}
                </div>
                <div className='truncate text-[var(--gray-10)]'>
                  {t`${group.members.length} members`}
                </div>
              </div>
            )
          },
        },
      ),
      groupColumnHelper.accessor('description', {
        enableSorting: false,
        header: t`Description`,
        id: 'description',
        meta: { ...settingsHeaderMeta.start, label: t`Description` },
        minSize: 40,
        size: 220,
        cell: ({ getValue }) => (
          <span className='block max-w-full truncate'>
            {String(getValue() || '—')}
          </span>
        ),
      }),
      groupColumnHelper.display({
        enableSorting: false,
        header: t`Members`,
        id: 'members',
        meta: {
          ...settingsHeaderMeta.start,
          disableEllipsis: true,
          label: t`Members`,
        },
        minSize: 40,
        size: 110,
        cell: ({ row }) => (
          <span className='inline-flex items-center rounded-[10px] border border-[var(--border-default)] bg-surface px-3 py-1 font-medium text-[var(--gray-13)]'>
            {row.original.members.length}
          </span>
        ),
      }),
      groupColumnHelper.accessor('status', {
        enableSorting: false,
        header: t`Status`,
        id: 'status',
        meta: {
          ...settingsHeaderMeta.start,
          disableEllipsis: true,
          label: t`Status`,
        },
        minSize: 40,
        size: 110,
        cell: ({ getValue }) => <StatusBadge status={getValue()} />,
      }),
      groupColumnHelper.accessor('created', {
        enableSorting: false,
        header: t`Created`,
        id: 'created',
        meta: settingsHeaderMeta.start,
        minSize: 40,
        size: 120,
        cell: ({ getValue }) => <span>{String(getValue() || '—')}</span>,
      }),
      groupColumnHelper.display({
        enableResizing: false,
        enableSorting: false,
        header: t`Actions`,
        id: 'actions',
        meta: settingsHeaderMeta.end,
        minSize: 72,
        size: 72,
        cell: ({ row }) => {
          const group = row.original

          return (
            <div
              className='flex justify-end'
              onClick={(event) => event.stopPropagation()}
            >
              <Menu
                position='bottom-end'
                width={160}
                withinPortal
                target={
                  <button
                    className='rounded-lg p-2 text-[var(--gray-13)] transition hover:bg-[var(--gray-2)] disabled:cursor-not-allowed disabled:opacity-50'
                    disabled={isLoadingGroupDetails}
                    type='button'
                  >
                    <MoreHorizontal size={20} />
                  </button>
                }
              >
                <MenuItem
                  icon='lucide:pencil'
                  label={t`Edit`}
                  onClick={() => openEditGroup(group)}
                />
                <MenuItem
                  className='text-red-11'
                  icon='lucide:trash-2'
                  iconClass='text-red-11'
                  label={t`Delete`}
                  onClick={() => deleteGroup(group.id)}
                />
              </Menu>
            </div>
          )
        },
      }),
    ],
    [deleteGroup, isLoadingGroupDetails, openEditGroup, t],
  )

  const {
    page,
    pageSize,
    pagination,
    paginationModel,
    onPageChange,
    onPageSizeChange,
    onPaginationChange,
  } = useSettingsTablePagination()

  const groupTable = useReactTable({
    ...settingsTableCoreOptions,
    ...tableSearchOptions,
    ...paginationModel,
    columns: groupColumns,
    data: filteredGroups,
    state: {
      ...tableSearchOptions.state,
      pagination,
    },
    getRowId: (row: SettingsGroup) => String(row.id),
    onPaginationChange,
  })

  const { rowSize, onRowSizeChange } = useSettingsTableToolbar({
    isReLoading: isLoadingGroups,
    table: groupTable,
    onReload: () => {
      void loadGroups()
    },
  })

  if (isSetupOpen) {
    return (
      <GroupSetup
        activeStep={activeStep}
        draftGroup={draftGroup}
        editingGroupId={editingGroupId}
        isSaving={isSavingGroup}
        selectedMembers={selectedMembers}
        userOptions={userOptions}
        onBack={() => setActiveStep((step) => Math.max(step - 1, 0))}
        onBackToSettings={onBack}
        onCancel={() => setIsSetupOpen(false)}
        onChange={setDraftGroup}
        onMembersChange={setSelectedMembers}
        onNext={() =>
          setActiveStep((step) => Math.min(step + 1, groupStepDefs.length - 1))
        }
        onSave={saveGroup}
        onStepChange={setActiveStep}
      />
    )
  }

  return (
    <main className='flex h-full min-h-0 flex-col overflow-hidden bg-[var(--surface)]'>
      <section className='flex min-h-0 flex-1 flex-col'>
        <SettingsPageHeader
          description={t`Create logical groups to organize users by team, department, or function.`}
          title={t`Group Management`}
          onBack={onBack}
        />

        <div className='flex min-h-0 flex-1 flex-col overflow-hidden p-4'>
          <CustomFilter
            activeFilters={activeFilters}
            customSearchComponent={<TableSearch table={groupTable as any} />}
            trailingActions={<TableExport table={groupTable as any} />}
            actionButtons={[
              {
                color: 'gray',
                disabled: isLoadingGroups,
                icon: 'tabler:refresh',
                id: 'refresh',
                isIconButton: true,
                tooltip: t`Refresh`,
                variant: 'outline',
                onClick: loadGroups,
              },
            ]}
            addButton={{
              tooltip: t`Add Group`,
              onClick: openCreateGroup,
            }}
            filters={[
              {
                id: 'name',
                label: t`Name`,
                options: groups
                  .map((g) => String(g.name || '').trim())
                  .filter(Boolean)
                  .sort((a, b) => a.localeCompare(b))
                  .map((name) => ({ label: name, value: name })),
                searchable: true,
                searchPlaceholder: t`Search name...`,
              },
              { id: 'status', label: t`Status`, options: statusOptions },
            ]}
            showReset={
              Object.keys(activeFilters).some((k) => activeFilters[k]) ||
              !!tableSearchOptions.state.globalFilter?.value
            }
            onFilterChange={(id, val) =>
              setActiveFilters((prev) => ({ ...prev, [id]: val }))
            }
            onReset={() => {
              setActiveFilters({})
              tableSearchOptions.onGlobalFilterChange({ id: '', value: '' })
            }}
          />
          <div className='mt-2 flex min-h-0 flex-1 flex-col overflow-hidden'>
            <div className='min-h-0 flex-1 overflow-hidden'>
              <DataTable
                emptyDescription={t`Create a group to organize users by team, department, or function.`}
                emptyIcon='lucide:users-round'
                emptyTitle={t`No groups yet`}
                isLoading={isLoadingGroups}
                isReLoading={isLoadingGroups}
                pageSize={pageSize}
                rowSize={rowSize}
                table={groupTable}
                hideActionBar
                hideGrouping
                stickyHeader
                onReload={() => {
                  void loadGroups()
                }}
                onRowSizeChange={onRowSizeChange}
              />
            </div>
            <Pagination
              className='mt-4 shrink-0'
              itemLabel={t`Groups`}
              page={page}
              pageSize={pageSize}
              showPageNumbers={false}
              totalItems={groupTable.getFilteredRowModel().rows.length}
              onPageChange={onPageChange}
              onPageSizeChange={onPageSizeChange}
            />
          </div>
        </div>
      </section>
    </main>
  )
}

function GroupSetup({
  activeStep,
  draftGroup,
  editingGroupId,
  isSaving,
  selectedMembers,
  userOptions,
  onBack,
  onBackToSettings,
  onCancel,
  onChange,
  onMembersChange,
  onNext,
  onSave,
  onStepChange,
}: {
  activeStep: number
  draftGroup: SettingsGroup
  editingGroupId: string | number | null
  isSaving: boolean
  selectedMembers: SettingsOption[]
  userOptions: SettingsOption[]
  onBack: () => void
  onBackToSettings?: () => void
  onCancel: () => void
  onChange: (group: SettingsGroup) => void
  onMembersChange: (members: SettingsOption[]) => void
  onNext: () => void
  onSave: () => void
  onStepChange: (step: number) => void
}) {
  const { i18n, t } = useLingui()
  const groupSteps = useMemo<GroupStep[]>(
    () =>
      groupStepDefs.map((step) => ({
        caption: i18n._(step.caption),
        description: i18n._(step.description),
        key: step.key,
        title: i18n._(step.title),
      })),
    [i18n.locale],
  )
  const progress = useMemo(
    () => calculateGroupSetupProgress(draftGroup, selectedMembers.length),
    [draftGroup, selectedMembers.length],
  )
  const isLastStep = activeStep === groupSteps.length - 1
  const [showErrors, setShowErrors] = useState(false)

  const getMissingLabels = (step = activeStep) => {
    if (step === 1) return []

    return getMissingRequiredLabels([
      { label: t`Group Name`, value: draftGroup.name },
      { label: t`Description`, value: draftGroup.description },
    ])
  }

  const handleNext = () => {
    const missingLabels = getMissingLabels(activeStep)

    if (missingLabels.length) {
      setShowErrors(true)
      showToast({
        message: getRequiredFieldErrorMessage(missingLabels),
        variant: 'error',
      })
      return
    }

    setShowErrors(false)
    onNext()
  }

  const handleSave = () => {
    const missingLabels = getMissingLabels()

    if (missingLabels.length) {
      setShowErrors(true)
      if (activeStep !== 0) onStepChange(0)
      showToast({
        message: getRequiredFieldErrorMessage(missingLabels),
        variant: 'error',
      })
      return
    }

    setShowErrors(false)
    onSave()
  }

  const handleStepChange = (step: number) => {
    if (step > activeStep) {
      for (let index = activeStep; index < step; index += 1) {
        const missingLabels = getMissingLabels(index)

        if (missingLabels.length) {
          setShowErrors(true)
          onStepChange(index)
          showToast({
            message: getRequiredFieldErrorMessage(missingLabels),
            variant: 'error',
          })
          return
        }
      }
    }

    setShowErrors(false)
    onStepChange(step)
  }

  const handleBack = () => {
    setShowErrors(false)
    onBack()
  }

  const activeStepConfig = groupSteps[activeStep]

  return (
    <main className='flex h-full min-h-0 flex-col overflow-hidden bg-[var(--surface)] text-[var(--text-primary)]'>
      <SettingsSetupHeader
        moduleTitle={t`Group Management`}
        progress={progress}
        stepDescription={activeStepConfig.description}
        stepTitle={activeStepConfig.title}
        setupTitle={editingGroupId ? t`Edit Group` : t`Create Group`}
        onBackToSettings={onBackToSettings}
        onCancelSetup={onCancel}
      />

      <div className='grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[296px_1fr]'>
        <aside className='ez-scrollbar overflow-y-auto border-r border-[var(--border-default)] bg-[var(--surface)] px-4 py-9'>
          <div className='space-y-5'>
            {groupSteps.map((step, index) => {
              const isActive = index === activeStep
              const isCompleted = index < activeStep

              return (
                <button
                  className='group flex w-full items-center gap-5 rounded-[14px] px-3 py-2 text-left transition hover:bg-surface-raised'
                  key={step.key}
                  type='button'
                  onClick={() => handleStepChange(index)}
                >
                  <div className='relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--gray-3)]'>
                    {index < groupSteps.length - 1 ? (
                      <span className='absolute top-8 left-1/2 h-12 w-[2px] -translate-x-1/2 bg-[var(--gray-3)]' />
                    ) : null}
                    <span
                      className={[
                        'z-10 flex h-8 w-8 items-center justify-center rounded-full transition',
                        isCompleted
                          ? 'text-[var(--primary-9)]'
                          : isActive
                            ? 'bg-[var(--primary-3)] text-[var(--primary-11)] ring-1 ring-[var(--primary-8)]'
                            : 'bg-[var(--gray-3)] text-[var(--gray-10)]',
                      ].join(' ')}
                    >
                      {isCompleted ? (
                        <Check size={14} />
                      ) : (
                        <GroupStepIcon step={step.key} />
                      )}
                    </span>
                  </div>
                  <div>
                    <div className='text-md mt-1 font-semibold text-[var(--indigo-12)]'>
                      {step.title}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </aside>

        <SettingsSetupContent>
          {activeStep === 0 ? (
            <SettingsFormSection>
              <InputText
                label={t`Group Name`}
                placeholder={t`e.g. Finance Team`}
                required
                value={draftGroup.name}
                error={getFieldRequiredError(
                  t`Group Name`,
                  showErrors,
                  draftGroup.name,
                )}
                onChange={(value) => onChange({ ...draftGroup, name: value })}
              />
              <InputTextarea
                label={t`Description`}
                minRows={4}
                placeholder={t`Describe the purpose of this group...`}
                required
                value={draftGroup.description}
                error={getFieldRequiredError(
                  t`Description`,
                  showErrors,
                  draftGroup.description,
                )}
                onChange={(value) =>
                  onChange({ ...draftGroup, description: value })
                }
              />
              <SettingsSelectField
                label={t`Status`}
                options={[t`Active`, t`Inactive`]}
                value={
                  draftGroup.status === 'inactive' ? t`Inactive` : t`Active`
                }
                onChange={(value) =>
                  onChange({
                    ...draftGroup,
                    status:
                      value === t`Inactive` || value.toLowerCase() === 'inactive'
                        ? 'inactive'
                        : 'active',
                  })
                }
              />
            </SettingsFormSection>
          ) : null}

          {activeStep === 1 ? (
            <SettingsFormSection>
              <InputSelectMultiple
                className='bg-surface'
                label={t`Group Members`}
                options={userOptions}
                placeholder={t`Search and select users...`}
                value={selectedMembers}
                clearable
                searchable
                onChange={(value) =>
                  onMembersChange((value || []) as SettingsOption[])
                }
              />
              <SettingsSelectedChips
                items={selectedMembers}
                onRemove={(id) =>
                  onMembersChange(
                    selectedMembers.filter((member) => member.id !== id),
                  )
                }
              />
            </SettingsFormSection>
          ) : null}

          {activeStep === 2 ? (
            <SettingsFormSection>
              <div className='rounded-[14px] border border-[var(--border-default)] bg-surface p-6'>
                <h3 className='text-md mb-6 font-semibold text-[var(--gray-13)]'>
                  {t`Group Summary`}
                </h3>
                <div className='grid grid-cols-1 gap-x-12 gap-y-4 text-sm md:grid-cols-2'>
                  <SummaryItem
                    label={t`Group Name`}
                    value={draftGroup.name || '—'}
                  />
                  <SummaryItem
                    label={t`Status`}
                    value={
                      draftGroup.status === 'inactive'
                        ? t`Inactive`
                        : t`Active`
                    }
                  />
                  <SummaryItem
                    label={t`Description`}
                    value={draftGroup.description || '—'}
                  />
                  <SummaryItem
                    label={t`Members`}
                    value={
                      selectedMembers.length
                        ? selectedMembers
                            .map((member) => member.name)
                            .join(', ')
                        : '—'
                    }
                  />
                </div>
              </div>
            </SettingsFormSection>
          ) : null}

          <div className='mt-8 flex items-center justify-between border-t border-[var(--border-default)] pt-6'>
            <button
              className='inline-flex h-10 items-center rounded-[5px] border border-[var(--border-default)] bg-surface px-5 text-[15px] font-semibold text-[var(--gray-13)] transition hover:bg-[var(--gray-2)] disabled:cursor-not-allowed disabled:opacity-50'
              disabled={activeStep === 0}
              type='button'
              onClick={handleBack}
            >
              {t`Back`}
            </button>

            <div className='flex items-center gap-3'>
              {isLastStep ? (
                <button
                  className='h-10 rounded-[5px] bg-[var(--primary-9)] px-5 text-[15px] font-semibold text-white shadow-[var(--shadow-md)] transition hover:bg-[var(--primary-10)] disabled:cursor-not-allowed disabled:opacity-60'
                  disabled={isSaving}
                  type='button'
                  onClick={handleSave}
                >
                  {isSaving ? t`Saving...` : t`Save Group`}
                </button>
              ) : (
                <button
                  className='h-10 rounded-[5px] bg-[var(--primary-9)] px-5 text-[15px] font-semibold text-white shadow-[var(--shadow-md)] transition hover:bg-[var(--primary-10)]'
                  type='button'
                  onClick={handleNext}
                >
                  {t`Next`}
                </button>
              )}
            </div>
          </div>
        </SettingsSetupContent>
      </div>
    </main>
  )
}

function GroupStepIcon({ step }: { step: GroupStepKey }) {
  if (step === 'details') return <UsersRound size={14} />
  if (step === 'members') return <UsersRound size={14} />
  return <Check size={14} />
}

function StatusBadge({ status }: { status: SettingsGroup['status'] }) {
  const { t } = useLingui()
  const tone =
    status === 'active'
      ? 'border-[var(--green-6)] bg-[var(--green-2)] text-[var(--green-11)]'
      : 'border-[var(--gray-4)] bg-[var(--gray-2)] text-[var(--gray-11)]'

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${tone}`}
    >
      {status === 'active' ? t`Active` : t`Inactive`}
    </span>
  )
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className='font-semibold text-[var(--gray-11)]'>{label}: </span>
      <span className='ml-2 text-[var(--gray-10)]'>{value}</span>
    </div>
  )
}
