import { createColumnHelper, useReactTable } from '@tanstack/react-table'
import { msg } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import {
  Check,
  ChevronDown,
  ChevronUp,
  Grid2X2,
  MoreHorizontal,
  Shield,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import {
  createRole as createRoleApi,
  getMenus,
  getRoleById,
  getRoles,
  getUsers,
  updateRole as updateRoleApi,
  type UpsertV6RolePayload,
  type V6MenuItem,
  type V6RoleItem,
} from '@/api/v6/user'
import IconButton from '@/components/base/button/IconButton'
import TableExport from '@/components/base/data-table/actions/TableExport'
import TableReload from '@/components/base/data-table/actions/TableReload'
import TableSearch from '@/components/base/data-table/actions/TableSearch'
import DataTable from '@/components/base/data-table/DataTable'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputSelectMultiple from '@/components/base/inputs/InputSelectMultiple'
import InputText from '@/components/base/inputs/InputText'
import InputTextarea from '@/components/base/inputs/InputTextarea'
import Menu from '@/components/base/menu/Menu'
import DropdownMenuItem from '@/components/base/menu/MenuItem'
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
import { calculateRoleSetupProgress } from '../helpers/settingsSetupProgress'
import { mapUsersToOptions } from '../helpers/userGroupMappers'
import SettingsFormSection from './SettingsFormSection'
import SettingsPageHeader, {
  type SettingsAddAction,
  SettingsHeaderAddButton,
} from './SettingsPageHeader'
import SettingsSelectedChips from './SettingsSelectedChips'
import SettingsSetupContent from './SettingsSetupContent'
import SettingsSetupHeader from './SettingsSetupHeader'
import useSettingsTableToolbar from './useSettingsTableToolbar'

type AssignedUser = {
  email: string
  id: string
  name: string
  role: string
}
type CreateStep = {
  caption: string
  description: string
  key: CreateStepKey
  title: string
}

type CreateStepKey = 'details' | 'permissions' | 'review'

type MenuItem = {
  id: string
  name: string
  order: number
  visible: boolean
}

type Option = {
  description?: string
  disabled?: boolean
  id: string
  name: string
  value?: string
}

type PermissionRow = {
  category: string
  categoryKey: string
  enabled: boolean
}

type Role = {
  description: string
  id: string
  name: string
  permissions: string[]
  type: 'System' | 'Custom'
  userIds: string[]
  users: number
}

type RoleUserProps = {
  onBack?: () => void
}

type TabKey = 'roles' | 'permissions' | 'menus' | 'assignments'

const tabs: { key: TabKey; label: ReturnType<typeof msg> }[] = [
  { key: 'roles', label: msg`Role List` },
  { key: 'permissions', label: msg`Permission Matrix` },
  { key: 'menus', label: msg`Menu Profiles` },
  { key: 'assignments', label: msg`User Assignments` },
]

const roleStepDefs: Array<{
  caption: ReturnType<typeof msg>
  description: ReturnType<typeof msg>
  key: CreateStepKey
  title: ReturnType<typeof msg>
}> = [
  {
    caption: msg`Step 1`,
    description: msg`Define the role name, assign users, and describe its scope.`,
    key: 'details',
    title: msg`Role Details`,
  },
  {
    caption: msg`Step 2`,
    description: msg`Enable or disable access for each module in this role.`,
    key: 'permissions',
    title: msg`Permissions`,
  },
  {
    caption: msg`Step 3`,
    description: msg`Validate the role configuration before saving.`,
    key: 'review',
    title: msg`Review`,
  },
]

const initialMenuItems: MenuItem[] = []

const mapApiMenuToProfileItem = (menu: V6MenuItem): MenuItem => ({
  id: String(menu.id || menu.key || ''),
  name: String(menu.name || menu.key || 'Menu'),
  order: Number(menu.sortOrder ?? 0),
  visible: true,
})

const initialUsers: AssignedUser[] = [
  { email: 'john@company.com', id: '1', name: 'John Doe', role: 'AP Manager' },
  {
    email: 'sarah@company.com',
    id: '2',
    name: 'Sarah Miller',
    role: 'AP Officer',
  },
  {
    email: 'mike@company.com',
    id: '3',
    name: 'Mike Ross',
    role: 'Business User',
  },
  { email: 'lisa@company.com', id: '4', name: 'Lisa Chen', role: 'Auditor' },
  {
    email: 'tom@company.com',
    id: '5',
    name: 'Tom Wilson',
    role: 'Read Only User',
  },
]

const roleColumnHelper = createColumnHelper<Role>()
const permissionColumnHelper = createColumnHelper<PermissionRow>()
const userAssignmentColumnHelper = createColumnHelper<AssignedUser>()

export default function RolesPermissions({ onBack }: RoleUserProps) {
  const { t } = useLingui()
  const [roles, setRoles] = useState<Role[]>([])
  const [selectedRoleId, setSelectedRoleId] = useState('')
  const [permissionRows, setPermissionRows] = useState<PermissionRow[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>(initialMenuItems)
  const [apiMenus, setApiMenus] = useState<V6MenuItem[]>([])
  const [users, setUsers] = useState<AssignedUser[]>(initialUsers)
  const [isCreatingRole, setIsCreatingRole] = useState(false)
  const [createStep, setCreateStep] = useState(0)
  const [newRoleName, setNewRoleName] = useState('')
  const [newRoleDescription, setNewRoleDescription] = useState('')
  const [selectedUsers, setSelectedUsers] = useState<Option[]>([])
  const [newPermissionRows, setNewPermissionRows] = useState<PermissionRow[]>(
    [],
  )
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null)
  const [isLoadingRoles, setIsLoadingRoles] = useState(false)
  const [isLoadingRoleDetails, setIsLoadingRoleDetails] = useState(false)
  const [isLoadingRolePermissions, setIsLoadingRolePermissions] =
    useState(false)
  const [isLoadingMenus, setIsLoadingMenus] = useState(false)
  const [isSavingRole, setIsSavingRole] = useState(false)
  const userOptions: Option[] = useMemo(() => {
    return mapUsersToOptions(
      users.map((user) => ({
        email: user.email,
        firstName: user.name.split(' ')[0] || user.name,
        id: user.id,
        lastName: user.name.split(' ').slice(1).join(' '),
      })),
    )
  }, [users])

  const selectedRole = useMemo(() => {
    if (!roles.length) return null
    return roles.find((role) => role.id === selectedRoleId) || roles[0]
  }, [roles, selectedRoleId])

  const roleNames = useMemo(() => roles.map((role) => role.name), [roles])

  const resetCreateRole = () => {
    setIsCreatingRole(false)
    setCreateStep(0)
    setNewRoleName('')
    setNewRoleDescription('')
    setSelectedUsers([])
    const resetMenus = apiMenus.map((item) => ({ ...item, visible: true }))
    setApiMenus(resetMenus)
    setNewPermissionRows(buildEmptyPermissionRows(resetMenus))
    setEditingRoleId(null)
  }

  const deleteRole = (roleId: string | number) => {
    const confirmed = window.confirm(
      t`Are you sure you want to delete this role?`,
    )
    if (!confirmed) return

    setRoles((current) => current.filter((role) => role.id !== roleId))
  }

  const loadRoles = useCallback(async () => {
    setIsLoadingRoles(true)
    try {
      const [rolesResponse, usersResponse] = await Promise.all([
        getRoles(),
        getUsers(),
      ])

      if (usersResponse.error) {
        showToast({ message: usersResponse.error, variant: 'error' })
      } else {
        const apiUsers = usersResponse.data.map((user) => ({
          email: user.email,
          id: String(user.id),
          name:
            `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
            user.displayName ||
            user.email,
          role: user.role || 'Business User',
        }))
        setUsers(apiUsers)
      }

      if (rolesResponse.error) {
        showToast({ message: rolesResponse.error, variant: 'error' })
        return
      }

      const mappedRoles = rolesResponse.data.map(mapApiRoleToRole)
      setRoles(mappedRoles)
      if (mappedRoles.length) {
        setSelectedRoleId((current) =>
          mappedRoles.some((role) => role.id === current)
            ? current
            : mappedRoles[0].id,
        )
      } else {
        setSelectedRoleId('')
      }
    } finally {
      setIsLoadingRoles(false)
    }
  }, [])

  useEffect(() => {
    void loadRoles()
  }, [loadRoles])

  const loadMenus = useCallback(async (): Promise<V6MenuItem[]> => {
    // setIsLoadingMenus(true)

    // try {
    //   const response = await getMenus()

    //   if (response.error) {
    //     showToast({ message: response.error, variant: 'error' })
    //     setMenuItems([])
    //     setApiMenus([])
    //     return []
    //   }
    //   console.log('Menus response:', response.data) // Debugging line

    //   const menus = [...response.data].sort(
    //     (a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0),
    //   )

    //   setApiMenus(menus)
    //   setMenuItems(menus.map(mapApiMenuToProfileItem))

    //   return menus
    // } finally {
    //   setIsLoadingMenus(false)
    // }
    const menus = [
      { key: 'dashboard', name: 'Dashboard', visible: false },
      { key: 'requests', name: 'Requests', visible: false },
      { key: 'folder', name: 'Folder', visible: false },

      { key: 'workflow', name: 'Workflow', visible: false },

      { key: 'forms', name: 'Forms', visible: false },

      { key: 'settings', name: 'Settings', visible: false },
    ]
    setApiMenus(menus)
    setMenuItems(menus.map(mapApiMenuToProfileItem))
    return menus
  }, [])

  useEffect(() => {
    void loadMenus()
  }, [loadMenus])

  const loadRolePermissions = useCallback(
    async (roleId: string, menusOverride?: V6MenuItem[]) => {
      if (!roleId) {
        setPermissionRows(buildEmptyPermissionRows(menusOverride ?? apiMenus))
        return
      }

      setIsLoadingRolePermissions(true)
      try {
        const menus =
          menusOverride ?? (apiMenus.length ? apiMenus : await loadMenus())

        const response = await getRoleById(roleId)

        if (response.error || !response.data) {
          showToast({
            message: response.error || t`Failed to load role permissions`,
            variant: 'error',
          })
          return
        }

        const role = mapApiRoleToRole(response.data)
        setPermissionRows(mapPermissionsToRows(role.permissions, menus))
        setRoles((current) =>
          current.map((item) =>
            item.id === role.id
              ? {
                  ...item,
                  permissions: role.permissions,
                  userIds: role.userIds,
                  users: role.users,
                }
              : item,
          ),
        )
      } finally {
        setIsLoadingRolePermissions(false)
      }
    },
    [apiMenus, loadMenus, t],
  )

  useEffect(() => {
    if (!apiMenus.length) return
    setNewPermissionRows(buildEmptyPermissionRows(apiMenus))
  }, [apiMenus])

  const saveRole = async () => {
    const cleanName = newRoleName.trim()
    if (!cleanName) return
    if (!selectedUsers.length) return

    const newPermissions = mapPermissionRowsToPermissions(newPermissionRows)
    const payload: UpsertV6RolePayload & { permissionKeys?: any[] } = {
      description:
        newRoleDescription.trim() || 'Custom role configured by administrator',
      permissionKeys: apiMenus.map((item) => {
        const isEnabled = newPermissions.includes(
          normalizeCategorySlug(item.key || ''),
        )
        return {
          key: item.key,
          name: item.name || item.label,
          visible: isEnabled,
        }
      }),
      permissions: newPermissions,
      roleName: cleanName,
      users: selectedUsers.map((user) => String(user.id)),
    }

    setIsSavingRole(true)
    try {
      const response = editingRoleId
        ? await updateRoleApi(editingRoleId, payload)
        : await createRoleApi(payload)

      if (response.error) {
        showToast({ message: response.error, variant: 'error' })
        return
      }

      showToast({
        message: editingRoleId
          ? t`Role updated successfully`
          : t`Role created successfully`,
        variant: 'success',
      })
      await loadRoles()
      resetCreateRole()
    } finally {
      setIsSavingRole(false)
    }
  }

  const openEditRole = async (id: string) => {
    setIsLoadingRoleDetails(true)
    try {
      const response = await getRoleById(id)

      if (response.error || !response.data) {
        showToast({
          message: response.error || t`Failed to load role`,
          variant: 'error',
        })
        return
      }

      const role = mapApiRoleToRole(response.data)

      const permissionKeys = (response.data as any)?.permissionKeys || []
      const permissionKeysMap = new Map<string, boolean>(
        permissionKeys.map((pk: any) => [
          String(pk.key || '').toLowerCase(),
          pk.visible === true,
        ]),
      )

      const updatedApiMenus = apiMenus.map((item) => {
        const itemKeyNormalized = String(item.key || '').toLowerCase()
        const visibleFromApi = permissionKeysMap.has(itemKeyNormalized)
          ? permissionKeysMap.get(itemKeyNormalized)
          : item.visible
        return {
          ...item,
          visible: visibleFromApi,
        }
      })
      setApiMenus(updatedApiMenus)

      setEditingRoleId(role.id)
      setNewRoleName(role.name)
      setNewRoleDescription(role.description)
      setSelectedUsers(
        userOptions.filter((option) =>
          role.userIds.includes(String(option.id)),
        ),
      )
      setNewPermissionRows(
        mapPermissionsToRows(role.permissions, updatedApiMenus),
      )

      setCreateStep(0)
      setIsCreatingRole(true)
    } finally {
      setIsLoadingRoleDetails(false)
    }
  }

  const toggleNewPermission = (categoryKey: string) => {
    setNewPermissionRows((current) =>
      current.map((row) =>
        row.categoryKey === categoryKey
          ? { ...row, enabled: !row.enabled }
          : row,
      ),
    )
  }

  const toggleMenu = (key: string) => {
    setMenuItems((current) =>
      current.map((item) =>
        item.id === key ? { ...item, visible: !item.visible } : item,
      ),
    )
  }

  const moveMenu = (key: string, direction: 'up' | 'down') => {
    setMenuItems((current) => {
      const sorted = [...current].sort((a, b) => a.order - b.order)
      const index = sorted.findIndex((item) => item.id === key)
      const targetIndex = direction === 'up' ? index - 1 : index + 1

      if (targetIndex < 0 || targetIndex >= sorted.length) return current

      const currentOrder = sorted[index].order
      sorted[index].order = sorted[targetIndex].order
      sorted[targetIndex].order = currentOrder

      return sorted.sort((a, b) => a.order - b.order)
    })
  }

  const changeUserRole = (id: string, role: string) => {
    setUsers((current) =>
      current.map((user) => (user.id === id ? { ...user, role } : user)),
    )
  }

  if (isCreatingRole) {
    return (
      <CreateRolePage
        activeStep={createStep}
        description={newRoleDescription}
        editingRoleId={editingRoleId}
        isSaving={isSavingRole}
        permissionRows={newPermissionRows}
        roleName={newRoleName}
        selectedUsers={selectedUsers}
        submitLabel={editingRoleId ? t`Update Role` : t`Save Role`}
        userOptions={userOptions}
        onBack={() => setCreateStep((step) => Math.max(step - 1, 0))}
        onBackToSettings={onBack}
        onCancel={resetCreateRole}
        onCreate={saveRole}
        onDescriptionChange={setNewRoleDescription}
        onNext={() =>
          setCreateStep((step) => Math.min(step + 1, roleStepDefs.length - 1))
        }
        onRoleNameChange={setNewRoleName}
        onSelectedUsersChange={setSelectedUsers}
        onStepChange={setCreateStep}
        onTogglePermission={toggleNewPermission}
      />
    )
  }

  return (
    <main className='flex h-full min-h-0 flex-col overflow-hidden bg-[var(--surface)]'>
      <RoleList
        isLoading={isLoadingRoles}
        isLoadingRoleDetails={isLoadingRoleDetails}
        roles={roles}
        onBack={onBack}
        onCreate={() => {
          const resetMenus = apiMenus.map((item) => ({
            ...item,
            visible: true,
          }))
          setApiMenus(resetMenus)
          setNewPermissionRows(buildEmptyPermissionRows(resetMenus))
          setIsCreatingRole(true)
        }}
        onDelete={deleteRole}
        onEdit={openEditRole}
        onReload={loadRoles}
      />
    </main>
  )
}

function buildEmptyPermissionRows(menus: V6MenuItem[]): PermissionRow[] {
  return buildPermissionCategoriesFromMenus(menus).map(({ key, name }) => {
    const menuItem = menus.find(
      (m) => normalizeCategorySlug(m.key || '') === key,
    )
    return {
      category: name,
      categoryKey: key,
      enabled: menuItem ? menuItem.visible !== false : true,
    }
  })
}

function buildPermissionCategoriesFromMenus(menus: V6MenuItem[]) {
  return menus
    .map((menu) => ({
      key: normalizeCategorySlug(String(menu.key || menu.id || '')),
      name: String(menu.label || menu.key || 'Menu'),
      sortOrder: Number(menu.sortOrder ?? 0),
    }))
    .filter((category) => category.key)
    .sort((a, b) => a.sortOrder - b.sortOrder)
}

function CheckBox({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: () => void
}) {
  return (
    <button
      type='button'
      className={[
        'inline-flex h-5 w-5 items-center justify-center rounded-[6px] border shadow-[var(--shadow-sm)] transition',
        checked
          ? 'border-[var(--primary-9)] bg-[var(--primary-9)] text-white'
          : 'border-[var(--primary-8)] bg-surface text-transparent hover:bg-[var(--primary-2)]',
      ].join(' ')}
      onClick={(event) => {
        event.stopPropagation()
        onChange()
      }}
    >
      <Check size={14} strokeWidth={3} />
    </button>
  )
}

function countEnabledPermissions(rows: PermissionRow[]) {
  return rows.filter((row) => row.enabled).length
}

function CreatePermissionMatrix({
  rows,
  onToggle,
}: {
  rows: PermissionRow[]
  onToggle: (categoryKey: string) => void
}) {
  const { t } = useLingui()
  // console.log(rows, "rows")
  const tableSearchOptions = useSettingsTableSearch()
  const permissionColumns = useMemo(
    () => [
      permissionColumnHelper.accessor('category', {
        enableSorting: false,
        header: t`Category`,
        id: 'category',
        meta: settingsHeaderMeta.start,
        size: 360,
        cell: ({ getValue }) => (
          <span className='text-sm font-semibold text-[var(--gray-13)] capitalize'>
            {getValue()}
          </span>
        ),
      }),
      permissionColumnHelper.display({
        enableSorting: false,
        header: t`Access`,
        id: 'access',
        meta: settingsHeaderMeta.center,
        size: 140,
        cell: ({ row }) => (
          <div className='flex justify-center'>
            <Switch
              checked={row.original.enabled}
              onChange={() => onToggle(row.original.categoryKey)}
            />
          </div>
        ),
      }),
    ],
    [onToggle, t],
  )

  const permissionTable = useReactTable({
    ...settingsTableCoreOptions,
    ...tableSearchOptions,
    columns: permissionColumns,
    data: rows,
    getRowId: (row) => row.category,
  })

  const { rowSize, onRowSizeChange } = useSettingsTableToolbar({
    isReLoading: false,
    table: permissionTable,
    onReload: () => undefined,
  })

  return (
    <div>
      <DataTable
        isLoading={false}
        isReLoading={false}
        pageSize={Math.max(9, rows.length || 9)}
        rowSize={rowSize}
        table={permissionTable}
        tableBodyMaxHeight='calc(100vh - 330px)'
        hideActionBar
        hideGrouping
        stickyHeader
        onReload={() => undefined}
        onRowSizeChange={onRowSizeChange}
      />
    </div>
  )
}

function CreateRolePage({
  activeStep,
  description,
  editingRoleId,
  isSaving,
  permissionRows,
  roleName,
  selectedUsers,
  submitLabel,
  userOptions,
  onBack,
  onBackToSettings,
  onCancel,
  onCreate,
  onDescriptionChange,
  onNext,
  onRoleNameChange,
  onSelectedUsersChange,
  onStepChange,
  onTogglePermission,
}: {
  activeStep: number
  description: string
  editingRoleId: string | null
  isSaving: boolean
  permissionRows: PermissionRow[]
  roleName: string
  selectedUsers: Option[]
  submitLabel: string
  userOptions: Option[]
  onBack: () => void
  onBackToSettings?: () => void
  onCancel: () => void
  onCreate: () => void
  onDescriptionChange: (value: string) => void
  onNext: () => void
  onRoleNameChange: (value: string) => void
  onSelectedUsersChange: (value: Option[]) => void
  onStepChange: (step: number) => void
  onTogglePermission: (categoryKey: string) => void
}) {
  const { i18n, t } = useLingui()
  const roleSteps = useMemo<CreateStep[]>(
    () =>
      roleStepDefs.map((step) => ({
        caption: i18n._(step.caption),
        description: i18n._(step.description),
        key: step.key,
        title: i18n._(step.title),
      })),
    [i18n.locale],
  )
  const enabledCount = useMemo(
    () => countEnabledPermissions(permissionRows),
    [permissionRows],
  )
  const progress = useMemo(
    () =>
      calculateRoleSetupProgress(
        roleName,
        description,
        selectedUsers.length,
        enabledCount,
      ),
    [description, enabledCount, roleName, selectedUsers.length],
  )
  const isLastStep = activeStep === roleSteps.length - 1
  const [showErrors, setShowErrors] = useState(false)

  const getMissingLabels = (step = activeStep) => {
    if (step === 1) return []

    const fields = [{ label: t`Role Name`, value: roleName }]
    const labels = getMissingRequiredLabels(fields)

    if (!selectedUsers.length) {
      labels.push(t`Select Users`)
    }

    return labels
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
    onCreate()
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

  const activeStepConfig = roleSteps[activeStep]

  return (
    <main className='flex h-full min-h-0 flex-col overflow-hidden bg-[var(--surface)] text-[var(--text-primary)]'>
      <SettingsSetupHeader
        moduleTitle={t`Roles & Permissions`}
        progress={progress}
        stepDescription={activeStepConfig.description}
        stepTitle={activeStepConfig.title}
        setupTitle={editingRoleId ? t`Edit Role` : t`Create Role`}
        onBackToSettings={onBackToSettings}
        onCancelSetup={onCancel}
      />

      <div className='grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[296px_1fr]'>
        <aside className='ez-scrollbar overflow-y-auto border-r border-[var(--border-default)] bg-[var(--surface)] px-4 py-9'>
          <div className='space-y-5'>
            {roleSteps.map((step, index) => {
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
                    {index < roleSteps.length - 1 ? (
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
                        <RoleStepIcon step={step.key} />
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
                error={getFieldRequiredError(t`Role Name`, showErrors, roleName)}
                label={t`Role Name`}
                placeholder={t`e.g. AP Supervisor`}
                required
                value={roleName}
                onChange={onRoleNameChange}
              />

              <InputSelectMultiple
                className='bg-surface'
                label={t`Select Users`}
                options={userOptions}
                placeholder={t`Select users...`}
                required
                value={selectedUsers}
                clearable
                searchable
                error={
                  showErrors && !selectedUsers.length
                    ? t`Please fill the required field: Select Users`
                    : undefined
                }
                onChange={(value) =>
                  onSelectedUsersChange((value || []) as Option[])
                }
              />
              <SettingsSelectedChips
                items={selectedUsers}
                onRemove={(id) =>
                  onSelectedUsersChange(
                    selectedUsers.filter((user) => user.id !== id),
                  )
                }
              />

              <InputTextarea
                label={t`Description`}
                minRows={5}
                placeholder={t`Describe this role's responsibilities and scope...`}
                value={description}
                onChange={onDescriptionChange}
              />
            </SettingsFormSection>
          ) : null}

          {activeStep === 1 ? (
            <SettingsFormSection>
              <CreatePermissionMatrix
                rows={permissionRows}
                onToggle={onTogglePermission}
              />
            </SettingsFormSection>
          ) : null}

          {activeStep === 2 ? (
            <SettingsFormSection>
              <div className='rounded-[14px] border border-[var(--border-default)] bg-surface p-6'>
                <h3 className='text-md mb-6 font-semibold text-[var(--gray-13)]'>
                  {t`Role Summary`}
                </h3>
                <div className='grid grid-cols-1 gap-x-12 gap-y-4 text-sm md:grid-cols-2'>
                  <SummaryItem label={t`Role Name`} value={roleName || '—'} />
                  <SummaryItem
                    label={t`Permissions`}
                    value={t`${enabledCount} enabled`}
                  />
                  <SummaryItem
                    label={t`Description`}
                    value={description || '—'}
                  />
                  <SummaryItem
                    label={t`Users`}
                    value={
                      selectedUsers.length
                        ? selectedUsers.map((user) => user.name).join(', ')
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
                  {isSaving ? t`Saving...` : submitLabel}
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

function formatCategoryLabel(key: string): string {
  return key
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function isPermissionEnabledForCategory(
  categoryKey: string,
  permissions: string[],
): boolean {
  return permissions.some(
    (permission) => normalizePermissionCategory(permission) === categoryKey,
  )
}

function mapApiRoleToRole(role: V6RoleItem): Role {
  const permissions = Array.isArray(role.permissions)
    ? role.permissions.map(String)
    : []
  const users = Array.isArray(role.users)
    ? role.users
        .map((user) => {
          if (typeof user === 'string') return user
          return String(user.id || user.userId || user.value || '')
        })
        .filter(Boolean)
    : []
  const userCount =
    typeof role.userCount === 'number' ? role.userCount : users.length

  return {
    description: String(role.description || ''),
    id: String(role.roleId || role.id || ''),
    name: String(role.roleName || role.name || ''),
    permissions,
    type: 'Custom',
    userIds: users,
    users: userCount,
  }
}

function mapPermissionRowsToPermissions(rows: PermissionRow[]): string[] {
  return rows.filter((row) => row.enabled).map((row) => `${row.categoryKey}`)
}

function mapPermissionsToRows(
  permissions: string[],
  menus: V6MenuItem[],
): PermissionRow[] {
  const categories = buildPermissionCategoriesFromMenus(menus)
  const categoryKeys = new Set(categories.map((category) => category.key))

  for (const permission of permissions) {
    const key = normalizePermissionCategory(permission)

    if (key && !categoryKeys.has(key)) {
      categories.push({
        key,
        name: formatCategoryLabel(key),
        sortOrder: categories.length + 1,
      })
      categoryKeys.add(key)
    }
  }

  return categories.map((category) => {
    const menuItem = menus.find(
      (m) => normalizeCategorySlug(m.key || '') === category.key,
    )
    const isVisible = menuItem
      ? menuItem.visible === true
      : isPermissionEnabledForCategory(category.key, permissions)
    return {
      category: category.name,
      categoryKey: category.key,
      enabled: isVisible,
    }
  })
}

function MenuProfiles({
  isLoading,
  items,
  roles,
  selectedRoleId,
  selectedRoleName,
  toolbarSlot,
  onMove,
  onReload,
  onRoleChange,
  onToggle,
}: {
  isLoading: boolean
  items: MenuItem[]
  roles: Role[]
  selectedRoleId: string
  selectedRoleName: string
  toolbarSlot: HTMLDivElement | null
  onMove: (id: string, direction: 'up' | 'down') => void
  onReload: () => void | Promise<void>
  onRoleChange: (id: string) => void
  onToggle: (id: string) => void
}) {
  const { t } = useLingui()
  const orderedItems = [...items].sort((a, b) => a.order - b.order)

  return (
    <>
      <TabToolbarPortal
        slot={toolbarSlot}
        toolbar={
          <div className='flex flex-wrap items-center justify-end gap-2'>
            <RoleTabSelect
              roles={roles}
              selectedRoleId={selectedRoleId}
              onRoleChange={onRoleChange}
            />
            <TableReload
              isReloading={isLoading}
              onReload={() => {
                void onReload()
              }}
            />
          </div>
        }
      />
      <div className='mt-5 overflow-hidden rounded-[14px] border border-[var(--border-default)] bg-surface shadow-[var(--shadow-sm)]'>
        <div className='flex items-center gap-3 border-b border-[var(--border-default)] px-5 py-4'>
          <Grid2X2 className='text-[var(--primary-9)]' size={18} />
          <h2 className='text-md font-semibold text-[var(--gray-13)]'>
            {t`Menu Visibility for ${selectedRoleName}`}
          </h2>
        </div>

        <div className='ez-scrollbar max-h-[calc(100vh-320px)] overflow-y-auto'>
          {isLoading ? (
            <div className='px-5 py-12 text-center text-sm text-[var(--gray-11)]'>
              {t`Loading menus...`}
            </div>
          ) : orderedItems.length === 0 ? (
            <div className='px-5 py-12 text-center text-sm text-[var(--gray-11)]'>
              {t`No menus found.`}
            </div>
          ) : (
            orderedItems.map((item) => (
              <div
                className='flex min-h-[63px] items-center justify-between gap-4 border-b border-[var(--border-default)] px-5 last:border-b-0'
                key={item.id}
              >
                <div className='flex items-center gap-4'>
                  <Switch
                    checked={item.visible}
                    onChange={() => onToggle(item.id)}
                  />
                  <span className='text-sm font-semibold text-[var(--gray-13)]'>
                    {item.name}
                  </span>
                </div>

                <div className='flex items-center gap-4'>
                  <div className='flex flex-col'>
                    <button
                      className='text-[var(--gray-10)] hover:text-[var(--primary-10)]'
                      type='button'
                      onClick={() => onMove(item.id, 'up')}
                    >
                      <ChevronUp size={18} />
                    </button>
                    <button
                      className='text-[var(--gray-10)] hover:text-[var(--primary-10)]'
                      type='button'
                      onClick={() => onMove(item.id, 'down')}
                    >
                      <ChevronDown size={18} />
                    </button>
                  </div>
                  <span className='flex h-7 min-w-7 items-center justify-center rounded-[8px] border border-[var(--border-default)] bg-surface px-2 text-xs font-semibold text-[var(--gray-13)]'>
                    {item.order}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}

function normalizeCategorySlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^\w]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function normalizePermissionCategory(value: string): string {
  const [rawCategory = ''] = value.split(/[.:|]/).map((part) => part.trim())

  return normalizeCategorySlug(rawCategory)
}

function PermissionMatrix({
  isLoading,
  roles,
  rows,
  selectedRoleId,
  toolbarSlot,
  onReload,
  onRoleChange,
  onToggle,
}: {
  isLoading: boolean
  roles: Role[]
  rows: PermissionRow[]
  selectedRoleId: string
  toolbarSlot: HTMLDivElement | null
  onReload: () => void
  onRoleChange: (id: string) => void
  onToggle: (categoryKey: string) => void
}) {
  const { t } = useLingui()
  const tableSearchOptions = useSettingsTableSearch()
  const permissionColumns = useMemo(
    () => [
      permissionColumnHelper.accessor('category', {
        enableSorting: false,
        header: t`Category`,
        id: 'category',
        meta: settingsHeaderMeta.start,
        minSize: 40,
        size: 240,
        cell: ({ getValue }) => (
          <span className='text-sm font-semibold text-[var(--gray-13)]'>
            {getValue()}
          </span>
        ),
      }),
      permissionColumnHelper.display({
        enableSorting: false,
        header: t`Access`,
        id: 'access',
        meta: settingsHeaderMeta.center,
        minSize: 40,
        size: 140,
        cell: ({ row }) => (
          <div className='flex justify-center'>
            <Switch
              checked={row.original.enabled}
              onChange={() => onToggle(row.original.categoryKey)}
            />
          </div>
        ),
      }),
    ],
    [onToggle, t],
  )

  const permissionTable = useReactTable({
    ...settingsTableCoreOptions,
    ...tableSearchOptions,
    columns: permissionColumns,
    data: rows,
    getRowId: (row) => row.category,
  })

  const { rowSize, toolbar, onRowSizeChange } = useSettingsTableToolbar({
    isReLoading: isLoading,
    table: permissionTable,
    onReload,
  })

  return (
    <>
      <TabToolbarPortal
        slot={toolbarSlot}
        toolbar={
          <div className='flex flex-wrap items-center justify-end gap-2'>
            <RoleTabSelect
              roles={roles}
              selectedRoleId={selectedRoleId}
              onRoleChange={onRoleChange}
            />
            {toolbar}
          </div>
        }
      />
      <DataTable
        emptyDescription={t`Menus will appear here once navigation items are available.`}
        emptyIcon='lucide:shield'
        emptyTitle={t`No permissions to configure`}
        isLoading={isLoading}
        isReLoading={isLoading}
        pageSize={Math.max(5, rows.length || 5)}
        rowSize={rowSize}
        table={permissionTable}
        tableBodyMaxHeight='calc(100vh - 380px)'
        hideActionBar
        hideGrouping
        stickyHeader
        onReload={onReload}
        onRowSizeChange={onRowSizeChange}
      />
    </>
  )
}

function RoleList({
  isLoading,
  isLoadingRoleDetails,
  roles,
  onBack,
  onCreate,
  onDelete,
  onEdit,
  onReload,
}: {
  isLoading: boolean
  isLoadingRoleDetails: boolean
  roles: Role[]
  onBack?: () => void
  onCreate: () => void
  onDelete: (id: string) => void
  onEdit: (id: string) => void
  onReload: () => void | Promise<void>
}) {
  const { t } = useLingui()
  const tableSearchOptions = useSettingsTableSearch()
  const {
    page,
    pageSize,
    pagination,
    paginationModel,
    onPageChange,
    onPageSizeChange,
    onPaginationChange,
  } = useSettingsTablePagination()
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({})

  const filteredRoles = useMemo(() => {
    return roles.filter((role) => {
      let matches = true
      Object.entries(activeFilters).forEach(([key, value]) => {
        if (!value) return
        if (key === 'name') {
          if (!matchesCategoryFilterValue(role.name, value, 'contains')) {
            matches = false
          }
        } else if (key === 'type') {
          if (!matchesCategoryFilterValue(role.type, value)) matches = false
        }
      })
      return matches
    })
  }, [roles, activeFilters])

  const roleColumns = useMemo(
    () => [
      roleColumnHelper.display({
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
              <Shield size={16} />
            </div>
          </div>
        ),
      }),
      roleColumnHelper.accessor((row) => `${row.name} ${row.description}`, {
        enableSorting: false,
        header: t`Role`,
        id: 'role',
        meta: { ...settingsHeaderMeta.start, label: t`Role` },
        minSize: 40,
        size: 360,
        cell: ({ row }) => {
          const role = row.original

          return (
            <div className='min-w-0'>
              <div className='truncate text-sm font-semibold text-[var(--gray-13)]'>
                {role.name}
              </div>
              <div className='mt-1 truncate text-sm text-[var(--gray-11)]'>
                {role.description}
              </div>
            </div>
          )
        },
      }),
      roleColumnHelper.accessor('type', {
        enableSorting: false,
        header: t`Type`,
        id: 'type',
        meta: {
          ...settingsHeaderMeta.start,
          disableEllipsis: true,
          label: t`Type`,
        },
        minSize: 40,
        size: 180,
        cell: ({ getValue }) => (
          <span className='inline-flex items-center rounded-[8px] border border-[var(--border-default)] bg-surface px-3 py-1 text-xs font-semibold text-[var(--gray-13)]'>
            {getValue()}
          </span>
        ),
      }),
      roleColumnHelper.accessor('users', {
        enableSorting: false,
        header: t`Users`,
        id: 'users',
        meta: { ...settingsHeaderMeta.start, disableEllipsis: true },
        minSize: 40,
        size: 160,
        cell: ({ getValue }) => (
          <span className='inline-flex items-center rounded-[8px] bg-[var(--gray-2)] px-4 py-1 text-sm font-semibold text-[var(--gray-13)]'>
            {t`${getValue()} users`}
          </span>
        ),
      }),
      roleColumnHelper.display({
        enableResizing: false,
        enableSorting: false,
        header: t`Actions`,
        id: 'actions',
        meta: settingsHeaderMeta.end,
        minSize: 72,
        size: 72,
        cell: ({ row }) => {
          const role = row.original

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
                    className='rounded-lg p-2 text-[var(--gray-13)] transition hover:bg-[var(--gray-2)] disabled:cursor-not-allowed disabled:opacity-50'
                    disabled={isLoadingRoleDetails}
                    type='button'
                  >
                    <MoreHorizontal size={20} />
                  </button>
                }
              >
                <DropdownMenuItem
                  icon='lucide:pencil'
                  label={t`Edit`}
                  onClick={() => onEdit(role.id)}
                />
                <DropdownMenuItem
                  className='text-red-11'
                  icon='lucide:trash-2'
                  iconClass='text-red-11'
                  label={t`Delete`}
                  onClick={() => onDelete(role.id)}
                />
              </Menu>
            </div>
          )
        },
      }),
    ],
    [isLoadingRoleDetails, onEdit, onDelete, t],
  )

  const roleTable = useReactTable({
    ...settingsTableCoreOptions,
    ...tableSearchOptions,
    ...paginationModel,
    columns: roleColumns,
    data: filteredRoles,
    state: {
      ...tableSearchOptions.state,
      pagination,
    },
    getRowId: (row) => row.id,
    onPaginationChange,
  })

  const { rowSize, onRowSizeChange } = useSettingsTableToolbar({
    isReLoading: isLoading,
    table: roleTable,
    onReload: () => {
      void onReload()
    },
  })

  const typeOptions = useMemo(
    () =>
      Array.from(new Set(roles.map((r) => r.type).filter(Boolean))).map(
        (type) => ({ label: type, value: type }),
      ),
    [roles],
  )

  return (
    <div className='flex h-full min-h-0 flex-col'>
      <SettingsPageHeader title={t`Roles & Permissions`} onBack={onBack} />

      <div className='flex min-h-0 flex-1 flex-col overflow-hidden p-4'>
        <CustomFilter
          activeFilters={activeFilters}
          customSearchComponent={<TableSearch table={roleTable as any} />}
          filters={[
            {
              id: 'name',
              label: t`Name`,
              options: roles
                .map((r) => String(r.name || '').trim())
                .filter(Boolean)
                .sort((a, b) => a.localeCompare(b))
                .map((name) => ({ label: name, value: name })),
              searchable: true,
              searchPlaceholder: t`Search name...`,
            },
            { id: 'type', label: t`Type`, options: typeOptions },
          ]}
          trailingActions={<TableExport table={roleTable as any} />}
          actionButtons={[
            {
              color: 'gray',
              disabled: isLoading,
              icon: 'tabler:refresh',
              id: 'refresh',
              isIconButton: true,
              tooltip: t`Refresh`,
              variant: 'outline',
              onClick: onReload,
            },
          ]}
          addButton={{
            tooltip: t`Create Role`,
            onClick: onCreate,
          }}
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
        <div className='mt-4 flex min-h-0 flex-1 flex-col overflow-hidden'>
          <div className='min-h-0 flex-1 overflow-hidden'>
            <DataTable
              emptyDescription={t`Create a role to manage access permissions across the platform.`}
              emptyIcon='lucide:shield'
              emptyTitle={t`No roles yet`}
              isLoading={isLoading}
              isReLoading={isLoading}
              pageSize={pageSize}
              rowSize={rowSize}
              table={roleTable}
              hideActionBar
              hideGrouping
              stickyHeader
              onReload={() => {
                void onReload()
              }}
              onRowSizeChange={onRowSizeChange}
            />
          </div>
          <Pagination
            className='mt-4 shrink-0'
            itemLabel={t`Roles`}
            page={page}
            pageSize={pageSize}
            showPageNumbers={false}
            totalItems={roleTable.getFilteredRowModel().rows.length}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
          />
        </div>
      </div>
    </div>
  )
}

function RoleStepIcon({ step }: { step: CreateStepKey }) {
  if (step === 'details') return <Shield size={14} />
  if (step === 'permissions') return <ShieldCheck size={14} />
  return <Check size={14} />
}

function RoleTabSelect({
  roles,
  selectedRoleId,
  onRoleChange,
}: {
  roles: Role[]
  selectedRoleId: string
  onRoleChange: (id: string) => void
}) {
  const { t } = useLingui()
  const roleOptions = useMemo(
    () =>
      roles.map((role) => ({
        id: role.id,
        name: role.name,
        value: role.id,
      })),
    [roles],
  )

  const selectedRole =
    roleOptions.find((option) => option.id === selectedRoleId) ||
    roleOptions[0] ||
    null

  useEffect(() => {
    if (!roleOptions.length) return

    const hasSelected = roleOptions.some(
      (option) => option.id === selectedRoleId,
    )
    if (!hasSelected) {
      onRoleChange(String(roleOptions[0].id))
    }
  }, [onRoleChange, roleOptions, selectedRoleId])

  if (!roleOptions.length) return null

  return (
    <InputSelect
      options={roleOptions}
      placeholder={t`Select role`}
      value={selectedRole}
      width={220}
      onChange={(option) => {
        if (!option) return
        onRoleChange(String(option.id))
      }}
    />
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

function Switch({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: () => void
}) {
  return (
    <button
      type='button'
      className={[
        'relative h-7 w-12 rounded-full shadow-[var(--shadow-sm)] transition',
        checked ? 'bg-[var(--primary-9)]' : 'bg-[var(--gray-4)]',
      ].join(' ')}
      onClick={onChange}
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

function TabBar({
  activeTab,
  addAction,
  onChange,
  onToolbarSlotChange,
}: {
  activeTab: TabKey
  addAction?: SettingsAddAction
  onChange: (tab: TabKey) => void
  onToolbarSlotChange: (node: HTMLDivElement | null) => void
}) {
  const { i18n } = useLingui()

  return (
    <div className='flex min-h-14 flex-wrap items-center justify-between gap-3 border-b border-gray-3 bg-surface px-4 py-2'>
      <div className='flex h-14 min-w-0 items-center'>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key

          return (
            <button
              key={tab.key}
              type='button'
              className={[
                'relative mr-9 flex h-14 items-center text-sm font-medium transition',
                isActive
                  ? 'text-primary-9'
                  : 'text-gray-12 hover:text-primary-9',
              ].join(' ')}
              onClick={() => onChange(tab.key)}
            >
              {i18n._(tab.label)}

              {isActive ? (
                <span className='absolute bottom-0 left-0 h-[2px] w-full bg-primary-9' />
              ) : null}
            </button>
          )
        })}
      </div>

      <div className='flex min-h-10 flex-wrap items-center justify-end gap-2'>
        <div
          className='flex min-h-10 flex-wrap items-center justify-end gap-2'
          ref={onToolbarSlotChange}
        />
        {addAction ? <SettingsHeaderAddButton {...addAction} /> : null}
      </div>
    </div>
  )
}

function TabToolbarPortal({
  slot,
  toolbar,
}: {
  slot: HTMLDivElement | null
  toolbar: ReactNode
}) {
  if (!slot) return null

  return createPortal(toolbar, slot)
}

function UserAssignments({
  roleNames,
  toolbarSlot,
  users,
  onChangeRole,
}: {
  roleNames: string[]
  toolbarSlot: HTMLDivElement | null
  users: AssignedUser[]
  onChangeRole: (id: string, role: string) => void
}) {
  const { t } = useLingui()
  const tableSearchOptions = useSettingsTableSearch()
  const userAssignmentColumns = useMemo(
    () => [
      userAssignmentColumnHelper.display({
        enableResizing: false,
        enableSorting: false,
        header: '',
        id: 'avatar',
        maxSize: 48,
        meta: settingsHeaderMeta.center,
        minSize: 48,
        size: 48,
        cell: () => (
          <div className='flex justify-center'>
            <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--primary-3)] text-[var(--primary-9)]'>
              <UserRound size={16} />
            </div>
          </div>
        ),
      }),
      userAssignmentColumnHelper.accessor('name', {
        enableSorting: false,
        header: t`User`,
        id: 'name',
        meta: { ...settingsHeaderMeta.start, label: t`User` },
        minSize: 40,
        size: 200,
        cell: ({ getValue }) => (
          <span className='text-sm font-semibold text-[var(--gray-13)]'>
            {getValue()}
          </span>
        ),
      }),
      userAssignmentColumnHelper.accessor('email', {
        enableSorting: false,
        header: t`Email`,
        id: 'email',
        meta: { ...settingsHeaderMeta.start, label: t`Email` },
        minSize: 40,
        size: 240,
        cell: ({ getValue }) => (
          <span className='text-sm text-[var(--gray-11)]'>{getValue()}</span>
        ),
      }),
      userAssignmentColumnHelper.accessor('role', {
        enableSorting: false,
        header: t`Current Role`,
        id: 'role',
        meta: { ...settingsHeaderMeta.start, label: t`Current Role` },
        minSize: 40,
        size: 160,
        cell: ({ getValue }) => (
          <span className='rounded-[8px] bg-[var(--gray-2)] px-3 py-1 text-xs font-semibold text-[var(--gray-13)]'>
            {getValue()}
          </span>
        ),
      }),
      userAssignmentColumnHelper.display({
        enableSorting: false,
        header: t`Change Role`,
        id: 'changeRole',
        meta: settingsHeaderMeta.start,
        minSize: 40,
        size: 240,
        cell: ({ row }) => {
          const roleOptions = roleNames.map((role) => ({
            id: role,
            name: role,
            value: role,
          }))
          const selectedRole =
            roleOptions.find((option) => option.name === row.original.role) ||
            null

          return (
            <InputSelect
              options={roleOptions}
              value={selectedRole}
              width={200}
              onChange={(selected) => {
                if (!selected) return
                onChangeRole(row.original.id, selected.name)
              }}
            />
          )
        },
      }),
    ],
    [onChangeRole, roleNames, t],
  )

  const userAssignmentTable = useReactTable({
    ...settingsTableCoreOptions,
    ...tableSearchOptions,
    columns: userAssignmentColumns,
    data: users,
    getRowId: (row) => String(row.id),
  })

  const { rowSize, toolbar, onRowSizeChange } = useSettingsTableToolbar({
    isReLoading: false,
    table: userAssignmentTable,
    onReload: () => undefined,
  })

  return (
    <>
      <TabToolbarPortal slot={toolbarSlot} toolbar={toolbar} />

      <DataTable
        emptyDescription={t`Assign users to roles once users are available in the platform.`}
        emptyIcon='lucide:user-round'
        emptyTitle={t`No user assignments yet`}
        isLoading={false}
        isReLoading={false}
        pageSize={Math.max(5, users.length || 5)}
        rowSize={rowSize}
        table={userAssignmentTable}
        tableBodyMaxHeight='calc(100vh - 390px)'
        hideActionBar
        hideGrouping
        stickyHeader
        onReload={() => undefined}
        onRowSizeChange={onRowSizeChange}
      />
      <div className='flex justify-end px-4 py-4'>
        <button
          className='h-10 rounded-[8px] bg-[var(--primary-9)] px-5 text-sm font-semibold text-white shadow-[var(--shadow-md)] transition hover:bg-[var(--primary-10)]'
          type='button'
        >
          {t`Save Assignments`}
        </button>
      </div>
    </>
  )
}
