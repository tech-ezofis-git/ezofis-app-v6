import {
  createColumnHelper,
  useReactTable,
} from '@tanstack/react-table'
import {
  Check,
  Edit3,
  MoreHorizontal,
  ShieldCheck,
  Trash2,
  UserRound,
  UsersRound,
} from 'lucide-react'
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import IconButton from '@/components/base/button/IconButton'
import InputPassword from '@/components/base/inputs/password/InputPassword'
import showToast from '@/components/base/toast/showToast'
import DataTable from '@/components/base/data-table/DataTable'
import InputText from '@/components/base/inputs/InputText'
import { createUser, getUsers, updateUser } from '@/api/v6/user'
import { dummySettingsUsers, getDummyGroupOptions } from '../data/settingsDummyData'
import {
  settingsHeaderMeta,
  settingsTableCoreOptions,
  useSettingsTableSearch,
} from '../helpers/settingsDataTable'
import { calculateUserSetupProgress } from '../helpers/settingsSetupProgress'
import {
  mapApiUserToSettingsUser,
  mapApiUsersToSettingsUsers,
  mapUsersToManagerOptions,
  type SettingsOption,
  type SettingsUser,
} from '../helpers/userGroupMappers'
import SettingsDateField from './SettingsDateField'
import SettingsSelectField from './SettingsSelectField'
import {
  mapDraftUserToCreatePayload,
  mapDraftUserToUpdatePayload,
  type DraftSettingsUser,
} from '../helpers/mapCreateUserPayload'
import {
  getFieldRequiredError,
  getMissingRequiredLabels,
  getRequiredFieldErrorMessage,
} from '../helpers/requiredFieldErrors'
import SettingsFormSection from './SettingsFormSection'
import SettingsSetupContent from './SettingsSetupContent'
import SettingsSetupHeader from './SettingsSetupHeader'
import SettingsPageHeader, {
  SettingsHeaderAddButton,
} from './SettingsPageHeader'
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

