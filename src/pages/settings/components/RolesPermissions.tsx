import { createColumnHelper, useReactTable } from '@tanstack/react-table'
import {
  Check,
  ChevronDown,
  ChevronUp,
  Edit3,
  Grid2X2,
  Shield,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import DataTable from '@/components/base/data-table/DataTable'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputSelectMultiple from '@/components/base/inputs/InputSelectMultiple'
import InputText from '@/components/base/inputs/InputText'
import InputTextarea from '@/components/base/inputs/InputTextarea'
import { getDummyUserOptions } from '../data/settingsDummyData'
import {
  settingsHeaderMeta,
  settingsTableCoreOptions,
} from '../helpers/settingsDataTable'

type AssignedUser = {
  email: string
  id: number
  name: string
  role: string
}
type CreateTabKey = 'details' | 'permissions'

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

type PermissionAction =
  | 'View'
  | 'Create'
  | 'Edit'
  | 'Delete'
  | 'Approve'
  | 'Export'
  | 'Manage'

type PermissionRow = {
  category: string
  permissions: Record<PermissionAction, boolean>
}

type Role = {
  description: string
  id: string
  name: string
  type: 'System' | 'Custom'
  users: number
}

type RoleUserProps = {
  onBack?: () => void
}

type TabKey = 'roles' | 'permissions' | 'menus' | 'assignments'

const tabs: { key: TabKey; label: string }[] = [
  { key: 'roles', label: 'Role List' },
  { key: 'permissions', label: 'Permission Matrix' },
  { key: 'menus', label: 'Menu Profiles' },
  { key: 'assignments', label: 'User Assignments' },
]

const actions: PermissionAction[] = [
  'View',
  'Create',
  'Edit',
  'Delete',
  'Approve',
  'Export',
  'Manage',
]

const initialRoles: Role[] = [
  {
    description: 'Full system access with all permissions',
    id: 'system-admin',
    name: 'System Administrator',
    type: 'System',
    users: 2,
  },
  {
    description: 'Manage AP operations, approve invoices, and supervise team',
    id: 'ap-manager',
    name: 'AP Manager',
    type: 'System',
    users: 5,
  },
  {
    description:
      'Process invoices, handle exceptions, and perform daily AP tasks',
    id: 'ap-officer',
    name: 'AP Officer',
    type: 'System',
    users: 12,
  },
  {
    description: 'Submit invoices, track status, and view assigned documents',
    id: 'business-user',
    name: 'Business User',
    type: 'System',
    users: 45,
  },
  {
    description: 'Read-only access with full audit trail visibility',
    id: 'auditor',
    name: 'Auditor',
    type: 'System',
    users: 3,
  },
  {
    description: 'View assigned records without modification rights',
    id: 'read-only',
    name: 'Read Only User',
    type: 'System',
    users: 8,
  },
]

const emptyPermissionRows: PermissionRow[] = [
  'Dashboard',
  'Invoices',
  'OCR / Document Processing',
  'Workflow & Approvals',
  'Reports & Analytics',
  'User Management',
  'Folder Management',
  'Integrations',
  'System Settings',
].map((category) => ({
  category,
  permissions: actions.reduce(
    (acc, action) => ({ ...acc, [action]: false }),
    {} as Record<PermissionAction, boolean>,
  ),
}))

const initialPermissionRows: PermissionRow[] = emptyPermissionRows.map(
  (row) => ({
    ...row,
    permissions:
      row.category === 'Dashboard'
        ? { ...row.permissions, Manage: true, View: true }
        : row.category === 'Invoices'
          ? {
              Approve: true,
              Create: true,
              Delete: true,
              Edit: true,
              Export: true,
              Manage: false,
              View: true,
            }
          : row.category === 'System Settings'
            ? { ...row.permissions, Manage: true, View: true }
            : row.permissions,
  }),
)

const initialMenuItems: MenuItem[] = [
  { id: 'invoices', name: 'Invoices', order: 1, visible: true },
  { id: 'workflow', name: 'Workflow', order: 2, visible: true },
  { id: 'reports', name: 'Reports', order: 3, visible: true },
  { id: 'dashboard', name: 'Dashboard', order: 4, visible: true },
  { id: 'vendors', name: 'Vendors', order: 5, visible: true },
  { id: 'dms', name: 'Document Management', order: 6, visible: true },
  { id: 'settings', name: 'Settings', order: 7, visible: true },
  { id: 'audit', name: 'Audit Log', order: 8, visible: true },
]

const initialUsers: AssignedUser[] = [
  { email: 'john@company.com', id: 1, name: 'John Doe', role: 'AP Manager' },
  {
    email: 'sarah@company.com',
    id: 2,
    name: 'Sarah Miller',
    role: 'AP Officer',
  },
  {
    email: 'mike@company.com',
    id: 3,
    name: 'Mike Ross',
    role: 'Business User',
  },
  { email: 'lisa@company.com', id: 4, name: 'Lisa Chen', role: 'Auditor' },
  {
    email: 'tom@company.com',
    id: 5,
    name: 'Tom Wilson',
    role: 'Read Only User',
  },
]

const roleColumnHelper = createColumnHelper<Role>()
const permissionColumnHelper = createColumnHelper<PermissionRow>()
const userAssignmentColumnHelper = createColumnHelper<AssignedUser>()

export default function RolesPermissions({ onBack }: RoleUserProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('roles')
  const [roles, setRoles] = useState<Role[]>(initialRoles)
  const [selectedRoleId, setSelectedRoleId] = useState(initialRoles[0].id)
  const [permissionRows, setPermissionRows] = useState<PermissionRow[]>(
    initialPermissionRows,
  )
  const [menuItems, setMenuItems] = useState<MenuItem[]>(initialMenuItems)
  const [users, setUsers] = useState<AssignedUser[]>(initialUsers)
  const [isCreatingRole, setIsCreatingRole] = useState(false)
  const [createTab, setCreateTab] = useState<CreateTabKey>('details')
  const [newRoleName, setNewRoleName] = useState('')
  const [newRoleDescription, setNewRoleDescription] = useState('')
  const [selectedUsers, setSelectedUsers] = useState<Option[]>([])
  const [newPermissionRows, setNewPermissionRows] =
    useState<PermissionRow[]>(emptyPermissionRows)

  const userOptions: Option[] = useMemo(() => getDummyUserOptions(), [])

  const selectedRole = useMemo(
    () => roles.find((role) => role.id === selectedRoleId) || roles[0],
    [roles, selectedRoleId],
  )

  const roleNames = useMemo(() => roles.map((role) => role.name), [roles])

  const resetCreateRole = () => {
    setIsCreatingRole(false)
    setCreateTab('details')
    setNewRoleName('')
    setNewRoleDescription('')
    setSelectedUsers([])
    setNewPermissionRows(emptyPermissionRows)
  }

  const createRole = () => {
    const cleanName = newRoleName.trim()
    if (!cleanName) return

    const role: Role = {
      description:
        newRoleDescription.trim() || 'Custom role configured by administrator',
      id: `${cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`,
      name: cleanName,
      type: 'Custom',
      users: selectedUsers.length,
    }

    setRoles((current) => [...current, role])
    setUsers((current) =>
      current.map((user) =>
        selectedUsers.some(
          (selectedUser) => selectedUser.id === String(user.id),
        )
          ? { ...user, role: cleanName }
          : user,
      ),
    )
    setSelectedRoleId(role.id)
    setPermissionRows(newPermissionRows)
    resetCreateRole()
    setActiveTab('permissions')
  }

  const togglePermission = (category: string, action: PermissionAction) => {
    setPermissionRows((current) =>
      togglePermissionByAction(current, category, action),
    )
  }

  const toggleNewPermission = (category: string, action: PermissionAction) => {
    setNewPermissionRows((current) =>
      togglePermissionByAction(current, category, action),
    )
  }

  const toggleNewCategory = (category: string) => {
    setNewPermissionRows((current) => toggleCategory(current, category))
  }

  const toggleNewColumn = (action: PermissionAction) => {
    setNewPermissionRows((current) => toggleColumn(current, action))
  }

  const toggleMenu = (id: string) => {
    setMenuItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, visible: !item.visible } : item,
      ),
    )
  }

  const moveMenu = (id: string, direction: 'up' | 'down') => {
    setMenuItems((current) => {
      const sorted = [...current].sort((a, b) => a.order - b.order)
      const index = sorted.findIndex((item) => item.id === id)
      const targetIndex = direction === 'up' ? index - 1 : index + 1

      if (targetIndex < 0 || targetIndex >= sorted.length) return current

      const currentOrder = sorted[index].order
      sorted[index].order = sorted[targetIndex].order
      sorted[targetIndex].order = currentOrder

      return sorted.sort((a, b) => a.order - b.order)
    })
  }

  const changeUserRole = (id: number, role: string) => {
    setUsers((current) =>
      current.map((user) => (user.id === id ? { ...user, role } : user)),
    )
  }

  if (isCreatingRole) {
    return (
      <CreateRolePage
        activeTab={createTab}
        description={newRoleDescription}
        permissionRows={newPermissionRows}
        roleName={newRoleName}
        selectedUsers={selectedUsers}
        userOptions={userOptions}
        onBack={resetCreateRole}
        onCancel={resetCreateRole}
        onCreate={createRole}
        onDescriptionChange={setNewRoleDescription}
        onRoleNameChange={setNewRoleName}
        onSelectedUsersChange={setSelectedUsers}
        onTabChange={setCreateTab}
        onToggleCategory={toggleNewCategory}
        onToggleColumn={toggleNewColumn}
        onTogglePermission={toggleNewPermission}
      />
    )
  }

  return (
    <main className='min-h-full bg-[var(--surface)]'>
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
                Roles &amp; Permissions
              </h1>
              <p className='text-13/5 text-gray-11'>
                Define roles and configure granular access permissions across
                the platform.
              </p>
            </div>
          </div>
          <Button
            className='justify-center gap-3 border border-primary-10 bg-primary-11 text-surface'
            icon='lucide:plus'
            label='Create Role'
            variant='outline'
            onClick={() => setIsCreatingRole(true)}
          />
        </div>

        <div className='px-6 py-4 md:px-8'>
          <Tabs activeTab={activeTab} onChange={setActiveTab} />

          {activeTab === 'roles' && (
            <RoleList roles={roles} onEdit={(id) => setSelectedRoleId(id)} />
          )}

          {activeTab === 'permissions' && (
            <PermissionMatrix
              roles={roles}
              rows={permissionRows}
              selectedRoleId={selectedRoleId}
              onRoleChange={setSelectedRoleId}
              onToggle={togglePermission}
            />
          )}

          {activeTab === 'menus' && (
            <MenuProfiles
              items={menuItems}
              roles={roles}
              selectedRoleId={selectedRoleId}
              selectedRoleName={selectedRole.name}
              onMove={moveMenu}
              onRoleChange={setSelectedRoleId}
              onToggle={toggleMenu}
            />
          )}

          {activeTab === 'assignments' && (
            <UserAssignments
              roleNames={roleNames}
              users={users}
              onChangeRole={changeUserRole}
            />
          )}
        </div>
      </section>
    </main>
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
  return rows.reduce(
    (total, row) =>
      total + actions.filter((action) => row.permissions[action]).length,
    0,
  )
}

