import { useCallback, useEffect, useMemo, useState } from 'react'
import cn from '@/utils/cn'
import { getUsers, getGroups, type V6UserListItem, type V6GroupItem } from '@/api/v6/user'
import {
  getDocumentSecurity,
  getFilterFields,
  putDocumentSecurity,
  type DocumentSecurityCondition,
  type DocumentSecurityRule,
} from '@/api/v6/folder/security'
import showToast from '@/components/base/toast/showToast'
import Tooltip from '@/components/base/Tooltip'
import InputText from '@/components/base/inputs/InputText'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputSelectMultiple from '@/components/base/inputs/InputSelectMultiple'
import Stepper from '@/components/base/Stepper'
import Button from '@/components/base/button/Button'
import Divider from '@/components/base/Divider'
import Alert from '@/components/base/Alert'
import Icon from '@/components/base/icon/Icon'
import Skeleton from '@/components/base/Skeleton'
import SettingsSelectedChips from '../SettingsSelectedChips'

type Step = 0 | 1 | 2

type Condition = {
  id: string
  field: string
  operator: string
  value: string
}

type Rule = {
  id: string
  matchType: 'all' | 'any'
  conditions: Condition[]
}

type Principal = {
  id: string
  name: string
  type: 'USER' | 'GROUP'
}

const STEPPER_ITEMS = [
  {
    description: 'Define document rules',
    icon: 'tabler:adjustments',
    id: 0,
    label: 'Document Rules',
  },
  {
    description: 'Assign target users or groups',
    icon: 'tabler:users',
    id: 1,
    label: 'Target Users',
  },
  {
    description: 'Review and save rules',
    icon: 'tabler:check',
    id: 2,
    label: 'Review & Save',
  },
]

const DEFAULT_FIELDS = [
  'Supplier',
  'Department',
  'DocumentType',
  'Status',
  'AiStatus',
  'InvoiceNumber',
  'PoNumber',
  'FileName',
  'Currency',
  'Buyer',
  'RiskLevel',
  'Source',
]

const OPERATOR_OPTIONS = [
  { id: 'equals', name: 'Equals' },
  { id: 'notequals', name: 'Not Equals' },
  { id: 'contains', name: 'Contains' },
  { id: 'startswith', name: 'Starts With' },
  { id: 'endswith', name: 'Ends With' },
  { id: 'greaterthan', name: 'Greater Than' },
  { id: 'lessthan', name: 'Less Than' },
  { id: 'between', name: 'Between' },
  { id: 'isempty', name: 'Is Empty' },
  { id: 'isnotempty', name: 'Is Not Empty' },
]

const formatOperatorLabel = (op: string) => {
  const normalized = String(op || '').toLowerCase()
  if (normalized === 'notequals' || normalized === 'ne' || normalized === '!=') return 'Not Equals'
  if (normalized === 'contains') return 'Contains'
  if (normalized === 'startswith' || normalized === 'starts_with') return 'Starts With'
  if (normalized === 'endswith' || normalized === 'ends_with') return 'Ends With'
  if (normalized === 'greaterthan' || normalized === 'gt' || normalized === '>') return 'Greater Than'
  if (normalized === 'lessthan' || normalized === 'lt' || normalized === '<') return 'Less Than'
  if (normalized === 'between') return 'Between'
  if (normalized === 'isempty' || normalized === 'empty') return 'Is Empty'
  if (normalized === 'isnotempty' || normalized === 'notempty') return 'Is Not Empty'
  return 'Equals'
}

