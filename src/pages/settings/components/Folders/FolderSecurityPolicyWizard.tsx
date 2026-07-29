import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, Shield, UserRound, Users, Unlock, AlertCircle } from 'lucide-react'
import cn from '@/utils/cn'
import { getUsers, getGroups, type V6UserListItem, type V6GroupItem } from '@/api/v6/user'
import {
  getFolderSecurity,
  putFolderSecurity,
  type FolderPermissionFlags,
  type FolderSecurityPolicy,
} from '@/api/v6/folder/security'
import showToast from '@/components/base/toast/showToast'
import InputSelectMultiple from '@/components/base/inputs/InputSelectMultiple'
import SettingsSelectedChips from '../SettingsSelectedChips'
import SettingsSearchInput from '../SettingsSearchInput'
import SettingsSetupHeader from '../SettingsSetupHeader'
import SettingsSetupContent from '../SettingsSetupContent'
import SettingsFormSection from '../SettingsFormSection'

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

const WIZARD_STEPS = [
  { id: 0, title: 'Users & Groups', icon: Users },
  { id: 1, title: 'Permissions', icon: Shield },
  { id: 2, title: 'Review & Save', icon: Check },
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

export default function FolderSecurityPolicyWizard({
  folderName,
  repositoryId,
  onClose,
}: {
  folderName: string
  repositoryId: string
  onClose: () => void
}) {
  const [step, setStep] = useState<Step>(0)
  const [users, setUsers] = useState<V6UserListItem[]>([])
  const [groups, setGroups] = useState<V6GroupItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isOpenRepo, setIsOpenRepo] = useState(false)
  const [accessError, setAccessError] = useState<string | null>(null)

  const [selectedPrincipals, setSelectedPrincipals] = useState<Principal[]>([])
  const [permissions, setPermissions] = useState<Permission[]>(DEFAULT_PERMISSIONS)
  const [permissionSearch, setPermissionSearch] = useState('')

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setAccessError(null)

    // Load users & groups
    const [uRes, gRes] = await Promise.all([getUsers(), getGroups()])
    const userList = uRes.data || []
    const groupList = gRes.data || []
    setUsers(userList)
    setGroups(groupList)

    // Load folder security policy
    const secRes = await getFolderSecurity(repositoryId)
    if (secRes.status === 401) {
      showToast({ message: 'Authentication required. Please log in again.', variant: 'error' })
      setAccessError('Authentication required')
    } else if (secRes.status === 403) {
      const msg = 'You do not have access to view or edit folder security policies.'
      showToast({ message: msg, variant: 'error' })
      setAccessError(msg)
    } else if (secRes.status === 404) {
      showToast({ message: 'Repository not found.', variant: 'error' })
      setAccessError('Repository not found')
    } else if (secRes.error) {
      showToast({ message: secRes.error, variant: 'error' })
    } else if (secRes.data) {
      const policies = secRes.data.policies || []
      if (policies.length === 0) {
        setIsOpenRepo(true)
        setSelectedPrincipals([])
        setPermissions(DEFAULT_PERMISSIONS)
      } else {
        setIsOpenRepo(false)
        const firstPolicy = policies[0]
        const loadedPrincipals: Principal[] = []

        // Map userIds
        ;(firstPolicy.userIds || []).forEach((uId) => {
          const matched = userList.find((u) => u.id === uId)
          loadedPrincipals.push({
            id: uId,
            name: matched ? (matched.displayName || `${matched.firstName} ${matched.lastName}`.trim()) : uId,
            type: 'USER',
          })
        })

        // Map groupIds
        ;(firstPolicy.groupIds || []).forEach((gId) => {
          const matched = groupList.find((g) => (g.id || g.groupId) === gId)
          loadedPrincipals.push({
            id: gId,
            name: matched ? String(matched.name || matched.description || gId) : gId,
            type: 'GROUP',
          })
        })

        setSelectedPrincipals(loadedPrincipals)

        // Map permissions
        if (firstPolicy.permissions) {
          const pMap = firstPolicy.permissions
          setPermissions(
            DEFAULT_PERMISSIONS.map((p) => ({
              ...p,
              enabled: p.id === 'view' ? true : Boolean(pMap[p.id]),
            })),
          )
        }
      }
    }

    setIsLoading(false)
  }, [repositoryId])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const principalOptions = useMemo(() => {
    const userOpts = users.map((u) => {
      const uName = u.displayName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email || u.id
      return {
        id: String(u.id),
        name: `User: ${uName}`,
        rawName: uName,
        type: 'USER' as const,
      }
    })

    const groupOpts = groups.map((g) => {
      const gId = String(g.id || g.groupId || '')
      const gName = String(g.name || g.description || gId || 'Group')
      return {
        id: gId,
        name: `Group: ${gName}`,
        rawName: gName,
        type: 'GROUP' as const,
      }
    })

    return [...userOpts, ...groupOpts]
  }, [users, groups])

  const onSelectedPrincipalsChange = (selectedOptions: any[]) => {
    const updated: Principal[] = selectedOptions.map((opt) => {
      const optId = String(opt.id || opt.value || '')
      const found = principalOptions.find((p) => p.id === optId)
      return {
        id: optId,
        name: found ? found.rawName : String(opt.name || opt.label || optId),
        type: found ? found.type : ('USER' as const),
      }
    })
    setSelectedPrincipals(updated)
  }

  const togglePermission = (id: keyof FolderPermissionFlags) => {
    if (id === 'view') return // View is mandatory
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

    const userIds = selectedPrincipals.filter((p) => p.type === 'USER').map((p) => p.id)
    const groupIds = selectedPrincipals.filter((p) => p.type === 'GROUP').map((p) => p.id)

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

    const policyPayload: FolderSecurityPolicy = {
      folderId: null,
      groupIds,
      permissions: permissionFlags,
      userIds,
    }

    setIsSaving(true)
    const res = await putFolderSecurity(repositoryId, {
      folderId: null,
      policies: [policyPayload],
    })
    setIsSaving(false)

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
    onClose()
  }

  const clearPolicyReopenRepo = async () => {
    setIsSaving(true)
    const res = await putFolderSecurity(repositoryId, {
      folderId: null,
      policies: [],
    })
    setIsSaving(false)

    if (res.status === 403) {
      showToast({
        message: 'You do not have access. Admin privileges are required to clear security policies.',
        variant: 'error',
      })
      return
    }

    if (res.error) {
      showToast({ message: res.error, variant: 'error' })
      return
    }

    showToast({ message: 'Repository restrictions cleared. Folder reopened to all users.', variant: 'success' })
    onClose()
  }

  const renderStepContent = () => {
    if (accessError) {
      return (
        <SettingsFormSection>
          <div className="rounded-[14px] border border-[var(--red-4)] bg-[var(--red-2)] p-6 text-center text-[var(--red-11)]">
            <AlertCircle className="mx-auto mb-2 text-[var(--red-9)]" size={32} />
            <h4 className="text-base font-bold">Access Restricted</h4>
            <p className="mt-1 text-sm">{accessError}</p>
          </div>
        </SettingsFormSection>
      )
    }

    if (step === 0) {
      return (
        <SettingsFormSection>
          {isOpenRepo ? (
            <div className="mb-4 flex items-center gap-3 rounded-[12px] border border-[var(--primary-4)] bg-[var(--primary-2)] p-4 text-[var(--gray-13)]">
              <Unlock className="shrink-0 text-[var(--primary-9)]" size={20} />
              <div className="text-xs leading-relaxed">
                <span className="font-bold">Repository is currently open:</span> No policy restrictions are active. All tenant users can access this folder. Select users/groups below to apply security policies.
              </div>
            </div>
          ) : null}

          <InputSelectMultiple
            className='bg-[var(--surface)]'
            label='Select Users & Groups *'
            options={principalOptions}
            placeholder={isLoading ? 'Loading users & groups...' : 'Search and select users or groups...'}
            value={selectedPrincipals.map((p) => ({ id: p.id, name: p.name }))}
            onChange={(value) => onSelectedPrincipalsChange(value as any[])}
          />
          <SettingsSelectedChips
            items={selectedPrincipals.map((p) => ({ id: p.id, name: p.name }))}
            onRemove={(id) => onSelectedPrincipalsChange(selectedPrincipals.filter((p) => p.id !== id))}
          />
        </SettingsFormSection>
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
        <SettingsFormSection>
          <div className="rounded-[14px] border border-[var(--border-default)] bg-[var(--surface)] shadow-sm overflow-hidden">
            <div className="px-6 py-3.5 bg-[var(--gray-2)] border-b border-[var(--border-default)] flex justify-between items-center">
              <span className="text-sm font-semibold text-[var(--gray-13)]">Permissions</span>
              <SettingsSearchInput
                placeholder="Search permissions..."
                value={permissionSearch}
                onChange={setPermissionSearch}
              />
            </div>

            <div className="divide-y divide-[var(--border-default)] max-h-[calc(100vh-340px)] overflow-y-auto ez-scrollbar">
              {filteredPermissions.length === 0 ? (
                <div className="p-6 text-center text-xs text-[var(--gray-10)]">No matching permissions found</div>
              ) : (
                filteredPermissions.map((p) => (
                  <div key={p.id} className="px-6 py-3.5 grid grid-cols-[180px_1fr_90px] items-center gap-4 hover:bg-[var(--gray-1)] transition-colors">
                    <div className="text-sm font-semibold text-[var(--gray-13)]">{p.name}</div>
                    <div className="text-xs text-[var(--gray-10)] leading-normal">{p.description}</div>
                    <div className="flex justify-center items-center">
                      {p.id === 'view' ? (
                        <div className="inline-flex bg-[var(--primary-3)] text-[var(--primary-11)] px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-wide uppercase align-middle">
                          Mandatory
                        </div>
                      ) : (
                        <button
                          type='button'
                          className={cn(
                            'relative inline-flex h-6 w-11 rounded-full shadow-sm transition align-middle',
                            p.enabled ? 'bg-[var(--primary-9)]' : 'bg-[var(--gray-4)]',
                          )}
                          onClick={() => togglePermission(p.id)}
                        >
                          <span
                            className={cn(
                              'absolute top-0.5 h-5 w-5 rounded-full bg-[var(--control-thumb)] shadow transition',
                              p.enabled ? 'left-5.5' : 'left-0.5',
                            )}
                          />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="px-6 py-3 bg-[var(--gray-2)] border-t border-[var(--border-default)] flex items-center justify-between text-xs">
              <span className="text-[var(--gray-10)] font-medium">
                {enabledCount} of {permissions.length} permissions enabled
              </span>
              <button
                type="button"
                onClick={toggleAllPermissions}
                className="text-[var(--primary-9)] font-semibold hover:text-[var(--primary-10)] transition"
              >
                {enabledCount === permissions.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
          </div>
        </SettingsFormSection>
      )
    }

    if (step === 2) {
      const enabledPermissions = permissions.filter((p) => p.enabled)
      const displayedPrincipals = selectedPrincipals.slice(0, 4)
      const remainingPrincipalsCount = Math.max(0, selectedPrincipals.length - 4)

      const targetUsersText = selectedPrincipals.length === 0
        ? 'selected users/groups'
        : selectedPrincipals.length === 1
          ? selectedPrincipals[0].name
          : selectedPrincipals.length <= 3
            ? selectedPrincipals.map((p) => p.name).join(', ')
            : `${selectedPrincipals[0].name}, ${selectedPrincipals[1].name} and ${selectedPrincipals.length - 2} others`

      return (
        <SettingsFormSection>
          <div className="space-y-4">
            <div className="rounded-[14px] border border-[var(--border-default)] bg-surface overflow-hidden divide-y divide-[var(--border-default)]">
              <div className="bg-[var(--primary-2)] px-5 py-3.5 flex items-start gap-3 border-b border-[var(--border-default)]">
                <Shield className="text-[var(--primary-9)] mt-0.5 shrink-0" size={16} />
                <div>
                  <div className="text-[10px] font-bold text-[var(--primary-11)] uppercase tracking-wider mb-0.5">
                    Security Policy Summary
                  </div>
                  <p className="text-xs font-medium text-[var(--gray-13)] leading-relaxed">
                    {targetUsersText} will be granted {enabledPermissions.length} security permission{enabledPermissions.length > 1 ? 's' : ''} on folder <strong className="text-[var(--gray-12)]">{folderName}</strong>.
                  </p>
                </div>
              </div>

              <div className="p-5 space-y-5">
                <div>
                  <div className="text-[11px] font-bold text-[var(--gray-10)] uppercase tracking-wider mb-2">
                    Assigned Users & Groups ({selectedPrincipals.length})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {displayedPrincipals.map((p) => (
                      <span key={p.id} className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-surface px-3 py-1 text-xs font-medium text-[var(--gray-13)]">
                        <UserRound size={12} className="text-[var(--primary-9)]" />
                        {p.name}
                      </span>
                    ))}
                    {remainingPrincipalsCount > 0 && (
                      <span className="inline-flex items-center rounded-full border border-[var(--border-default)] bg-[var(--gray-2)] px-3 py-1 text-xs font-medium text-[var(--gray-11)]">
                        +{remainingPrincipalsCount} more
                      </span>
                    )}
                    {selectedPrincipals.length === 0 && (
                      <span className="text-xs italic text-[var(--gray-10)]">No users or groups selected</span>
                    )}
                  </div>
                </div>

                <div className="border-t border-[var(--border-default)] pt-4">
                  <div className="text-[11px] font-bold text-[var(--gray-10)] uppercase tracking-wider mb-2">
                    Granted Permissions ({enabledPermissions.length})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {enabledPermissions.map((p) => (
                      <span key={p.id} className="inline-flex items-center rounded-[6px] border border-[var(--primary-4)] bg-[var(--primary-3)] px-2.5 py-1 text-xs font-semibold text-[var(--primary-11)]">
                        {p.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                disabled={isSaving}
                onClick={clearPolicyReopenRepo}
                className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--red-9)] hover:text-[var(--red-10)] transition"
              >
                <Unlock size={14} /> Clear Policy & Reopen Repository to All Users
              </button>
            </div>
          </div>
        </SettingsFormSection>
      )
    }
  }

  return (
    <div className='flex h-full min-h-0 flex-col bg-[var(--surface)]'>
      <SettingsSetupHeader
        moduleTitle='Folder Security'
        showBackButton={false}
        showProgress={false}
        stepDescription='Grant users or groups permission to perform actions inside this folder.'
        stepTitle='Folder Security Policy'
        setupTitle={folderName}
        onBackToSettings={onClose}
        onCancelSetup={onClose}
      />
      <div className='grid flex-1 min-h-0 grid-cols-1 lg:grid-cols-[296px_1fr]'>
        <aside className='border-r border-[var(--border-default)] bg-[var(--surface)] px-4 py-9'>
          <div className='space-y-5'>
            {WIZARD_STEPS.map((s, index) => {
              const isActive = step === s.id
              const isCompleted = step > s.id

              return (
                <button
                  className='group flex w-full items-center gap-5 rounded-[14px] px-3 py-2 text-left transition hover:bg-surface-raised'
                  key={s.id}
                  type='button'
                  onClick={() => {
                    if (s.id < step || (s.id === 1 && selectedPrincipals.length > 0)) {
                      setStep(s.id as Step)
                    }
                  }}
                >
                  <div className='relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--gray-3)]'>
                    {index < WIZARD_STEPS.length - 1 ? (
                      <span className='absolute top-8 left-1/2 h-12 w-[2px] -translate-x-1/2 bg-[var(--gray-3)]' />
                    ) : null}
                    <span
                      className={[
                        'z-10 flex h-8 w-8 items-center justify-center rounded-full transition',
                        isCompleted
                          ? 'text-[var(--primary-9)]'
                          : isActive
                            ? 'bg-[var(--primary-3)] text-[var(--primary-11)] ring-1 ring-[var(--primary-8)]'
                            : 'bg-[var(--gray-3)] text-[var(--gray-10)]',
                      ].join(' ')}
                    >
                      {isCompleted ? (
                        <Check size={14} />
                      ) : (
                        <s.icon size={14} />
                      )}
                    </span>
                  </div>
                  <div>
                    <div className='text-md mt-1 font-semibold text-[var(--indigo-12)]'>
                      {s.title}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </aside>
        <SettingsSetupContent>
          {renderStepContent()}

          <div className='sticky bottom-0 z-20 mt-8 flex items-center justify-between border-t border-[var(--border-default)] bg-surface py-4'>
            <button
              className='inline-flex h-10 items-center rounded-[5px] border border-[var(--border-default)] bg-surface px-5 text-[15px] font-semibold text-[var(--gray-13)] transition hover:bg-[var(--gray-2)] disabled:cursor-not-allowed disabled:opacity-50'
              disabled={step === 0 || Boolean(accessError)}
              type='button'
              onClick={() => setStep((step - 1) as Step)}
            >
              Back
            </button>

            <div className='flex items-center gap-3'>
              {step === 2 ? (
                <button
                  className='h-10 rounded-[5px] bg-[var(--primary-9)] px-5 text-[15px] font-semibold text-white shadow-[var(--shadow-md)] transition hover:bg-[var(--primary-10)] disabled:cursor-not-allowed disabled:opacity-50'
                  disabled={isSaving || Boolean(accessError)}
                  type='button'
                  onClick={() => {
                    void savePolicy()
                  }}
                >
                  {isSaving ? 'Saving...' : 'Save Policy'}
                </button>
              ) : (
                <button
                  className='h-10 rounded-[5px] bg-[var(--primary-9)] px-5 text-[15px] font-semibold text-white shadow-[var(--shadow-md)] transition hover:bg-[var(--primary-10)] disabled:cursor-not-allowed disabled:opacity-50'
                  disabled={(step === 0 && selectedPrincipals.length === 0) || Boolean(accessError)}
                  type='button'
                  onClick={() => setStep((step + 1) as Step)}
                >
                  Next
                </button>
              )}
            </div>
          </div>
        </SettingsSetupContent>
      </div>
    </div>
  )
}
