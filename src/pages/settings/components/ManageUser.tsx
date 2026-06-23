import { useMemo, useState, type ReactNode } from "react";
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
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
} from "lucide-react";
import InputSelect from '@/components/base/inputs/InputSelect'
import InputText from '@/components/base/inputs/InputText'
import IconButton from '@/components/base/button/IconButton'
import DataTable from '@/components/base/data-table/DataTable'

type LoginType = "Password" | "Google SSO" | "MS Entra ID" | "LDAP / AD";
type UserStatus = "active" | "inactive" | "pending";

type AppUser = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  department: string;
  role: string;
  status: UserStatus;
  loginType: LoginType;
  lastLogin: string;
  created: string;
  jobTitle: string;
  employeeId: string;
  businessUnit: string;
  manager: string;
  location: string;
  groups: string[];
  mfaEnabled: boolean;
  mfaMethods: string[];
  passwordExpiryDays: number;
  accountExpiryDate: string;
  forcePasswordReset: boolean;
};

type StepKey =
  | "login"
  | "business"
  | "groups"
  | "authentication"
  | "review";

type Step = {
  key: StepKey;
  title: string;
  caption: string;
};

const steps: Step[] = [
  { key: "login", title: "Login Details", caption: "Step 1" },
  { key: "business", title: "Business Detail", caption: "Step 2" },
  { key: "groups", title: "Group Assignment", caption: "Step 3" },
  { key: "authentication", title: "Authentication", caption: "Step 4" },
  { key: "review", title: "Review", caption: "Step 5" },
];

const initialUsers: AppUser[] = [
  {
    id: 1,
    firstName: "John",
    lastName: "Smith",
    email: "john.smith@company.com",
    username: "john.smith",
    department: "Finance",
    role: "AP Manager",
    status: "active",
    loginType: "Password",
    lastLogin: "Jun 6, 2026",
    created: "Jun 6, 2026",
    jobTitle: "AP Manager",
    employeeId: "EMP-001",
    businessUnit: "Corporate",
    manager: "Sarah Miller",
    location: "New York, NY",
    groups: ["Finance", "AP Team"],
    mfaEnabled: true,
    mfaMethods: ["Email OTP"],
    passwordExpiryDays: 90,
    accountExpiryDate: "",
    forcePasswordReset: false,
  },
  {
    id: 2,
    firstName: "Sarah",
    lastName: "Miller",
    email: "sarah.miller@company.com",
    username: "sarah.miller",
    department: "IT",
    role: "System Admin",
    status: "active",
    loginType: "MS Entra ID",
    lastLogin: "Jun 6, 2026",
    created: "Jun 6, 2026",
    jobTitle: "System Administrator",
    employeeId: "EMP-002",
    businessUnit: "Technology",
    manager: "John Smith",
    location: "Toronto, CA",
    groups: ["Management"],
    mfaEnabled: true,
    mfaMethods: ["Authenticator App"],
    passwordExpiryDays: 90,
    accountExpiryDate: "",
    forcePasswordReset: false,
  },
  {
    id: 3,
    firstName: "Mike",
    lastName: "Johnson",
    email: "mike.johnson@company.com",
    username: "mike.johnson",
    department: "Finance",
    role: "AP Officer",
    status: "active",
    loginType: "Password",
    lastLogin: "Jun 5, 2026",
    created: "Jun 6, 2026",
    jobTitle: "AP Specialist",
    employeeId: "EMP-003",
    businessUnit: "Finance Ops",
    manager: "John Smith",
    location: "New York, NY",
    groups: ["Finance", "AP Team"],
    mfaEnabled: false,
    mfaMethods: [],
    passwordExpiryDays: 90,
    accountExpiryDate: "",
    forcePasswordReset: true,
  },
];

const emptyUser: AppUser = {
  id: 0,
  firstName: "",
  lastName: "",
  email: "",
  username: "",
  department: "",
  role: "Business User",
  status: "active",
  loginType: "Password",
  lastLogin: "—",
  created: "Jun 6, 2026",
  jobTitle: "",
  employeeId: "",
  businessUnit: "",
  manager: "",
  location: "",
  groups: [],
  mfaEnabled: true,
  mfaMethods: [],
  passwordExpiryDays: 90,
  accountExpiryDate: "",
  forcePasswordReset: false,
};