function CreatePermissionMatrix({
  rows,
  onToggle,
  onToggleCategory,
  onToggleColumn,
}: {
  rows: PermissionRow[]
  onToggle: (category: string, action: PermissionAction) => void
  onToggleCategory: (category: string) => void
  onToggleColumn: (action: PermissionAction) => void
}) {
  const permissionColumns = useMemo(
    () => [
      permissionColumnHelper.accessor('category', {
        enableSorting: false,
        header: 'Category',
        id: 'category',
        meta: settingsHeaderMeta.start,
        size: 290,
        cell: ({ row }) => {
          const isRowEnabled = actions.some(
            (action) => row.original.permissions[action],
          )
          return (
            <button
              className='flex items-center gap-3 text-left'
              type='button'
              onClick={() => onToggleCategory(row.original.category)}
            >
              <CheckBox
                checked={isRowEnabled}
                onChange={() => onToggleCategory(row.original.category)}
              />
              <span className='text-sm font-semibold text-[var(--gray-13)]'>
                {row.original.category}
              </span>
            </button>
          )
        },
      }),
      ...actions.map((action) =>
        permissionColumnHelper.display({
          enableSorting: false,
          id: action,
          meta: settingsHeaderMeta.center,
          size: 112,
          cell: ({ row }) => (
            <div className='flex justify-center'>
              <CheckBox
                checked={row.original.permissions[action]}
                onChange={() => onToggle(row.original.category, action)}
              />
            </div>
          ),
          header: () => (
            <button
              className='flex w-full flex-col items-center justify-center gap-1 text-center'
              type='button'
              onClick={() => onToggleColumn(action)}
            >
              <span>{action}</span>
              <span className='text-[11px] font-medium text-[var(--gray-10)]'>
                {rows.filter((row) => row.permissions[action]).length}/
                {rows.length}
              </span>
            </button>
          ),
        }),
      ),
    ],
    [onToggle, onToggleCategory, onToggleColumn, rows],
  )

  const permissionTable = useReactTable({
    ...settingsTableCoreOptions,
    columns: permissionColumns,
    data: rows,
    getRowId: (row) => row.category,
  })

  return (
    <div>
      <DataTable
        component={<div />}
        isLoading={false}
        isReLoading={false}
        pageSize={Math.max(9, rows.length || 9)}
        table={permissionTable}
        tableBodyMaxHeight='calc(100vh - 330px)'
        hideGrouping
        stickyHeader
        onReload={() => undefined}
      />

      <p className='mt-3 text-13/5 text-gray-11'>
        Click a category name to toggle the full row. Click a column header to
        toggle that permission for all categories.
      </p>
    </div>
  )
}

