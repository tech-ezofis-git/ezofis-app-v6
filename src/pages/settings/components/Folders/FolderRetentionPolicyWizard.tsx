import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import Accordion from '@/components/base/accordion/Accordion'
import AccordionItem from '@/components/base/accordion/AccordionItem'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import Divider from '@/components/base/Divider'
import Icon from '@/components/base/icon/Icon'
import InputNumber from '@/components/base/inputs/InputNumber'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputSwitch from '@/components/base/inputs/InputSwitch'
import InputText from '@/components/base/inputs/InputText'
import InputTextarea from '@/components/base/inputs/InputTextarea'
import Stepper from '@/components/base/Stepper'
import Tooltip from '@/components/base/Tooltip'
import showToast from '@/components/base/toast/showToast'
import AiBrandIcon from '@/components/common/AiBrandIcon'
import {
  AnimateFadeIn,
  AnimateScale,
  AnimateSlideUp,
} from '@/components/common/animations'
import cn from '@/utils/cn'
import {
  ACTION_OPTIONS,
  actionMeta,
  buildDefaultPolicy,
  buildMockDocuments,
  buildSummarySentence,
  DATE_FIELD_KEYS,
  DURATION_UNIT_OPTIONS,
  emptyCondition,
  fieldLabel,
  matchesPolicy,
  OPERATOR_OPTIONS,
  reasonText,
  RETENTION_FIELDS,
  suggestTriggerForAction,
  type RetentionAction,
  type RetentionCondition,
  type RetentionDurationUnit,
  type RetentionMatchType,
  type RetentionPolicy,
} from './retentionMockData'

type Step = 0 | 1 | 2

const STEPPER_ITEMS = [
  {
    description: 'Name and describe this policy',
    icon: 'tabler:file-text',
    id: 0,
    label: 'Policy Details',
  },
  {
    description: 'Choose the trigger, action and conditions',
    icon: 'tabler:clock-hour-4',
    id: 1,
    label: 'Define Rule',
  },
  {
    description: 'Confirm and activate the policy',
    icon: 'tabler:check',
    id: 2,
    label: 'Review & Apply',
  },
]

const TRIGGER_FIELD_OPTIONS = RETENTION_FIELDS.filter((f) =>
  DATE_FIELD_KEYS.includes(f.key),
)

const AI_GENERATION_STATUS_WORDS = [
  'Analyzing folder metadata…',
  'Reviewing available fields…',
  'Choosing the best trigger field…',
  'Drafting suggested conditions…',
]

const AI_GENERATION_DURATION_MS = 2200

const useAiStatusWord = (active: boolean) => {
  const [statusIndex, setStatusIndex] = useState(0)

  useEffect(() => {
    if (!active) {
      setStatusIndex(0)
      return
    }
    const timer = window.setInterval(() => {
      setStatusIndex((prev) => (prev + 1) % AI_GENERATION_STATUS_WORDS.length)
    }, AI_GENERATION_DURATION_MS / AI_GENERATION_STATUS_WORDS.length)
    return () => window.clearInterval(timer)
  }, [active])

  return AI_GENERATION_STATUS_WORDS[statusIndex]
}

const PulsingAiIcon = ({ className = 'size-4' }: { className?: string }) => (
  <motion.div
    animate={{
      opacity: [0.55, 1, 0.55],
      rotate: [0, 8, -8, 0],
      scale: [0.92, 1.1, 0.92],
    }}
    className='inline-flex shrink-0 text-primary-9'
    transition={{ duration: 1.4, ease: 'easeInOut', repeat: Infinity }}
  >
    <AiBrandIcon className={className} variant='outline-purple' />
  </motion.div>
)

