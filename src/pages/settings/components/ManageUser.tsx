import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  Check,
  Download,
  Edit3,
  MoreHorizontal,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  UsersRound,
} from 'lucide-react'
import { type ReactNode, useMemo, useState } from 'react'
import IconButton from '@/components/base/button/IconButton'
import DataTable from '@/components/base/data-table/DataTable'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputText from '@/components/base/inputs/InputText'

type AppUser = {
  accountExpiryDate: string
  businessUnit: string
  created: string
  department: string
  email: string
  employeeId: string
  firstName: string
  forcePasswordReset: boolean
  groups: string[]
  id: number
  jobTitle: string
  lastLogin: string
  lastName: string
  location: string
  loginType: LoginType
  manager: string
  mfaEnabled: boolean
  mfaMethods: string[]
  passwordExpiryDays: number
  role: string
  status: UserStatus
  username: string
}
type LoginType = 'Password' | 'Google SSO' | 'MS Entra ID' | 'LDAP / AD'

type Step = {
  caption: string
  key: StepKey
  title: string
}

type StepKey = 'login' | 'business' | 'groups' | 'authentication' | 'review'

type UserStatus = 'active' | 'inactive' | 'pending'

const steps: Step[] = [
  { caption: 'Step 1', key: 'login', title: 'Login Details' },
  { caption: 'Step 2', key: 'business', title: 'Business Detail' },
  { caption: 'Step 3', key: 'groups', title: 'Group Assignment' },
  { caption: 'Step 4', key: 'authentication', title: 'Authentication' },
  { caption: 'Step 5', key: 'review', title: 'Review' },
]

const initialUsers: AppUser[] = [
  {
    accountExpiryDate: '',
    businessUnit: 'Corporate',
    created: 'Jun 6, 2026',
    department: 'Finance',
    email: 'john.smith@company.com',
    employeeId: 'EMP-001',
    firstName: 'John',
    forcePasswordReset: false,
    groups: ['Finance', 'AP Team'],
    id: 1,
    jobTitle: 'AP Manager',
    lastLogin: 'Jun 6, 2026',
    lastName: 'Smith',
    location: 'New York, NY',
    loginType: 'Password',
    manager: 'Sarah Miller',
    mfaEnabled: true,
    mfaMethods: ['Email OTP'],
    passwordExpiryDays: 90,
    role: 'AP Manager',
    status: 'active',
    username: 'john.smith',
  },
  {
    accountExpiryDate: '',
    businessUnit: 'Technology',
    created: 'Jun 6, 2026',
    department: 'IT',
    email: 'sarah.miller@company.com',
    employeeId: 'EMP-002',
    firstName: 'Sarah',
    forcePasswordReset: false,
    groups: ['Management'],
    id: 2,
    jobTitle: 'System Administrator',
    lastLogin: 'Jun 6, 2026',
    lastName: 'Miller',
    location: 'Toronto, CA',
    loginType: 'MS Entra ID',
    manager: 'John Smith',
    mfaEnabled: true,
    mfaMethods: ['Authenticator App'],
    passwordExpiryDays: 90,
    role: 'System Admin',
    status: 'active',
    username: 'sarah.miller',
  },
  {
    accountExpiryDate: '',
    businessUnit: 'Finance Ops',
    created: 'Jun 6, 2026',
    department: 'Finance',
    email: 'mike.johnson@company.com',
    employeeId: 'EMP-003',
    firstName: 'Mike',
    forcePasswordReset: true,
    groups: ['Finance', 'AP Team'],
    id: 3,
    jobTitle: 'AP Specialist',
    lastLogin: 'Jun 5, 2026',
    lastName: 'Johnson',
    location: 'New York, NY',
    loginType: 'Password',
    manager: 'John Smith',
    mfaEnabled: false,
    mfaMethods: [],
    passwordExpiryDays: 90,
    role: 'AP Officer',
    status: 'active',
    username: 'mike.johnson',
  },
]

const emptyUser: AppUser = {
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
  passwordExpiryDays: 90,
  role: 'Business User',
  status: 'active',
  username: '',
}

const departments = ['Finance', 'IT', 'Compliance', 'Procurement', 'Operations']
const roles = [
  'Business User',
  'AP Officer',
  'AP Manager',
  'Auditor',
  'System Admin',
]
const loginTypes: LoginType[] = [
  'Password',
  'Google SSO',
  'MS Entra ID',
  'LDAP / AD',
]