const normalizeOperatorCode = (opLabelOrCode: string) => {
  const normalized = String(opLabelOrCode || '').toLowerCase()
  if (normalized === 'not equals' || normalized === 'notequals' || normalized === 'ne' || normalized === '!=') return 'notequals'
  if (normalized === 'contains') return 'contains'
  if (normalized === 'starts with' || normalized === 'startswith') return 'startswith'
  if (normalized === 'ends with' || normalized === 'endswith') return 'endswith'
  if (normalized === 'greater than' || normalized === 'greaterthan' || normalized === 'gt') return 'greaterthan'
  if (normalized === 'less than' || normalized === 'lessthan' || normalized === 'lt') return 'lessthan'
  if (normalized === 'between') return 'between'
  if (normalized === 'is empty' || normalized === 'isempty') return 'isempty'
  if (normalized === 'is not empty' || normalized === 'isnotempty') return 'isnotempty'
  return 'equals'
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

export default function DocumentSecurityRuleWizard({
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
  const [fieldOptions, setFieldOptions] = useState<string[]>(DEFAULT_FIELDS)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [accessError, setAccessError] = useState<string | null>(null)
  const [dismissedWarnings, setDismissedWarnings] = useState<Record<string, boolean>>({})

  const [rules, setRules] = useState<Rule[]>([
    {
      id: 'rule-1',
      matchType: 'all',
      conditions: [{ id: 'c-1', field: '', operator: 'equals', value: '' }],
    },
  ])

  const [selectedPrincipals, setSelectedPrincipals] = useState<Principal[]>([])
  const [effectAction, setEffectAction] = useState<'hide' | 'grant'>('hide')

  const applyDocumentSecurityData = useCallback(
    (docSecData: any, userList: V6UserListItem[], groupList: V6GroupItem[]) => {
      const loadedRules = docSecData?.rules || []
      if (loadedRules.length > 0) {
        const firstRule = loadedRules[0]
        setEffectAction(firstRule.action === 'grant' ? 'grant' : 'hide')

        const mappedRules: Rule[] = loadedRules.map((r: any, idx: number) => ({
          id: `rule-${idx + 1}`,
          matchType: r.match === 'any' ? 'any' : 'all',
          conditions: (r.conditions || []).map((c: any, cIdx: number) => ({
            id: `c-${idx + 1}-${cIdx + 1}`,
            field: c.field || '',
            operator: normalizeOperatorCode(c.op),
            value: c.value || '',
          })),
        }))

        setRules(mappedRules.length > 0 ? mappedRules : [
          {
            id: 'rule-1',
            matchType: 'all',
            conditions: [{ id: 'c-1', field: '', operator: 'equals', value: '' }],
          },
        ])

        const loadedPrincipals: Principal[] = []
          ; (firstRule.userIds || []).forEach((uId: string) => {
            const matched = userList.find((u) => u.id === uId)
            loadedPrincipals.push({
              id: uId,
              name: matched ? (matched.displayName || `${matched.firstName} ${matched.lastName}`.trim()) : uId,
              type: 'USER',
            })
          })
          ; (firstRule.groupIds || []).forEach((gId: string) => {
            const matched = groupList.find((g) => (g.id || g.groupId) === gId)
            loadedPrincipals.push({
              id: gId,
              name: matched ? String(matched.name || matched.description || gId) : gId,
              type: 'GROUP',
            })
          })
        setSelectedPrincipals(loadedPrincipals)
      }
    },
    [],
  )

  const loadData = useCallback(async () => {
    setAccessError(null)

    // Check cache
    const cachedSec = await getDocumentSecurity(repositoryId, true)
    const hasCache = Boolean(cachedSec.isFromCache && cachedSec.data)

    if (hasCache) {
      setIsLoading(false)
    } else {
      setIsLoading(true)
    }

    const [uRes, gRes, fieldsRes] = await Promise.all([
      getUsers(),
      getGroups(),
      getFilterFields(),
    ])

    const userList = uRes.data || []
    const groupList = gRes.data || []
    setUsers(userList)
    setGroups(groupList)

    if (fieldsRes.data && fieldsRes.data.length > 0) {
      const mergedFields = Array.from(new Set([...fieldsRes.data, ...DEFAULT_FIELDS]))
      setFieldOptions(mergedFields)
    }

    if (hasCache && cachedSec.data) {
      applyDocumentSecurityData(cachedSec.data, userList, groupList)
    }

    // Background Revalidation
    const docSecRes = await getDocumentSecurity(repositoryId, false)
    if (docSecRes.isCanceled) {
      setIsLoading(false)
      return
    }

    if (docSecRes.status === 401) {
      showToast({ message: 'Authentication required. Please log in again.', variant: 'error' })
      setAccessError('Authentication required')
    } else if (docSecRes.status === 403) {
      const msg = 'You do not have access to view or edit document security rules.'
      showToast({ message: msg, variant: 'error' })
      setAccessError(msg)
    } else if (docSecRes.status === 404) {
      showToast({ message: 'Repository not found.', variant: 'error' })
      setAccessError('Repository not found')
    } else if (docSecRes.error) {
      showToast({ message: docSecRes.error, variant: 'error' })
    } else if (docSecRes.data) {
      applyDocumentSecurityData(docSecRes.data, userList, groupList)
    }

    setIsLoading(false)
  }, [repositoryId, applyDocumentSecurityData])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const fieldSelectOptions = useMemo(
    () => fieldOptions.map((f) => ({ id: f, name: f })),
    [fieldOptions],
  )

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

  const addRule = () => {
    setRules((prev) => [
      ...prev,
      {
        id: `rule-${Date.now()}`,
        matchType: 'all',
        conditions: [{ id: `c-${Date.now()}`, field: '', operator: 'equals', value: '' }],
      },
    ])
  }

  const deleteRule = (ruleId: string) => {
    if (rules.length === 1) {
      showToast({ message: 'At least one rule is required.', variant: 'error' })
      return
    }
    setRules((prev) => prev.filter((r) => r.id !== ruleId))
  }

  const toggleMatchType = (ruleId: string, matchType: 'all' | 'any') => {
    setRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, matchType } : r)),
    )
  }

  const addCondition = (ruleId: string) => {
    setRules((prev) =>
      prev.map((r) => {
        if (r.id === ruleId) {
          return {
            ...r,
            conditions: [
              ...r.conditions,
              { id: `c-${Date.now()}`, field: '', operator: 'equals', value: '' },
            ],
          }
        }
        return r
      }),
    )
  }

  const deleteCondition = (ruleId: string, condId: string) => {
    setRules((prev) =>
      prev.map((r) => {
        if (r.id === ruleId) {
          if (r.conditions.length === 1) return r
          return {
            ...r,
            conditions: r.conditions.filter((c) => c.id !== condId),
          }
        }
        return r
      }),
    )
  }

  const updateCondition = (
    ruleId: string,
    condId: string,
    key: keyof Condition,
    val: string,
  ) => {
    setRules((prev) =>
      prev.map((r) => {
        if (r.id === ruleId) {
          return {
            ...r,
            conditions: r.conditions.map((c) =>
              c.id === condId ? { ...c, [key]: val } : c,
            ),
          }
        }
        return r
      }),
    )
  }

  const saveRule = async () => {
    if (selectedPrincipals.length === 0) {
      showToast({ message: 'Select at least one user or group for target assignment.', variant: 'error' })
      setStep(1)
      return
    }

    for (let i = 0; i < rules.length; i++) {
      const r = rules[i]
      if (!r.conditions || r.conditions.length === 0) {
        showToast({ message: `Rule ${i + 1} must have at least one condition.`, variant: 'error' })
        setStep(0)
        return
      }
      const emptyCond = r.conditions.find((c) => !c.field || !c.field.trim())
      if (emptyCond) {
        showToast({ message: `Rule ${i + 1} contains an empty field selection. Select a field name.`, variant: 'error' })
        setStep(0)
        return
      }
    }

    const userIds = selectedPrincipals.filter((p) => p.type === 'USER').map((p) => p.id)
    const groupIds = selectedPrincipals.filter((p) => p.type === 'GROUP').map((p) => p.id)

    const payloadRules: DocumentSecurityRule[] = rules.map((r) => ({
      action: effectAction,
      conditions: r.conditions.map((c) => ({
        field: c.field.trim(),
        op: normalizeOperatorCode(c.operator),
        value: c.value,
      })),
      groupIds,
      match: r.matchType,
      userIds,
    }))

    setIsSaving(true)
    const res = await putDocumentSecurity(repositoryId, { rules: payloadRules })
    setIsSaving(false)

    if (res.isCanceled) return

    if (res.status === 403) {
      showToast({
        message: 'You do not have access. Admin privileges are required to save document security rules.',
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

    showToast({ message: 'Document security rules saved successfully.', variant: 'success' })
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
              Set up document security rules
            </h2>
            <p className="mt-0.5 text-xs text-gray-11">
              Control document-level access by evaluating metadata fields.
            </p>
          </div>

          <Divider />

          {/* Rule Action Cards */}
          <div className="space-y-1.5">
            {/* <label className="text-[11px] font-semibold text-gray-11">
              Rule Action
            </label> */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setEffectAction('grant')}
                className={cn(
                  'relative flex items-start gap-2.5 p-3 rounded-lg border text-left transition',
                  effectAction === 'grant'
                    ? 'border-primary-8 bg-primary-2 ring-1 ring-primary-8'
                    : 'border-[var(--border-default)] bg-surface hover:bg-surface-muted',
                )}
              >
                {effectAction === 'grant' && (
                  <span className="absolute top-2.5 right-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary-9 text-white">
                    <Icon name="tabler:check" className="size-2.5" />
                  </span>
                )}
                <Icon name="tabler:eye" className={cn('size-4 mt-0.5 shrink-0', effectAction === 'grant' ? 'text-primary-9' : 'text-gray-10')} />
                <div>
                  <div className={cn('text-xs font-semibold', effectAction === 'grant' ? 'text-primary-11' : 'text-gray-13')}>
                    Show Documents
                  </div>
                  <div className="text-[11px] text-gray-10 mt-0.5">
                    Show matching documents to target users.
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setEffectAction('hide')}
                className={cn(
                  'relative flex items-start gap-2.5 p-3 rounded-lg border text-left transition',
                  effectAction === 'hide'
                    ? 'border-primary-8 bg-primary-2 ring-1 ring-primary-8'
                    : 'border-[var(--border-default)] bg-surface hover:bg-surface-muted',
                )}
              >
                {effectAction === 'hide' && (
                  <span className="absolute top-2.5 right-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary-9 text-white">
                    <Icon name="tabler:check" className="size-2.5" />
                  </span>
                )}
                <Icon name="tabler:eye-off" className={cn('size-4 mt-0.5 shrink-0', effectAction === 'hide' ? 'text-primary-9' : 'text-gray-10')} />
                <div>
                  <div className={cn('text-xs font-semibold', effectAction === 'hide' ? 'text-primary-11' : 'text-gray-13')}>
                    Hide Documents
                  </div>
                  <div className="text-[11px] text-gray-10 mt-0.5">
                    Hide matching documents from target users.
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Rule Cards */}
          {rules.map((rule, rIndex) => {
            const duplicateFields = Array.from(
              new Set(
                rule.conditions
                  .map((c) => c.field)
                  .filter(Boolean)
                  .filter((f, idx, arr) => arr.indexOf(f) !== idx),
              ),
            )
            const warnKey = `${rule.id}-${duplicateFields.join('-')}`

            return (
              <div
                key={rule.id}
                className="rounded-lg border border-[var(--border-default)] bg-surface p-3.5 shadow-2xs space-y-3"
              >
                <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-13">
                    <Icon name="tabler:adjustments" className="size-3.5 text-primary-9" />
                    Document Rule {rIndex + 1}
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-medium text-gray-10">Match:</span>
                      <div className="flex items-center bg-gray-3 p-0.5 rounded-md text-[11px] font-medium">
                        <Tooltip content="Match ALL conditions (AND logic)" position="top">
                          <button
                            type="button"
                            onClick={() => toggleMatchType(rule.id, 'all')}
                            className={cn(
                              'px-2 py-0.5 rounded transition text-[11px] font-semibold',
                              rule.matchType === 'all'
                                ? 'bg-primary-9 text-white'
                                : 'text-gray-11 hover:text-gray-12',
                            )}
                          >
                            All
                          </button>
                        </Tooltip>

                        <Tooltip content="Match ANY condition (OR logic)" position="top">
                          <button
                            type="button"
                            onClick={() => toggleMatchType(rule.id, 'any')}
                            className={cn(
                              'px-2 py-0.5 rounded transition text-[11px] font-semibold',
                              rule.matchType === 'any'
                                ? 'bg-primary-9 text-white'
                                : 'text-gray-11 hover:text-gray-12',
                            )}
                          >
                            Any
                          </button>
                        </Tooltip>
                      </div>
                    </div>
                    {rules.length > 1 && (
                      <button
                        type="button"
                        onClick={() => deleteRule(rule.id)}
                        className="text-gray-9 hover:text-red-500 transition p-1"
                        title="Delete Rule"
                      >
                        <Icon name="tabler:trash" className="size-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  {rule.conditions.map((cond) => (
                    <div key={cond.id} className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <InputSelect
                          options={fieldSelectOptions}
                          placeholder="Select field..."
                          value={cond.field ? { id: cond.field, name: cond.field } : null}
                          onChange={(option) => updateCondition(rule.id, cond.id, 'field', option?.name || '')}
                        />
                      </div>

                      <div className="w-36 shrink-0">
                        <InputSelect
                          options={OPERATOR_OPTIONS}
                          placeholder="Equals"
                          value={OPERATOR_OPTIONS.find((op) => op.id === normalizeOperatorCode(cond.operator)) || OPERATOR_OPTIONS[0]}
                          onChange={(option) => updateCondition(rule.id, cond.id, 'operator', String(option?.id || 'equals'))}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        {cond.operator === 'isempty' || cond.operator === 'isnotempty' ? (
                          <div className="h-9 rounded-md border border-[var(--border-default)] bg-surface-muted px-3 py-2 text-xs text-gray-10 italic">
                            N/A (No value needed)
                          </div>
                        ) : (
                          <InputText
                            placeholder="Value..."
                            value={cond.value}
                            onChange={(val) => updateCondition(rule.id, cond.id, 'value', val)}
                          />
                        )}
                      </div>

                      {rule.conditions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => deleteCondition(rule.id, cond.id)}
                          className="text-gray-9 hover:text-red-500 transition p-1 shrink-0"
                        >
                          <Icon name="tabler:trash" className="size-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {duplicateFields.length > 0 && !dismissedWarnings[warnKey] && (
                  <div className="flex items-center justify-between rounded-md border border-[var(--border-default)] bg-surface-muted px-2.5 py-1.5 text-xs font-medium text-gray-11 transition">
                    <div className="flex items-center gap-1.5">
                      <Icon name="tabler:alert-triangle" className="size-3.5 shrink-0 text-amber-500" />
                      <span>Multiple conditions set on field ({duplicateFields.join(', ')}).</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDismissedWarnings((prev) => ({ ...prev, [warnKey]: true }))}
                      className="text-gray-9 hover:text-gray-12 p-0.5 transition rounded"
                      title="Dismiss"
                    >
                      <Icon name="tabler:x" className="size-3.5" />
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => addCondition(rule.id)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary-9 hover:text-primary-10 transition pt-0.5"
                >
                  <Icon name="tabler:plus" className="size-3.5" /> Add condition
                </button>
              </div>
            )
          })}

          <button
            type="button"
            onClick={addRule}
            className="w-full py-2.5 rounded-lg border border-dashed border-primary-8 bg-primary-2 text-primary-9 hover:bg-primary-3 text-xs font-semibold transition flex items-center justify-center gap-1.5"
          >
            <Icon name="tabler:plus" className="size-3.5" /> Add Document Rule
          </button>
        </div>
      )
    }

    if (step === 1) {
      return (
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-15 font-semibold text-gray-13">
              Target Users & Groups
            </h2>
            <p className="mt-0.5 text-xs text-gray-11">
              Select users or groups who will be subject to this document security rule ({effectAction === 'hide' ? 'Hide Documents' : 'Show Documents'}).
            </p>
          </div>

          <Divider />

          <div className="space-y-3">
            <InputSelectMultiple
              className="bg-surface"
              label="Select Users & Groups *"
              options={principalOptions}
              placeholder={isLoading ? 'Loading users & groups...' : 'Select users or groups...'}
              value={selectedPrincipals.map((p) => ({ id: p.id, name: p.name }))}
              onChange={(value) => onSelectedPrincipalsChange(value as any[])}
            />
            <SettingsSelectedChips
              items={selectedPrincipals.map((p) => ({ id: p.id, name: p.name }))}
              onRemove={(id) => onSelectedPrincipalsChange(selectedPrincipals.filter((p) => p.id !== id))}
            />

            {selectedPrincipals.length > 0 ? (
              <Alert
                text={`${selectedPrincipals.length} target user/group(s) assigned. Click Continue to review and save rules.`}
                variant="green"
              />
            ) : null}
          </div>
        </div>
      )
    }

    if (step === 2) {
      return (
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-15 font-semibold text-gray-13">
              Review & Save Document Security Rules
            </h2>
            <p className="mt-0.5 text-xs text-gray-11">
              Verify your security rules before applying settings.
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
              <div className="text-[11px] font-medium text-gray-11">Target Users</div>
              <div className="text-13 font-semibold text-gray-13 mt-0.5 flex items-center gap-1.5">
                <Icon name="tabler:users" className="size-3.5 text-primary-9" /> {selectedPrincipals.length} {selectedPrincipals.length === 1 ? 'User' : 'Users'}
              </div>
            </div>

            <div className="rounded-lg border border-[var(--border-default)] bg-surface px-3 py-2.5 shadow-2xs">
              <div className="text-[11px] font-medium text-gray-11">Document Rules</div>
              <div className="text-13 font-semibold text-gray-13 mt-0.5 flex items-center gap-1.5">
                <Icon name="tabler:adjustments" className="size-3.5 text-primary-9" /> {rules.length} {rules.length === 1 ? 'Rule' : 'Rules'}
              </div>
            </div>
          </div>

          {/* Target Users Section */}
          <div className="rounded-lg border border-[var(--border-default)] bg-surface p-3 shadow-2xs space-y-2">
            <div className="text-xs font-semibold text-gray-12 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Icon name="tabler:users" className="size-3.5 text-primary-9" /> Target Users ({selectedPrincipals.length})
              </span>
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
                <span className="text-xs italic text-gray-10">No target users assigned</span>
              )}
            </div>
          </div>

          {/* Configured Document Rules Summary Card */}
          <div className="rounded-lg border border-[var(--border-default)] bg-surface p-3.5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-2.5">
              <div className="text-xs font-semibold text-gray-12 flex items-center gap-1.5">
                <Icon name="tabler:shield" className="size-3.5 text-primary-9" />
                How Documents Will Be Protected
              </div>
              <span className="inline-flex items-center gap-1 rounded-md border border-primary-4 bg-primary-2 px-2 py-0.5 text-[11px] font-semibold text-primary-11">
                {effectAction === 'hide' ? (
                  <>
                    <Icon name="tabler:eye-off" className="size-3 text-primary-9" /> Hide Documents
                  </>
                ) : (
                  <>
                    <Icon name="tabler:eye" className="size-3 text-primary-9" /> Show Documents
                  </>
                )}
              </span>
            </div>

            <div className="space-y-2">
              {rules.map((rule, idx) => {
                const matchText = rule.matchType === 'all'
                  ? 'All conditions must match'
                  : 'Any condition can match'

                return (
                  <div key={rule.id} className="rounded-md border border-[var(--border-default)] bg-surface-muted p-2.5 space-y-2">
                    <div className="text-xs text-gray-12 flex items-center justify-between font-medium">
                      <span className="flex items-center gap-1.5 font-semibold">
                        {effectAction === 'hide' ? (
                          <Icon name="tabler:eye-off" className="size-3.5 text-primary-9" />
                        ) : (
                          <Icon name="tabler:eye" className="size-3.5 text-primary-9" />
                        )}
                        Documents will be {effectAction === 'hide' ? 'hidden' : 'shown'} when:
                      </span>
                      <span className="text-[10px] font-semibold text-primary-11 bg-primary-3 px-2 py-0.5 rounded">
                        {matchText}
                      </span>
                    </div>

                    <div className="space-y-1 pl-1.5">
                      {rule.conditions.map((c) => {
                        const opText = formatOperatorLabel(c.operator)
                        const valText = c.value ? `"${c.value}"` : 'any value'

                        return (
                          <div key={c.id} className="flex items-center gap-1.5 text-xs text-gray-12 font-normal">
                            <Icon name="tabler:check" className="size-3.5 text-green-9 shrink-0" />
                            <span>
                              <strong className="font-semibold text-gray-13">{c.field || 'Field'}</strong> {opText} <strong className="font-semibold text-primary-11">{valText}</strong>
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
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
            Document Security Setup — {folderName}
          </h2>
          <p className="text-xs text-gray-11">
            Configure metadata-based document security rules for folder &quot;{folderName}&quot;
          </p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 xl:grid-cols-[290px_1fr]">
        {/* Sidebar Stepper */}
        <aside className="hidden h-full border-r border-[var(--border-default)] bg-gray-1/30 pt-4 pr-3 pb-4 pl-4 xl:block">
          <Stepper
            active={step}
            orientation="vertical"
            steps={formattedSteps}
            setActive={(newStep) => setStep(newStep as Step)}
          />
        </aside>

        {/* Content Area */}
        <div className="col-span-1 h-full w-full overflow-y-auto">
          <div className="mx-auto w-full max-w-3xl px-6 py-5 pb-10 md:px-8 lg:px-10">
            {renderStepContent()}

            {/* Footer Navigation */}
            <div className="mt-6 flex items-center justify-between border-t border-[var(--border-default)] pt-4">
              <Button
                color="gray"
                disabled={step === 0 || Boolean(accessError) || isLoading}
                icon="lucide:arrow-left"
                label="Back"
                size="sm"
                variant="outline"
                onClick={() => setStep((step - 1) as Step)}
              />

              {step === 2 ? (
                <Button
                  disabled={isSaving || Boolean(accessError) || isLoading}
                  label={isSaving ? 'Saving...' : 'Save Rules'}
                  loading={isSaving}
                  size="sm"
                  suffixIcon="tabler:arrow-right"
                  onClick={() => {
                    void saveRule()
                  }}
                />
              ) : (
                <Button
                  disabled={Boolean(accessError) || isLoading}
                  label="Continue"
                  size="sm"
                  suffixIcon="tabler:arrow-right"
                  onClick={() => setStep((step + 1) as Step)}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
