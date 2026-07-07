import {
  createColumnHelper,
  useReactTable,
} from '@tanstack/react-table'
import {
  Check,
  Edit3,
  MoreHorizontal,
  Trash2,
  UsersRound,
} from 'lucide-react'
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import {
  createGroup as createGroupApi,
  deleteGroup as deleteGroupApi,
  getGroupById,
  getGroups,
  getUsers,
  updateGroup as updateGroupApi,
} from '@/api/v6/user'
import showToast from '@/components/base/toast/showToast'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import DataTable from '@/components/base/data-table/DataTable'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputSelectMultiple from '@/components/base/inputs/InputSelectMultiple'
import InputText from '@/components/base/inputs/InputText'
import InputTextarea from '@/components/base/inputs/InputTextarea'
import {
  mapApiGroupsToSettingsGroups,
  mapUsersToOptions,
  type SettingsGroup,
  type SettingsOption,
} from '../helpers/userGroupMappers'
import SetupProgressBar from './SetupProgressBar'
import SettingsPageHeader, {
  SettingsHeaderAddButton,
} from './SettingsPageHeader'
import SettingsTableToolbarRow from './SettingsTableToolbarRow'
import useSettingsTableToolbar from './useSettingsTableToolbar'
import {
  settingsHeaderMeta,
  settingsTableCoreOptions,
  useSettingsTableSearch,
} from '../helpers/settingsDataTable'
import { calculateGroupSetupProgress } from '../helpers/settingsSetupProgress'

type GroupStepKey = 'details' | 'members' | 'review'

type GroupStep = {
  caption: string
  key: GroupStepKey
  title: string
}

