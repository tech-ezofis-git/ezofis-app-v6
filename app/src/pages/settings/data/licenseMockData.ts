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
  type: RecentTrialResourceType
  updatedAtLabel: string
}

export type RecentTrialResourceType = 'document' | 'folder' | 'workflow'

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
