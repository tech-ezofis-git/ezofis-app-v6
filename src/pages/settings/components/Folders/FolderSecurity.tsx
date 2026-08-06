import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createColumnHelper, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import cn from '@/utils/cn'
import { getUsers, getGroups, type V6UserListItem, type V6GroupItem } from '@/api/v6/user'
import {
  getFolderSecurity,
  putFolderSecurity,
  getDocumentSecurity,
  putDocumentSecurity,
  type FolderPermissionFlags,
  type FolderSecurityPolicy,
  type DocumentSecurityRule,
} from '@/api/v6/folder/security'
import showToast from '@/components/base/toast/showToast'
import DataTable from '@/components/base/data-table/DataTable'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import Menu from '@/components/base/menu/Menu'
import MenuItem from '@/components/base/menu/MenuItem'
import Icon from '@/components/base/icon/Icon'
import Divider from '@/components/base/Divider'
import useSettingsTopbar from '../../hooks/useSettingsTopbar'
import DocumentSecurityRuleWizard from './DocumentSecurityRuleWizard'
import FolderSecurityPolicyWizard from './FolderSecurityPolicyWizard'

export type FolderSecurityProps = {
  folderName: string
  repositoryId?: string
  onBack: () => void
  onBackToSettings?: () => void
}

type TabKey = 'folder' | 'document'

const tabs: { key: TabKey; label: string }[] = [
  { key: 'folder', label: 'Folder Security' },
  { key: 'document', label: 'Document Security' },
]

const PERMISSION_NAMES: Record<keyof FolderPermissionFlags, string> = {
  view: 'View',
  upload: 'Upload',
  download: 'Download',
  print: 'Print',
  delete: 'Delete',
  editMetadata: 'Edit Metadata',
  editDocument: 'Edit Document',
  checkOut: 'Check Out',
  checkIn: 'Check In',
  sendForSignature: 'Send for Signature',
}

const getInitials = (name: string) => {
  if (!name) return '?'
  const clean = name.replace(/^(User:|Group:)\s*/i, '').trim()
  const parts = clean.split(/\s+/)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return clean.slice(0, 2).toUpperCase()
}

