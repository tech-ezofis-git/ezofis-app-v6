import { t as staticT } from '@lingui/macro'
import { useLingui } from '@lingui/react/macro'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence } from 'motion/react'
import {
  AnimateFadeIn,
  AnimateScale,
  AnimateSlideUp,
} from '@/components/common/animations'
import cn from '@/utils/cn'
import { isDemoAppOrigin } from '@/utils/origin'
import { getUsers, getGroups, type V6UserListItem, type V6GroupItem } from '@/api/v6/user'
import {
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
import IconButton from '@/components/base/button/IconButton'
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
    description: staticT`Define document rules`,
    icon: 'tabler:adjustments',
    id: 0,
    label: staticT`Document Rules`,
  },
  {
    description: staticT`Assign target users or groups`,
    icon: 'tabler:users',
    id: 1,
    label: staticT`Target Users`,
  },
  {
    description: staticT`Review and save rules`,
    icon: 'tabler:check',
    id: 2,
    label: staticT`Review & Save`,
  },
]

const OPERATOR_OPTIONS = [
  { id: 'equals', name: staticT`Equals` },
  { id: 'notequals', name: staticT`Not Equals` },
  { id: 'contains', name: staticT`Contains` },
  { id: 'startswith', name: staticT`Starts With` },
  { id: 'endswith', name: staticT`Ends With` },
  { id: 'greaterthan', name: staticT`Greater Than` },
  { id: 'lessthan', name: staticT`Less Than` },
  { id: 'between', name: staticT`Between` },
  { id: 'isempty', name: staticT`Is Empty` },
  { id: 'isnotempty', name: staticT`Is Not Empty` },
]

