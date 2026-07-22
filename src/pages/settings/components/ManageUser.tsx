import { createColumnHelper, useReactTable } from '@tanstack/react-table'
import {
  Check,
  Key,
  MoreHorizontal,
  Server,
  ShieldCheck,
  UserRound,
  UsersRound,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  createUser,
  deleteUser as deleteUserApi,
  getUsers,
  updateUser,
} from '@/api/v6/user'
import TableExport from '@/components/base/data-table/actions/TableExport'
import TableSearch from '@/components/base/data-table/actions/TableSearch'
import DataTable from '@/components/base/data-table/DataTable'
import InputText from '@/components/base/inputs/InputText'
import InputPassword from '@/components/base/inputs/password/InputPassword'
import Menu from '@/components/base/menu/Menu'
import MenuItem from '@/components/base/menu/MenuItem'
import Pagination from '@/components/base/pagination/Pagination'
import showToast from '@/components/base/toast/showToast'
import CustomFilter from '@/components/common/CustomFilter'
import {
  matchesCategoryFilterValue,
} from '@/utils/filterUtils'
import {
  dummySettingsUsers,
  getDummyGroupOptions,
} from '../data/settingsDummyData'
import {
  type DraftSettingsUser,
  mapDraftUserToCreatePayload,
  mapDraftUserToUpdatePayload,
} from '../helpers/mapCreateUserPayload'
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
import { calculateUserSetupProgress } from '../helpers/settingsSetupProgress'
import {
  mapApiUsersToSettingsUsers,
  mapApiUserToSettingsUser,
  mapUsersToManagerOptions,
  type SettingsOption,
  type SettingsUser,
} from '../helpers/userGroupMappers'
import SettingsDateField from './SettingsDateField'
import SettingsFormSection from './SettingsFormSection'
import SettingsPageHeader from './SettingsPageHeader'
import SettingsSelectField from './SettingsSelectField'
import SettingsSetupContent from './SettingsSetupContent'
import SettingsSetupHeader from './SettingsSetupHeader'
import useSettingsTableToolbar from './useSettingsTableToolbar'

type AppUser = SettingsUser
type DraftUser = DraftSettingsUser
type LoginType = 'Password' | 'Google' | 'Microsoft' | 'Active Directory'

type Step = {
  caption: string
  description: string
  key: StepKey
  title: string
}

type StepKey = 'login' | 'business' | 'groups' | 'authentication' | 'review'

type UserStatus = 'active' | 'inactive' | 'pending'

const steps: Step[] = [
  {
    caption: 'Step 1',
    description: 'Capture primary identity and sign-in configuration.',
    key: 'login',
    title: 'Login Details',
  },
  {
    caption: 'Step 2',
    description:
      'Align this user with the business hierarchy and operating model.',
    key: 'business',
    title: 'Business Detail',
  },
  {
    caption: 'Step 3',
    description:
      'Assign this user to one or more groups. Groups determine shared folder and workflow access.',
    key: 'groups',
    title: 'Group Assignment',
  },
  {
    caption: 'Step 4',
    description: 'Govern multi-factor verification for secure user access.',
    key: 'authentication',
    title: 'Authentication',
  },
  {
    caption: 'Step 5',
    description: 'Validate the user profile before provisioning access.',
    key: 'review',
    title: 'Review',
  },
]

const emptyUser: DraftUser = {
  accountExpiryDate: '',
  businessUnit: '',
  created: 'Jun 6, 2026',
  department: '',
  email: '',
  employeeId: '',
  firstName: '',
  forcePasswordReset: false,
  groups: [],
  id: 0,
  jobTitle: '',
  lastLogin: '—',
  lastName: '',
  location: '',
  loginType: 'Password',
  manager: '',
  mfaEnabled: true,
  mfaMethods: [],
  password: '',
  passwordExpiryDays: 90,
  role: 'Business User',
  status: 'active',
  username: '',
}

const departments = ['Administration', 'Finance', 'IT', 'Legal', 'Procurement']
const jobTitles = ['Executive', 'Manager']
const roles = [
  'Administrator',
  'Workspace Owner',
  'Process Owner',
  'Folder Owner',
  'Business User',
]
const loginTypes: LoginType[] = [
  'Password',
  'Google',
  'Microsoft',
  'Active Directory',
]

const mfaMethods = ['Email OTP', 'Mobile OTP', 'Authenticator App']

type LoginOption = {
  description: string
  icon: React.ReactNode
  title: string
  value: LoginType
}

