import { useEffect, useMemo, useState } from 'react'
import { Check, Shield, Users, Plus, Trash2, Sliders, AlertTriangle, Eye, EyeOff, X } from 'lucide-react'
import cn from '@/utils/cn'
import { getUsers, type V6UserListItem } from '@/api/v6/user'
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
  matchType: 'ALL' | 'ANY'
  conditions: Condition[]
}

type Principal = {
  id: string
  name: string
}

const WIZARD_STEPS = [
  { id: 0, title: 'Build Rule', icon: Sliders },
  { id: 1, title: 'Users & Groups', icon: Users },
  { id: 2, title: 'Review', icon: Check },
]

const FIELD_OPTIONS = [
  'Amount',
  'Vendor',
  'Country',
  'Document Type',
  'Department',
  'Invoice Date',
]

const OPERATOR_OPTIONS = [
  'Equals',
  'Not Equals',
  'Contains',
  'Starts With',
  'Ends With',
  'Greater Than',
  'Less Than',
  'Between',
  'Is Empty',
  'Is Not Empty',
]

const fieldSelectOptions = FIELD_OPTIONS.map(f => ({ id: f, name: f }))
const operatorSelectOptions = OPERATOR_OPTIONS.map(op => ({ id: op, name: op }))

export default function DocumentSecurityRuleWizard({
  folderName,
  onClose,
}: {
  folderName: string
  onClose: () => void
}) {
  const [step, setStep] = useState<Step>(0)
  const [users, setUsers] = useState<V6UserListItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [dismissedWarnings, setDismissedWarnings] = useState<Record<string, boolean>>({})

  const [rules, setRules] = useState<Rule[]>([
    {
      id: 'rule-1',
      matchType: 'ALL',
      conditions: [{ id: 'c-1', field: '', operator: 'Equals', value: '' }],
    },
  ])

  const [selectedPrincipals, setSelectedPrincipals] = useState<Principal[]>([])
  const [effectAction, setEffectAction] = useState<'HIDE' | 'SHOW'>('HIDE')

  useEffect(() => {
    async function loadData() {
      setIsLoading(true)
      const uRes = await getUsers()
      if (uRes.error) showToast({ message: uRes.error, variant: 'error' })
      else setUsers(uRes.data)
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
    })))
  }

  // Rule actions
  const addRule = () => {
    setRules(prev => [
      ...prev,
      {
        id: `rule-${Date.now()}`,
        matchType: 'ALL',
        conditions: [{ id: `c-${Date.now()}`, field: '', operator: 'Equals', value: '' }],
      },
    ])
  }

  const deleteRule = (ruleId: string) => {
    if (rules.length === 1) {
      showToast({ message: 'At least one rule is required', variant: 'error' })
      return
    }
    setRules(prev => prev.filter(r => r.id !== ruleId))
  }

  const toggleMatchType = (ruleId: string, matchType: 'ALL' | 'ANY') => {
    setRules(prev =>
      prev.map(r => (r.id === ruleId ? { ...r, matchType } : r)),
    )
  }

  const addCondition = (ruleId: string) => {
    setRules(prev =>
      prev.map(r => {
        if (r.id === ruleId) {
          return {
            ...r,
            conditions: [
              ...r.conditions,
              { id: `c-${Date.now()}`, field: '', operator: 'Equals', value: '' },
            ],
          }
        }
        return r
      }),
    )
  }

  const deleteCondition = (ruleId: string, condId: string) => {
    setRules(prev =>
      prev.map(r => {
        if (r.id === ruleId) {
          if (r.conditions.length === 1) return r
          return {
            ...r,
            conditions: r.conditions.filter(c => c.id !== condId),
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
    setRules(prev =>
      prev.map(r => {
        if (r.id === ruleId) {
          return {
            ...r,
            conditions: r.conditions.map(c =>
              c.id === condId ? { ...c, [key]: val } : c,
            ),
          }
        }
        return r
      }),
    )
  }

  const saveRule = () => {
    showToast({ message: 'Document security rule saved successfully', variant: 'success' })
    onClose()
  }

  const renderStepContent = () => {
    if (step === 0) {
      return (
        <SettingsFormSection>
          <div className="space-y-4 max-h-[calc(100vh-340px)] overflow-y-auto ez-scrollbar pr-1">
            {/* First-Class Rule Action Choice */}
            <div className="rounded-[14px] border border-[var(--border-default)] bg-[var(--surface)] p-5 shadow-sm space-y-3">
              <label className="text-xs font-semibold text-[var(--gray-12)]  tracking-wider">
                Select Rule Action
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setEffectAction('SHOW')}
                  className={cn(
                    'flex items-start gap-3 p-3.5 rounded-xl border text-left transition',
                    effectAction === 'SHOW'
                      ? 'border-[var(--primary-8)] bg-[var(--primary-2)] ring-1 ring-[var(--primary-8)]'
                      : 'border-[var(--border-default)] bg-[var(--surface)] hover:bg-[var(--gray-2)]',
                  )}
                >
                  <Eye size={18} className={effectAction === 'SHOW' ? 'text-[var(--primary-9)] mt-0.5 shrink-0' : 'text-[var(--gray-10)] mt-0.5 shrink-0'} />
                  <div>
                    <div className={cn('text-xs font-normal', effectAction === 'SHOW' ? 'text-[var(--primary-11)]' : 'text-[var(--gray-12)]')}>
                      Grant Access / Show Documents
                    </div>
                    <div className="text-[11px] text-[var(--gray-10)] mt-0.5">
                      Show matching documents to target users.
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setEffectAction('HIDE')}
                  className={cn(
                    'flex items-start gap-3 p-3.5 rounded-xl border text-left transition',
                    effectAction === 'HIDE'
                      ? 'border-[var(--primary-8)] bg-[var(--primary-2)] ring-1 ring-[var(--primary-8)]'
                      : 'border-[var(--border-default)] bg-[var(--surface)] hover:bg-[var(--gray-2)]',
                  )}
                >
                  <EyeOff size={18} className={effectAction === 'HIDE' ? 'text-[var(--primary-9)] mt-0.5 shrink-0' : 'text-[var(--gray-10)] mt-0.5 shrink-0'} />
                  <div>
                    <div className={cn('text-xs font-normal', effectAction === 'HIDE' ? 'text-[var(--primary-11)]' : 'text-[var(--gray-12)]')}>
                      Hide Documents
                    </div>
                    <div className="text-[11px] text-[var(--gray-10)] mt-0.5">
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
                    .map(c => c.field)
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
                        <span className="text-[10px] font-bold text-[var(--gray-10)]  tracking-wider">Match</span>
                        <div className="flex items-center bg-[var(--gray-3)] p-0.5 rounded-lg text-xs font-semibold">
                          <Tooltip content="Match ALL conditions (AND logic) - document must satisfy every condition" position="top">
                            <button
                              type="button"
                              onClick={() => toggleMatchType(rule.id, 'ALL')}
                              className={cn(
                                'px-3 py-1 rounded-md transition text-xs font-bold',
                                rule.matchType === 'ALL'
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
                              onClick={() => toggleMatchType(rule.id, 'ANY')}
                              className={cn(
                                'px-3 py-1 rounded-md transition text-xs font-bold',
                                rule.matchType === 'ANY'
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
                    {rule.conditions.map(cond => (
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
                            options={operatorSelectOptions}
                            placeholder="Equals"
                            value={cond.operator ? { id: cond.operator, name: cond.operator } : null}
                            onChange={(option) => updateCondition(rule.id, cond.id, 'operator', option?.name || '')}
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
                        onClick={() => setDismissedWarnings(prev => ({ ...prev, [warnKey]: true }))}
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
                Select users or groups who will be subject to this document security rule ({effectAction === 'HIDE' ? 'Hide Documents' : 'Grant Access'}).
              </div>

              <InputSelectMultiple
                className='bg-[var(--surface)]'
                label='Select Users *'
                options={userOptions}
                placeholder={isLoading ? 'Loading users...' : 'Select users...'}
                value={selectedPrincipals.map(p => ({ id: p.id, name: p.name }))}
                onChange={(value) => onSelectedUsersChange(value as any[])}
              />
              <div className="mt-3">
                <SettingsSelectedChips
                  items={selectedPrincipals.map(p => ({ id: p.id, name: p.name }))}
                  onRemove={(id) => onSelectedUsersChange(selectedPrincipals.filter(p => p.id !== id))}
                />
              </div>
            </div>
          </div>
        </SettingsFormSection>
      )
    }

    if (step === 2) {
      const totalConditionsCount = rules.reduce((sum, r) => sum + r.conditions.length, 0)
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
                <span className="text-[var(--gray-10)] font-normal">Rule Groups:</span> {rules.length}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-[10px] border border-[var(--border-default)] bg-surface px-3 py-1 text-xs font-medium text-[var(--gray-13)]">
                <span className="text-[var(--gray-10)] font-normal">Conditions:</span> {totalConditionsCount}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-[10px] border border-[var(--border-default)] bg-surface px-3 py-1 text-xs font-medium text-[var(--gray-13)]">
                <span className="text-[var(--gray-10)] font-normal">Users:</span> {selectedPrincipals.length}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-[10px] border border-[var(--border-default)] bg-surface px-3 py-1 text-xs font-medium text-[var(--gray-13)]">
                <span className="text-[var(--gray-10)] font-normal">Action:</span> {effectAction === 'HIDE' ? 'Hide Documents' : 'Allow Access'}
              </span>
            </div> */}

            {/* Single Enterprise Policy Summary Card */}
            <div className="rounded-[14px] border border-[var(--border-default)] bg-surface overflow-hidden divide-y divide-[var(--border-default)]">
              {/* Natural Language Policy Statement */}
              <div className="bg-[var(--primary-2)] px-5 py-3.5 flex items-start gap-3 border-b border-[var(--border-default)]">
                <Shield className="text-[var(--primary-9)] mt-0.5 shrink-0" size={16} />
                <div>
                  <div className="text-[10px] font-bold text-[var(--primary-11)] uppercase tracking-wider mb-0.5">
                    Security Summary
                  </div>
                  <p className="text-xs font-medium text-[var(--gray-13)] leading-relaxed">
                    {effectAction === 'HIDE'
                      ? `If a document matches any configured rule group, it will be hidden from ${targetUsersText}.`
                      : `Users in ${targetUsersText} can view and access documents matching any configured rule group.`}
                  </p>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 space-y-5">
                {/* Who & Action Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="text-[11px] font-bold text-[var(--gray-10)] uppercase tracking-wider">
                      Assigned To ({selectedPrincipals.length})
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {displayedPrincipals.map(p => (
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
                        <span className="text-xs italic text-[var(--gray-10)]">No users selected</span>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 pt-1 sm:pt-0">
                    <div className="text-[11px] font-bold text-[var(--gray-10)] uppercase tracking-wider mb-1.5">
                      Security Action
                    </div>
                    <span className="inline-flex items-center gap-2 rounded-[10px] border border-[var(--border-default)] bg-surface px-3 py-1.5 text-xs font-medium text-[var(--gray-13)]">
                      {effectAction === 'HIDE' ? (
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

                {/* Matching Documents Section */}
                {/* <div className="border-t border-[var(--border-default)] pt-4 space-y-3">
                  <div className="text-[11px] font-bold text-[var(--gray-10)]  tracking-wider">
                    ({rules.length} Rule Group • {totalConditionsCount} Condition )
                  </div>

                  <div className="space-y-3">
                    {rules.map((rule, idx) => (
                      <div key={rule.id} className="space-y-2">
                        {idx > 0 && (
                          <div className="flex items-center gap-3 py-1">
                            <div className="h-[1px] flex-1 bg-[var(--border-default)]" />
                            <span className="text-[10px] font-bold text-[var(--primary-9)] bg-[var(--primary-2)] px-2 py-0.5 rounded-md uppercase border border-[var(--primary-4)]">
                              OR
                            </span>
                            <div className="h-[1px] flex-1 bg-[var(--border-default)]" />
                          </div>
                        )}
                        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--gray-2)] p-3.5 text-xs">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-bold text-[var(--gray-12)]">Rule Group {idx + 1}</span>
                            <span className="text-[10px] font-bold text-[var(--primary-11)] bg-[var(--primary-3)] px-2 py-0.5 rounded">
                              Match {rule.matchType}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[var(--gray-11)]">
                            {rule.conditions.map(c => (
                              <span key={c.id} className="inline-flex items-center gap-1.5 font-medium">
                                <span className="text-[var(--gray-9)]">•</span>
                                <strong className="text-[var(--gray-12)]">{c.field || 'Field'}</strong>
                                <span className="text-[var(--gray-10)]">{c.operator}</span>
                                <span className="bg-[var(--surface)] border border-[var(--border-default)] px-2 py-0.5 rounded text-[var(--gray-12)] font-mono text-[11px]">
                                  {c.value || 'Empty'}
                                </span>
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div> */}
              </div>
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
                  onClick={saveRule}
                >
                  Save
                </button>
              ) : (
                <button
                  className='h-10 rounded-[5px] bg-[var(--primary-9)] px-5 text-[15px] font-semibold text-white shadow-[var(--shadow-md)] transition hover:bg-[var(--primary-10)]'
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
