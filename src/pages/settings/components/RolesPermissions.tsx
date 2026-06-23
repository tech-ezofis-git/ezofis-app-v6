import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Edit3,
  Grid2X2,
  Plus,
  Shield,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import IconButton from "@/components/base/button/IconButton";
import DataTable from "@/components/base/data-table/DataTable";
import InputSelectMultiple from "@/components/base/inputs/InputSelectMultiple";
import {
  getGroupListQueryOptions,
  getUserListQueryOptions,
} from "@/api/userQueries";
import Button from '@/components/base/button/Button'

type TabKey = "roles" | "permissions" | "menus" | "assignments";
type CreateTabKey = "details" | "permissions";

type Role = {
  id: string;
  name: string;
  description: string;
  type: "System" | "Custom";
  users: number;
};

type PermissionAction =
  | "View"
  | "Create"
  | "Edit"
  | "Delete"
  | "Approve"
  | "Export"
  | "Manage";

type PermissionRow = {
  category: string;
  permissions: Record<PermissionAction, boolean>;
};

type MenuItem = {
  id: string;
  name: string;
  visible: boolean;
  order: number;
};

type AssignedUser = {
  id: number;
  name: string;
  email: string;
  role: string;
};

type Option = {
  id: string;
  name: string;
  description?: string;
  disabled?: boolean;
  value?: string;
};

type RoleUserProps = {
  onBack?: () => void;
};

const tabs: { key: TabKey; label: string }[] = [
  { key: "roles", label: "Role List" },
  { key: "permissions", label: "Permission Matrix" },
  { key: "menus", label: "Menu Profiles" },
  { key: "assignments", label: "User Assignments" },
];

const actions: PermissionAction[] = [
  "View",
  "Create",
  "Edit",
  "Delete",
  "Approve",
  "Export",
  "Manage",
];

const initialRoles: Role[] = [
  {
    id: "system-admin",
    name: "System Administrator",
    description: "Full system access with all permissions",
    type: "System",
    users: 2,
  },
  {
    id: "ap-manager",
    name: "AP Manager",
    description: "Manage AP operations, approve invoices, and supervise team",
    type: "System",
    users: 5,
  },
  {
    id: "ap-officer",
    name: "AP Officer",
    description: "Process invoices, handle exceptions, and perform daily AP tasks",
    type: "System",
    users: 12,
  },
  {
    id: "business-user",
    name: "Business User",
    description: "Submit invoices, track status, and view assigned documents",
    type: "System",
    users: 45,
  },
  {
    id: "auditor",
    name: "Auditor",
    description: "Read-only access with full audit trail visibility",
    type: "System",
    users: 3,
  },
  {
    id: "read-only",
    name: "Read Only User",
    description: "View assigned records without modification rights",
    type: "System",
    users: 8,
  },
];

const emptyPermissionRows: PermissionRow[] = [
  "Dashboard",
  "Invoices",
  "OCR / Document Processing",
  "Workflow & Approvals",
  "Reports & Analytics",
  "User Management",
  "Folder Management",
  "Integrations",
  "System Settings",
].map((category) => ({
  category,
  permissions: actions.reduce(
    (acc, action) => ({ ...acc, [action]: false }),
    {} as Record<PermissionAction, boolean>,
  ),
}));

const initialPermissionRows: PermissionRow[] = emptyPermissionRows.map((row) => ({
  ...row,
  permissions:
    row.category === "Dashboard"
      ? { ...row.permissions, View: true, Manage: true }
      : row.category === "Invoices"
        ? {
            View: true,
            Create: true,
            Edit: true,
            Delete: true,
            Approve: true,
            Export: true,
            Manage: false,
          }
        : row.category === "System Settings"
          ? { ...row.permissions, View: true, Manage: true }
          : row.permissions,
}));