const groupSteps: GroupStep[] = [
  { caption: 'Step 1', key: 'details', title: 'Group Details' },
  { caption: 'Step 2', key: 'members', title: 'Assign Members' },
  { caption: 'Step 3', key: 'review', title: 'Review' },
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
  const [groups, setGroups] = useState<SettingsGroup[]>([])
  const [userOptions, setUserOptions] = useState<SettingsOption[]>([])
  const [isLoadingGroups, setIsLoadingGroups] = useState(true)
  const [isLoadingGroupDetails, setIsLoadingGroupDetails] = useState(false)
  const [isSavingGroup, setIsSavingGroup] = useState(false)
  const [openMenuId, setOpenMenuId] = useState<string | number | null>(null)

  const [isSetupOpen, setIsSetupOpen] = useState(false)
  const [editingGroupId, setEditingGroupId] = useState<string | number | null>(
    null,
  )
  const [activeStep, setActiveStep] = useState(0)
  const [draftGroup, setDraftGroup] = useState<SettingsGroup>(emptyGroup)
  const [selectedMembers, setSelectedMembers] = useState<SettingsOption[]>([])

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

  const openEditGroup = useCallback(async (group: SettingsGroup) => {
    setIsLoadingGroupDetails(true)
    setOpenMenuId(null)

    try {
      const response = await getGroupById(String(group.id))

      if (response.error || !response.data) {
        showToast({
          message: response.error || 'Failed to load group',
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
  }, [userOptions])

  const deleteGroup = useCallback(async (groupId: string | number) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this group?',
    )
    if (!confirmed) return

    const response = await deleteGroupApi(String(groupId))

    if (response.error) {
      showToast({ message: response.error, variant: 'error' })
      return
    }

    showToast({ message: 'Group deleted successfully', variant: 'success' })
    setOpenMenuId(null)
    await loadGroups()
  }, [loadGroups])

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

        showToast({ message: 'Group updated successfully', variant: 'success' })
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

      showToast({ message: 'Group created successfully', variant: 'success' })
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
          header: 'Group',
          id: 'group',
          meta: { ...settingsHeaderMeta.start, label: 'Group' },
          minSize: 200,
          size: 240,
          cell: ({ row }) => {
            const group = row.original

            return (
              <div className='min-w-0'>
                <div className='truncate font-semibold text-[var(--gray-13)]'>
                  {group.name}
                </div>
                <div className='truncate text-[var(--gray-10)]'>
                  {group.members.length} members
                </div>
              </div>
            )
          },
        },
      ),
      groupColumnHelper.accessor('description', {
        enableSorting: false,
        header: 'Description',
        id: 'description',
        meta: { ...settingsHeaderMeta.start, label: 'Description' },
        minSize: 180,
        size: 220,
        cell: ({ getValue }) => (
          <span className='block max-w-full truncate'>
            {String(getValue() || '—')}
          </span>
        ),
      }),
      groupColumnHelper.display({
        enableSorting: false,
        header: 'Members',
        id: 'members',
        meta: settingsHeaderMeta.start,
        minSize: 100,
        size: 110,
        cell: ({ row }) => (
          <span className='rounded-[10px] border border-[var(--border-default)] bg-surface px-3 py-1 font-medium text-[var(--gray-13)]'>
            {row.original.members.length}
          </span>
        ),
      }),
      groupColumnHelper.accessor('status', {
        enableSorting: false,
        header: 'Status',
        id: 'status',
        meta: { ...settingsHeaderMeta.start, label: 'Status' },
        minSize: 100,
        size: 110,
        cell: ({ getValue }) => <StatusBadge status={getValue()} />,
      }),
      groupColumnHelper.accessor('created', {
        enableSorting: false,
        header: 'Created',
        id: 'created',
        meta: settingsHeaderMeta.start,
        minSize: 110,
        size: 120,
        cell: ({ getValue }) => <span>{String(getValue() || '—')}</span>,
      }),
      groupColumnHelper.display({
        enableResizing: false,
        enableSorting: false,
        header: 'Actions',
        id: 'actions',
        meta: settingsHeaderMeta.end,
        minSize: 72,
        size: 72,
        cell: ({ row }) => {
          const group = row.original

          return (
            <div className='relative flex justify-end'>
              <button
                className='rounded-lg p-2 text-[var(--gray-13)] transition hover:bg-[var(--gray-2)] disabled:cursor-not-allowed disabled:opacity-50'
                disabled={isLoadingGroupDetails}
                type='button'
                onClick={(event) => {
                  event.stopPropagation()
                  setOpenMenuId(openMenuId === group.id ? null : group.id)
                }}
              >
                <MoreHorizontal size={20} />
              </button>

              {openMenuId === group.id ? (
                <div className='absolute top-10 right-0 z-50 w-40 overflow-hidden rounded-[10px] border border-[var(--border-default)] bg-surface py-1 text-left shadow-[var(--shadow-lg)]'>
                  <button
                    className='flex w-full items-center gap-2 px-3 py-2 text-[var(--gray-13)] hover:bg-[var(--gray-2)]'
                    type='button'
                    onClick={() => openEditGroup(group)}
                  >
                    <Edit3 size={15} />
                    Edit
                  </button>
                  <button
                    className='flex w-full items-center gap-2 px-3 py-2 text-[var(--red-11)] hover:bg-[var(--red-2)]'
                    type='button'
                    onClick={() => deleteGroup(group.id)}
                  >
                    <Trash2 size={15} />
                    Delete
                  </button>
                </div>
              ) : null}
            </div>
          )
        },
      }),
    ],
    [deleteGroup, isLoadingGroupDetails, openEditGroup, openMenuId],
  )

  const groupTable = useReactTable({
    ...settingsTableCoreOptions,
    ...tableSearchOptions,
    columns: groupColumns,
    data: groups,
    getRowId: (row) => String(row.id),
  })

  const { onRowSizeChange, rowSize, toolbar } = useSettingsTableToolbar({
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
        onCancel={() => setIsSetupOpen(false)}
        onChange={setDraftGroup}
        onMembersChange={setSelectedMembers}
        onNext={() =>
          setActiveStep((step) => Math.min(step + 1, groupSteps.length - 1))
        }
        onSave={saveGroup}
        onStepChange={setActiveStep}
      />
    )
  }

  return (
    <main className='bg-[var(--surface)]'>
      <section>
        <SettingsPageHeader
          actions={
            <SettingsHeaderAddButton
              tooltip='Add Group'
              onClick={openCreateGroup}
            />
          }
          description='Create logical groups to organize users by team, department, or function.'
          title='Group Management'
          onBack={onBack}
        />

        <div className='px-6 md:px-8'>
          <SettingsTableToolbarRow toolbar={toolbar} />

          <div className='py-4'>
            <DataTable
              emptyDescription='Create a group to organize users by team, department, or function.'
              emptyIcon='lucide:users-round'
              emptyTitle='No groups yet'
              hideActionBar
              isLoading={isLoadingGroups}
              isReLoading={isLoadingGroups}
              pageSize={Math.max(5, groups.length || 5)}
              rowSize={rowSize}
              table={groupTable}
              tableBodyMaxHeight='calc(100vh - 320px)'
              hideGrouping
              stickyHeader
              onReload={() => {
                void loadGroups()
              }}
              onRowSizeChange={onRowSizeChange}
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
  onCancel: () => void
  onChange: (group: SettingsGroup) => void
  onMembersChange: (members: SettingsOption[]) => void
  onNext: () => void
  onSave: () => void
  onStepChange: (step: number) => void
}) {
  const progress = useMemo(
    () => calculateGroupSetupProgress(draftGroup, selectedMembers.length),
    [draftGroup, selectedMembers.length],
  )
  const isLastStep = activeStep === groupSteps.length - 1
  const canContinueStepZero = Boolean(
    draftGroup.name.trim() && draftGroup.description.trim(),
  )
  const canSave = Boolean(draftGroup.name.trim() && draftGroup.description.trim())

  return (
    <main className='min-h-screen bg-[var(--surface-muted)] text-[var(--text-primary)]'>
      <header className='border-b border-[var(--border-default)] bg-surface px-6 py-4'>
        <div className='flex items-start justify-between gap-5'>
          <div className='flex items-start gap-3'>
            <IconButton
              ariaLabel='Cancel setup'
              color='gray'
              icon='lucide:arrow-left'
              size='sm'
              variant='ghost'
              onClick={onCancel}
            />

            <div>
              <h1 className='text-[18px] leading-6 font-semibold text-[var(--gray-13)]'>
                {editingGroupId ? 'Edit Group' : 'Create Group'}
              </h1>
              <p className='mt-1 text-[14px] leading-5 text-[var(--gray-11)]'>
                Configure group details, assign members, and review before
                saving.
              </p>
            </div>
          </div>

          <SetupProgressBar progress={progress} />
        </div>
      </header>

      <div className='grid min-h-[calc(100vh-96px)] grid-cols-1 lg:grid-cols-[296px_1fr]'>
        <aside className='border-r border-[var(--border-default)] bg-[var(--surface-muted)] px-4 py-9'>
          <div className='space-y-5'>
            {groupSteps.map((step, index) => {
              const isActive = index === activeStep
              const isCompleted = index < activeStep

              return (
                <button
                  className='group flex w-full items-center gap-5 rounded-[14px] px-3 py-2 text-left transition hover:bg-surface-raised'
                  key={step.key}
                  type='button'
                  onClick={() => onStepChange(index)}
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
                      {isCompleted ? <Check size={14} /> : index + 1}
                    </span>
                  </div>
                  <div className='text-md font-semibold text-[var(--indigo-12)]'>
                    {step.title}
                  </div>
                </button>
              )
            })}
          </div>
        </aside>

        <section className='ez-scrollbar h-[calc(100vh-155px)] min-h-0 overflow-y-auto px-6 py-10 lg:px-20'>
          <div className='mx-auto max-w-[860px]'>
            {activeStep === 0 ? (
              <FormCard
                description='Define the group name, description, and availability.'
                title='Group Details'
              >
                <div className='grid grid-cols-1 gap-5'>
                  <InputText
                    label='Group Name *'
                    placeholder='e.g. Finance Team'
                    value={draftGroup.name}
                    onChange={(value) =>
                      onChange({ ...draftGroup, name: value })
                    }
                  />
                  <InputTextarea
                    label='Description *'
                    minRows={4}
                    placeholder='Describe the purpose of this group...'
                    value={draftGroup.description}
                    onChange={(value) =>
                      onChange({ ...draftGroup, description: value })
                    }
                  />
                  <InputSelect
                    label='Status'
                    options={[
                      { id: 'active', name: 'Active', value: 'Active' },
                      { id: 'inactive', name: 'Inactive', value: 'Inactive' },
                    ]}
                    value={{
                      id: draftGroup.status,
                      name:
                        draftGroup.status === 'inactive' ? 'Inactive' : 'Active',
                      value:
                        draftGroup.status === 'inactive' ? 'Inactive' : 'Active',
                    }}
                    onChange={(selected) => {
                      if (!selected) return
                      onChange({
                        ...draftGroup,
                        status: selected.name.toLowerCase() as SettingsGroup['status'],
                      })
                    }}
                  />
                </div>
              </FormCard>
            ) : null}

            {activeStep === 1 ? (
              <FormCard
                description='Select users from your organization to include in this group.'
                title='Assign Members'
              >
                <InputSelectMultiple
                  className='bg-surface'
                  label='Group Members'
                  options={userOptions}
                  placeholder='Search and select users...'
                  value={selectedMembers}
                  clearable
                  searchable
                  onChange={(value) =>
                    onMembersChange((value || []) as SettingsOption[])
                  }
                />
              </FormCard>
            ) : null}

            {activeStep === 2 ? (
              <FormCard
                description='Review the group configuration before saving.'
                title='Review'
              >
                <div className='space-y-4 rounded-[14px] border border-[var(--border-default)] bg-surface p-5'>
                  <ReviewRow label='Group Name' value={draftGroup.name || '—'} />
                  <ReviewRow
                    label='Description'
                    value={draftGroup.description || '—'}
                  />
                  <ReviewRow
                    label='Status'
                    value={
                      draftGroup.status === 'inactive' ? 'Inactive' : 'Active'
                    }
                  />
                  <ReviewRow
                    label='Members'
                    value={
                      selectedMembers.length
                        ? selectedMembers.map((member) => member.name).join(', ')
                        : 'No members selected'
                    }
                  />
                </div>
              </FormCard>
            ) : null}

            <div className='mt-10 flex items-center justify-between'>
              <Button
                className='h-10 px-5'
                disabled={activeStep === 0}
                label='Back'
                variant='outline'
                onClick={onBack}
              />

              {isLastStep ? (
                <Button
                  className='h-10 border border-primary-10 bg-primary-11 px-5 text-surface'
                  disabled={!canSave || isSaving}
                  label={isSaving ? 'Saving...' : 'Save Group'}
                  onClick={onSave}
                />
              ) : (
                <Button
                  className='h-10 border border-primary-10 bg-primary-11 px-5 text-surface'
                  disabled={activeStep === 0 && !canContinueStepZero}
                  label='Continue'
                  onClick={onNext}
                />
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

function FormCard({
  children,
  description,
  title,
}: {
  children: ReactNode
  description: string
  title: string
}) {
  return (
    <div className='rounded-[18px] border border-[var(--border-default)] bg-surface p-8 shadow-[var(--shadow-sm)]'>
      <h2 className='text-[20px] font-semibold text-[var(--gray-13)]'>{title}</h2>
      <p className='mt-2 text-sm text-[var(--gray-11)]'>{description}</p>
      <div className='mt-8'>{children}</div>
    </div>
  )
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className='flex items-start justify-between gap-6 border-b border-[var(--gray-3)] pb-4 last:border-b-0 last:pb-0'>
      <span className='text-sm font-medium text-[var(--gray-10)]'>{label}</span>
      <span className='max-w-[65%] text-right text-sm font-semibold text-[var(--gray-13)]'>
        {value}
      </span>
    </div>
  )
}

function StatusBadge({ status }: { status: SettingsGroup['status'] }) {
  const tone =
    status === 'active'
      ? 'border-[var(--green-6)] bg-[var(--green-2)] text-[var(--green-11)]'
      : 'border-[var(--gray-4)] bg-[var(--gray-2)] text-[var(--gray-11)]'

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${tone}`}
    >
      {status}
    </span>
  )
}
