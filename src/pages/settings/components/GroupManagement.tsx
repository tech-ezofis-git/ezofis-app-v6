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
import IconButton from '@/components/base/button/IconButton'
import DataTable from '@/components/base/data-table/DataTable'
import InputSelectMultiple from '@/components/base/inputs/InputSelectMultiple'
import InputText from '@/components/base/inputs/InputText'
import InputTextarea from '@/components/base/inputs/InputTextarea'
import {
  mapApiGroupsToSettingsGroups,
  mapUsersToOptions,
  type SettingsGroup,
  type SettingsOption,
} from '../helpers/userGroupMappers'
import SettingsFormSection from './SettingsFormSection'
import SettingsSelectField from './SettingsSelectField'
import SettingsSelectedChips from './SettingsSelectedChips'
import SettingsSetupContent from './SettingsSetupContent'
import SettingsSetupHeader from './SettingsSetupHeader'
import SettingsPageHeader, {
  SettingsHeaderAddButton,
} from './SettingsPageHeader'
import useSettingsTableToolbar from './useSettingsTableToolbar'
import {
  settingsHeaderMeta,
  settingsTableCoreOptions,
  useSettingsTableSearch,
} from '../helpers/settingsDataTable'
import { calculateGroupSetupProgress } from '../helpers/settingsSetupProgress'
import {
  getFieldRequiredError,
  getMissingRequiredLabels,
  getRequiredFieldErrorMessage,
} from '../helpers/requiredFieldErrors'

type GroupStepKey = 'details' | 'members' | 'review'

type GroupStep = {
  caption: string
  description: string
  key: GroupStepKey
  title: string
}

const groupSteps: GroupStep[] = [
  {
    caption: 'Step 1',
    description: 'Define the group name, description, and availability.',
    key: 'details',
    title: 'Group Details',
  },
  {
    caption: 'Step 2',
    description:
      'Select users from your organization to include in this group.',
    key: 'members',
    title: 'Assign Members',
  },
  {
    caption: 'Step 3',
    description: 'Validate the group configuration before saving.',
    key: 'review',
    title: 'Review',
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
        onBackToSettings={onBack}
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
          toolbar={toolbar}
          onBack={onBack}
        />

        <div className='px-6 md:px-8'>
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
  const progress = useMemo(
    () => calculateGroupSetupProgress(draftGroup, selectedMembers.length),
    [draftGroup, selectedMembers.length],
  )
  const isLastStep = activeStep === groupSteps.length - 1
  const [showErrors, setShowErrors] = useState(false)

  const getMissingLabels = (step = activeStep) => {
    if (step === 1) return []

    return getMissingRequiredLabels([
      { label: 'Group Name', value: draftGroup.name },
      { label: 'Description', value: draftGroup.description },
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
    <main className='min-h-screen bg-[var(--surface)] text-[var(--text-primary)]'>
      <SettingsSetupHeader
        moduleTitle='Group Management'
        progress={progress}
        setupTitle={editingGroupId ? 'Edit Group' : 'Create Group'}
        stepDescription={activeStepConfig.description}
        stepTitle={activeStepConfig.title}
        onBackToSettings={onBackToSettings}
        onCancelSetup={onCancel}
      />

      <div className='grid min-h-[calc(100vh-96px)] grid-cols-1 lg:grid-cols-[296px_1fr]'>
        <aside className='border-r border-[var(--border-default)] bg-[var(--surface)] px-4 py-9'>
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
                  error={getFieldRequiredError(
                    'Group Name',
                    showErrors,
                    draftGroup.name,
                  )}
                  label='Group Name *'
                  placeholder='e.g. Finance Team'
                  value={draftGroup.name}
                  onChange={(value) =>
                    onChange({ ...draftGroup, name: value })
                  }
                />
                <InputTextarea
                  error={getFieldRequiredError(
                    'Description',
                    showErrors,
                    draftGroup.description,
                  )}
                  label='Description *'
                  minRows={4}
                  placeholder='Describe the purpose of this group...'
                  value={draftGroup.description}
                  onChange={(value) =>
                    onChange({ ...draftGroup, description: value })
                  }
                />
                <SettingsSelectField
                  label='Status'
                  options={['Active', 'Inactive']}
                  value={
                    draftGroup.status === 'inactive' ? 'Inactive' : 'Active'
                  }
                  onChange={(value) =>
                    onChange({
                      ...draftGroup,
                      status: value.toLowerCase() as SettingsGroup['status'],
                    })
                  }
                />
              </SettingsFormSection>
            ) : null}

            {activeStep === 1 ? (
              <SettingsFormSection>
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
                    Group Summary
                  </h3>
                  <div className='grid grid-cols-1 gap-x-12 gap-y-4 text-sm md:grid-cols-2'>
                    <SummaryItem
                      label='Group Name'
                      value={draftGroup.name || '—'}
                    />
                    <SummaryItem
                      label='Status'
                      value={
                        draftGroup.status === 'inactive' ? 'Inactive' : 'Active'
                      }
                    />
                    <SummaryItem
                      label='Description'
                      value={draftGroup.description || '—'}
                    />
                    <SummaryItem
                      label='Members'
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
                Back
              </button>

              <div className='flex items-center gap-3'>
                {isLastStep ? (
                  <button
                    className='h-10 rounded-[5px] bg-[var(--primary-9)] px-5 text-[15px] font-semibold text-white shadow-[var(--shadow-md)] transition hover:bg-[var(--primary-10)] disabled:cursor-not-allowed disabled:opacity-60'
                    disabled={isSaving}
                    type='button'
                    onClick={handleSave}
                  >
                    {isSaving ? 'Saving...' : 'Save Group'}
                  </button>
                ) : (
                  <button
                    className='h-10 rounded-[5px] bg-[var(--primary-9)] px-5 text-[15px] font-semibold text-white shadow-[var(--shadow-md)] transition hover:bg-[var(--primary-10)]'
                    type='button'
                    onClick={handleNext}
                  >
                    Next
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

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className='font-semibold text-[var(--gray-11)]'>{label}: </span>
      <span className='ml-2 text-[var(--gray-10)]'>{value}</span>
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
