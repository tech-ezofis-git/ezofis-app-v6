import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import cn from '@/utils/cn'
import { getUsers, getGroups, type V6UserListItem, type V6GroupItem } from '@/api/v6/user'
import {
  putFolderSecurity,
  type FolderPermissionFlags,
  type FolderSecurityPolicy,
} from '@/api/v6/folder/security'
import showToast from '@/components/base/toast/showToast'
import InputSelectMultiple from '@/components/base/inputs/InputSelectMultiple'
import Stepper from '@/components/base/Stepper'
import Button from '@/components/base/button/Button'
import Divider from '@/components/base/Divider'
import Alert from '@/components/base/Alert'
import Icon from '@/components/base/icon/Icon'
import Skeleton from '@/components/base/Skeleton'
import SettingsSelectedChips from '../SettingsSelectedChips'
import SettingsSearchInput from '../SettingsSearchInput'

type Step = 0 | 1 | 2

type Principal = {
  id: string
  name: string
  type: 'USER' | 'GROUP'
}

type Permission = {
  id: keyof FolderPermissionFlags
  name: string
  description: string
  enabled: boolean
}

const STEPPER_ITEMS = [
  {
    description: 'Select target access',
    icon: 'tabler:users',
    id: 0,
    label: 'Users & Groups',
  },
  {
    description: 'Set access privileges',
    icon: 'tabler:shield',
    id: 1,
    label: 'Permissions',
  },
  {
    description: 'Review and save policy',
    icon: 'tabler:check',
    id: 2,
    label: 'Review & Save',
  },
]

const DEFAULT_PERMISSIONS: Permission[] = [
  { id: 'view', name: 'View', description: 'Open folder and files', enabled: true },
  { id: 'upload', name: 'Upload', description: 'Upload new files', enabled: false },
  { id: 'download', name: 'Download', description: 'Download documents', enabled: false },
  { id: 'print', name: 'Print', description: 'Print documents', enabled: false },
  { id: 'delete', name: 'Delete', description: 'Delete files or folders', enabled: false },
  { id: 'editMetadata', name: 'Edit Metadata', description: 'Modify metadata fields', enabled: false },
  { id: 'editDocument', name: 'Edit Document', description: 'Modify document content', enabled: false },
  { id: 'checkOut', name: 'Check Out', description: 'Lock document for editing', enabled: false },
  { id: 'checkIn', name: 'Check In', description: 'Complete editing session', enabled: false },
  { id: 'sendForSignature', name: 'Send for Signature', description: 'Create signature request', enabled: false },
]

const PERMISSION_ICON_MAP: Record<keyof FolderPermissionFlags, string> = {
  view: 'tabler:eye',
  upload: 'tabler:upload',
  download: 'tabler:download',
  print: 'tabler:printer',
  delete: 'tabler:trash',
  editMetadata: 'tabler:file-text',
  editDocument: 'tabler:edit',
  checkOut: 'tabler:lock',
  checkIn: 'tabler:lock-open',
  sendForSignature: 'tabler:writing',
}

const SELECT_ALL_OPTION_ID = '__select_all__'

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

const SecurityWizardSkeleton = () => (
  <div className="flex flex-col gap-4 animate-in fade-in duration-300">
    <div className="space-y-1.5">
      <Skeleton className="h-5 w-60 rounded-md" />
      <Skeleton className="h-3.5 w-80 rounded-md" />
    </div>

    <Divider />

    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
      <Skeleton className="h-14 w-full rounded-lg" />
      <Skeleton className="h-14 w-full rounded-lg" />
      <Skeleton className="h-14 w-full rounded-lg" />
    </div>

    <div className="space-y-3 pt-2">
      <Skeleton className="h-4 w-36 rounded-md" />
      <Skeleton className="h-10 w-full rounded-lg" />
      <div className="flex gap-2">
        <Skeleton className="h-7 w-28 rounded-md" />
        <Skeleton className="h-7 w-32 rounded-md" />
        <Skeleton className="h-7 w-24 rounded-md" />
      </div>
    </div>

    <div className="space-y-2 pt-2">
      <Skeleton className="h-16 w-full rounded-lg" />
      <Skeleton className="h-16 w-full rounded-lg" />
    </div>
  </div>
)