const initialMenuItems: MenuItem[] = [
  { id: "invoices", name: "Invoices", visible: true, order: 1 },
  { id: "workflow", name: "Workflow", visible: true, order: 2 },
  { id: "reports", name: "Reports", visible: true, order: 3 },
  { id: "dashboard", name: "Dashboard", visible: true, order: 4 },
  { id: "vendors", name: "Vendors", visible: true, order: 5 },
  { id: "dms", name: "Document Management", visible: true, order: 6 },
  { id: "settings", name: "Settings", visible: true, order: 7 },
  { id: "audit", name: "Audit Log", visible: true, order: 8 },
];

const initialUsers: AssignedUser[] = [
  { id: 1, name: "John Doe", email: "john@company.com", role: "AP Manager" },
  { id: 2, name: "Sarah Miller", email: "sarah@company.com", role: "AP Officer" },
  { id: 3, name: "Mike Ross", email: "mike@company.com", role: "Business User" },
  { id: 4, name: "Lisa Chen", email: "lisa@company.com", role: "Auditor" },
  { id: 5, name: "Tom Wilson", email: "tom@company.com", role: "Read Only User" },
];

const roleColumnHelper = createColumnHelper<Role>();
const permissionColumnHelper = createColumnHelper<PermissionRow>();
const userAssignmentColumnHelper = createColumnHelper<AssignedUser>();

