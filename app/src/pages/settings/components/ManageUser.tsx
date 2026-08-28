import { msg } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import { createColumnHelper, useReactTable } from '@tanstack/react-table'
import dayjs from 'dayjs'
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
import { AnimatePresence } from 'motion/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  createUser,
  deleteUser as deleteUserApi,
  getGroups,
  getRoles,
  getUsers,
  updateUser,
} from '@/api/v6/user'
import {
  completeWizardDraft,
  deleteWizardDraft,
  getActiveWizardDraft,
  saveWizardDraft,
} from '@/api/v6/wizardDrafts'
import ConfirmDialog from '@/components/base/ConfirmDialog'
import TableExport from '@/components/base/data-table/actions/TableExport'
import TableSearch from '@/components/base/data-table/actions/TableSearch'
import DataTable from '@/components/base/data-table/DataTable'
import Icon from '@/components/base/icon/Icon'
import InputSelectMultiple from '@/components/base/inputs/InputSelectMultiple'
import InputText from '@/components/base/inputs/InputText'
import InputPassword from '@/components/base/inputs/password/InputPassword'
import Menu from '@/components/base/menu/Menu'
import MenuItem from '@/components/base/menu/MenuItem'
import Pagination from '@/components/base/pagination/Pagination'
import showToast from '@/components/base/toast/showToast'
import { AnimateFadeIn } from '@/components/common/animations'
import CustomFilter from '@/components/common/CustomFilter'
import PasswordRequirements, {
  requirementsConfig,
} from '@/layouts/auth/components/PasswordRequirements'
import cn from '@/utils/cn'
import { formatDatetime } from '@/utils/dayjs'
import { matchesCategoryFilterValue } from '@/utils/filterUtils'
import { dummySettingsUsers } from '../data/settingsDummyData'
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
import {
  buildUserDraftJson,
  hydrateUserFromDraft,
  userStepIndexFromDraft,
  userStepKey,
} from '../helpers/wizardDraftState'
import SettingsDateField from './SettingsDateField'
import SettingsFormSection from './SettingsFormSection'
import SettingsPageHeader from './SettingsPageHeader'
import SettingsSelectedChips from './SettingsSelectedChips'
import SettingsSelectField from './SettingsSelectField'
import SettingsWizardLayout from './SettingsWizardLayout'
import useSettingsTableToolbar from './useSettingsTableToolbar'

const SESSION_KEY = 'ezofis_manage_user_state'

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

