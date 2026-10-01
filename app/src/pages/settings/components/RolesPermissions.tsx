import { msg } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import { createColumnHelper, useReactTable } from '@tanstack/react-table'
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
import { AnimatePresence } from 'motion/react'
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import {
  createRole as createRoleApi,
  deleteRole as deleteRoleApi,
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
import ConfirmDialog from '@/components/base/ConfirmDialog'
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
import { AnimateFadeIn } from '@/components/common/animations'
import CustomFilter from '@/components/common/CustomFilter'
import { formatDatetime } from '@/utils/dayjs'
import { matchesCategoryFilterValue } from '@/utils/filterUtils'
import { isDemoAppOrigin } from '@/utils/origin'
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
import { mapUsersToOptions } from '../helpers/userGroupMappers'
import SettingsFormSection from './SettingsFormSection'
import SettingsPageHeader, {
  type SettingsAddAction,
  SettingsHeaderAddButton,
} from './SettingsPageHeader'
import SettingsSelectedChips from './SettingsSelectedChips'
import SettingsWizardLayout from './SettingsWizardLayout'
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
  parentKey?: string
}

type Role = {
  createdAt: string
  description: string
  id: string
  name: string
  permissionCount: number
  permissions: string[]
  status: 'active' | 'inactive'
  type: 'System' | 'Custom'
  userIds: string[]
  users: number
}

type RolePermissionPage = {
  key: string
  name: string
  parentKey?: string
}

type RoleUserProps = {
  onBack?: () => void
}

type TabKey = 'roles' | 'permissions' | 'menus' | 'assignments'

const tabs: { key: TabKey; label: any }[] = [
  { key: 'roles', label: msg`Role List` },
  { key: 'permissions', label: msg`Permission Matrix` },
  { key: 'menus', label: msg`Menu Profiles` },
  { key: 'assignments', label: msg`User Assignments` },
]

const ROLE_STEP_MSGS = [
  {
    description: msg`Role name & user assignments`,
    key: 'details' as const,
    title: msg`Role Details`,
  },
  {
    description: msg`Module access & privilege matrix`,
    key: 'permissions' as const,
    title: msg`Permissions`,
  },
  {
    description: msg`Review & save role configuration`,
    key: 'review' as const,
    title: msg`Review`,
  },
]

const ROLE_STEP_CAPTIONS = [msg`Step 1`, msg`Step 2`, msg`Step 3`]

const ROLE_PERMISSION_PAGES: RolePermissionPage[] = [
  { key: 'dashboard', name: 'Dashboard' },
  { key: 'workflow-inbox', name: 'Workflow Inbox' },
  { key: 'folder', name: 'Folder' },
  { key: 'report', name: 'Reports' },
  { key: 'settings', name: 'Settings' },
  { key: 'workflow', name: 'Workflow', parentKey: 'settings' },
  { key: 'form', name: 'Form', parentKey: 'settings' },
  { key: 'folder-create', name: 'Folder creation', parentKey: 'settings' },
  { key: 'portal', name: 'Portal', parentKey: 'settings' },
  { key: 'report-builder', name: 'Report builder', parentKey: 'settings' },
]

const ROLE_PERMISSION_KEY_ALIASES: Record<string, string> = {
  'folder-configuration': 'folder-create',
  'folder-creation': 'folder-create',
  'form': 'form',
  'forms': 'form',
  'portal': 'portal',
  'portals': 'portal',
  'report': 'report',
  'report-builder': 'report-builder',
  'report-builder-settings': 'report-builder',
  'reportbuilder': 'report-builder',
  'reports': 'report',
  'request': 'workflow-inbox',
  'requests': 'workflow-inbox',
  'workflow': 'workflow',
  'workflow-inbox': 'workflow-inbox',
  'workflowinbox': 'workflow-inbox',
  'workflows': 'workflow',
}

const ALLOWED_ROLE_PERMISSION_KEYS = new Set(
  ROLE_PERMISSION_PAGES.map((page) => page.key),
)

const SETTINGS_CHILD_KEYS = ROLE_PERMISSION_PAGES.filter(
  (page) => page.parentKey === 'settings',
).map((page) => page.key)

const getPermissionPageMeta = (key: string) =>
  ROLE_PERMISSION_PAGES.find((page) => page.key === key)

