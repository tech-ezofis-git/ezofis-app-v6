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
            <div className="px-6 py-3.5 bg-[var(--gray-2)] border-b border-[var(--border-default)] flex justify-between items-center text-xs font-semibold text-[var(--gray-11)]">
              <span>Permission</span>
              <div className="flex items-center gap-4">
                <SettingsSearchInput
                  placeholder="Search permissions..."
                  value={permissionSearch}
                  onChange={setPermissionSearch}
                />
                <button onClick={toggleAllPermissions} className="text-[var(--primary-9)] hover:text-[var(--primary-10)]">
                  {enabledCount === permissions.length ? 'Deselect All' : 'Select All'}
                </button>
                <span className="w-20 text-center font-bold">Access</span>
              </div>
            </div>
            
            <div className="divide-y divide-[var(--border-default)] max-h-[380px] overflow-y-auto ez-scrollbar">
              {filteredPermissions.length === 0 ? (
                <div className="p-6 text-center text-xs text-[var(--gray-10)]">No matching permissions found</div>
              ) : (
                filteredPermissions.map(p => (
                  <div key={p.id} className="px-6 py-3.5 flex items-center justify-between hover:bg-[var(--gray-1)] transition-colors">
                    <div>
                      <div className="text-sm font-semibold text-[var(--gray-13)]">{p.name}</div>
                      <div className="text-xs text-[var(--gray-10)]">{p.description}</div>
                    </div>
                    <div className="w-20 flex justify-center items-center">
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
          </div>
        </SettingsFormSection>
      )
    }

    if (step === 2) {
      const enabledPermissions = permissions.filter(p => p.enabled)
      return (
        <SettingsFormSection>
          <div className="flex flex-col bg-[var(--surface)] rounded-[14px] border border-[var(--border-default)] shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--border-default)]">
              <h2 className="text-base font-semibold text-[var(--gray-12)]">Review Policy</h2>
            </div>
            
            <div className="p-5">
              <div className="bg-[var(--primary-2)] border border-[var(--primary-5)] rounded-xl p-5 space-y-4">
                <div>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-[var(--primary-11)] mb-2 uppercase tracking-wider">
                    <Users size={13} /> Assigned To ({selectedPrincipals.length})
                  </div>
                  {selectedPrincipals.length === 0 ? (
                    <span className="text-xs text-[var(--gray-10)]">No users selected</span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedPrincipals.map(p => (
                        <div key={p.id} className="bg-[var(--surface)] border border-[var(--border-default)] text-[var(--gray-12)] px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5 shadow-sm">
                          <UserRound size={11} className="text-[var(--primary-9)]" />
                          {p.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="border-t border-[var(--primary-4)] pt-3">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-[var(--primary-11)] mb-2 uppercase tracking-wider">
                    <Shield size={13} /> Granted Permissions ({enabledPermissions.length})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {enabledPermissions.map(p => (
                      <div key={p.id} className="bg-[var(--primary-3)] text-[var(--primary-11)] border border-[var(--primary-5)] px-2.5 py-1 rounded-full text-[11px] font-semibold shadow-sm">
                        {p.name}
                      </div>
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
      <div className='grid min-h-[calc(100vh-96px)] grid-cols-1 lg:grid-cols-[296px_1fr]'>
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
          
          <div className='mt-8 flex items-center justify-between border-t border-[var(--border-default)] pt-6 pb-6'>
            <button
              className='inline-flex h-10 items-center rounded-[5px] border border-[var(--border-default)] bg-[var(--surface)] px-5 text-[15px] font-semibold text-[var(--gray-13)] transition hover:bg-[var(--gray-2)] disabled:cursor-not-allowed disabled:opacity-50'
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
                  Save Policy
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
