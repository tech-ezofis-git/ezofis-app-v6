import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, Shield, Users, Plus, Trash2, Sliders, AlertTriangle, Eye, EyeOff, X, AlertCircle } from 'lucide-react'
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
import SettingsSelectedChips from '../SettingsSelectedChips'
import SettingsSetupHeader from '../SettingsSetupHeader'
import SettingsSetupContent from '../SettingsSetupContent'
import SettingsFormSection from '../SettingsFormSection'

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

const WIZARD_STEPS = [
  { id: 0, title: 'Build Rule', icon: Sliders },
  { id: 1, title: 'Users & Groups', icon: Users },
  { id: 2, title: 'Review & Save', icon: Check },
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
]

const formatOperatorLabel = (op: string) => {
  const normalized = String(op || '').toLowerCase()
  if (normalized === 'notequals' || normalized === 'ne' || normalized === '!=') return 'Not Equals'
  if (normalized === 'contains') return 'Contains'
  return 'Equals'
}

const normalizeOperatorCode = (opLabelOrCode: string) => {
  const normalized = String(opLabelOrCode || '').toLowerCase()
  if (normalized === 'not equals' || normalized === 'notequals' || normalized === 'ne' || normalized === '!=') return 'notequals'
  if (normalized === 'contains') return 'contains'
  return 'equals'
}

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

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setAccessError(null)

    // Fetch users, groups & metadata filter fields in parallel
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

    // Fetch document security rules
    const docSecRes = await getDocumentSecurity(repositoryId)

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
      const loadedRules = docSecRes.data.rules || []
      if (loadedRules.length > 0) {
        const firstRule = loadedRules[0]
        setEffectAction(firstRule.action === 'grant' ? 'grant' : 'hide')

        const mappedRules: Rule[] = loadedRules.map((r, idx) => ({
          id: `rule-${idx + 1}`,
          matchType: r.match === 'any' ? 'any' : 'all',
          conditions: (r.conditions || []).map((c, cIdx) => ({
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
        ;(firstRule.userIds || []).forEach((uId) => {
          const matched = userList.find((u) => u.id === uId)
          loadedPrincipals.push({
            id: uId,
            name: matched ? (matched.displayName || `${matched.firstName} ${matched.lastName}`.trim()) : uId,
            type: 'USER',
          })
        })
        // Map groupIds
        ;(firstRule.groupIds || []).forEach((gId) => {
          const matched = groupList.find((g) => (g.id || g.groupId) === gId)
          loadedPrincipals.push({
            id: gId,
            name: matched ? String(matched.name || matched.description || gId) : gId,
            type: 'GROUP',
          })
        })

        setSelectedPrincipals(loadedPrincipals)
      }
    }

    setIsLoading(false)
  }, [repositoryId])

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

  // Rule actions
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
    // Client-side validations
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

  const clearAllRules = async () => {
    setIsSaving(true)
    const res = await putDocumentSecurity(repositoryId, { rules: [] })
    setIsSaving(false)

    if (res.status === 403) {
      showToast({
        message: 'You do not have access. Admin privileges are required to clear document security rules.',
        variant: 'error',
      })
      return
    }

    if (res.error) {
      showToast({ message: res.error, variant: 'error' })
      return
    }

    showToast({ message: 'Document security rules cleared.', variant: 'success' })
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
          <div className="space-y-4 max-h-[calc(100vh-340px)] overflow-y-auto ez-scrollbar pr-1">
            <div className="rounded-[14px] border border-[var(--border-default)] bg-[var(--surface)] p-5 shadow-sm space-y-3">
              <label className="text-xs font-semibold text-[var(--gray-12)] tracking-wider">
                Select Rule Action
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setEffectAction('grant')}
                  className={cn(
                    'flex items-start gap-3 p-3.5 rounded-xl border text-left transition',
                    effectAction === 'grant'
                      ? 'border-[var(--primary-8)] bg-[var(--primary-2)] ring-1 ring-[var(--primary-8)]'
                      : 'border-[var(--border-default)] bg-[var(--surface)] hover:bg-[var(--gray-2)]',
                  )}
                >
                  <Eye size={18} className={effectAction === 'grant' ? 'text-[var(--primary-9)] mt-0.5 shrink-0' : 'text-[var(--gray-10)] mt-0.5 shrink-0'} />
                  <div>
                    <div className={cn('text-xs font-normal', effectAction === 'grant' ? 'text-[var(--primary-11)]' : 'text-[var(--gray-12)]')}>
                      Grant Access / Show Documents
                    </div>
                    <div className="text-[11px] text-[var(--gray-10)] mt-0.5">
                      Show matching documents to target users.
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setEffectAction('hide')}
                  className={cn(
                    'flex items-start gap-3 p-3.5 rounded-xl border text-left transition',
                    effectAction === 'hide'
                      ? 'border-[var(--primary-8)] bg-[var(--primary-2)] ring-1 ring-[var(--primary-8)]'
                      : 'border-[var(--border-default)] bg-[var(--surface)] hover:bg-[var(--gray-2)]',
                  )}
                >
                  <EyeOff size={18} className={effectAction === 'hide' ? 'text-[var(--primary-9)] mt-0.5 shrink-0' : 'text-[var(--gray-10)] mt-0.5 shrink-0'} />
                  <div>
                    <div className={cn('text-xs font-normal', effectAction === 'hide' ? 'text-[var(--primary-11)]' : 'text-[var(--gray-12)]')}>
                      Hide Documents
                    </div>
                    <div className="text-[11px] text-[var(--gray-10)] mt-0.5">
                      Hide matching documents from target users.
                    </div>
                  </div>
                </button>
              </div>
            </div>

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
                  className="rounded-[14px] border border-[var(--border-default)] bg-[var(--surface)] p-5 shadow-sm space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-[var(--gray-12)]">
                      <Sliders size={15} className="text-[var(--primary-9)]" />
                      Rule {rIndex + 1}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-[var(--gray-10)] tracking-wider">Match</span>
                        <div className="flex items-center bg-[var(--gray-3)] p-0.5 rounded-lg text-xs font-semibold">
                          <Tooltip content="Match ALL conditions (AND logic) - document must satisfy every condition" position="top">
                            <button
                              type="button"
                              onClick={() => toggleMatchType(rule.id, 'all')}
                              className={cn(
                                'px-3 py-1 rounded-md transition text-xs font-bold',
                                rule.matchType === 'all'
                                  ? 'bg-[var(--primary-9)] text-white shadow-xs'
                                  : 'text-[var(--gray-11)] hover:text-[var(--gray-12)]',
                              )}
                            >
                              All
                            </button>
                          </Tooltip>

                          <Tooltip content="Match ANY condition (OR logic) - document satisfies at least one condition" position="top">
                            <button
                              type="button"
                              onClick={() => toggleMatchType(rule.id, 'any')}
                              className={cn(
                                'px-3 py-1 rounded-md transition text-xs font-bold',
                                rule.matchType === 'any'
                                  ? 'bg-[var(--primary-9)] text-white shadow-xs'
                                  : 'text-[var(--gray-11)] hover:text-[var(--gray-12)]',
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
                          className="text-[var(--gray-9)] hover:text-red-500 transition p-1"
                          title="Delete Rule"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {rule.conditions.map((cond) => (
                      <div key={cond.id} className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <InputSelect
                            options={fieldSelectOptions}
                            placeholder="Select field..."
                            value={cond.field ? { id: cond.field, name: cond.field } : null}
                            onChange={(option) => updateCondition(rule.id, cond.id, 'field', option?.name || '')}
                          />
                        </div>

                        <div className="w-40 shrink-0">
                          <InputSelect
                            options={OPERATOR_OPTIONS}
                            placeholder="Equals"
                            value={OPERATOR_OPTIONS.find((op) => op.id === normalizeOperatorCode(cond.operator)) || OPERATOR_OPTIONS[0]}
                            onChange={(option) => updateCondition(rule.id, cond.id, 'operator', String(option?.id || 'equals'))}
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <InputText
                            placeholder="Value..."
                            value={cond.value}
                            onChange={(val) => updateCondition(rule.id, cond.id, 'value', val)}
                          />
                        </div>

                        {rule.conditions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => deleteCondition(rule.id, cond.id)}
                            className="text-[var(--gray-9)] hover:text-red-500 transition p-1.5 shrink-0"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {duplicateFields.length > 0 && !dismissedWarnings[warnKey] && (
                    <div className="flex items-center justify-between rounded-xl border border-[var(--border-default)] bg-[var(--gray-2)] px-3.5 py-2 text-xs font-medium text-[var(--gray-11)] transition">
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={14} className="shrink-0 text-amber-500" />
                        <span>Multiple conditions set on field ({duplicateFields.join(', ')}). Verify they do not conflict.</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDismissedWarnings((prev) => ({ ...prev, [warnKey]: true }))}
                        className="text-[var(--gray-9)] hover:text-[var(--gray-12)] p-1 transition rounded-md"
                        title="Dismiss"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => addCondition(rule.id)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--primary-9)] hover:text-[var(--primary-10)] transition pt-1"
                  >
                    <Plus size={14} /> Add condition
                  </button>
                </div>
              )
            })}

            <button
              type="button"
              onClick={addRule}
              className="w-full py-3 rounded-[14px] border border-dashed border-[var(--primary-8)] bg-[var(--primary-2)] text-[var(--primary-9)] hover:bg-[var(--primary-3)] text-xs font-semibold transition flex items-center justify-center gap-2"
            >
              <Plus size={15} /> Add Rule
            </button>
          </div>
        </SettingsFormSection>
      )
    }

    if (step === 1) {
      return (
        <SettingsFormSection>
          <div className="space-y-6">
            <div className="rounded-[14px] border border-[var(--border-default)] bg-[var(--surface)] p-5 shadow-sm">
              <div className="text-sm font-semibold text-[var(--gray-12)] mb-1">
                Target Users & Groups
              </div>
              <div className="text-xs text-[var(--gray-10)] mb-4">
                Select users or groups who will be subject to this document security rule ({effectAction === 'hide' ? 'Hide Documents' : 'Grant Access'}).
              </div>

              <InputSelectMultiple
                className='bg-[var(--surface)]'
                label='Select Users & Groups *'
                options={principalOptions}
                placeholder={isLoading ? 'Loading users & groups...' : 'Select users or groups...'}
                value={selectedPrincipals.map((p) => ({ id: p.id, name: p.name }))}
                onChange={(value) => onSelectedPrincipalsChange(value as any[])}
              />
              <div className="mt-3">
                <SettingsSelectedChips
                  items={selectedPrincipals.map((p) => ({ id: p.id, name: p.name }))}
                  onRemove={(id) => onSelectedPrincipalsChange(selectedPrincipals.filter((p) => p.id !== id))}
                />
              </div>
            </div>
          </div>
        </SettingsFormSection>
      )
    }

    if (step === 2) {
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
                    Security Rule Summary
                  </div>
                  <p className="text-xs font-medium text-[var(--gray-13)] leading-relaxed">
                    {effectAction === 'hide'
                      ? `If a document matches configured conditions, it will be hidden from ${targetUsersText}.`
                      : `Users in ${targetUsersText} will be granted access to documents matching configured conditions.`}
                  </p>
                </div>
              </div>

              <div className="p-5 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="text-[11px] font-bold text-[var(--gray-10)] uppercase tracking-wider">
                      Assigned Users & Groups ({selectedPrincipals.length})
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {displayedPrincipals.map((p) => (
                        <span key={p.id} className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-surface px-3 py-1 text-xs font-medium text-[var(--gray-13)]">
                          <Users size={12} className="text-[var(--gray-10)]" />
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

                  <div className="shrink-0 pt-1 sm:pt-0">
                    <div className="text-[11px] font-bold text-[var(--gray-10)] uppercase tracking-wider mb-1.5">
                      Rule Action
                    </div>
                    <span className="inline-flex items-center gap-2 rounded-[10px] border border-[var(--border-default)] bg-surface px-3 py-1.5 text-xs font-medium text-[var(--gray-13)]">
                      {effectAction === 'hide' ? (
                        <>
                          <EyeOff size={14} className="text-[var(--primary-9)]" />
                          Hide Matching Documents
                        </>
                      ) : (
                        <>
                          <Eye size={14} className="text-[var(--primary-9)]" />
                          Allow Access
                        </>
                      )}
                    </span>
                  </div>
                </div>

                <div className="border-t border-[var(--border-default)] pt-4 space-y-3">
                  <div className="text-[11px] font-bold text-[var(--gray-10)] uppercase tracking-wider">
                    Configured Rules ({rules.length})
                  </div>
                  <div className="space-y-2.5">
                    {rules.map((rule, idx) => (
                      <div key={rule.id} className="rounded-xl border border-[var(--border-default)] bg-[var(--gray-2)] p-3 text-xs">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="font-bold text-[var(--gray-12)]">Rule {idx + 1}</span>
                          <span className="text-[10px] font-bold text-[var(--primary-11)] bg-[var(--primary-3)] px-2 py-0.5 rounded uppercase">
                            Match {rule.matchType}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--gray-11)]">
                          {rule.conditions.map((c) => (
                            <span key={c.id} className="inline-flex items-center gap-1">
                              • <strong>{c.field || 'Field'}</strong> {formatOperatorLabel(c.operator)} &quot;{c.value}&quot;
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                disabled={isSaving}
                onClick={clearAllRules}
                className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--red-9)] hover:text-[var(--red-10)] transition"
              >
                <Trash2 size={14} /> Clear All Document Rules
              </button>
            </div>
          </div>
        </SettingsFormSection>
      )
    }

    return null
  }

  return (
    <div className='flex h-full min-h-0 flex-col bg-[var(--surface)]'>
      <SettingsSetupHeader
        moduleTitle='Document Security'
        showBackButton={false}
        showProgress={false}
        stepDescription='Override folder permissions for specific documents that match metadata conditions.'
        stepTitle='Document Security Rule'
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
                  onClick={() => setStep(s.id as Step)}
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
                    void saveRule()
                  }}
                >
                  {isSaving ? 'Saving...' : 'Save Rules'}
                </button>
              ) : (
                <button
                  className='h-10 rounded-[5px] bg-[var(--primary-9)] px-5 text-[15px] font-semibold text-white shadow-[var(--shadow-md)] transition hover:bg-[var(--primary-10)] disabled:cursor-not-allowed disabled:opacity-50'
                  disabled={Boolean(accessError)}
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