const groups = [
  { caption: 'Access to finance resources', name: 'Finance' },
  { caption: 'Access to AP team resources', name: 'AP Team' },
  { caption: 'Access to shared services resources', name: 'Shared Services' },
  { caption: 'Access to auditors resources', name: 'Auditors' },
  { caption: 'Access to management resources', name: 'Management' },
]

const mfaMethods = ['Email OTP', 'Mobile OTP', 'Authenticator App']

const userColumnHelper = createColumnHelper<AppUser>()

type FormSectionProps = {
  user: AppUser
  onChange: (user: AppUser) => void
}

type ManageUserProps = {
  onBack?: () => void
}

type SelectOption = {
  description?: string
  disabled?: boolean
  id: string | number
  name: string
  value?: string
}

export default function ManageUser({ onBack }: ManageUserProps) {
  const [users, setUsers] = useState<AppUser[]>(initialUsers)
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('All Roles')
  const [statusFilter, setStatusFilter] = useState('All Status')
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)

  const [isSetupOpen, setIsSetupOpen] = useState(false)
  const [editingUserId, setEditingUserId] = useState<number | null>(null)
  const [activeStep, setActiveStep] = useState(0)
  const [draftUser, setDraftUser] = useState<AppUser>(emptyUser)

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const text =
        `${user.firstName} ${user.lastName} ${user.email}`.toLowerCase()
      const matchesSearch = text.includes(query.toLowerCase())
      const matchesRole = roleFilter === 'All Roles' || user.role === roleFilter
      const matchesStatus =
        statusFilter === 'All Status' ||
        user.status === statusFilter.toLowerCase()

      return matchesSearch && matchesRole && matchesStatus
    })
  }, [query, roleFilter, statusFilter, users])

  const openAddUser = () => {
    setEditingUserId(null)
    setDraftUser({ ...emptyUser, id: Date.now() })
    setActiveStep(0)
    setIsSetupOpen(true)
  }

  const openEditUser = (user: AppUser) => {
    setEditingUserId(user.id)
    setDraftUser({ ...user })
    setActiveStep(0)
    setOpenMenuId(null)
    setIsSetupOpen(true)
  }

  const deleteUser = (userId: number) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this user?',
    )
    if (!confirmed) return

    setUsers((current) => current.filter((user) => user.id !== userId))
    setOpenMenuId(null)
  }

  const saveUser = () => {
    const normalizedUser: AppUser = {
      ...draftUser,
      created: draftUser.created || 'Jun 6, 2026',
      username:
        draftUser.username ||
        draftUser.email.split('@')[0] ||
        `${draftUser.firstName}.${draftUser.lastName}`.toLowerCase(),
    }

    if (editingUserId) {
      setUsers((current) =>
        current.map((user) =>
          user.id === editingUserId ? normalizedUser : user,
        ),
      )
    } else {
      setUsers((current) => [normalizedUser, ...current])
    }

    setIsSetupOpen(false)
  }

  const userColumns = useMemo(
    () => [
      userColumnHelper.display({
        header: 'User',
        id: 'user',
        cell: ({ row }) => {
          const user = row.original

          return (
            <div className='flex items-center gap-4'>
              <div className='flex h-11 w-11 items-center justify-center rounded-full bg-[var(--primary-3)] text-[16px] font-semibold text-[var(--primary-9)]'>
                {getInitials(user.firstName, user.lastName)}
              </div>

              <div>
                <div className='font-semibold text-[var(--gray-13)]'>
                  {user.firstName} {user.lastName}
                </div>
                <div className='text-[var(--gray-10)]'>{user.email}</div>
              </div>
            </div>
          )
        },
      }),

      userColumnHelper.accessor('department', {
        header: 'Department',
        id: 'department',
        cell: ({ getValue }) => <span>{String(getValue() || '—')}</span>,
      }),

      userColumnHelper.accessor('role', {
        header: 'Role',
        id: 'role',
        cell: ({ getValue }) => (
          <span className='rounded-[10px] border border-[var(--border-default)] bg-white px-3 py-1 font-medium text-[var(--gray-13)]'>
            {String(getValue())}
          </span>
        ),
      }),

      userColumnHelper.accessor('status', {
        header: 'Status',
        id: 'status',
        cell: ({ getValue }) => <StatusBadge status={getValue()} />,
      }),

      userColumnHelper.accessor('loginType', {
        header: 'Login Type',
        id: 'loginType',
        cell: ({ getValue }) => <span>{String(getValue() || '—')}</span>,
      }),

      userColumnHelper.accessor('lastLogin', {
        header: 'Last Login',
        id: 'lastLogin',
        cell: ({ getValue }) => <span>{String(getValue() || '—')}</span>,
      }),

      userColumnHelper.accessor('created', {
        header: 'Created',
        id: 'created',
        cell: ({ getValue }) => <span>{String(getValue() || '—')}</span>,
      }),

      userColumnHelper.display({
        header: 'Actions',
        id: 'actions',
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
                <div className='absolute top-10 right-0 z-50 w-36 overflow-hidden rounded-[10px] border border-[var(--border-default)] bg-white py-1 text-left shadow-[var(--shadow-lg)]'>
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
    columns: userColumns,
    data: filteredUsers,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => String(row.id),
  })

  if (isSetupOpen) {
    return (
      <UserSetup
        activeStep={activeStep}
        draftUser={draftUser}
        editingUserId={editingUserId}
        onBack={() => setActiveStep((step) => Math.max(step - 1, 0))}
        onCancel={() => setIsSetupOpen(false)}
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
                User Management
              </h1>

              <p className='text-13/5 text-gray-11'>
                Manage all users who access the AP Agent and DMS platform.
              </p>
            </div>
          </div>

          <div className='flex items-center gap-3'>
            <button className='inline-flex h-7 items-center gap-3 rounded-[5px] border border-[var(--border-default)] bg-white px-4 text-[12px] font-medium text-[var(--gray-13)] shadow-[var(--shadow-sm)] transition hover:bg-[var(--gray-2)]'>
              <Download size={14} />
              Export
            </button>
            <button
              className='inline-flex h-7 items-center gap-3 rounded-[5px] bg-[var(--primary-9)] px-5 text-[12px] font-semibold text-white shadow-[var(--shadow-md)] transition hover:bg-[var(--primary-10)]'
              onClick={openAddUser}
            >
              <Plus size={14} />
              Add User
            </button>
          </div>
        </div>

        <div className='mb-8 grid grid-cols-1 gap-4 px-6 py-4 lg:grid-cols-[1fr_220px_180px]'>
          <div className='flex h-[35px] items-center gap-3 rounded-[5px] border border-[var(--border-default)] bg-white px-2 shadow-[var(--shadow-sm)]'>
            <Search className='text-[var(--gray-10)]' size={15} />
            <input
              className='h-full w-full bg-transparent text-sm text-[var(--gray-13)] outline-none placeholder:text-[var(--gray-10)]'
              placeholder='Search users by name or email...'
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          <SelectField
            options={['All Roles', ...roles]}
            value={roleFilter}
            onChange={setRoleFilter}
          />
          <SelectField
            options={['All Status', 'Active', 'Inactive', 'Pending']}
            value={statusFilter}
            onChange={setStatusFilter}
          />
        </div>

        <div className='px-6 py-4'>
          <DataTable
            component={<div />}
            isLoading={false}
            isReLoading={false}
            pageSize={Math.max(5, filteredUsers.length || 5)}
            table={userTable}
            tableBodyMaxHeight='calc(100vh - 320px)'
            hideGrouping
            stickyHeader
            onReload={() => undefined}
          />
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
    <FormCard
      description='Govern multi-factor verification for secure user access.'
      title='Authentication'
    >
      <div className='mb-7 rounded-[14px] border border-[var(--border-default)] bg-white p-5'>
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
                'flex h-[66px] w-full items-center gap-4 rounded-[10px] border bg-white px-5 text-left transition disabled:cursor-not-allowed disabled:opacity-50',
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
                    : 'border-[var(--primary-8)] bg-white',
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
    </FormCard>
  )
}

function BusinessDetails({ user, onChange }: FormSectionProps) {
  return (
    <FormCard
      description='Align this user with the business hierarchy and operating model.'
      title='Business Detail'
    >
      <div className='grid grid-cols-1 gap-5 md:grid-cols-2'>
        <EzTextField
          label='Job Title'
          placeholder='e.g. AP Specialist'
          value={user.jobTitle}
          onChange={(value) => onChange({ ...user, jobTitle: value })}
        />

        <EzTextField
          label='Employee ID'
          placeholder='EMP-001'
          value={user.employeeId}
          onChange={(value) => onChange({ ...user, employeeId: value })}
        />

        <EzSelectField
          label='Department'
          options={departments}
          placeholder='Select department'
          value={user.department}
          onChange={(value) => onChange({ ...user, department: value })}
        />

        <EzTextField
          label='Business Unit'
          placeholder='e.g. Corporate'
          value={user.businessUnit}
          onChange={(value) => onChange({ ...user, businessUnit: value })}
        />

        <EzTextField
          label='Manager'
          placeholder='Manager name or email'
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

      <EzSelectField
        label='Role'
        options={roles}
        value={user.role}
        onChange={(value) => onChange({ ...user, role: value })}
      />
    </FormCard>
  )
}
function EzSelectField({
  label,
  options,
  placeholder = 'Select',
  value,
  onChange,
}: {
  label: string
  options: string[]
  placeholder?: string
  value: string
  onChange: (value: string) => void
}) {
  const selectOptions = toSelectOptions(options)

  const selectedOption =
    selectOptions.find(
      (option) => option.value === value || option.name === value,
    ) || null

  return (
    <InputSelect
      label={label}
      options={selectOptions}
      placeholder={placeholder}
      value={selectedOption}
      width='100%'
      onChange={(selected: SelectOption | null) => {
        if (!selected) return
        onChange(selected.value || selected.name)
      }}
    />
  )
}
function EzTextField({
  label,
  placeholder,
  required,
  type = 'text',
  value,
  onChange,
}: {
  label: string
  placeholder?: string
  required?: boolean
  type?: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <InputText
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
    <div>
      <div className='mb-8'>
        <h2 className='text-sm leading-8 font-semibold text-[var(--gray-13)]'>
          {title}
        </h2>
        <p className='mt-1 max-w-[760px] text-xs leading-7 text-[var(--gray-11)]'>
          {description}
        </p>
      </div>
      <div className='space-y-6'>{children}</div>
    </div>
  )
}

function getInitials(firstName: string, lastName: string) {
  return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || 'U'
}

function GroupAssignment({ user, onChange }: FormSectionProps) {
  const toggleGroup = (name: string) => {
    const exists = user.groups.includes(name)
    const nextGroups = exists
      ? user.groups.filter((item) => item !== name)
      : [...user.groups, name]
    onChange({ ...user, groups: nextGroups })
  }

  return (
    <FormCard
      description='Assign this user to one or more groups. Groups determine shared folder and workflow access.'
      title='Group Assignment'
    >
      <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
        {groups.map((group) => {
          const selected = user.groups.includes(group.name)

          return (
            <button
              key={group.name}
              className={[
                'flex min-h-[60px] items-center gap-4 rounded-[10px] border bg-white px-5 text-left transition',
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
                    : 'border-[var(--primary-8)] bg-white',
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
    </FormCard>
  )
}

function LoginDetails({ user, onChange }: FormSectionProps) {
  return (
    <FormCard
      description='Capture primary identity and sign-in configuration.'
      title='Login Details'
    >
      <div className='grid grid-cols-1 gap-5 md:grid-cols-2'>
        <EzTextField
          label='First Name'
          placeholder='Enter first name'
          value={user.firstName}
          required
          onChange={(value) => onChange({ ...user, firstName: value })}
        />

        <EzTextField
          label='Last Name'
          placeholder='Enter last name'
          value={user.lastName}
          required
          onChange={(value) => onChange({ ...user, lastName: value })}
        />
      </div>

      <EzTextField
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

      <EzSelectField
        label='Login Type'
        options={loginTypes}
        value={user.loginType}
        onChange={(value) =>
          onChange({ ...user, loginType: value as LoginType })
        }
      />

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

        <EzTextField
          label='Account Expiry Date'
          type='date'
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
    </FormCard>
  )
}

function Review({ user }: { user: AppUser }) {
  return (
    <FormCard
      description='Validate the user profile before provisioning access.'
      title='Review'
    >
      <div className='rounded-[14px] border border-[var(--border-default)] bg-white p-6'>
        <h3 className='text-md mb-6 font-semibold text-[var(--gray-13)]'>
          User Summary
        </h3>

        <div className='grid grid-cols-1 gap-x-12 gap-y-4 text-sm md:grid-cols-2'>
          <SummaryItem
            label='Name'
            value={`${user.firstName} ${user.lastName}`.trim() || '—'}
          />
          <SummaryItem label='Email' value={user.email || '—'} />
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
    </FormCard>
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
  const selectOptions: SelectOption[] = options.map((option) => ({
    id: option,
    name: option,
    value: option,
  }))

  const selectedOption =
    selectOptions.find(
      (option) => option.value === value || option.name === value,
    ) || null

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
          'absolute top-1 h-5 w-5 rounded-full bg-white shadow transition',
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

function toSelectOptions(options: string[]): SelectOption[] {
  return options.map((option) => ({
    id: option,
    name: option,
    value: option,
  }))
}

function UserSetup({
  activeStep,
  draftUser,
  editingUserId,
  onBack,
  onCancel,
  onChange,
  onNext,
  onSave,
  onStepChange,
}: {
  activeStep: number
  draftUser: AppUser
  editingUserId: number | null
  onBack: () => void
  onCancel: () => void
  onChange: (user: AppUser) => void
  onNext: () => void
  onSave: () => void
  onStepChange: (step: number) => void
}) {
  const progress = Math.round(((activeStep + 1) / steps.length) * 100)

  return (
    <main className='min-h-screen bg-[var(--surface-muted)] text-[var(--text-primary)]'>
      <header className='border-b border-[var(--border-default)] bg-white px-6 py-4'>
        <div className='flex items-start justify-between gap-5'>
          <div className='flex items-start gap-3'>
            <IconButton
              ariaLabel='Back'
              color='gray'
              icon='lucide:arrow-left'
              size='sm'
              variant='ghost'
              onClick={onCancel}
            />

            <div>
              <h1 className='text-[18px] leading-6 font-semibold text-[var(--gray-13)]'>
                {editingUserId ? 'Edit User' : 'Add User'}
              </h1>

              <p className='mt-1 text-[14px] leading-5 text-[var(--gray-11)]'>
                Configure login, business details, group access, and
                authentication.
              </p>
            </div>
          </div>

          <div className='w-44'>
            <div className='mb-2 text-right text-[12px] font-semibold text-[var(--orange-10)]'>
              {progress}% Complete
            </div>
            <div className='h-1.5 overflow-hidden rounded-full bg-[var(--gray-3)]'>
              <div
                className='h-full rounded-full bg-[var(--orange-10)] transition-all'
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      <div className='grid min-h-[calc(100vh-96px)] grid-cols-1 lg:grid-cols-[296px_1fr]'>
        <aside className='border-r border-[var(--border-default)] bg-[var(--surface-muted)] px-4 py-9'>
          <div className='space-y-5'>
            {steps.map((step, index) => {
              const isActive = index === activeStep
              const isCompleted = index < activeStep

              return (
                <button
                  className='group flex w-full items-center gap-5 rounded-[14px] px-3 py-2 text-left transition hover:bg-white'
                  key={step.key}
                  onClick={() => onStepChange(index)}
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
                    {/* <div className="text-[15px] text-[var(--gray-11)]">{step.caption}</div> */}
                    <div className='text-md mt-1 font-semibold text-[var(--indigo-12)]'>
                      {step.title}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </aside>

        <section className='ez-scrollbar h-[calc(100vh-155px)] min-h-0 overflow-y-auto px-6 py-10 lg:px-20'>
          <div className='mx-auto max-w-[860px]'>
            {activeStep === 0 && (
              <LoginDetails user={draftUser} onChange={onChange} />
            )}
            {activeStep === 1 && (
              <BusinessDetails user={draftUser} onChange={onChange} />
            )}
            {activeStep === 2 && (
              <GroupAssignment user={draftUser} onChange={onChange} />
            )}
            {activeStep === 3 && (
              <Authentication user={draftUser} onChange={onChange} />
            )}
            {activeStep === 4 && <Review user={draftUser} />}

            <div className='mt-8 flex items-center justify-between border-t border-[var(--border-default)] pt-6'>
              {/* <button
                onClick={onCancel}
                className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-[var(--border-default)] bg-white px-4 text-[15px] font-medium text-[var(--gray-13)] transition hover:bg-[var(--gray-2)]"
              >
                <X size={17} />
                Cancel
              </button> */}
              <button
                className='inline-flex h-10 items-center rounded-[5px] border border-[var(--border-default)] bg-white px-5 text-[15px] font-semibold text-[var(--gray-13)] transition hover:bg-[var(--gray-2)] disabled:cursor-not-allowed disabled:opacity-50'
                disabled={activeStep === 0}
                onClick={onBack}
              >
                Back
              </button>

              <div className='flex items-center gap-3'>
                {activeStep === steps.length - 1 ? (
                  <button
                    className='h-10 rounded-[5px] bg-[var(--primary-9)] px-5 text-[15px] font-semibold text-white shadow-[var(--shadow-md)] transition hover:bg-[var(--primary-10)]'
                    onClick={onSave}
                  >
                    Save User
                  </button>
                ) : (
                  <button
                    className='h-10 rounded-[5px] bg-[var(--primary-9)] px-5 text-[15px] font-semibold text-white shadow-[var(--shadow-md)] transition hover:bg-[var(--primary-10)]'
                    onClick={onNext}
                  >
                    Next
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
