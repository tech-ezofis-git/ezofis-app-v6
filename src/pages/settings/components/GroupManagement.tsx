import {
  createColumnHelper,
  useReactTable,
} from '@tanstack/react-table'
import {
  Check,
  Download,
  Edit3,
  MoreHorizontal,
  Plus,
  Trash2,
  UsersRound,
} from 'lucide-react'
import { type ReactNode, useMemo, useState } from 'react'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import DataTable from '@/components/base/data-table/DataTable'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputSelectMultiple from '@/components/base/inputs/InputSelectMultiple'
import InputText from '@/components/base/inputs/InputText'
import InputTextarea from '@/components/base/inputs/InputTextarea'
import {
  dummySettingsGroups,
  getDummyUserOptions,
} from '../data/settingsDummyData'
import {
  settingsHeaderMeta,
  settingsTableCoreOptions,
} from '../helpers/settingsDataTable'
import { calculateGroupSetupProgress } from '../helpers/settingsSetupProgress'
import type { SettingsGroup, SettingsOption } from '../helpers/userGroupMappers'
import SettingsSearchInput from './SettingsSearchInput'
import SetupProgressBar from './SetupProgressBar'

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
  const userOptions = useMemo(() => getDummyUserOptions(), [])

  const [groups, setGroups] = useState<SettingsGroup[]>(dummySettingsGroups)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All Status')
  const [openMenuId, setOpenMenuId] = useState<string | number | null>(null)

  const [isSetupOpen, setIsSetupOpen] = useState(false)
  const [editingGroupId, setEditingGroupId] = useState<string | number | null>(
    null,
  )
  const [activeStep, setActiveStep] = useState(0)
  const [draftGroup, setDraftGroup] = useState<SettingsGroup>(emptyGroup)
  const [selectedMembers, setSelectedMembers] = useState<SettingsOption[]>([])

  const filteredGroups = useMemo(() => {
    return groups.filter((group) => {
      const text = `${group.name} ${group.description}`.toLowerCase()
      const matchesSearch = text.includes(query.toLowerCase())
      const matchesStatus =
        statusFilter === 'All Status' ||
        group.status === statusFilter.toLowerCase()

      return matchesSearch && matchesStatus
    })
  }, [groups, query, statusFilter])

  const openCreateGroup = () => {
    setEditingGroupId(null)
    setDraftGroup({ ...emptyGroup, id: Date.now() })
    setSelectedMembers([])
    setActiveStep(0)
    setIsSetupOpen(true)
  }

  const openEditGroup = (group: SettingsGroup) => {
    setEditingGroupId(group.id)
    setDraftGroup({ ...group })
    setSelectedMembers(
      userOptions.filter((option) => group.memberIds.includes(option.id)),
    )
    setActiveStep(0)
    setOpenMenuId(null)
    setIsSetupOpen(true)
  }

  const deleteGroup = (groupId: string | number) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this group?',
    )
    if (!confirmed) return

    setGroups((current) => current.filter((group) => group.id !== groupId))
    setOpenMenuId(null)
  }

  const saveGroup = () => {
    const normalizedGroup: SettingsGroup = {
      ...draftGroup,
      created: draftGroup.created === '—' ? formatToday() : draftGroup.created,
      memberIds: selectedMembers.map((member) => member.id),
      members: selectedMembers.map((member) => member.name),
      name: draftGroup.name.trim(),
      description: draftGroup.description.trim(),
    }

    if (!normalizedGroup.name) return

    if (editingGroupId) {
      setGroups((current) =>
        current.map((group) =>
          group.id === editingGroupId ? normalizedGroup : group,
        ),
      )
    } else {
      setGroups((current) => [normalizedGroup, ...current])
    }

    setIsSetupOpen(false)
  }

  const groupColumns = useMemo(
    () => [
      groupColumnHelper.display({
        enableResizing: false,
        enableSorting: false,
        header: '',
        id: 'icon',
        maxSize: 64,
        meta: settingsHeaderMeta.center,
        minSize: 64,
        size: 64,
        cell: () => (
          <div className='flex justify-center'>
            <div className='flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-[var(--primary-3)] text-[var(--primary-9)]'>
              <UsersRound size={20} />
            </div>
          </div>
        ),
      }),
      groupColumnHelper.display({
        enableSorting: false,
        header: 'Group',
        id: 'group',
        meta: settingsHeaderMeta.start,
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
      }),
      groupColumnHelper.accessor('description', {
        enableSorting: false,
        header: 'Description',
        id: 'description',
        meta: settingsHeaderMeta.start,
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
        meta: settingsHeaderMeta.start,
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
                className='rounded-lg p-2 text-[var(--gray-13)] transition hover:bg-[var(--gray-2)]'
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
    [openMenuId],
  )

  const groupTable = useReactTable({
    ...settingsTableCoreOptions,
    columns: groupColumns,
    data: filteredGroups,
    getRowId: (row) => String(row.id),
  })

  if (isSetupOpen) {
    return (
      <GroupSetup
        activeStep={activeStep}
        draftGroup={draftGroup}
        editingGroupId={editingGroupId}
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
        <div className='mb-4 flex items-center justify-between border-b border-gray-3 bg-surface px-6 py-4 md:px-8'>
          <div className='flex items-start gap-3'>
            <IconButton
              ariaLabel='Back'
              color='gray'
              icon='lucide:arrow-left'
              size='sm'
              variant='ghost'
              onClick={onBack}
            />

            <div>
              <h1 className='text-18/6 font-semibold tracking-tight text-gray-13'>
                Group Management
              </h1>
              <p className='text-13/5 text-gray-11'>
                Create logical groups to organize users by team, department, or
                function.
              </p>
            </div>
          </div>

          <div className='flex items-center gap-3'>
            <button
              className='inline-flex h-7 items-center gap-3 rounded-[5px] border border-[var(--border-default)] bg-surface px-4 text-[12px] font-medium text-[var(--gray-13)] shadow-[var(--shadow-sm)] transition hover:bg-[var(--gray-2)]'
              type='button'
            >
              <Download size={14} />
              Export
            </button>
            <button
              className='inline-flex h-7 items-center gap-3 rounded-[5px] bg-[var(--primary-9)] px-5 text-[12px] font-semibold text-white shadow-[var(--shadow-md)] transition hover:bg-[var(--primary-10)]'
              type='button'
              onClick={openCreateGroup}
            >
              <Plus size={14} />
              Create Group
            </button>
          </div>
        </div>

        <div className='mb-8 grid grid-cols-1 gap-4 px-6 py-4 lg:grid-cols-[1fr_180px]'>
          <SettingsSearchInput
            placeholder='Search groups by name or description...'
            value={query}
            onChange={setQuery}
          />

          <SelectField
            options={['All Status', 'Active', 'Inactive']}
            value={statusFilter}
            onChange={setStatusFilter}
          />
        </div>

        <div className='px-6 py-4'>
          <DataTable
            component={<div />}
            isLoading={false}
            isReLoading={false}
            pageSize={Math.max(5, filteredGroups.length || 5)}
            table={groupTable}
            tableBodyMaxHeight='calc(100vh - 320px)'
            hideGrouping
            stickyHeader
            onReload={() => setGroups(dummySettingsGroups)}
          />
        </div>
      </section>
    </main>
  )
}

function GroupSetup({
  activeStep,
  draftGroup,
  editingGroupId,
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
                    label='Description'
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
                  disabled={!draftGroup.name.trim()}
                  label='Save Group'
                  onClick={onSave}
                />
              ) : (
                <Button
                  className='h-10 border border-primary-10 bg-primary-11 px-5 text-surface'
                  disabled={activeStep === 0 && !draftGroup.name.trim()}
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

function SelectField({
  options,
  value,
  onChange,
}: {
  options: string[]
  value: string
  onChange: (value: string) => void
}) {
  const selectOptions = options.map((option, index) => ({
    id: index,
    name: option,
    value: option,
  }))

  const selectedOption =
    selectOptions.find((option) => option.value === value) || null

  return (
    <div className='relative'>
      <InputSelect
        options={selectOptions}
        value={selectedOption}
        onChange={(selected) => {
          if (!selected) return
          onChange(selected.value || selected.name)
        }}
      />
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

function formatToday() {
  return new Date().toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
