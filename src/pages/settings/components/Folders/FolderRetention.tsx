import { AnimatePresence } from 'motion/react'
import { useMemo, useState } from 'react'
import type { Option } from '@/types/option'
import Button from '@/components/base/button/Button'
import Divider from '@/components/base/Divider'
import Icon from '@/components/base/icon/Icon'
import InputCheckbox from '@/components/base/inputs/InputCheckbox'
import InputNumber from '@/components/base/inputs/InputNumber'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputSwitch from '@/components/base/inputs/InputSwitch'
import InputText from '@/components/base/inputs/InputText'
import Stepper from '@/components/base/Stepper'
import showToast from '@/components/base/toast/showToast'
import AiBrandIcon from '@/components/common/AiBrandIcon'
import { AnimateScale, AnimateSlideUp } from '@/components/common/animations'
import cn from '@/utils/cn'

type ConfirmTarget = {
  files: MockFile[]
  kind: 'activate' | 'single' | 'bulk'
}

type DurationUnit = 'days' | 'months' | 'years'

type FieldType = 'select' | 'text' | 'date'

type MockFile = {
  effectiveDate: string
  id: string
  name: string
  owner: string
  status: string
}

type RetentionCondition = {
  field: string
  op: string
  value: string
}

type RetentionField = {
  key: string
  label: string
  options?: string[]
  type: FieldType
}

type RetentionRule = {
  conditions: RetentionCondition[]
  durationUnit: DurationUnit
  durationValue: number
  notifyOwner: boolean
  requireConfirm: boolean
  triggerField: string
}

type Step = 0 | 1

const STEPPER_ITEMS = [
  {
    description: 'Choose the trigger and conditions',
    icon: 'tabler:clock-hour-4',
    id: 0,
    label: 'Define Rule',
  },
  {
    description: 'Confirm and activate the policy',
    icon: 'tabler:check',
    id: 1,
    label: 'Review & Apply',
  },
]

const RETENTION_FIELDS: RetentionField[] = [
  {
    key: 'status',
    label: 'Status',
    options: ['Draft', 'Active', 'Expired'],
    type: 'select',
  },
  { key: 'effectiveDate', label: 'Effective Date', type: 'date' },
  { key: 'owner', label: 'Owner', type: 'text' },
]

const DATE_FIELDS = ['effectiveDate']

const DURATION_UNIT_OPTIONS: Option[] = [
  { id: 'days', name: 'days' },
  { id: 'months', name: 'months' },
  { id: 'years', name: 'years' },
]

const MOCK_FILE_TEMPLATES: Array<{
  daysAgo: number | null
  owner: string
  status: string
}> = [
  { daysAgo: 640, owner: 'A. Chen', status: 'Expired' },
  { daysAgo: 40, owner: 'L. Novak', status: 'Active' },
  { daysAgo: 210, owner: 'M. Okafor', status: 'Expired' },
  { daysAgo: null, owner: 'R. Singh', status: 'Draft' },
  { daysAgo: 920, owner: 'J. Fontaine', status: 'Expired' },
  { daysAgo: 15, owner: 'A. Chen', status: 'Active' },
  { daysAgo: 400, owner: 'L. Novak', status: 'Expired' },
  { daysAgo: null, owner: 'M. Okafor', status: 'Draft' },
]

const buildMockFiles = (folderName: string): MockFile[] => {
  const label = folderName || 'Folder'
  return MOCK_FILE_TEMPLATES.map((tmpl, idx) => {
    let effectiveDate = ''
    if (tmpl.daysAgo !== null) {
      const d = new Date()
      d.setDate(d.getDate() - tmpl.daysAgo)
      effectiveDate = d.toISOString().slice(0, 10)
    }
    return {
      effectiveDate,
      id: `${label}-${idx}`,
      name: `${label} Record — ${String(idx + 1).padStart(3, '0')}`,
      owner: tmpl.owner,
      status: tmpl.status,
    }
  })
}