export default function RolesPermissions({ onBack }: RoleUserProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("roles");
  const [roles, setRoles] = useState<Role[]>(initialRoles);
  const [selectedRoleId, setSelectedRoleId] = useState(initialRoles[0].id);
  const [permissionRows, setPermissionRows] = useState<PermissionRow[]>(initialPermissionRows);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(initialMenuItems);
  const [users, setUsers] = useState<AssignedUser[]>(initialUsers);
  const [isCreatingRole, setIsCreatingRole] = useState(false);
  const [createTab, setCreateTab] = useState<CreateTabKey>("details");
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<Option[]>([]);
  const [newPermissionRows, setNewPermissionRows] = useState<PermissionRow[]>(emptyPermissionRows);

  const { data: userData } = useQuery(getUserListQueryOptions());
  const { data: groupData } = useQuery(getGroupListQueryOptions());
  void groupData;

  const userOptions: Option[] = useMemo(() => {
    const users = userData as any[];
    if (!users || !Array.isArray(users)) return [];

    return users.map((user: any) => ({
      id: String(user.id || user.value),
      name: String(user.value || user.loginName || user.name || "Unknown User"),
    }));
  }, [userData]);

  const selectedRole = useMemo(
    () => roles.find((role) => role.id === selectedRoleId) || roles[0],
    [roles, selectedRoleId],
  );

  const roleNames = useMemo(() => roles.map((role) => role.name), [roles]);

  const resetCreateRole = () => {
    setIsCreatingRole(false);
    setCreateTab("details");
    setNewRoleName("");
    setNewRoleDescription("");
    setSelectedUsers([]);
    setNewPermissionRows(emptyPermissionRows);
  };

  const createRole = () => {
    const cleanName = newRoleName.trim();
    if (!cleanName) return;

    const role: Role = {
      id: `${cleanName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`,
      name: cleanName,
      description: newRoleDescription.trim() || "Custom role configured by administrator",
      type: "Custom",
      users: selectedUsers.length,
    };

    setRoles((current) => [...current, role]);
    setUsers((current) =>
      current.map((user) =>
        selectedUsers.some((selectedUser) => selectedUser.id === String(user.id))
          ? { ...user, role: cleanName }
          : user,
      ),
    );
    setSelectedRoleId(role.id);
    setPermissionRows(newPermissionRows);
    resetCreateRole();
    setActiveTab("permissions");
  };

  const togglePermission = (category: string, action: PermissionAction) => {
    setPermissionRows((current) => togglePermissionByAction(current, category, action));
  };

  const toggleNewPermission = (category: string, action: PermissionAction) => {
    setNewPermissionRows((current) => togglePermissionByAction(current, category, action));
  };

  const toggleNewCategory = (category: string) => {
    setNewPermissionRows((current) => toggleCategory(current, category));
  };

  const toggleNewColumn = (action: PermissionAction) => {
    setNewPermissionRows((current) => toggleColumn(current, action));
  };

  const toggleMenu = (id: string) => {
    setMenuItems((current) =>
      current.map((item) => (item.id === id ? { ...item, visible: !item.visible } : item)),
    );
  };

  const moveMenu = (id: string, direction: "up" | "down") => {
    setMenuItems((current) => {
      const sorted = [...current].sort((a, b) => a.order - b.order);
      const index = sorted.findIndex((item) => item.id === id);
      const targetIndex = direction === "up" ? index - 1 : index + 1;

      if (targetIndex < 0 || targetIndex >= sorted.length) return current;

      const currentOrder = sorted[index].order;
      sorted[index].order = sorted[targetIndex].order;
      sorted[targetIndex].order = currentOrder;

      return sorted.sort((a, b) => a.order - b.order);
    });
  };

  const changeUserRole = (id: number, role: string) => {
    setUsers((current) => current.map((user) => (user.id === id ? { ...user, role } : user)));
  };

  if (isCreatingRole) {
    return (
      <CreateRolePage
        activeTab={createTab}
        roleName={newRoleName}
        description={newRoleDescription}
        selectedUsers={selectedUsers}
        userOptions={userOptions}
        permissionRows={newPermissionRows}
        onBack={resetCreateRole}
        onCancel={resetCreateRole}
        onCreate={createRole}
        onTabChange={setCreateTab}
        onRoleNameChange={setNewRoleName}
        onDescriptionChange={setNewRoleDescription}
        onSelectedUsersChange={setSelectedUsers}
        onTogglePermission={toggleNewPermission}
        onToggleCategory={toggleNewCategory}
        onToggleColumn={toggleNewColumn}
      />
    );
  }

  return (
    <main className="min-h-full bg-[var(--surface-secondary)]">
      <section>
        <div className="mb-4 flex items-center justify-between border-b border-gray-3 bg-surface px-6 py-4 md:px-8">
          <div className="flex items-start gap-3">
            <IconButton
              ariaLabel="Back"
              color="gray"
              icon="lucide:arrow-left"
              size="sm"
              variant="ghost"
              onClick={onBack}
            />

            <div>
              <h1 className="text-18/6 font-semibold tracking-tight text-gray-13">
                Roles &amp; Permissions
              </h1>
              <p className="text-13/5 text-gray-11">
                Define roles and configure granular access permissions across the platform.
              </p>
            </div>
          </div>
<Button
  className="justify-center gap-3 bg-primary-11 border border-primary-10 text-surface"
  icon="lucide:plus"
  label="Create Role"
  variant="outline"
  onClick={() => setIsCreatingRole(true)}
/>   
        </div>

        <div className="px-6 py-4 md:px-8">
          <Tabs activeTab={activeTab} onChange={setActiveTab} />

          {activeTab === "roles" && <RoleList roles={roles} onEdit={(id) => setSelectedRoleId(id)} />}

          {activeTab === "permissions" && (
            <PermissionMatrix
              roles={roles}
              selectedRoleId={selectedRoleId}
              rows={permissionRows}
              onRoleChange={setSelectedRoleId}
              onToggle={togglePermission}
            />
          )}

          {activeTab === "menus" && (
            <MenuProfiles
              roles={roles}
              selectedRoleId={selectedRoleId}
              selectedRoleName={selectedRole.name}
              items={menuItems}
              onRoleChange={setSelectedRoleId}
              onToggle={toggleMenu}
              onMove={moveMenu}
            />
          )}

          {activeTab === "assignments" && (
            <UserAssignments users={users} roleNames={roleNames} onChangeRole={changeUserRole} />
          )}
        </div>
      </section>
    </main>
  );
}

