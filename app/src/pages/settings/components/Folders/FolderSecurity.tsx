import {
  createColumnHelper,
  getFilteredRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  type DocumentSecurityRule,
  type FolderPermissionFlags,
  type FolderSecurityPolicy,
  getDocumentSecurity,
  getFolderSecurity,
  putDocumentSecurity,
  putFolderSecurity,
} from '@/api/v6/folder/security'
import {
  getGroups,
  getUsers,
  type V6GroupItem,
  type V6UserListItem,
} from '@/api/v6/user'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import DataTable from '@/components/base/data-table/DataTable'
import Divider from '@/components/base/Divider'
import Icon from '@/components/base/icon/Icon'
import Menu from '@/components/base/menu/Menu'
import MenuItem from '@/components/base/menu/MenuItem'
import Pagination from '@/components/base/pagination/Pagination'
import showToast from '@/components/base/toast/showToast'
import cn from '@/utils/cn'
import {
  settingsTableCoreOptions,
  useSettingsTablePagination,
} from '../../helpers/settingsDataTable'
import useSettingsTopbar from '../../hooks/useSettingsTopbar'
import useSettingsTableToolbar from '../useSettingsTableToolbar'
import DocumentSecurityRuleWizard from './DocumentSecurityRuleWizard'
import FolderRetention from './FolderRetention'
import FolderRetentionPolicyWizard from './FolderRetentionPolicyWizard'
import FolderSecurityPolicyWizard from './FolderSecurityPolicyWizard'
import { seedPolicies, type RetentionPolicy } from './retentionMockData'

export type FolderSecurityProps = {
  folderName: string
  repositoryId?: string
  onBack: () => void
  onBackToSettings?: () => void
}

type TabKey = 'folder' | 'document' | 'retention'

const tabs: { key: TabKey; label: string }[] = [
  { key: 'folder', label: 'Folder Security' },
  { key: 'document', label: 'Document Security' },
  { key: 'retention', label: 'Retention Policy' },
]

const getInitials = (name: string) => {
  if (!name) return '?'
  const clean = name.replace(/^(User:|Group:)\s*/i, '').trim()
  const parts = clean.split(/\s+/)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return clean.slice(0, 2).toUpperCase()
}