const departments = [
  'Administration',
  'Finance',
  'IT',
  'Legal',
  'Procurement',
]
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
  const [openMenuId, setOpenMenuId] = useState<string | number | null>(null)

  const [isSetupOpen, setIsSetupOpen] = useState(false)
  const [editingUserId, setEditingUserId] = useState<string | number | null>(
    null,
  )
  const [activeStep, setActiveStep] = useState(0)
  const [draftUser, setDraftUser] = useState<DraftUser>(emptyUser)
  const [originalUser, setOriginalUser] = useState<DraftUser | null>(null)
  const [isSaving, setIsSaving] = useState(false)

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
        response.data.length
          ? mapApiUsersToSettingsUsers(response.data)
          : [],
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
    setOpenMenuId(null)
    setIsSetupOpen(true)
  }

  const deleteUser = (userId: string | number) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this user?',
    )
    if (!confirmed) return

    setUsers((current) => current.filter((user) => user.id !== userId))
    setOpenMenuId(null)
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
      const nextStep =
        missingLabels.every((label) => label === 'Role') ? 1 : 0
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
        meta: settingsHeaderMeta.center,
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
          minSize: 200,
          size: 260,
          cell: ({ row }) => {
            const user = row.original

            return (
              <div className='min-w-0'>
                <div className='truncate font-semibold text-[var(--gray-13)]'>
                  {user.firstName} {user.lastName}
                </div>
                <div className='truncate text-[var(--gray-10)]'>{user.email}</div>
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
        minSize: 120,
        size: 140,
        cell: ({ getValue }) => <span>{String(getValue() || '—')}</span>,
      }),

      userColumnHelper.accessor('role', {
        enableSorting: false,
        header: 'Role',
        id: 'role',
        meta: { ...settingsHeaderMeta.start, label: 'Role' },
        minSize: 130,
        size: 150,
        cell: ({ getValue }) => (
          <span className='rounded-[10px] border border-[var(--border-default)] bg-surface px-3 py-1 font-medium text-[var(--gray-13)]'>
            {String(getValue())}
          </span>
        ),
      }),

      userColumnHelper.accessor('status', {
        enableSorting: false,
        header: 'Status',
        id: 'status',
        meta: { ...settingsHeaderMeta.start, label: 'Status' },
        minSize: 100,
        size: 110,
        cell: ({ getValue }) => <StatusBadge status={getValue()} />,
      }),

      userColumnHelper.accessor('loginType', {
        enableSorting: false,
        header: 'Login Type',
        id: 'loginType',
        meta: settingsHeaderMeta.start,
        minSize: 120,
        size: 140,
        cell: ({ getValue }) => <span>{String(getValue() || '—')}</span>,
      }),

      userColumnHelper.accessor('lastLogin', {
        enableSorting: false,
        header: 'Last Login',
        id: 'lastLogin',
        meta: settingsHeaderMeta.start,
        minSize: 110,
        size: 120,
        cell: ({ getValue }) => <span>{String(getValue() || '—')}</span>,
      }),

      userColumnHelper.accessor('created', {
        enableSorting: false,
        header: 'Created',
        id: 'created',
        meta: settingsHeaderMeta.start,
        minSize: 110,
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
            <div className='relative flex justify-end'>
              <button
                className='rounded-lg p-2 text-[var(--gray-13)] transition hover:bg-[var(--gray-2)]'
                type='button'
                onClick={(event) => {
                  event.stopPropagation()
                  setOpenMenuId(openMenuId === user.id ? null : user.id)
                }}
              >
                <MoreHorizontal size={20} />
              </button>

              {openMenuId === user.id ? (
                <div className='absolute top-10 right-0 z-50 w-36 overflow-hidden rounded-[10px] border border-[var(--border-default)] bg-surface py-1 text-left shadow-[var(--shadow-lg)]'>
                  <button
                    className='flex w-full items-center gap-2 px-3 py-2 text-[var(--gray-13)] hover:bg-[var(--gray-2)]'
                    type='button'
                    onClick={() => openEditUser(user)}
                  >
                    <Edit3 size={15} />
                    Edit
                  </button>

                  <button
                    className='flex w-full items-center gap-2 px-3 py-2 text-[var(--red-11)] hover:bg-[var(--red-2)]'
                    type='button'
                    onClick={() => deleteUser(user.id)}
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
    [openMenuId, setOpenMenuId, openEditUser, deleteUser],
  )
  const userTable = useReactTable({
    ...settingsTableCoreOptions,
    ...tableSearchOptions,
    columns: userColumns,
    data: users,
    getRowId: (row) => String(row.id),
  })

  const { onRowSizeChange, rowSize, toolbar } = useSettingsTableToolbar({
    isReLoading: isLoadingUsers,
    table: userTable,
    onReload: () => {
      void loadUsers()
    },
  })

  if (isSetupOpen) {
    return (
      <UserSetup
        activeStep={activeStep}
        draftUser={draftUser}
        editingUserId={editingUserId}
        groupOptions={groupOptions}
        managerOptions={managerOptions}
        isSaving={isSaving}
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
    <main className='bg-[var(--surface)]'>
      <section className=''>
        <SettingsPageHeader
          actions={
            <SettingsHeaderAddButton
              tooltip='Add'
              onClick={openAddUser}
            />
          }
          title='User Management'
          toolbar={toolbar}
          onBack={onBack}
        />

        <div className='px-6 md:px-8'>
          <div className='py-4'>
            <DataTable
              emptyDescription='Add a user to grant access to the platform and assign folder permissions.'
              emptyIcon='lucide:users'
              emptyTitle='No users yet'
              hideActionBar
              isLoading={isLoadingUsers}
              isReLoading={isLoadingUsers}
              pageSize={Math.max(5, users.length || 5)}
              rowSize={rowSize}
              table={userTable}
              tableBodyMaxHeight='calc(100vh - 320px)'
              hideGrouping
              stickyHeader
              onReload={() => {
                void loadUsers()
              }}
              onRowSizeChange={onRowSizeChange}
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
          clearable
          label='Manager'
          options={managerOptions}
          placeholder='Select'
          value={user.manager}
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
        required
        value={user.role}
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
      showPlaceholder
      value={value}
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
          error={getFieldRequiredError(
            'First Name',
            Boolean(showErrors),
            user.firstName,
          )}
          label='First Name'
          placeholder='Enter first name'
          value={user.firstName}
          required
          onChange={(value) => onChange({ ...user, firstName: value })}
        />

        <EzTextField
          error={getFieldRequiredError(
            'Last Name',
            Boolean(showErrors),
            user.lastName,
          )}
          label='Last Name'
          placeholder='Enter last name'
          value={user.lastName}
          required
          onChange={(value) => onChange({ ...user, lastName: value })}
        />
      </div>

      <EzTextField
        error={getFieldRequiredError(
          'Email Address',
          Boolean(showErrors),
          user.email,
        )}
        label='Email Address'
        placeholder='user@company.com'
        type='email'
        value={user.email}
        required
        onChange={(value) => onChange({ ...user, email: value })}
      />

      <EzTextField
        label='Username'
        placeholder='Enter username'
        value={user.username}
        onChange={(value) => onChange({ ...user, username: value })}
      />

      <SettingsSelectField
        error={getFieldRequiredError(
          'Login Type',
          Boolean(showErrors),
          user.loginType,
        )}
        label='Login Type'
        options={loginTypes}
        required
        value={user.loginType}
        onChange={(value) =>
          onChange({ ...user, loginType: value as LoginType })
        }
      />

      {user.loginType === 'Password' ? (
        <EzPasswordField
          error={getFieldRequiredError(
            'Password',
            Boolean(showErrors),
            user.password,
          )}
          label='Password'
          value={user.password}
          required
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
      className={`rounded-[10px] border px-3 py-1 font-semibold ${className}`}
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
        setupTitle={editingUserId ? 'Edit User' : 'Create User'}
        stepDescription={activeStepConfig.description}
        stepTitle={activeStepConfig.title}
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
