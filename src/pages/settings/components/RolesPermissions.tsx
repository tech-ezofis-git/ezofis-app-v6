import { useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Edit3,
  Grid2X2,
  Plus,
  Shield,
  UserRound,
} from "lucide-react";
import IconButton from '@/components/base/button/IconButton'

type TabKey = "roles" | "permissions" | "menus" | "assignments";

type Role = {
  id: string;
  name: string;
  description: string;
  type: "System" | "Custom";
  users: number;
};

type PermissionAction = "View" | "Create" | "Edit" | "Delete" | "Approve" | "Export" | "Manage";

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

const tabs: { key: TabKey; label: string }[] = [
  { key: "roles", label: "Role List" },
  { key: "permissions", label: "Permission Matrix" },
  { key: "menus", label: "Menu Profiles" },
  { key: "assignments", label: "User Assignments" },
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

const actions: PermissionAction[] = [
  "View",
  "Create",
  "Edit",
  "Delete",
  "Approve",
  "Export",
  "Manage",
];

const initialPermissionRows: PermissionRow[] = [
  {
    category: "Dashboard",
    permissions: {
      View: true,
      Create: false,
      Edit: false,
      Delete: false,
      Approve: false,
      Export: false,
      Manage: true,
    },
  },
  {
    category: "Invoices",
    permissions: {
      View: true,
      Create: true,
      Edit: true,
      Delete: true,
      Approve: true,
      Export: true,
      Manage: false,
    },
  },
  {
    category: "OCR / Document Processing",
    permissions: {
      View: false,
      Create: false,
      Edit: false,
      Delete: false,
      Approve: false,
      Export: false,
      Manage: false,
    },
  },
  {
    category: "Workflow and Approvals",
    permissions: {
      View: false,
      Create: false,
      Edit: false,
      Delete: false,
      Approve: false,
      Export: false,
      Manage: false,
    },
  },
  {
    category: "Reports and Analytics",
    permissions: {
      View: false,
      Create: false,
      Edit: false,
      Delete: false,
      Approve: false,
      Export: false,
      Manage: false,
    },
  },
  {
    category: "User Management",
    permissions: {
      View: false,
      Create: false,
      Edit: false,
      Delete: false,
      Approve: false,
      Export: false,
      Manage: false,
    },
  },
  {
    category: "Folder Management",
    permissions: {
      View: false,
      Create: false,
      Edit: false,
      Delete: false,
      Approve: false,
      Export: false,
      Manage: false,
    },
  },
  {
    category: "Integrations",
    permissions: {
      View: false,
      Create: false,
      Edit: false,
      Delete: false,
      Approve: false,
      Export: false,
      Manage: false,
    },
  },
  {
    category: "System Settings",
    permissions: {
      View: true,
      Create: false,
      Edit: false,
      Delete: false,
      Approve: false,
      Export: false,
      Manage: true,
    },
  },
];

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
type RoleUserProps = {
  onBack?: () => void;
};
export default function RolesPermissions({ onBack }: RoleUserProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("roles");
  const [roles, setRoles] = useState<Role[]>(initialRoles);
  const [selectedRoleId, setSelectedRoleId] = useState(initialRoles[0].id);
  const [permissionRows, setPermissionRows] = useState<PermissionRow[]>(initialPermissionRows);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(initialMenuItems);
  const [users, setUsers] = useState<AssignedUser[]>(initialUsers);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");

  const selectedRole = useMemo(
    () => roles.find((role) => role.id === selectedRoleId) || roles[0],
    [roles, selectedRoleId],
  );

  const roleNames = roles.map((role) => role.name);

  const createRole = () => {
    const cleanName = newRoleName.trim();
    if (!cleanName) return;

    const role: Role = {
      id: cleanName.toLowerCase().replace(/\s+/g, "-"),
      name: cleanName,
      description: newRoleDescription.trim() || "Custom role configured by administrator",
      type: "Custom",
      users: 0,
    };

    setRoles((current) => [...current, role]);
    setSelectedRoleId(role.id);
    setNewRoleName("");
    setNewRoleDescription("");
    setIsCreateOpen(false);
  };

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
    );
  };

  const toggleMenu = (id: string) => {
    setMenuItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, visible: !item.visible } : item,
      ),
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
    setUsers((current) =>
      current.map((user) => (user.id === id ? { ...user, role } : user)),
    );
  };

  return (
    <main className=" h-[calc(100vh-60px)] overflow-auto bg-[var(--surface-muted)] px-5 py-6 text-[var(--text-primary)]">
      <section className="mx-auto max-w-[93vw]">
        <div className="flex items-start justify-between gap-4">

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
    <h1 className="text-lg font-semibold leading-7 text-[var(--gray-13)]">
      Roles &amp; Permissions
    </h1>

    <p className="mt-1 text-sm leading-6 text-[var(--primary-10)]">
      Define roles and configure granular access permissions across the platform.
    </p>
  </div>
</div>

          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex h-10 items-center gap-3 rounded-[8px] bg-[var(--primary-10)] px-5 text-sm font-semibold text-white shadow-[var(--shadow-md)] transition hover:bg-[var(--primary-10)]"
          >
            <Plus size={17} />
            Create Role
          </button>
        </div>

        <Tabs activeTab={activeTab} onChange={setActiveTab} />

        {activeTab === "roles" && (
          <RoleList roles={roles} onEdit={(id) => setSelectedRoleId(id)} />
        )}

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
          <UserAssignments
            users={users}
            roleNames={roleNames}
            onChangeRole={changeUserRole}
          />
        )}
      </section>

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay-backdrop)] px-4">
          <div className="w-full max-w-[460px] rounded-[14px] border border-[var(--border-default)] bg-white p-5 shadow-[var(--shadow-lg)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-md font-semibold text-[var(--gray-13)]">
                  Create Role
                </h2>
                <p className="mt-1 text-xs text-[var(--gray-11)]">
                  Configure a new access role for the platform.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-md px-2 py-1 text-sm text-[var(--gray-10)] hover:bg-[var(--gray-2)]"
              >
                ✕
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[var(--gray-13)]">
                  Role Name
                </span>
                <input
                  value={newRoleName}
                  onChange={(event) => setNewRoleName(event.target.value)}
                  placeholder="e.g. Finance Reviewer"
                  className="h-10 w-full rounded-[8px] border border-[var(--border-default)] bg-white px-3 text-sm outline-none transition focus:border-[var(--primary-8)] focus:ring-2 focus:ring-[var(--primary-4)]"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[var(--gray-13)]">
                  Description
                </span>
                <textarea
                  value={newRoleDescription}
                  onChange={(event) => setNewRoleDescription(event.target.value)}
                  placeholder="Describe role access and responsibilities"
                  rows={4}
                  className="w-full resize-none rounded-[8px] border border-[var(--border-default)] bg-white px-3 py-2 text-sm outline-none transition focus:border-[var(--primary-8)] focus:ring-2 focus:ring-[var(--primary-4)]"
                />
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="h-9 rounded-[7px] border border-[var(--border-default)] bg-white px-4 text-sm font-medium text-[var(--gray-13)] hover:bg-[var(--gray-2)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={createRole}
                className="h-9 rounded-[7px] bg-[var(--primary-9)] px-4 text-sm font-semibold text-white hover:bg-[var(--primary-10)]"
              >
                Save Role
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
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
    <div className="mt-7 inline-flex flex-wrap rounded-[10px] bg-[var(--gray-2)] p-1">
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

