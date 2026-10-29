import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import type { Option } from '@/types/option'
import { getMasterFormsQueryOptions } from '@/api/form/queries'
import { getUsers } from '@/api/v6/user'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
import InputCheckbox from '@/components/base/inputs/InputCheckbox'
import InputNumber from '@/components/base/inputs/InputNumber'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputSelectMultiple from '@/components/base/inputs/InputSelectMultiple'
import InputSwitch from '@/components/base/inputs/InputSwitch'
import InputText from '@/components/base/inputs/InputText'
import cn from '@/utils/cn'
import {
  createSlaRule,
  createSlaSettings,
  setEscalationType,
  SLA_DURATION_UNITS,
  type SlaEscalationType,
  type SlaMode,
  type SlaRule,
  type SlaScope,
  type SlaSettings,
  validateSlaSettings,
} from '../../../utils/slaSettings'

interface SLAConfigurationProps {
  scope: SlaScope
  value: null | SlaSettings
  /** Show validation messages (set after a failed save attempt). */
  showErrors?: boolean
  /** Stages a block rule can escalate to (block scope only). */
  workflowStages?: Option[]
  onChange: (value: null | SlaSettings) => void
}

const UNIT_SHORT: Record<string, string> = {
  days: 'd',
  hours: 'h',
  minutes: 'min',
}

const toUserOption = (u: any): Option => ({
  id: String(u.id || u.value),
  name: String(
    u.value ||
      u.name ||
      (u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : null) ||
      u.loginName ||
      u.displayName ||
      u.email ||
      'Unknown User',
  ),
})