export default function FolderSecurityPolicyWizard({
  folderName,
  repositoryId = '',
  initialPolicy = null,
  existingPolicies = [],
  editingIndex = null,
  onSaveSuccess,
  onClose,
}: {
  folderName: string
  repositoryId?: string
  initialPolicy?: FolderSecurityPolicy | null
  existingPolicies?: FolderSecurityPolicy[]
  editingIndex?: number | null
  onSaveSuccess?: () => void
  onClose: () => void
}) {
  const [step, setStep] = useState<Step>(0)
  const [users, setUsers] = useState<V6UserListItem[]>([])
  const [groups, setGroups] = useState<V6GroupItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [accessError, setAccessError] = useState<string | null>(null)

  const [selectedPrincipals, setSelectedPrincipals] = useState<Principal[]>([])
  const [permissions, setPermissions] = useState<Permission[]>(DEFAULT_PERMISSIONS)
  const [permissionSearch, setPermissionSearch] = useState('')
  const [showSelectionError, setShowSelectionError] = useState(false)

  const loadDataRequestIdRef = useRef(0)

  const loadData = useCallback(async () => {
    const requestId = ++loadDataRequestIdRef.current
    setAccessError(null)
    setIsLoading(true)

    const [uRes, gRes] = await Promise.all([getUsers(), getGroups()])
    if (requestId !== loadDataRequestIdRef.current) return

    const userList = uRes.canceled ? [] : uRes.data || []
    const groupList = gRes.canceled ? [] : gRes.data || []
    if (!uRes.canceled) setUsers(userList)
    if (!gRes.canceled) setGroups(groupList)
    setIsLoading(false)

    // Pre-fill initial policy if editing
    if (initialPolicy) {
      const loadedPrincipals: Principal[] = []
      ;(initialPolicy.userIds || []).forEach((uId: string) => {
        const matched = userList.find((u) => u.id === uId)
        loadedPrincipals.push({
          id: uId,
          name: matched ? (matched.displayName || `${matched.firstName || ''} ${matched.lastName || ''}`.trim() || matched.email || uId) : uId,
          type: 'USER',
        })
      })

      ;(initialPolicy.groupIds || []).forEach((gId: string) => {
        const matched = groupList.find((g) => (g.id || g.groupId) === gId)
        loadedPrincipals.push({
          id: gId,
          name: matched ? String(matched.name || matched.description || gId) : gId,
          type: 'GROUP',
        })
      })

      setSelectedPrincipals(loadedPrincipals)

      if (initialPolicy.permissions) {
        const pMap = initialPolicy.permissions
        setPermissions(
          DEFAULT_PERMISSIONS.map((p) => ({
            ...p,
            enabled: p.id === 'view' ? true : Boolean(pMap[p.id]),
          })),
        )
      }
    }
  }, [initialPolicy])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const userOptions = useMemo(
    () =>
      users.map((u) => {
        const uName =
          u.displayName ||
          `${u.firstName || ''} ${u.lastName || ''}`.trim() ||
          u.email ||
          u.id
        return {
          id: String(u.id),
          name: uName,
        }
      }),
    [users],
  )

  const groupOptions = useMemo(
    () =>
      groups.map((g) => {
        const gId = String(g.id || g.groupId || '')
        const gName = String(g.name || g.description || gId || 'Group')
        return {
          id: gId,
          name: gName,
        }
      }),
    [groups],
  )

  const selectedUsers = useMemo(
    () => selectedPrincipals.filter((p) => p.type === 'USER'),
    [selectedPrincipals],
  )

  const selectedGroups = useMemo(
    () => selectedPrincipals.filter((p) => p.type === 'GROUP'),
    [selectedPrincipals],
  )

  const userDropdownOptions = useMemo(() => {
    if (userOptions.length === 0) return userOptions
    return [
      {
        id: SELECT_ALL_OPTION_ID,
        name: 'All',
      },
      ...userOptions,
    ]
  }, [userOptions])

  const groupDropdownOptions = useMemo(() => {
    if (groupOptions.length === 0) return groupOptions
    return [
      {
        id: SELECT_ALL_OPTION_ID,
        name: 'All',
      },
      ...groupOptions,
    ]
  }, [groupOptions])

  const allUsersSelected =
    userOptions.length > 0 && selectedUsers.length === userOptions.length
  const allGroupsSelected =
    groupOptions.length > 0 && selectedGroups.length === groupOptions.length

  const onSelectedUsersChange = (selectedOptions: any[]) => {
    const hasAll = selectedOptions.some(
      (opt) => String(opt.id || opt.value || '') === SELECT_ALL_OPTION_ID,
    )
    const withoutAll = selectedOptions.filter(
      (opt) => String(opt.id || opt.value || '') !== SELECT_ALL_OPTION_ID,
    )

    if (hasAll) {
      setShowSelectionError(false)
      setSelectedPrincipals([
        ...userOptions.map((opt) => ({
          id: opt.id,
          name: opt.name,
          type: 'USER' as const,
        })),
        ...selectedGroups,
      ])
      return
    }

    if (allUsersSelected && withoutAll.length === 0) {
      setShowSelectionError(false)
      setSelectedPrincipals([...selectedGroups])
      return
    }

    const nextUsers: Principal[] = withoutAll.map((opt) => {
      const optId = String(opt.id || opt.value || '')
      const found = userOptions.find((p) => p.id === optId)
      return {
        id: optId,
        name: found ? found.name : String(opt.name || opt.label || optId),
        type: 'USER' as const,
      }
    })

    setShowSelectionError(false)
    setSelectedPrincipals([...nextUsers, ...selectedGroups])
  }

  const onSelectedGroupsChange = (selectedOptions: any[]) => {
    const hasAll = selectedOptions.some(
      (opt) => String(opt.id || opt.value || '') === SELECT_ALL_OPTION_ID,
    )
    const withoutAll = selectedOptions.filter(
      (opt) => String(opt.id || opt.value || '') !== SELECT_ALL_OPTION_ID,
    )

    if (hasAll) {
      setShowSelectionError(false)
      setSelectedPrincipals([
        ...selectedUsers,
        ...groupOptions.map((opt) => ({
          id: opt.id,
          name: opt.name,
          type: 'GROUP' as const,
        })),
      ])
      return
    }

    if (allGroupsSelected && withoutAll.length === 0) {
      setShowSelectionError(false)
      setSelectedPrincipals([...selectedUsers])
      return
    }

    const nextGroups: Principal[] = withoutAll.map((opt) => {
      const optId = String(opt.id || opt.value || '')
      const found = groupOptions.find((p) => p.id === optId)
      return {
        id: optId,
        name: found ? found.name : String(opt.name || opt.label || optId),
        type: 'GROUP' as const,
      }
    })

    setShowSelectionError(false)
    setSelectedPrincipals([...selectedUsers, ...nextGroups])
  }

  const ensurePrincipalSelection = () => {
    if (selectedPrincipals.length > 0) {
      setShowSelectionError(false)
      return true
    }

    setShowSelectionError(true)
    showToast({
      message: 'Select at least one user or group to continue.',
      variant: 'error',
    })
    return false
  }

  const goToStep = (nextStep: Step) => {
    if (nextStep > 0 && selectedPrincipals.length === 0) {
      setStep(0)
      ensurePrincipalSelection()
      return
    }

    setShowSelectionError(false)
    setStep(nextStep)
  }

  const togglePermission = (id: keyof FolderPermissionFlags) => {
    if (id === 'view') return
    setPermissions((prev) =>
      prev.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p)),
    )
  }

  const toggleAllPermissions = () => {
    const togglablePermissions = permissions.filter((p) => p.id !== 'view')
    const allEnabled = togglablePermissions.every((p) => p.enabled)
    setPermissions((prev) =>
      prev.map((p) => (p.id === 'view' ? { ...p, enabled: true } : { ...p, enabled: !allEnabled })),
    )
  }

  const savePolicy = async () => {
    if (selectedPrincipals.length === 0) {
      showToast({ message: 'Select at least one user or group for this policy.', variant: 'error' })
      setStep(0)
      return
    }

    const permissionFlags: FolderPermissionFlags = {
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

    permissions.forEach((p) => {
      permissionFlags[p.id] = p.enabled
    })

    const newPolicyPayloads: FolderSecurityPolicy[] = selectedPrincipals.map((p) => ({
      folderId: null,
      userIds: p.type === 'USER' ? [p.id] : [],
      groupIds: p.type === 'GROUP' ? [p.id] : [],
      permissions: permissionFlags,
    }))

    let updatedPolicies: FolderSecurityPolicy[] = []
    if (editingIndex != null && editingIndex >= 0 && editingIndex < existingPolicies.length) {
      updatedPolicies = existingPolicies.filter((_, idx) => idx !== editingIndex)
      updatedPolicies.splice(editingIndex, 0, ...newPolicyPayloads)
    } else {
      updatedPolicies = [...existingPolicies, ...newPolicyPayloads]
    }

    setIsSaving(true)
    const res = await putFolderSecurity(repositoryId, {
      folderId: null,
      policies: updatedPolicies,
    })
    setIsSaving(false)

    if (res.isCanceled) return

    if (res.status === 403) {
      showToast({
        message: 'You do not have access. Admin privileges are required to save security policies.',
        variant: 'error',
      })
      return
    }

    if (res.status === 401) {
      showToast({ message: 'Authentication required. Please log in again.', variant: 'error' })
      return
    }

    if (res.error) {
      showToast({ message: res.error, variant: 'error' })
      return
    }

    showToast({ message: 'Folder security policy saved successfully.', variant: 'success' })
    if (onSaveSuccess) onSaveSuccess()
    onClose()
  }

  const formattedSteps = STEPPER_ITEMS.map((s, idx) => ({
    ...s,
    clickable: idx <= step,
    disabled: idx > step,
  }))

  const renderStepContent = () => {
    if (isLoading) {
      return <SecurityWizardSkeleton />
    }

    if (accessError) {
      return (
        <div className="rounded-lg border border-[var(--red-4)] bg-[var(--red-2)] p-4 text-center text-[var(--red-11)]">
          <Icon name="tabler:alert-circle" className="mx-auto mb-1.5 text-[var(--red-9)] size-6" />
          <h4 className="text-sm font-semibold">Access Restricted</h4>
          <p className="mt-0.5 text-xs">{accessError}</p>
        </div>
      )
    }

    if (step === 0) {
      return (
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-15 font-semibold text-gray-13">
              {editingIndex != null ? 'Edit Folder Security Policy' : 'Folder Security Policy'}
            </h2>
            <p className="mt-0.5 text-xs text-gray-11">
              Select at least one user or group who will receive access permissions for this folder.
            </p>
          </div>

          <Divider />

          <div className="space-y-4">
            {showSelectionError && selectedPrincipals.length === 0 ? (
              <Alert
                text="Select at least one user or group to continue."
                variant="red"
              />
            ) : null}

            <div className="space-y-3">
              <InputSelectMultiple
                clearable
                label="Select Users"
                options={userDropdownOptions}
                placeholder={isLoading ? 'Loading users...' : 'Search and select users...'}
                searchable
                value={
                  allUsersSelected
                    ? [{ id: SELECT_ALL_OPTION_ID, name: 'All' }]
                    : selectedUsers.map((p) => ({ id: p.id, name: p.name }))
                }
                onChange={(value) => onSelectedUsersChange(value as any[])}
              />
              <SettingsSelectedChips
                items={selectedUsers.map((p) => ({ id: p.id, name: p.name }))}
                onRemove={(id) =>
                  onSelectedUsersChange(selectedUsers.filter((p) => p.id !== id))
                }
              />
            </div>

            <div className="space-y-3">
              <InputSelectMultiple
                clearable
                label="Select Groups"
                options={groupDropdownOptions}
                placeholder={isLoading ? 'Loading groups...' : 'Search and select groups...'}
                searchable
                value={
                  allGroupsSelected
                    ? [{ id: SELECT_ALL_OPTION_ID, name: 'All' }]
                    : selectedGroups.map((p) => ({ id: p.id, name: p.name }))
                }
                onChange={(value) => onSelectedGroupsChange(value as any[])}
              />
              <SettingsSelectedChips
                items={selectedGroups.map((p) => ({ id: p.id, name: p.name }))}
                onRemove={(id) =>
                  onSelectedGroupsChange(selectedGroups.filter((p) => p.id !== id))
                }
              />
            </div>
          </div>
        </div>
      )
    }

    if (step === 1) {
      const enabledCount = permissions.filter((p) => p.enabled).length
      const filteredPermissions = permissions.filter(
        (p) =>
          p.name.toLowerCase().includes(permissionSearch.toLowerCase()) ||
          p.description.toLowerCase().includes(permissionSearch.toLowerCase()),
      )

      return (
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-15 font-semibold text-gray-13">
              Configure permissions
            </h2>
            <p className="mt-0.5 text-xs text-gray-11">
              Enable or disable granular action privileges for selected users and groups.
            </p>
          </div>

          <Divider />

          <div className="rounded-lg border border-[var(--border-default)] bg-surface shadow-2xs overflow-hidden">
            <div className="px-4 py-2.5 bg-surface-muted border-b border-[var(--border-default)] flex justify-between items-center">
              <span className="text-xs font-semibold text-gray-13">Permissions Matrix</span>
              <SettingsSearchInput
                placeholder="Search permissions..."
                value={permissionSearch}
                onChange={setPermissionSearch}
              />
            </div>

            <div className="divide-y divide-[var(--border-default)] max-h-[360px] overflow-y-auto ez-scrollbar">
              {filteredPermissions.length === 0 ? (
                <div className="p-4 text-center text-xs text-gray-10">No matching permissions found</div>
              ) : (
                filteredPermissions.map((p) => (
                  <div key={p.id} className="px-4 py-2.5 grid grid-cols-[160px_1fr_80px] items-center gap-3 hover:bg-surface-muted transition-colors">
                    <div className="text-xs font-semibold text-gray-13">
                      {p.name}
                    </div>
                    <div className="text-xs text-gray-10 leading-normal">{p.description}</div>
                    <div className="flex justify-center items-center">
                      {p.id === 'view' ? (
                        <span className="inline-flex bg-primary-3 text-primary-11 px-2 py-0.5 rounded-full text-[9px] font-semibold tracking-wide align-middle">
                          Mandatory
                        </span>
                      ) : (
                        <button
                          type="button"
                          className={cn(
                            'relative inline-flex h-5 w-9 rounded-full shadow-2xs transition align-middle',
                            p.enabled ? 'bg-primary-9' : 'bg-gray-4',
                          )}
                          onClick={() => togglePermission(p.id)}
                        >
                          <span
                            className={cn(
                              'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition',
                              p.enabled ? 'left-4.5' : 'left-0.5',
                            )}
                          />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="px-4 py-2 bg-surface-muted border-t border-[var(--border-default)] flex items-center justify-between text-xs">
              <span className="text-gray-10 font-medium">
                {enabledCount} of {permissions.length} permissions enabled
              </span>
              <button
                type="button"
                onClick={toggleAllPermissions}
                className="text-primary-9 font-semibold hover:text-primary-10 transition"
              >
                {enabledCount === permissions.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
          </div>
        </div>
      )
    }

    if (step === 2) {
      const enabledPermissions = permissions.filter((p) => p.enabled)

      return (
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-15 font-semibold text-gray-13">
              Review & Save Policy
            </h2>
            <p className="mt-0.5 text-xs text-gray-11">
              Verify policy details before saving restrictions.
            </p>
          </div>

          <Divider />

          {/* Compact 3-Column Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="rounded-lg border border-[var(--border-default)] bg-surface px-3 py-2.5 shadow-2xs">
              <div className="text-[11px] font-medium text-gray-11">Repository</div>
              <div className="text-13 font-semibold text-gray-13 truncate mt-0.5 flex items-center gap-1.5">
                <Icon name="tabler:folder" className="size-3.5 text-primary-9" /> {folderName}
              </div>
            </div>

            <div className="rounded-lg border border-[var(--border-default)] bg-surface px-3 py-2.5 shadow-2xs">
              <div className="text-[11px] font-medium text-gray-11">Users & Groups</div>
              <div className="text-13 font-semibold text-gray-13 mt-0.5 flex items-center gap-1.5">
                <Icon name="tabler:users" className="size-3.5 text-primary-9" /> {selectedPrincipals.length}
              </div>
            </div>

            <div className="rounded-lg border border-[var(--border-default)] bg-surface px-3 py-2.5 shadow-2xs">
              <div className="text-[11px] font-medium text-gray-11">Permissions</div>
              <div className="text-13 font-semibold text-gray-13 mt-0.5 flex items-center gap-1.5">
                <Icon name="tabler:lock" className="size-3.5 text-primary-9" /> {enabledPermissions.length}
              </div>
            </div>
          </div>

          {/* Users & Groups with Initials Avatars */}
          <div className="rounded-lg border border-[var(--border-default)] bg-surface p-3 shadow-2xs space-y-2">
            <div className="text-xs font-semibold text-gray-12 flex items-center justify-between">
              <span>Assigned Users & Groups ({selectedPrincipals.length})</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedPrincipals.map((p) => {
                const initials = getInitials(p.name)
                const avatarBg = getAvatarColor(p.name)

                return (
                  <span
                    key={p.id}
                    className="inline-flex h-8 items-center gap-2 rounded-md border border-[var(--border-default)] bg-surface-muted px-2.5 py-1 text-xs font-medium text-gray-13"
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold shadow-2xs ${avatarBg}`}
                    >
                      {initials}
                    </span>
                    {p.name}
                  </span>
                )
              })}
              {selectedPrincipals.length === 0 && (
                <span className="text-xs italic text-gray-10">No users or groups selected</span>
              )}
            </div>
          </div>

          {/* Granted Permissions as Chips with Icons */}
          <div className="rounded-lg border border-[var(--border-default)] bg-surface p-3.5 shadow-2xs space-y-2.5">
            <div className="text-xs font-semibold text-gray-12">
              Granted Permissions ({enabledPermissions.length})
            </div>
            <div className="flex flex-wrap gap-1.5">
              {enabledPermissions.map((p) => (
                <span key={p.id} className="inline-flex items-center gap-1.5 rounded-md border border-primary-4 bg-primary-2 px-2.5 py-1 text-xs font-semibold text-primary-11 shadow-2xs">
                  <Icon name={PERMISSION_ICON_MAP[p.id]} className="size-3.5 text-primary-9" />
                  {p.name}
                </span>
              ))}
              {enabledPermissions.length === 0 && (
                <span className="text-xs italic text-gray-10">No permissions granted</span>
              )}
            </div>
          </div>
        </div>
      )
    }

    return null
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-gray-1">
      {/* Top Header */}
      <div className="mb-2 flex items-center justify-between border-b border-[var(--border-default)] px-6 py-3.5 md:px-8">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-15 font-semibold tracking-tight text-gray-13">
            {editingIndex != null ? 'Edit Folder Security Policy' : 'Folder Security Setup'} — {folderName}
          </h2>
          <p className="text-xs text-gray-11">
            Configure access policies and privileges for folder &quot;{folderName}&quot;
          </p>
        </div>
        <Button
          color="gray"
          icon="tabler:x"
          label="Cancel"
          size="sm"
          variant="outline"
          onClick={onClose}
        />
      </div>

      {/* Main Grid */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 xl:grid-cols-[290px_1fr]">
        {/* Sidebar Stepper */}
        <aside className="hidden h-full border-r border-[var(--border-default)] bg-gray-1/30 pt-4 pr-3 pb-4 pl-4 xl:block">
          <Stepper
            active={step}
            orientation="vertical"
            steps={formattedSteps}
            setActive={(newStep) => goToStep(newStep as Step)}
          />
        </aside>

        {/* Content Area */}
        <div className="col-span-1 h-full w-full overflow-y-auto">
          <div className="mx-auto w-full max-w-3xl px-6 py-5 pb-10 md:px-8 lg:px-10">
            {renderStepContent()}

            {/* Footer Navigation */}
            <div className="mt-6 flex items-center justify-between border-t border-[var(--border-default)] pt-4">
              {step > 0 ? (
                <Button
                  color="gray"
                  disabled={Boolean(accessError) || isLoading}
                  icon="lucide:arrow-left"
                  label="Back"
                  size="sm"
                  variant="outline"
                  onClick={() => goToStep((step - 1) as Step)}
                />
              ) : (
                <div />
              )}

              {step === 2 ? (
                <Button
                  disabled={isSaving || Boolean(accessError) || isLoading}
                  label={isSaving ? 'Saving...' : 'Save Policy'}
                  loading={isSaving}
                  size="sm"
                  suffixIcon="tabler:arrow-right"
                  onClick={() => {
                    void savePolicy()
                  }}
                />
              ) : (
                <Button
                  disabled={Boolean(accessError) || isLoading}
                  label="Continue"
                  size="sm"
                  suffixIcon="tabler:arrow-right"
                  onClick={() => {
                    if (step === 0 && !ensurePrincipalSelection()) return
                    goToStep((step + 1) as Step)
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
