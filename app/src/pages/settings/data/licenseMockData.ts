import type { LicenseSummaryResponse } from '@/api/v6/license'

export type MigrationOptionDef = {
  badgeLabel: string
  badgeTone: 'safe' | 'warn' | 'danger'
  description: string
  id: MigrationOptionId
  idealFor: string
  keep: string[]
  purge: string[]
  title: string
}

export type MigrationOptionId = 'full' | 'config_only' | 'fresh_start'

export type RecentTrialResourceDef = {
  createdBy: string
  id: string
  name: string
  type: 'folder' | 'workflow' | 'document' | 'user'
  updatedAtLabel: string
}

export type LicenseResourceCategory = 'users' | 'workflows' | 'folders' | 'files'

export type UserResourceItem = {
  email: string
  group: string
  id: string
  lastActive: string
  name: string
  role: string
  status: 'active' | 'invited'
}

export type WorkflowResourceItem = {
  id: string
  owner: string
  status: 'Draft' | 'Published'
  title: string
  updatedAtLabel: string
}

export type FolderResourceItem = {
  createdBy: string
  id: string
  level: string
  name: string
  updatedAtLabel: string
}

export type FileResourceItem = {
  id: string
  name: string
  size: string
  type: string
  updatedAtLabel: string
  uploadedBy: string
}

export const mockUsersList: UserResourceItem[] = [
  {
    email: 'alex.lewis@ezofis.com',
    group: 'Product Engineering',
    id: 'u-1',
    lastActive: '10 mins ago',
    name: 'Alex Lewis',
    role: 'Workspace Admin',
    status: 'active',
  },
  {
    email: 'john.doe@ezofis.com',
    group: 'Operations & IT',
    id: 'u-2',
    lastActive: 'Just now',
    name: 'John Doe (You)',
    role: 'System Administrator',
    status: 'active',
  },
  {
    email: 'sara.ray@ezofis.com',
    group: 'Design & Marketing',
    id: 'u-3',
    lastActive: '2 hours ago',
    name: 'Sara Ray',
    role: 'Content Lead',
    status: 'active',
  },
  {
    email: 'michael.chen@ezofis.com',
    group: 'Finance & Compliance',
    id: 'u-4',
    lastActive: 'Yesterday',
    name: 'Michael Chen',
    role: 'Financial Analyst',
    status: 'invited',
  },
]

export const mockWorkflowsList: WorkflowResourceItem[] = [
  {
    id: 'wf-1',
    owner: 'John Doe (You)',
    status: 'Published',
    title: 'Automated Billing Sync Workflow',
    updatedAtLabel: 'Yesterday',
  },
  {
    id: 'wf-2',
    owner: 'Alex Lewis',
    status: 'Published',
    title: 'Customer Onboarding Approval',
    updatedAtLabel: '3 days ago',
  },
  {
    id: 'wf-3',
    owner: 'Sara Ray',
    status: 'Draft',
    title: 'Vendor Contract Review Process',
    updatedAtLabel: 'Aug 24, 2026',
  },
  {
    id: 'wf-4',
    owner: 'Michael Chen',
    status: 'Published',
    title: 'Employee Expenses Approval Pipeline',
    updatedAtLabel: 'Aug 18, 2026',
  },
]

export const mockFoldersList: FolderResourceItem[] = [
  {
    createdBy: 'Alex Lewis',
    id: 'fold-1',
    level: 'Root / Marketing',
    name: 'Marketing Q3 Campaign Assets',
    updatedAtLabel: '2 hours ago',
  },
  {
    createdBy: 'Sara Ray',
    id: 'fold-2',
    level: 'Root / Legal',
    name: 'Executive Board Meeting Minutes 2026',
    updatedAtLabel: 'Yesterday',
  },
  {
    createdBy: 'John Doe (You)',
    id: 'fold-3',
    level: 'Root / Finance / Receipts',
    name: 'Tax Audit Documentation & Statements',
    updatedAtLabel: 'Aug 15, 2026',
  },
  {
    createdBy: 'Michael Chen',
    id: 'fold-4',
    level: 'Root / HR',
    name: 'Quarterly Performance Reviews',
    updatedAtLabel: 'Aug 10, 2026',
  },
]