function CreateRolePage({
  activeTab,
  description,
  permissionRows,
  roleName,
  selectedUsers,
  userOptions,
  onBack,
  onCancel,
  onCreate,
  onDescriptionChange,
  onRoleNameChange,
  onSelectedUsersChange,
  onTabChange,
  onToggleCategory,
  onToggleColumn,
  onTogglePermission,
}: {
  activeTab: CreateTabKey
  description: string
  permissionRows: PermissionRow[]
  roleName: string
  selectedUsers: Option[]
  userOptions: Option[]
  onBack: () => void
  onCancel: () => void
  onCreate: () => void
  onDescriptionChange: (value: string) => void
  onRoleNameChange: (value: string) => void
  onSelectedUsersChange: (value: Option[]) => void
  onTabChange: (tab: CreateTabKey) => void
  onToggleCategory: (category: string) => void
  onToggleColumn: (action: PermissionAction) => void
  onTogglePermission: (category: string, action: PermissionAction) => void
}) {
  const enabledCount = useMemo(
    () => countEnabledPermissions(permissionRows),
    [permissionRows],
  )
  const canCreate = roleName.trim().length > 0 && selectedUsers.length > 0

  return (
    <main className='flex min-h-full flex-col bg-[var(--surface-secondary)]'>
      <div className='flex items-center justify-between border-b border-gray-3 bg-surface px-6 py-4 md:px-8'>
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
            <div className='flex items-center gap-2'>
              <ShieldCheck className='text-[var(--primary-9)]' size={19} />
              <h1 className='text-18/6 font-semibold tracking-tight text-gray-13'>
                Create New Role
              </h1>
            </div>
            <p className='mt-1 text-13/5 text-gray-11'>
              Configure role identity and permission controls in one full-page
              workspace.
            </p>
          </div>
        </div>
      </div>

      <div className='flex flex-1 flex-col px-6 py-4 md:px-8'>
        <div className='border-b border-[var(--border-default)]'>
          <button
            className={getCreateTabClass(activeTab === 'details')}
            type='button'
            onClick={() => onTabChange('details')}
          >
            Role Details
          </button>
          <button
            className={getCreateTabClass(activeTab === 'permissions')}
            type='button'
            onClick={() => onTabChange('permissions')}
          >
            Permissions ({enabledCount} Enabled)
          </button>
        </div>

        <div className='flex-1 py-5'>
          {activeTab === 'details' ? (
            <RoleDetailsForm
              description={description}
              roleName={roleName}
              selectedUsers={selectedUsers}
              userOptions={userOptions}
              onDescriptionChange={onDescriptionChange}
              onRoleNameChange={onRoleNameChange}
              onSelectedUsersChange={onSelectedUsersChange}
            />
          ) : (
            <CreatePermissionMatrix
              rows={permissionRows}
              onToggle={onTogglePermission}
              onToggleCategory={onToggleCategory}
              onToggleColumn={onToggleColumn}
            />
          )}
        </div>
      </div>

      <div className='sticky bottom-0 flex justify-end gap-3 border-t border-[var(--border-default)] bg-surface px-6 py-4 shadow-[var(--shadow-sm)] md:px-8'>
        <button
          className='h-10 rounded-[10px] border border-[var(--border-default)] bg-surface px-5 text-sm font-semibold text-[var(--gray-13)] shadow-[var(--shadow-sm)] transition hover:bg-[var(--gray-2)]'
          type='button'
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          className='h-10 rounded-[10px] bg-[var(--primary-9)] px-5 text-sm font-semibold text-white shadow-[var(--shadow-md)] transition hover:bg-[var(--primary-10)] disabled:cursor-not-allowed disabled:opacity-50'
          disabled={!canCreate}
          type='button'
          onClick={onCreate}
        >
          Create Role
        </button>
      </div>
    </main>
  )
}