const loginOptions: LoginOption[] = [
  {
    description: 'Email and password',
    icon: <Key className='h-4 w-4 shrink-0 text-[var(--primary-9)]' />,
    title: 'Password',
    value: 'Password',
  },
  {
    description: 'Sign in with Google',
    icon: (
      <svg
        className='h-4 w-4 shrink-0 text-[var(--primary-9)]'
        fill='currentColor'
        viewBox='0 0 24 24'
      >
        <path d='M12.24 10.285V13.4h6.887c-.58 3.013-3.084 5.216-6.887 5.216-4.28 0-7.75-3.47-7.75-7.75s3.47-7.75 7.75-7.75c2.18 0 4.1.815 5.57 2.152l2.3-2.3C18.17 1.25 15.39 0 12.24 0 5.48 0 0 5.48 0 12.24s5.48 12.24 12.24 12.24c6.9 0 11.96-4.85 11.96-11.96 0-.82-.08-1.57-.22-2.24H12.24z' />
      </svg>
    ),
    title: 'Google',
    value: 'Google',
  },
  {
    description: 'Sign in with Microsoft',
    icon: (
      <svg
        className='h-4 w-4 shrink-0 text-[var(--primary-9)]'
        fill='currentColor'
        viewBox='0 0 23 23'
      >
        <path d='M0 0h11v11H0zM12 0h11v11H12zM0 12h11v11H0zM12 12h11v11H12z' />
      </svg>
    ),
    title: 'Microsoft',
    value: 'Microsoft',
  },
  {
    description: 'Sign in with AD',
    icon: <Server className='h-4 w-4 shrink-0 text-[var(--primary-9)]' />,
    title: 'Active directory',
    value: 'Active Directory',
  },
]

const userColumnHelper = createColumnHelper<AppUser>()

type FormSectionProps = {
  user: DraftUser
  onChange: (user: DraftUser) => void
}

type ManageUserProps = {
  onBack?: () => void
}