const normalizeRolePermissionKey = (value: string) => {
  const slug = normalizeCategorySlug(value)
  if (!slug) return ''
  return ROLE_PERMISSION_KEY_ALIASES[slug] || slug
}

const isAllowedRolePermissionKey = (value: string) =>
  ALLOWED_ROLE_PERMISSION_KEYS.has(normalizeRolePermissionKey(value))

const initialMenuItems: MenuItem[] = []

const mapApiMenuToProfileItem = (menu: V6MenuItem): MenuItem => ({
  id: String(menu.id || menu.key || ''),
  name: String(menu.name || menu.key || 'Menu'),
  order: Number(menu.sortOrder ?? 0),
  visible: true,
})

const roleColumnHelper = createColumnHelper<Role>()
const permissionColumnHelper = createColumnHelper<PermissionRow>()
const userAssignmentColumnHelper = createColumnHelper<AssignedUser>()

const SESSION_KEY = 'ezofis_roles_permissions_state'

export default function RolesPermissions({ onBack }: RoleUserProps) {
  const { t } = useLingui()
  const [roles, setRoles] = useState<Role[]>([])
  const [selectedRoleId, setSelectedRoleId] = useState('')
  const [permissionRows, setPermissionRows] = useState<PermissionRow[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>(initialMenuItems)
  const [apiMenus, setApiMenus] = useState<V6MenuItem[]>([])
  const storedState = useMemo(() => getStoredState(), [])

  const [isCreatingRole, setIsCreatingRole] = useState(
    storedState?.isCreatingRole ?? false,
  )
  const [createStep, setCreateStep] = useState(storedState?.createStep ?? 0)
  const [newRoleName, setNewRoleName] = useState(storedState?.newRoleName ?? '')
  const [newRoleDescription, setNewRoleDescription] = useState(
    storedState?.newRoleDescription ?? '',
  )
  const [selectedUsers, setSelectedUsers] = useState<Option[]>(
    storedState?.selectedUsers ?? [],
  )
  const [newPermissionRows, setNewPermissionRows] = useState<PermissionRow[]>(
    storedState?.newPermissionRows ?? [],
  )
  const [editingRoleId, setEditingRoleId] = useState<string | null>(
    storedState?.editingRoleId ?? null,
  )
  const [userOptions, setUserOptions] = useState<Option[]>([])
  const [isLoadingRoles, setIsLoadingRoles] = useState(true)
  const [isLoadingRoleDetails, setIsLoadingRoleDetails] = useState(false)
  const [isLoadingRolePermissions, setIsLoadingRolePermissions] =
    useState(false)
  const [isSavingRole, setIsSavingRole] = useState(false)
  const [deletingRoleId, setDeletingRoleId] = useState<string | null>(null)
  const [isDeletingRole, setIsDeletingRole] = useState(false)

  const resetCreateRole = () => {
    setEditingRoleId(null)
    setNewRoleName('')
    setNewRoleDescription('')
    setSelectedUsers([])
    setNewPermissionRows(buildEmptyPermissionRows(apiMenus))
    setCreateStep(0)
    setIsCreatingRole(false)
  }

  const deletingRole = useMemo(
    () => roles.find((role) => role.id === deletingRoleId) || null,
    [deletingRoleId, roles],
  )

  const deleteRole = useCallback((id: string) => {
    setDeletingRoleId(id)
  }, [])

  const cancelDeleteRole = useCallback(() => {
    if (isDeletingRole) return
    setDeletingRoleId(null)
  }, [isDeletingRole])

  const loadRolesRequestIdRef = useRef(0)

  const loadRoles = useCallback(async () => {
    const requestId = ++loadRolesRequestIdRef.current
    setIsLoadingRoles(true)

    try {
      const [rolesResponse, usersResponse] = await Promise.all([
        getRoles(),
        getUsers(),
      ])

      if (requestId !== loadRolesRequestIdRef.current) {
        return
      }

      if (rolesResponse.canceled && usersResponse.canceled) {
        return
      }

      if (!usersResponse.canceled) {
        if (usersResponse.error) {
          showToast({ message: usersResponse.error, variant: 'error' })
        } else {
          setUserOptions(mapUsersToOptions(usersResponse.data))
        }
      }

      if (!rolesResponse.canceled) {
        if (rolesResponse.error) {
          showToast({ message: rolesResponse.error, variant: 'error' })
          setRoles([])
          return
        }

        const mappedRoles = Array.isArray(rolesResponse.data)
          ? rolesResponse.data.map(mapApiRoleToRole)
          : []
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
      }
    } finally {
      if (requestId === loadRolesRequestIdRef.current) {
        setIsLoadingRoles(false)
      }
    }
  }, [])

  useEffect(() => {
    void loadRoles()
  }, [loadRoles])

  const loadMenus = useCallback(async (): Promise<V6MenuItem[]> => {
    const menus = ROLE_PERMISSION_PAGES.map((page) => ({
      key: page.key,
      name: page.name,
      visible: false,
    }))
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
        const menusWithVisibility = applyPermissionKeysToMenus(
          menus,
          getRolePermissionKeys(response.data),
        )
        setPermissionRows(
          mapPermissionsToRows(role.permissions, menusWithVisibility),
        )
        setRoles((current) =>
          current.map((item) =>
            item.id === role.id
              ? {
                  ...item,
                  permissionCount: role.permissionCount,
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
    if (isCreatingRole) return
    setNewPermissionRows(buildEmptyPermissionRows(apiMenus))
  }, [apiMenus, isCreatingRole])

  const saveRole = async () => {
    const cleanName = newRoleName.trim()
    if (!cleanName) return
    if (!selectedUsers.length) return

    const newPermissions = mapPermissionRowsToPermissions(newPermissionRows)
    const permissionsPayload = Array.from(
      new Set(
        newPermissions.flatMap((p) =>
          p === 'workflow-inbox' ? ['workflow-inbox', 'request'] : [p],
        ),
      ),
    )
    const payload: UpsertV6RolePayload & { permissionKeys?: any[] } = {
      description:
        newRoleDescription.trim() || 'Custom role configured by administrator',
      permissionKeys: ROLE_PERMISSION_PAGES.map((page) => {
        const isEnabled = newPermissions.includes(page.key)
        return {
          key: page.key,
          name: page.name,
          visible: isEnabled,
        }
      }),
      permissions: permissionsPayload,
      roleName: cleanName,
      users: selectedUsers.map((user) => String(user.id)),
    }

    console.log('[Saving Role Menu Access Data]', payload)

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
      // Refresh session so Settings cards reflect the latest permissionKeys.
      try {
        const { refreshUserSession } = await import('@/api/v6/auth')
        await refreshUserSession()
      } catch {
        // ignore session refresh failures; role save already succeeded
      }
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
      const permissionKeys = getRolePermissionKeys(response.data)
      const updatedApiMenus = applyPermissionKeysToMenus(
        apiMenus,
        permissionKeys,
      )

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
    setNewPermissionRows((current) => {
      const target = current.find((row) => row.categoryKey === categoryKey)
      if (!target) return current
      const nextEnabled = !target.enabled

      return current.map((row) => {
        if (row.categoryKey === categoryKey) {
          return { ...row, enabled: nextEnabled }
        }
        // Turning Settings off clears nested configuration access.
        if (
          categoryKey === 'settings' &&
          !nextEnabled &&
          row.parentKey === 'settings'
        ) {
          return { ...row, enabled: false }
        }
        // Enabling a Settings child also enables Settings.
        if (
          nextEnabled &&
          SETTINGS_CHILD_KEYS.includes(categoryKey) &&
          row.categoryKey === 'settings'
        ) {
          return { ...row, enabled: true }
        }
        return row
      })
    })
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

  const confirmDeleteRole = useCallback(async () => {
    if (!deletingRoleId) return

    setIsDeletingRole(true)
    try {
      const response = await deleteRoleApi(deletingRoleId)
      if (response.error) {
        showToast({ message: response.error, variant: 'error' })
        return
      }

      showToast({
        message: t`Role deleted successfully.`,
        variant: 'success',
      })
      setDeletingRoleId(null)
      await loadRoles()
    } finally {
      setIsDeletingRole(false)
    }
  }, [deletingRoleId, loadRoles, t])

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
        onBack={() => setCreateStep((step: number) => Math.max(step - 1, 0))}
        onBackToSettings={onBack}
        onCancel={resetCreateRole}
        onCreate={saveRole}
        onDescriptionChange={setNewRoleDescription}
        onNext={() => setCreateStep((step: number) => Math.min(step + 1, 2))}
        onRoleNameChange={setNewRoleName}
        onSelectedUsersChange={setSelectedUsers}
        onStepChange={setCreateStep}
        onTogglePermission={toggleNewPermission}
      />
    )
  }

  return (
    <main className='flex h-full min-h-0 flex-col bg-[var(--surface)]'>
      <ConfirmDialog
        confirmLabel={t`Delete`}
        isConfirming={isDeletingRole}
        opened={deletingRoleId != null}
        title={t`Delete Role`}
        variant='danger'
        description={
          deletingRole
            ? t`Are you sure you want to delete "${deletingRole.name}"? This action cannot be undone.`
            : t`Are you sure you want to delete this role? This action cannot be undone.`
        }
        onCancel={cancelDeleteRole}
        onConfirm={() => {
          void confirmDeleteRole()
        }}
      />
      <RoleList
        isLoading={isLoadingRoles}
        isLoadingRoleDetails={isLoadingRoleDetails}
        roles={roles}
        onBack={onBack}
        onCreate={() => {
          const resetMenus = ROLE_PERMISSION_PAGES.map((page) => ({
            key: page.key,
            name: page.name,
            // Top-level modules on by default; Settings children opt-in.
            visible: !page.parentKey,
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

function applyPermissionKeysToMenus(
  menus: V6MenuItem[],
  permissionKeys: Array<{ key?: string; name?: string; visible?: unknown }>,
): V6MenuItem[] {
  const safePermissionKeys = permissionKeys ?? []
  const permissionKeysMap = buildPermissionKeysMap(safePermissionKeys)
  const hasPermissionKeys = safePermissionKeys.length > 0
  const sourceMenus = (
    menus?.length
      ? menus
      : ROLE_PERMISSION_PAGES.map((page) => ({
          key: page.key,
          name: page.name,
          visible: false,
        }))
  ).filter((menu) =>
    isAllowedRolePermissionKey(String(menu.key || (menu as any).id || '')),
  )

  // Keep a fixed page list only (dashboard, workflow-inbox, folder, workflow, form, settings).
  const orderedMenus = ROLE_PERMISSION_PAGES.map((page, index) => {
    const existing =
      sourceMenus.find(
        (menu) =>
          normalizeRolePermissionKey(
            String(menu.key || (menu as any).id || ''),
          ) === page.key,
      ) || null
    const permission = safePermissionKeys.find(
      (item) => normalizeRolePermissionKey(String(item.key || '')) === page.key,
    )
    const visible = hasPermissionKeys
      ? permissionKeysMap.get(page.key) === true
      : existing?.visible !== false

    return {
      ...existing,
      key: page.key,
      label: String(
        (existing as any)?.label || (existing as any)?.name || page.name,
      ),
      name: String(
        (existing as any)?.name || (existing as any)?.label || page.name,
      ),
      sortOrder: Number((existing as any)?.sortOrder ?? index),
      visible,
    }
  })

  return orderedMenus
}

function buildEmptyPermissionRows(menus: V6MenuItem[]): PermissionRow[] {
  return buildPermissionCategoriesFromMenus(menus).map(({ key, name }) => {
    const menuItem = menus.find(
      (m) => normalizeRolePermissionKey(m.key || '') === key,
    )
    const meta = getPermissionPageMeta(key)
    return {
      category: name,
      categoryKey: key,
      enabled: menuItem ? menuItem.visible !== false : true,
      parentKey: meta?.parentKey,
    }
  })
}

function buildPermissionCategoriesFromMenus(menus: V6MenuItem[]) {
  // Prefer the fixed ROLE_PERMISSION_PAGES order so Settings children stay nested.
  if (!menus.length) {
    return ROLE_PERMISSION_PAGES.map((page, index) => ({
      key: page.key,
      name: page.name,
      sortOrder: index,
    }))
  }

  return ROLE_PERMISSION_PAGES.map((page, index) => {
    const menu = menus.find(
      (item) => normalizeRolePermissionKey(String(item.key || '')) === page.key,
    )
    return {
      key: page.key,
      name: String(menu?.name || menu?.label || page.name),
      sortOrder: Number(menu?.sortOrder ?? index),
    }
  })
}

function buildPermissionKeysMap(
  permissionKeys: Array<{ key?: string; visible?: unknown }>,
) {
  return new Map(
    permissionKeys
      .map((item) => {
        const key = normalizeRolePermissionKey(String(item.key || ''))
        if (!key || !ALLOWED_ROLE_PERMISSION_KEYS.has(key)) return null
        return [key, isPermissionKeyVisible(item.visible)] as const
      })
      .filter((entry): entry is readonly [string, boolean] => Boolean(entry)),
  )
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
  const settingsEnabled = Boolean(
    rows.find((row) => row.categoryKey === 'settings')?.enabled,
  )
  const topLevelRows = rows.filter((row) => !row.parentKey)
  const settingsChildren = rows.filter((row) => row.parentKey === 'settings')

  return (
    <div className='overflow-hidden rounded-[12px] border border-[var(--border-default)] bg-[var(--surface-primary)]'>
      <div className='grid grid-cols-[1fr_120px] border-b border-[var(--border-default)] bg-[var(--gray-1)] px-4 py-3'>
        <span className='text-12 font-semibold tracking-wide text-[var(--gray-11)] uppercase'>
          {t`Category`}
        </span>
        <span className='text-center text-12 font-semibold tracking-wide text-[var(--gray-11)] uppercase'>
          {t`Access`}
        </span>
      </div>

      <div className='divide-y divide-[var(--border-default)]'>
        {topLevelRows.map((row) => {
          const isSettings = row.categoryKey === 'settings'
          return (
            <div key={row.categoryKey}>
              <div className='grid grid-cols-[1fr_120px] items-center px-4 py-3.5'>
                <span className='text-sm font-semibold text-[var(--gray-13)] capitalize'>
                  {row.category}
                </span>
                <div className='flex justify-center'>
                  <Switch
                    checked={row.enabled}
                    onChange={() => onToggle(row.categoryKey)}
                  />
                </div>
              </div>

              {isSettings && settingsEnabled ? (
                <div className='border-t border-[var(--border-default)] bg-[var(--primary-1)]/60 px-4 py-3'>
                  <p className='mb-2.5 text-[11px] font-semibold tracking-[0.08em] text-primary-9 uppercase'>
                    {t`Settings configuration access`}
                  </p>
                  <div className='overflow-hidden rounded-[10px] border border-[var(--border-default)] bg-[var(--surface-primary)]'>
                    {settingsChildren.map((child, index) => (
                      <div
                        key={child.categoryKey}
                        className={[
                          'grid grid-cols-[1fr_120px] items-center px-3.5 py-3',
                          index > 0
                            ? 'border-t border-[var(--border-default)]'
                            : '',
                        ].join(' ')}
                      >
                        <div className='min-w-0 pl-1'>
                          <div className='text-13 font-semibold text-[var(--gray-13)]'>
                            {child.category}
                          </div>
                          <div className='mt-0.5 text-11 text-[var(--gray-10)]'>
                            {child.categoryKey === 'workflow'
                              ? t`Show Workflows in Settings → Configuration`
                              : child.categoryKey === 'form'
                                ? t`Show Forms in Settings → Configuration`
                                : child.categoryKey === 'folder-create'
                                  ? t`Show Folder Configuration in Settings`
                                  : child.categoryKey === 'portal'
                                    ? t`Show Portal Configuration in Settings`
                                    : child.categoryKey === 'report-builder'
                                      ? t`Show Report Builder in Settings → Configuration`
                                      : t`Show ${child.category} in Settings`}
                          </div>
                        </div>
                        <div className='flex justify-center'>
                          <Switch
                            checked={child.enabled}
                            onChange={() => onToggle(child.categoryKey)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
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
  const enabledCount = useMemo(
    () => countEnabledPermissions(permissionRows),
    [permissionRows],
  )
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
    if (!isDemoAppOrigin()) {
      const missingLabels = getMissingLabels(activeStep)

      if (missingLabels.length) {
        setShowErrors(true)
        showToast({
          message: getRequiredFieldErrorMessage(missingLabels),
          variant: 'info',
        })
        return
      }
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
        variant: 'info',
      })
      return
    }

    setShowErrors(false)
    onCreate()
  }

  const handleStepChange = (step: number) => {
    if (!isDemoAppOrigin() && step > activeStep) {
      for (let index = activeStep; index < step; index += 1) {
        const missingLabels = getMissingLabels(index)

        if (missingLabels.length) {
          setShowErrors(true)
          onStepChange(index)
          showToast({
            message: getRequiredFieldErrorMessage(missingLabels),
            variant: 'info',
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
    const isEditMode = editingRoleId !== null || isDemoAppOrigin()
    return ROLE_STEP_MSGS.map((step, idx) => ({
      clickable: isEditMode ? true : undefined,
      description: i18n._(step.description),
      disabled: isEditMode ? false : undefined,
      icon:
        step.key === 'details'
          ? 'tabler:shield'
          : step.key === 'permissions'
            ? 'tabler:shield-check'
            : 'tabler:check',
      id: idx,
      label: i18n._(step.title),
    }))
  }, [i18n, editingRoleId])

  return (
    <SettingsWizardLayout
      activeStep={activeStep}
      headerDescription={ROLE_STEP_MSGS[activeStep]?.description}
      headerTitle={ROLE_STEP_MSGS[activeStep]?.title}
      isSaving={isSaving}
      moduleTitle={msg`Roles & Permissions`}
      saveLabel={submitLabel}
      steps={wizardSteps}
      setupTitle={editingRoleId ? msg`Edit Role` : msg`Create Role`}
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
            <SettingsFormSection>
              <AnimateFadeIn delay={0.1}>
                <InputText
                  autoFocus={!editingRoleId}
                  label={t`Role Name`}
                  placeholder={t`e.g. AP Supervisor`}
                  value={roleName}
                  required
                  error={getFieldRequiredError(
                    t`Role Name`,
                    showErrors,
                    roleName,
                  )}
                  onChange={onRoleNameChange}
                />
              </AnimateFadeIn>

              <AnimateFadeIn delay={0.15}>
                <InputTextarea
                  label={t`Description`}
                  minRows={5}
                  placeholder={t`Describe this role's responsibilities and scope...`}
                  value={description}
                  onChange={onDescriptionChange}
                />
              </AnimateFadeIn>

              <AnimateFadeIn delay={0.2}>
                <div className='space-y-1'>
                  <InputSelectMultiple
                    label={t`Select Users`}
                    options={userOptions}
                    placeholder={t`Select users...`}
                    value={selectedUsers}
                    clearable
                    required
                    searchable
                    error={
                      showErrors && !selectedUsers.length
                        ? t`Please select at least one user.`
                        : undefined
                    }
                    onChange={(value) =>
                      onSelectedUsersChange((value || []) as Option[])
                    }
                  />
                  <SettingsSelectedChips
                    className='mt-0'
                    items={selectedUsers}
                    onRemove={(id) =>
                      onSelectedUsersChange(
                        selectedUsers.filter((user) => user.id !== id),
                      )
                    }
                  />
                </div>
              </AnimateFadeIn>
            </SettingsFormSection>
          </AnimateFadeIn>
        )}

        {activeStep === 1 && (
          <AnimateFadeIn className='flex flex-col gap-6 md:gap-7' key='step-1'>
            <SettingsFormSection>
              <AnimateFadeIn delay={0.1}>
                <CreatePermissionMatrix
                  rows={permissionRows}
                  onToggle={onTogglePermission}
                />
              </AnimateFadeIn>
            </SettingsFormSection>
          </AnimateFadeIn>
        )}

        {activeStep === 2 && (
          <AnimateFadeIn className='flex flex-col gap-6 md:gap-7' key='step-2'>
            <SettingsFormSection>
              <div className='rounded-[14px] border border-[var(--border-default)] bg-surface p-6'>
                <AnimateFadeIn delay={0.1}>
                  <h3 className='text-md mb-6 font-semibold text-[var(--gray-13)]'>
                    {t`Role Summary`}
                  </h3>
                </AnimateFadeIn>
                <div className='grid grid-cols-1 gap-x-12 gap-y-4 text-sm md:grid-cols-2'>
                  <AnimateFadeIn delay={0.15}>
                    <SummaryItem label={t`Role Name`} value={roleName || '—'} />
                  </AnimateFadeIn>
                  <AnimateFadeIn delay={0.18}>
                    <SummaryItem
                      label={t`Permissions`}
                      value={t`${enabledCount} enabled`}
                    />
                  </AnimateFadeIn>
                  <AnimateFadeIn delay={0.21}>
                    <SummaryItem
                      label={t`Description`}
                      value={description || '—'}
                    />
                  </AnimateFadeIn>
                  <AnimateFadeIn delay={0.24}>
                    <SummaryItem
                      label={t`Users`}
                      value={
                        selectedUsers.length
                          ? selectedUsers.map((user) => user.name).join(', ')
                          : '—'
                      }
                    />
                  </AnimateFadeIn>
                </div>
              </div>
            </SettingsFormSection>
          </AnimateFadeIn>
        )}
      </AnimatePresence>
    </SettingsWizardLayout>
  )
}

function formatCategoryLabel(key: string): string {
  return key
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function getRolePermissionKeys(role: V6RoleItem) {
  return Array.isArray(role.permissionKeys) ? role.permissionKeys : []
}

function getStoredState() {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

function isPermissionEnabledForCategory(
  categoryKey: string,
  permissions: string[],
): boolean {
  return permissions.some(
    (permission) => normalizeRolePermissionKey(permission) === categoryKey,
  )
}

function isPermissionKeyVisible(value: unknown): boolean {
  if (value == null || value === '') return true
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value === 1
  const text = String(value).trim().toLowerCase()
  if (!text) return true
  return text === 'true' || text === '1' || text === 'yes'
}

function mapApiRoleToRole(role: V6RoleItem): Role {
  const permissionKeys = getRolePermissionKeys(role)
  const permissionsFromKeys = permissionKeys
    .filter((item) => isPermissionKeyVisible(item.visible))
    .map((item) => normalizeRolePermissionKey(String(item.key || '')))
    .filter((key) => ALLOWED_ROLE_PERMISSION_KEYS.has(key))
  const permissions = permissionsFromKeys.length
    ? permissionsFromKeys
    : Array.isArray(role.permissions)
      ? role.permissions
          .map((permission) => normalizeRolePermissionKey(String(permission)))
          .filter((key) => ALLOWED_ROLE_PERMISSION_KEYS.has(key))
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
  const permissionCount =
    typeof role.permissionCount === 'number'
      ? role.permissionCount
      : permissions.length
  const rawStatus = String(
    (role as { isActive?: boolean | string; status?: string }).status ??
      (role as { isActive?: boolean | string }).isActive ??
      'active',
  )
    .trim()
    .toLowerCase()
  const status: Role['status'] =
    rawStatus === 'inactive' ||
    rawStatus === 'disabled' ||
    rawStatus === 'false' ||
    rawStatus === '0'
      ? 'inactive'
      : 'active'

  return {
    createdAt: String(role.createdAtUtc || role.createdAt || ''),
    description: String(role.description || ''),
    id: String(role.roleId || role.id || ''),
    name: String(role.roleName || role.name || ''),
    permissionCount,
    permissions,
    status,
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
    const key = normalizeRolePermissionKey(permission)

    if (
      key &&
      !categoryKeys.has(key) &&
      ALLOWED_ROLE_PERMISSION_KEYS.has(key)
    ) {
      categories.push({
        key,
        name: getPermissionPageMeta(key)?.name || formatCategoryLabel(key),
        sortOrder: categories.length + 1,
      })
      categoryKeys.add(key)
    }
  }

  return categories.map((category) => {
    const menuItem = menus.find(
      (m) => normalizeRolePermissionKey(m.key || '') === category.key,
    )
    const isVisible = menuItem
      ? menuItem.visible === true
      : isPermissionEnabledForCategory(category.key, permissions)
    const meta = getPermissionPageMeta(category.key)
    return {
      category: category.name,
      categoryKey: category.key,
      enabled: isVisible,
      parentKey: meta?.parentKey,
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
        cell: ({ row, getValue }) => (
          <div
            className={[
              'flex items-center gap-2',
              row.original.parentKey
                ? 'pl-6 text-[var(--gray-11)]'
                : 'text-[var(--gray-13)]',
            ].join(' ')}
          >
            {row.original.parentKey ? (
              <span className='text-[var(--gray-8)]'>└</span>
            ) : null}
            <span className='text-sm font-semibold'>{getValue()}</span>
          </div>
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
      roleColumnHelper.accessor('name', {
        enableSorting: false,
        header: t`Role`,
        id: 'role',
        meta: { ...settingsHeaderMeta.start, label: t`Role` },
        minSize: 40,
        size: 180,
        cell: ({ row }) => (
          <button
            className='max-w-full text-left text-sm font-semibold text-[var(--gray-13)] transition-colors hover:underline disabled:cursor-not-allowed disabled:no-underline disabled:opacity-50'
            disabled={isLoadingRoleDetails}
            type='button'
            onClick={() => onEdit(row.original.id)}
          >
            {String(row.original.name || '')}
          </button>
        ),
      }),
      roleColumnHelper.accessor('description', {
        enableSorting: false,
        header: t`Description`,
        id: 'description',
        meta: { ...settingsHeaderMeta.start, label: t`Description` },
        minSize: 40,
        size: 240,
        cell: ({ getValue }) => {
          const value = String(getValue() || '').trim()
          return <span className='text-sm text-[var(--gray-12)]'>{value}</span>
        },
      }),
      roleColumnHelper.accessor('users', {
        enableSorting: false,
        header: t`Users`,
        id: 'users',
        meta: {
          ...settingsHeaderMeta.start,
          disableEllipsis: true,
          label: t`Users`,
        },
        minSize: 40,
        size: 100,
        cell: ({ getValue }) => (
          <span className='inline-flex items-center rounded-[10px] border border-[var(--border-default)] bg-surface px-3 py-1 font-medium text-[var(--gray-13)]'>
            {getValue()}
          </span>
        ),
      }),
      roleColumnHelper.accessor('permissionCount', {
        enableSorting: false,
        header: t`Access Pages`,
        id: 'accessPages',
        meta: {
          ...settingsHeaderMeta.start,
          disableEllipsis: true,
          label: t`Access Pages`,
        },
        minSize: 40,
        size: 120,
        cell: ({ getValue }) => (
          <span className='inline-flex items-center rounded-[10px] border border-[var(--border-default)] bg-surface px-3 py-1 font-medium text-[var(--gray-13)]'>
            {getValue()}
          </span>
        ),
      }),
      roleColumnHelper.accessor('status', {
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
        cell: ({ getValue }) => {
          const status = getValue()
          const isActive = status === 'active'
          return (
            <span
              className={[
                'inline-flex items-center rounded-[10px] border px-2.5 py-0.5 text-xs font-normal',
                isActive
                  ? 'border-[var(--green-5)] bg-[var(--green-3)] text-[var(--green-11)]'
                  : 'border-[var(--gray-4)] bg-[var(--gray-2)] text-[var(--gray-10)]',
              ].join(' ')}
            >
              {isActive ? t`Active` : t`Inactive`}
            </span>
          )
        },
      }),
      roleColumnHelper.accessor('createdAt', {
        enableSorting: false,
        header: t`Created`,
        id: 'createdAt',
        meta: { ...settingsHeaderMeta.start, label: t`Created` },
        minSize: 40,
        size: 145,
        cell: ({ getValue }) => {
          const raw = String(getValue() || '').trim()
          if (!raw) return <span />
          return <span>{formatDatetime(raw, 'datetime')}</span>
        },
      }),
      roleColumnHelper.display({
        enableResizing: false,
        enableSorting: false,
        header: '',
        id: 'actions',
        meta: settingsHeaderMeta.end,
        minSize: 56,
        size: 56,
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

  return (
    <div className='flex h-full min-h-0 flex-col'>
      <SettingsPageHeader title={t`Roles & Permissions`} onBack={onBack} />

      <div className='flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-6 py-4'>
        <CustomFilter
          activeFilters={activeFilters}
          customSearchComponent={<TableSearch table={roleTable as any} />}
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
          ]}
          showReset={
            Object.keys(activeFilters).some((k) => activeFilters[k]) ||
            !!tableSearchOptions.state.globalFilter?.value
          }
          trailingActions={
            <TableExport fileName='roles' table={roleTable as any} />
          }
          onFilterChange={(id, val) =>
            setActiveFilters((prev) => ({ ...prev, [id]: val }))
          }
          onReset={() => {
            setActiveFilters({})
            tableSearchOptions.onGlobalFilterChange({ id: '', value: '' })
          }}
        />
        <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
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