function getCreateTabClass(isActive: boolean) {
  return [
    'h-11 border-b-2 px-4 text-sm font-medium transition',
    isActive
      ? 'border-[var(--primary-9)] text-[var(--primary-9)]'
      : 'border-transparent text-[var(--gray-11)] hover:text-[var(--gray-13)]',
  ].join(' ')
}

function MenuProfiles({
  items,
  roles,
  selectedRoleId,
  selectedRoleName,
  onMove,
  onRoleChange,
  onToggle,
}: {
  items: MenuItem[]
  roles: Role[]
  selectedRoleId: string
  selectedRoleName: string
  onMove: (id: string, direction: 'up' | 'down') => void
  onRoleChange: (id: string) => void
  onToggle: (id: string) => void
}) {
  const orderedItems = [...items].sort((a, b) => a.order - b.order)

  return (
    <>
      <RolePills
        roles={roles}
        selectedRoleId={selectedRoleId}
        onRoleChange={onRoleChange}
      />
      <div className='mt-5 overflow-hidden rounded-[14px] border border-[var(--border-default)] bg-surface shadow-[var(--shadow-sm)]'>
        <div className='flex items-center gap-3 border-b border-[var(--border-default)] px-5 py-4'>
          <Grid2X2 className='text-[var(--primary-9)]' size={18} />
          <h2 className='text-md font-semibold text-[var(--gray-13)]'>
            Menu Visibility for {selectedRoleName}
          </h2>
        </div>

        <div>
          {orderedItems.map((item) => (
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
          ))}
        </div>
      </div>
    </>
  )
}