export default function ManageUser({ onBack }: ManageUserProps) {
  const groupOptions = useMemo(() => getDummyGroupOptions(), [])

  const [users, setUsers] = useState<AppUser[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(true)

  const [isSetupOpen, setIsSetupOpen] = useState(false)
  const [editingUserId, setEditingUserId] = useState<string | number | null>(
    null,
  )
  const [activeStep, setActiveStep] = useState(0)
  const [draftUser, setDraftUser] = useState<DraftUser>(emptyUser)
  const [originalUser, setOriginalUser] = useState<DraftUser | null>(null)
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      let matches = true
      Object.entries(activeFilters).forEach(([key, value]) => {
        if (!value) return

        if (key === 'name') {
          const fullName = `${user.firstName} ${user.lastName}`.trim()
          const haystack = `${fullName} ${user.email}`
          if (
            !matchesCategoryFilterValue(haystack, value, 'contains') &&
            !matchesCategoryFilterValue(fullName, value)
          ) {
            matches = false
          }
        } else if (
          key === 'role' ||
          key === 'loginType' ||
          key === 'department' ||
          key === 'status' ||
          key === 'businessUnit' ||
          key === 'location' ||
          key === 'jobTitle'
        ) {
          if (
            !matchesCategoryFilterValue(
              user[key as keyof AppUser],
              value,
            )
          ) {
            matches = false
          }
        }
      })
      return matches
    })
  }, [users, activeFilters])

  const tableSearchOptions = useSettingsTableSearch()

  const loadUsers = useCallback(async () => {
    setIsLoadingUsers(true)

    try {
      const response = await getUsers()

      if (response.error) {
        showToast({ message: response.error, variant: 'error' })
        setUsers(dummySettingsUsers)
        return
      }

      setUsers(
        response.data.length ? mapApiUsersToSettingsUsers(response.data) : [],
      )
    } finally {
      setIsLoadingUsers(false)
    }
  }, [])

  useEffect(() => {
    void loadUsers()
  }, [loadUsers])

  const managerOptions = useMemo(
    () =>
      mapUsersToManagerOptions(
        users.filter((user) => user.id !== editingUserId),
      ),
    [users, editingUserId],
  )

  const openAddUser = () => {
    setEditingUserId(null)
    setOriginalUser(null)
    setDraftUser({ ...emptyUser, id: Date.now() })
    setActiveStep(0)
    setIsSetupOpen(true)
  }

  const openEditUser = (user: AppUser) => {
    const snapshot = { ...user, password: '' }

    setEditingUserId(user.id)
    setOriginalUser(snapshot)
    setDraftUser(snapshot)
    setActiveStep(0)
    setIsSetupOpen(true)
  }

  const deleteUser = async (userId: string | number) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this user?',
    )
    if (!confirmed) return

    setIsLoadingUsers(true)
    try {
      const response = await deleteUserApi(String(userId))

      if (response.error) {
        showToast({ message: response.error, variant: 'error' })
        return
      }

      showToast({ message: 'User deleted successfully', variant: 'success' })
      await loadUsers()
    } finally {
      setIsLoadingUsers(false)
    }
  }

  const saveUser = async () => {
    const normalizedUser: DraftUser = {
      ...draftUser,
      created: draftUser.created || 'Jun 6, 2026',
      username:
        draftUser.username ||
        draftUser.email.split('@')[0] ||
        `${draftUser.firstName}.${draftUser.lastName}`.toLowerCase(),
    }

    const missingLabels = getMissingRequiredUserLabels(normalizedUser)

    if (missingLabels.length) {
      const nextStep = missingLabels.every((label) => label === 'Role') ? 1 : 0
      setActiveStep(nextStep)
      showToast({
        message: getRequiredFieldErrorMessage(missingLabels),
        variant: 'error',
      })
      return
    }

    if (editingUserId) {
      if (!originalUser) {
        showToast({ message: 'Unable to update user', variant: 'error' })
        return
      }

      const updatePayload = mapDraftUserToUpdatePayload(
        normalizedUser,
        originalUser,
      )

      if (!Object.keys(updatePayload).length) {
        showToast({ message: 'No changes to save', variant: 'default' })
        return
      }

      setIsSaving(true)

      try {
        const response = await updateUser(String(editingUserId), updatePayload)

        if (response.error) {
          showToast({ message: response.error, variant: 'error' })
          return
        }

        const listResponse = await getUsers()

        if (!listResponse.error && listResponse.data.length) {
          setUsers(mapApiUsersToSettingsUsers(listResponse.data))
        } else {
          const { password: _password, ...userWithoutPassword } = normalizedUser

          setUsers((current) =>
            current.map((user) =>
              user.id === editingUserId ? userWithoutPassword : user,
            ),
          )
        }

        showToast({ message: 'User updated successfully', variant: 'success' })
        setOriginalUser(null)
        setIsSetupOpen(false)
      } finally {
        setIsSaving(false)
      }

      return
    }

    setIsSaving(true)

    try {
      const response = await createUser(
        mapDraftUserToCreatePayload(normalizedUser),
      )

      if (response.error) {
        showToast({ message: response.error, variant: 'error' })
        return
      }

      const createdUser = response.data
        ? mapApiUserToSettingsUser(
            response.data as Record<string, unknown>,
            users.length,
          )
        : null
      const listResponse = await getUsers()

      if (!listResponse.error && listResponse.data.length) {
        setUsers(mapApiUsersToSettingsUsers(listResponse.data))
      } else if (createdUser) {
        setUsers((current) => [createdUser, ...current])
      } else {
        const { password: _password, ...userWithoutPassword } = normalizedUser
        setUsers((current) => [
          { ...userWithoutPassword, id: Date.now() },
          ...current,
        ])
      }

      showToast({ message: 'User created successfully', variant: 'success' })
      setIsSetupOpen(false)
    } finally {
      setIsSaving(false)
    }
  }

  const userColumns = useMemo(
    () => [
      userColumnHelper.display({
        enableResizing: false,
        enableSorting: false,
        header: '',
        id: 'avatar',
        maxSize: 48,
        meta: { ...settingsHeaderMeta.center, disableEllipsis: true },
        minSize: 48,
        size: 48,
        cell: ({ row }) => {
          const user = row.original

          return (
            <div className='flex justify-center'>
              <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--primary-3)] text-xs font-semibold text-[var(--primary-9)]'>
                {getInitials(user.firstName, user.lastName)}
              </div>
            </div>
          )
        },
      }),

      userColumnHelper.accessor(
        (row) => `${row.firstName} ${row.lastName} ${row.email}`,
        {
          enableSorting: false,
          header: 'Name',
          id: 'name',
          meta: { ...settingsHeaderMeta.start, label: 'Name' },
          minSize: 40,
          size: 260,
          cell: ({ row }) => {
            const user = row.original

            return (
              <div className='min-w-0'>
                <div className='truncate font-semibold text-[var(--gray-13)]'>
                  {user.firstName} {user.lastName}
                </div>
                <div className='truncate text-[var(--gray-10)]'>
                  {user.email}
                </div>
              </div>
            )
          },
        },
      ),

      userColumnHelper.accessor('department', {
        enableSorting: false,
        header: 'Department',
        id: 'department',
        meta: { ...settingsHeaderMeta.start, label: 'Department' },
        minSize: 40,
        size: 140,
        cell: ({ getValue }) => <span>{String(getValue() || '—')}</span>,
      }),

      userColumnHelper.accessor('role', {
        enableSorting: false,
        header: 'Role',
        id: 'role',
        meta: {
          ...settingsHeaderMeta.start,
          disableEllipsis: true,
          label: 'Role',
        },
        minSize: 40,
        size: 150,
        cell: ({ getValue }) => (
          <span className='inline-flex items-center rounded-[10px] border border-[var(--border-default)] bg-surface px-3 py-1 font-medium text-[var(--gray-13)]'>
            {String(getValue())}
          </span>
        ),
      }),

      userColumnHelper.accessor('status', {
        enableSorting: false,
        header: 'Status',
        id: 'status',
        meta: {
          ...settingsHeaderMeta.start,
          disableEllipsis: true,
          label: 'Status',
        },
        minSize: 40,
        size: 110,
        cell: ({ getValue }) => <StatusBadge status={getValue()} />,
      }),

      userColumnHelper.accessor('loginType', {
        enableSorting: false,
        header: 'Login Type',
        id: 'loginType',
        meta: settingsHeaderMeta.start,
        minSize: 40,
        size: 140,
        cell: ({ getValue }) => <span>{String(getValue() || '—')}</span>,
      }),

      userColumnHelper.accessor('lastLogin', {
        enableSorting: false,
        header: 'Last Login',
        id: 'lastLogin',
        meta: settingsHeaderMeta.start,
        minSize: 40,
        size: 120,
        cell: ({ getValue }) => <span>{String(getValue() || '—')}</span>,
      }),

      userColumnHelper.accessor('created', {
        enableSorting: false,
        header: 'Created',
        id: 'created',
        meta: settingsHeaderMeta.start,
        minSize: 40,
        size: 120,
        cell: ({ getValue }) => <span>{String(getValue() || '—')}</span>,
      }),

      userColumnHelper.display({
        enableResizing: false,
        enableSorting: false,
        header: 'Actions',
        id: 'actions',
        meta: settingsHeaderMeta.end,
        minSize: 72,
        size: 72,
        cell: ({ row }) => {
          const user = row.original

          return (
            <div
              className='flex justify-end'
              onClick={(event) => event.stopPropagation()}
            >
              <Menu
                position='bottom-end'
                width={144}
                withinPortal
                target={
                  <button
                    className='rounded-lg p-2 text-[var(--gray-13)] transition hover:bg-[var(--gray-2)]'
                    type='button'
                  >
                    <MoreHorizontal size={20} />
                  </button>
                }
              >
                <MenuItem
                  icon='lucide:pencil'
                  label='Edit'
                  onClick={() => openEditUser(user)}
                />
                <MenuItem
                  className='text-red-11'
                  icon='lucide:trash-2'
                  iconClass='text-red-11'
                  label='Delete'
                  onClick={() => deleteUser(user.id)}
                />
              </Menu>
            </div>
          )
        },
      }),
    ],
    [openEditUser, deleteUser],
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

  const userTable = useReactTable({
    ...settingsTableCoreOptions,
    ...tableSearchOptions,
    ...paginationModel,
    columns: userColumns,
    data: filteredUsers,
    state: {
      ...tableSearchOptions.state,
      pagination,
    },
    getRowId: (row: AppUser) => String(row.id),
    onPaginationChange,
  })

  const { rowSize, onRowSizeChange } = useSettingsTableToolbar({
    isReLoading: isLoadingUsers,
    table: userTable,
    onReload: () => {
      void loadUsers()
    },
  })

  const roleOptions = useMemo(
    () =>
      Array.from(new Set(users.map((u) => String(u.role)).filter(Boolean))).map(
        (r) => ({ label: r, value: r }),
      ),
    [users],
  )
  const nameOptions = useMemo(
    () =>
      users
        .map((u) => {
          const label = `${u.firstName} ${u.lastName}`.trim()
          return label ? { label, value: label } : null
        })
        .filter(Boolean)
        .sort((a, b) => a!.label.localeCompare(b!.label)) as {
        label: string
        value: string
      }[],
    [users],
  )
  const loginTypeOptions = useMemo(
    () =>
      Array.from(
        new Set(users.map((u) => String(u.loginType)).filter(Boolean)),
      ).map((r) => ({ label: r, value: r })),
    [users],
  )
  const departmentOptions = useMemo(
    () =>
      Array.from(
        new Set(users.map((u) => String(u.department)).filter(Boolean)),
      ).map((r) => ({ label: r, value: r })),
    [users],
  )
  const statusOptions = useMemo(
    () =>
      Array.from(
        new Set(users.map((u) => String(u.status)).filter(Boolean)),
      ).map((r) => ({ label: r, value: r })),
    [users],
  )
  const businessUnitOptions = useMemo(
    () =>
      Array.from(
        new Set(users.map((u) => String(u.businessUnit)).filter(Boolean)),
      ).map((r) => ({ label: r, value: r })),
    [users],
  )

  if (isSetupOpen) {
    return (
      <UserSetup
        activeStep={activeStep}
        draftUser={draftUser}
        editingUserId={editingUserId}
        groupOptions={groupOptions}
        isSaving={isSaving}
        managerOptions={managerOptions}
        onBack={() => setActiveStep((step) => Math.max(step - 1, 0))}
        onBackToSettings={onBack}
        onCancel={() => {
          setOriginalUser(null)
          setIsSetupOpen(false)
        }}
        onChange={setDraftUser}
        onNext={() =>
          setActiveStep((step) => Math.min(step + 1, steps.length - 1))
        }
        onSave={saveUser}
        onStepChange={setActiveStep}
      />
    )
  }
  return (
    <main className='flex h-full flex-col bg-[var(--surface)]'>
      <section className='flex flex-1 flex-col'>
        <SettingsPageHeader title='User Management' onBack={onBack} />

        <div className='flex flex-1 flex-col overflow-hidden px-6 py-2 md:px-8'>
          <CustomFilter
            activeFilters={activeFilters}
            customSearchComponent={<TableSearch table={userTable as any} />}
            trailingActions={<TableExport table={userTable as any} />}
            actionButtons={[
              {
                color: 'gray',
                disabled: isLoadingUsers,
                icon: 'tabler:refresh',
                id: 'refresh',
                isIconButton: true,
                tooltip: 'Refresh',
                variant: 'outline',
                onClick: loadUsers,
              },
            ]}
            addButton={{
              tooltip: 'Add User',
              onClick: openAddUser,
            }}
            filters={[
              {
                id: 'name',
                label: 'Name',
                options: nameOptions,
                searchable: true,
                searchPlaceholder: 'Search name...',
              },
              { id: 'role', label: 'Role', options: roleOptions },
              { id: 'status', label: 'Status', options: statusOptions },
            ]}
            moreFilters={[
              {
                id: 'department',
                label: 'Department',
                options: departmentOptions,
              },
              {
                id: 'loginType',
                label: 'Login Type',
                options: loginTypeOptions,
              },
              {
                id: 'businessUnit',
                label: 'Business Unit',
                options: businessUnitOptions,
              },
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
                emptyDescription='Add a user to grant access to the platform and assign folder permissions.'
                emptyIcon='lucide:users'
                emptyTitle='No users yet'
                isLoading={isLoadingUsers}
                isReLoading={isLoadingUsers}
                pageSize={pageSize}
                rowSize={rowSize}
                table={userTable}
                hideActionBar
                hideGrouping
                stickyHeader
                onReload={() => {
                  void loadUsers()
                }}
                onRowSizeChange={onRowSizeChange}
              />
            </div>
            <Pagination
              className='mt-4 shrink-0'
              itemLabel='Users'
              page={page}
              pageSize={pageSize}
              showPageNumbers={false}
              totalItems={userTable.getFilteredRowModel().rows.length}
              onPageChange={onPageChange}
              onPageSizeChange={onPageSizeChange}
            />
          </div>
        </div>
      </section>
    </main>
  )
}

function Authentication({ user, onChange }: FormSectionProps) {
  const toggleMethod = (method: string) => {
    const exists = user.mfaMethods.includes(method)
    const nextMethods = exists
      ? user.mfaMethods.filter((item) => item !== method)
      : [...user.mfaMethods, method]

    onChange({ ...user, mfaMethods: nextMethods })
  }

  return (
    <SettingsFormSection>
      <div className='mb-7 rounded-[14px] border border-[var(--border-default)] bg-surface p-5'>
        <div className='flex items-center justify-between gap-4'>
          <div>
            <h3 className='text-sm font-semibold text-[var(--gray-13)]'>
              Multi-Factor Authentication
            </h3>
            <p className='text-xs text-[var(--gray-11)]'>
              Require additional verification for sign-in
            </p>
          </div>
          <Switch
            checked={user.mfaEnabled}
            onChange={(checked) => onChange({ ...user, mfaEnabled: checked })}
          />
        </div>
      </div>

      <h3 className='mb-4 text-sm font-semibold text-[var(--gray-13)]'>
        MFA Methods
      </h3>
      <div className='space-y-4'>
        {mfaMethods.map((method) => {
          const selected = user.mfaMethods.includes(method)

          return (
            <button
              disabled={!user.mfaEnabled}
              key={method}
              className={[
                'flex h-[66px] w-full items-center gap-4 rounded-[10px] border bg-surface px-5 text-left transition disabled:cursor-not-allowed disabled:opacity-50',
                selected
                  ? 'border-[var(--primary-6)] bg-[var(--primary-2)]'
                  : 'border-[var(--border-default)] hover:border-[var(--primary-5)]',
              ].join(' ')}
              onClick={() => toggleMethod(method)}
            >
              <span
                className={[
                  'flex h-5 w-5 items-center justify-center rounded-[6px] border',
                  selected
                    ? 'border-[var(--primary-9)] bg-[var(--primary-9)] text-white'
                    : 'border-[var(--primary-8)] bg-surface',
                ].join(' ')}
              >
                {selected && <Check size={12} />}
              </span>
              <span className='text-sm font-semibold text-[var(--gray-13)]'>
                {method}
              </span>
            </button>
          )
        })}
      </div>
    </SettingsFormSection>
  )
}

function BusinessDetails({
  managerOptions,
  showErrors,
  user,
  onChange,
}: FormSectionProps & {
  managerOptions: SettingsOption[]
  showErrors?: boolean
}) {
  return (
    <SettingsFormSection>
      <div className='grid grid-cols-1 gap-5 md:grid-cols-2'>
        <SettingsSelectField
          label='Job Title'
          options={jobTitles}
          placeholder='Select'
          value={user.jobTitle}
          onChange={(value) => onChange({ ...user, jobTitle: value })}
        />

        <EzTextField
          label='Employee ID'
          placeholder='EMP-001'
          value={user.employeeId}
          onChange={(value) => onChange({ ...user, employeeId: value })}
        />

        <SettingsSelectField
          label='Department'
          options={departments}
          placeholder='Select'
          value={user.department}
          onChange={(value) => onChange({ ...user, department: value })}
        />

        <EzTextField
          label='Business Unit'
          placeholder='e.g. Corporate'
          value={user.businessUnit}
          onChange={(value) => onChange({ ...user, businessUnit: value })}
        />

        <SettingsSelectField
          label='Manager'
          options={managerOptions}
          placeholder='Select'
          value={user.manager}
          clearable
          onChange={(value) => onChange({ ...user, manager: value })}
        />

        <EzTextField
          label='Location'
          placeholder='e.g. New York, NY'
          value={user.location}
          onChange={(value) => onChange({ ...user, location: value })}
        />
      </div>

      <SettingsSelectField
        error={getFieldRequiredError('Role', Boolean(showErrors), user.role)}
        label='Role'
        options={roles}
        value={user.role}
        required
        onChange={(value) => onChange({ ...user, role: value })}
      />
    </SettingsFormSection>
  )
}
function EzPasswordField({
  error,
  label,
  required,
  value,
  onChange,
}: {
  error?: string
  label: string
  required?: boolean
  value: string
  onChange: (value: string) => void
}) {
  return (
    <InputPassword
      error={error}
      label={label}
      required={required}
      value={value}
      showPlaceholder
      onChange={onChange}
    />
  )
}

function EzTextField({
  error,
  label,
  placeholder,
  required,
  type = 'text',
  value,
  onChange,
}: {
  error?: string
  label: string
  placeholder?: string
  required?: boolean
  type?: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <InputText
      error={error}
      label={required ? `${label} *` : label}
      placeholder={placeholder}
      type={type}
      value={value}
      onChange={(eventOrValue: any) => {
        const nextValue =
          typeof eventOrValue === 'string'
            ? eventOrValue
            : (eventOrValue?.target?.value ?? '')

        onChange(nextValue)
      }}
    />
  )
}

function getInitials(firstName: string, lastName: string) {
  return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || 'U'
}

function getMissingRequiredUserLabels(user: DraftUser, step?: number) {
  if (step === 2 || step === 3) return []

  if (step === 1) {
    return getMissingRequiredLabels([{ label: 'Role', value: user.role }])
  }

  const loginFields = [
    { label: 'First Name', value: user.firstName },
    { label: 'Last Name', value: user.lastName },
    { label: 'Email Address', value: user.email },
    { label: 'Login Type', value: user.loginType },
  ]

  if (user.loginType === 'Password') {
    loginFields.push({ label: 'Password', value: user.password })
  }

  if (step === 0) {
    return getMissingRequiredLabels(loginFields)
  }

  return getMissingRequiredLabels([
    ...loginFields,
    { label: 'Role', value: user.role },
  ])
}

function GroupAssignment({
  groupOptions,
  user,
  onChange,
}: FormSectionProps & {
  groupOptions: Array<{ caption: string; name: string }>
}) {
  const toggleGroup = (name: string) => {
    const exists = user.groups.includes(name)
    const nextGroups = exists
      ? user.groups.filter((item) => item !== name)
      : [...user.groups, name]
    onChange({ ...user, groups: nextGroups })
  }

  return (
    <SettingsFormSection>
      {groupOptions.length ? (
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
          {groupOptions.map((group) => {
            const selected = user.groups.includes(group.name)

            return (
              <button
                key={group.name}
                className={[
                  'flex min-h-[60px] items-center gap-4 rounded-[10px] border bg-surface px-5 text-left transition',
                  selected
                    ? 'border-[var(--primary-6)] bg-[var(--primary-2)] shadow-[0_0_0_1px_var(--primary-5)]'
                    : 'border-[var(--border-default)] hover:border-[var(--primary-5)]',
                ].join(' ')}
                onClick={() => toggleGroup(group.name)}
              >
                <span
                  className={[
                    'flex h-5 w-5 items-center justify-center rounded-[6px] border',
                    selected
                      ? 'border-[var(--primary-9)] bg-[var(--primary-9)] text-white'
                      : 'border-[var(--primary-8)] bg-surface',
                  ].join(' ')}
                >
                  {selected && <Check size={12} />}
                </span>
                <span>
                  <span className='block text-sm font-semibold text-[var(--gray-13)]'>
                    {group.name}
                  </span>
                  <span className='mt-1 block text-xs text-[var(--gray-11)]'>
                    {group.caption}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      ) : (
        <div className='rounded-[10px] border border-dashed border-[var(--border-default)] bg-surface px-5 py-8 text-center text-sm text-[var(--gray-10)]'>
          No groups available from the API yet.
        </div>
      )}
    </SettingsFormSection>
  )
}

function LoginDetails({
  showErrors,
  user,
  onChange,
}: FormSectionProps & { showErrors?: boolean }) {
  return (
    <SettingsFormSection>
      <div className='grid grid-cols-1 gap-5 md:grid-cols-2'>
        <EzTextField
          label='First Name'
          placeholder='Enter first name'
          value={user.firstName}
          required
          error={getFieldRequiredError(
            'First Name',
            Boolean(showErrors),
            user.firstName,
          )}
          onChange={(value) => onChange({ ...user, firstName: value })}
        />

        <EzTextField
          label='Last Name'
          placeholder='Enter last name'
          value={user.lastName}
          required
          error={getFieldRequiredError(
            'Last Name',
            Boolean(showErrors),
            user.lastName,
          )}
          onChange={(value) => onChange({ ...user, lastName: value })}
        />
      </div>

      <EzTextField
        label='Email Address'
        placeholder='user@company.com'
        type='email'
        value={user.email}
        required
        error={getFieldRequiredError(
          'Email Address',
          Boolean(showErrors),
          user.email,
        )}
        onChange={(value) => onChange({ ...user, email: value })}
      />

      <EzTextField
        label='Username'
        placeholder='Enter username'
        value={user.username}
        onChange={(value) => onChange({ ...user, username: value })}
      />

      <div className='space-y-2'>
        <label className='block text-xs font-semibold text-[var(--gray-13)]'>
          Login Type *
        </label>
        <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4'>
          {loginOptions.map((opt) => {
            const isSelected = user.loginType === opt.value

            return (
              <button
                key={opt.value}
                type='button'
                className={[
                  'flex cursor-pointer items-center gap-3 rounded-[12px] border p-3.5 text-left transition',
                  isSelected
                    ? 'border-[var(--primary-8)] bg-[var(--primary-2)] shadow-sm ring-1 ring-[var(--primary-8)]'
                    : 'border-[var(--border-default)] bg-surface hover:border-[var(--primary-5)]',
                ].join(' ')}
                onClick={() => onChange({ ...user, loginType: opt.value })}
              >
                <div
                  className={[
                    'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition',
                    isSelected
                      ? 'border-[var(--primary-9)] bg-surface'
                      : 'border-[var(--gray-7)] bg-surface',
                  ].join(' ')}
                >
                  {isSelected && (
                    <div className='h-2 w-2 rounded-full bg-[var(--primary-9)]' />
                  )}
                </div>

                {opt.icon}

                <div className='min-w-0 flex-1'>
                  <div className='truncate text-xs font-semibold text-[var(--gray-13)]'>
                    {opt.title}
                  </div>
                  <div className='mt-0.5 truncate text-[11px] text-[var(--gray-10)]'>
                    {opt.description}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
        {getFieldRequiredError(
          'Login Type',
          Boolean(showErrors),
          user.loginType,
        ) ? (
          <p className='text-xs text-[var(--red-9)]'>
            {getFieldRequiredError(
              'Login Type',
              Boolean(showErrors),
              user.loginType,
            )}
          </p>
        ) : null}
      </div>

      {user.loginType === 'Password' ? (
        <EzPasswordField
          label='Password'
          value={user.password}
          required
          error={getFieldRequiredError(
            'Password',
            Boolean(showErrors),
            user.password,
          )}
          onChange={(value) => onChange({ ...user, password: value })}
        />
      ) : null}

      <div className='grid grid-cols-1 gap-5 md:grid-cols-2'>
        <EzTextField
          label='Password Expiry (Days)'
          placeholder='90'
          type='number'
          value={String(user.passwordExpiryDays)}
          onChange={(value) =>
            onChange({ ...user, passwordExpiryDays: Number(value) || 0 })
          }
        />

        <SettingsDateField
          label='Account Expiry Date'
          value={user.accountExpiryDate}
          onChange={(value) => onChange({ ...user, accountExpiryDate: value })}
        />
      </div>

      <ToggleRow
        checked={user.forcePasswordReset}
        label='Force password reset on first login'
        onChange={(checked) =>
          onChange({ ...user, forcePasswordReset: checked })
        }
      />
    </SettingsFormSection>
  )
}

function Review({ user }: { user: DraftUser }) {
  return (
    <SettingsFormSection>
      <div className='rounded-[14px] border border-[var(--border-default)] bg-surface p-6'>
        <h3 className='text-md mb-6 font-semibold text-[var(--gray-13)]'>
          User Summary
        </h3>

        <div className='grid grid-cols-1 gap-x-12 gap-y-4 text-sm md:grid-cols-2'>
          <SummaryItem
            label='Name'
            value={`${user.firstName} ${user.lastName}`.trim() || '—'}
          />
          <SummaryItem label='Email' value={user.email || '—'} />
          <SummaryItem label='Job Title' value={user.jobTitle || '—'} />
          <SummaryItem label='Manager' value={user.manager || '—'} />
          <SummaryItem label='Login' value={user.loginType} />
          <SummaryItem label='Department' value={user.department || '—'} />
          <SummaryItem label='Role' value={user.role || '—'} />
          <SummaryItem label='Location' value={user.location || '—'} />
          <SummaryItem
            label='Groups'
            value={user.groups.length ? user.groups.join(', ') : '—'}
          />
          <SummaryItem
            label='MFA'
            value={`${user.mfaEnabled ? 'Enabled' : 'Disabled'} (${user.mfaMethods.join(', ') || 'No methods'})`}
          />
        </div>
      </div>
    </SettingsFormSection>
  )
}

function StatusBadge({ status }: { status: UserStatus }) {
  const className =
    status === 'active'
      ? 'border-[var(--green-5)] bg-[var(--green-3)] text-[var(--green-11)]'
      : status === 'pending'
        ? 'border-[var(--orange-5)] bg-[var(--orange-2)] text-[var(--orange-11)]'
        : 'border-[var(--gray-4)] bg-[var(--gray-2)] text-[var(--gray-10)]'

  return (
    <span
      className={`inline-flex items-center rounded-[10px] border px-3 py-1 font-semibold ${className}`}
    >
      {status}
    </span>
  )
}

function StepIcon({ step }: { step: StepKey }) {
  if (step === 'login') return <UserRound size={14} />
  if (step === 'business') return <UsersRound size={14} />
  if (step === 'groups') return <UsersRound size={14} />
  if (step === 'authentication') return <ShieldCheck size={14} />
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

function Switch({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <button
      type='button'
      className={[
        'relative h-7 w-12 rounded-full transition',
        checked ? 'bg-[var(--primary-9)]' : 'bg-[var(--gray-3)]',
      ].join(' ')}
      onClick={() => onChange(!checked)}
    >
      <span
        className={[
          'absolute top-1 h-5 w-5 rounded-full bg-[var(--control-thumb)] shadow transition',
          checked ? 'left-6' : 'left-1',
        ].join(' ')}
      />
    </button>
  )
}

function ToggleRow({
  checked,
  label,
  onChange,
}: {
  checked: boolean
  label: string
  onChange: (checked: boolean) => void
}) {
  return (
    <div className='flex items-center gap-4'>
      <Switch checked={checked} onChange={onChange} />
      <span className='text-sm font-medium text-[var(--gray-13)]'>{label}</span>
    </div>
  )
}

function UserSetup({
  activeStep,
  draftUser,
  editingUserId,
  groupOptions,
  isSaving,
  managerOptions,
  onBack,
  onBackToSettings,
  onCancel,
  onChange,
  onNext,
  onSave,
  onStepChange,
}: {
  activeStep: number
  draftUser: DraftUser
  editingUserId: string | number | null
  groupOptions: Array<{ caption: string; name: string }>
  isSaving: boolean
  managerOptions: SettingsOption[]
  onBack: () => void
  onBackToSettings?: () => void
  onCancel: () => void
  onChange: (user: DraftUser) => void
  onNext: () => void
  onSave: () => void
  onStepChange: (step: number) => void
}) {
  const [showErrors, setShowErrors] = useState(false)
  const progress = useMemo(
    () => calculateUserSetupProgress(draftUser),
    [draftUser],
  )

  const handleNext = () => {
    const missingLabels = getMissingRequiredUserLabels(draftUser, activeStep)

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
    const missingLabels = getMissingRequiredUserLabels(draftUser)

    if (missingLabels.length) {
      setShowErrors(true)
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
        const missingLabels = getMissingRequiredUserLabels(draftUser, index)

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

  const activeStepConfig = steps[activeStep]

  return (
    <main className='min-h-screen bg-[var(--surface)] text-[var(--text-primary)]'>
      <SettingsSetupHeader
        moduleTitle='User Management'
        progress={progress}
        stepDescription={activeStepConfig.description}
        stepTitle={activeStepConfig.title}
        setupTitle={editingUserId ? 'Edit User' : 'Create User'}
        onBackToSettings={onBackToSettings}
        onCancelSetup={onCancel}
      />

      <div className='grid min-h-[calc(100vh-96px)] grid-cols-1 lg:grid-cols-[296px_1fr]'>
        <aside className='border-r border-[var(--border-default)] bg-[var(--surface)] px-4 py-9'>
          <div className='space-y-5'>
            {steps.map((step, index) => {
              const isActive = index === activeStep
              const isCompleted = index < activeStep

              return (
                <button
                  className='group flex w-full items-center gap-5 rounded-[14px] px-3 py-2 text-left transition hover:bg-surface-raised'
                  key={step.key}
                  onClick={() => handleStepChange(index)}
                >
                  <div className='relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--gray-3)]'>
                    {index < steps.length - 1 && (
                      <span className='absolute top-8 left-1/2 h-12 w-[2px] -translate-x-1/2 bg-[var(--gray-3)]' />
                    )}

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
                        <StepIcon step={step.key} />
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
          {activeStep === 0 && (
            <LoginDetails
              showErrors={showErrors}
              user={draftUser}
              onChange={onChange}
            />
          )}
          {activeStep === 1 && (
            <BusinessDetails
              managerOptions={managerOptions}
              showErrors={showErrors}
              user={draftUser}
              onChange={onChange}
            />
          )}
          {activeStep === 2 && (
            <GroupAssignment
              groupOptions={groupOptions}
              user={draftUser}
              onChange={onChange}
            />
          )}
          {activeStep === 3 && (
            <Authentication user={draftUser} onChange={onChange} />
          )}
          {activeStep === 4 && <Review user={draftUser} />}

          <div className='mt-8 flex items-center justify-between border-t border-[var(--border-default)] pt-6'>
            <button
              className='inline-flex h-10 items-center rounded-[5px] border border-[var(--border-default)] bg-surface px-5 text-[15px] font-semibold text-[var(--gray-13)] transition hover:bg-[var(--gray-2)] disabled:cursor-not-allowed disabled:opacity-50'
              disabled={activeStep === 0}
              onClick={handleBack}
            >
              Back
            </button>

            <div className='flex items-center gap-3'>
              {activeStep === steps.length - 1 ? (
                <button
                  className='h-10 rounded-[5px] bg-[var(--primary-9)] px-5 text-[15px] font-semibold text-white shadow-[var(--shadow-md)] transition hover:bg-[var(--primary-10)] disabled:cursor-not-allowed disabled:opacity-60'
                  disabled={isSaving}
                  onClick={handleSave}
                >
                  {isSaving ? 'Saving...' : 'Save User'}
                </button>
              ) : (
                <button
                  className='h-10 rounded-[5px] bg-[var(--primary-9)] px-5 text-[15px] font-semibold text-white shadow-[var(--shadow-md)] transition hover:bg-[var(--primary-10)]'
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