function CreateRolePage({
  activeTab,
  roleName,
  description,
  selectedUsers,
  userOptions,
  permissionRows,
  onBack,
  onCancel,
  onCreate,
  onTabChange,
  onRoleNameChange,
  onDescriptionChange,
  onSelectedUsersChange,
  onTogglePermission,
  onToggleCategory,
  onToggleColumn,
}: {
  activeTab: CreateTabKey;
  roleName: string;
  description: string;
  selectedUsers: Option[];
  userOptions: Option[];
  permissionRows: PermissionRow[];
  onBack: () => void;
  onCancel: () => void;
  onCreate: () => void;
  onTabChange: (tab: CreateTabKey) => void;
  onRoleNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onSelectedUsersChange: (value: Option[]) => void;
  onTogglePermission: (category: string, action: PermissionAction) => void;
  onToggleCategory: (category: string) => void;
  onToggleColumn: (action: PermissionAction) => void;
}) {
  const enabledCount = useMemo(() => countEnabledPermissions(permissionRows), [permissionRows]);
  const canCreate = roleName.trim().length > 0 && selectedUsers.length > 0;

  return (
    <main className="flex min-h-full flex-col bg-[var(--surface-secondary)]">
      <div className="flex items-center justify-between border-b border-gray-3 bg-surface px-6 py-4 md:px-8">
        <div className="flex items-start gap-3">
          <IconButton
            ariaLabel="Back"
            color="gray"
            icon="lucide:arrow-left"
            size="sm"
            variant="ghost"
            onClick={onBack}
          />
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck size={19} className="text-[var(--primary-9)]" />
              <h1 className="text-18/6 font-semibold tracking-tight text-gray-13">
                Create New Role
              </h1>
            </div>
            <p className="mt-1 text-13/5 text-gray-11">
              Configure role identity and permission controls in one full-page workspace.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col px-6 py-4 md:px-8">
        <div className="border-b border-[var(--border-default)]">
          <button
            type="button"
            onClick={() => onTabChange("details")}
            className={getCreateTabClass(activeTab === "details")}
          >
            Role Details
          </button>
          <button
            type="button"
            onClick={() => onTabChange("permissions")}
            className={getCreateTabClass(activeTab === "permissions")}
          >
            Permissions ({enabledCount} Enabled)
          </button>
        </div>

        <div className="flex-1 py-5">
          {activeTab === "details" ? (
            <RoleDetailsForm
              roleName={roleName}
              description={description}
              selectedUsers={selectedUsers}
              userOptions={userOptions}
              onRoleNameChange={onRoleNameChange}
              onDescriptionChange={onDescriptionChange}
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

      <div className="sticky bottom-0 flex justify-end gap-3 border-t border-[var(--border-default)] bg-surface px-6 py-4 shadow-[var(--shadow-sm)] md:px-8">
        <button
          type="button"
          onClick={onCancel}
          className="h-10 rounded-[10px] border border-[var(--border-default)] bg-white px-5 text-sm font-semibold text-[var(--gray-13)] shadow-[var(--shadow-sm)] transition hover:bg-[var(--gray-2)]"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onCreate}
          disabled={!canCreate}
          className="h-10 rounded-[10px] bg-[var(--primary-9)] px-5 text-sm font-semibold text-white shadow-[var(--shadow-md)] transition hover:bg-[var(--primary-10)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Create Role
        </button>
      </div>
    </main>
  );
}

function RoleDetailsForm({
  roleName,
  description,
  selectedUsers,
  userOptions,
  onRoleNameChange,
  onDescriptionChange,
  onSelectedUsersChange,
}: {
  roleName: string;
  description: string;
  selectedUsers: Option[];
  userOptions: Option[];
  onRoleNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onSelectedUsersChange: (value: Option[]) => void;
}) {
  return (
    <div className="max-w-[980px] space-y-5">
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-[var(--gray-13)]">
          Role Name <span className="text-red-500">*</span>
        </span>
        <input
          value={roleName}
          onChange={(event) => onRoleNameChange(event.target.value)}
          placeholder="e.g. AP Supervisor"
          className="h-11 w-full rounded-[10px] border border-[var(--border-default)] bg-white px-4 text-sm text-[var(--gray-13)] shadow-[var(--shadow-sm)] outline-none transition placeholder:text-[var(--gray-9)] focus:border-[var(--primary-8)] focus:ring-2 focus:ring-[var(--primary-4)]"
        />
      </label>


      <label className="block">
        <span className="mb-2 block text-sm font-medium text-[var(--gray-13)]">
          Select Users <span className="text-red-500">*</span>
        </span>
        <InputSelectMultiple
          className="bg-white"
          options={userOptions}
          placeholder="Select users..."
          value={selectedUsers}
          clearable
          required
          searchable
          onChange={(value) => onSelectedUsersChange(value as Option[])}
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-[var(--gray-13)]">Description</span>
        <textarea
          value={description}
          onChange={(event) => onDescriptionChange(event.target.value)}
          placeholder="Describe this role's responsibilities and scope..."
          rows={5}
          className="w-full resize-y rounded-[10px] border border-[var(--border-default)] bg-white px-4 py-3 text-sm text-[var(--gray-13)] shadow-[var(--shadow-sm)] outline-none transition placeholder:text-[var(--gray-9)] focus:border-[var(--primary-8)] focus:ring-2 focus:ring-[var(--primary-4)]"
        />
      </label>
    </div>
  );
}

function CreatePermissionMatrix({
  rows,
  onToggle,
  onToggleCategory,
  onToggleColumn,
}: {
  rows: PermissionRow[];
  onToggle: (category: string, action: PermissionAction) => void;
  onToggleCategory: (category: string) => void;
  onToggleColumn: (action: PermissionAction) => void;
}) {
  const permissionColumns = useMemo(
    () => [
      permissionColumnHelper.accessor("category", {
        id: "category",
        header: "Category",
        size: 290,
        cell: ({ row }) => {
          const isRowEnabled = actions.some((action) => row.original.permissions[action]);
          return (
            <button
              type="button"
              onClick={() => onToggleCategory(row.original.category)}
              className="flex items-center gap-3 text-left"
            >
              <CheckBox checked={isRowEnabled} onChange={() => onToggleCategory(row.original.category)} />
              <span className="text-sm font-semibold text-[var(--gray-13)]">
                {row.original.category}
              </span>
            </button>
          );
        },
      }),
      ...actions.map((action) =>
        permissionColumnHelper.display({
          id: action,
          size: 112,
          header: () => (
            <button
              type="button"
              onClick={() => onToggleColumn(action)}
              className="flex w-full flex-col items-center justify-center gap-1 text-center"
            >
              <span>{action}</span>
              <span className="text-[11px] font-medium text-[var(--gray-10)]">
                {rows.filter((row) => row.permissions[action]).length}/{rows.length}
              </span>
            </button>
          ),
          cell: ({ row }) => (
            <div className="flex justify-center">
              <CheckBox
                checked={row.original.permissions[action]}
                onChange={() => onToggle(row.original.category, action)}
              />
            </div>
          ),
        }),
      ),
    ],
    [onToggle, onToggleCategory, onToggleColumn, rows],
  );

  const permissionTable = useReactTable({
    data: rows,
    columns: permissionColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.category,
  });

  return (
    <div>
      <DataTable
        table={permissionTable}
        isLoading={false}
        isReLoading={false}
        pageSize={Math.max(9, rows.length || 9)}
        stickyHeader
        hideGrouping
        component={<div />}
        onReload={() => undefined}
        tableBodyMaxHeight="calc(100vh - 330px)"
      />

      <p className="mt-3 text-13/5 text-gray-11">
        Click a category name to toggle the full row. Click a column header to toggle that permission for all categories.
      </p>
    </div>
  );
}

function Tabs({
  activeTab,
  onChange,
}: {
  activeTab: TabKey;
  onChange: (tab: TabKey) => void;
}) {
  return (
    <div className="inline-flex flex-wrap  rounded-[10px] bg-gray-3 p-1">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;

        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={[
              "h-9 rounded-[8px] px-5 text-sm font-medium transition",
              isActive
                ? "bg-white text-[var(--gray-13)] shadow-[var(--shadow-sm)]"
                : "text-[var(--gray-10)] hover:text-[var(--gray-13)]",
            ].join(" ")}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

function RoleList({ roles, onEdit }: { roles: Role[]; onEdit: (id: string) => void }) {
  const roleColumns = useMemo(
    () => [
      roleColumnHelper.display({
        id: "role",
        header: "Role",
        size: 420,
        cell: ({ row }) => {
          const role = row.original;

          return (
            <div className="flex min-w-0 items-center gap-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-[var(--primary-3)] text-[var(--primary-9)]">
                <Shield size={22} />
              </div>

              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-[var(--gray-13)]">{role.name}</div>
                <div className="mt-1 truncate text-sm text-[var(--gray-11)]">{role.description}</div>
              </div>
            </div>
          );
        },
      }),
      roleColumnHelper.accessor("type", {
        id: "type",
        header: "Type",
        size: 180,
        cell: ({ getValue }) => (
          <span className="rounded-[8px] border border-[var(--border-default)] bg-white px-3 py-1 text-xs font-semibold text-[var(--gray-13)]">
            {getValue()}
          </span>
        ),
      }),
      roleColumnHelper.accessor("users", {
        id: "users",
        header: "Users",
        size: 160,
        cell: ({ getValue }) => (
          <span className="rounded-[8px] bg-[var(--gray-2)] px-4 py-1 text-sm font-semibold text-[var(--gray-13)]">
            {getValue()} users
          </span>
        ),
      }),
      roleColumnHelper.display({
        id: "actions",
        header: "Actions",
        size: 100,
        cell: ({ row }) => (
          <div className="flex justify-end pr-4">
            <button
              type="button"
              onClick={() => onEdit(row.original.id)}
              className="rounded-[8px] p-2 text-[var(--gray-13)] hover:bg-[var(--gray-2)]"
            >
              <Edit3 size={20} />
            </button>
          </div>
        ),
      }),
    ],
    [onEdit],
  );

  const roleTable = useReactTable({
    data: roles,
    columns: roleColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  });

  return (
    <DataTable
      table={roleTable}
      isLoading={false}
      isReLoading={false}
      pageSize={Math.max(6, roles.length || 6)}
      stickyHeader
      hideGrouping
      component={<div />}
      onReload={() => undefined}
      tableBodyMaxHeight="420px"
    />
  );
}

function RolePills({
  roles,
  selectedRoleId,
  onRoleChange,
}: {
  roles: Role[];
  selectedRoleId: string;
  onRoleChange: (id: string) => void;
}) {
  return (
    <div className="mt-7 flex flex-wrap gap-2">
      {roles.map((role) => {
        const selected = role.id === selectedRoleId;

        return (
          <button
            key={role.id}
            type="button"
            onClick={() => onRoleChange(role.id)}
            className={[
              "h-10 rounded-[10px] border px-4 text-sm font-semibold transition",
              selected
                ? "border-[var(--primary-9)] bg-[var(--primary-9)] text-white shadow-[var(--shadow-sm)]"
                : "border-[var(--border-default)] bg-white text-[var(--gray-13)] hover:border-[var(--primary-6)]",
            ].join(" ")}
          >
            {role.name}
          </button>
        );
      })}
    </div>
  );
}

function PermissionMatrix({
  roles,
  selectedRoleId,
  rows,
  onRoleChange,
  onToggle,
}: {
  roles: Role[];
  selectedRoleId: string;
  rows: PermissionRow[];
  onRoleChange: (id: string) => void;
  onToggle: (category: string, action: PermissionAction) => void;
}) {
  const permissionColumns = useMemo(
    () => [
      permissionColumnHelper.accessor("category", {
        id: "category",
        header: "Category",
        cell: ({ getValue }) => (
          <span className="text-sm font-semibold text-[var(--gray-13)]">{getValue()}</span>
        ),
      }),
      ...actions.map((action) =>
        permissionColumnHelper.display({
          id: action,
          header: action,
          cell: ({ row }) => (
            <div className="flex justify-center">
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
  );

  const permissionTable = useReactTable({
    data: rows,
    columns: permissionColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.category,
  });

  return (
    <>
      <RolePills roles={roles} selectedRoleId={selectedRoleId} onRoleChange={onRoleChange} />
      <DataTable
        table={permissionTable}
        isLoading={false}
        isReLoading={false}
        pageSize={Math.max(5, rows.length || 5)}
        stickyHeader
        hideGrouping
        component={<div />}
        onReload={() => undefined}
        tableBodyMaxHeight="calc(100vh - 380px)"
      />
    </>
  );
}

function MenuProfiles({
  roles,
  selectedRoleId,
  selectedRoleName,
  items,
  onRoleChange,
  onToggle,
  onMove,
}: {
  roles: Role[];
  selectedRoleId: string;
  selectedRoleName: string;
  items: MenuItem[];
  onRoleChange: (id: string) => void;
  onToggle: (id: string) => void;
  onMove: (id: string, direction: "up" | "down") => void;
}) {
  const orderedItems = [...items].sort((a, b) => a.order - b.order);

  return (
    <>
      <RolePills roles={roles} selectedRoleId={selectedRoleId} onRoleChange={onRoleChange} />
      <div className="mt-5 overflow-hidden rounded-[14px] border border-[var(--border-default)] bg-white shadow-[var(--shadow-sm)]">
        <div className="flex items-center gap-3 border-b border-[var(--border-default)] px-5 py-4">
          <Grid2X2 size={18} className="text-[var(--primary-9)]" />
          <h2 className="text-md font-semibold text-[var(--gray-13)]">
            Menu Visibility for {selectedRoleName}
          </h2>
        </div>

        <div>
          {orderedItems.map((item) => (
            <div
              key={item.id}
              className="flex min-h-[63px] items-center justify-between gap-4 border-b border-[var(--border-default)] px-5 last:border-b-0"
            >
              <div className="flex items-center gap-4">
                <Switch checked={item.visible} onChange={() => onToggle(item.id)} />
                <span className="text-sm font-semibold text-[var(--gray-13)]">{item.name}</span>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => onMove(item.id, "up")}
                    className="text-[var(--gray-10)] hover:text-[var(--primary-10)]"
                  >
                    <ChevronUp size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onMove(item.id, "down")}
                    className="text-[var(--gray-10)] hover:text-[var(--primary-10)]"
                  >
                    <ChevronDown size={18} />
                  </button>
                </div>
                <span className="flex h-7 min-w-7 items-center justify-center rounded-[8px] border border-[var(--border-default)] bg-white px-2 text-xs font-semibold text-[var(--gray-13)]">
                  {item.order}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function UserAssignments({
  users,
  roleNames,
  onChangeRole,
}: {
  users: AssignedUser[];
  roleNames: string[];
  onChangeRole: (id: number, role: string) => void;
}) {
  const userAssignmentColumns = useMemo(
    () => [
      userAssignmentColumnHelper.accessor("name", {
        id: "name",
        header: "User",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--primary-3)] text-[var(--primary-9)]">
              <UserRound size={18} />
            </div>
            <span className="text-sm font-semibold text-[var(--gray-13)]">{row.original.name}</span>
          </div>
        ),
      }),
      userAssignmentColumnHelper.accessor("email", {
        id: "email",
        header: "Email",
        cell: ({ getValue }) => <span className="text-sm text-[var(--gray-11)]">{getValue()}</span>,
      }),
      userAssignmentColumnHelper.accessor("role", {
        id: "role",
        header: "Current Role",
        cell: ({ getValue }) => (
          <span className="rounded-[8px] bg-[var(--gray-2)] px-3 py-1 text-xs font-semibold text-[var(--gray-13)]">
            {getValue()}
          </span>
        ),
      }),
      userAssignmentColumnHelper.display({
        id: "changeRole",
        header: "Change Role",
        cell: ({ row }) => (
          <select
            value={row.original.role}
            onChange={(event) => onChangeRole(row.original.id, event.target.value)}
            className="h-10 w-[200px] rounded-[8px] border border-[var(--border-default)] bg-white px-3 text-sm outline-none transition focus:border-[var(--primary-8)] focus:ring-2 focus:ring-[var(--primary-4)]"
          >
            {roleNames.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        ),
      }),
    ],
    [onChangeRole, roleNames],
  );

  const userAssignmentTable = useReactTable({
    data: users,
    columns: userAssignmentColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => String(row.id),
  });

  return (
    <>
      <p className="ml-4 mt-7 text-sm text-[var(--gray-11)]">
        Assign users to roles directly from this view.
      </p>
      <DataTable
        table={userAssignmentTable}
        isLoading={false}
        isReLoading={false}
        pageSize={Math.max(5, users.length || 5)}
        stickyHeader
        hideGrouping
        component={<div />}
        onReload={() => undefined}
        tableBodyMaxHeight="calc(100vh - 390px)"
      />
      <div className="flex justify-end px-4 py-4">
        <button
          type="button"
          className="h-10 rounded-[8px] bg-[var(--primary-9)] px-5 text-sm font-semibold text-white shadow-[var(--shadow-md)] transition hover:bg-[var(--primary-10)]"
        >
          Save Assignments
        </button>
      </div>
    </>
  );
}

function CheckBox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onChange();
      }}
      className={[
        "inline-flex h-5 w-5 items-center justify-center rounded-[6px] border shadow-[var(--shadow-sm)] transition",
        checked
          ? "border-[var(--primary-9)] bg-[var(--primary-9)] text-white"
          : "border-[var(--primary-8)] bg-white text-transparent hover:bg-[var(--primary-2)]",
      ].join(" ")}
    >
      <Check size={14} strokeWidth={3} />
    </button>
  );
}

function Switch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={[
        "relative h-7 w-12 rounded-full shadow-[var(--shadow-sm)] transition",
        checked ? "bg-[var(--primary-9)]" : "bg-[var(--gray-4)]",
      ].join(" ")}
    >
      <span
        className={[
          "absolute top-1 h-5 w-5 rounded-full bg-white shadow transition",
          checked ? "left-6" : "left-1",
        ].join(" ")}
      />
    </button>
  );
}

function getCreateTabClass(isActive: boolean) {
  return [
    "h-11 border-b-2 px-4 text-sm font-medium transition",
    isActive
      ? "border-[var(--primary-9)] text-[var(--primary-9)]"
      : "border-transparent text-[var(--gray-11)] hover:text-[var(--gray-13)]",
  ].join(" ");
}

function countEnabledPermissions(rows: PermissionRow[]) {
  return rows.reduce(
    (total, row) => total + actions.filter((action) => row.permissions[action]).length,
    0,
  );
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
  );
}

function toggleCategory(rows: PermissionRow[], category: string) {
  return rows.map((row) => {
    if (row.category !== category) return row;

    const shouldEnable = actions.some((action) => !row.permissions[action]);
    return {
      ...row,
      permissions: actions.reduce(
        (acc, action) => ({ ...acc, [action]: shouldEnable }),
        {} as Record<PermissionAction, boolean>,
      ),
    };
  });
}

function toggleColumn(rows: PermissionRow[], action: PermissionAction) {
  const shouldEnable = rows.some((row) => !row.permissions[action]);

  return rows.map((row) => ({
    ...row,
    permissions: {
      ...row.permissions,
      [action]: shouldEnable,
    },
  }));
}