function PermissionMatrix({
  roles,
  rows,
  selectedRoleId,
  onRoleChange,
  onToggle,
}: {
  roles: Role[]
  rows: PermissionRow[]
  selectedRoleId: string
  onRoleChange: (id: string) => void
  onToggle: (category: string, action: PermissionAction) => void
}) {
  const permissionColumns = useMemo(
    () => [
      permissionColumnHelper.accessor('category', {
        enableSorting: false,
        header: 'Category',
        id: 'category',
        meta: settingsHeaderMeta.start,
        minSize: 200,
        size: 240,
        cell: ({ getValue }) => (
          <span className='text-sm font-semibold text-[var(--gray-13)]'>
            {getValue()}
          </span>
        ),
      }),
      ...actions.map((action) =>
        permissionColumnHelper.display({
          enableSorting: false,
          header: action,
          id: action,
          meta: settingsHeaderMeta.center,
          minSize: 100,
          size: 112,
          cell: ({ row }) => (
            <div className='flex justify-center'>
              <CheckBox
                checked={row.original.permissions[action]}
                onChange={() => onToggle(row.original.category, action)}
              />
            </div>
          ),
        }),
      ),
    ],
    [onToggle],
  )

  const permissionTable = useReactTable({
    ...settingsTableCoreOptions,
    columns: permissionColumns,
    data: rows,
    getRowId: (row) => row.category,
  })

  return (
    <>
      <RolePills
        roles={roles}
        selectedRoleId={selectedRoleId}
        onRoleChange={onRoleChange}
      />
      <DataTable
        component={<div />}
        isLoading={false}
        isReLoading={false}
        pageSize={Math.max(5, rows.length || 5)}
        table={permissionTable}
        tableBodyMaxHeight='calc(100vh - 380px)'
        hideGrouping
        stickyHeader
        onReload={() => undefined}
      />
    </>
  )
}