export default function FolderRetentionPolicyWizard({
  editingIndex = null,
  folderName,
  initialPolicy = null,
  onClose,
  onSave,
}: {
  editingIndex?: number | null
  folderName: string
  initialPolicy?: RetentionPolicy | null
  onClose: () => void
  onSave: (policy: RetentionPolicy) => void
}) {
  const [step, setStep] = useState<Step>(0)
  const [isSaving, setIsSaving] = useState(false)
  const [isGeneratingConditions, setIsGeneratingConditions] = useState(false)
  const [policy, setPolicy] = useState<RetentionPolicy>(
    initialPolicy || buildDefaultPolicy(),
  )
  const aiStatusWord = useAiStatusWord(isGeneratingConditions)

  const mockDocuments = useMemo(
    () => buildMockDocuments(folderName),
    [folderName],
  )
  const matchedDocuments = useMemo(
    () => mockDocuments.filter((doc) => matchesPolicy(doc, policy)),
    [mockDocuments, policy],
  )

  const updatePolicy = (patch: Partial<RetentionPolicy>) =>
    setPolicy((prev) => ({ ...prev, ...patch }))

  const updateCondition = (idx: number, patch: Partial<RetentionCondition>) =>
    setPolicy((prev) => ({
      ...prev,
      conditions: prev.conditions.map((c, i) =>
        i === idx ? { ...c, ...patch } : c,
      ),
    }))

  const addCondition = () => {
    const fallback =
      RETENTION_FIELDS.find((f) => f.key !== policy.triggerField) ||
      RETENTION_FIELDS[0]
    setPolicy((prev) => ({
      ...prev,
      conditions: [...prev.conditions, emptyCondition(fallback.key)],
    }))
  }

  const removeCondition = (idx: number) =>
    setPolicy((prev) => ({
      ...prev,
      conditions: prev.conditions.filter((_, i) => i !== idx),
    }))

  const generateRuleWithAi = () => {
    setIsGeneratingConditions(true)
    setTimeout(() => {
      const trigger = suggestTriggerForAction(policy.action)

      const statusField = RETENTION_FIELDS.find((f) => f.key === 'status')
      const guessValue =
        policy.action === 'permanent_delete'
          ? 'Terminated'
          : policy.action === 'soft_delete'
            ? 'Expired'
            : 'Expired'

      const otherField = RETENTION_FIELDS.find(
        (f) => f.key !== trigger.triggerField && f.key !== 'status',
      )

      const suggestedConditions: RetentionCondition[] = statusField
        ? [{ field: statusField.key, op: 'equals', value: guessValue }]
        : otherField
          ? [emptyCondition(otherField.key)]
          : []

      updatePolicy({
        aiGenerated: true,
        conditions: suggestedConditions.length
          ? suggestedConditions
          : policy.conditions,
        durationUnit: trigger.durationUnit,
        durationValue: trigger.durationValue,
        triggerField: trigger.triggerField,
      })
      setIsGeneratingConditions(false)
      showToast({
        message:
          'AI suggested a trigger and conditions from your folder metadata — review before activating.',
        variant: 'success',
      })
    }, AI_GENERATION_DURATION_MS)
  }

  const goToStep = (nextStep: Step) => {
    if (nextStep > step && step === 0 && !policy.name.trim()) {
      showToast({
        message: 'Enter a policy name to continue.',
        variant: 'error',
      })
      return
    }
    setStep(nextStep)
  }

  const savePolicy = () => {
    if (!policy.name.trim()) {
      showToast({
        message: 'Enter a policy name to continue.',
        variant: 'error',
      })
      setStep(0)
      return
    }
    if (!policy.triggerField) {
      showToast({
        message: 'Select a retention trigger field.',
        variant: 'error',
      })
      setStep(1)
      return
    }

    setIsSaving(true)
    setTimeout(() => {
      setIsSaving(false)
      onSave(policy)
      showToast({ message: 'Retention policy activated.', variant: 'success' })
    }, 500)
  }

  const formattedSteps = STEPPER_ITEMS.map((s) => ({
    ...s,
    clickable: true,
    disabled: false,
  }))

  const conditionValueInput = (cond: RetentionCondition, idx: number) => {
    const fld = RETENTION_FIELDS.find((f) => f.key === cond.field)
    if (fld?.type === 'select') {
      return (
        <InputSelect
          className='w-36'
          options={(fld.options || []).map((o) => ({ id: o, name: o }))}
          value={cond.value ? { id: cond.value, name: cond.value } : null}
          onChange={(opt) =>
            opt && updateCondition(idx, { value: String(opt.id) })
          }
        />
      )
    }
    return (
      <InputText
        className='w-36'
        placeholder='Value...'
        value={cond.value}
        onChange={(v) => updateCondition(idx, { value: v })}
      />
    )
  }

  const renderStepContent = () => (
    <AnimatePresence initial={false} mode='wait'>
      {step === 0 && (
        <AnimateSlideUp delay={0.1} key='retention-step-0'>
          <div className='flex flex-col gap-4'>
            <div>
              <h2 className='text-15 font-semibold text-gray-13'>
                {editingIndex != null
                  ? 'Edit retention policy'
                  : 'Policy Details'}
              </h2>
              <p className='mt-0.5 text-xs text-gray-11'>
                Name this policy and describe what it governs for folder &quot;
                {folderName}&quot;.
              </p>
            </div>

            <Divider />

            <div className='space-y-3'>
              <InputText
                label='Policy Name *'
                placeholder='e.g. Expired Contracts Retention'
                value={policy.name}
                onChange={(v) => updatePolicy({ name: v })}
              />
              <InputTextarea
                label='Description'
                minRows={3}
                placeholder='Describe what this retention policy manages and why.'
                value={policy.description}
                onChange={(v) => updatePolicy({ description: v })}
              />
            </div>
          </div>
        </AnimateSlideUp>
      )}

      {step === 1 && (
        <AnimateScale delay={0.1} key='retention-step-1'>
          <div className='flex flex-col gap-4'>
            <div className='flex items-start justify-between gap-3'>
              <div>
                <h2 className='text-15 font-semibold text-gray-13'>
                  Define Retention Rule
                </h2>
                <p className='mt-0.5 text-xs text-gray-11'>
                  Set the action to take, the trigger, and any additional
                  conditions.
                </p>
              </div>
              {policy.aiGenerated ? (
                <span className='inline-flex shrink-0 items-center gap-1.5 rounded-md border border-primary-4 bg-primary-2 px-2.5 py-1.5 text-[11px] font-semibold text-primary-11'>
                  <AiBrandIcon className='size-3.5' variant='outline-purple' />
                  AI Suggested
                </span>
              ) : (
                <button
                  className='inline-flex min-w-0 shrink-0 items-center gap-1.5 rounded-md border border-primary-4 bg-primary-2 px-2.5 py-1.5 text-[11px] font-semibold text-primary-11 transition hover:bg-primary-3 disabled:opacity-70'
                  disabled={isGeneratingConditions}
                  type='button'
                  onClick={generateRuleWithAi}
                >
                  {isGeneratingConditions ? (
                    <>
                      <PulsingAiIcon className='size-3.5' />
                      <span className='truncate'>{aiStatusWord}</span>
                    </>
                  ) : (
                    <>
                      <AiBrandIcon className='size-3.5' variant='outline-purple' />
                      Generate with AI
                    </>
                  )}
                </button>
              )}
            </div>

            <Divider />

            <div className='space-y-3 rounded-lg border border-[var(--border-default)] bg-surface p-4 shadow-2xs'>
              <div className='text-15 font-semibold text-gray-13'>
                Destination action
              </div>
              <InputSelect
                options={ACTION_OPTIONS.map((a) => ({
                  id: a.id,
                  name: a.name,
                }))}
                value={{
                  id: policy.action,
                  name: actionMeta(policy.action).name,
                }}
                onChange={(opt) =>
                  opt &&
                  updatePolicy({
                    action: opt.id as RetentionAction,
                    aiGenerated: false,
                  })
                }
              />
              <div
                className={cn(
                  'flex items-start gap-2 rounded-md px-3 py-2 text-xs leading-relaxed',
                  policy.action === 'permanent_delete'
                    ? 'bg-red-2 text-red-11'
                    : 'bg-surface-muted text-gray-11',
                )}
              >
                <Icon
                  className='mt-0.5 size-3.5 shrink-0'
                  name={actionMeta(policy.action).icon}
                />
                {actionMeta(policy.action).description}
              </div>
            </div>

            <div className='space-y-3 rounded-lg border border-[var(--border-default)] bg-surface p-4 shadow-2xs'>
              <div className='text-15 font-semibold text-gray-13'>
                Retention trigger
              </div>
              <div className='grid grid-cols-1 gap-3 sm:grid-cols-3'>
                <InputSelect
                  label='Trigger field'
                  options={TRIGGER_FIELD_OPTIONS.map((f) => ({
                    id: f.key,
                    name: f.label,
                  }))}
                  placeholder='Select a field...'
                  value={
                    policy.triggerField
                      ? {
                        id: policy.triggerField,
                        name: fieldLabel(policy.triggerField),
                      }
                      : null
                  }
                  onChange={(opt) =>
                    opt && updatePolicy({ triggerField: String(opt.id) })
                  }
                />
                <InputNumber
                  label='More than'
                  min={1}
                  value={policy.durationValue}
                  onChange={(v) =>
                    updatePolicy({ durationValue: Number(v) || 1 })
                  }
                />
                <InputSelect
                  label='Unit'
                  options={DURATION_UNIT_OPTIONS}
                  value={
                    DURATION_UNIT_OPTIONS.find(
                      (o) => o.id === policy.durationUnit,
                    ) || null
                  }
                  onChange={(opt) =>
                    opt &&
                    updatePolicy({
                      durationUnit: opt.id as RetentionDurationUnit,
                    })
                  }
                />
              </div>
              <div className='rounded-md bg-surface-muted px-3 py-2 text-xs leading-relaxed text-gray-11'>
                Preview: documents where{' '}
                <b className='text-gray-13'>
                  {policy.triggerField
                    ? fieldLabel(policy.triggerField)
                    : 'a trigger field'}
                </b>{' '}
                is more than{' '}
                <b className='text-gray-13'>
                  {policy.durationValue} {policy.durationUnit}
                </b>{' '}
                old will be evaluated for{' '}
                {actionMeta(policy.action).name.toLowerCase()}.
              </div>
            </div>

            <div className='space-y-3 rounded-lg border border-[var(--border-default)] bg-surface p-4 shadow-2xs'>
              <div className='flex items-center justify-between'>
                <div className='text-15 font-semibold text-gray-13'>
                  Additional conditions
                </div>
                <div className='flex items-center gap-1.5'>
                  <span className='text-[10px] font-medium text-gray-10'>
                    Match:
                  </span>
                  <div className='flex items-center rounded-md bg-gray-3 p-0.5 text-[11px] font-medium'>
                    <Tooltip content='Match ALL conditions (AND logic)' position='top'>
                      <button
                        className={cn(
                          'rounded px-2 py-0.5 text-[11px] font-semibold transition',
                          policy.matchType === 'all'
                            ? 'bg-primary-9 text-white'
                            : 'text-gray-11 hover:text-gray-12',
                        )}
                        type='button'
                        onClick={() => updatePolicy({ matchType: 'all' as RetentionMatchType })}
                      >
                        All
                      </button>
                    </Tooltip>
                    <Tooltip content='Match ANY condition (OR logic)' position='top'>
                      <button
                        className={cn(
                          'rounded px-2 py-0.5 text-[11px] font-semibold transition',
                          policy.matchType === 'any'
                            ? 'bg-primary-9 text-white'
                            : 'text-gray-11 hover:text-gray-12',
                        )}
                        type='button'
                        onClick={() => updatePolicy({ matchType: 'any' as RetentionMatchType })}
                      >
                        Any
                      </button>
                    </Tooltip>
                  </div>
                </div>
              </div>

              <div className='space-y-2'>
                {policy.conditions.map((cond, idx) => (
                  <div className='flex flex-wrap items-center gap-2' key={idx}>
                    <span className='w-12 shrink-0 text-[11px] font-bold tracking-wide text-gray-9 uppercase'>
                      {idx === 0
                        ? 'Where'
                        : policy.matchType === 'any'
                          ? 'Or'
                          : 'And'}
                    </span>
                    <InputSelect
                      className='w-44'
                      options={RETENTION_FIELDS.map((f) => ({
                        id: f.key,
                        name: f.label,
                      }))}
                      value={
                        cond.field
                          ? { id: cond.field, name: fieldLabel(cond.field) }
                          : null
                      }
                      onChange={(opt) => {
                        if (!opt) return
                        const fld = RETENTION_FIELDS.find(
                          (f) => f.key === opt.id,
                        )
                        updateCondition(idx, {
                          field: String(opt.id),
                          op: 'equals',
                          value:
                            fld?.type === 'select'
                              ? fld.options?.[0] || ''
                              : '',
                        })
                      }}
                    />
                    <InputSelect
                      className='w-36'
                      options={OPERATOR_OPTIONS}
                      value={
                        OPERATOR_OPTIONS.find((o) => o.id === cond.op) ||
                        OPERATOR_OPTIONS[0]
                      }
                      onChange={(opt) =>
                        opt && updateCondition(idx, { op: String(opt.id) })
                      }
                    />
                    {conditionValueInput(cond, idx)}
                    <button
                      aria-label='Remove condition'
                      className='flex size-7 shrink-0 items-center justify-center rounded-md border border-[var(--border-default)] text-gray-9 transition hover:border-red-6 hover:text-red-9'
                      type='button'
                      onClick={() => removeCondition(idx)}
                    >
                      <Icon className='size-3.5' name='lucide:x' />
                    </button>
                  </div>
                ))}
                {policy.conditions.length === 0 && (
                  <div className='rounded-md border border-dashed border-[var(--border-default)] py-4 text-center text-xs text-gray-10'>
                    No additional conditions — the trigger alone decides the
                    match.
                  </div>
                )}
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
                  Require manual confirmation before running
                </div>
                <div className='text-11.5 mt-0.5 text-gray-10'>
                  Lists every matched document for confirmation before the
                  action runs.
                </div>
              </div>
              <InputSwitch
                checked={policy.requireConfirm}
                onChange={(v) => updatePolicy({ requireConfirm: Boolean(v) })}
              />
            </div>

            <div className='flex items-center justify-between rounded-lg border border-[var(--border-default)] bg-surface-muted px-4 py-3'>
              <div>
                <div className='text-13 font-semibold text-gray-13'>
                  Notify document owner beforehand
                </div>
                <div className='text-11.5 mt-0.5 text-gray-10'>
                  Sends a heads-up to the owner listed on each document&apos;s
                  metadata.
                </div>
              </div>
              <InputSwitch
                checked={policy.notifyOwner}
                onChange={(v) => updatePolicy({ notifyOwner: Boolean(v) })}
              />
            </div>
          </div>
        </AnimateScale>
      )}

      {step === 2 && (
        <AnimateFadeIn delay={0.1} key='retention-step-2'>
          <div className='flex flex-col gap-4'>
            <div>
              <h2 className='text-15 font-semibold text-gray-13'>
                Review & Apply
              </h2>
              <p className='mt-0.5 text-xs text-gray-11'>
                Verify the configured policy before activating it for &quot;
                {folderName}&quot;.
              </p>
            </div>

            <Divider />

            <div className='grid grid-cols-1 gap-2.5 sm:grid-cols-3'>
              <div className='rounded-lg border border-[var(--border-default)] bg-surface px-3 py-2.5 shadow-2xs'>
                <div className='text-[11px] font-medium text-gray-11'>
                  Policy Name
                </div>
                <div className='mt-0.5 truncate text-13 font-semibold text-gray-13'>
                  {policy.name || 'Untitled policy'}
                </div>
              </div>
              <div className='rounded-lg border border-[var(--border-default)] bg-surface px-3 py-2.5 shadow-2xs'>
                <div className='text-[11px] font-medium text-gray-11'>
                  Destination Action
                </div>
                <div className='mt-0.5 flex items-center gap-1.5 text-13 font-semibold text-gray-13'>
                  <Icon
                    className='size-3.5 text-primary-9'
                    name={actionMeta(policy.action).icon}
                  />
                  {actionMeta(policy.action).name}
                </div>
              </div>
              <div className='rounded-lg border border-[var(--border-default)] bg-surface px-3 py-2.5 shadow-2xs'>
                <div className='text-[11px] font-medium text-gray-11'>
                  Trigger
                </div>
                <div className='mt-0.5 flex items-center gap-1.5 text-13 font-semibold text-gray-13'>
                  <Icon className='size-3.5 text-primary-9' name='tabler:clock-hour-4' />
                  {fieldLabel(policy.triggerField)} &gt; {policy.durationValue}{' '}
                  {policy.durationUnit}
                </div>
              </div>
            </div>

            <div className='space-y-2 rounded-lg border border-[var(--border-default)] bg-surface p-3.5 shadow-2xs'>
              <div className='flex items-center justify-between border-b border-[var(--border-default)] pb-2.5'>
                <div className='flex items-center gap-1.5 text-xs font-semibold text-gray-12'>
                  <Icon className='size-3.5 text-primary-9' name='tabler:list-check' />
                  How this policy behaves
                </div>
                {policy.aiGenerated && (
                  <span className='inline-flex items-center gap-1 rounded-md bg-primary-2 px-1.5 py-0.5 text-[10px] font-semibold text-primary-11'>
                    <AiBrandIcon className='size-3' variant='outline-purple' />
                    Suggested by AI
                  </span>
                )}
              </div>
              <p className='text-13 leading-relaxed text-gray-12'>
                {buildSummarySentence(folderName, policy)}
              </p>
            </div>

            <Accordion>
              <AccordionItem
                label={`Matched today: ${matchedDocuments.length} of ${mockDocuments.length} documents`}
                value='matched-documents'
              >
                <p className='mb-2 text-xs text-gray-10'>
                  These documents currently satisfy the rule and would move to{' '}
                  {actionMeta(policy.action).name.toLowerCase()} once activated.
                </p>
                {matchedDocuments.length > 0 ? (
                  <div className='divide-y divide-[var(--border-default)] rounded-md border border-[var(--border-default)]'>
                    {matchedDocuments.slice(0, 6).map((doc) => (
                      <div
                        className='flex items-center justify-between gap-3 px-3 py-2 text-xs'
                        key={doc.id}
                      >
                        <span className='truncate font-medium text-gray-13'>
                          {doc.name}
                        </span>
                        <span className='shrink-0 text-gray-10'>
                          {reasonText(doc, policy)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className='rounded-md border border-dashed border-[var(--border-default)] py-6 text-center text-xs text-gray-10'>
                    No documents currently match this rule.
                  </div>
                )}
                {matchedDocuments.length > 6 && (
                  <div className='mt-2 text-[11px] text-gray-10'>
                    + {matchedDocuments.length - 6} more
                  </div>
                )}
              </AccordionItem>
            </Accordion>
          </div>
        </AnimateFadeIn>
      )}
    </AnimatePresence>
  )

  return (
    <div className='flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-gray-1'>
      <div className='mb-2 flex items-center justify-between border-b border-[var(--border-default)] px-6 py-3.5 md:px-8'>
        <div className='flex items-center gap-3'>
          <IconButton
            ariaLabel='Back'
            color='gray'
            icon='lucide:arrow-left'
            size='sm'
            variant='ghost'
            onClick={onClose}
          />
          <div className='flex flex-col gap-0.5'>
            <h2 className='text-15 font-semibold tracking-tight text-gray-13'>
              {editingIndex != null
                ? 'Edit Retention Policy'
                : 'Retention Policy Setup'}{' '}
              — {folderName}
            </h2>
            <p className='text-xs text-gray-11'>
              AI-assisted lifecycle rules for folder &quot;{folderName}&quot;
            </p>
          </div>
        </div>
      </div>

      <div className='grid min-h-0 flex-1 grid-cols-1 gap-0 xl:grid-cols-[290px_1fr]'>
        <aside className='hidden h-full border-r border-[var(--border-default)] bg-gray-1/30 pt-4 pr-3 pb-4 pl-4 xl:block'>
          <Stepper
            active={step}
            orientation='vertical'
            steps={formattedSteps}
            setActive={(s) => goToStep(s as Step)}
          />
        </aside>

        <div className='col-span-1 h-full w-full overflow-y-auto'>
          <div className='mx-auto w-full max-w-3xl px-6 py-5 pb-10 md:px-8 lg:px-10'>
            {renderStepContent()}

            <div className='mt-6 flex items-center justify-between border-t border-[var(--border-default)] pt-4'>
              <Button
                color='gray'
                disabled={step === 0}
                icon='lucide:arrow-left'
                label='Back'
                size='sm'
                variant='outline'
                onClick={() => setStep((step - 1) as Step)}
              />

              {step === 2 ? (
                <Button
                  disabled={isSaving}
                  label={isSaving ? 'Activating...' : 'Activate Policy'}
                  loading={isSaving}
                  size='sm'
                  suffixIcon='tabler:arrow-right'
                  onClick={savePolicy}
                />
              ) : (
                <Button
                  label='Continue'
                  size='sm'
                  suffixIcon='tabler:arrow-right'
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