function RoleList({
  roles,
  onEdit,
}: {
  roles: Role[];
  onEdit: (id: string) => void;
}) {
  return (
    <div className="mt-8 space-y-4  pr-2">
      {roles.map((role) => (
        <div
          key={role.id}
          className="flex min-h-[100px] items-center justify-between gap-4 rounded-[14px] border border-[var(--border-default)] bg-white px-6 py-5 shadow-[var(--shadow-sm)]"
        >
          <div className="flex min-w-0 items-center gap-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-[var(--primary-3)] text-[var(--primary-9)]">
              <Shield size={24} strokeWidth={1.9} />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-md font-semibold leading-6 text-[var(--gray-13)]">
                  {role.name}
                </h3>
                <span className="rounded-[8px] border border-[var(--border-default)] bg-white px-3 py-1 text-xs font-semibold text-[var(--gray-13)]">
                  {role.type}
                </span>
              </div>
              <p className="mt-1 text-sm leading-5 text-[var(--gray-11)]">
                {role.description}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-4">
            <span className="rounded-[8px] bg-[var(--gray-2)] px-4 py-1 text-sm font-semibold text-[var(--gray-13)]">
              {role.users} users
            </span>
            <button
              type="button"
              onClick={() => onEdit(role.id)}
              className="rounded-[8px] p-2 text-[var(--gray-13)] transition hover:bg-[var(--gray-2)] hover:text-[var(--primary-10)]"
            >
              <Edit3 size={20} />
            </button>
          </div>
        </div>
      ))}
    </div>
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
  return (
    <>
      <RolePills roles={roles} selectedRoleId={selectedRoleId} onRoleChange={onRoleChange} />

      <div className="mt-5   rounded-[14px] border border-[var(--border-default)] bg-white shadow-[var(--shadow-sm)]">
        <table className="w-full min-w-[920px] border-collapse text-left">
          <thead className="sticky top-0 z-10 bg-[var(--gray-2)]">
            <tr className="border-b border-[var(--border-default)]">
              <th className="w-[340px] px-4 py-4 text-sm font-semibold text-[var(--gray-13)]">
                Category
              </th>
              {actions.map((action) => (
                <th
                  key={action}
                  className="px-4 py-4 text-center text-sm font-semibold text-[var(--gray-13)]"
                >
                  {action}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr
                key={row.category}
                className="border-b border-[var(--border-default)] last:border-b-0"
              >
                <td className="px-4 py-4 text-sm font-medium text-[var(--gray-13)]">
                  {row.category}
                </td>
                {actions.map((action) => (
                  <td key={action} className="px-4 py-4 text-center">
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

        <div className="">
          {orderedItems.map((item) => (
            <div
              key={item.id}
              className="flex min-h-[63px] items-center justify-between gap-4 border-b border-[var(--border-default)] px-5 last:border-b-0"
            >
              <div className="flex items-center gap-4">
                <Switch checked={item.visible} onChange={() => onToggle(item.id)} />
                <span className="text-sm font-semibold text-[var(--gray-13)]">
                  {item.name}
                </span>
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
  return (
    <>
      <p className="mt-7 ml-4 text-sm text-[var(--gray-11)]">
        Assign users to roles directly from this view.
      </p>

      <div className="mt-5 overflow-hidden rounded-[14px] border border-[var(--border-default)] bg-white shadow-[var(--shadow-sm)]">
        <table className="w-full min-w-[900px] border-collapse  text-left">
          <thead className="bg-[var(--gray-2)]">
            <tr className="border-b border-[var(--border-default)]">
              <th className="px-4 py-4 text-sm font-semibold text-[var(--gray-13)]">User</th>
              <th className="px-4 py-4 text-sm font-semibold text-[var(--gray-13)]">Email</th>
              <th className="px-4 py-4 text-sm font-semibold text-[var(--gray-13)]">Current Role</th>
              <th className="px-4 py-4 text-sm font-semibold text-[var(--gray-13)]">Change Role</th>
            </tr>
          </thead>

          <tbody>
            {users.map((user) => (
              <tr
                key={user.id}
                className="border-b border-[var(--border-default)] last:border-b-0"
              >
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--primary-3)] text-[var(--primary-9)]">
                      <UserRound size={18} />
                    </div>
                    <span className="text-sm font-semibold text-[var(--gray-13)]">
                      {user.name}
                    </span>
                  </div>
                </td>

                <td className="px-4 py-4 text-sm text-[var(--gray-11)]">
                  {user.email}
                </td>

                <td className="px-4 py-4">
                  <span className="rounded-[8px] bg-[var(--gray-2)] px-3 py-1 text-xs font-semibold text-[var(--gray-13)]">
                    {user.role}
                  </span>
                </td>

                <td className="px-4 py-4">
                  <select
                    value={user.role}
                    onChange={(event) => onChangeRole(user.id, event.target.value)}
                    className="h-10 w-[200px] rounded-[8px] border border-[var(--border-default)] bg-white px-3 text-sm outline-none transition focus:border-[var(--primary-8)] focus:ring-2 focus:ring-[var(--primary-4)]"
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

function CheckBox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={[
        "inline-flex h-5 w-5 items-center justify-center rounded-[6px] border transition shadow-[var(--shadow-sm)]",
        checked
          ? "border-[var(--primary-9)] bg-[var(--primary-9)] text-white"
          : "border-[var(--primary-8)] bg-white text-transparent hover:bg-[var(--primary-2)]",
      ].join(" ")}
    >
      <Check size={14} strokeWidth={3} />
    </button>
  );
}

function Switch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={[
        "relative h-7 w-12 rounded-full transition shadow-[var(--shadow-sm)]",
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