function RoleDetailsForm({
  description,
  roleName,
  selectedUsers,
  userOptions,
  onDescriptionChange,
  onRoleNameChange,
  onSelectedUsersChange,
}: {
  description: string
  roleName: string
  selectedUsers: Option[]
  userOptions: Option[]
  onDescriptionChange: (value: string) => void
  onRoleNameChange: (value: string) => void
  onSelectedUsersChange: (value: Option[]) => void
}) {
  return (
    <div className='max-w-[980px] space-y-5'>
      <InputText
        label='Role Name'
        placeholder='e.g. AP Supervisor'
        value={roleName}
        required
        onChange={onRoleNameChange}
      />

      <InputSelectMultiple
        className='bg-surface'
        label='Select Users'
        options={userOptions}
        placeholder='Select users...'
        value={selectedUsers}
        clearable
        required
        searchable
        onChange={(value) => onSelectedUsersChange(value as Option[])}
      />

      <InputTextarea
        label='Description'
        minRows={5}
        placeholder="Describe this role's responsibilities and scope..."
        value={description}
        onChange={onDescriptionChange}
      />
    </div>
  )
}

function RoleList({
  roles,
  onEdit,
}: {
  roles: Role[]
  onEdit: (id: string) => void
}) {
  const roleColumns = useMemo(
    () => [
      roleColumnHelper.display({
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
            <div className='flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-[var(--primary-3)] text-[var(--primary-9)]'>
              <Shield size={22} />
            </div>
          </div>
        ),
      }),
      roleColumnHelper.display({
        enableSorting: false,
        header: 'Role',
        id: 'role',
        meta: settingsHeaderMeta.start,
        minSize: 280,
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
        header: 'Type',
        id: 'type',
        meta: settingsHeaderMeta.start,
        minSize: 140,
        size: 180,
        cell: ({ getValue }) => (
          <span className='rounded-[8px] border border-[var(--border-default)] bg-surface px-3 py-1 text-xs font-semibold text-[var(--gray-13)]'>
            {getValue()}
          </span>
        ),
      }),
      roleColumnHelper.accessor('users', {
        enableSorting: false,
        header: 'Users',
        id: 'users',
        meta: settingsHeaderMeta.start,
        minSize: 120,
        size: 160,
        cell: ({ getValue }) => (
          <span className='rounded-[8px] bg-[var(--gray-2)] px-4 py-1 text-sm font-semibold text-[var(--gray-13)]'>
            {getValue()} users
          </span>
        ),
      }),
      roleColumnHelper.display({
        enableResizing: false,
        enableSorting: false,
        header: 'Actions',
        id: 'actions',
        meta: settingsHeaderMeta.end,
        minSize: 80,
        size: 100,
        cell: ({ row }) => (
          <div className='flex justify-end'>
            <button
              className='rounded-[8px] p-2 text-[var(--gray-13)] hover:bg-[var(--gray-2)]'
              type='button'
              onClick={() => onEdit(row.original.id)}
            >
              <Edit3 size={20} />
            </button>
          </div>
        ),
      }),
    ],
    [onEdit],
  )

  const roleTable = useReactTable({
    ...settingsTableCoreOptions,
    columns: roleColumns,
    data: roles,
    getRowId: (row) => row.id,
  })

  return (
    <DataTable
      component={<div />}
      isLoading={false}
      isReLoading={false}
      pageSize={Math.max(6, roles.length || 6)}
      table={roleTable}
      tableBodyMaxHeight='420px'
      hideGrouping
      stickyHeader
      onReload={() => undefined}
    />
  )
}

function RolePills({
  roles,
  selectedRoleId,
  onRoleChange,
}: {
  roles: Role[]
  selectedRoleId: string
  onRoleChange: (id: string) => void
}) {
  return (
    <div className='mt-7 flex flex-wrap gap-2'>
      {roles.map((role) => {
        const selected = role.id === selectedRoleId

        return (
          <button
            key={role.id}
            type='button'
            className={[
              'h-10 rounded-[10px] border px-4 text-sm font-semibold transition',
              selected
                ? 'border-[var(--primary-9)] bg-[var(--primary-9)] text-white shadow-[var(--shadow-sm)]'
                : 'border-[var(--border-default)] bg-surface text-[var(--gray-13)] hover:border-[var(--primary-6)]',
            ].join(' ')}
            onClick={() => onRoleChange(role.id)}
          >
            {role.name}
          </button>
        )
      })}
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

function Tabs({
  activeTab,
  onChange,
}: {
  activeTab: TabKey
  onChange: (tab: TabKey) => void
}) {
  return (
    <div className='flex h-14 items-center border-b border-gray-3 bg-surface px-6'>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key

        return (
          <button
            key={tab.key}
            type='button'
            className={[
              'relative mr-9 flex h-14 items-center text-sm font-medium transition',
              isActive ? 'text-primary-9' : 'text-gray-12 hover:text-primary-9',
            ].join(' ')}
            onClick={() => onChange(tab.key)}
          >
            {tab.label}

            {isActive && (
              <span className='absolute bottom-0 left-0 h-[2px] w-full bg-primary-9' />
            )}
          </button>
        )
      })}
    </div>
  )
}