export default function SLAConfiguration({
  scope,
  showErrors = false,
  value,
  workflowStages = [],
  onChange,
}: SLAConfigurationProps) {
  const isBlock = scope === 'block'
  const [expandedRuleId, setExpandedRuleId] = useState<null | string>(null)

  const { data: userResponse } = useQuery({
    queryFn: getUsers,
    queryKey: ['v6-users'],
  })
  const userOptions = useMemo(() => {
    const users = userResponse?.data as any[] | undefined
    return Array.isArray(users) ? users.map(toUserOption) : []
  }, [userResponse])

  const { data: masterForms = [], isLoading: isMasterLoading } = useQuery({
    ...getMasterFormsQueryOptions(),
    enabled: value?.mode === 'advanced',
  })
  const masterOptions: Option[] = useMemo(
    () =>
      masterForms.map((f: any) => ({ id: String(f.id), name: String(f.name) })),
    [masterForms],
  )

  const stageIds = useMemo(
    () => workflowStages.map((s) => String(s.id)),
    [workflowStages],
  )
  const errors = useMemo(
    () =>
      showErrors
        ? validateSlaSettings(value, scope, isBlock ? stageIds : undefined)
        : {},
    [showErrors, value, scope, isBlock, stageIds],
  )

  const userName = (id: null | string) =>
    userOptions.find((o) => String(o.id) === id)?.name ?? id ?? ''
  const stageName = (id: null | string) =>
    workflowStages.find((o) => String(o.id) === id)?.name ?? id ?? ''

  if (!value) {
    return (
      <div className='flex items-center justify-between gap-3 rounded-xl bg-surface p-4 shadow-sm'>
        <div className='flex items-center gap-2.5'>
          <Icon
            className='h-4 w-4 stroke-[2] text-gray-11'
            name='lucide:timer'
          />
          <div className='flex flex-col space-y-1'>
            <span className='text-13 font-medium text-gray-12'>
              {isBlock ? 'Response SLA' : 'Resolution SLA'}
            </span>
            <span className='text-11 leading-tight text-gray-9'>
              {isBlock
                ? 'Track how long this stage takes to respond'
                : 'Track how long the whole request takes to resolve'}
            </span>
          </div>
        </div>
        <InputSwitch
          checked={false}
          onChange={(checked) => checked && onChange(createSlaSettings())}
        />
      </div>
    )
  }

  const update = (patch: Partial<SlaSettings>) =>
    onChange({ ...value, ...patch })
  const updateRule = (id: string, patch: Partial<SlaRule>) =>
    update({
      rules: value.rules.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    })

  const addRule = () => {
    const rule = createSlaRule(scope)
    update({ rules: [...value.rules, rule] })
    setExpandedRuleId(rule.id)
  }

  const deleteRule = (id: string) => {
    update({ rules: value.rules.filter((r) => r.id !== id) })
    if (expandedRuleId === id) setExpandedRuleId(null)
  }

  const setMode = (mode: SlaMode) => {
    if (mode === value.mode) return
    // Keep the other mode's values in local state while editing; the
    // inactive mode is dropped when the workflow is exported.
    update({ mode })
  }

  return (
    <div className='animate-in fade-in flex flex-col gap-3 duration-200'>
      <div className='flex items-center justify-between gap-3 rounded-xl bg-surface p-4 shadow-sm'>
        <div className='flex items-center gap-2.5'>
          <Icon
            className='h-4 w-4 stroke-[2] text-primary-9'
            name='lucide:timer'
          />
          <div className='flex flex-col space-y-1'>
            <span className='text-13 font-medium text-gray-12'>
              {isBlock ? 'Response SLA' : 'Resolution SLA'}
            </span>
            <span className='text-11 leading-tight text-gray-9'>
              Turn off to remove the SLA
            </span>
          </div>
        </div>
        <InputSwitch
          checked
          onChange={(checked) => !checked && onChange(null)}
        />
      </div>

      <Segmented<SlaMode>
        value={value.mode}
        options={[
          { id: 'standard', label: 'Standard' },
          { id: 'advanced', label: 'Advanced' },
        ]}
        onChange={setMode}
      />

      {value.mode === 'standard' ? (
        <div className='flex flex-col gap-2'>
          {value.rules.length === 0 && (
            <div className='rounded-xl border border-dashed border-gray-4 bg-surface px-4 py-5 text-center text-12 text-gray-9'>
              No SLA rules yet. Add a rule to set a{' '}
              {isBlock ? 'response' : 'resolution'} target.
            </div>
          )}

          {value.rules.map((rule, index) => {
            const ruleErrors = errors[rule.id] ?? {}
            const hasError = Object.keys(ruleErrors).length > 0
            const isExpanded = expandedRuleId === rule.id || hasError
            const esc = rule.escalateTo
            const summary = [
              rule.duration
                ? `${rule.duration} ${UNIT_SHORT[rule.durationUnit]}`
                : 'No duration',
              rule.notifyUserIds.length
                ? `Notify ${rule.notifyUserIds.length}`
                : null,
              rule.initiator ? 'Initiator' : null,
              [rule.channels.email && 'Email', rule.channels.sms && 'SMS']
                .filter(Boolean)
                .join(' + ') || null,
              isBlock && esc?.type === 'user' && esc.userId
                ? `Escalate → ${userName(esc.userId)}`
                : null,
              isBlock && esc?.type === 'stage' && esc.stageId
                ? `Escalate → ${stageName(esc.stageId)}`
                : null,
            ]
              .filter(Boolean)
              .join(' · ')

            return (
              <div
                key={rule.id}
                className={cn(
                  'animate-in fade-in slide-in-from-top-1 rounded-xl border bg-surface shadow-sm transition-colors duration-200',
                  hasError
                    ? 'border-red-7'
                    : 'border-gray-2 hover:border-gray-4',
                )}
              >
                <div
                  className='flex cursor-pointer items-center gap-2 px-3 py-2.5 select-none active:scale-[0.995]'
                  onClick={() => setExpandedRuleId(isExpanded ? null : rule.id)}
                >
                  <span className='flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary-2 text-11 font-semibold text-primary-9'>
                    {index + 1}
                  </span>
                  <div className='flex min-w-0 flex-1 flex-col'>
                    <span className='truncate text-13 font-medium text-gray-12'>
                      {rule.name.trim() || 'Untitled rule'}
                    </span>
                    <span className='truncate text-11 text-gray-9'>
                      {summary}
                    </span>
                  </div>
                  <IconButton
                    ariaLabel={isExpanded ? 'Collapse rule' : 'Edit rule'}
                    color='gray'
                    icon={isExpanded ? 'lucide:chevron-up' : 'lucide:pencil'}
                    size='xs'
                    tooltip={isExpanded ? 'Collapse' : 'Edit'}
                    type='button'
                    variant='ghost'
                    onClick={(e) => {
                      e.stopPropagation()
                      setExpandedRuleId(isExpanded ? null : rule.id)
                    }}
                  />
                  <IconButton
                    ariaLabel='Delete rule'
                    color='red'
                    icon='lucide:trash-2'
                    size='xs'
                    tooltip='Delete'
                    type='button'
                    variant='ghost'
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteRule(rule.id)
                    }}
                  />
                </div>

                {isExpanded && (
                  <div className='animate-in fade-in slide-in-from-top-1 flex flex-col gap-3 border-t border-gray-2 px-3 pt-3 pb-3.5 duration-200'>
                    <InputText
                      error={ruleErrors.name}
                      label='SLA name'
                      placeholder='e.g. First escalation'
                      value={rule.name}
                      required
                      onChange={(name) => updateRule(rule.id, { name })}
                    />

                    <div className='grid grid-cols-2 gap-2'>
                      <InputNumber
                        allowDecimal={false}
                        error={ruleErrors.duration}
                        min={1}
                        placeholder='30'
                        value={rule.duration ?? ''}
                        required
                        label={
                          isBlock ? 'Response within' : 'Resolution within'
                        }
                        onChange={(v) =>
                          updateRule(rule.id, {
                            duration: v === '' || v === null ? null : Number(v),
                          })
                        }
                      />
                      <InputSelect
                        error={ruleErrors.durationUnit}
                        label='Unit'
                        options={SLA_DURATION_UNITS}
                        value={
                          SLA_DURATION_UNITS.find(
                            (u) => u.id === rule.durationUnit,
                          ) ?? null
                        }
                        onChange={(opt) =>
                          opt &&
                          updateRule(rule.id, {
                            durationUnit: opt.id as SlaRule['durationUnit'],
                          })
                        }
                      />
                    </div>

                    <InputSelectMultiple
                      label={isBlock ? 'Notify to' : 'Notify users'}
                      options={userOptions}
                      placeholder='Select users...'
                      clearable
                      searchable
                      value={userOptions.filter((o) =>
                        rule.notifyUserIds.includes(String(o.id)),
                      )}
                      onChange={(opts) =>
                        updateRule(rule.id, {
                          notifyUserIds: opts.map((o) => String(o.id)),
                        })
                      }
                    />

                    {isBlock && (
                      <div className='flex flex-col gap-2'>
                        <span className='text-13 font-medium text-gray-11'>
                          Escalate to
                        </span>
                        <Segmented<'none' | SlaEscalationType>
                          value={esc?.type ?? 'none'}
                          options={[
                            { id: 'none', label: 'None' },
                            { id: 'user', label: 'User' },
                            { id: 'stage', label: 'Stage' },
                          ]}
                          onChange={(type) =>
                            updateRule(rule.id, {
                              escalateTo: setEscalationType(
                                esc,
                                type === 'none' ? null : type,
                              ),
                            })
                          }
                        />
                        {esc?.type === 'user' && (
                          <InputSelect
                            error={ruleErrors.escalateTo}
                            options={userOptions}
                            placeholder='Select user...'
                            clearable
                            searchable
                            value={
                              userOptions.find(
                                (o) => String(o.id) === esc.userId,
                              ) ?? null
                            }
                            onChange={(opt) =>
                              updateRule(rule.id, {
                                escalateTo: {
                                  stageId: null,
                                  type: 'user',
                                  userId: opt ? String(opt.id) : null,
                                },
                              })
                            }
                          />
                        )}
                        {esc?.type === 'stage' && (
                          <InputSelect
                            error={ruleErrors.escalateTo}
                            options={workflowStages}
                            clearable
                            searchable
                            placeholder={
                              workflowStages.length
                                ? 'Select stage...'
                                : 'No other stages in this workflow'
                            }
                            value={
                              workflowStages.find(
                                (o) => String(o.id) === esc.stageId,
                              ) ?? null
                            }
                            onChange={(opt) =>
                              updateRule(rule.id, {
                                escalateTo: {
                                  stageId: opt ? String(opt.id) : null,
                                  type: 'stage',
                                  userId: null,
                                },
                              })
                            }
                          />
                        )}
                      </div>
                    )}

                    <InputCheckbox
                      checked={rule.initiator}
                      description='Also notify the user who started the request'
                      label='Initiator'
                      onChange={(initiator) =>
                        updateRule(rule.id, { initiator })
                      }
                    />

                    <div className='flex flex-col gap-2 rounded-lg bg-surface-muted p-3'>
                      <span className='text-11 font-semibold tracking-wide text-gray-9 uppercase'>
                        When this rule fires, send
                      </span>
                      <div className='flex flex-wrap gap-x-6 gap-y-2'>
                        <InputCheckbox
                          checked={rule.channels.email}
                          label='Email'
                          onChange={(email) =>
                            updateRule(rule.id, {
                              channels: { ...rule.channels, email },
                            })
                          }
                        />
                        <InputCheckbox
                          checked={rule.channels.sms}
                          label='SMS'
                          onChange={(sms) =>
                            updateRule(rule.id, {
                              channels: { ...rule.channels, sms },
                            })
                          }
                        />
                      </div>
                      {ruleErrors.action && (
                        <span className='text-12 text-red-11'>
                          {ruleErrors.action}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          <button
            className='flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-gray-4 bg-surface py-2.5 text-13 font-medium text-primary-9 transition-all duration-200 hover:border-primary-7 hover:bg-primary-1 active:scale-[0.99]'
            type='button'
            onClick={addRule}
          >
            <Icon className='h-4 w-4' name='lucide:plus' />
            Add SLA rule
          </button>
        </div>
      ) : (
        <div className='animate-in fade-in rounded-xl bg-surface p-4 shadow-sm duration-200'>
          <InputSelect
            description='Durations and escalations come from the selected master'
            error={errors._config?.slaMasterId}
            label='SLA Master'
            loading={isMasterLoading}
            options={masterOptions}
            placeholder='Select SLA master...'
            clearable
            required
            searchable
            value={
              masterOptions.find((o) => o.id === value.slaMasterId) ??
              (value.slaMasterId
                ? { id: value.slaMasterId, name: `Master ${value.slaMasterId}` }
                : null)
            }
            onChange={(opt) =>
              update({ slaMasterId: opt ? String(opt.id) : null })
            }
          />
        </div>
      )}

      {/* Standard rules carry their own channels; these apply to Advanced. */}
      {value.mode === 'advanced' && (
        <div className='animate-in fade-in flex flex-col gap-3 rounded-xl bg-surface p-4 shadow-sm duration-200'>
          <span className='text-11 font-semibold tracking-wide text-gray-9 uppercase'>
            When the SLA is crossed
          </span>
          <InputSwitch
            checked={value.notifications.email}
            description='Send an email notification'
            label='Email notification'
            onChange={(email) =>
              update({ notifications: { ...value.notifications, email } })
            }
          />
          <InputSwitch
            checked={value.notifications.sms}
            description='Send an SMS notification'
            label='SMS notification'
            onChange={(sms) =>
              update({ notifications: { ...value.notifications, sms } })
            }
          />
        </div>
      )}
    </div>
  )
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div className='flex rounded-lg border border-gray-3 bg-surface-muted p-1'>
      {options.map((opt) => (
        <button
          key={opt.id}
          type='button'
          className={cn(
            'flex-1 rounded-md py-1.5 text-xs font-semibold transition-all duration-200 active:scale-[0.98]',
            value === opt.id
              ? 'bg-primary-9 text-white shadow-sm'
              : 'text-gray-9 hover:bg-surface/50 hover:text-gray-12',
          )}
          onClick={() => onChange(opt.id)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