export const mockFilesList: FileResourceItem[] = [
  {
    id: 'file-1',
    name: 'Engineering Product Architecture 2026.pdf',
    size: '14.8 MB',
    type: 'PDF Document',
    updatedAtLabel: 'Aug 12, 2026',
    uploadedBy: 'Sara Ray',
  },
  {
    id: 'file-2',
    name: 'Q3 Financial Projections & Budget.xlsx',
    size: '4.2 MB',
    type: 'Spreadsheet',
    updatedAtLabel: 'Aug 20, 2026',
    uploadedBy: 'Michael Chen',
  },
  {
    id: 'file-3',
    name: 'Brand Guidelines & Identity Assets.zip',
    size: '128.5 MB',
    type: 'Archive',
    updatedAtLabel: 'Aug 22, 2026',
    uploadedBy: 'Alex Lewis',
  },
  {
    id: 'file-4',
    name: 'System Security Audit & Compliance Report.docx',
    size: '2.1 MB',
    type: 'Word Document',
    updatedAtLabel: 'Aug 25, 2026',
    uploadedBy: 'John Doe (You)',
  },
]

export const recentTrialResources: RecentTrialResourceDef[] = [
  {
    createdBy: 'Alex Lewis',
    id: 'res-1',
    name: 'Marketing Q3 Campaign Assets',
    type: 'folder',
    updatedAtLabel: '2 hours ago',
  },
  {
    createdBy: 'John Doe (You)',
    id: 'res-2',
    name: 'Automated Billing Sync Workflow',
    type: 'workflow',
    updatedAtLabel: 'Yesterday',
  },
  {
    createdBy: 'Sara Ray',
    id: 'res-3',
    name: 'Engineering Product Architecture 2026.pdf',
    type: 'document',
    updatedAtLabel: 'Aug 12, 2026',
  },
]

export const licenseSummaryFallback: LicenseSummaryResponse = {
  daysRemaining: 9,
  filesCount: 2184,
  filesLimit: 2500,
  foldersCount: 37,
  foldersLimit: 50,
  groupsCount: 6,
  planType: 'trial',
  requestsCount: 642,
  securityPoliciesCount: 48,
  storageUsedBytes: 6_871_947_673,
  tenantId: 'ezofis-acme-trial-04',
  trialDay: 21,
  trialExpiryDate: '2026-09-23',
  trialLengthDays: 30,
  trialStartDate: '2026-07-25',
  usersCount: 26,
  usersLimit: 45,
  workflowsCount: 18,
  workflowsLimit: 18,
}

export const migrationOptions: MigrationOptionDef[] = [
  {
    badgeLabel: 'Full migration',
    badgeTone: 'safe',
    description:
      'Moves all trial configurations and transactional data into production — nothing changes for your team, they keep working in the same workspace.',
    id: 'full',
    idealFor: 'Teams continuing their trial setup directly in production.',
    keep: [
      'Workflows & forms',
      'Folder structure & files',
      'Requests, uploads & logs',
      'Users, groups & roles',
      'Security policies',
    ],
    purge: [],
    title: 'Migrate Everything',
  },
  {
    badgeLabel: 'Clean data',
    badgeTone: 'warn',
    description:
      'Keeps workflow designs, form templates, folder structures, and security policies — clears out trial requests, test uploads, and mock transactions.',
    id: 'config_only',
    idealFor:
      'Teams that finalized their production templates but want a clean transaction history.',
    keep: [
      'Workflows & forms',
      'Folder structure & metadata',
      'Users, groups & roles',
      'Security policies',
    ],
    purge: ['Trial requests', 'Test uploaded files', 'Mock transactions'],
    title: 'Configurations Only',
  },
  {
    badgeLabel: 'Clean slate',
    badgeTone: 'danger',
    description:
      'Clears all trial configurations and test data. Your organization begins production with a completely empty workspace.',
    id: 'fresh_start',
    idealFor:
      'Teams who used the trial only to evaluate the platform, not to design for production.',
    keep: [],
    purge: [
      'Workflows & forms',
      'Folder structure & files',
      'Requests, uploads & logs',
      'Users, groups & roles',
      'Security policies',
    ],
    title: 'Fresh Start',
  },
]