function toggleCategory(rows: PermissionRow[], category: string) {
  return rows.map((row) => {
    if (row.category !== category) return row

    const shouldEnable = actions.some((action) => !row.permissions[action])
    return {
      ...row,
      permissions: actions.reduce(
        (acc, action) => ({ ...acc, [action]: shouldEnable }),
        {} as Record<PermissionAction, boolean>,
      ),
    }
  })
}

function toggleColumn(rows: PermissionRow[], action: PermissionAction) {
  const shouldEnable = rows.some((row) => !row.permissions[action])

  return rows.map((row) => ({
    ...row,
    permissions: {
      ...row.permissions,
      [action]: shouldEnable,
    },
  }))
}

function togglePermissionByAction(
  rows: PermissionRow[],
  category: string,
  action: PermissionAction,
) {
  return rows.map((row) =>
    row.category === category
      ? {
          ...row,
          permissions: {
            ...row.permissions,
            [action]: !row.permissions[action],
          },
        }
      : row,
  )
}

function UserAssignments({
  roleNames,
  users,
  onChangeRole,
}: {
  roleNames: string[]
  users: AssignedUser[]
  onChangeRole: (id: number, role: string) => void
}) {
  const userAssignmentColumns = useMemo(
    () => [
      userAssignmentColumnHelper.display({
        enableResizing: false,
        enableSorting: false,
        header: '',
        id: 'avatar',
        maxSize: 56,
        meta: settingsHeaderMeta.center,
        minSize: 56,
        size: 56,
        cell: () => (
          <div className='flex justify-center'>
            <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--primary-3)] text-[var(--primary-9)]'>
              <UserRound size={18} />
            </div>
          </div>
        ),
      }),
      userAssignmentColumnHelper.accessor('name', {
        enableSorting: false,
        header: 'User',
        id: 'name',
        meta: settingsHeaderMeta.start,
        minSize: 160,
        size: 200,
        cell: ({ getValue }) => (
          <span className='text-sm font-semibold text-[var(--gray-13)]'>
            {getValue()}
          </span>
        ),
      }),
      userAssignmentColumnHelper.accessor('email', {
        enableSorting: false,
        header: 'Email',
        id: 'email',
        meta: settingsHeaderMeta.start,
        minSize: 200,
        size: 240,
        cell: ({ getValue }) => (
          <span className='text-sm text-[var(--gray-11)]'>{getValue()}</span>
        ),
      }),
      userAssignmentColumnHelper.accessor('role', {
        enableSorting: false,
        header: 'Current Role',
        id: 'role',
        meta: settingsHeaderMeta.start,
        minSize: 140,
        size: 160,
        cell: ({ getValue }) => (
          <span className='rounded-[8px] bg-[var(--gray-2)] px-3 py-1 text-xs font-semibold text-[var(--gray-13)]'>
            {getValue()}
          </span>
        ),
      }),
      userAssignmentColumnHelper.display({
        enableSorting: false,
        header: 'Change Role',
        id: 'changeRole',
        meta: settingsHeaderMeta.start,
        minSize: 220,
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
    [onChangeRole, roleNames],
  )

  const userAssignmentTable = useReactTable({
    ...settingsTableCoreOptions,
    columns: userAssignmentColumns,
    data: users,
    getRowId: (row) => String(row.id),
  })

  return (
    <>
      <p className='mt-7 ml-4 text-sm text-[var(--gray-11)]'>
        Assign users to roles directly from this view.
      </p>
      <DataTable
        component={<div />}
        isLoading={false}
        isReLoading={false}
        pageSize={Math.max(5, users.length || 5)}
        table={userAssignmentTable}
        tableBodyMaxHeight='calc(100vh - 390px)'
        hideGrouping
        stickyHeader
        onReload={() => undefined}
      />
      <div className='flex justify-end px-4 py-4'>
        <button
          className='h-10 rounded-[8px] bg-[var(--primary-9)] px-5 text-sm font-semibold text-white shadow-[var(--shadow-md)] transition hover:bg-[var(--primary-10)]'
          type='button'
        >
          Save Assignments
        </button>
      </div>
    </>
  )
}