const formatOperatorLabel = (op: string) => {
  const normalized = String(op || '').toLowerCase()
  if (normalized === 'notequals' || normalized === 'ne' || normalized === '!=') return staticT`Not Equals`
  if (normalized === 'contains') return staticT`Contains`
  if (normalized === 'startswith' || normalized === 'starts_with') return staticT`Starts With`
  if (normalized === 'endswith' || normalized === 'ends_with') return staticT`Ends With`
  if (normalized === 'greaterthan' || normalized === 'gt' || normalized === '>') return staticT`Greater Than`
  if (normalized === 'lessthan' || normalized === 'lt' || normalized === '<') return staticT`Less Than`
  if (normalized === 'between') return staticT`Between`
  if (normalized === 'isempty' || normalized === 'empty') return staticT`Is Empty`
  if (normalized === 'isnotempty' || normalized === 'notempty') return staticT`Is Not Empty`
  return staticT`Equals`
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
  repositoryId = '',
  initialRule = null,
  existingRules = [],
  editingIndex = null,
  onSaveSuccess,
  onClose,
}: {
  folderName: string
  repositoryId?: string
  initialRule?: DocumentSecurityRule | null
  existingRules?: DocumentSecurityRule[]
  editingIndex?: number | null
  onSaveSuccess?: () => void
  onClose: () => void
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
  const [fieldOptions, setFieldOptions] = useState<string[]>([])
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

  const loadDataRequestIdRef = useRef(0)

  const loadData = useCallback(async () => {
    const requestId = ++loadDataRequestIdRef.current
    setAccessError(null)
    setIsLoading(true)

    const [uRes, gRes, fieldsRes] = await Promise.all([
      getUsers(),
      getGroups(),
      getFilterFields(repositoryId),
    ])

    if (requestId !== loadDataRequestIdRef.current) return

    const userList = uRes.canceled ? [] : uRes.data || []
    const groupList = gRes.canceled ? [] : gRes.data || []
    if (!uRes.canceled) setUsers(userList)
    if (!gRes.canceled) setGroups(groupList)

    if (!fieldsRes.isCanceled) {
      setFieldOptions(Array.isArray(fieldsRes.data) ? fieldsRes.data : [])
    }

    setIsLoading(false)

    // Pre-fill initialRule if editing
    if (initialRule) {
      setEffectAction(initialRule.action === 'grant' ? 'grant' : 'hide')

      setRules([
        {
          id: 'rule-1',
          matchType: initialRule.match === 'any' ? 'any' : 'all',
          conditions: (initialRule.conditions || []).map((c: DocumentSecurityCondition, cIdx: number) => ({
            id: `c-${cIdx + 1}`,
            field: c.field || '',
            operator: normalizeOperatorCode(c.op),
            value: c.value || '',
          })),
        },
      ])

      const loadedPrincipals: Principal[] = []
      ;(initialRule.userIds || []).forEach((uId: string) => {
        const matched = userList.find((u) => u.id === uId)
        loadedPrincipals.push({
          id: uId,
          name: matched ? (matched.displayName || `${matched.firstName || ''} ${matched.lastName || ''}`.trim() || matched.email || uId) : uId,
          type: 'USER',
        })
      })

      ;(initialRule.groupIds || []).forEach((gId: string) => {
        const matched = groupList.find((g) => (g.id || g.groupId) === gId)
        loadedPrincipals.push({
          id: gId,
          name: matched ? String(matched.name || matched.description || gId) : gId,
          type: 'GROUP',
        })
      })

      setSelectedPrincipals(loadedPrincipals)
    }
  }, [initialRule])

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
      showToast({ message: t`At least one rule is required.`, variant: 'error' })
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
      showToast({ message: t`Select at least one user or group for target assignment.`, variant: 'error' })
      setStep(1)
      return
    }

    for (let i = 0; i < rules.length; i++) {
      const r = rules[i]
      if (!r.conditions || r.conditions.length === 0) {
        showToast({ message: t`Rule ${i + 1} must have at least one condition.`, variant: 'error' })
        setStep(0)
        return
      }
      const emptyCond = r.conditions.find((c) => !c.field || !c.field.trim())
      if (emptyCond) {
        showToast({ message: t`Rule ${i + 1} contains an empty field selection. Select a field name.`, variant: 'error' })
        setStep(0)
        return
      }
    }

    const newRulePayloads: DocumentSecurityRule[] = []
    selectedPrincipals.forEach((p) => {
      rules.forEach((r) => {
        newRulePayloads.push({
          action: effectAction,
          match: r.matchType,
          conditions: r.conditions.map((c) => ({
            field: c.field.trim(),
            op: normalizeOperatorCode(c.operator),
            value: c.value,
          })),
          userIds: p.type === 'USER' ? [p.id] : [],
          groupIds: p.type === 'GROUP' ? [p.id] : [],
        })
      })
    })

    let updatedRules: DocumentSecurityRule[] = []
    if (editingIndex != null && editingIndex >= 0 && editingIndex < existingRules.length) {
      updatedRules = existingRules.filter((_, idx) => idx !== editingIndex)
      updatedRules.splice(editingIndex, 0, ...newRulePayloads)
    } else {
      updatedRules = [...existingRules, ...newRulePayloads]
    }

    setIsSaving(true)
    const res = await putDocumentSecurity(repositoryId, { rules: updatedRules })
    setIsSaving(false)

    if (res.isCanceled) return

    if (res.status === 403) {
      showToast({
        message: t`You do not have access. Admin privileges are required to save document security rules.`,
        variant: 'error',
      })
      return
    }

    if (res.status === 401) {
      showToast({ message: t`Authentication required. Please log in again.`, variant: 'error' })
      return
    }

    if (res.error) {
      showToast({ message: res.error, variant: 'error' })
      return
    }

    showToast({ message: t`Document security rules saved successfully.`, variant: 'success' })
    if (onSaveSuccess) onSaveSuccess()
    onClose()
  }

  const [maxVisitedStep, setMaxVisitedStep] = useState<Step>(
    editingIndex != null || initialRule != null ? 2 : 0,
  )

  const goToStep = (nextStep: Step) => {
    if (!isDemoAppOrigin() && nextStep > 0 && nextStep > step) {
      if (nextStep === 2 && selectedPrincipals.length === 0) {
        showToast({
          message: t`Select at least one user or group for target assignment.`,
          variant: 'error',
        })
        setStep(1)
        return
      }
    }

    setStep(nextStep)
    setMaxVisitedStep((prev) => Math.max(prev, nextStep) as Step)
  }

  const formattedSteps = useMemo(() => {
    const allowAnyStep = isDemoAppOrigin()
    return STEPPER_ITEMS.map((s, idx) => ({
      ...s,
      clickable: allowAnyStep || idx <= maxVisitedStep,
      disabled: allowAnyStep ? false : idx > maxVisitedStep,
    }))
  }, [maxVisitedStep])

  const renderStepContent = () => {
    if (isLoading) {
      return <SecurityWizardSkeleton />
    }

    if (accessError) {
      return (
        <div className="rounded-lg border border-[var(--red-4)] bg-[var(--red-2)] p-4 text-center text-[var(--red-11)]">
          <Icon name="tabler:alert-circle" className="mx-auto mb-1.5 text-[var(--red-9)] size-6" />
          <h4 className="text-sm font-semibold">{t`Access Restricted`}</h4>
          <p className="mt-0.5 text-xs">{accessError}</p>
        </div>
      )
    }

    return (
      <AnimatePresence initial={false} mode="wait">
        {step === 0 && (
          <AnimateSlideUp delay={0.1} key="doc-rule-step-0">
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="text-15 font-semibold text-gray-13">
                  {editingIndex != null ? t`Edit document security rule` : t`Set up document security rules`}
                </h2>
                <p className="mt-0.5 text-xs text-gray-11">
                  {t`Control document-level access by evaluating metadata fields.`}
                </p>
              </div>

              <Divider />

              {/* Rule Action Cards */}
              <div className="space-y-1.5">
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
                        {t`Show Documents`}
                      </div>
                      <div className="text-[11px] text-gray-10 mt-0.5">
                        {t`Show matching documents to target users.`}
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
                        {t`Hide Documents`}
                      </div>
                      <div className="text-[11px] text-gray-10 mt-0.5">
                        {t`Hide matching documents from target users.`}
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
                        {t`Document Rule ${rIndex + 1}`}
                      </div>
                      <div className="flex items-center gap-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-medium text-gray-10">{t`Match:`}</span>
                          <div className="flex items-center bg-gray-3 p-0.5 rounded-md text-[11px] font-medium">
                            <Tooltip content={t`Match ALL conditions (AND logic)`} position="top">
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
                                {t`All`}
                              </button>
                            </Tooltip>

                            <Tooltip content={t`Match ANY condition (OR logic)`} position="top">
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
                                {t`Any`}
                              </button>
                            </Tooltip>
                          </div>
                        </div>
                        {rules.length > 1 && (
                          <button
                            type="button"
                            onClick={() => deleteRule(rule.id)}
                            className="text-gray-9 hover:text-red-500 transition p-1"
                            title={t`Delete Rule`}
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
                              placeholder={t`Select field...`}
                              searchable
                              searchPlaceholder={t`Search fields...`}
                              value={cond.field ? { id: cond.field, name: cond.field } : null}
                              onChange={(option) => updateCondition(rule.id, cond.id, 'field', option?.name || '')}
                            />
                          </div>

                          <div className="w-36 shrink-0">
                            <InputSelect
                              options={OPERATOR_OPTIONS}
                              placeholder={t`Equals`}
                              value={OPERATOR_OPTIONS.find((op) => op.id === normalizeOperatorCode(cond.operator)) || OPERATOR_OPTIONS[0]}
                              onChange={(option) => updateCondition(rule.id, cond.id, 'operator', String(option?.id || 'equals'))}
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            {cond.operator === 'isempty' || cond.operator === 'isnotempty' ? (
                              <div className="h-9 rounded-md border border-[var(--border-default)] bg-surface-muted px-3 py-2 text-xs text-gray-10 italic">
                                {t`N/A (No value needed)`}
                              </div>
                            ) : (
                              <InputText
                                placeholder={t`Value...`}
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
                          <span>{t`Multiple conditions set on field (${duplicateFields.join(', ')}).`}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setDismissedWarnings((prev) => ({ ...prev, [warnKey]: true }))}
                          className="text-gray-9 hover:text-gray-12 p-0.5 transition rounded"
                          title={t`Dismiss`}
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
                      <Icon name="tabler:plus" className="size-3.5" /> {t`Add condition`}
                    </button>
                  </div>
                )
              })}

              <button
                type="button"
                onClick={addRule}
                className="w-full py-2.5 rounded-lg border border-dashed border-primary-8 bg-primary-2 text-primary-9 hover:bg-primary-3 text-xs font-semibold transition flex items-center justify-center gap-1.5"
              >
                <Icon name="tabler:plus" className="size-3.5" /> {t`Add Document Rule`}
              </button>
            </div>
          </AnimateSlideUp>
        )}

        {step === 1 && (
          <AnimateScale delay={0.1} key="doc-rule-step-1">
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="text-15 font-semibold text-gray-13">
                  {t`Target Users & Groups`}
                </h2>
                <p className="mt-0.5 text-xs text-gray-11">
                  {t`Select users or groups who will be subject to this document security rule (${effectAction === 'hide' ? t`Hide Documents` : t`Show Documents`}).`}
                </p>
              </div>

              <Divider />

              <div className="space-y-3">
                <InputSelectMultiple
                  className="bg-surface"
                  label={t`Select Users & Groups *`}
                  options={principalOptions}
                  placeholder={isLoading ? t`Loading users & groups...` : t`Select users or groups...`}
                  value={selectedPrincipals.map((p) => ({ id: p.id, name: p.name }))}
                  onChange={(value) => onSelectedPrincipalsChange(value as any[])}
                />
                <SettingsSelectedChips
                  items={selectedPrincipals.map((p) => ({ id: p.id, name: p.name }))}
                  onRemove={(id) => onSelectedPrincipalsChange(selectedPrincipals.filter((p) => p.id !== id))}
                />

                {selectedPrincipals.length > 0 ? (
                  <Alert
                    text={t`${selectedPrincipals.length} target user/group(s) assigned. Click Continue to review and save rules.`}
                    variant="green"
                  />
                ) : null}
              </div>
            </div>
          </AnimateScale>
        )}

        {step === 2 && (
          <AnimateFadeIn delay={0.1} key="doc-rule-step-2">
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="text-15 font-semibold text-gray-13">
                  {t`Review & Save Document Security Rules`}
                </h2>
                <p className="mt-0.5 text-xs text-gray-11">
                  {t`Verify your security rules before applying settings.`}
                </p>
              </div>

              <Divider />

              {/* Compact 3-Column Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="rounded-lg border border-[var(--border-default)] bg-surface px-3 py-2.5 shadow-2xs">
                  <div className="text-[11px] font-medium text-gray-11">{t`Repository`}</div>
                  <div className="text-13 font-semibold text-gray-13 truncate mt-0.5 flex items-center gap-1.5">
                    <Icon name="tabler:folder" className="size-3.5 text-primary-9" /> {folderName}
                  </div>
                </div>

                <div className="rounded-lg border border-[var(--border-default)] bg-surface px-3 py-2.5 shadow-2xs">
                  <div className="text-[11px] font-medium text-gray-11">{t`Target Users & Groups`}</div>
                  <div className="text-13 font-semibold text-gray-13 mt-0.5 flex items-center gap-1.5">
                    <Icon name="tabler:users" className="size-3.5 text-primary-9" /> {selectedPrincipals.length}
                  </div>
                </div>

                <div className="rounded-lg border border-[var(--border-default)] bg-surface px-3 py-2.5 shadow-2xs">
                  <div className="text-[11px] font-medium text-gray-11">{t`Rule Action`}</div>
                  <div className="text-13 font-semibold text-gray-13 mt-0.5 flex items-center gap-1.5">
                    <Icon name={effectAction === 'hide' ? 'tabler:eye-off' : 'tabler:eye'} className="size-3.5 text-primary-9" /> {effectAction === 'hide' ? t`Hide Documents` : t`Show Documents`}
                  </div>
                </div>
              </div>

              {/* Target Users Section */}
              <div className="rounded-lg border border-[var(--border-default)] bg-surface p-3 shadow-2xs space-y-2">
                <div className="text-xs font-semibold text-gray-12 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Icon name="tabler:users" className="size-3.5 text-primary-9" /> {t`Target Users (${selectedPrincipals.length})`}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedPrincipals.map((p) => {
                    const initials = getInitials(p.name)

                    return (
                      <span
                        key={p.id}
                        className="inline-flex h-8 items-center gap-2 rounded-lg border border-primary-4/60 bg-gradient-to-r from-primary-3/70 to-primary-2/90 px-2.5 py-1 text-xs font-semibold text-gray-13 shadow-2xs"
                      >
                        <span className="flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-full border border-primary-4/50 bg-white text-[10px] font-bold tracking-tight text-primary-11 shadow-2xs">
                          {initials}
                        </span>
                        {p.name}
                      </span>
                    )
                  })}
                  {selectedPrincipals.length === 0 && (
                    <span className="text-xs italic text-gray-10">{t`No target users assigned`}</span>
                  )}
                </div>
              </div>

              {/* Configured Document Rules Summary Card */}
              <div className="rounded-lg border border-[var(--border-default)] bg-surface p-3.5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-2.5">
                  <div className="text-xs font-semibold text-gray-12 flex items-center gap-1.5">
                    <Icon name="tabler:shield" className="size-3.5 text-primary-9" />
                    {t`How Documents Will Be Protected`}
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-md border border-primary-4 bg-primary-2 px-2 py-0.5 text-[11px] font-semibold text-primary-11">
                    {effectAction === 'hide' ? (
                      <>
                        <Icon name="tabler:eye-off" className="size-3 text-primary-9" /> {t`Hide Documents`}
                      </>
                    ) : (
                      <>
                        <Icon name="tabler:eye" className="size-3 text-primary-9" /> {t`Show Documents`}
                      </>
                    )}
                  </span>
                </div>

                <div className="space-y-2">
                  {rules.map((rule) => {
                    const matchText = rule.matchType === 'all'
                      ? t`All conditions must match`
                      : t`Any condition can match`

                    return (
                      <div key={rule.id} className="rounded-md border border-[var(--border-default)] bg-surface-muted p-2.5 space-y-2">
                        <div className="text-xs text-gray-12 flex items-center justify-between font-medium">
                          <span className="flex items-center gap-1.5 font-semibold">
                            {effectAction === 'hide' ? (
                              <Icon name="tabler:eye-off" className="size-3.5 text-primary-9" />
                            ) : (
                              <Icon name="tabler:eye" className="size-3.5 text-primary-9" />
                            )}
                            {effectAction === 'hide' ? t`Documents will be hidden when:` : t`Documents will be shown when:`}
                          </span>
                          <span className="text-[10px] font-semibold text-primary-11 bg-primary-3 px-2 py-0.5 rounded">
                            {matchText}
                          </span>
                        </div>

                        <div className="space-y-1 pl-1.5">
                          {rule.conditions.map((c) => {
                            const opText = formatOperatorLabel(c.operator)
                            const valText = c.value ? `"${c.value}"` : t`any value`

                            return (
                              <div key={c.id} className="flex items-center gap-1.5 text-xs text-gray-12 font-normal">
                                <Icon name="tabler:check" className="size-3.5 text-green-9 shrink-0" />
                                <span>
                                  <strong className="font-semibold text-gray-13">{c.field || t`Field`}</strong> {opText} <strong className="font-semibold text-primary-11">{valText}</strong>
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
          </AnimateFadeIn>
        )}
      </AnimatePresence>
    )
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-gray-1">
      {/* Top Header */}
      <div className="mb-2 flex items-center justify-between border-b border-[var(--border-default)] px-6 py-3.5 md:px-8">
        <div className="flex items-center gap-3">
          <IconButton
            ariaLabel={t`Back`}
            color="gray"
            icon="lucide:arrow-left"
            size="sm"
            variant="ghost"
            onClick={onClose}
          />
          <div className="flex flex-col gap-0.5">
            <h2 className="text-15 font-semibold tracking-tight text-gray-13">
              {editingIndex != null ? t`Edit Document Security Rule` : t`Document Security Setup`} — {folderName}
            </h2>
            <p className="text-xs text-gray-11">
              {t`Configure metadata-based document security rules for folder "${folderName}"`}
            </p>
          </div>
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
            setActive={(newStep) => goToStep(newStep as Step)}
          />
        </aside>

        {/* Content Area */}
        <div className="col-span-1 h-full w-full overflow-y-auto" ref={scrollContainerRef}>
          <div className="mx-auto w-full max-w-3xl px-6 py-5 pb-10 md:px-8 lg:px-10">
            {renderStepContent()}

            {/* Footer Navigation */}
            <div className="mt-6 flex items-center justify-between border-t border-[var(--border-default)] pt-4">
              <Button
                color="gray"
                disabled={step === 0 || Boolean(accessError) || isLoading}
                icon="lucide:arrow-left"
                label={t`Back`}
                size="sm"
                variant="outline"
                onClick={() => goToStep((step - 1) as Step)}
              />

              {step === 2 ? (
                <Button
                  disabled={isSaving || Boolean(accessError) || isLoading}
                  label={isSaving ? t`Saving...` : t`Save Rules`}
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
                  label={t`Continue`}
                  size="sm"
                  suffixIcon="tabler:arrow-right"
                  onClick={() => goToStep((step + 1) as Step)}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
