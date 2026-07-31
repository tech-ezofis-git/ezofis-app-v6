import { createColumnHelper, useReactTable } from '@tanstack/react-table'
import {
  Check,
  KeyRound,
  Mail,
  MoreHorizontal,
  Server,
  ShieldCheck,
  Smartphone,
  UserRound,
  UsersRound,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  createUser,
  deleteUser as deleteUserApi,
  getGroups,
  getRoles,
  getUsers,
  updateUser,
} from '@/api/v6/user'
import TableExport from '@/components/base/data-table/actions/TableExport'
import TableSearch from '@/components/base/data-table/actions/TableSearch'
import DataTable from '@/components/base/data-table/DataTable'
import InputSelectMultiple from '@/components/base/inputs/InputSelectMultiple'
import InputText from '@/components/base/inputs/InputText'
import InputPassword from '@/components/base/inputs/password/InputPassword'
import Menu from '@/components/base/menu/Menu'
import MenuItem from '@/components/base/menu/MenuItem'
import Pagination from '@/components/base/pagination/Pagination'
import showToast from '@/components/base/toast/showToast'
import ConfirmDialog from '@/components/base/ConfirmDialog'
import Icon from '@/components/base/icon/Icon'
import PasswordRequirements, {
  requirementsConfig,
} from '@/layouts/auth/components/PasswordRequirements'
import SettingsWizardLayout from './SettingsWizardLayout'
import CustomFilter from '@/components/common/CustomFilter'
import cn from '@/utils/cn'
import dayjs from 'dayjs'
import {
  matchesCategoryFilterValue,
} from '@/utils/filterUtils'
import {
  dummySettingsUsers,
} from '../data/settingsDummyData'
import {
  countryDialCodeOptions,
  getCountrySelectValue,
  getDialCodeFromCountryValue,
} from '../helpers/countryDialCodes'
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
import {
  applyGroupMembershipsToUsers,
  mapApiGroupsToSettingsGroups,
  mapApiUsersToSettingsUsers,
  mapApiUserToSettingsUser,
  mapGroupsToOptions,
  mapRolesToOptions,
  mapUsersToManagerOptions,
  type SettingsGroup,
  type SettingsOption,
  type SettingsUser,
} from '../helpers/userGroupMappers'
import SettingsDateField from './SettingsDateField'
import SettingsFormSection from './SettingsFormSection'
import SettingsPageHeader from './SettingsPageHeader'
import SettingsSelectField from './SettingsSelectField'
import SettingsSelectedChips from './SettingsSelectedChips'
import useSettingsTableToolbar from './useSettingsTableToolbar'
import { formatDatetime } from '@/utils/dayjs'

type AppUser = SettingsUser
type DraftUser = DraftSettingsUser
type LoginType = 'Password' | 'GoogleSSO' | 'MS Entra ID' | 'LDAP/AD'

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
    description: 'Account credentials & identity',
    key: 'login',
    title: 'Login Details',
  },
  {
    caption: 'Step 2',
    description: 'Department & business hierarchy',
    key: 'business',
    title: 'Business Detail',
  },
  {
    caption: 'Step 3',
    description: 'Assign user access groups',
    key: 'groups',
    title: 'Group Assignment',
  },
  {
    caption: 'Step 4',
    description: 'Security & verification',
    key: 'authentication',
    title: 'Authentication',
  },
  {
    caption: 'Step 5',
    description: 'Review & save profile',
    key: 'review',
    title: 'Review',
  },
]

const getExpiryStartDate = () => dayjs().add(1, 'day').startOf('day')

const syncExpiryFromDays = (days: number) => {
  const passwordExpiryDays = Math.max(0, Math.floor(Number(days) || 0))

  return {
    accountExpiryDate: getExpiryStartDate()
      .add(passwordExpiryDays, 'day')
      .format('YYYY-MM-DD'),
    passwordExpiryDays,
  }
}

const syncExpiryFromDate = (date: string) => {
  const trimmed = String(date || '').trim()
  if (!trimmed) {
    return { accountExpiryDate: '', passwordExpiryDays: 0 }
  }

  const start = getExpiryStartDate()
  let expiry = dayjs(trimmed).startOf('day')
  if (!expiry.isValid()) {
    return { accountExpiryDate: trimmed, passwordExpiryDays: 0 }
  }

  if (expiry.isBefore(start)) {
    expiry = start
  }

  return {
    accountExpiryDate: expiry.format('YYYY-MM-DD'),
    passwordExpiryDays: Math.max(0, expiry.diff(start, 'day')),
  }
}

const emptyUser: DraftUser = {
  accountExpiryDate: syncExpiryFromDays(90).accountExpiryDate,
  businessUnit: '',
  countryCode: '',
  created: 'Jun 6, 2026',
  createdBy: '',
  department: '',
  email: '',
  employeeId: '',
  firstName: '',
  forcePasswordReset: false,
  groups: [],
  id: 0,
  jobTitle: '',
  lastLogin: '',
  lastName: '',
  location: '',
  loginType: 'Password',
  manager: '',
  mfaEnabled: true,
  mfaMethods: ['Email OTP'],
  password: '',
  passwordExpiryDays: 90,
  phoneNumber: '',
  role: '',
  status: 'active',
  username: '',
}

const departments = ['Administration', 'Finance', 'IT', 'Legal', 'Procurement']
const defaultJobTitles = ['Executive', 'Manager', 'Project Lead']
const loginTypes: LoginType[] = [
  'Password',
  'GoogleSSO',
  'MS Entra ID',
  'LDAP/AD',
]

const mfaMethodOptions = [
  {
    icon: Mail,
    iconClassName: 'text-[var(--blue-9)]',
    title: 'Email OTP',
    value: 'Email OTP',
  },
  {
    icon: Smartphone,
    iconClassName: 'text-[var(--green-9)]',
    title: 'Mobile OTP',
    value: 'Mobile OTP',
  },
  {
    icon: ShieldCheck,
    iconClassName: 'text-[var(--orange-9)]',
    title: 'Authenticator App',
    value: 'Authenticator App',
  },
] as const