const daysSince = (iso: string): number | null => {
  if (!iso) return null
  const diff = Date.now() - new Date(iso).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

const thresholdDays = (rule: RetentionRule): number => {
  if (rule.durationUnit === 'days') return rule.durationValue
  if (rule.durationUnit === 'months') return rule.durationValue * 30
  return rule.durationValue * 365
}

const fieldMatches = (file: MockFile, cond: RetentionCondition): boolean => {
  const val = (file as unknown as Record<string, string>)[cond.field]
  if (cond.op === 'not_equals')
    return String(val || '') !== String(cond.value || '')
  if (cond.op === 'contains')
    return String(val || '')
      .toLowerCase()
      .includes(String(cond.value || '').toLowerCase())
  return String(val || '') === String(cond.value || '')
}

const matchesRule = (file: MockFile, rule: RetentionRule): boolean => {
  const raw = (file as unknown as Record<string, string>)[rule.triggerField]
  if (!raw) return false
  const days = daysSince(raw)
  if (days === null || days < thresholdDays(rule)) return false
  return rule.conditions.every((c) => fieldMatches(file, c))
}

const reasonText = (file: MockFile, rule: RetentionRule): string => {
  const fld = RETENTION_FIELDS.find((f) => f.key === rule.triggerField)
  const days = daysSince(
    (file as unknown as Record<string, string>)[rule.triggerField],
  )
  return `${fld?.label || rule.triggerField} was ${days} days ago — past the ${thresholdDays(rule)}-day threshold`
}

const opsForField = (field?: RetentionField): Array<[string, string]> => {
  if (field?.type === 'select')
    return [
      ['equals', 'equals'],
      ['not_equals', 'is not'],
    ]
  return [
    ['equals', 'equals'],
    ['contains', 'contains'],
  ]
}

const summarySentence = (folderName: string, rule: RetentionRule): string => {
  const trigFld = RETENTION_FIELDS.find((f) => f.key === rule.triggerField)
  const condTexts = rule.conditions.map((c) => {
    const fld = RETENTION_FIELDS.find((f) => f.key === c.field)
    const opText: Record<string, string> = {
      contains: 'contains',
      equals: 'equals',
      not_equals: 'is not',
    }
    return `${fld?.label} ${opText[c.op] || c.op} "${c.value}"`
  })

  let s = `Files in "${folderName}" will move to the retention archive when ${trigFld?.label} is more than ${rule.durationValue} ${rule.durationUnit} in the past`
  if (condTexts.length) s += `, and ${condTexts.join(' and ')}`
  s += '.'
  if (rule.requireConfirm)
    s += ' Each batch needs manual confirmation before moving.'
  if (rule.notifyOwner) s += ' Owners are notified beforehand.'
  return s
}

const DEFAULT_RULE: RetentionRule = {
  conditions: [{ field: 'status', op: 'equals', value: 'Expired' }],
  durationUnit: 'days',
  durationValue: 180,
  notifyOwner: false,
  requireConfirm: true,
  triggerField: 'effectiveDate',
}

export default function FolderRetention({
  folderName,
}: {
  folderName: string
}) {
  const [step, setStep] = useState<Step>(0)
  const [rule, setRule] = useState<RetentionRule>(DEFAULT_RULE)
  const [policyActive, setPolicyActive] = useState(false)
  const [editing, setEditing] = useState(false)
  const [files] = useState<MockFile[]>(() => buildMockFiles(folderName))
  const [archive, setArchive] = useState<MockFile[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget | null>(null)

  const showBuilder = !policyActive || editing

  const matchedFiles = useMemo(
    () => files.filter((f) => matchesRule(f, rule)),
    [files, rule],
  )

  const archivedIds = useMemo(
    () => new Set(archive.map((f) => f.id)),
    [archive],
  )
  const primaryFiles = useMemo(
    () => files.filter((f) => !archivedIds.has(f.id)),
    [files, archivedIds],
  )
  const pendingFiles = useMemo(
    () => primaryFiles.filter((f) => matchesRule(f, rule)),
    [primaryFiles, rule],
  )

  const updateRule = (patch: Partial<RetentionRule>) =>
    setRule((prev) => ({ ...prev, ...patch }))

  const updateCondition = (idx: number, patch: Partial<RetentionCondition>) => {
    setRule((prev) => {
      const conditions = prev.conditions.map((c, i) =>
        i === idx ? { ...c, ...patch } : c,
      )
      if (patch.field) {
        const fld = RETENTION_FIELDS.find((f) => f.key === patch.field)
        conditions[idx] = {
          field: patch.field,
          op: opsForField(fld)[0][0],
          value: fld?.type === 'select' ? fld.options?.[0] || '' : '',
        }
      }
      return { ...prev, conditions }
    })
  }

  const addCondition = () => {
    const fld =
      RETENTION_FIELDS.find((f) => f.key !== rule.triggerField) ||
      RETENTION_FIELDS[0]
    setRule((prev) => ({
      ...prev,
      conditions: [
        ...prev.conditions,
        {
          field: fld.key,
          op: opsForField(fld)[0][0],
          value: fld.type === 'select' ? fld.options?.[0] || '' : '',
        },
      ],
    }))
  }

  const removeCondition = (idx: number) =>
    setRule((prev) => ({
      ...prev,
      conditions: prev.conditions.filter((_, i) => i !== idx),
    }))

  const toggleSelected = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const allPendingSelected =
    pendingFiles.length > 0 && pendingFiles.every((f) => selectedIds.has(f.id))

  const toggleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? new Set(pendingFiles.map((f) => f.id)) : new Set())
  }

  const activatePolicy = () => {
    setPolicyActive(true)
    setEditing(false)
    setConfirmTarget(null)
    showToast({ message: 'Retention policy activated.', variant: 'success' })
  }

  const executeMove = (targets: MockFile[]) => {
    setArchive((prev) => [...targets, ...prev])
    setSelectedIds((prev) => {
      const next = new Set(prev)
      targets.forEach((f) => next.delete(f.id))
      return next
    })
    setConfirmTarget(null)
    showToast({
      message: `${targets.length} file${targets.length === 1 ? '' : 's'} moved to the retention archive.`,
      variant: 'success',
    })
  }

  const handleConfirm = () => {
    if (!confirmTarget) return
    if (confirmTarget.kind === 'activate') {
      activatePolicy()
      return
    }
    executeMove(confirmTarget.files)
  }

  const editRule = () => {
    setEditing(true)
    setStep(0)
  }

  const formattedSteps = STEPPER_ITEMS.map((s) => ({
    ...s,
    clickable: true,
    disabled: false,
  }))

  const renderConfirmPanel = () => {
    if (!confirmTarget) return null
    const title =
      confirmTarget.kind === 'activate'
        ? 'Activate this retention policy?'
        : `Move ${confirmTarget.files.length} file${confirmTarget.files.length === 1 ? '' : 's'} to the archive?`

    return (
      <AnimateSlideUp className='rounded-lg border border-primary-4 bg-primary-2 p-3.5 shadow-2xs'>
        <div className='flex items-start gap-2.5'>
          <Icon
            className='mt-0.5 size-4 shrink-0 text-primary-9'
            name='tabler:alert-circle'
          />
          <div className='min-w-0 flex-1'>
            <div className='text-13 font-semibold text-gray-13'>{title}</div>
            <div className='ez-scrollbar mt-2 max-h-40 space-y-1 overflow-y-auto'>
              {confirmTarget.files.map((f) => (
                <div
                  className='flex items-center justify-between gap-3 rounded-md bg-surface px-2.5 py-1.5 text-xs text-gray-12'
                  key={f.id}
                >
                  <span className='truncate font-medium'>{f.name}</span>
                  <span className='shrink-0 text-gray-10'>
                    {reasonText(f, rule)}
                  </span>
                </div>
              ))}
              {confirmTarget.files.length === 0 && (
                <div className='text-xs text-gray-10 italic'>
                  No files to show.
                </div>
              )}
            </div>
            <div className='mt-3 flex justify-end gap-2'>
              <Button
                color='gray'
                label='Cancel'
                size='xs'
                variant='outline'
                onClick={() => setConfirmTarget(null)}
              />
              <Button
                label='Confirm & Move'
                size='xs'
                onClick={handleConfirm}
              />
            </div>
          </div>
        </div>
      </AnimateSlideUp>
    )
  }

  const renderBuilder = () => (
    <div className='grid min-h-0 flex-1 grid-cols-1 gap-0 xl:grid-cols-[260px_1fr]'>
      <aside className='hidden h-full border-r border-[var(--border-default)] bg-gray-1/30 pt-4 pr-3 pb-4 pl-4 xl:block'>
        <Stepper
          active={step}
          orientation='vertical'
          steps={formattedSteps}
          setActive={(s) => setStep(s as Step)}
        />
      </aside>

      <div className='col-span-1 h-full w-full overflow-y-auto'>
        <div className='mx-auto w-full max-w-3xl px-6 py-5 pb-10 md:px-8 lg:px-10'>
          <AnimatePresence initial={false} mode='wait'>
            {step === 0 && (
              <AnimateSlideUp key='retention-step-0'>
                <div className='flex flex-col gap-4'>
                  <div>
                    <h2 className='text-15 font-semibold text-gray-13'>
                      Define Retention Rule
                    </h2>
                    <p className='mt-0.5 text-xs text-gray-11'>
                      Set the trigger and conditions that decide when a file
                      moves to the retention archive.
                    </p>
                  </div>

                  <Divider />

                  <div className='flex items-start gap-3 rounded-lg border border-primary-4 bg-primary-2 p-3.5'>
                    <AiBrandIcon
                      className='mt-0.5 size-4 shrink-0'
                      variant='outline-purple'
                    />
                    <p className='text-13 leading-relaxed text-gray-12'>
                      Based on <b>{folderName}</b>, here&apos;s a suggested rule
                      using your metadata fields. Adjust the trigger, add
                      conditions, or leave it as recommended.
                    </p>
                  </div>

                  <div className='space-y-3 rounded-lg border border-[var(--border-default)] bg-surface p-4 shadow-2xs'>
                    <div className='text-xs font-semibold tracking-wide text-primary-11 uppercase'>
                      Retention trigger
                    </div>
                    <div className='grid grid-cols-1 gap-3 sm:grid-cols-3'>
                      <InputSelect
                        label='Trigger field'
                        options={DATE_FIELDS.map((k) => {
                          const fld = RETENTION_FIELDS.find((f) => f.key === k)
                          return { id: k, name: fld?.label || k }
                        })}
                        value={{
                          id: rule.triggerField,
                          name:
                            RETENTION_FIELDS.find(
                              (f) => f.key === rule.triggerField,
                            )?.label || rule.triggerField,
                        }}
                        onChange={(opt) =>
                          opt && updateRule({ triggerField: String(opt.id) })
                        }
                      />
                      <InputNumber
                        label='More than'
                        min={1}
                        value={rule.durationValue}
                        onChange={(v) =>
                          updateRule({ durationValue: Number(v) || 1 })
                        }
                      />
                      <InputSelect
                        label='Unit'
                        options={DURATION_UNIT_OPTIONS}
                        value={
                          DURATION_UNIT_OPTIONS.find(
                            (o) => o.id === rule.durationUnit,
                          ) || null
                        }
                        onChange={(opt) =>
                          opt &&
                          updateRule({ durationUnit: opt.id as DurationUnit })
                        }
                      />
                    </div>
                    <div className='rounded-md bg-surface-muted px-3 py-2 text-xs leading-relaxed text-gray-11'>
                      Preview: files where{' '}
                      <b className='text-gray-13'>
                        {
                          RETENTION_FIELDS.find(
                            (f) => f.key === rule.triggerField,
                          )?.label
                        }
                      </b>{' '}
                      is more than{' '}
                      <b className='text-gray-13'>
                        {rule.durationValue} {rule.durationUnit}
                      </b>{' '}
                      in the past will be evaluated for archiving.
                    </div>
                  </div>

                  <div className='space-y-3 rounded-lg border border-[var(--border-default)] bg-surface p-4 shadow-2xs'>
                    <div className='flex items-center justify-between'>
                      <div className='text-xs font-semibold tracking-wide text-primary-11 uppercase'>
                        Additional conditions
                      </div>
                      <span className='text-[11px] text-gray-10'>
                        matched with AND
                      </span>
                    </div>

                    <div className='space-y-2'>
                      {rule.conditions.map((cond, idx) => {
                        const fld = RETENTION_FIELDS.find(
                          (f) => f.key === cond.field,
                        )
                        return (
                          <div
                            className='flex flex-wrap items-center gap-2'
                            key={idx}
                          >
                            <span className='w-12 shrink-0 text-[11px] font-bold tracking-wide text-gray-9 uppercase'>
                              {idx === 0 ? 'Where' : 'And'}
                            </span>
                            <InputSelect
                              className='w-44'
                              options={RETENTION_FIELDS.map((f) => ({
                                id: f.key,
                                name: f.label,
                              }))}
                              value={
                                fld ? { id: fld.key, name: fld.label } : null
                              }
                              onChange={(opt) =>
                                opt &&
                                updateCondition(idx, { field: String(opt.id) })
                              }
                            />
                            <InputSelect
                              className='w-36'
                              options={opsForField(fld).map(([v, l]) => ({
                                id: v,
                                name: l,
                              }))}
                              value={
                                opsForField(fld)
                                  .map(([v, l]) => ({ id: v, name: l }))
                                  .find((o) => o.id === cond.op) || null
                              }
                              onChange={(opt) =>
                                opt &&
                                updateCondition(idx, { op: String(opt.id) })
                              }
                            />
                            {fld?.type === 'select' ? (
                              <InputSelect
                                className='w-36'
                                options={(fld.options || []).map((o) => ({
                                  id: o,
                                  name: o,
                                }))}
                                value={
                                  cond.value
                                    ? { id: cond.value, name: cond.value }
                                    : null
                                }
                                onChange={(opt) =>
                                  opt &&
                                  updateCondition(idx, {
                                    value: String(opt.id),
                                  })
                                }
                              />
                            ) : (
                              <InputText
                                className='w-36'
                                value={cond.value}
                                onChange={(v) =>
                                  updateCondition(idx, { value: v })
                                }
                              />
                            )}
                            <button
                              aria-label='Remove condition'
                              className='flex size-7 shrink-0 items-center justify-center rounded-md border border-[var(--border-default)] text-gray-9 transition hover:border-red-6 hover:text-red-9'
                              type='button'
                              onClick={() => removeCondition(idx)}
                            >
                              <Icon className='size-3.5' name='lucide:x' />
                            </button>
                          </div>
                        )
                      })}
                    </div>

                    <button
                      className='rounded-md border border-dashed border-primary-6 px-3 py-1.5 text-xs font-semibold text-primary-9 transition hover:bg-primary-2'
                      type='button'
                      onClick={addCondition}
                    >
                      + Add condition
                    </button>
                  </div>

                  <div className='flex items-center justify-between rounded-lg border border-[var(--border-default)] bg-surface-muted px-4 py-3'>
                    <div>
                      <div className='text-13 font-semibold text-gray-13'>
                        Require manual confirmation before moving
                      </div>
                      <div className='text-11.5 mt-0.5 text-gray-10'>
                        Lists every matched file for confirmation before the
                        move runs.
                      </div>
                    </div>
                    <InputSwitch
                      checked={rule.requireConfirm}
                      onChange={(v) =>
                        updateRule({ requireConfirm: Boolean(v) })
                      }
                    />
                  </div>

                  <div className='flex items-center justify-between rounded-lg border border-[var(--border-default)] bg-surface-muted px-4 py-3'>
                    <div>
                      <div className='text-13 font-semibold text-gray-13'>
                        Notify document owner before moving
                      </div>
                      <div className='text-11.5 mt-0.5 text-gray-10'>
                        Sends a heads-up to the owner listed on each file&apos;s
                        metadata.
                      </div>
                    </div>
                    <InputSwitch
                      checked={rule.notifyOwner}
                      onChange={(v) => updateRule({ notifyOwner: Boolean(v) })}
                    />
                  </div>
                </div>
              </AnimateSlideUp>
            )}

            {step === 1 && (
              <AnimateScale key='retention-step-1'>
                <div className='flex flex-col gap-4'>
                  <div>
                    <h2 className='text-15 font-semibold text-gray-13'>
                      Review & Apply
                    </h2>
                    <p className='mt-0.5 text-xs text-gray-11'>
                      Confirm the rule in plain language, then activate it for
                      &quot;{folderName}&quot;.
                    </p>
                  </div>

                  <Divider />

                  <div className='flex items-start gap-3 rounded-lg border border-primary-4 bg-primary-2 p-3.5'>
                    <AiBrandIcon
                      className='mt-0.5 size-4 shrink-0'
                      variant='outline-purple'
                    />
                    <p className='text-13 leading-relaxed text-gray-12'>
                      {summarySentence(folderName, rule)}
                    </p>
                  </div>

                  <div className='rounded-lg border border-[var(--border-default)] bg-surface p-3.5 shadow-2xs'>
                    <div className='text-13 font-semibold text-gray-13'>
                      Matched today: {matchedFiles.length} of {files.length}{' '}
                      files
                    </div>
                    <p className='mt-0.5 text-xs text-gray-10'>
                      These files currently satisfy the rule and would move to
                      the retention archive once applied.
                    </p>

                    {matchedFiles.length > 0 ? (
                      <div className='mt-3 divide-y divide-[var(--border-default)] rounded-md border border-[var(--border-default)]'>
                        {matchedFiles.slice(0, 6).map((f) => (
                          <div
                            className='flex items-center justify-between gap-3 px-3 py-2 text-xs'
                            key={f.id}
                          >
                            <span className='truncate font-medium text-gray-13'>
                              {f.name}
                            </span>
                            <span className='shrink-0 text-gray-10'>
                              {reasonText(f, rule)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className='mt-3 rounded-md border border-dashed border-[var(--border-default)] py-6 text-center text-xs text-gray-10'>
                        No files currently match this rule.
                      </div>
                    )}
                    {matchedFiles.length > 6 && (
                      <div className='mt-2 text-[11px] text-gray-10'>
                        + {matchedFiles.length - 6} more
                      </div>
                    )}
                  </div>

                  {confirmTarget?.kind === 'activate' && renderConfirmPanel()}
                </div>
              </AnimateScale>
            )}
          </AnimatePresence>

          <div className='mt-6 flex items-center justify-between border-t border-[var(--border-default)] pt-4'>
            {step > 0 ? (
              <Button
                color='gray'
                icon='lucide:arrow-left'
                label='Back'
                size='sm'
                variant='outline'
                onClick={() => setStep((step - 1) as Step)}
              />
            ) : policyActive ? (
              <Button
                color='gray'
                icon='lucide:arrow-left'
                label='Back to Console'
                size='sm'
                variant='outline'
                onClick={() => setEditing(false)}
              />
            ) : (
              <div />
            )}

            {step === 1 ? (
              <Button
                disabled={Boolean(confirmTarget)}
                label='Activate Policy'
                size='sm'
                suffixIcon='tabler:arrow-right'
                onClick={() =>
                  setConfirmTarget({ files: matchedFiles, kind: 'activate' })
                }
              />
            ) : (
              <Button
                label='Review Rule'
                size='sm'
                suffixIcon='tabler:arrow-right'
                onClick={() => setStep(1)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )

  const renderConsole = () => {
    const trigFld = RETENTION_FIELDS.find((f) => f.key === rule.triggerField)
    const th = thresholdDays(rule)
    const expiringSoon = primaryFiles.filter((f) => {
      const raw = (f as unknown as Record<string, string>)[rule.triggerField]
      if (!raw) return false
      const days = daysSince(raw)
      return days !== null && days < th && days > th - 30
    }).length

    return (
      <div className='flex flex-col gap-4 p-4 md:p-6'>
        <div className='flex items-center justify-between gap-3'>
          <div>
            <h2 className='text-15 font-semibold text-gray-13'>
              Retention Console
            </h2>
            <p className='mt-0.5 text-xs text-gray-11'>
              AI-managed lifecycle for folder &quot;{folderName}&quot;
            </p>
          </div>
          <Button
            color='gray'
            icon='tabler:pencil'
            label='Edit Rule'
            size='sm'
            variant='outline'
            onClick={editRule}
          />
        </div>

        <div className='grid grid-cols-2 gap-2.5 md:grid-cols-4'>
          <div className='rounded-lg border border-[var(--border-default)] bg-surface px-3 py-2.5 shadow-2xs'>
            <div className='text-[11px] font-medium text-gray-11'>
              Total Files
            </div>
            <div className='mt-0.5 text-18 font-bold text-gray-13'>
              {files.length}
            </div>
          </div>
          <div className='rounded-lg border border-[var(--border-default)] bg-surface px-3 py-2.5 shadow-2xs'>
            <div className='text-[11px] font-medium text-gray-11'>
              Expiring Soon
            </div>
            <div className='mt-0.5 text-18 font-bold text-orange-11'>
              {expiringSoon}
            </div>
          </div>
          <div className='rounded-lg border border-[var(--border-default)] bg-surface px-3 py-2.5 shadow-2xs'>
            <div className='text-[11px] font-medium text-gray-11'>
              Pending Move
            </div>
            <div className='mt-0.5 text-18 font-bold text-red-11'>
              {pendingFiles.length}
            </div>
          </div>
          <div className='rounded-lg border border-[var(--border-default)] bg-surface px-3 py-2.5 shadow-2xs'>
            <div className='text-[11px] font-medium text-gray-11'>Archived</div>
            <div className='mt-0.5 text-18 font-bold text-primary-11'>
              {archive.length}
            </div>
          </div>
        </div>

        <div className='rounded-lg border border-[var(--border-default)] bg-surface p-4 shadow-2xs'>
          <div className='text-[11px] font-semibold tracking-wide text-primary-11 uppercase'>
            Active policy
          </div>
          <p className='mt-1.5 text-13 leading-relaxed text-gray-12'>
            {summarySentence(folderName, rule)}
          </p>
          <div className='mt-2.5 flex flex-wrap gap-1.5'>
            <span className='rounded-md bg-surface-muted px-2 py-1 font-mono text-[11px] font-semibold text-primary-11'>
              {trigFld?.label} &gt; {rule.durationValue} {rule.durationUnit}
            </span>
            {rule.conditions.map((c, idx) => {
              const fld = RETENTION_FIELDS.find((f) => f.key === c.field)
              return (
                <span
                  className='rounded-md bg-surface-muted px-2 py-1 font-mono text-[11px] font-semibold text-primary-11'
                  key={idx}
                >
                  {fld?.label} {c.op} {c.value}
                </span>
              )
            })}
          </div>
        </div>

        <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
          <div className='overflow-hidden rounded-lg border border-[var(--border-default)] bg-surface shadow-2xs'>
            <div className='border-b border-[var(--border-default)] bg-surface-muted px-4 py-2.5'>
              <div className='text-[11px] font-semibold tracking-wide text-gray-11 uppercase'>
                Primary
              </div>
              <div className='mt-0.5 text-xs font-medium text-gray-13'>
                {primaryFiles.length} files
              </div>
            </div>
            <div className='ez-scrollbar max-h-72 divide-y divide-[var(--border-default)] overflow-y-auto'>
              {primaryFiles.length === 0 && (
                <div className='p-4 text-center text-xs text-gray-10'>
                  No files remaining
                </div>
              )}
              {primaryFiles.map((f) => {
                const isPending = pendingFiles.some((p) => p.id === f.id)
                return (
                  <div
                    className='flex items-center justify-between gap-2 px-4 py-2.5'
                    key={f.id}
                  >
                    <div className='min-w-0'>
                      <div className='truncate text-xs font-semibold text-gray-13'>
                        {f.name}
                      </div>
                      <div className='mt-0.5 text-[11px] text-gray-10'>
                        {f.owner}
                      </div>
                    </div>
                    <span
                      className={cn(
                        'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                        isPending
                          ? 'bg-red-2 text-red-11'
                          : 'bg-surface-muted text-gray-11',
                      )}
                    >
                      {isPending ? 'Pending Move' : f.status}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className='overflow-hidden rounded-lg border border-[var(--border-default)] bg-surface shadow-2xs'>
            <div className='border-b border-[var(--border-default)] bg-surface-muted px-4 py-2.5'>
              <div className='text-[11px] font-semibold tracking-wide text-gray-11 uppercase'>
                Archived
              </div>
              <div className='mt-0.5 text-xs font-medium text-gray-13'>
                {archive.length} files
              </div>
            </div>
            <div className='ez-scrollbar max-h-72 divide-y divide-[var(--border-default)] overflow-y-auto'>
              {archive.length === 0 && (
                <div className='p-4 text-center text-xs text-gray-10'>
                  No files archived yet
                </div>
              )}
              {archive.map((f) => (
                <div
                  className='flex items-center justify-between gap-2 px-4 py-2.5'
                  key={f.id}
                >
                  <div className='min-w-0'>
                    <div className='truncate text-xs font-semibold text-gray-13'>
                      {f.name}
                    </div>
                    <div className='mt-0.5 text-[11px] text-gray-10'>
                      {f.owner}
                    </div>
                  </div>
                  <span className='inline-flex shrink-0 items-center gap-1 rounded-full bg-primary-2 px-2 py-0.5 text-[10px] font-semibold text-primary-11'>
                    <Icon className='size-3' name='tabler:archive' />
                    Archived
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className='overflow-hidden rounded-lg border border-[var(--border-default)] bg-surface shadow-2xs'>
          <div className='flex items-center justify-between gap-3 border-b border-[var(--border-default)] px-4 py-2.5'>
            <div>
              <div className='text-13 font-semibold text-gray-13'>
                Pending retention actions
              </div>
              <p className='mt-0.5 text-xs text-gray-10'>
                Files that currently match your rule and are awaiting
                confirmation
              </p>
            </div>
            {pendingFiles.length > 0 && (
              <label className='flex cursor-pointer items-center gap-2 text-xs text-gray-11'>
                <InputCheckbox
                  checked={allPendingSelected}
                  onChange={(v) => toggleSelectAll(Boolean(v))}
                />
                Select all
              </label>
            )}
          </div>

          {confirmTarget && confirmTarget.kind !== 'activate' && (
            <div className='p-4'>{renderConfirmPanel()}</div>
          )}

          <div className='p-2'>
            {pendingFiles.length === 0 && !confirmTarget && (
              <div className='p-6 text-center text-xs text-gray-10'>
                No files currently match the retention rule — nothing pending.
              </div>
            )}
            {pendingFiles.map((f) => (
              <div
                className='flex items-center gap-3 border-b border-dashed border-[var(--border-default)] px-2 py-2.5 last:border-b-0'
                key={f.id}
              >
                <InputCheckbox
                  checked={selectedIds.has(f.id)}
                  onChange={(v) => toggleSelected(f.id, Boolean(v))}
                />
                <div className='min-w-0 flex-1'>
                  <div className='truncate text-13 font-semibold text-gray-13'>
                    {f.name}
                  </div>
                  <div className='text-11.5 mt-0.5 truncate text-gray-10'>
                    {reasonText(f, rule)}
                  </div>
                </div>
                <Button
                  color='gray'
                  label='Move Now'
                  size='xs'
                  variant='outline'
                  onClick={() =>
                    setConfirmTarget({ files: [f], kind: 'single' })
                  }
                />
              </div>
            ))}
          </div>

          <div className='flex items-center justify-between border-t border-[var(--border-default)] bg-surface-muted px-4 py-2.5'>
            <div className='text-xs text-gray-10'>
              <b className='text-gray-13'>{selectedIds.size}</b> selected
            </div>
            <Button
              color='red'
              disabled={selectedIds.size === 0}
              label='Apply Retention to Selected'
              size='sm'
              onClick={() =>
                setConfirmTarget({
                  files: pendingFiles.filter((f) => selectedIds.has(f.id)),
                  kind: 'bulk',
                })
              }
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-gray-1'>
      {showBuilder ? (
        renderBuilder()
      ) : (
        <div className='min-h-0 flex-1 overflow-y-auto'>{renderConsole()}</div>
      )}
    </div>
  )
}
