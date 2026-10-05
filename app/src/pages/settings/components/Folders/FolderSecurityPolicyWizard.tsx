import { t as staticT } from '@lingui/macro'
import { useLingui } from '@lingui/react/macro'
import { AnimatePresence } from 'motion/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  type FolderPermissionFlags,
  type FolderSecurityPolicy,
  putFolderSecurity,
} from '@/api/v6/folder/security'
import {
  getGroups,
  getUsers,
  type V6GroupItem,
  type V6UserListItem,
} from '@/api/v6/user'
import Alert from '@/components/base/Alert'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import Divider from '@/components/base/Divider'
import Icon from '@/components/base/icon/Icon'
import InputSelectMultiple from '@/components/base/inputs/InputSelectMultiple'
import Skeleton from '@/components/base/Skeleton'
import Stepper from '@/components/base/Stepper'
import showToast from '@/components/base/toast/showToast'
import {
  AnimateFadeIn,
  AnimateScale,
  AnimateSlideUp,
} from '@/components/common/animations'
import cn from '@/utils/cn'
import SettingsSearchInput from '../SettingsSearchInput'
import SettingsSelectedChips from '../SettingsSelectedChips'

type Permission = {
  description: string
  enabled: boolean
  id: keyof FolderPermissionFlags
  name: string
}

type Principal = {
  id: string
  name: string
  type: 'USER' | 'GROUP'
}

type Step = 0 | 1 | 2

const STEPPER_ITEMS = [
  {
    description: staticT`Select target access`,
    icon: 'tabler:users',
    id: 0,
    label: staticT`Users & Groups`,
  },
  {
    description: staticT`Set access privileges`,
    icon: 'tabler:shield',
    id: 1,
    label: staticT`Permissions`,
  },
  {
    description: staticT`Review and save policy`,
    icon: 'tabler:check',
    id: 2,
    label: staticT`Review & Save`,
  },
]

const DEFAULT_PERMISSIONS: Permission[] = [
  {
    description: staticT`Open folder and files`,
    enabled: true,
    id: 'view',
    name: staticT`View`,
  },
  {
    description: staticT`Upload new files`,
    enabled: false,
    id: 'upload',
    name: staticT`Upload`,
  },
  {
    description: staticT`Download documents`,
    enabled: false,
    id: 'download',
    name: staticT`Download`,
  },
  {
    description: staticT`Print documents`,
    enabled: false,
    id: 'print',
    name: staticT`Print`,
  },
  {
    description: staticT`Delete files or folders`,
    enabled: false,
    id: 'delete',
    name: staticT`Delete`,
  },
  {
    description: staticT`Modify metadata fields`,
    enabled: false,
    id: 'editMetadata',
    name: staticT`Edit Metadata`,
  },
  {
    description: staticT`Modify document content`,
    enabled: false,
    id: 'editDocument',
    name: staticT`Edit Document`,
  },
  {
    description: staticT`Lock document for editing`,
    enabled: false,
    id: 'checkOut',
    name: staticT`Check Out`,
  },
  {
    description: staticT`Complete editing session`,
    enabled: false,
    id: 'checkIn',
    name: staticT`Check In`,
  },
  {
    description: staticT`Create signature request`,
    enabled: false,
    id: 'sendForSignature',
    name: staticT`Send for Signature`,
  },
]

const PERMISSION_ICON_MAP: Record<keyof FolderPermissionFlags, string> = {
  checkIn: 'tabler:lock-open',
  checkOut: 'tabler:lock',
  delete: 'tabler:trash',
  download: 'tabler:download',
  editDocument: 'tabler:edit',
  editMetadata: 'tabler:file-text',
  print: 'tabler:printer',
  sendForSignature: 'tabler:writing',
  upload: 'tabler:upload',
  view: 'tabler:eye',
}

const SELECT_ALL_OPTION_ID = '__select_all__'

const getInitials = (name: string) => {
  if (!name) return '?'
  const clean = name.replace(/^(User:|Group:)\s*/i, '').trim()
  const parts = clean.split(/\s+/)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return clean.slice(0, 2).toUpperCase()
}