type LoginOption = {
  description: string
  icon: () => React.ReactNode
  title: string
  value: LoginType
}

function LoginTypeIcon({
  type,
  className,
}: {
  type: string
  className?: string
}) {
  const iconClass = cn('size-4 shrink-0', className)
  const normalized = String(type || '').trim().toLowerCase()

  switch (normalized) {
    case 'googlesso':
    case 'google':
    case 'google sso':
      return <Icon className={iconClass} name='logos:google-icon' />
    case 'ms entra id':
    case 'microsoft':
    case 'entra':
    case 'azuread':
      return <Icon className={iconClass} name='logos:microsoft-icon' />
    case 'ldap/ad':
    case 'ldap':
    case 'active directory':
    case 'activedirectory':
      return <Server className={cn(iconClass, 'text-[var(--blue-9)]')} />
    case 'password':
    case 'ezofis':
    default:
      return <KeyRound className={cn(iconClass, 'text-[var(--orange-9)]')} />
  }
}

function formatLoginTypeLabel(type: string) {
  const normalized = String(type || '').trim().toLowerCase()
  if (normalized === 'ezofis' || normalized === 'password') return 'Password'
  if (
    normalized === 'googlesso' ||
    normalized === 'google' ||
    normalized === 'google sso'
  ) {
    return 'Google'
  }
  if (
    normalized === 'ms entra id' ||
    normalized === 'microsoft' ||
    normalized === 'entra' ||
    normalized === 'azuread'
  ) {
    return 'Microsoft'
  }
  if (
    normalized === 'ldap/ad' ||
    normalized === 'ldap' ||
    normalized === 'activedirectory' ||
    normalized === 'active directory'
  ) {
    return 'Active Directory'
  }
  if (!type) return '—'
  return type
}

