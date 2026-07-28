import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, Shield, Search, UserRound, Users, X, Save } from 'lucide-react'
import cn from '@/utils/cn'
import { getUsers, getGroups, type V6UserListItem, type V6GroupItem } from '@/api/v6/user'
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
  id: string
  name: string
  description: string
  enabled: boolean
}

const WIZARD_STEPS = [
  { id: 0, title: 'Users', icon: Users },
  { id: 1, title: 'Permissions', icon: Shield },
  { id: 2, title: 'Review', icon: Check },
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
  onClose,
}: {
  folderName: string
  onClose: () => void
}) {
  const [step, setStep] = useState<Step>(0)
  const [users, setUsers] = useState<V6UserListItem[]>([])
  // const [groups, setGroups] = useState<V6GroupItem[]>([]) // Hidden for now
  const [isLoading, setIsLoading] = useState(false)

  const [selectedPrincipals, setSelectedPrincipals] = useState<Principal[]>([])
  const [permissions, setPermissions] = useState<Permission[]>(DEFAULT_PERMISSIONS)
  const [permissionSearch, setPermissionSearch] = useState('')

  // const [searchQuery, setSearchQuery] = useState('')
  // const [filterType, setFilterType] = useState<{ id: string; name: string }>({ id: 'users', name: 'Users' })

  useEffect(() => {
    async function loadData() {
      setIsLoading(true)
      const uRes = await getUsers()
      if (uRes.error) showToast({ message: uRes.error, variant: 'error' })
      else setUsers(uRes.data)

      // const gRes = await getGroups()
      // if (gRes.error) showToast({ message: gRes.error, variant: 'error' })
      // else setGroups(gRes.data)

      setIsLoading(false)
    }
    loadData()
  }, [])

  const userOptions = useMemo(() => {
    return users.map(u => ({
      id: u.id,
      name: u.displayName || `${u.firstName} ${u.lastName}`.trim(),
    }))
  }, [users])

  const onSelectedUsersChange = (selectedOptions: any[]) => {
    setSelectedPrincipals(selectedOptions.map(opt => ({
      id: String(opt.id || opt.value),
      name: String(opt.name || opt.label),
      type: 'USER'
    })))
  }

  const togglePermission = (id: string) => {
    if (id === 'view') return // Mandatory
    setPermissions(prev => prev.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p))
  }

  const toggleAllPermissions = () => {
    const togglablePermissions = permissions.filter(p => p.id !== 'view')
    const allEnabled = togglablePermissions.every(p => p.enabled)
    setPermissions(prev => prev.map(p => p.id === 'view' ? { ...p, enabled: true } : { ...p, enabled: !allEnabled }))
  }

  const savePolicy = () => {
    showToast({ message: 'Security policy saved successfully', variant: 'success' })
    onClose()
  }

  const renderStepContent = () => {
    if (step === 0) {
      return (
        <SettingsFormSection>
          <InputSelectMultiple
            className='bg-[var(--surface)]'
            label='Select Users *'
            options={userOptions}
            placeholder={isLoading ? 'Loading users...' : 'Select users...'}
            value={selectedPrincipals.map(p => ({ id: p.id, name: p.name }))}
            onChange={(value) => onSelectedUsersChange(value as any[])}
          />
          <SettingsSelectedChips
            items={selectedPrincipals.map(p => ({ id: p.id, name: p.name }))}
            onRemove={(id) => onSelectedUsersChange(selectedPrincipals.filter(p => p.id !== id))}
          />
        </SettingsFormSection>
      )
    }

    if (step === 1) {
      const enabledCount = permissions.filter(p => p.enabled).length
      const filteredPermissions = permissions.filter(
        p =>
          p.name.toLowerCase().includes(permissionSearch.toLowerCase()) ||
          p.description.toLowerCase().includes(permissionSearch.toLowerCase()),
      )

      return (
        <SettingsFormSection>
          <div className="rounded-[14px] border border-[var(--border-default)] bg-[var(--surface)] shadow-sm overflow-hidden">
            {/* Table Toolbar Header */}
            <div className="px-6 py-3.5 bg-[var(--gray-2)] border-b border-[var(--border-default)] flex justify-between items-center">
              <span className="text-sm font-semibold text-[var(--gray-13)]">Permissions</span>
              <SettingsSearchInput
                placeholder="Search permissions..."
                value={permissionSearch}
                onChange={setPermissionSearch}
              />
            </div>

            {/* Table Body (3 Columns: Title | Description | Access Toggle) */}

            {/* Table Body (3 Columns) */}
            <div className="divide-y divide-[var(--border-default)] max-h-[calc(100vh-340px)] overflow-y-auto ez-scrollbar">
              {filteredPermissions.length === 0 ? (
                <div className="p-6 text-center text-xs text-[var(--gray-10)]">No matching permissions found</div>
              ) : (
                filteredPermissions.map(p => (
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

            {/* Table Footer with Select All */}
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
      const enabledPermissions = permissions.filter(p => p.enabled)
      const displayedPrincipals = selectedPrincipals.slice(0, 4)
      const remainingPrincipalsCount = Math.max(0, selectedPrincipals.length - 4)

      const targetUsersText = selectedPrincipals.length === 0
        ? 'selected users'
        : selectedPrincipals.length === 1
          ? selectedPrincipals[0].name
          : selectedPrincipals.length <= 3
            ? selectedPrincipals.map(p => p.name).join(', ')
            : `${selectedPrincipals[0].name}, ${selectedPrincipals[1].name} and ${selectedPrincipals.length - 2} others`

      return (
        <SettingsFormSection>
          <div className="space-y-4">
            {/* Compact Statistics Header Row */}
            {/* <div className="flex flex-wrap items-center gap-2 pb-1">
              <span className="inline-flex items-center gap-1.5 rounded-[10px] border border-[var(--border-default)] bg-surface px-3 py-1 text-xs font-medium text-[var(--gray-13)]">
                <span className="text-[var(--gray-10)] font-normal">Users:</span> {selectedPrincipals.length}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-[10px] border border-[var(--border-default)] bg-surface px-3 py-1 text-xs font-medium text-[var(--gray-13)]">
                <span className="text-[var(--gray-10)] font-normal">Permissions:</span> {enabledPermissions.length}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-[10px] border border-[var(--border-default)] bg-surface px-3 py-1 text-xs font-medium text-[var(--gray-13)]">
                <span className="text-[var(--gray-10)] font-normal">Folder:</span> {folderName}
              </span>
            </div> */}

            {/* Single Enterprise Security Summary Card */}
            <div className="rounded-[14px] border border-[var(--border-default)] bg-surface overflow-hidden divide-y divide-[var(--border-default)]">
              {/* Natural Language Security Statement */}
              <div className="bg-[var(--primary-2)] px-5 py-3.5 flex items-start gap-3 border-b border-[var(--border-default)]">
                <Shield className="text-[var(--primary-9)] mt-0.5 shrink-0" size={16} />
                <div>
                  <div className="text-[10px] font-bold text-[var(--primary-11)] uppercase tracking-wider mb-0.5">
                    Security Summary
                  </div>
                  <p className="text-xs font-medium text-[var(--gray-13)] leading-relaxed">
                    {targetUsersText} will be granted {enabledPermissions.length} security permission{enabledPermissions.length > 1 ? 's' : ''} on the folder <strong className="text-[var(--gray-12)]">{folderName}</strong>.
                  </p>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 space-y-5">
                {/* Assigned To Row */}
                <div>
                  <div className="text-[11px] font-bold text-[var(--gray-10)] uppercase tracking-wider mb-2">
                    Assigned To ({selectedPrincipals.length})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {displayedPrincipals.map(p => (
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
                      <span className="text-xs italic text-[var(--gray-10)]">No users selected</span>
                    )}
                  </div>
                </div>

                {/* Granted Permissions Row */}
                <div className="border-t border-[var(--border-default)] pt-4">
                  <div className="text-[11px] font-bold text-[var(--gray-10)] uppercase tracking-wider mb-2">
                    Granted Permissions ({enabledPermissions.length})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {enabledPermissions.map(p => (
                      <span key={p.id} className="inline-flex items-center rounded-[6px] border border-[var(--primary-4)] bg-[var(--primary-3)] px-2.5 py-1 text-xs font-semibold text-[var(--primary-11)]">
                        {p.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
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
        progress={Math.round(((step + 1) / WIZARD_STEPS.length) * 100)}
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
              disabled={step === 0}
              type='button'
              onClick={() => setStep((step - 1) as Step)}
            >
              Back
            </button>

            <div className='flex items-center gap-3'>
              {step === 2 ? (
                <button
                  className='h-10 rounded-[5px] bg-[var(--primary-9)] px-5 text-[15px] font-semibold text-white shadow-[var(--shadow-md)] transition hover:bg-[var(--primary-10)]'
                  type='button'
                  onClick={savePolicy}
                >
                  Save
                </button>
              ) : (
                <button
                  className='h-10 rounded-[5px] bg-[var(--primary-9)] px-5 text-[15px] font-semibold text-white shadow-[var(--shadow-md)] transition hover:bg-[var(--primary-10)] disabled:cursor-not-allowed disabled:opacity-50'
                  disabled={step === 0 && selectedPrincipals.length === 0}
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