const departments = ["Finance", "IT", "Compliance", "Procurement", "Operations"];
const roles = ["Business User", "AP Officer", "AP Manager", "Auditor", "System Admin"];
const loginTypes: LoginType[] = ["Password", "Google SSO", "MS Entra ID", "LDAP / AD"];

const groups = [
  { name: "Finance", caption: "Access to finance resources" },
  { name: "AP Team", caption: "Access to AP team resources" },
  { name: "Shared Services", caption: "Access to shared services resources" },
  { name: "Auditors", caption: "Access to auditors resources" },
  { name: "Management", caption: "Access to management resources" },
];

const mfaMethods = ["Email OTP", "Mobile OTP", "Authenticator App"];

const userColumnHelper = createColumnHelper<AppUser>();

type ManageUserProps = {
  onBack?: () => void;
};

export default function ManageUser({ onBack }: ManageUserProps) {
  const [users, setUsers] = useState<AppUser[]>(initialUsers);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All Roles");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [draftUser, setDraftUser] = useState<AppUser>(emptyUser);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const text = `${user.firstName} ${user.lastName} ${user.email}`.toLowerCase();
      const matchesSearch = text.includes(query.toLowerCase());
      const matchesRole = roleFilter === "All Roles" || user.role === roleFilter;
      const matchesStatus =
        statusFilter === "All Status" || user.status === statusFilter.toLowerCase();

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [query, roleFilter, statusFilter, users]);

  const openAddUser = () => {
    setEditingUserId(null);
    setDraftUser({ ...emptyUser, id: Date.now() });
    setActiveStep(0);
    setIsSetupOpen(true);
  };

  const openEditUser = (user: AppUser) => {
    setEditingUserId(user.id);
    setDraftUser({ ...user });
    setActiveStep(0);
    setOpenMenuId(null);
    setIsSetupOpen(true);
  };

  const deleteUser = (userId: number) => {
    const confirmed = window.confirm("Are you sure you want to delete this user?");
    if (!confirmed) return;

    setUsers((current) => current.filter((user) => user.id !== userId));
    setOpenMenuId(null);
  };

  const saveUser = () => {
    const normalizedUser: AppUser = {
      ...draftUser,
      username:
        draftUser.username ||
        draftUser.email.split("@")[0] ||
        `${draftUser.firstName}.${draftUser.lastName}`.toLowerCase(),
      created: draftUser.created || "Jun 6, 2026",
    };

    if (editingUserId) {
      setUsers((current) =>
        current.map((user) => (user.id === editingUserId ? normalizedUser : user)),
      );
    } else {
      setUsers((current) => [normalizedUser, ...current]);
    }

    setIsSetupOpen(false);
  };


  const userColumns = useMemo(
    () => [
      userColumnHelper.display({
        id: 'user',
        header: 'User',
        cell: ({ row }) => {
          const user = row.original;
  
          return (
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--primary-3)] text-[16px] font-semibold text-[var(--primary-9)]">
                {getInitials(user.firstName, user.lastName)}
              </div>
  
              <div>
                <div className="font-semibold text-[var(--gray-13)]">
                  {user.firstName} {user.lastName}
                </div>
                <div className="text-[var(--gray-10)]">{user.email}</div>
              </div>
            </div>
          );
        },
      }),
  
      userColumnHelper.accessor('department', {
        id: 'department',
        header: 'Department',
        cell: ({ getValue }) => (
          <span>{String(getValue() || '—')}</span>
        ),
      }),
  
      userColumnHelper.accessor('role', {
        id: 'role',
        header: 'Role',
        cell: ({ getValue }) => (
          <span className="rounded-[10px] border border-[var(--border-default)] bg-white px-3 py-1 font-medium text-[var(--gray-13)]">
            {String(getValue())}
          </span>
        ),
      }),
  
      userColumnHelper.accessor('status', {
        id: 'status',
        header: 'Status',
        cell: ({ getValue }) => (
          <StatusBadge status={getValue()} />
        ),
      }),
  
      userColumnHelper.accessor('loginType', {
        id: 'loginType',
        header: 'Login Type',
        cell: ({ getValue }) => (
          <span>{String(getValue() || '—')}</span>
        ),
      }),
  
      userColumnHelper.accessor('lastLogin', {
        id: 'lastLogin',
        header: 'Last Login',
        cell: ({ getValue }) => (
          <span>{String(getValue() || '—')}</span>
        ),
      }),
  
      userColumnHelper.accessor('created', {
        id: 'created',
        header: 'Created',
        cell: ({ getValue }) => (
          <span>{String(getValue() || '—')}</span>
        ),
      }),
  
      userColumnHelper.display({
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const user = row.original;
  
          return (
            <div className="relative flex justify-end">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setOpenMenuId(openMenuId === user.id ? null : user.id);
                }}
                className="rounded-lg p-2 text-[var(--gray-13)] transition hover:bg-[var(--gray-2)]"
              >
                <MoreHorizontal size={20} />
              </button>
  
              {openMenuId === user.id ? (
                <div className="absolute right-0 top-10 z-50 w-36 overflow-hidden rounded-[10px] border border-[var(--border-default)] bg-white py-1 text-left shadow-[var(--shadow-lg)]">
                  <button
                    type="button"
                    onClick={() => openEditUser(user)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-[var(--gray-13)] hover:bg-[var(--gray-2)]"
                  >
                    <Edit3 size={15} />
                    Edit
                  </button>
  
                  <button
                    type="button"
                    onClick={() => deleteUser(user.id)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-[var(--red-11)] hover:bg-[var(--red-2)]"
                  >
                    <Trash2 size={15} />
                    Delete
                  </button>
                </div>
              ) : null}
            </div>
          );
        },
      }),
    ],
    [openMenuId, setOpenMenuId, openEditUser, deleteUser],
  );
  const userTable = useReactTable({
    data: filteredUsers,
    columns: userColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => String(row.id),
  });

  if (isSetupOpen) {
    return (
      <UserSetup
        activeStep={activeStep}
        draftUser={draftUser}
        editingUserId={editingUserId}
        onBack={() => setActiveStep((step) => Math.max(step - 1, 0))}
        onCancel={() => setIsSetupOpen(false)}
        onChange={setDraftUser}
        onNext={() => setActiveStep((step) => Math.min(step + 1, steps.length - 1))}
        onSave={saveUser}
        onStepChange={setActiveStep}
      />
    );
  }
  return (
    <main className="">
      <section className="">
        <div className="mb-4 bg-surface flex items-center justify-between border-b border-gray-3 px-6 py-4 md:px-8">
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
      User Management
    </h1>

    <p className="text-13/5 text-gray-11">
      Manage all users who access the AP Agent and DMS platform.
    </p>
  </div>
</div>

          <div className="flex items-center gap-3">
           
            <button className="inline-flex h-7 items-center gap-3 rounded-[5px] border border-[var(--border-default)] bg-white px-4 text-[12px] font-medium text-[var(--gray-13)] shadow-[var(--shadow-sm)] transition hover:bg-[var(--gray-2)]">
              <Download size={14} />
              Export
            </button>
            <button
              onClick={openAddUser}
              className="inline-flex h-7 items-center gap-3 rounded-[5px] bg-[var(--primary-9)] px-5 text-[12px] font-semibold text-white shadow-[var(--shadow-md)] transition hover:bg-[var(--primary-10)]"
            >
              <Plus size={14} />
              Add User
            </button>
          </div>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 px-6 py-4 lg:grid-cols-[1fr_220px_180px]">
          <div className="flex h-[35px] items-center gap-3 rounded-[5px] border border-[var(--border-default)] bg-white px-2 shadow-[var(--shadow-sm)]">
            <Search className="text-[var(--gray-10)]" size={15} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search users by name or email..."
              className="h-full w-full bg-transparent text-sm text-[var(--gray-13)] outline-none placeholder:text-[var(--gray-10)]"
            />
          </div>

          <SelectField value={roleFilter} onChange={setRoleFilter} options={["All Roles", ...roles]} />
          <SelectField
            value={statusFilter}
            onChange={setStatusFilter}
            options={["All Status", "Active", "Inactive", "Pending"]}
          />
        </div>

<div className="px-6 py-4">
  <DataTable
  table={userTable}
  isLoading={false}
  isReLoading={false}
  pageSize={Math.max(5, filteredUsers.length || 5)}
  stickyHeader
  hideGrouping
  component={<div />}
  onReload={() => undefined}
  tableBodyMaxHeight="calc(100vh - 320px)"
/>
</div>
      </section>
    </main>
  );
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
  activeStep: number;
  draftUser: AppUser;
  editingUserId: number | null;
  onBack: () => void;
  onCancel: () => void;
  onChange: (user: AppUser) => void;
  onNext: () => void;
  onSave: () => void;
  onStepChange: (step: number) => void;
}) {
  const progress = Math.round(((activeStep + 1) / steps.length) * 100);

  return (
    <main className="min-h-screen bg-[var(--surface-muted)] text-[var(--text-primary)]">
      <header className="border-b border-[var(--border-default)] bg-white px-6 py-4">
        <div className="flex items-start justify-between gap-5">

        <div className="flex items-start gap-3">
  <IconButton
    ariaLabel="Back"
    color="gray"
    icon="lucide:arrow-left"
    size="sm"
    variant="ghost"
    onClick={onCancel}
  />

  <div>
    <h1 className="text-[18px] font-semibold leading-6 text-[var(--gray-13)]">
      {editingUserId ? 'Edit User' : 'Add User'}
    </h1>

    <p className="mt-1 text-[14px] leading-5 text-[var(--gray-11)]">
      Configure login, business details, group access, and authentication.
    </p>
  </div>
</div>

          <div className="w-44">
            <div className="mb-2 text-right text-[12px] font-semibold text-[var(--orange-10)]">
              {progress}% Complete
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[var(--gray-3)]">
              <div
                className="h-full rounded-full bg-[var(--orange-10)] transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      <div className="grid min-h-[calc(100vh-96px)] grid-cols-1 lg:grid-cols-[296px_1fr]">
        <aside className="border-r border-[var(--border-default)] bg-[var(--surface-muted)] px-4 py-9">
          <div className="space-y-5">
            {steps.map((step, index) => {
              const isActive = index === activeStep;
              const isCompleted = index < activeStep;

              return (
                <button
                  key={step.key}
                  onClick={() => onStepChange(index)}
                  className="group flex w-full items-center gap-5 rounded-[14px] px-3 py-2 text-left transition hover:bg-white"
                  
                >
                  <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--gray-3)]">
                    {index < steps.length - 1 && (
                      <span className="absolute left-1/2 top-8 h-12 w-[2px] -translate-x-1/2 bg-[var(--gray-3)]" />
                    )}

                    <span
                      className={[
                        "z-10 flex h-8 w-8 items-center justify-center rounded-full transition",
                        isCompleted
                          ? "text-[var(--primary-9)]"
                          : isActive
                            ? "bg-[var(--primary-3)] text-[var(--primary-11)] ring-1 ring-[var(--primary-8)]"
                            : "bg-[var(--gray-3)] text-[var(--gray-10)]",
                      ].join(" ")}
                    >
                      {isCompleted ? <Check size={14} /> : <StepIcon step={step.key} />}
                    </span>
                  </div>
                  <div>
                    {/* <div className="text-[15px] text-[var(--gray-11)]">{step.caption}</div> */}
                    <div className="mt-1 text-md font-semibold text-[var(--indigo-12)]">
                      {step.title}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

       <section className="h-[calc(100vh-155px)] ez-scrollbar min-h-0 overflow-y-auto px-6 py-10 lg:px-20">
          <div className="mx-auto max-w-[860px]">
            {activeStep === 0 && <LoginDetails user={draftUser} onChange={onChange} />}
            {activeStep === 1 && <BusinessDetails user={draftUser} onChange={onChange} />}
            {activeStep === 2 && <GroupAssignment user={draftUser} onChange={onChange} />}
            {activeStep === 3 && <Authentication user={draftUser} onChange={onChange} />}
            {activeStep === 4 && <Review user={draftUser} />}

            <div className="mt-8 flex items-center justify-between border-t border-[var(--border-default)] pt-6">
              {/* <button
                onClick={onCancel}
                className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-[var(--border-default)] bg-white px-4 text-[15px] font-medium text-[var(--gray-13)] transition hover:bg-[var(--gray-2)]"
              >
                <X size={17} />
                Cancel
              </button> */}
              <button
                  onClick={onBack}
                  disabled={activeStep === 0}
                  className="inline-flex items-center h-10 rounded-[5px] border border-[var(--border-default)] bg-white px-5 text-[15px] font-semibold text-[var(--gray-13)] transition hover:bg-[var(--gray-2)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Back
                </button>


              <div className="flex items-center gap-3">
                
                {activeStep === steps.length - 1 ? (
                  <button
                    onClick={onSave}
                    className="h-10 rounded-[5px] bg-[var(--primary-9)] px-5 text-[15px] font-semibold text-white shadow-[var(--shadow-md)] transition hover:bg-[var(--primary-10)]"
                  >
                    Save User
                  </button>
                ) : (
                  <button
                    onClick={onNext}
                    className="h-10 rounded-[5px] bg-[var(--primary-9)] px-5 text-[15px] font-semibold text-white shadow-[var(--shadow-md)] transition hover:bg-[var(--primary-10)]"
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
  );
}



function toSelectOptions(options: string[]): SelectOption[] {
  return options.map((option) => ({
    id: option,
    name: option,
    value: option,
  }));
}

function EzTextField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <InputText
      label={required ? `${label} *` : label}
      value={value}
      type={type}
      placeholder={placeholder}
      onChange={(eventOrValue: any) => {
        const nextValue =
          typeof eventOrValue === 'string'
            ? eventOrValue
            : eventOrValue?.target?.value ?? '';

        onChange(nextValue);
      }}
    />
  );
}

function EzSelectField({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select',
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const selectOptions = toSelectOptions(options);

  const selectedOption =
    selectOptions.find((option) => option.value === value || option.name === value) ||
    null;

  return (
    <InputSelect
      label={label}
      options={selectOptions}
      value={selectedOption}
      placeholder={placeholder}
      width="100%"
      onChange={(selected: SelectOption | null) => {
        if (!selected) return;
        onChange(selected.value || selected.name);
      }}
    />
  );
}
function LoginDetails({ user, onChange }: FormSectionProps) {
  return (
    <FormCard title="Login Details" description="Capture primary identity and sign-in configuration.">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <EzTextField
          label="First Name"
          required
          value={user.firstName}
          onChange={(value) => onChange({ ...user, firstName: value })}
          placeholder="Enter first name"
        />

        <EzTextField
          label="Last Name"
          required
          value={user.lastName}
          onChange={(value) => onChange({ ...user, lastName: value })}
          placeholder="Enter last name"
        />
      </div>

      <EzTextField
        label="Email Address"
        required
        value={user.email}
        onChange={(value) => onChange({ ...user, email: value })}
        placeholder="user@company.com"
        type="email"
      />

      <EzTextField
        label="Username"
        value={user.username}
        onChange={(value) => onChange({ ...user, username: value })}
        placeholder="Enter username"
      />

      <EzSelectField
        label="Login Type"
        value={user.loginType}
        options={loginTypes}
        onChange={(value) => onChange({ ...user, loginType: value as LoginType })}
      />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <EzTextField
          label="Password Expiry (Days)"
          value={String(user.passwordExpiryDays)}
          onChange={(value) =>
            onChange({ ...user, passwordExpiryDays: Number(value) || 0 })
          }
          placeholder="90"
          type="number"
        />

        <EzTextField
          label="Account Expiry Date"
          value={user.accountExpiryDate}
          onChange={(value) => onChange({ ...user, accountExpiryDate: value })}
          type="date"
        />
      </div>

      <ToggleRow
        label="Force password reset on first login"
        checked={user.forcePasswordReset}
        onChange={(checked) => onChange({ ...user, forcePasswordReset: checked })}
      />
    </FormCard>
  );
}
function BusinessDetails({ user, onChange }: FormSectionProps) {
  return (
    <FormCard title="Business Detail" description="Align this user with the business hierarchy and operating model.">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <EzTextField
          label="Job Title"
          value={user.jobTitle}
          onChange={(value) => onChange({ ...user, jobTitle: value })}
          placeholder="e.g. AP Specialist"
        />

        <EzTextField
          label="Employee ID"
          value={user.employeeId}
          onChange={(value) => onChange({ ...user, employeeId: value })}
          placeholder="EMP-001"
        />

        <EzSelectField
          label="Department"
          value={user.department}
          options={departments}
          placeholder="Select department"
          onChange={(value) => onChange({ ...user, department: value })}
        />

        <EzTextField
          label="Business Unit"
          value={user.businessUnit}
          onChange={(value) => onChange({ ...user, businessUnit: value })}
          placeholder="e.g. Corporate"
        />

        <EzTextField
          label="Manager"
          value={user.manager}
          onChange={(value) => onChange({ ...user, manager: value })}
          placeholder="Manager name or email"
        />

        <EzTextField
          label="Location"
          value={user.location}
          onChange={(value) => onChange({ ...user, location: value })}
          placeholder="e.g. New York, NY"
        />
      </div>

      <EzSelectField
        label="Role"
        value={user.role}
        options={roles}
        onChange={(value) => onChange({ ...user, role: value })}
      />
    </FormCard>
  );
}

function GroupAssignment({ user, onChange }: FormSectionProps) {
  const toggleGroup = (name: string) => {
    const exists = user.groups.includes(name);
    const nextGroups = exists ? user.groups.filter((item) => item !== name) : [...user.groups, name];
    onChange({ ...user, groups: nextGroups });
  };

  return (
    <FormCard title="Group Assignment" description="Assign this user to one or more groups. Groups determine shared folder and workflow access.">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {groups.map((group) => {
          const selected = user.groups.includes(group.name);

          return (
            <button
              key={group.name}
              onClick={() => toggleGroup(group.name)}
              className={[
                "flex min-h-[60px] items-center gap-4 rounded-[10px] border bg-white px-5 text-left transition",
                selected
                  ? "border-[var(--primary-6)] bg-[var(--primary-2)] shadow-[0_0_0_1px_var(--primary-5)]"
                  : "border-[var(--border-default)] hover:border-[var(--primary-5)]",
              ].join(" ")}
            >
              <span
                className={[
                  "flex h-5 w-5 items-center justify-center rounded-[6px] border",
                  selected
                    ? "border-[var(--primary-9)] bg-[var(--primary-9)] text-white"
                    : "border-[var(--primary-8)] bg-white",
                ].join(" ")}
              >
                {selected && <Check size={12} />}
              </span>
              <span>
                <span className="block text-sm font-semibold text-[var(--gray-13)]">
                  {group.name}
                </span>
                <span className="mt-1 block text-xs text-[var(--gray-11)]">
                  {group.caption}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </FormCard>
  );
}

function Authentication({ user, onChange }: FormSectionProps) {
  const toggleMethod = (method: string) => {
    const exists = user.mfaMethods.includes(method);
    const nextMethods = exists
      ? user.mfaMethods.filter((item) => item !== method)
      : [...user.mfaMethods, method];

    onChange({ ...user, mfaMethods: nextMethods });
  };

  return (
    <FormCard title="Authentication" description="Govern multi-factor verification for secure user access.">
      <div className="mb-7 rounded-[14px] border border-[var(--border-default)] bg-white p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-[var(--gray-13)]">
              Multi-Factor Authentication
            </h3>
            <p className="text-xs text-[var(--gray-11)]">
              Require additional verification for sign-in
            </p>
          </div>
          <Switch checked={user.mfaEnabled} onChange={(checked) => onChange({ ...user, mfaEnabled: checked })} />
        </div>
      </div>

      <h3 className="mb-4 text-sm font-semibold text-[var(--gray-13)]">MFA Methods</h3>
      <div className="space-y-4">
        {mfaMethods.map((method) => {
          const selected = user.mfaMethods.includes(method);

          return (
            <button
              key={method}
              onClick={() => toggleMethod(method)}
              disabled={!user.mfaEnabled}
              className={[
                "flex h-[66px] w-full items-center gap-4 rounded-[10px] border bg-white px-5 text-left transition disabled:cursor-not-allowed disabled:opacity-50",
                selected
                  ? "border-[var(--primary-6)] bg-[var(--primary-2)]"
                  : "border-[var(--border-default)] hover:border-[var(--primary-5)]",
              ].join(" ")}
            >
              <span
                className={[
                  "flex h-5 w-5 items-center justify-center rounded-[6px] border",
                  selected
                    ? "border-[var(--primary-9)] bg-[var(--primary-9)] text-white"
                    : "border-[var(--primary-8)] bg-white",
                ].join(" ")}
              >
                {selected && <Check size={12} />}
              </span>
              <span className="text-sm font-semibold text-[var(--gray-13)]">{method}</span>
            </button>
          );
        })}
      </div>
    </FormCard>
  );
}

function Review({ user }: { user: AppUser }) {
  return (
    <FormCard title="Review" description="Validate the user profile before provisioning access.">
      <div className="rounded-[14px] border border-[var(--border-default)] bg-white p-6">
        <h3 className="mb-6 text-md font-semibold text-[var(--gray-13)]">User Summary</h3>

        <div className="grid grid-cols-1 gap-x-12 gap-y-4 text-sm md:grid-cols-2">
          <SummaryItem label="Name" value={`${user.firstName} ${user.lastName}`.trim() || "—"} />
          <SummaryItem label="Email" value={user.email || "—"} />
          <SummaryItem label="Login" value={user.loginType} />
          <SummaryItem label="Department" value={user.department || "—"} />
          <SummaryItem label="Role" value={user.role || "—"} />
          <SummaryItem label="Location" value={user.location || "—"} />
          <SummaryItem label="Groups" value={user.groups.length ? user.groups.join(", ") : "—"} />
          <SummaryItem
            label="MFA"
            value={`${user.mfaEnabled ? "Enabled" : "Disabled"} (${user.mfaMethods.join(", ") || "No methods"})`}
          />
        </div>
      </div>
    </FormCard>
  );
}

type FormSectionProps = {
  user: AppUser;
  onChange: (user: AppUser) => void;
};

function FormCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-8">
        <h2 className="text-sm font-semibold leading-8 text-[var(--gray-13)]">{title}</h2>
        <p className="mt-1 max-w-[760px] text-xs leading-7 text-[var(--gray-11)]">{description}</p>
      </div>
      <div className="space-y-6">{children}</div>
    </div>
  );
}

type SelectOption = {
  id: string | number;
  name: string;
  description?: string;
  disabled?: boolean;
  value?: string;
};

function SelectField({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  const selectOptions: SelectOption[] = options.map((option) => ({
    id: option,
    name: option,
    value: option,
  }));

  const selectedOption =
    selectOptions.find((option) => option.value === value || option.name === value) || null;

  return (
    <div className="relative">
      <InputSelect
        options={selectOptions}
        value={selectedOption}
        onChange={(selected) => {
          if (!selected) return;
          onChange(selected.value || selected.name);
        }}
      />
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-4">
      <Switch checked={checked} onChange={onChange} />
      <span className="text-sm font-medium text-[var(--gray-13)]">{label}</span>
    </div>
  );
}

function Switch({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={[
        "relative h-7 w-12 rounded-full transition",
        checked ? "bg-[var(--primary-9)]" : "bg-[var(--gray-3)]",
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

function StatusBadge({ status }: { status: UserStatus }) {
  const className =
    status === "active"
      ? "border-[var(--green-5)] bg-[var(--green-3)] text-[var(--green-11)]"
      : status === "pending"
        ? "border-[var(--orange-5)] bg-[var(--orange-2)] text-[var(--orange-11)]"
        : "border-[var(--gray-4)] bg-[var(--gray-2)] text-[var(--gray-10)]";

  return (
    <span className={`rounded-[10px] border px-3 py-1  font-semibold ${className}`}>
      {status}
    </span>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className=" font-semibold text-[var(--gray-11)]">{label}: </span>
      <span className="ml-2 text-[var(--gray-10)]">{value}</span>
    </div>
  );
}

function StepIcon({ step }: { step: StepKey }) {
  if (step === "login") return <UserRound size={14} />;
  if (step === "business") return <UsersRound size={14} />;
  if (step === "groups") return <UsersRound size={14} />;
  if (step === "authentication") return <ShieldCheck size={14} />;
  return <Check size={14} />;
}

function getInitials(firstName: string, lastName: string) {
  return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase() || "U";
}
