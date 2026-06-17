import {
  Check,
  ChevronDown,
  ChevronUp,
  Edit3,
  Grid2X2,
  Plus,
  Shield,
  UserRound,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import IconButton from '@/components/base/button/IconButton'

type AssignedUser = {
  email: string
  id: number
  name: string
  role: string
}

type MenuItem = {
  id: string
  name: string
  order: number
  visible: boolean
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

type TabKey = 'roles' | 'permissions' | 'menus' | 'assignments'

const tabs: { key: TabKey; label: string }[] = [
  { key: 'roles', label: 'Role List' },
  { key: 'permissions', label: 'Permission Matrix' },
  { key: 'menus', label: 'Menu Profiles' },
  { key: 'assignments', label: 'User Assignments' },
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

const actions: PermissionAction[] = [
  'View',
  'Create',
  'Edit',
  'Delete',
  'Approve',
  'Export',
  'Manage',
]

const initialPermissionRows: PermissionRow[] = [
  {
    category: 'Dashboard',
    permissions: {
      Approve: false,
      Create: false,
      Delete: false,
      Edit: false,
      Export: false,
      Manage: true,
      View: true,
    },
  },
  {
    category: 'Invoices',
    permissions: {
      Approve: true,
      Create: true,
      Delete: true,
      Edit: true,
      Export: true,
      Manage: false,
      View: true,
    },
  },
  {
    category: 'OCR / Document Processing',
    permissions: {
      Approve: false,
      Create: false,
      Delete: false,
      Edit: false,
      Export: false,
      Manage: false,
      View: false,
    },
  },
  {
    category: 'Workflow and Approvals',
    permissions: {
      Approve: false,
      Create: false,
      Delete: false,
      Edit: false,
      Export: false,
      Manage: false,
      View: false,
    },
  },
  {
    category: 'Reports and Analytics',
    permissions: {
      Approve: false,
      Create: false,
      Delete: false,
      Edit: false,
      Export: false,
      Manage: false,
      View: false,
    },
  },
  {
    category: 'User Management',
    permissions: {
      Approve: false,
      Create: false,
      Delete: false,
      Edit: false,
      Export: false,
      Manage: false,
      View: false,
    },
  },
  {
    category: 'Folder Management',
    permissions: {
      Approve: false,
      Create: false,
      Delete: false,
      Edit: false,
      Export: false,
      Manage: false,
      View: false,
    },
  },
  {
    category: 'Integrations',
    permissions: {
      Approve: false,
      Create: false,
      Delete: false,
      Edit: false,
      Export: false,
      Manage: false,
      View: false,
    },
  },
  {
    category: 'System Settings',
    permissions: {
      Approve: false,
      Create: false,
      Delete: false,
      Edit: false,
      Export: false,
      Manage: true,
      View: true,
    },
  },
]

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
type RoleUserProps = {
  onBack?: () => void
}
export default function RolesPermissions({ onBack }: RoleUserProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('roles')
  const [roles, setRoles] = useState<Role[]>(initialRoles)
  const [selectedRoleId, setSelectedRoleId] = useState(initialRoles[0].id)
  const [permissionRows, setPermissionRows] = useState<PermissionRow[]>(
    initialPermissionRows,
  )
  const [menuItems, setMenuItems] = useState<MenuItem[]>(initialMenuItems)
  const [users, setUsers] = useState<AssignedUser[]>(initialUsers)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newRoleName, setNewRoleName] = useState('')
  const [newRoleDescription, setNewRoleDescription] = useState('')

  const selectedRole = useMemo(
    () => roles.find((role) => role.id === selectedRoleId) || roles[0],
    [roles, selectedRoleId],
  )

  const roleNames = roles.map((role) => role.name)

  const createRole = () => {
    const cleanName = newRoleName.trim()
    if (!cleanName) return

    const role: Role = {
      description:
        newRoleDescription.trim() || 'Custom role configured by administrator',
      id: cleanName.toLowerCase().replace(/\s+/g, '-'),
      name: cleanName,
      type: 'Custom',
      users: 0,
    }

    setRoles((current) => [...current, role])
    setSelectedRoleId(role.id)
    setNewRoleName('')
    setNewRoleDescription('')
    setIsCreateOpen(false)
  }

  const togglePermission = (category: string, action: PermissionAction) => {
    setPermissionRows((current) =>
      current.map((row) =>
        row.category === category
          ? {
              ...row,
              permissions: {
                ...row.permissions,
                [action]: !row.permissions[action],
              },
            }
          : row,
      ),
    )
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

  return (
    <main className='h-[calc(100vh-60px)] overflow-auto bg-[var(--surface-muted)] px-5 py-6 text-[var(--text-primary)]'>
      <section className='mx-auto max-w-[93vw]'>
        <div className='flex items-start justify-between gap-4'>
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
              <h1 className='text-lg leading-7 font-semibold text-[var(--gray-13)]'>
                Roles &amp; Permissions
              </h1>

              <p className='mt-1 text-sm leading-6 text-[var(--primary-10)]'>
                Define roles and configure granular access permissions across
                the platform.
              </p>
            </div>
          </div>

          <button
            className='inline-flex h-10 items-center gap-3 rounded-[8px] bg-[var(--primary-10)] px-5 text-sm font-semibold text-white shadow-[var(--shadow-md)] transition hover:bg-[var(--primary-10)]'
            type='button'
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus size={17} />
            Create Role
          </button>
        </div>

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
      </section>

      {isCreateOpen && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay-backdrop)] px-4'>
          <div className='w-full max-w-[460px] rounded-[14px] border border-[var(--border-default)] bg-white p-5 shadow-[var(--shadow-lg)]'>
            <div className='flex items-start justify-between gap-4'>
              <div>
                <h2 className='text-md font-semibold text-[var(--gray-13)]'>
                  Create Role
                </h2>
                <p className='mt-1 text-xs text-[var(--gray-11)]'>
                  Configure a new access role for the platform.
                </p>
              </div>

              <button
                className='rounded-md px-2 py-1 text-sm text-[var(--gray-10)] hover:bg-[var(--gray-2)]'
                type='button'
                onClick={() => setIsCreateOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className='mt-5 space-y-4'>
              <label className='block'>
                <span className='mb-2 block text-sm font-medium text-[var(--gray-13)]'>
                  Role Name
                </span>
                <input
                  className='h-10 w-full rounded-[8px] border border-[var(--border-default)] bg-white px-3 text-sm transition outline-none focus:border-[var(--primary-8)] focus:ring-2 focus:ring-[var(--primary-4)]'
                  placeholder='e.g. Finance Reviewer'
                  value={newRoleName}
                  onChange={(event) => setNewRoleName(event.target.value)}
                />
              </label>

              <label className='block'>
                <span className='mb-2 block text-sm font-medium text-[var(--gray-13)]'>
                  Description
                </span>
                <textarea
                  className='w-full resize-none rounded-[8px] border border-[var(--border-default)] bg-white px-3 py-2 text-sm transition outline-none focus:border-[var(--primary-8)] focus:ring-2 focus:ring-[var(--primary-4)]'
                  placeholder='Describe role access and responsibilities'
                  rows={4}
                  value={newRoleDescription}
                  onChange={(event) =>
                    setNewRoleDescription(event.target.value)
                  }
                />
              </label>
            </div>

            <div className='mt-6 flex justify-end gap-3'>
              <button
                className='h-9 rounded-[7px] border border-[var(--border-default)] bg-white px-4 text-sm font-medium text-[var(--gray-13)] hover:bg-[var(--gray-2)]'
                type='button'
                onClick={() => setIsCreateOpen(false)}
              >
                Cancel
              </button>
              <button
                className='h-9 rounded-[7px] bg-[var(--primary-9)] px-4 text-sm font-semibold text-white hover:bg-[var(--primary-10)]'
                type='button'
                onClick={createRole}
              >
                Save Role
              </button>
            </div>
          </div>
        </div>
      )}
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
          : 'border-[var(--primary-8)] bg-white text-transparent hover:bg-[var(--primary-2)]',
      ].join(' ')}
      onClick={onChange}
    >
      <Check size={14} strokeWidth={3} />
    </button>
  )
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

      <div className='mt-5 overflow-hidden rounded-[14px] border border-[var(--border-default)] bg-white shadow-[var(--shadow-sm)]'>
        <div className='flex items-center gap-3 border-b border-[var(--border-default)] px-5 py-4'>
          <Grid2X2 className='text-[var(--primary-9)]' size={18} />
          <h2 className='text-md font-semibold text-[var(--gray-13)]'>
            Menu Visibility for {selectedRoleName}
          </h2>
        </div>

        <div className=''>
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
                <span className='flex h-7 min-w-7 items-center justify-center rounded-[8px] border border-[var(--border-default)] bg-white px-2 text-xs font-semibold text-[var(--gray-13)]'>
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
  return (
    <>
      <RolePills
        roles={roles}
        selectedRoleId={selectedRoleId}
        onRoleChange={onRoleChange}
      />

      <div className='mt-5 rounded-[14px] border border-[var(--border-default)] bg-white shadow-[var(--shadow-sm)]'>
        <table className='w-full min-w-[920px] border-collapse text-left'>
          <thead className='sticky top-0 z-10 bg-[var(--gray-2)]'>
            <tr className='border-b border-[var(--border-default)]'>
              <th className='w-[340px] px-4 py-4 text-sm font-semibold text-[var(--gray-13)]'>
                Category
              </th>
              {actions.map((action) => (
                <th
                  className='px-4 py-4 text-center text-sm font-semibold text-[var(--gray-13)]'
                  key={action}
                >
                  {action}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr
                className='border-b border-[var(--border-default)] last:border-b-0'
                key={row.category}
              >
                <td className='px-4 py-4 text-sm font-medium text-[var(--gray-13)]'>
                  {row.category}
                </td>
                {actions.map((action) => (
                  <td className='px-4 py-4 text-center' key={action}>
                    <CheckBox
                      checked={row.permissions[action]}
                      onChange={() => onToggle(row.category, action)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function RoleList({
  roles,
  onEdit,
}: {
  roles: Role[]
  onEdit: (id: string) => void
}) {
  return (
    <div className='mt-8 space-y-4 pr-2'>
      {roles.map((role) => (
        <div
          className='flex min-h-[100px] items-center justify-between gap-4 rounded-[14px] border border-[var(--border-default)] bg-white px-6 py-5 shadow-[var(--shadow-sm)]'
          key={role.id}
        >
          <div className='flex min-w-0 items-center gap-5'>
            <div className='flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-[var(--primary-3)] text-[var(--primary-9)]'>
              <Shield size={24} strokeWidth={1.9} />
            </div>

            <div className='min-w-0'>
              <div className='flex flex-wrap items-center gap-2'>
                <h3 className='text-md leading-6 font-semibold text-[var(--gray-13)]'>
                  {role.name}
                </h3>
                <span className='rounded-[8px] border border-[var(--border-default)] bg-white px-3 py-1 text-xs font-semibold text-[var(--gray-13)]'>
                  {role.type}
                </span>
              </div>
              <p className='mt-1 text-sm leading-5 text-[var(--gray-11)]'>
                {role.description}
              </p>
            </div>
          </div>

          <div className='flex shrink-0 items-center gap-4'>
            <span className='rounded-[8px] bg-[var(--gray-2)] px-4 py-1 text-sm font-semibold text-[var(--gray-13)]'>
              {role.users} users
            </span>
            <button
              className='rounded-[8px] p-2 text-[var(--gray-13)] transition hover:bg-[var(--gray-2)] hover:text-[var(--primary-10)]'
              type='button'
              onClick={() => onEdit(role.id)}
            >
              <Edit3 size={20} />
            </button>
          </div>
        </div>
      ))}
    </div>
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
                : 'border-[var(--border-default)] bg-white text-[var(--gray-13)] hover:border-[var(--primary-6)]',
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
          'absolute top-1 h-5 w-5 rounded-full bg-white shadow transition',
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
    <div className='mt-7 inline-flex flex-wrap rounded-[10px] bg-[var(--gray-2)] p-1'>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key

        return (
          <button
            key={tab.key}
            type='button'
            className={[
              'h-9 rounded-[8px] px-5 text-sm font-medium transition',
              isActive
                ? 'bg-white text-[var(--gray-13)] shadow-[var(--shadow-sm)]'
                : 'text-[var(--gray-10)] hover:text-[var(--gray-13)]',
            ].join(' ')}
            onClick={() => onChange(tab.key)}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
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
  return (
    <>
      <p className='mt-7 ml-4 text-sm text-[var(--gray-11)]'>
        Assign users to roles directly from this view.
      </p>

      <div className='mt-5 overflow-hidden rounded-[14px] border border-[var(--border-default)] bg-white shadow-[var(--shadow-sm)]'>
        <table className='w-full min-w-[900px] border-collapse text-left'>
          <thead className='bg-[var(--gray-2)]'>
            <tr className='border-b border-[var(--border-default)]'>
              <th className='px-4 py-4 text-sm font-semibold text-[var(--gray-13)]'>
                User
              </th>
              <th className='px-4 py-4 text-sm font-semibold text-[var(--gray-13)]'>
                Email
              </th>
              <th className='px-4 py-4 text-sm font-semibold text-[var(--gray-13)]'>
                Current Role
              </th>
              <th className='px-4 py-4 text-sm font-semibold text-[var(--gray-13)]'>
                Change Role
              </th>
            </tr>
          </thead>

          <tbody>
            {users.map((user) => (
              <tr
                className='border-b border-[var(--border-default)] last:border-b-0'
                key={user.id}
              >
                <td className='px-4 py-4'>
                  <div className='flex items-center gap-3'>
                    <div className='flex h-9 w-9 items-center justify-center rounded-full bg-[var(--primary-3)] text-[var(--primary-9)]'>
                      <UserRound size={18} />
                    </div>
                    <span className='text-sm font-semibold text-[var(--gray-13)]'>
                      {user.name}
                    </span>
                  </div>
                </td>

                <td className='px-4 py-4 text-sm text-[var(--gray-11)]'>
                  {user.email}
                </td>

                <td className='px-4 py-4'>
                  <span className='rounded-[8px] bg-[var(--gray-2)] px-3 py-1 text-xs font-semibold text-[var(--gray-13)]'>
                    {user.role}
                  </span>
                </td>

                <td className='px-4 py-4'>
                  <select
                    className='h-10 w-[200px] rounded-[8px] border border-[var(--border-default)] bg-white px-3 text-sm transition outline-none focus:border-[var(--primary-8)] focus:ring-2 focus:ring-[var(--primary-4)]'
                    value={user.role}
                    onChange={(event) =>
                      onChangeRole(user.id, event.target.value)
                    }
                  >
                    {roleNames.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