function getStoredState() {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

const USER_SETUP_STEP_MSGS = [
  {
    description: msg`Account credentials & identity`,
    key: 'login' as const,
    title: msg`Login Details`,
  },
  {
    description: msg`Department & business hierarchy`,
    key: 'business' as const,
    title: msg`Business Detail`,
  },
  {
    description: msg`Assign user access groups`,
    key: 'groups' as const,
    title: msg`Group Assignment`,
  },
  {
    description: msg`Security & verification`,
    key: 'authentication' as const,
    title: msg`Authentication`,
  },
  {
    description: msg`Review & save profile`,
    key: 'review' as const,
    title: msg`Review`,
  },
]

const STEP_CAPTION_MSGS = [
  msg`Step 1`,
  msg`Step 2`,
  msg`Step 3`,
  msg`Step 4`,
  msg`Step 5`,
]

const LOGIN_OPTION_MSGS = [
  {
    description: msg`Email and password`,
    title: msg`Password`,
    value: 'Password' as const,
  },
  {
    description: msg`Sign in with Google`,
    title: msg`Google`,
    value: 'GoogleSSO' as const,
  },
  {
    description: msg`Sign in with Microsoft`,
    title: msg`Microsoft`,
    value: 'MS Entra ID' as const,
  },
  {
    description: msg`Sign in with Active Directory`,
    title: msg`Active Directory`,
    value: 'LDAP/AD' as const,
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
  title: string
  value: LoginType
  icon: () => React.ReactNode
}

function LoginTypeIcon({
  className,
  type,
}: {
  className?: string
  type: string
}) {
  const iconClass = cn('size-3.5 shrink-0', className)
  const normalized = String(type || '')
    .trim()
    .toLowerCase()

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
      return <Server className={cn(iconClass, 'text-[var(--gray-11)]')} />
    case 'password':
    case 'ezofis':
    default:
      return <KeyRound className={cn(iconClass, 'text-[var(--gray-11)]')} />
  }
}

const LOGIN_TYPE_LABELS = {
  activeDirectory: msg`Active Directory`,
  google: msg`Google`,
  microsoft: msg`Microsoft`,
  password: msg`Password`,
}

function formatLoginTypeLabel(type: string, i18nOrT?: any) {
  const normalized = String(type || '')
    .trim()
    .toLowerCase()
  let msgDescriptor: any = null

  if (normalized === 'ezofis' || normalized === 'password') {
    msgDescriptor = LOGIN_TYPE_LABELS.password
  } else if (
    normalized === 'googlesso' ||
    normalized === 'google' ||
    normalized === 'google sso'
  ) {
    msgDescriptor = LOGIN_TYPE_LABELS.google
  } else if (
    normalized === 'ms entra id' ||
    normalized === 'microsoft' ||
    normalized === 'entra' ||
    normalized === 'azuread' ||
    normalized === 'ms_entra_id'
  ) {
    msgDescriptor = LOGIN_TYPE_LABELS.microsoft
  } else if (
    normalized === 'ldap/ad' ||
    normalized === 'ldap' ||
    normalized === 'activedirectory' ||
    normalized === 'active directory' ||
    normalized === 'active_directory'
  ) {
    msgDescriptor = LOGIN_TYPE_LABELS.activeDirectory
  }

  if (msgDescriptor) {
    if (i18nOrT) {
      if (typeof i18nOrT._ === 'function') {
        return i18nOrT._(msgDescriptor)
      }
      if (typeof i18nOrT === 'function') {
        return i18nOrT(msgDescriptor)
      }
    }
    return msgDescriptor.id || msgDescriptor.message || 'Password'
  }

  if (!type) return '—'
  return type
}

const userColumnHelper = createColumnHelper<AppUser>()

type FormSectionProps = {
  user: DraftUser
  onChange: (user: DraftUser) => void
}

type ManageUserProps = {
  onBack?: () => void
}

export default function ManageUser({ onBack }: ManageUserProps) {
  const { i18n, t } = useLingui()
  const [groupOptions, setGroupOptions] = useState<SettingsOption[]>([])
  const [settingsGroups, setSettingsGroups] = useState<SettingsGroup[]>([])
  const [isLoadingGroups, setIsLoadingGroups] = useState(true)
  const settingsGroupsRef = useRef<SettingsGroup[]>([])
  settingsGroupsRef.current = settingsGroups
  const [apiRoleOptions, setApiRoleOptions] = useState<SettingsOption[]>([])
  const [isLoadingRoles, setIsLoadingRoles] = useState(true)

  const [users, setUsers] = useState<AppUser[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(true)

  const storedState = useMemo(() => getStoredState(), [])

  const [isSetupOpen, setIsSetupOpen] = useState(
    storedState?.isSetupOpen ?? false,
  )
  const [editingUserId, setEditingUserId] = useState<string | number | null>(
    storedState?.editingUserId ?? null,
  )
  const [activeStep, setActiveStep] = useState(storedState?.activeStep ?? 0)
  const [draftUser, setDraftUser] = useState<DraftUser>(() => {
    const storedUser = storedState?.draftUser
    if (!storedUser || typeof storedUser !== 'object') return emptyUser
    return {
      ...emptyUser,
      ...storedUser,
      groups: Array.isArray(storedUser.groups) ? storedUser.groups : [],
      mfaMethods: Array.isArray(storedUser.mfaMethods)
        ? storedUser.mfaMethods
        : emptyUser.mfaMethods,
    }
  })
  const [originalUser, setOriginalUser] = useState<DraftUser | null>(
    storedState?.originalUser ?? null,
  )
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>(
    storedState?.activeFilters ?? {},
  )

  useEffect(() => {
    try {
      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          activeFilters,
          activeStep,
          draftUser,
          editingUserId,
          isSetupOpen,
          originalUser,
        }),
      )
    } catch {
      // ignore
    }
  }, [
    isSetupOpen,
    editingUserId,
    activeStep,
    draftUser,
    originalUser,
    activeFilters,
  ])
  const [isSaving, setIsSaving] = useState(false)
  const [deletingUserId, setDeletingUserId] = useState<string | number | null>(
    null,
  )
  const [isDeletingUser, setIsDeletingUser] = useState(false)
  const userDraftIdRef = useRef<string | null>(null)
  const draftUserRef = useRef(draftUser)
  draftUserRef.current = draftUser

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
          if (!matchesCategoryFilterValue(user[key as keyof AppUser], value)) {
            matches = false
          }
        }
      })
      return matches
    })
  }, [users, activeFilters])

  const tableSearchOptions = useSettingsTableSearch(SESSION_KEY)
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
          Array.isArray(response.data) && response.data.length
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

  const persistUserWizardDraft = useCallback(
    async (stepIndex: number) => {
      const current = draftUserRef.current
      const json = buildUserDraftJson(current, {
        editingUserId,
      })
      const { data, error } = await saveWizardDraft('user', {
        currentStep: stepIndex + 1,
        currentStepKey: userStepKey(stepIndex),
        draftId: userDraftIdRef.current,
        draftJson: JSON.stringify(json),
      })
      if (data?.id) userDraftIdRef.current = data.id
      if (error) {
        showToast({
          message: error,
          variant: 'warning',
        })
      }
    },
    [editingUserId],
  )

  const finishUserWizardDraft = useCallback(async () => {
    let draftId = userDraftIdRef.current
    userDraftIdRef.current = null
    if (!draftId) {
      const { data } = await getActiveWizardDraft('user')
      draftId = data?.id ?? null
    }
    if (!draftId) return
    await completeWizardDraft('user', draftId)
  }, [])

  const discardUserWizardDraft = useCallback(async () => {
    const draftId = userDraftIdRef.current
    userDraftIdRef.current = null
    if (!draftId) return
    await deleteWizardDraft('user', draftId)
  }, [])

  useEffect(() => {
    if (!isSetupOpen) return
    if (userDraftIdRef.current) return

    let cancelled = false
    void (async () => {
      const { data } = await getActiveWizardDraft('user')
      if (cancelled) return
      if (data?.id) userDraftIdRef.current = data.id
    })()

    return () => {
      cancelled = true
    }
  }, [isSetupOpen])

  const openAddUser = async () => {
    setEditingUserId(null)
    setOriginalUser(null)

    const { data } = await getActiveWizardDraft('user')
    userDraftIdRef.current = data?.id ?? null

    if (data?.draftJson) {
      const hydrated = hydrateUserFromDraft(data.draftJson, emptyUser)

      if (hydrated.editingUserId == null) {
        setDraftUser({
          ...hydrated.user,
          id: Date.now(),
          password: '',
        })
        setActiveStep(
          userStepIndexFromDraft(data.currentStep, data.currentStepKey),
        )
        setIsSetupOpen(true)
        return
      }
    }

    setDraftUser({
      ...emptyUser,
      id: Date.now(),
    })
    setActiveStep(0)
    setIsSetupOpen(true)
  }

  const openEditUser = async (user: AppUser) => {
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

    const { data } = await getActiveWizardDraft('user')
    userDraftIdRef.current = data?.id ?? null

    if (!data?.draftJson) return

    const hydrated = hydrateUserFromDraft(data.draftJson, snapshot)

    if (String(hydrated.editingUserId ?? '') !== String(user.id)) return

    setDraftUser({
      ...snapshot,
      ...hydrated.user,
      id: user.id,
      password: '',
    })
    setActiveStep(userStepIndexFromDraft(data.currentStep, data.currentStepKey))
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

    const validationMessage = getUserSetupValidationMessage(
      normalizedUser,
      t,
      i18n,
    )

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

    await persistUserWizardDraft(4)

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

        if (!listResponse.error && listResponse.data?.length) {
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
        await finishUserWizardDraft()
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

      if (!listResponse.error && listResponse.data?.length) {
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
      await finishUserWizardDraft()
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

      userColumnHelper.accessor((row) => `${row.firstName} ${row.lastName}`, {
        enableSorting: false,
        header: t`Name`,
        id: 'name',
        meta: { ...settingsHeaderMeta.start, label: t`Name` },
        minSize: 40,
        size: 180,
        cell: ({ row }) => {
          const user = row.original
          const fullName = `${user.firstName} ${user.lastName}`.trim()

          return (
            <button
              className='max-w-full text-left font-semibold text-[var(--gray-13)] transition-colors hover:underline'
              type='button'
              onClick={() => openEditUser(user)}
            >
              {fullName || ''}
            </button>
          )
        },
      }),

      userColumnHelper.accessor('email', {
        enableSorting: false,
        header: t`Email`,
        id: 'email',
        meta: { ...settingsHeaderMeta.start, label: t`Email` },
        minSize: 40,
        size: 180,
        cell: ({ getValue }) => (
          <span className='text-[var(--gray-12)]'>
            {String(getValue() || '').trim() || ''}
          </span>
        ),
      }),

      userColumnHelper.accessor('department', {
        enableSorting: false,
        header: t`Department`,
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
        header: t`Role`,
        id: 'role',
        meta: {
          ...settingsHeaderMeta.start,
          disableEllipsis: true,
          label: t`Role`,
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
        header: t`Status`,
        id: 'status',
        meta: {
          ...settingsHeaderMeta.start,
          disableEllipsis: true,
          label: t`Status`,
        },
        minSize: 40,
        size: 100,
        cell: ({ getValue }) => <StatusBadge status={getValue()} />,
      }),

      userColumnHelper.accessor('loginType', {
        enableSorting: false,
        header: t`Login Type`,
        id: 'loginType',
        maxSize: 156,
        meta: {
          ...settingsHeaderMeta.start,
          className: '!px-2',
          disableEllipsis: true,
          label: t`Login Type`,
        },
        minSize: 156,
        size: 156,
        cell: ({ getValue }) => {
          const value = String(getValue() || '').trim()
          if (!value) return <span />
          const label = formatLoginTypeLabel(value, t)

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
        header: t`Last Login`,
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
        header: t`Created`,
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
                  label={t`Edit`}
                  onClick={() => openEditUser(user)}
                />
                <MenuItem
                  className='text-red-11'
                  icon='lucide:trash-2'
                  iconClass='text-red-11'
                  label={t`Delete`}
                  onClick={() => deleteUser(user.id)}
                />
              </Menu>
            </div>
          )
        },
      }),
    ],
    [openEditUser, deleteUser, t, i18n.locale],
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
        new Set(users.map((u) => String(u.email || '').trim()).filter(Boolean)),
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
        onBack={() => setActiveStep((step: number) => Math.max(step - 1, 0))}
        onBackToSettings={() => {
          void discardUserWizardDraft()
          onBack?.()
        }}
        onCancel={() => {
          void discardUserWizardDraft()
          setOriginalUser(null)
          setIsSetupOpen(false)
        }}
        onChange={setDraftUser}
        onNext={() => {
          void (async () => {
            await persistUserWizardDraft(activeStep)
            setActiveStep((step: number) => Math.min(step + 1, 4))
          })()
        }}
        onSave={saveUser}
        onStepChange={(nextStep) => {
          if (nextStep > activeStep) {
            void persistUserWizardDraft(activeStep)
          }
          setActiveStep(nextStep)
        }}
      />
    )
  }
  return (
    <main className='flex h-full flex-col bg-[var(--surface)]'>
      <ConfirmDialog
        confirmLabel={t`Delete`}
        isConfirming={isDeletingUser}
        opened={deletingUserId != null}
        title={t`Delete User`}
        variant='danger'
        description={
          deletingUser
            ? `Are you sure you want to delete "${`${deletingUser.firstName} ${deletingUser.lastName}`.trim() || deletingUser.email}"? This action cannot be undone.`
            : 'Are you sure you want to delete this user? This action cannot be undone.'
        }
        onCancel={cancelDeleteUser}
        onConfirm={() => {
          void confirmDeleteUser()
        }}
      />
      <section className='flex flex-1 flex-col'>
        <SettingsPageHeader title={t`User Management`} onBack={onBack} />

        <div className='flex flex-1 flex-col overflow-hidden px-6 py-2 md:px-8'>
          <CustomFilter
            activeFilters={activeFilters}
            customSearchComponent={<TableSearch table={userTable as any} />}
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
                label: t`Name`,
                options: nameOptions,
                searchable: true,
                searchPlaceholder: 'Search name...',
              },
              {
                id: 'email',
                label: t`Email`,
                options: emailOptions,
                searchable: true,
                searchPlaceholder: 'Search email...',
              },
              { id: 'role', label: t`Role`, options: roleOptions },
              { id: 'status', label: t`Status`, options: statusOptions },
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
                label: t`Login Type`,
                options: loginTypeOptions,
              },
            ]}
            showReset={
              Object.keys(activeFilters).some((k) => activeFilters[k]) ||
              !!tableSearchOptions.state.globalFilter?.value
            }
            trailingActions={
              <TableExport fileName='users' table={userTable as any} />
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
              itemLabel={t`Users`}
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
    (user.mfaMethods ?? [])[0] === 'Mobile OTP' && !hasPhoneNumber
      ? ''
      : (user.mfaMethods ?? [])[0] || ''
  const methodError =
    showErrors && user.mfaEnabled && !selectedMethod
      ? 'Please fill the required field: MFA Method'
      : undefined

  return (
    <SettingsFormSection>
      <AnimateFadeIn delay={0.1}>
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

              const current = (user.mfaMethods ?? [])[0]
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
      </AnimateFadeIn>

      {user.mfaEnabled ? (
        <AnimateFadeIn delay={0.15}>
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
                    disabled={isDisabled}
                    key={opt.value}
                    type='button'
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
                    title={
                      isDisabled
                        ? 'Add a phone number in Login Details to enable Mobile OTP'
                        : undefined
                    }
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
                      <div className='text-xs leading-snug font-semibold text-[var(--gray-13)]'>
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
        </AnimateFadeIn>
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
  const { t } = useLingui()
  return (
    <SettingsFormSection>
      <AnimateFadeIn delay={0.1}>
        <SettingsSelectField
          error={getFieldRequiredError('Role', Boolean(showErrors), user.role)}
          label={t`Role`}
          options={roleOptions}
          placeholder={isLoadingRoles ? 'Loading roles...' : 'Select role'}
          value={user.role}
          required
          searchable
          onChange={(value) => onChange({ ...user, role: value })}
        />
      </AnimateFadeIn>

      <div className='grid grid-cols-1 gap-5 md:grid-cols-2'>
        <AnimateFadeIn delay={0.15}>
          <SettingsSelectField
            label={t`Job Title`}
            options={jobTitleOptions}
            placeholder={t`Select or type job title`}
            value={user.jobTitle === '—' ? '' : user.jobTitle}
            clearable
            creatable
            onChange={(value) => onChange({ ...user, jobTitle: value })}
          />
        </AnimateFadeIn>

        <AnimateFadeIn delay={0.2}>
          <EzTextField
            label={t`Employee ID`}
            placeholder='EMP-001'
            value={user.employeeId === '—' ? '' : user.employeeId}
            onChange={(value) => onChange({ ...user, employeeId: value })}
          />
        </AnimateFadeIn>

        <AnimateFadeIn delay={0.25}>
          <SettingsSelectField
            label={t`Department`}
            options={departments}
            placeholder={t`Select or type department`}
            value={user.department}
            creatable
            onChange={(value) => onChange({ ...user, department: value })}
          />
        </AnimateFadeIn>

        <AnimateFadeIn delay={0.3}>
          <SettingsSelectField
            label={t`Business Unit`}
            options={businessUnitOptions}
            placeholder={t`Select or type business unit`}
            value={user.businessUnit === '—' ? '' : user.businessUnit}
            clearable
            creatable
            onChange={(value) => onChange({ ...user, businessUnit: value })}
          />
        </AnimateFadeIn>

        <AnimateFadeIn delay={0.35}>
          <SettingsSelectField
            label={t`Manager`}
            options={managerOptions}
            placeholder={t`Select`}
            value={user.manager}
            clearable
            searchable
            onChange={(value) => onChange({ ...user, manager: value })}
          />
        </AnimateFadeIn>

        <AnimateFadeIn delay={0.4}>
          <SettingsSelectField
            label={t`Location`}
            options={locationOptions}
            placeholder={t`Select or type location`}
            value={user.location === '—' ? '' : user.location}
            clearable
            creatable
            onChange={(value) => onChange({ ...user, location: value })}
          />
        </AnimateFadeIn>
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

function getPasswordRequirementError(
  password: string,
  i18n: { _: (descriptor: any) => string },
  t: (strings: TemplateStringsArray, ...values: any[]) => string,
) {
  const unmet = requirementsConfig.find((req) => !req.regex.test(password))
  return unmet ? t`Password must meet: ${i18n._(unmet.label)}` : undefined
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function getEmailValidationError(
  email: string,
  t: (strings: TemplateStringsArray, ...values: any[]) => string,
) {
  const trimmed = String(email || '').trim()
  if (!trimmed) return undefined
  if (!EMAIL_PATTERN.test(trimmed)) {
    return t`Please enter a valid email address`
  }
  return undefined
}

function getMissingRequiredUserLabels(
  user: DraftUser,
  t: (strings: TemplateStringsArray, ...values: any[]) => string,
  step?: number,
) {
  if (step === 2) return []

  if (step === 3) {
    const hasPhone = Boolean(String(user.phoneNumber || '').trim())
    const method = (user.mfaMethods ?? [])[0]
    const hasValidMethod = Boolean(
      method && !(method === 'Mobile OTP' && !hasPhone),
    )

    if (user.mfaEnabled && !hasValidMethod) {
      return [t`MFA Method`]
    }
    return []
  }

  if (step === 1) {
    return getMissingRequiredLabels([{ label: t`Role`, value: user.role }])
  }

  const loginFields = [
    { label: t`First Name`, value: user.firstName },
    { label: t`Last Name`, value: user.lastName },
    { label: t`Email Address`, value: user.email },
    { label: t`Login Type`, value: user.loginType },
  ]

  if (user.loginType === 'Password' && user.resetPassword !== false) {
    loginFields.push({
      label: user.resetPassword === true ? t`New Password` : t`Password`,
      value: user.password,
    })
  }

  if (step === 0) {
    return getMissingRequiredLabels(loginFields)
  }

  const missing = getMissingRequiredLabels([
    ...loginFields,
    { label: t`Role`, value: user.role },
  ])

  if (user.mfaEnabled) {
    const hasPhone = Boolean(String(user.phoneNumber || '').trim())
    const method = (user.mfaMethods ?? [])[0]
    const hasValidMethod = Boolean(
      method && !(method === 'Mobile OTP' && !hasPhone),
    )
    if (!hasValidMethod) {
      missing.push(t`MFA Method`)
    }
  }

  return missing
}

function getUserSetupValidationMessage(
  user: DraftUser,
  t: (strings: TemplateStringsArray, ...values: any[]) => string,
  i18n: { _: (descriptor: any) => string },
  step?: number,
) {
  const missingLabels = getMissingRequiredUserLabels(user, t, step)
  if (missingLabels.length) {
    return getRequiredFieldErrorMessage(missingLabels)
  }

  if (step === undefined || step === 0) {
    const emailError = getEmailValidationError(user.email, t)
    if (emailError) return emailError

    if (
      user.loginType === 'Password' &&
      user.resetPassword !== false &&
      user.password
    ) {
      return getPasswordRequirementError(user.password, i18n, t)
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
  const { t } = useLingui()
  const selectedGroups = useMemo(() => {
    return (user.groups ?? [])
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
      <AnimateFadeIn delay={0.1}>
        <div className='space-y-2'>
          <InputSelectMultiple
            label={t`Groups`}
            options={groupOptions}
            value={selectedGroups}
            clearable
            searchable
            placeholder={
              isLoadingGroups
                ? 'Loading groups...'
                : 'Search and select groups...'
            }
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
                groups: (user.groups ?? []).filter(
                  (groupName) =>
                    groupName !== removed.name &&
                    groupName !== removed.value &&
                    groupName !== String(removed.id),
                ),
              })
            }}
          />
        </div>
      </AnimateFadeIn>
      {!isLoadingGroups && !groupOptions.length ? (
        <AnimateFadeIn delay={0.15}>
          <div className='rounded-[10px] border border-dashed border-[var(--border-default)] bg-surface px-5 py-8 text-center text-sm text-[var(--gray-10)]'>
            No groups available from the API yet.
          </div>
        </AnimateFadeIn>
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
  const { i18n, t } = useLingui()
  const loginOptions = useMemo(
    () =>
      LOGIN_OPTION_MSGS.map((opt) => ({
        description: i18n._(opt.description),
        title: i18n._(opt.title),
        value: opt.value,
        icon: () => <LoginTypeIcon type={opt.value} />,
      })),
    [i18n],
  )
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
      <AnimateFadeIn delay={0.1}>
        <div className='grid grid-cols-1 gap-5 md:grid-cols-2'>
          <InputText
            autoFocus={Boolean(autoFocusFirstName)}
            label={t`First Name`}
            placeholder={t`Enter first name`}
            ref={firstNameRef}
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
            label={t`Last Name`}
            placeholder={t`Enter last name`}
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
      </AnimateFadeIn>

      <AnimateFadeIn delay={0.15}>
        <div className='grid grid-cols-1 gap-5 md:grid-cols-2'>
          <EzTextField
            disabled={isEditing}
            label={t`Email Address`}
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
                ? getEmailValidationError(user.email, t)
                : undefined)
            }
            onBlur={() => setShowEmailFormatError(true)}
            onChange={(value) => {
              setShowEmailFormatError(false)
              onChange({ ...user, email: value })
            }}
          />

          <EzTextField
            disabled={isEditing}
            label={t`Username`}
            placeholder={t`Enter username`}
            value={user.username}
            onChange={(value) => onChange({ ...user, username: value })}
          />
        </div>
      </AnimateFadeIn>

      <AnimateFadeIn delay={0.2}>
        <div className='space-y-2'>
          <label className='block text-xs font-semibold text-[var(--gray-13)]'>
            {t`Phone Number`}
          </label>
          <div className='grid grid-cols-[120px_minmax(0,1fr)] gap-3'>
            <SettingsSelectField
              options={countryDialCodeOptions}
              placeholder={t`Code`}
              value={getCountrySelectValue(user.countryCode || '')}
              clearable
              searchable
              onChange={(value) =>
                onChange({
                  ...user,
                  countryCode: value || '',
                })
              }
            />
            <InputText
              placeholder={t`Enter phone number`}
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
      </AnimateFadeIn>

      <AnimateFadeIn delay={0.25}>
        <div className='space-y-2'>
          <label className='block text-xs font-semibold text-[var(--gray-13)]'>
            {t`Login Type`} <span className='text-[var(--red-9)]'>*</span>
          </label>
          <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4'>
            {loginOptions.map((opt) => {
              const isSelected = user.loginType === opt.value

              return (
                <button
                  disabled={isEditing}
                  key={opt.value}
                  type='button'
                  className={[
                    'flex items-center gap-3 rounded-[12px] border p-3.5 text-left transition',
                    isEditing
                      ? 'cursor-not-allowed border-[var(--border-default)] bg-[var(--gray-2)] opacity-60'
                      : 'cursor-pointer',
                    !isEditing && isSelected
                      ? 'border-[var(--primary-8)] bg-[var(--primary-2)] shadow-sm ring-1 ring-[var(--primary-8)]'
                      : '',
                    !isEditing && !isSelected
                      ? 'border-[var(--border-default)] bg-surface hover:border-[var(--primary-5)]'
                      : '',
                    isEditing && isSelected
                      ? 'border-[var(--primary-8)] bg-[var(--primary-2)]/50 shadow-sm ring-1 ring-[var(--primary-8)]/50'
                      : '',
                  ].join(' ')}
                  onClick={() => {
                    if (isEditing) return
                    const nextUser = { ...user, loginType: opt.value }

                    if (opt.value === 'Password') {
                      Object.assign(
                        nextUser,
                        syncExpiryFromDays(nextUser.passwordExpiryDays || 90),
                      )
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
                    <div className='text-xs leading-snug font-semibold text-[var(--gray-13)]'>
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
      </AnimateFadeIn>

      {user.loginType === 'Password' && isEditing ? (
        <AnimateFadeIn delay={0.3}>
          <ToggleRow
            checked={Boolean(user.resetPassword)}
            label={t`Reset password`}
            onChange={(checked) =>
              onChange({
                ...user,
                password: checked ? user.password : '',
                resetPassword: checked,
              })
            }
          />
        </AnimateFadeIn>
      ) : null}

      {showPasswordField ? (
        <AnimateFadeIn delay={0.35}>
          <div className='space-y-3'>
            <EzPasswordField
              label={isEditing ? t`New Password` : t`Password`}
              value={user.password}
              required
              error={
                getFieldRequiredError(
                  isEditing ? t`New Password` : t`Password`,
                  Boolean(showErrors),
                  user.password,
                ) ||
                (showErrors && user.password
                  ? getPasswordRequirementError(user.password, i18n, t)
                  : undefined)
              }
              onChange={(value) => onChange({ ...user, password: value })}
            />
            <PasswordRequirements password={user.password} />
          </div>
        </AnimateFadeIn>
      ) : null}

      <AnimateFadeIn delay={0.4}>
        <div className='grid grid-cols-1 gap-5 md:grid-cols-2'>
          <EzTextField
            disabled={user.loginType !== 'Password'}
            label={t`Password Expiry (Days)`}
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
            label={t`Account Expiry Date`}
            minDate={dayjs().add(1, 'day').format('YYYY-MM-DD')}
            value={user.loginType === 'Password' ? user.accountExpiryDate : ''}
            onChange={(value) =>
              onChange({
                ...user,
                ...syncExpiryFromDate(value),
              })
            }
          />
        </div>
      </AnimateFadeIn>

      <AnimateFadeIn delay={0.45}>
        <ToggleRow
          checked={user.forcePasswordReset}
          label={t`Force password reset on first login`}
          onChange={(checked) =>
            onChange({ ...user, forcePasswordReset: checked })
          }
        />
      </AnimateFadeIn>
    </SettingsFormSection>
  )
}

function Review({ user }: { user: DraftUser }) {
  const { t } = useLingui()
  return (
    <SettingsFormSection>
      <div className='rounded-[14px] border border-[var(--border-default)] bg-surface p-6'>
        <AnimateFadeIn delay={0.1}>
          <h3 className='text-md mb-6 font-semibold text-[var(--gray-13)]'>
            User Summary
          </h3>
        </AnimateFadeIn>

        <div className='grid grid-cols-1 gap-x-12 gap-y-4 text-sm md:grid-cols-2'>
          <AnimateFadeIn delay={0.15}>
            <SummaryItem
              label={t`Name`}
              value={`${user.firstName} ${user.lastName}`.trim() || '—'}
            />
          </AnimateFadeIn>
          <AnimateFadeIn delay={0.18}>
            <SummaryItem label={t`Email`} value={user.email || '—'} />
          </AnimateFadeIn>
          <AnimateFadeIn delay={0.21}>
            <SummaryItem
              label={t`Phone`}
              value={
                user.phoneNumber
                  ? `${getDialCodeFromCountryValue(user.countryCode)} ${user.phoneNumber}`.trim()
                  : '—'
              }
            />
          </AnimateFadeIn>
          <AnimateFadeIn delay={0.24}>
            <SummaryItem label={t`Job Title`} value={user.jobTitle || ''} />
          </AnimateFadeIn>
          <AnimateFadeIn delay={0.27}>
            <SummaryItem label={t`Manager`} value={user.manager || ''} />
          </AnimateFadeIn>
          <AnimateFadeIn delay={0.3}>
            <SummaryItem
              label={t`Login`}
              value={formatLoginTypeLabel(user.loginType, t)}
            />
          </AnimateFadeIn>
          <AnimateFadeIn delay={0.33}>
            <SummaryItem label={t`Department`} value={user.department || ''} />
          </AnimateFadeIn>
          <AnimateFadeIn delay={0.36}>
            <SummaryItem label={t`Role`} value={user.role || ''} />
          </AnimateFadeIn>
          <AnimateFadeIn delay={0.39}>
            <SummaryItem label={t`Location`} value={user.location || ''} />
          </AnimateFadeIn>
          <AnimateFadeIn delay={0.42}>
            <SummaryItem
              label={t`Groups`}
              value={(user.groups ?? []).length ? user.groups.join(', ') : ''}
            />
          </AnimateFadeIn>
          <AnimateFadeIn delay={0.45}>
            <SummaryItem
              label={t`MFA`}
              value={`${user.mfaEnabled ? 'Enabled' : 'Disabled'} (${(user.mfaMethods ?? []).join(', ') || 'No methods'})`}
            />
          </AnimateFadeIn>
        </div>
      </div>
    </SettingsFormSection>
  )
}

function StatusBadge({ status }: { status: UserStatus }) {
  const { t } = useLingui()
  const className =
    status === 'active'
      ? 'border-[var(--green-5)] bg-[var(--green-3)] text-[var(--green-11)]'
      : status === 'pending'
        ? 'border-[var(--orange-5)] bg-[var(--orange-2)] text-[var(--orange-11)]'
        : 'border-[var(--gray-4)] bg-[var(--gray-2)] text-[var(--gray-10)]'

  const label =
    status === 'active'
      ? t`Active`
      : status === 'pending'
        ? t`Pending`
        : t`Inactive`

  return (
    <span
      className={`inline-flex items-center rounded-[10px] border px-2.5 py-0.5 font-normal ${className}`}
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
  const { i18n, t } = useLingui()
  const steps = useMemo(
    () =>
      USER_SETUP_STEP_MSGS.map((step, index) => ({
        caption: i18n._(STEP_CAPTION_MSGS[index]),
        description: i18n._(step.description),
        key: step.key,
        title: i18n._(step.title),
      })),
    [i18n],
  )
  const [showErrors, setShowErrors] = useState(false)

  const handleNext = () => {
    const validationMessage = getUserSetupValidationMessage(
      draftUser,
      t,
      i18n,
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
    const validationMessage = getUserSetupValidationMessage(draftUser, t, i18n)

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
          t,
          i18n,
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
    const isEditMode = editingUserId !== null
    return steps.map((s, idx) => ({
      clickable: isEditMode ? true : undefined,
      description: s.description,
      disabled: isEditMode ? false : undefined,
      icon:
        s.key === 'login'
          ? 'tabler:user'
          : s.key === 'business'
            ? 'tabler:building'
            : s.key === 'groups'
              ? 'tabler:users'
              : s.key === 'authentication'
                ? 'tabler:shield'
                : 'tabler:check',
      id: idx,
      label: s.title,
    }))
  }, [steps, editingUserId])

  return (
    <SettingsWizardLayout
      activeStep={activeStep}
      headerDescription={USER_SETUP_STEP_MSGS[activeStep]?.description}
      headerTitle={USER_SETUP_STEP_MSGS[activeStep]?.title}
      isSaving={isSaving}
      moduleTitle={msg`User Management`}
      saveLabel={editingUserId ? t`Update User` : t`Save User`}
      steps={wizardSteps}
      setupTitle={editingUserId ? msg`Edit User` : msg`Create User`}
      onBack={handleBack}
      onBackToSettings={onBack}
      onCancel={onCancel}
      onNext={handleNext}
      onSave={handleSave}
      onStepChange={handleStepChange}
    >
      <AnimatePresence initial={false} mode='wait'>
        {activeStep === 0 && (
          <AnimateFadeIn className='flex flex-col gap-6 md:gap-7' key='step-0'>
            <LoginDetails
              autoFocusFirstName={!editingUserId}
              isEditing={Boolean(editingUserId)}
              showErrors={showErrors}
              user={draftUser}
              onChange={onChange}
            />
          </AnimateFadeIn>
        )}
        {activeStep === 1 && (
          <AnimateFadeIn className='flex flex-col gap-6 md:gap-7' key='step-1'>
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
          </AnimateFadeIn>
        )}
        {activeStep === 2 && (
          <AnimateFadeIn className='flex flex-col gap-6 md:gap-7' key='step-2'>
            <GroupAssignment
              groupOptions={groupOptions}
              isLoadingGroups={isLoadingGroups}
              user={draftUser}
              onChange={onChange}
            />
          </AnimateFadeIn>
        )}
        {activeStep === 3 && (
          <AnimateFadeIn className='flex flex-col gap-6 md:gap-7' key='step-3'>
            <Authentication
              showErrors={showErrors}
              user={draftUser}
              onChange={onChange}
            />
          </AnimateFadeIn>
        )}
        {activeStep === 4 && (
          <AnimateFadeIn className='flex flex-col gap-6 md:gap-7' key='step-4'>
            <Review user={draftUser} />
          </AnimateFadeIn>
        )}
      </AnimatePresence>
    </SettingsWizardLayout>
  )
}