const getAvatarColor = (str: string) => {
  const colors = [
    'bg-[var(--violet-9)] text-white',
    'bg-[var(--blue-9)] text-white',
    'bg-[var(--green-9)] text-white',
    'bg-[var(--orange-9)] text-white',
    'bg-[var(--pink-9)] text-white',
    'bg-[var(--cyan-9)] text-white',
    'bg-[var(--teal-9)] text-white',
    'bg-[var(--indigo-9)] text-white',
  ]
  let hash = 0
  for (let i = 0; i < str.length; i++)
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
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
  const [editingPolicyIndex, setEditingPolicyIndex] = useState<number | null>(null)
  const [isPolicyWizardOpen, setIsPolicyWizardOpen] = useState(false)

  // Document security rules state
  const [rules, setRules] = useState<DocumentSecurityRule[]>([])
  const [isLoadingRules, setIsLoadingRules] = useState(true)
  const [editingRuleIndex, setEditingRuleIndex] = useState<number | null>(null)
  const [isRuleWizardOpen, setIsRuleWizardOpen] = useState(false)

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
          view: true,
          upload: false,
          download: false,
          print: false,
          delete: false,
          editMetadata: false,
          editDocument: false,
          checkOut: false,
          checkIn: false,
          sendForSignature: false,
        }

        ;(policy.userIds || []).forEach((uId: string) => {
          const key = `USER:${uId}`
          seenMap.set(key, {
            folderId: null,
            userIds: [uId],
            groupIds: [],
            permissions: { ...pFlags },
          })
        })

        ;(policy.groupIds || []).forEach((gId: string) => {
          const key = `GROUP:${gId}`
          seenMap.set(key, {
            folderId: null,
            userIds: [],
            groupIds: [gId],
            permissions: { ...pFlags },
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
            match,
            conditions: JSON.parse(JSON.stringify(conditions)),
            userIds: [],
            groupIds: [],
          })
        }

        userIds.forEach((uId: string) => {
          explodedRules.push({
            action,
            match,
            conditions: JSON.parse(JSON.stringify(conditions)),
            userIds: [uId],
            groupIds: [],
          })
        })

        groupIds.forEach((gId: string) => {
          explodedRules.push({
            action,
            match,
            conditions: JSON.parse(JSON.stringify(conditions)),
            userIds: [],
            groupIds: [gId],
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
        return u ? (u.displayName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email || id) : id
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
    const res = await putFolderSecurity(repositoryId, { folderId: null, policies: updated })
    if (res.error) {
      showToast({ message: res.error, variant: 'error' })
      void loadFolderPolicies()
      return
    }
    showToast({ message: 'Folder security policy deleted.', variant: 'success' })
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
    showToast({ message: 'Document security rule deleted.', variant: 'success' })
  }

  // Policy Table Columns
  const policyColumnHelper = useMemo(() => createColumnHelper<FolderSecurityPolicy>(), [])

  const policyColumns = useMemo(
    () => [
      policyColumnHelper.accessor((row) => row, {
        id: 'principals',
        header: 'Assigned Users & Groups',
        cell: (info) => {
          const policy = info.getValue()
          const userIds = policy.userIds || []
          const groupIds = policy.groupIds || []

          const allItems = [
            ...userIds.map((id: string) => ({ id, type: 'USER' as const, name: resolvePrincipalName(id, 'USER') })),
            ...groupIds.map((id: string) => ({ id, type: 'GROUP' as const, name: resolvePrincipalName(id, 'GROUP') })),
          ]

          const maxDisplay = 3
          const displayed = allItems.slice(0, maxDisplay)
          const extraCount = allItems.length - maxDisplay

          return (
            <div className="flex flex-wrap items-center gap-1.5 py-1">
              {displayed.map((item) => {
                const initials = getInitials(item.name)
                const avatarBg = getAvatarColor(item.name)
                return (
                  <span
                    key={`${item.type}-${item.id}`}
                    className="inline-flex h-7 items-center gap-1.5 rounded-md border border-[var(--border-default)] bg-surface-muted px-2 py-0.5 text-xs font-medium text-gray-13"
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${avatarBg}`}
                    >
                      {initials}
                    </span>
                    {item.name}
                  </span>
                )
              })}
              {extraCount > 0 && (
                <span className="inline-flex rounded-md border border-[var(--border-default)] bg-surface-muted px-2 py-0.5 text-xs font-medium text-gray-11">
                  +{extraCount} more
                </span>
              )}
              {allItems.length === 0 && (
                <span className="text-xs italic text-gray-10">No users or groups assigned</span>
              )}
            </div>
          )
        },
      }),
      policyColumnHelper.accessor('permissions', {
        id: 'permissions',
        header: 'Granted Permissions',
        cell: (info) => {
          const perms = info.getValue() || {}
          const enabledKeys = (Object.keys(perms) as Array<keyof FolderPermissionFlags>).filter(
            (k) => perms[k],
          )

          const maxDisplay = 4
          const displayed = enabledKeys.slice(0, maxDisplay)
          const extraCount = enabledKeys.length - maxDisplay

          return (
            <div className="flex flex-wrap items-center gap-1.5 py-1">
              {displayed.map((key) => (
                <span
                  key={key}
                  className="inline-flex items-center gap-1 rounded-md border border-primary-4 bg-primary-2 px-2 py-0.5 text-[11px] font-semibold text-primary-11"
                >
                  {PERMISSION_NAMES[key] || key}
                </span>
              ))}
              {extraCount > 0 && (
                <span className="inline-flex rounded-md border border-[var(--border-default)] bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-gray-11">
                  +{extraCount} more
                </span>
              )}
            </div>
          )
        },
      }),
      policyColumnHelper.display({
        id: 'actions',
        header: '',
        size: 56,
        cell: (info) => {
          const index = info.row.index
          return (
            <div
              className="flex items-center justify-end gap-1"
              onClick={(event) => event.stopPropagation()}
            >
              <Menu
                position="bottom-end"
                width={160}
                withinPortal
                target={
                  <IconButton
                    color="gray"
                    icon="lucide:more-horizontal"
                    size="md"
                    variant="ghost"
                  />
                }
              >
                <MenuItem
                  icon="lucide:pencil"
                  label="Edit"
                  onClick={() => handleEditPolicy(index)}
                />
                <MenuItem
                  className="text-red-11"
                  icon="lucide:trash-2"
                  iconClass="text-red-11"
                  label="Delete"
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
    data: policies,
    columns: policyColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (_, index) => String(index),
  })

  // Rule Table Columns
  const ruleColumnHelper = useMemo(() => createColumnHelper<DocumentSecurityRule>(), [])

  const ruleColumns = useMemo(
    () => [
      ruleColumnHelper.accessor((row) => row, {
        id: 'targets',
        header: 'Target Users & Groups',
        cell: (info) => {
          const rule = info.getValue()
          const userIds = rule.userIds || []
          const groupIds = rule.groupIds || []

          const allItems = [
            ...userIds.map((id: string) => ({ id, type: 'USER' as const, name: resolvePrincipalName(id, 'USER') })),
            ...groupIds.map((id: string) => ({ id, type: 'GROUP' as const, name: resolvePrincipalName(id, 'GROUP') })),
          ]

          const maxDisplay = 3
          const displayed = allItems.slice(0, maxDisplay)
          const extraCount = allItems.length - maxDisplay

          return (
            <div className="flex flex-wrap items-center gap-1.5 py-1">
              {displayed.map((item) => {
                const initials = getInitials(item.name)
                const avatarBg = getAvatarColor(item.name)
                return (
                  <span
                    key={`${item.type}-${item.id}`}
                    className="inline-flex h-7 items-center gap-1.5 rounded-md border border-[var(--border-default)] bg-surface-muted px-2 py-0.5 text-xs font-medium text-gray-13"
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${avatarBg}`}
                    >
                      {initials}
                    </span>
                    {item.name}
                  </span>
                )
              })}
              {extraCount > 0 && (
                <span className="inline-flex rounded-md border border-[var(--border-default)] bg-surface-muted px-2 py-0.5 text-xs font-medium text-gray-11">
                  +{extraCount} more
                </span>
              )}
            </div>
          )
        },
      }),
      ruleColumnHelper.accessor('action', {
        id: 'action',
        header: 'Effect Action',
        cell: (info) => {
          const action = info.getValue()
          return action === 'hide' ? (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-red-3 bg-red-2 px-2.5 py-1 text-xs font-semibold text-red-11">
              <Icon name="tabler:eye-off" className="size-3.5 text-red-9" />
              Hide Documents
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-green-3 bg-green-2 px-2.5 py-1 text-xs font-semibold text-green-11">
              <Icon name="tabler:eye" className="size-3.5 text-green-9" />
              Show Documents
            </span>
          )
        },
      }),
      ruleColumnHelper.accessor('match', {
        id: 'match',
        header: 'Match',
        cell: (info) => {
          const match = info.getValue()
          return (
            <span className="inline-flex rounded bg-primary-3 px-2 py-0.5 text-[11px] font-semibold text-primary-11">
              {match === 'any' ? 'Any' : 'All'}
            </span>
          )
        },
      }),
      ruleColumnHelper.accessor('conditions', {
        id: 'conditions',
        header: 'Conditions',
        cell: (info) => {
          const conds = info.getValue() || []
          const match = info.row.original.match
          const joinText = match === 'any' ? ' OR ' : ' AND '

          return (
            <div className="flex flex-wrap items-center gap-1 text-xs text-gray-12 py-1">
              {conds.map((c: any, idx: number) => (
                <span key={idx} className="inline-flex items-center gap-1">
                  {idx > 0 && <span className="text-[10px] font-bold text-gray-9">{joinText}</span>}
                  <span className="rounded bg-surface-muted px-1.5 py-0.5 border border-[var(--border-default)]">
                    <strong className="font-semibold text-gray-13">{c.field || 'Field'}</strong>{' '}
                    <span className="text-gray-10">{c.op}</span>{' '}
                    {c.value && <strong className="font-semibold text-primary-11">&quot;{c.value}&quot;</strong>}
                  </span>
                </span>
              ))}
            </div>
          )
        },
      }),
      ruleColumnHelper.display({
        id: 'actions',
        header: '',
        size: 56,
        cell: (info) => {
          const index = info.row.index
          return (
            <div
              className="flex items-center justify-end gap-1"
              onClick={(event) => event.stopPropagation()}
            >
              <Menu
                position="bottom-end"
                width={160}
                withinPortal
                target={
                  <IconButton
                    color="gray"
                    icon="lucide:more-horizontal"
                    size="md"
                    variant="ghost"
                  />
                }
              >
                <MenuItem
                  icon="lucide:pencil"
                  label="Edit"
                  onClick={() => handleEditRule(index)}
                />
                <MenuItem
                  className="text-red-11"
                  icon="lucide:trash-2"
                  iconClass="text-red-11"
                  label="Delete"
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
    data: rules,
    columns: ruleColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (_, index) => String(index),
  })

  // If Wizard is open for Folder Security
  if (activeTab === 'folder' && isPolicyWizardOpen) {
    const initialPolicy = editingPolicyIndex != null ? policies[editingPolicyIndex] : null
    return (
      <FolderSecurityPolicyWizard
        folderName={folderName}
        repositoryId={repositoryId}
        initialPolicy={initialPolicy}
        existingPolicies={policies}
        editingIndex={editingPolicyIndex}
        onSaveSuccess={() => void loadFolderPolicies()}
        onClose={() => setIsPolicyWizardOpen(false)}
      />
    )
  }

  // If Wizard is open for Document Security
  if (activeTab === 'document' && isRuleWizardOpen) {
    const initialRule = editingRuleIndex != null ? rules[editingRuleIndex] : null
    return (
      <DocumentSecurityRuleWizard
        folderName={folderName}
        repositoryId={repositoryId}
        initialRule={initialRule}
        existingRules={rules}
        editingIndex={editingRuleIndex}
        onSaveSuccess={() => void loadDocumentRules()}
        onClose={() => setIsRuleWizardOpen(false)}
      />
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[var(--surface)]">
      {/* Tab Header */}
      <div className="flex min-h-10 flex-wrap items-center justify-between gap-3 border-b border-[var(--border-default)] bg-[var(--surface)] px-4">
        <div className="flex h-10 min-w-0 items-center">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key

            return (
              <button
                key={tab.key}
                type="button"
                className={cn(
                  'relative mr-6 flex h-10 items-center text-sm font-medium transition',
                  isActive
                    ? 'text-[var(--primary-9)] font-semibold'
                    : 'text-[var(--gray-11)] hover:text-[var(--primary-9)]',
                )}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}

                {isActive ? (
                  <span className="absolute bottom-0 left-0 h-[2px] w-full bg-[var(--primary-9)]" />
                ) : null}
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
        {activeTab === 'folder' ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-15 font-semibold text-gray-13">
                  Folder Security Policies ({policies.length})
                </h2>
                <p className="mt-0.5 text-xs text-gray-11">
                  Manage access policies and privileges for folder &quot;{folderName}&quot;
                </p>
              </div>
              <Button
                icon="tabler:plus"
                label="Add Policy"
                size="sm"
                onClick={handleAddPolicy}
              />
            </div>

            <Divider />

            <div className="rounded-lg border border-[var(--border-default)] bg-surface shadow-2xs overflow-hidden">
              <DataTable
                emptyDescription="No folder security policies found. Click 'Add Policy' to configure access rules."
                emptyIcon="tabler:shield"
                emptyTitle="No Security Policies"
                isLoading={isLoadingPolicies}
                isReLoading={isLoadingPolicies}
                onReload={() => {
                  void loadFolderPolicies()
                }}
                table={policyTable}
                hideActionBar
                hideGrouping
                stickyHeader
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-15 font-semibold text-gray-13">
                  Document Security Rules ({rules.length})
                </h2>
                <p className="mt-0.5 text-xs text-gray-11">
                  Manage document-level access rules evaluated against document metadata for folder &quot;{folderName}&quot;
                </p>
              </div>
              <Button
                icon="tabler:plus"
                label="Add Document Rule"
                size="sm"
                onClick={handleAddRule}
              />
            </div>

            <Divider />

            <div className="rounded-lg border border-[var(--border-default)] bg-surface shadow-2xs overflow-hidden">
              <DataTable
                emptyDescription="No document security rules found. Click 'Add Document Rule' to set up metadata rules."
                emptyIcon="tabler:adjustments"
                emptyTitle="No Document Rules"
                isLoading={isLoadingRules}
                isReLoading={isLoadingRules}
                onReload={() => {
                  void loadDocumentRules()
                }}
                table={ruleTable}
                hideActionBar
                hideGrouping
                stickyHeader
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