const SecurityWizardSkeleton = () => (
  <div className='animate-in fade-in flex flex-col gap-4 duration-300'>
    <div className='space-y-1.5'>
      <Skeleton className='h-5 w-60 rounded-md' />
      <Skeleton className='h-3.5 w-80 rounded-md' />
    </div>

    <Divider />

    <div className='grid grid-cols-1 gap-2.5 sm:grid-cols-3'>
      <Skeleton className='h-14 w-full rounded-lg' />
      <Skeleton className='h-14 w-full rounded-lg' />
      <Skeleton className='h-14 w-full rounded-lg' />
    </div>

    <div className='space-y-3 pt-2'>
      <Skeleton className='h-4 w-36 rounded-md' />
      <Skeleton className='h-10 w-full rounded-lg' />
      <div className='flex gap-2'>
        <Skeleton className='h-7 w-28 rounded-md' />
        <Skeleton className='h-7 w-32 rounded-md' />
        <Skeleton className='h-7 w-24 rounded-md' />
      </div>
    </div>

    <div className='space-y-2 pt-2'>
      <Skeleton className='h-16 w-full rounded-lg' />
      <Skeleton className='h-16 w-full rounded-lg' />
    </div>
  </div>
)

export default function FolderSecurityPolicyWizard({
  editingIndex = null,
  existingPolicies = [],
  folderName,
  initialPolicy = null,
  repositoryId = '',
  onClose,
  onSaveSuccess,
}: {
  editingIndex?: number | null
  existingPolicies?: FolderSecurityPolicy[]
  folderName: string
  initialPolicy?: FolderSecurityPolicy | null
  repositoryId?: string
  onClose: () => void
  onSaveSuccess?: () => void
}) {
  const { t } = useLingui()
  const [step, setStep] = useState<Step>(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        behavior: 'smooth',
        top: 0,
      })
    }
  }, [step])

  const [users, setUsers] = useState<V6UserListItem[]>([])
  const [groups, setGroups] = useState<V6GroupItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [accessError, setAccessError] = useState<string | null>(null)

  const [selectedPrincipals, setSelectedPrincipals] = useState<Principal[]>([])
  const [permissions, setPermissions] =
    useState<Permission[]>(DEFAULT_PERMISSIONS)
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
          name: matched
            ? matched.displayName ||
              `${matched.firstName || ''} ${matched.lastName || ''}`.trim() ||
              matched.email ||
              uId
            : uId,
          type: 'USER',
        })
      })
      ;(initialPolicy.groupIds || []).forEach((gId: string) => {
        const matched = groupList.find((g) => (g.id || g.groupId) === gId)
        loadedPrincipals.push({
          id: gId,
          name: matched
            ? String(matched.name || matched.description || gId)
            : gId,
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

    if (hasAll && !allUsersSelected) {
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

    if (allUsersSelected && (!hasAll || withoutAll.length === 0)) {
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

    if (hasAll && !allGroupsSelected) {
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

    if (allGroupsSelected && (!hasAll || withoutAll.length === 0)) {
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

  const [maxVisitedStep, setMaxVisitedStep] = useState<Step>(
    editingIndex != null || initialPolicy != null ? 2 : 0,
  )

  const ensurePrincipalSelection = () => {
    if (selectedPrincipals.length > 0) {
      setShowSelectionError(false)
      return true
    }

    setShowSelectionError(true)
    showToast({
      message: t`Select at least one user or group to continue.`,
      variant: 'info',
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
    setMaxVisitedStep((prev) => Math.max(prev, nextStep) as Step)
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
      prev.map((p) =>
        p.id === 'view'
          ? { ...p, enabled: true }
          : { ...p, enabled: !allEnabled },
      ),
    )
  }

  const savePolicy = async () => {
    if (selectedPrincipals.length === 0) {
      showToast({
        message: t`Select at least one user or group for this policy.`,
        variant: 'info',
      })
      setStep(0)
      return
    }

    const permissionFlags: FolderPermissionFlags = {
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

    permissions.forEach((p) => {
      permissionFlags[p.id] = p.enabled
    })

    const newPolicyPayloads: FolderSecurityPolicy[] = selectedPrincipals.map(
      (p) => ({
        folderId: null,
        groupIds: p.type === 'GROUP' ? [p.id] : [],
        permissions: permissionFlags,
        userIds: p.type === 'USER' ? [p.id] : [],
      }),
    )

    let updatedPolicies: FolderSecurityPolicy[] = []
    if (
      editingIndex != null &&
      editingIndex >= 0 &&
      editingIndex < existingPolicies.length
    ) {
      updatedPolicies = existingPolicies.filter(
        (_, idx) => idx !== editingIndex,
      )
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
        message: t`You do not have access. Admin privileges are required to save security policies.`,
        variant: 'error',
      })
      return
    }

    if (res.status === 401) {
      showToast({
        message: t`Authentication required. Please log in again.`,
        variant: 'error',
      })
      return
    }

    if (res.error) {
      showToast({ message: res.error, variant: 'error' })
      return
    }

    showToast({
      message: t`Folder security policy saved successfully.`,
      variant: 'success',
    })
    if (onSaveSuccess) onSaveSuccess()
    onClose()
  }

  const formattedSteps = useMemo(() => {
    return STEPPER_ITEMS.map((s, idx) => ({
      ...s,
      clickable: idx <= maxVisitedStep,
      disabled: idx > maxVisitedStep,
    }))
  }, [maxVisitedStep])

  const renderStepContent = () => {
    if (isLoading) {
      return <SecurityWizardSkeleton />
    }

    if (accessError) {
      return (
        <div className='rounded-lg border border-[var(--red-4)] bg-[var(--red-2)] p-4 text-center text-[var(--red-11)]'>
          <Icon
            className='mx-auto mb-1.5 size-6 text-[var(--red-9)]'
            name='tabler:alert-circle'
          />
          <h4 className='text-sm font-semibold'>{t`Access Restricted`}</h4>
          <p className='mt-0.5 text-xs'>{accessError}</p>
        </div>
      )
    }

    return (
      <AnimatePresence initial={false} mode='wait'>
        {step === 0 && (
          <AnimateSlideUp delay={0.1} key='policy-step-0'>
            <div className='flex flex-col gap-4'>
              <div>
                <h2 className='text-15 font-semibold text-gray-13'>
                  {editingIndex != null
                    ? t`Edit Folder Security Policy`
                    : t`Folder Security Policy`}
                </h2>
                <p className='mt-0.5 text-xs text-gray-11'>
                  {t`Select at least one user or group who will receive access permissions for this folder.`}
                </p>
              </div>

              <Divider />

              <div className='space-y-4'>
                {showSelectionError && selectedPrincipals.length === 0 ? (
                  <Alert
                    text={t`Select at least one user or group to continue.`}
                    variant='red'
                  />
                ) : null}

                <div className='space-y-3'>
                  <InputSelectMultiple
                    label={t`Select Users`}
                    options={userDropdownOptions}
                    clearable
                    searchable
                    placeholder={
                      isLoading
                        ? t`Loading users...`
                        : t`Search and select users...`
                    }
                    value={
                      allUsersSelected
                        ? [
                            { id: SELECT_ALL_OPTION_ID, name: t`All` },
                            ...selectedUsers.map((p) => ({
                              id: p.id,
                              name: p.name,
                            })),
                          ]
                        : selectedUsers.map((p) => ({ id: p.id, name: p.name }))
                    }
                    onChange={(value) => onSelectedUsersChange(value as any[])}
                  />
                  <SettingsSelectedChips
                    items={selectedUsers.map((p) => ({
                      id: p.id,
                      name: p.name,
                    }))}
                    onRemove={(id) =>
                      onSelectedUsersChange(
                        selectedUsers.filter((p) => p.id !== id),
                      )
                    }
                  />
                </div>

                <div className='space-y-3'>
                  <InputSelectMultiple
                    label={t`Select Groups`}
                    options={groupDropdownOptions}
                    clearable
                    searchable
                    placeholder={
                      isLoading
                        ? t`Loading groups...`
                        : t`Search and select groups...`
                    }
                    value={
                      allGroupsSelected
                        ? [
                            { id: SELECT_ALL_OPTION_ID, name: t`All` },
                            ...selectedGroups.map((p) => ({
                              id: p.id,
                              name: p.name,
                            })),
                          ]
                        : selectedGroups.map((p) => ({
                            id: p.id,
                            name: p.name,
                          }))
                    }
                    onChange={(value) => onSelectedGroupsChange(value as any[])}
                  />
                  <SettingsSelectedChips
                    items={selectedGroups.map((p) => ({
                      id: p.id,
                      name: p.name,
                    }))}
                    onRemove={(id) =>
                      onSelectedGroupsChange(
                        selectedGroups.filter((p) => p.id !== id),
                      )
                    }
                  />
                </div>
              </div>
            </div>
          </AnimateSlideUp>
        )}

        {step === 1 && (
          <AnimateScale delay={0.1} key='policy-step-1'>
            <div className='flex flex-col gap-4'>
              <div>
                <h2 className='text-15 font-semibold text-gray-13'>
                  {t`Configure permissions`}
                </h2>
                <p className='mt-0.5 text-xs text-gray-11'>
                  {t`Enable or disable granular action privileges for selected users and groups.`}
                </p>
              </div>

              <Divider />

              <div className='overflow-hidden rounded-lg border border-[var(--border-default)] bg-surface shadow-2xs'>
                <div className='flex items-center justify-between border-b border-[var(--border-default)] bg-surface-muted px-4 py-2.5'>
                  <span className='text-xs font-semibold text-gray-13'>{t`Permissions Matrix`}</span>
                  <SettingsSearchInput
                    placeholder={t`Search permissions...`}
                    value={permissionSearch}
                    onChange={setPermissionSearch}
                  />
                </div>

                <div className='ez-scrollbar max-h-[360px] divide-y divide-[var(--border-default)] overflow-y-auto'>
                  {permissions.filter(
                    (p) =>
                      p.name
                        .toLowerCase()
                        .includes(permissionSearch.toLowerCase()) ||
                      p.description
                        .toLowerCase()
                        .includes(permissionSearch.toLowerCase()),
                  ).length === 0 ? (
                    <div className='p-4 text-center text-xs text-gray-10'>{t`No matching permissions found`}</div>
                  ) : (
                    permissions
                      .filter(
                        (p) =>
                          p.name
                            .toLowerCase()
                            .includes(permissionSearch.toLowerCase()) ||
                          p.description
                            .toLowerCase()
                            .includes(permissionSearch.toLowerCase()),
                      )
                      .map((p) => (
                        <div
                          className='grid grid-cols-[160px_1fr_80px] items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface-muted'
                          key={p.id}
                        >
                          <div className='text-xs font-semibold text-gray-13'>
                            {p.name}
                          </div>
                          <div className='text-xs leading-normal text-gray-10'>
                            {p.description}
                          </div>
                          <div className='flex items-center justify-center'>
                            {p.id === 'view' ? (
                              <span className='inline-flex rounded-full bg-primary-3 px-2 py-0.5 align-middle text-[9px] font-semibold tracking-wide text-primary-11'>
                                {t`Mandatory`}
                              </span>
                            ) : (
                              <button
                                type='button'
                                className={cn(
                                  'relative inline-flex h-5 w-9 rounded-full align-middle shadow-2xs transition',
                                  p.enabled ? 'bg-primary-9' : 'bg-gray-4',
                                )}
                                onClick={() => togglePermission(p.id)}
                              >
                                <span
                                  className={cn(
                                    'absolute top-0.5 h-4 w-4 rounded-full bg-[var(--control-thumb)] shadow transition',
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

                <div className='flex items-center justify-between border-t border-[var(--border-default)] bg-surface-muted px-4 py-2 text-xs'>
                  <span className='font-medium text-gray-10'>
                    {t`${permissions.filter((p) => p.enabled).length} of ${permissions.length} permissions enabled`}
                  </span>
                  <button
                    className='font-semibold text-primary-9 transition hover:text-primary-10'
                    type='button'
                    onClick={toggleAllPermissions}
                  >
                    {permissions.filter((p) => p.enabled).length ===
                    permissions.length
                      ? t`Deselect All`
                      : t`Select All`}
                  </button>
                </div>
              </div>
            </div>
          </AnimateScale>
        )}

        {step === 2 && (
          <AnimateFadeIn delay={0.1} key='policy-step-2'>
            <div className='flex flex-col gap-4'>
              <div>
                <h2 className='text-15 font-semibold text-gray-13'>
                  {t`Review & Save Policy`}
                </h2>
                <p className='mt-0.5 text-xs text-gray-11'>
                  {t`Verify policy details before saving restrictions.`}
                </p>
              </div>

              <Divider />

              {/* Compact 3-Column Summary Cards */}
              <div className='grid grid-cols-1 gap-2.5 sm:grid-cols-3'>
                <div className='rounded-lg border border-[var(--border-default)] bg-surface px-3 py-2.5 shadow-2xs'>
                  <div className='text-[11px] font-medium text-gray-11'>{t`Repository`}</div>
                  <div className='mt-0.5 flex items-center gap-1.5 truncate text-13 font-semibold text-gray-13'>
                    <Icon
                      className='size-3.5 text-primary-9'
                      name='tabler:folder'
                    />{' '}
                    {folderName}
                  </div>
                </div>

                <div className='rounded-lg border border-[var(--border-default)] bg-surface px-3 py-2.5 shadow-2xs'>
                  <div className='text-[11px] font-medium text-gray-11'>{t`Users & Groups`}</div>
                  <div className='mt-0.5 flex items-center gap-1.5 text-13 font-semibold text-gray-13'>
                    <Icon
                      className='size-3.5 text-primary-9'
                      name='tabler:users'
                    />{' '}
                    {selectedPrincipals.length}
                  </div>
                </div>

                <div className='rounded-lg border border-[var(--border-default)] bg-surface px-3 py-2.5 shadow-2xs'>
                  <div className='text-[11px] font-medium text-gray-11'>{t`Permissions`}</div>
                  <div className='mt-0.5 flex items-center gap-1.5 text-13 font-semibold text-gray-13'>
                    <Icon
                      className='size-3.5 text-primary-9'
                      name='tabler:lock'
                    />{' '}
                    {permissions.filter((p) => p.enabled).length}
                  </div>
                </div>
              </div>

              {/* Users & Groups with Initials Avatars */}
              <div className='space-y-2 rounded-lg border border-[var(--border-default)] bg-surface p-3 shadow-2xs'>
                <div className='flex items-center justify-between text-xs font-semibold text-gray-12'>
                  <span>{t`Assigned Users & Groups (${selectedPrincipals.length})`}</span>
                </div>
                <div className='flex flex-wrap gap-2'>
                  {selectedPrincipals.map((p) => {
                    const initials = getInitials(p.name)

                    return (
                      <span
                        className='inline-flex h-8 items-center gap-2 rounded-lg border border-primary-4/60 bg-gradient-to-r from-primary-3/70 to-primary-2/90 px-2.5 py-1 text-xs font-semibold text-gray-13 shadow-2xs'
                        key={p.id}
                      >
                        <span className='flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-full border border-primary-4/50 bg-surface text-[10px] font-bold tracking-tight text-primary-11 shadow-2xs'>
                          {initials}
                        </span>
                        {p.name}
                      </span>
                    )
                  })}
                  {selectedPrincipals.length === 0 && (
                    <span className='text-xs text-gray-10 italic'>{t`No users or groups selected`}</span>
                  )}
                </div>
              </div>

              {/* Granted Permissions as Chips with Icons */}
              <div className='space-y-2.5 rounded-lg border border-[var(--border-default)] bg-surface p-3.5 shadow-2xs'>
                <div className='text-xs font-semibold text-gray-12'>
                  {t`Granted Permissions (${permissions.filter((p) => p.enabled).length})`}
                </div>
                <div className='flex flex-wrap gap-1.5'>
                  {permissions
                    .filter((p) => p.enabled)
                    .map((p) => (
                      <span
                        className='inline-flex items-center gap-1.5 rounded-md border border-primary-4 bg-primary-2 px-2.5 py-1 text-xs font-semibold text-primary-11 shadow-2xs'
                        key={p.id}
                      >
                        <Icon
                          className='size-3.5 text-primary-9'
                          name={PERMISSION_ICON_MAP[p.id]}
                        />
                        {p.name}
                      </span>
                    ))}
                  {permissions.filter((p) => p.enabled).length === 0 && (
                    <span className='text-xs text-gray-10 italic'>{t`No permissions granted`}</span>
                  )}
                </div>
              </div>
            </div>
          </AnimateFadeIn>
        )}
      </AnimatePresence>
    )
  }

  return (
    <div className='flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-gray-1'>
      {/* Top Header */}
      <div className='mb-2 flex items-center justify-between border-b border-[var(--border-default)] px-4 py-3.5'>
        <div className='flex items-center gap-3'>
          <IconButton
            ariaLabel={t`Back`}
            color='gray'
            icon='lucide:arrow-left'
            size='sm'
            variant='ghost'
            onClick={onClose}
          />
          <div className='flex flex-col gap-0.5'>
            <h2 className='text-15 font-semibold tracking-tight text-gray-13'>
              {editingIndex != null
                ? t`Edit Folder Security Policy`
                : t`Folder Security Setup`}{' '}
              — {folderName}
            </h2>
            <p className='text-xs text-gray-11'>
              {t`Configure access policies and privileges for folder "${folderName}"`}
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className='grid min-h-0 flex-1 grid-cols-1 gap-0 xl:grid-cols-[290px_1fr]'>
        {/* Sidebar Stepper */}
        <aside className='hidden h-full border-r border-[var(--border-default)] bg-gray-1/30 pt-4 pr-3 pb-4 pl-4 xl:block'>
          <Stepper
            active={step}
            orientation='vertical'
            steps={formattedSteps}
            setActive={(newStep) => goToStep(newStep as Step)}
          />
        </aside>

        {/* Content Area */}
        <div
          className='col-span-1 h-full w-full overflow-y-auto'
          ref={scrollContainerRef}
        >
          <div className='mx-auto w-full max-w-3xl px-6 py-5 pb-10 md:px-8 lg:px-10'>
            {renderStepContent()}

            {/* Footer Navigation */}
            <div className='mt-6 flex items-center justify-between border-t border-[var(--border-default)] pt-4'>
              {step > 0 ? (
                <Button
                  color='gray'
                  disabled={Boolean(accessError) || isLoading}
                  icon='lucide:arrow-left'
                  label={t`Back`}
                  size='sm'
                  variant='outline'
                  onClick={() => goToStep((step - 1) as Step)}
                />
              ) : (
                <div />
              )}

              {step === 2 ? (
                <Button
                  disabled={isSaving || Boolean(accessError) || isLoading}
                  label={isSaving ? t`Saving...` : t`Save Policy`}
                  loading={isSaving}
                  size='sm'
                  suffixIcon='tabler:arrow-right'
                  onClick={() => {
                    void savePolicy()
                  }}
                />
              ) : (
                <Button
                  disabled={Boolean(accessError) || isLoading}
                  label={t`Continue`}
                  size='sm'
                  suffixIcon='tabler:arrow-right'
                  onClick={() => {
                    if (
                      step === 0 &&
                      !ensurePrincipalSelection()
                    )
                      return
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