export default function FolderSecurity({
  folderName,
  repositoryId = '',
  onBack,
  onBackToSettings,
}: FolderSecurityProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('folder')
  const [users, setUsers] = useState<V6UserListItem[]>([])
  const [groups, setGroups] = useState<V6GroupItem[]>([])

  // Folder security policies state
  const [policies, setPolicies] = useState<FolderSecurityPolicy[]>([])
  const [isLoadingPolicies, setIsLoadingPolicies] = useState(true)
  const [editingPolicyIndex, setEditingPolicyIndex] = useState<number | null>(
    null,
  )
  const [isPolicyWizardOpen, setIsPolicyWizardOpen] = useState(false)

  // Document security rules state
  const [rules, setRules] = useState<DocumentSecurityRule[]>([])
  const [isLoadingRules, setIsLoadingRules] = useState(true)
  const [editingRuleIndex, setEditingRuleIndex] = useState<number | null>(null)
  const [isRuleWizardOpen, setIsRuleWizardOpen] = useState(false)

  // Retention policies state
  const [retentionPolicies, setRetentionPolicies] = useState<RetentionPolicy[]>(
    () => seedPolicies(folderName),
  )
  const [editingRetentionIndex, setEditingRetentionIndex] = useState<
    number | null
  >(null)
  const [isRetentionWizardOpen, setIsRetentionWizardOpen] = useState(false)

  const handleAddRetentionPolicy = useCallback(() => {
    setEditingRetentionIndex(null)
    setIsRetentionWizardOpen(true)
  }, [])

  const handleEditRetentionPolicy = useCallback((index: number) => {
    setEditingRetentionIndex(index)
    setIsRetentionWizardOpen(true)
  }, [])

  const handleDeleteRetentionPolicy = useCallback((index: number) => {
    setRetentionPolicies((prev) => prev.filter((_, idx) => idx !== index))
    showToast({ message: 'Retention policy deleted.', variant: 'success' })
  }, [])

  const handleSaveRetentionPolicy = useCallback(
    (policy: RetentionPolicy) => {
      setRetentionPolicies((prev) => {
        if (
          editingRetentionIndex != null &&
          editingRetentionIndex >= 0 &&
          editingRetentionIndex < prev.length
        ) {
          return prev.map((p, idx) =>
            idx === editingRetentionIndex ? policy : p,
          )
        }
        return [...prev, policy]
      })
      setIsRetentionWizardOpen(false)
      setEditingRetentionIndex(null)
    },
    [editingRetentionIndex],
  )

  // Table pagination
  const {
    page: policyPage,
    pageSize: policyPageSize,
    pagination: policyPagination,
    paginationModel: policyPaginationModel,
    onPageChange: onPolicyPageChange,
    onPageSizeChange: onPolicyPageSizeChange,
    onPaginationChange: onPolicyPaginationChange,
  } = useSettingsTablePagination(10)

  const {
    page: rulePage,
    pageSize: rulePageSize,
    pagination: rulePagination,
    paginationModel: rulePaginationModel,
    onPageChange: onRulePageChange,
    onPageSizeChange: onRulePageSizeChange,
    onPaginationChange: onRulePaginationChange,
  } = useSettingsTablePagination(10)

  const breadcrumbConfig = useMemo(
    () => ({
      items: [
        { key: 'settings', label: 'Settings' },
        { key: 'folder-configuration', label: 'Folder Configuration' },
        { label: folderName ? `Security` : 'Folder Security' },
      ],
      onNavigate: (key: string) => {
        if (key === 'settings') {
          if (onBackToSettings) {
            onBackToSettings()
          } else {
            onBack()
          }
        } else if (key === 'folder-configuration') {
          onBack()
        }
      },
    }),
    [folderName, onBack, onBackToSettings],
  )

  useSettingsTopbar(breadcrumbConfig)

  const loadDataRequestIdRef = useRef(0)

  const loadUsersAndGroups = useCallback(async () => {
    const [uRes, gRes] = await Promise.all([getUsers(), getGroups()])
    if (!uRes.canceled && uRes.data) setUsers(uRes.data)
    if (!gRes.canceled && gRes.data) setGroups(gRes.data)
  }, [])

  const loadFolderPolicies = useCallback(async () => {
    setIsLoadingPolicies(true)
    const res = await getFolderSecurity(repositoryId, false)
    setIsLoadingPolicies(false)
    if (res.data?.policies) {
      const seenMap = new Map<string, FolderSecurityPolicy>()

      res.data.policies.forEach((policy: FolderSecurityPolicy) => {
        const pFlags = policy.permissions || {
          checkIn: false,
          checkOut: false,
          delete: false,
          download: false,
          editDocument: false,
          editMetadata: false,
          print: false,
          sendForSignature: false,
          upload: false,
          view: true,
        }

        ;(policy.userIds || []).forEach((uId: string) => {
          const key = `USER:${uId}`
          seenMap.set(key, {
            folderId: null,
            groupIds: [],
            permissions: { ...pFlags },
            userIds: [uId],
          })
        })
        ;(policy.groupIds || []).forEach((gId: string) => {
          const key = `GROUP:${gId}`
          seenMap.set(key, {
            folderId: null,
            groupIds: [gId],
            permissions: { ...pFlags },
            userIds: [],
          })
        })
      })

      setPolicies(Array.from(seenMap.values()))
    } else {
      setPolicies([])
    }
  }, [repositoryId])

  const loadDocumentRules = useCallback(async () => {
    setIsLoadingRules(true)
    const res = await getDocumentSecurity(repositoryId, false)
    setIsLoadingRules(false)
    if (res.data?.rules) {
      const explodedRules: DocumentSecurityRule[] = []

      res.data.rules.forEach((rule: DocumentSecurityRule) => {
        const action = rule.action === 'grant' ? 'grant' : 'hide'
        const match = rule.match === 'any' ? 'any' : 'all'
        const conditions = (rule.conditions || []).map((c) => ({
          field: c.field || '',
          op: c.op || 'equals',
          value: c.value || '',
        }))

        const userIds = rule.userIds || []
        const groupIds = rule.groupIds || []

        if (userIds.length === 0 && groupIds.length === 0) {
          explodedRules.push({
            action,
            conditions: JSON.parse(JSON.stringify(conditions)),
            groupIds: [],
            match,
            userIds: [],
          })
        }

        userIds.forEach((uId: string) => {
          explodedRules.push({
            action,
            conditions: JSON.parse(JSON.stringify(conditions)),
            groupIds: [],
            match,
            userIds: [uId],
          })
        })

        groupIds.forEach((gId: string) => {
          explodedRules.push({
            action,
            conditions: JSON.parse(JSON.stringify(conditions)),
            groupIds: [gId],
            match,
            userIds: [],
          })
        })
      })

      setRules(explodedRules)
    } else {
      setRules([])
    }
  }, [repositoryId])

  useEffect(() => {
    const requestId = ++loadDataRequestIdRef.current
    void (async () => {
      await loadUsersAndGroups()
      if (requestId !== loadDataRequestIdRef.current) return
      await Promise.all([loadFolderPolicies(), loadDocumentRules()])
    })()
  }, [loadUsersAndGroups, loadFolderPolicies, loadDocumentRules])

  const resolvePrincipalName = useCallback(
    (id: string, type: 'USER' | 'GROUP') => {
      if (type === 'USER') {
        const u = users.find((item) => item.id === id)
        return u
          ? u.displayName ||
              `${u.firstName || ''} ${u.lastName || ''}`.trim() ||
              u.email ||
              id
          : id
      }
      const g = groups.find((item) => (item.id || item.groupId) === id)
      return g ? String(g.name || g.description || id) : id
    },
    [users, groups],
  )

  // Policy Table handlers
  const handleAddPolicy = () => {
    setEditingPolicyIndex(null)
    setIsPolicyWizardOpen(true)
  }

  const handleEditPolicy = (index: number) => {
    setEditingPolicyIndex(index)
    setIsPolicyWizardOpen(true)
  }

  const handleDeletePolicy = async (index: number) => {
    const updated = policies.filter((_, idx) => idx !== index)
    setPolicies(updated)
    const res = await putFolderSecurity(repositoryId, {
      folderId: null,
      policies: updated,
    })
    if (res.error) {
      showToast({ message: res.error, variant: 'error' })
      void loadFolderPolicies()
      return
    }
    showToast({
      message: 'Folder security policy deleted.',
      variant: 'success',
    })
  }

  // Rule Table handlers
  const handleAddRule = () => {
    setEditingRuleIndex(null)
    setIsRuleWizardOpen(true)
  }

  const handleEditRule = (index: number) => {
    setEditingRuleIndex(index)
    setIsRuleWizardOpen(true)
  }

  const handleDeleteRule = async (index: number) => {
    const updated = rules.filter((_, idx) => idx !== index)
    setRules(updated)
    const res = await putDocumentSecurity(repositoryId, { rules: updated })
    if (res.error) {
      showToast({ message: res.error, variant: 'error' })
      void loadDocumentRules()
      return
    }
    showToast({
      message: 'Document security rule deleted.',
      variant: 'success',
    })
  }

  // Policy Table Columns
  const policyColumnHelper = useMemo(
    () => createColumnHelper<FolderSecurityPolicy>(),
    [],
  )

  const policyColumns = useMemo(
    () => [
      policyColumnHelper.accessor((row) => row, {
        header: 'Assigned Users & Groups',
        id: 'principals',
        cell: (info) => {
          const policy = info.getValue()
          const userIds = policy.userIds || []
          const groupIds = policy.groupIds || []

          const allItems = [
            ...userIds.map((id: string) => ({
              id,
              name: resolvePrincipalName(id, 'USER'),
              type: 'USER' as const,
            })),
            ...groupIds.map((id: string) => ({
              id,
              name: resolvePrincipalName(id, 'GROUP'),
              type: 'GROUP' as const,
            })),
          ]

          const maxDisplay = 3
          const displayed = allItems.slice(0, maxDisplay)
          const extraCount = allItems.length - maxDisplay

          return (
            <div className='flex flex-wrap items-center gap-3 py-1'>
              {displayed.map((item) => {
                const initials = getInitials(item.name)
                return (
                  <div
                    className='flex items-center gap-2'
                    key={`${item.type}-${item.id}`}
                  >
                    <div className='flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-full border border-primary-4/50 bg-white text-[10px] font-bold tracking-tight text-primary-11 shadow-2xs'>
                      {initials}
                    </div>
                    <span className='text-xs font-semibold text-gray-13'>
                      {item.name}
                    </span>
                  </div>
                )
              })}
              {extraCount > 0 && (
                <span className='text-xs font-medium text-gray-11'>
                  +{extraCount} more
                </span>
              )}
              {allItems.length === 0 && (
                <span className='text-xs text-gray-10 italic'>
                  No users or groups assigned
                </span>
              )}
            </div>
          )
        },
      }),
      policyColumnHelper.accessor('permissions', {
        header: 'Granted Permissions',
        id: 'permissions',
        cell: (info) => {
          const perms = info.getValue() || {}
          const count = (
            Object.keys(perms) as Array<keyof FolderPermissionFlags>
          ).filter((k) => perms[k]).length

          return (
            <div className='flex items-center gap-1.5 py-1'>
              <Icon
                className='size-4 shrink-0 text-gray-11'
                name='tabler:lock'
              />
              <span className='text-xs font-semibold text-gray-13'>
                {count}
              </span>
            </div>
          )
        },
      }),
      policyColumnHelper.display({
        header: '',
        id: 'actions',
        size: 56,
        cell: (info) => {
          const index = info.row.index
          return (
            <div
              className='flex items-center justify-end gap-1'
              onClick={(event) => event.stopPropagation()}
            >
              <Menu
                position='bottom-end'
                width={160}
                withinPortal
                target={
                  <IconButton
                    color='gray'
                    icon='lucide:more-horizontal'
                    size='md'
                    variant='ghost'
                  />
                }
              >
                <MenuItem
                  icon='lucide:pencil'
                  label='Edit'
                  onClick={() => handleEditPolicy(index)}
                />
                <MenuItem
                  className='text-red-11'
                  icon='lucide:trash-2'
                  iconClass='text-red-11'
                  label='Delete'
                  onClick={() => void handleDeletePolicy(index)}
                />
              </Menu>
            </div>
          )
        },
      }),
    ],
    [policyColumnHelper, resolvePrincipalName],
  )

  const policyTable = useReactTable({
    ...settingsTableCoreOptions,
    ...policyPaginationModel,
    columns: policyColumns,
    data: policies,
    state: {
      pagination: policyPagination,
    },
    getFilteredRowModel: getFilteredRowModel(),
    getRowId: (_, index) => String(index),
    onPaginationChange: onPolicyPaginationChange,
  })

  const { rowSize: policyRowSize, onRowSizeChange: onPolicyRowSizeChange } =
    useSettingsTableToolbar({
      isReLoading: isLoadingPolicies,
      table: policyTable,
      onReload: () => {
        void loadFolderPolicies()
      },
    })

  // Rule Table Columns
  const ruleColumnHelper = useMemo(
    () => createColumnHelper<DocumentSecurityRule>(),
    [],
  )

  const ruleColumns = useMemo(
    () => [
      ruleColumnHelper.accessor((row) => row, {
        header: 'Target Users & Groups',
        id: 'targets',
        cell: (info) => {
          const rule = info.getValue()
          const userIds = rule.userIds || []
          const groupIds = rule.groupIds || []

          const allItems = [
            ...userIds.map((id: string) => ({
              id,
              name: resolvePrincipalName(id, 'USER'),
              type: 'USER' as const,
            })),
            ...groupIds.map((id: string) => ({
              id,
              name: resolvePrincipalName(id, 'GROUP'),
              type: 'GROUP' as const,
            })),
          ]

          const maxDisplay = 3
          const displayed = allItems.slice(0, maxDisplay)
          const extraCount = allItems.length - maxDisplay

          return (
            <div className='flex flex-wrap items-center gap-3 py-1'>
              {displayed.map((item) => {
                const initials = getInitials(item.name)
                return (
                  <div
                    className='flex items-center gap-2'
                    key={`${item.type}-${item.id}`}
                  >
                    <div className='flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-full border border-primary-4/50 bg-white text-[10px] font-bold tracking-tight text-primary-11 shadow-2xs'>
                      {initials}
                    </div>
                    <span className='text-xs font-semibold text-gray-13'>
                      {item.name}
                    </span>
                  </div>
                )
              })}
              {extraCount > 0 && (
                <span className='text-xs font-medium text-gray-11'>
                  +{extraCount} more
                </span>
              )}
              {allItems.length === 0 && (
                <span className='text-xs text-gray-10 italic'>
                  No users or groups assigned
                </span>
              )}
            </div>
          )
        },
      }),
      ruleColumnHelper.accessor('action', {
        header: 'Effect Action',
        id: 'action',
        cell: (info) => {
          const action = info.getValue()
          return action === 'hide' ? (
            <span className='inline-flex items-center gap-1.5 rounded-md border border-red-3 bg-red-2 px-2.5 py-1 text-xs font-semibold text-red-11'>
              <Icon className='size-3.5 text-red-9' name='tabler:eye-off' />
              Hide Documents
            </span>
          ) : (
            <span className='inline-flex items-center gap-1.5 rounded-md border border-green-3 bg-green-2 px-2.5 py-1 text-xs font-semibold text-green-11'>
              <Icon className='size-3.5 text-green-9' name='tabler:eye' />
              Show Documents
            </span>
          )
        },
      }),
      ruleColumnHelper.accessor('match', {
        header: 'Match',
        id: 'match',
        cell: (info) => {
          const match = info.getValue()
          return (
            <span className='inline-flex rounded bg-primary-3 px-2 py-0.5 text-[11px] font-semibold text-primary-11'>
              {match === 'any' ? 'Any' : 'All'}
            </span>
          )
        },
      }),
      ruleColumnHelper.accessor('conditions', {
        header: 'Conditions',
        id: 'conditions',
        cell: (info) => {
          const conds = info.getValue() || []
          const count = conds.length

          return (
            <div className='flex items-center gap-1.5 py-1'>
              <Icon
                className='size-4 shrink-0 text-gray-11'
                name='tabler:square-check'
              />
              <span className='text-xs font-semibold text-gray-13'>
                {count}
              </span>
            </div>
          )
        },
      }),
      ruleColumnHelper.display({
        header: '',
        id: 'actions',
        size: 56,
        cell: (info) => {
          const index = info.row.index
          return (
            <div
              className='flex items-center justify-end gap-1'
              onClick={(event) => event.stopPropagation()}
            >
              <Menu
                position='bottom-end'
                width={160}
                withinPortal
                target={
                  <IconButton
                    color='gray'
                    icon='lucide:more-horizontal'
                    size='md'
                    variant='ghost'
                  />
                }
              >
                <MenuItem
                  icon='lucide:pencil'
                  label='Edit'
                  onClick={() => handleEditRule(index)}
                />
                <MenuItem
                  className='text-red-11'
                  icon='lucide:trash-2'
                  iconClass='text-red-11'
                  label='Delete'
                  onClick={() => void handleDeleteRule(index)}
                />
              </Menu>
            </div>
          )
        },
      }),
    ],
    [ruleColumnHelper, resolvePrincipalName],
  )

  const ruleTable = useReactTable({
    ...settingsTableCoreOptions,
    ...rulePaginationModel,
    columns: ruleColumns,
    data: rules,
    state: {
      pagination: rulePagination,
    },
    getFilteredRowModel: getFilteredRowModel(),
    getRowId: (_, index) => String(index),
    onPaginationChange: onRulePaginationChange,
  })

  const { rowSize: ruleRowSize, onRowSizeChange: onRuleRowSizeChange } =
    useSettingsTableToolbar({
      isReLoading: isLoadingRules,
      table: ruleTable,
      onReload: () => {
        void loadDocumentRules()
      },
    })

  // If Wizard is open for Folder Security
  if (activeTab === 'folder' && isPolicyWizardOpen) {
    const initialPolicy =
      editingPolicyIndex != null ? policies[editingPolicyIndex] : null
    return (
      <FolderSecurityPolicyWizard
        editingIndex={editingPolicyIndex}
        existingPolicies={policies}
        folderName={folderName}
        initialPolicy={initialPolicy}
        repositoryId={repositoryId}
        onClose={() => setIsPolicyWizardOpen(false)}
        onSaveSuccess={() => void loadFolderPolicies()}
      />
    )
  }

  // If Wizard is open for Document Security
  if (activeTab === 'document' && isRuleWizardOpen) {
    const initialRule =
      editingRuleIndex != null ? rules[editingRuleIndex] : null
    return (
      <DocumentSecurityRuleWizard
        editingIndex={editingRuleIndex}
        existingRules={rules}
        folderName={folderName}
        initialRule={initialRule}
        repositoryId={repositoryId}
        onClose={() => setIsRuleWizardOpen(false)}
        onSaveSuccess={() => void loadDocumentRules()}
      />
    )
  }

  // If Wizard is open for Retention Policy
  if (activeTab === 'retention' && isRetentionWizardOpen) {
    const initialPolicy =
      editingRetentionIndex != null
        ? retentionPolicies[editingRetentionIndex]
        : null
    return (
      <FolderRetentionPolicyWizard
        editingIndex={editingRetentionIndex}
        folderName={folderName}
        initialPolicy={initialPolicy}
        onClose={() => {
          setIsRetentionWizardOpen(false)
          setEditingRetentionIndex(null)
        }}
        onSave={handleSaveRetentionPolicy}
      />
    )
  }

  return (
    <div className='flex h-full min-h-0 flex-col overflow-hidden bg-[var(--surface)]'>
      {/* Tab Header */}
      <div className='flex min-h-10 flex-wrap items-center justify-between gap-3 border-b border-[var(--border-default)] bg-[var(--surface)] px-4'>
        <div className='flex h-10 min-w-0 items-center'>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key

            return (
              <button
                key={tab.key}
                type='button'
                className={cn(
                  'relative mr-6 flex h-10 items-center text-sm font-medium transition',
                  isActive
                    ? 'font-semibold text-[var(--primary-9)]'
                    : 'text-[var(--gray-11)] hover:text-[var(--primary-9)]',
                )}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}

                {isActive ? (
                  <span className='absolute bottom-0 left-0 h-[2px] w-full bg-[var(--primary-9)]' />
                ) : null}
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className='flex min-h-0 flex-1 flex-col overflow-hidden p-4 md:p-6'>
        {activeTab === 'retention' ? (
          <FolderRetention
            folderName={folderName}
            policies={retentionPolicies}
            onAddPolicy={handleAddRetentionPolicy}
            onDeletePolicy={handleDeleteRetentionPolicy}
            onEditPolicy={handleEditRetentionPolicy}
          />
        ) : activeTab === 'folder' ? (
          <div className='flex min-h-0 flex-1 flex-col gap-4'>
            <div className='flex items-center justify-between'>
              <div>
                <h2 className='text-15 font-semibold text-gray-13'>
                  Folder Security Policies
                </h2>
                <p className='mt-0.5 text-xs text-gray-11'>
                  Manage access policies and privileges for folder &quot;
                  {folderName}&quot;
                </p>
              </div>
              <Button
                icon='tabler:plus'
                label='Add Policy'
                size='sm'
                onClick={handleAddPolicy}
              />
            </div>

            <Divider />

            <div className='mt-2 flex min-h-0 flex-1 flex-col overflow-hidden'>
              <div className='min-h-0 flex-1 overflow-hidden rounded-lg border border-[var(--border-default)] bg-surface shadow-2xs'>
                <DataTable
                  emptyDescription="No folder security policies found. Click 'Add Policy' to configure access rules."
                  emptyIcon='tabler:shield'
                  emptyTitle='No Security Policies'
                  isLoading={isLoadingPolicies}
                  isReLoading={isLoadingPolicies}
                  rowSize={policyRowSize}
                  table={policyTable}
                  hideActionBar
                  hideGrouping
                  stickyHeader
                  onReload={() => {
                    void loadFolderPolicies()
                  }}
                  onRowSizeChange={onPolicyRowSizeChange}
                />
              </div>

              <Pagination
                className='mt-4 shrink-0'
                itemLabel='Policies'
                page={policyPage}
                pageSize={policyPageSize}
                showPageNumbers={false}
                totalItems={policyTable.getFilteredRowModel().rows.length}
                onPageChange={onPolicyPageChange}
                onPageSizeChange={onPolicyPageSizeChange}
              />
            </div>
          </div>
        ) : (
          <div className='flex min-h-0 flex-1 flex-col gap-4'>
            <div className='flex items-center justify-between'>
              <div>
                <h2 className='text-15 font-semibold text-gray-13'>
                  Document Security Rules
                </h2>
                <p className='mt-0.5 text-xs text-gray-11'>
                  Manage document-level access rules evaluated against document
                  metadata for folder &quot;{folderName}&quot;
                </p>
              </div>
              <Button
                icon='tabler:plus'
                label='Add Document Rule'
                size='sm'
                onClick={handleAddRule}
              />
            </div>

            <Divider />

            <div className='mt-2 flex min-h-0 flex-1 flex-col overflow-hidden'>
              <div className='min-h-0 flex-1 overflow-hidden rounded-lg border border-[var(--border-default)] bg-surface shadow-2xs'>
                <DataTable
                  emptyDescription="No document security rules found. Click 'Add Document Rule' to set up metadata rules."
                  emptyIcon='tabler:adjustments'
                  emptyTitle='No Document Rules'
                  isLoading={isLoadingRules}
                  isReLoading={isLoadingRules}
                  rowSize={ruleRowSize}
                  table={ruleTable}
                  hideActionBar
                  hideGrouping
                  stickyHeader
                  onReload={() => {
                    void loadDocumentRules()
                  }}
                  onRowSizeChange={onRuleRowSizeChange}
                />
              </div>

              <Pagination
                className='mt-4 shrink-0'
                itemLabel='Rules'
                page={rulePage}
                pageSize={rulePageSize}
                showPageNumbers={false}
                totalItems={ruleTable.getFilteredRowModel().rows.length}
                onPageChange={onRulePageChange}
                onPageSizeChange={onRulePageSizeChange}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