const loginOptions: LoginOption[] = [
  {
    description: 'Email and password',
    icon: () => <LoginTypeIcon type='Password' />,
    title: 'Password',
    value: 'Password',
  },
  {
    description: 'Sign in with Google',
    icon: () => <LoginTypeIcon type='GoogleSSO' />,
    title: 'Google',
    value: 'GoogleSSO',
  },
  {
    description: 'Sign in with Microsoft',
    icon: () => <LoginTypeIcon type='MS Entra ID' />,
    title: 'Microsoft',
    value: 'MS Entra ID',
  },
  {
    description: 'Sign in with Active Directory',
    icon: () => <LoginTypeIcon type='LDAP/AD' />,
    title: 'Active Directory',
    value: 'LDAP/AD',
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
  const [groupOptions, setGroupOptions] = useState<SettingsOption[]>([])
  const [settingsGroups, setSettingsGroups] = useState<SettingsGroup[]>([])
  const [isLoadingGroups, setIsLoadingGroups] = useState(true)
  const settingsGroupsRef = useRef<SettingsGroup[]>([])
  settingsGroupsRef.current = settingsGroups
  const [apiRoleOptions, setApiRoleOptions] = useState<SettingsOption[]>([])
  const [isLoadingRoles, setIsLoadingRoles] = useState(true)

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
  const [deletingUserId, setDeletingUserId] = useState<string | number | null>(
    null,
  )
  const [isDeletingUser, setIsDeletingUser] = useState(false)

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
        } else if (key === 'email') {
          if (
            !matchesCategoryFilterValue(user.email, value, 'contains') &&
            !matchesCategoryFilterValue(user.email, value)
          ) {
            matches = false
          }
        } else if (key === 'loginType') {
          const loginLabel = formatLoginTypeLabel(String(user.loginType || ''))
          if (
            !matchesCategoryFilterValue(loginLabel, value) &&
            !matchesCategoryFilterValue(user.loginType, value)
          ) {
            matches = false
          }
        } else if (
          key === 'role' ||
          key === 'department' ||
          key === 'status' ||
          key === 'businessUnit' ||
          key === 'location' ||
          key === 'jobTitle' ||
          key === 'manager'
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
  const loadUsersRequestIdRef = useRef(0)
  const loadGroupsRequestIdRef = useRef(0)
  const loadRolesRequestIdRef = useRef(0)

  const loadUsers = useCallback(async () => {
    const requestId = ++loadUsersRequestIdRef.current
    setIsLoadingUsers(true)

    try {
      const response = await getUsers()

      // Superseded by a newer identical request (axios cancels the older one)
      if (response.canceled || requestId !== loadUsersRequestIdRef.current) {
        return
      }

      if (response.error) {
        showToast({ message: response.error, variant: 'error' })
        setUsers(dummySettingsUsers)
        return
      }

      setUsers(
        applyGroupMembershipsToUsers(
          response.data.length
            ? mapApiUsersToSettingsUsers(response.data)
            : [],
          settingsGroupsRef.current,
        ),
      )
    } finally {
      if (requestId === loadUsersRequestIdRef.current) {
        setIsLoadingUsers(false)
      }
    }
  }, [])

  const loadGroups = useCallback(async () => {
    const requestId = ++loadGroupsRequestIdRef.current
    setIsLoadingGroups(true)

    try {
      const response = await getGroups()

      if (response.canceled || requestId !== loadGroupsRequestIdRef.current) {
        return
      }

      if (response.error) {
        showToast({ message: response.error, variant: 'error' })
        setGroupOptions([])
        setSettingsGroups([])
        return
      }

      const mappedGroups = mapApiGroupsToSettingsGroups(response.data)
      setSettingsGroups(mappedGroups)
      setGroupOptions(mapGroupsToOptions(response.data))
    } finally {
      if (requestId === loadGroupsRequestIdRef.current) {
        setIsLoadingGroups(false)
      }
    }
  }, [])

  const loadRoles = useCallback(async () => {
    const requestId = ++loadRolesRequestIdRef.current
    setIsLoadingRoles(true)

    try {
      const response = await getRoles()

      if (response.canceled || requestId !== loadRolesRequestIdRef.current) {
        return
      }

      if (response.error) {
        showToast({ message: response.error, variant: 'error' })
        setApiRoleOptions([])
        return
      }

      setApiRoleOptions(mapRolesToOptions(response.data))
    } finally {
      if (requestId === loadRolesRequestIdRef.current) {
        setIsLoadingRoles(false)
      }
    }
  }, [])

  useEffect(() => {
    void loadUsers()
  }, [loadUsers])

  useEffect(() => {
    void loadGroups()
  }, [loadGroups])

  useEffect(() => {
    void loadRoles()
  }, [loadRoles])

  useEffect(() => {
    if (!settingsGroups.length) return

    setUsers((current) => applyGroupMembershipsToUsers(current, settingsGroups))
  }, [settingsGroups])

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
    setDraftUser({
      ...emptyUser,
      id: Date.now(),
    })
    setActiveStep(0)
    setIsSetupOpen(true)
  }

  const openEditUser = (user: AppUser) => {
    const clearPlaceholder = (value: string) => {
      const trimmed = String(value || '').trim()
      return !trimmed || trimmed === '—' ? '' : trimmed
    }

    const resolvedGroups = (() => {
      const fromUser = (user.groups || []).filter(
        (groupName) =>
          Boolean(String(groupName || '').trim()) && groupName !== '—',
      )
      if (fromUser.length) return fromUser

      return (
        applyGroupMembershipsToUsers([user], settingsGroups)[0]?.groups || []
      )
    })()

    const snapshot = {
      ...user,
      businessUnit: clearPlaceholder(user.businessUnit),
      countryCode: getCountrySelectValue(user.countryCode || ''),
      department: clearPlaceholder(user.department),
      employeeId: clearPlaceholder(user.employeeId),
      groups: resolvedGroups,
      jobTitle: clearPlaceholder(user.jobTitle),
      location: clearPlaceholder(user.location),
      manager: clearPlaceholder(user.manager),
      password: '',
      phoneNumber: user.phoneNumber || '',
      resetPassword: false,
    }
    const isPasswordLogin = snapshot.loginType === 'Password'

    if (isPasswordLogin) {
      if (snapshot.accountExpiryDate) {
        Object.assign(snapshot, syncExpiryFromDate(snapshot.accountExpiryDate))
      } else if (snapshot.passwordExpiryDays > 0) {
        Object.assign(snapshot, syncExpiryFromDays(snapshot.passwordExpiryDays))
      }
    }

    if (snapshot.mfaEnabled) {
      const hasPhone = Boolean(String(snapshot.phoneNumber || '').trim())
      const method = snapshot.mfaMethods[0]
      snapshot.mfaMethods =
        method === 'Mobile OTP' && !hasPhone
          ? [mfaMethodOptions[0].value]
          : method
            ? [method]
            : [mfaMethodOptions[0].value]
    } else {
      snapshot.mfaMethods = []
    }

    setEditingUserId(user.id)
    setOriginalUser(snapshot)
    setDraftUser(snapshot)
    setActiveStep(0)
    setIsSetupOpen(true)
  }

  const deletingUser = useMemo(
    () => users.find((user) => user.id === deletingUserId) || null,
    [deletingUserId, users],
  )

  const deleteUser = (userId: string | number) => {
    setDeletingUserId(userId)
  }

  const cancelDeleteUser = () => {
    if (isDeletingUser) return
    setDeletingUserId(null)
  }

  const confirmDeleteUser = async () => {
    if (deletingUserId == null) return

    setIsDeletingUser(true)
    setIsLoadingUsers(true)
    try {
      const response = await deleteUserApi(String(deletingUserId))

      if (response.error) {
        showToast({ message: response.error, variant: 'error' })
        return
      }

      showToast({ message: 'User deleted successfully', variant: 'success' })
      setDeletingUserId(null)
      await loadUsers()
    } finally {
      setIsDeletingUser(false)
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

    const validationMessage = getUserSetupValidationMessage(normalizedUser)

    if (validationMessage) {
      const nextStep =
        validationMessage.includes('Role') &&
        !validationMessage.includes('First Name') &&
        !validationMessage.includes('Password')
          ? 1
          : 0
      setActiveStep(nextStep)
      showToast({
        message: validationMessage,
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

      setIsSaving(true)

      try {
        const response = await updateUser(String(editingUserId), updatePayload)

        if (response.error) {
          showToast({ message: response.error, variant: 'error' })
          return
        }

        const listResponse = await getUsers()

        if (!listResponse.error && listResponse.data.length) {
          setUsers(
            applyGroupMembershipsToUsers(
              mapApiUsersToSettingsUsers(listResponse.data),
              settingsGroups,
            ),
          )
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
        setUsers(
          applyGroupMembershipsToUsers(
            mapApiUsersToSettingsUsers(listResponse.data),
            settingsGroups,
          ),
        )
      } else if (createdUser) {
        setUsers((current) =>
          applyGroupMembershipsToUsers(
            [createdUser, ...current],
            settingsGroups,
          ),
        )
      } else {
        const { password: _password, ...userWithoutPassword } = normalizedUser
        setUsers((current) =>
          applyGroupMembershipsToUsers(
            [{ ...userWithoutPassword, id: Date.now() }, ...current],
            settingsGroups,
          ),
        )
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
        (row) => `${row.firstName} ${row.lastName}`,
        {
          enableSorting: false,
          header: 'Name',
          id: 'name',
          meta: { ...settingsHeaderMeta.start, label: 'Name' },
          minSize: 40,
          size: 180,
          cell: ({ row }) => {
            const user = row.original
            const fullName = `${user.firstName} ${user.lastName}`.trim()

            return (
              <div
                className='min-w-0 truncate font-semibold text-[var(--gray-13)]'
                title={fullName}
              >
                {fullName || ''}
              </div>
            )
          },
        },
      ),

      userColumnHelper.accessor('email', {
        enableSorting: false,
        header: 'Email',
        id: 'email',
        meta: { ...settingsHeaderMeta.start, label: 'Email' },
        minSize: 40,
        size: 180,
        cell: ({ getValue }) => (
          <span
            className='block min-w-0 truncate text-[var(--gray-12)]'
            title={String(getValue() || '')}
          >
            {String(getValue() || '').trim() || ''}
          </span>
        ),
      }),

      userColumnHelper.accessor('department', {
        enableSorting: false,
        header: 'Department',
        id: 'department',
        meta: { ...settingsHeaderMeta.start, label: 'Department' },
        minSize: 40,
        size: 120,
        cell: ({ getValue }) => {
          const value = String(getValue() || '').trim()
          return <span>{value && value !== '—' ? value : ''}</span>
        },
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
        size: 130,
        cell: ({ getValue }) => (
          <span className='inline-flex items-center rounded-[10px] border border-[var(--border-default)] bg-surface px-2.5 py-0.5 font-medium text-[var(--gray-13)]'>
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
        size: 100,
        cell: ({ getValue }) => <StatusBadge status={getValue()} />,
      }),

      userColumnHelper.accessor('loginType', {
        enableSorting: false,
        header: 'Login Type',
        id: 'loginType',
        meta: {
          ...settingsHeaderMeta.start,
          className: '!px-2',
          disableEllipsis: true,
          label: 'Login Type',
        },
        maxSize: 156,
        minSize: 156,
        size: 156,
        cell: ({ getValue }) => {
          const value = String(getValue() || '').trim()
          if (!value) return <span />
          const label = formatLoginTypeLabel(value)

          return (
            <span className='inline-flex items-center gap-1.5 whitespace-nowrap'>
              <LoginTypeIcon type={value} />
              <span>{label}</span>
            </span>
          )
        },
      }),

      userColumnHelper.accessor('lastLogin', {
        enableSorting: false,
        header: 'Last Login',
        id: 'lastLogin',
        meta: settingsHeaderMeta.start,
        minSize: 40,
        size: 145,
        cell: ({ getValue }) => {
          const raw = String(getValue() || '').trim()
          if (!raw || raw === '—') return <span />
          return <span>{formatDatetime(raw, 'datetime')}</span>
        },
      }),

      userColumnHelper.accessor('created', {
        enableSorting: false,
        header: 'Created',
        id: 'created',
        meta: settingsHeaderMeta.start,
        minSize: 40,
        size: 145,
        cell: ({ getValue }) => {
          const raw = String(getValue() || '').trim()
          if (!raw || raw === '—') return <span />
          return <span>{formatDatetime(raw, 'datetime')}</span>
        },
      }),

      userColumnHelper.display({
        enableResizing: false,
        enableSorting: false,
        header: '',
        id: 'actions',
        meta: settingsHeaderMeta.end,
        minSize: 56,
        size: 56,
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

  const roleOptions = useMemo(() => {
    const fromApi = apiRoleOptions
      .map((role) => role.value || role.name)
      .filter(Boolean)
    const fromUsers = users.map((u) => String(u.role)).filter(Boolean)

    return Array.from(new Set([...fromApi, ...fromUsers])).map((r) => ({
      label: r,
      value: r,
    }))
  }, [apiRoleOptions, users])
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
  const emailOptions = useMemo(
    () =>
      Array.from(
        new Set(
          users
            .map((u) => String(u.email || '').trim())
            .filter(Boolean),
        ),
      )
        .sort((a, b) => a.localeCompare(b))
        .map((email) => ({ label: email, value: email })),
    [users],
  )
  const loginTypeOptions = useMemo(
    () =>
      Array.from(
        new Set(
          users
            .map((u) => formatLoginTypeLabel(String(u.loginType)))
            .filter((value) => value && value !== '—'),
        ),
      ).map((r) => ({ label: r, value: r })),
    [users],
  )
  const jobTitleSelectOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...defaultJobTitles,
          ...users
            .map((u) => String(u.jobTitle || '').trim())
            .filter((value) => value && value !== '—'),
        ]),
      ).sort((a, b) => a.localeCompare(b)),
    [users],
  )
  const locationSelectOptions = useMemo(
    () =>
      Array.from(
        new Set(
          users
            .map((u) => String(u.location || '').trim())
            .filter((value) => value && value !== '—'),
        ),
      ).sort((a, b) => a.localeCompare(b)),
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
        new Set(
          users
            .map((u) => String(u.businessUnit || '').trim())
            .filter((value) => value && value !== '—'),
        ),
      )
        .sort((a, b) => a.localeCompare(b))
        .map((r) => ({ label: r, value: r })),
    [users],
  )
  const businessUnitSelectOptions = useMemo(
    () => businessUnitOptions.map((option) => option.value),
    [businessUnitOptions],
  )
  const jobTitleFilterOptions = useMemo(
    () =>
      jobTitleSelectOptions.map((title) => ({
        label: title,
        value: title,
      })),
    [jobTitleSelectOptions],
  )
  const locationFilterOptions = useMemo(
    () =>
      locationSelectOptions.map((location) => ({
        label: location,
        value: location,
      })),
    [locationSelectOptions],
  )
  const managerFilterOptions = useMemo(
    () =>
      Array.from(
        new Set(
          users
            .map((u) => String(u.manager || '').trim())
            .filter((value) => value && value !== '—'),
        ),
      )
        .sort((a, b) => a.localeCompare(b))
        .map((manager) => ({ label: manager, value: manager })),
    [users],
  )

  if (isSetupOpen) {
    return (
      <UserSetup
        activeStep={activeStep}
        businessUnitOptions={businessUnitSelectOptions}
        draftUser={draftUser}
        editingUserId={editingUserId}
        groupOptions={groupOptions}
        isLoadingGroups={isLoadingGroups}
        isLoadingRoles={isLoadingRoles}
        isSaving={isSaving}
        jobTitleOptions={jobTitleSelectOptions}
        locationOptions={locationSelectOptions}
        managerOptions={managerOptions}
        roleOptions={apiRoleOptions}
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
      <ConfirmDialog
        opened={deletingUserId != null}
        title='Delete User'
        description={
          deletingUser
            ? `Are you sure you want to delete "${`${deletingUser.firstName} ${deletingUser.lastName}`.trim() || deletingUser.email}"? This action cannot be undone.`
            : 'Are you sure you want to delete this user? This action cannot be undone.'
        }
        confirmLabel='Delete'
        isConfirming={isDeletingUser}
        variant='danger'
        onCancel={cancelDeleteUser}
        onConfirm={() => {
          void confirmDeleteUser()
        }}
      />
      <section className='flex flex-1 flex-col'>
        <SettingsPageHeader title='User Management' onBack={onBack} />

        <div className='flex flex-1 flex-col overflow-hidden px-6 py-2 md:px-8'>
          <CustomFilter
            activeFilters={activeFilters}
            customSearchComponent={<TableSearch table={userTable as any} />}
            trailingActions={
              <TableExport fileName='users' table={userTable as any} />
            }
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
              {
                id: 'email',
                label: 'Email',
                options: emailOptions,
                searchable: true,
                searchPlaceholder: 'Search email...',
              },
              { id: 'role', label: 'Role', options: roleOptions },
              { id: 'status', label: 'Status', options: statusOptions },
            ]}
            moreFilters={[
              {
                id: 'department',
                label: 'Department',
                options: departmentOptions,
                searchable: true,
                searchPlaceholder: 'Search department...',
              },
              {
                id: 'jobTitle',
                label: 'Job Title',
                options: jobTitleFilterOptions,
                searchable: true,
                searchPlaceholder: 'Search job title...',
              },
              {
                id: 'businessUnit',
                label: 'Business Unit',
                options: businessUnitOptions,
                searchable: true,
                searchPlaceholder: 'Search business unit...',
              },
              {
                id: 'location',
                label: 'Location',
                options: locationFilterOptions,
                searchable: true,
                searchPlaceholder: 'Search location...',
              },
              {
                id: 'manager',
                label: 'Manager',
                options: managerFilterOptions,
                searchable: true,
                searchPlaceholder: 'Search manager...',
              },
              {
                id: 'loginType',
                label: 'Login Type',
                options: loginTypeOptions,
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

function Authentication({
  showErrors,
  user,
  onChange,
}: FormSectionProps & { showErrors?: boolean }) {
  const hasPhoneNumber = Boolean(String(user.phoneNumber || '').trim())
  const selectedMethod =
    user.mfaMethods[0] === 'Mobile OTP' && !hasPhoneNumber
      ? ''
      : user.mfaMethods[0] || ''
  const methodError =
    showErrors && user.mfaEnabled && !selectedMethod
      ? 'Please fill the required field: MFA Method'
      : undefined

  return (
    <SettingsFormSection>
      <div className='flex items-center justify-between gap-4 rounded-[12px] border border-[var(--border-default)] bg-surface p-3.5'>
        <div className='min-w-0'>
          <div className='text-xs font-semibold text-[var(--gray-13)]'>
            Multi-Factor Authentication
          </div>
          <p className='mt-0.5 text-xs text-[var(--gray-11)]'>
            Require additional verification for sign-in
          </p>
        </div>
        <Switch
          checked={user.mfaEnabled}
          onChange={(checked) => {
            if (!checked) {
              onChange({ ...user, mfaEnabled: false, mfaMethods: [] })
              return
            }

            const current = user.mfaMethods[0]
            const nextMethod =
              current === 'Mobile OTP' && !hasPhoneNumber
                ? mfaMethodOptions[0].value
                : current || mfaMethodOptions[0].value

            onChange({
              ...user,
              mfaEnabled: true,
              mfaMethods: [nextMethod],
            })
          }}
        />
      </div>

      {user.mfaEnabled ? (
        <div className='space-y-2'>
          <label className='block text-xs font-semibold text-[var(--gray-13)]'>
            MFA Method <span className='text-[var(--red-9)]'>*</span>
          </label>
          <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3'>
            {mfaMethodOptions.map((opt) => {
              const isMobileOtp = opt.value === 'Mobile OTP'
              const isDisabled = isMobileOtp && !hasPhoneNumber
              const isSelected = selectedMethod === opt.value
              const MethodIcon = opt.icon

              return (
                <button
                  key={opt.value}
                  type='button'
                  disabled={isDisabled}
                  title={
                    isDisabled
                      ? 'Add a phone number in Login Details to enable Mobile OTP'
                      : undefined
                  }
                  className={[
                    'flex items-center gap-3 rounded-[12px] border p-3.5 text-left transition',
                    isDisabled
                      ? 'cursor-not-allowed border-[var(--border-default)] bg-[var(--gray-2)] opacity-60'
                      : 'cursor-pointer',
                    !isDisabled && isSelected
                      ? 'border-[var(--primary-8)] bg-[var(--primary-2)] shadow-sm ring-1 ring-[var(--primary-8)]'
                      : '',
                    !isDisabled && !isSelected
                      ? 'border-[var(--border-default)] bg-surface hover:border-[var(--primary-5)]'
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => {
                    if (isDisabled) return
                    onChange({
                      ...user,
                      mfaMethods: [opt.value],
                    })
                  }}
                >
                  <div
                    className={[
                      'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition',
                      isSelected
                        ? 'border-[var(--primary-9)] bg-surface'
                        : 'border-[var(--gray-7)] bg-surface',
                    ].join(' ')}
                  >
                    {isSelected ? (
                      <div className='h-2 w-2 rounded-full bg-[var(--primary-9)]' />
                    ) : null}
                  </div>

                  <MethodIcon
                    className={cn(
                      'size-4 shrink-0',
                      isDisabled ? 'text-[var(--gray-8)]' : opt.iconClassName,
                    )}
                  />

                  <div className='min-w-0 flex-1'>
                    <div className='text-xs font-semibold leading-snug text-[var(--gray-13)]'>
                      {opt.title}
                    </div>
                    {isDisabled ? (
                      <div className='mt-0.5 text-[11px] text-[var(--gray-10)]'>
                        Requires phone number
                      </div>
                    ) : null}
                  </div>
                </button>
              )
            })}
          </div>
          {methodError ? (
            <p className='text-xs text-[var(--red-9)]'>{methodError}</p>
          ) : null}
        </div>
      ) : null}
    </SettingsFormSection>
  )
}

function BusinessDetails({
  businessUnitOptions,
  isLoadingRoles,
  jobTitleOptions,
  locationOptions,
  managerOptions,
  roleOptions,
  showErrors,
  user,
  onChange,
}: FormSectionProps & {
  businessUnitOptions: string[]
  isLoadingRoles?: boolean
  jobTitleOptions: string[]
  locationOptions: string[]
  managerOptions: SettingsOption[]
  roleOptions: SettingsOption[]
  showErrors?: boolean
}) {
  return (
    <SettingsFormSection>
      <SettingsSelectField
        error={getFieldRequiredError('Role', Boolean(showErrors), user.role)}
        label='Role'
        options={roleOptions}
        placeholder={isLoadingRoles ? 'Loading roles...' : 'Select role'}
        value={user.role}
        required
        searchable
        onChange={(value) => onChange({ ...user, role: value })}
      />

      <div className='grid grid-cols-1 gap-5 md:grid-cols-2'>
        <SettingsSelectField
          clearable
          creatable
          label='Job Title'
          options={jobTitleOptions}
          placeholder='Select or type job title'
          value={user.jobTitle === '—' ? '' : user.jobTitle}
          onChange={(value) => onChange({ ...user, jobTitle: value })}
        />

        <EzTextField
          label='Employee ID'
          placeholder='EMP-001'
          value={user.employeeId === '—' ? '' : user.employeeId}
          onChange={(value) => onChange({ ...user, employeeId: value })}
        />

        <SettingsSelectField
          creatable
          label='Department'
          options={departments}
          placeholder='Select or type department'
          value={user.department}
          onChange={(value) => onChange({ ...user, department: value })}
        />

        <SettingsSelectField
          clearable
          creatable
          label='Business Unit'
          options={businessUnitOptions}
          placeholder='Select or type business unit'
          value={user.businessUnit === '—' ? '' : user.businessUnit}
          onChange={(value) => onChange({ ...user, businessUnit: value })}
        />

        <SettingsSelectField
          clearable
          label='Manager'
          options={managerOptions}
          placeholder='Select'
          searchable
          value={user.manager}
          onChange={(value) => onChange({ ...user, manager: value })}
        />

        <SettingsSelectField
          clearable
          creatable
          label='Location'
          options={locationOptions}
          placeholder='Select or type location'
          value={user.location === '—' ? '' : user.location}
          onChange={(value) => onChange({ ...user, location: value })}
        />
      </div>
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
  autoFocus,
  disabled,
  error,
  label,
  placeholder,
  required,
  type = 'text',
  value,
  onBlur,
  onChange,
}: {
  autoFocus?: boolean
  disabled?: boolean
  error?: string
  label: string
  placeholder?: string
  required?: boolean
  type?: string
  value: string
  onBlur?: () => void
  onChange: (value: string) => void
}) {
  return (
    <InputText
      autoFocus={autoFocus}
      disabled={disabled}
      error={error}
      label={label}
      placeholder={placeholder}
      required={required}
      type={type}
      value={value}
      onBlur={onBlur}
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

function getPasswordRequirementError(password: string) {
  const unmet = requirementsConfig.find((req) => !req.regex.test(password))
  return unmet ? `Password must meet: ${unmet.label}` : undefined
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function getEmailValidationError(email: string) {
  const trimmed = String(email || '').trim()
  if (!trimmed) return undefined
  if (!EMAIL_PATTERN.test(trimmed)) {
    return 'Please enter a valid email address'
  }
  return undefined
}

function getMissingRequiredUserLabels(user: DraftUser, step?: number) {
  if (step === 2) return []

  if (step === 3) {
    const hasPhone = Boolean(String(user.phoneNumber || '').trim())
    const method = user.mfaMethods[0]
    const hasValidMethod = Boolean(
      method && !(method === 'Mobile OTP' && !hasPhone),
    )

    if (user.mfaEnabled && !hasValidMethod) {
      return ['MFA Method']
    }
    return []
  }

  if (step === 1) {
    return getMissingRequiredLabels([{ label: 'Role', value: user.role }])
  }

  const loginFields = [
    { label: 'First Name', value: user.firstName },
    { label: 'Last Name', value: user.lastName },
    { label: 'Email Address', value: user.email },
    { label: 'Login Type', value: user.loginType },
  ]

  if (user.loginType === 'Password' && user.resetPassword !== false) {
    loginFields.push({
      label: user.resetPassword === true ? 'New Password' : 'Password',
      value: user.password,
    })
  }

  if (step === 0) {
    return getMissingRequiredLabels(loginFields)
  }

  const missing = getMissingRequiredLabels([
    ...loginFields,
    { label: 'Role', value: user.role },
  ])

  if (user.mfaEnabled) {
    const hasPhone = Boolean(String(user.phoneNumber || '').trim())
    const method = user.mfaMethods[0]
    const hasValidMethod = Boolean(
      method && !(method === 'Mobile OTP' && !hasPhone),
    )
    if (!hasValidMethod) {
      missing.push('MFA Method')
    }
  }

  return missing
}

function getUserSetupValidationMessage(user: DraftUser, step?: number) {
  const missingLabels = getMissingRequiredUserLabels(user, step)
  if (missingLabels.length) {
    return getRequiredFieldErrorMessage(missingLabels)
  }

  if (step === undefined || step === 0) {
    const emailError = getEmailValidationError(user.email)
    if (emailError) return emailError

    if (
      user.loginType === 'Password' &&
      user.resetPassword !== false &&
      user.password
    ) {
      return getPasswordRequirementError(user.password)
    }
  }

  return undefined
}

function GroupAssignment({
  groupOptions,
  isLoadingGroups,
  user,
  onChange,
}: FormSectionProps & {
  groupOptions: SettingsOption[]
  isLoadingGroups?: boolean
}) {
  const selectedGroups = useMemo(() => {
    return user.groups
      .map((groupName) => String(groupName || '').trim())
      .filter((groupName) => groupName && groupName !== '—')
      .map((groupName) => {
        const normalized = groupName.toLowerCase()
        const matched = groupOptions.find((option) => {
          return (
            option.name.toLowerCase() === normalized ||
            String(option.value || '').toLowerCase() === normalized ||
            String(option.id).toLowerCase() === normalized
          )
        })

        return (
          matched || {
            id: groupName,
            name: groupName,
            value: groupName,
          }
        )
      })
  }, [groupOptions, user.groups])

  return (
    <SettingsFormSection>
      <div className='space-y-2'>
        <InputSelectMultiple
          label='Groups'
          options={groupOptions}
          placeholder={
            isLoadingGroups
              ? 'Loading groups...'
              : 'Search and select groups...'
          }
          value={selectedGroups}
          clearable
          searchable
          onChange={(value) =>
            onChange({
              ...user,
              groups: (value || []).map(
                (option) => option.value || option.name || String(option.id),
              ),
            })
          }
        />
        <SettingsSelectedChips
          className='mt-0'
          items={selectedGroups}
          onRemove={(id) => {
            const removed = selectedGroups.find(
              (option) => String(option.id) === String(id),
            )
            if (!removed) return

            onChange({
              ...user,
              groups: user.groups.filter(
                (groupName) =>
                  groupName !== removed.name &&
                  groupName !== removed.value &&
                  groupName !== String(removed.id),
              ),
            })
          }}
        />
      </div>
      {!isLoadingGroups && !groupOptions.length ? (
        <div className='rounded-[10px] border border-dashed border-[var(--border-default)] bg-surface px-5 py-8 text-center text-sm text-[var(--gray-10)]'>
          No groups available from the API yet.
        </div>
      ) : null}
    </SettingsFormSection>
  )
}

function LoginDetails({
  autoFocusFirstName,
  isEditing,
  showErrors,
  user,
  onChange,
}: FormSectionProps & {
  autoFocusFirstName?: boolean
  isEditing?: boolean
  showErrors?: boolean
}) {
  const firstNameRef = useRef<HTMLInputElement>(null)
  const [showEmailFormatError, setShowEmailFormatError] = useState(false)
  const showPasswordField =
    user.loginType === 'Password' && (!isEditing || Boolean(user.resetPassword))

  useEffect(() => {
    if (!autoFocusFirstName) return

    const timer = window.setTimeout(() => {
      firstNameRef.current?.focus()
    }, 50)

    return () => window.clearTimeout(timer)
  }, [autoFocusFirstName])

  useEffect(() => {
    if (showErrors) setShowEmailFormatError(true)
  }, [showErrors])

  return (
    <SettingsFormSection>
      <div className='grid grid-cols-1 gap-5 md:grid-cols-2'>
        <InputText
          ref={firstNameRef}
          autoFocus={Boolean(autoFocusFirstName)}
          error={getFieldRequiredError(
            'First Name',
            Boolean(showErrors),
            user.firstName,
          )}
          label='First Name'
          placeholder='Enter first name'
          required
          value={user.firstName}
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

      <div className='grid grid-cols-1 gap-5 md:grid-cols-2'>
        <EzTextField
          label='Email Address'
          placeholder='user@company.com'
          type='email'
          value={user.email}
          required
          error={
            getFieldRequiredError(
              'Email Address',
              Boolean(showErrors),
              user.email,
            ) ||
            (showEmailFormatError
              ? getEmailValidationError(user.email)
              : undefined)
          }
          onBlur={() => setShowEmailFormatError(true)}
          onChange={(value) => {
            setShowEmailFormatError(false)
            onChange({ ...user, email: value })
          }}
        />

        <EzTextField
          label='Username'
          placeholder='Enter username'
          value={user.username}
          onChange={(value) => onChange({ ...user, username: value })}
        />
      </div>

      <div className='space-y-2'>
        <label className='block text-xs font-semibold text-[var(--gray-13)]'>
          Phone Number
        </label>
        <div className='grid grid-cols-[120px_minmax(0,1fr)] gap-3'>
          <SettingsSelectField
            clearable
            options={countryDialCodeOptions}
            placeholder='Code'
            searchable
            value={getCountrySelectValue(user.countryCode || '')}
            onChange={(value) =>
              onChange({
                ...user,
                countryCode: value || '',
              })
            }
          />
          <InputText
            placeholder='Enter phone number'
            type='tel'
            value={user.phoneNumber}
            onChange={(value) => {
              const nextPhone = value.replace(/[^\d\s()-]/g, '')
              const nextUser = { ...user, phoneNumber: nextPhone }

              if (
                !nextPhone.trim() &&
                nextUser.mfaMethods[0] === 'Mobile OTP'
              ) {
                nextUser.mfaMethods = ['Email OTP']
              }

              onChange(nextUser)
            }}
          />
        </div>
      </div>

      <div className='space-y-2'>
        <label className='block text-xs font-semibold text-[var(--gray-13)]'>
          Login Type <span className='text-[var(--red-9)]'>*</span>
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
                onClick={() => {
                  const nextUser = { ...user, loginType: opt.value }

                  if (opt.value === 'Password') {
                    Object.assign(
                      nextUser,
                      syncExpiryFromDays(nextUser.passwordExpiryDays || 90),
                    )
                    if (isEditing) {
                      nextUser.resetPassword = false
                      nextUser.password = ''
                    }
                  } else if (isEditing) {
                    nextUser.resetPassword = false
                    nextUser.password = ''
                  }

                  onChange(nextUser)
                }}
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

                {opt.icon()}

                <div className='min-w-0 flex-1'>
                  <div className='text-xs font-semibold leading-snug text-[var(--gray-13)]'>
                    {opt.title}
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

      {user.loginType === 'Password' && isEditing ? (
        <ToggleRow
          checked={Boolean(user.resetPassword)}
          label='Reset password'
          onChange={(checked) =>
            onChange({
              ...user,
              password: checked ? user.password : '',
              resetPassword: checked,
            })
          }
        />
      ) : null}

      {showPasswordField ? (
        <div className='space-y-3'>
          <EzPasswordField
            label={isEditing ? 'New Password' : 'Password'}
            value={user.password}
            required
            error={
              getFieldRequiredError(
                isEditing ? 'New Password' : 'Password',
                Boolean(showErrors),
                user.password,
              ) ||
              (showErrors && user.password
                ? getPasswordRequirementError(user.password)
                : undefined)
            }
            onChange={(value) => onChange({ ...user, password: value })}
          />
          <PasswordRequirements password={user.password} />
        </div>
      ) : null}

      <div className='grid grid-cols-1 gap-5 md:grid-cols-2'>
        <EzTextField
          disabled={user.loginType !== 'Password'}
          label='Password Expiry (Days)'
          placeholder='90'
          type='number'
          value={
            user.loginType === 'Password'
              ? String(user.passwordExpiryDays)
              : ''
          }
          onChange={(value) =>
            onChange({
              ...user,
              ...syncExpiryFromDays(Number(value)),
            })
          }
        />

        <SettingsDateField
          disabled={user.loginType !== 'Password'}
          label='Account Expiry Date'
          minDate={dayjs().add(1, 'day').format('YYYY-MM-DD')}
          value={
            user.loginType === 'Password' ? user.accountExpiryDate : ''
          }
          onChange={(value) =>
            onChange({
              ...user,
              ...syncExpiryFromDate(value),
            })
          }
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
          <SummaryItem
            label='Phone'
            value={
              user.phoneNumber
                ? `${getDialCodeFromCountryValue(user.countryCode)} ${user.phoneNumber}`.trim()
                : '—'
            }
          />
          <SummaryItem label='Job Title' value={user.jobTitle || ''} />
          <SummaryItem label='Manager' value={user.manager || ''} />
          <SummaryItem label='Login' value={formatLoginTypeLabel(user.loginType)} />
          <SummaryItem label='Department' value={user.department || ''} />
          <SummaryItem label='Role' value={user.role || ''} />
          <SummaryItem label='Location' value={user.location || ''} />
          <SummaryItem
            label='Groups'
            value={user.groups.length ? user.groups.join(', ') : ''}
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

  const label = status.charAt(0).toUpperCase() + status.slice(1)

  return (
    <span
      className={`inline-flex items-center rounded-[10px] border px-2.5 py-0.5 font-semibold ${className}`}
    >
      {label}
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
  businessUnitOptions,
  draftUser,
  editingUserId,
  groupOptions,
  isLoadingGroups,
  isLoadingRoles,
  isSaving,
  jobTitleOptions,
  locationOptions,
  managerOptions,
  roleOptions,
  onBack,
  onBackToSettings,
  onCancel,
  onChange,
  onNext,
  onSave,
  onStepChange,
}: {
  activeStep: number
  businessUnitOptions: string[]
  draftUser: DraftUser
  editingUserId: string | number | null
  groupOptions: SettingsOption[]
  isLoadingGroups?: boolean
  isLoadingRoles?: boolean
  isSaving: boolean
  jobTitleOptions: string[]
  locationOptions: string[]
  managerOptions: SettingsOption[]
  roleOptions: SettingsOption[]
  onBack: () => void
  onBackToSettings?: () => void
  onCancel: () => void
  onChange: (user: DraftUser) => void
  onNext: () => void
  onSave: () => void
  onStepChange: (step: number) => void
}) {
  const [showErrors, setShowErrors] = useState(false)

  const handleNext = () => {
    const validationMessage = getUserSetupValidationMessage(
      draftUser,
      activeStep,
    )

    if (validationMessage) {
      setShowErrors(true)
      showToast({
        message: validationMessage,
        variant: 'error',
      })
      return
    }

    setShowErrors(false)
    onNext()
  }

  const handleSave = () => {
    const validationMessage = getUserSetupValidationMessage(draftUser)

    if (validationMessage) {
      setShowErrors(true)
      showToast({
        message: validationMessage,
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
        const validationMessage = getUserSetupValidationMessage(
          draftUser,
          index,
        )

        if (validationMessage) {
          setShowErrors(true)
          onStepChange(index)
          showToast({
            message: validationMessage,
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

  const wizardSteps = useMemo(() => {
    return steps.map((s, idx) => ({
      id: idx,
      label: s.title,
      description: s.description,
      icon: s.key === 'login' ? 'tabler:user' : s.key === 'business' ? 'tabler:building' : s.key === 'groups' ? 'tabler:users' : s.key === 'authentication' ? 'tabler:shield' : 'tabler:check',
    }))
  }, [])

  return (
    <SettingsWizardLayout
      activeStep={activeStep}
      steps={wizardSteps}
      onStepChange={handleStepChange}
      onBack={handleBack}
      onNext={handleNext}
      onSave={handleSave}
      onCancel={onCancel}
      isSaving={isSaving}
      saveLabel={editingUserId ? 'Update User' : 'Save User'}
      moduleTitle='User Management'
      setupTitle={editingUserId ? 'Edit User' : 'Create User'}
      headerTitle={editingUserId ? 'Edit User Setup' : 'New User Setup'}
      headerDescription='Configure user account details, business hierarchy, and permissions'
    >
      {activeStep === 0 && (
        <LoginDetails
          autoFocusFirstName={!editingUserId}
          isEditing={Boolean(editingUserId)}
          showErrors={showErrors}
          user={draftUser}
          onChange={onChange}
        />
      )}
      {activeStep === 1 && (
        <BusinessDetails
          businessUnitOptions={businessUnitOptions}
          isLoadingRoles={isLoadingRoles}
          jobTitleOptions={jobTitleOptions}
          locationOptions={locationOptions}
          managerOptions={managerOptions}
          roleOptions={roleOptions}
          showErrors={showErrors}
          user={draftUser}
          onChange={onChange}
        />
      )}
      {activeStep === 2 && (
        <GroupAssignment
          groupOptions={groupOptions}
          isLoadingGroups={isLoadingGroups}
          user={draftUser}
          onChange={onChange}
        />
      )}
      {activeStep === 3 && (
        <Authentication
          showErrors={showErrors}
          user={draftUser}
          onChange={onChange}
        />
      )}
      {activeStep === 4 && <Review user={draftUser} />}
    </SettingsWizardLayout>
  )
}
