import { useLingui } from '@lingui/react/macro'
import { Accordion } from '@mantine/core'
import { useEffect, useMemo, useRef, useState } from 'react'
import Button from '@/components/base/button/Button'
import Icon from '@/components/base/icon/Icon'
import ScrollArea from '@/components/base/scroll-area/ScrollArea'
import Tooltip from '@/components/base/Tooltip'
import AnimateFadeIn from '@/components/common/animations/AnimateFadeIn'
import {
  evaluateFormRules,
  resetRuleDrivenValues,
} from '@/pages/form-builder/helpers/ruleEngine'
import { getFieldAttachmentMap } from '@/pages/requests/utils/fieldAttachmentMap'
import type { FormRuntimeLayout } from './utils/formLayout'
import cn from '@/utils/cn'
import ExtractedFieldCell from './components/ExtractedFieldCell'
import FieldRenderer from './components/FieldRenderer'
import MasterFillSync from './components/MasterFillSync'
import {
  fillsFromElsewhere,
  getColumnSizeClass,
  getDependentChildFieldIds,
  isFieldFilled,
  isFieldHidden,
  isFieldReadOnly,
  isFieldRequired,
  resolveRuntimeFieldType,
} from './utils/fieldRendering'
import { validateFormModel } from '@/pages/form-builder/helpers/runtimeValidation'
import {
  WorkflowAttachmentsContext,
  WorkflowOpenAttachmentContext,
} from './WorkflowNameContext'
import { getFirstReceivedAttachment } from './utils/gmailFormAttachment'

const STAGE_PAGE_SIZE = 8

function stageWindowStart(activeIndex: number, total: number) {
  if (total <= STAGE_PAGE_SIZE || activeIndex < 0) return 0
  const maxStart = total - STAGE_PAGE_SIZE
  const centered = activeIndex - Math.floor((STAGE_PAGE_SIZE - 1) / 2)
  return Math.min(Math.max(0, centered), maxStart)
}

export function WorkflowStageBar({
  currentActivityId,
  stages,
}: {
  currentActivityId?: string
  stages: {
    id: string
    label: string
    isCondition?: boolean
    isEnd?: boolean
    isSuccess?: boolean
    status?: 'done' | 'current' | 'future'
  }[]
}) {
  const { t } = useLingui()
  let activeIndex = stages.findIndex(
    (stage) => String(stage.id) === String(currentActivityId || ''),
  )

  if (activeIndex < 0) {
    activeIndex = stages.findIndex((stage) => stage.status === 'current')
  }

  const lastStage = stages[stages.length - 1]
  const isAllDone =
    Boolean(lastStage?.isSuccess) ||
    Boolean(lastStage?.isEnd && stages.every((s) => s.status === 'done'))
  if (activeIndex < 0 && isAllDone) {
    activeIndex = stages.length - 1
  }

  const shown = stages.map((stage, index) => ({ index, stage }))
  const [start, setStart] = useState(() =>
    stageWindowStart(activeIndex, shown.length),
  )
  const canPage = shown.length > STAGE_PAGE_SIZE
  const maxStart = Math.max(0, shown.length - STAGE_PAGE_SIZE)

  useEffect(() => {
    setStart(stageWindowStart(activeIndex, shown.length))
  }, [activeIndex, shown.length])

  const visibleCount = Math.min(STAGE_PAGE_SIZE, shown.length)

  return (
    <div className='mb-4 flex items-start gap-1 rounded-xl border border-gray-3 bg-gray-0 px-3 pt-4 pb-3'>
      {canPage ? (
        <div className='flex h-6 shrink-0 items-center'>
          <button
            aria-label={t`Previous stages`}
            className='flex size-8 items-center justify-center rounded-lg  transition-colors hover:bg-primary-5 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40'
            disabled={start === 0}
            type='button'
            onClick={() => setStart((value) => Math.max(0, value - 1))}
          >
            <Icon className='size-4' name='tabler:chevron-left' />
          </button>
        </div>
      ) : null}
      <div className='min-w-0 flex-1 overflow-hidden py-3'>
        <div
          className='flex items-start transition-transform duration-300 ease-in-out'
          style={{
            transform: `translateX(-${shown.length ? (start * 100) / shown.length : 0}%)`,
            width: `${(shown.length / visibleCount) * 100}%`,
          }}
        >
          {shown.map(({ index, stage }) => {
            const upcoming = activeIndex >= 0 && index > activeIndex
            const isEndSuccess =
              !upcoming &&
              (Boolean(stage.isSuccess) ||
                Boolean(stage.isEnd && (isAllDone || activeIndex === index)))
            const done =
              !upcoming &&
              (isEndSuccess ||
                (activeIndex >= 0
                  ? index < activeIndex
                  : stage.status === 'done'))
            const current =
              !upcoming &&
              !isEndSuccess &&
              (activeIndex === index || stage.status === 'current')
            const isCondition = Boolean(stage.isCondition) && !done && !current

            return (
              <div
                className='flex min-w-0 flex-1 flex-col'
                key={stage.id}
              >
                <div className='flex w-full items-center'>
                  <div
                    className={cn(
                      'h-0.5 flex-1',
                      index === 0
                        ? 'bg-transparent'
                        : !upcoming && (done || current || isEndSuccess)
                          ? 'bg-green-9'
                          : 'bg-gray-4',
                    )}
                  />
                  <div className='relative shrink-0'>
                    {current && !isEndSuccess ? (
                      <span className='absolute inset-0 animate-ping rounded-full bg-primary-7' />
                    ) : null}
                    <div
                      className={cn(
                        'relative flex size-6 items-center justify-center rounded-full text-11 font-semibold transition-all',
                        (done || isEndSuccess) && 'bg-green-9 text-green-1',
                        current && 'bg-primary-9 text-primary-1 shadow-sm',
                        isCondition &&
                          'border border-primary-7 bg-primary-2 text-primary-11',
                        !done &&
                          !isEndSuccess &&
                          !current &&
                          !isCondition &&
                          'border border-gray-5 bg-gray-0 text-gray-10',
                      )}
                    >
                      {done || isEndSuccess ? (
                        <Icon className='size-3.5' name='tabler:check' />
                      ) : isCondition ? (
                        <Icon className='size-3.5 text-primary-11' name='tabler:git-branch' />
                      ) : (
                        index + 1
                      )}
                    </div>
                  </div>
                  <div
                    className={cn(
                      'h-0.5 flex-1',
                      index === shown[shown.length - 1]?.index
                        ? 'bg-transparent'
                        : done && index < activeIndex
                          ? 'bg-green-9'
                          : 'bg-gray-4',
                    )}
                  />
                </div>
                <Tooltip
                  className='mt-1.5 w-full min-w-0 justify-center'
                  content={stage.label}
                  position='bottom'
                >
                  <span
                    className={cn(
                      'block w-full truncate px-1 text-center text-11',
                      isEndSuccess
                        ? 'font-semibold text-green-11'
                        : current
                          ? 'font-semibold text-primary-11'
                          : isCondition
                            ? 'font-medium text-primary-11'
                            : 'text-gray-10',
                    )}
                  >
                    {stage.label}
                  </span>
                </Tooltip>
              </div>
            )
          })}
        </div>
      </div>
      {canPage ? (
        <div className='flex h-6 shrink-0 items-center'>
          <button
            aria-label={t`Next stages`}
            className='flex size-8 items-center justify-center rounded-lg  transition-colors hover:bg-primary-5 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40'
            disabled={start >= maxStart}
            type='button'
            onClick={() => setStart((value) => Math.min(maxStart, value + 1))}
          >
            <Icon className='size-4' name='tabler:chevron-right' />
          </button>
        </div>
      ) : null}
    </div>
  )
}

const EXTRACTED_FALLBACK_TYPES = new Set([
  'TABLE',
  'DYNAMIC_TABLE',
  'MATRIX',
  'FILE_UPLOAD',
  'IMAGE_UPLOAD',
  'SIGNATURE',
  'CHECKBOX',
  'MULTI_SELECT',
  'MULTIPLE_CHOICE',
  'USER',
  'USERS',
  'POPUP',
  'TABS',
  'NESTED_LIST',
  'LOGIN_AUTHENTICATION',
  'EMAIL_AUTHENTICATION',
  'MOBILE_AUTHENTICATION',
])

interface Props {
  formModel: Record<string, any>
  panels: any[]
  // Already-submitted instance attachments (Overview only — New Request has
  // nothing to fall back to yet). File fields are never part of formData
  // once submitted (see buildStartWorkflowPayload), so the backend has no
  // record of which attachment came from which field: uploads made through
  // this screen are remembered locally (getFieldAttachmentMap). Email /
  // process files with no mapping: only the first one is shown on the first
  // FILE_UPLOAD field; the rest stay in the Attachments panel.
  attachments?: any[]
  currentActivityId?: string
  // Skips the internal ScrollArea (height: 100%) — used when this renderer
  // is nested inside another scrollable container (the split-view's
  // right pane), where a second height:100% ScrollArea would otherwise
  // fight the outer container for scroll ownership.
  disableOwnScroll?: boolean
  exclusive?: boolean
  formRules?: any[]
  hasAttemptedSubmit?: boolean
  // Field ids hidden from the current acting user by the current stage's
  // Security & Form Access settings (formVisibilityAccess / formSecureControls).
  hiddenFieldIds?: Set<string>
  hidePanels?: boolean
  // Overview only — scopes the local field↔attachment map to this request.
  instanceId?: string | number
  // The form's configured layout (Form Settings → Form Layout). CLASSIC:
  // every section open; ACCORDION: one section open at a time; SINGLE: one
  // section per step with Back/Next. Ignored for `exclusive` and the
  // extracted presentation, whose open state the parent owns.
  layout?: FormRuntimeLayout
  missingMandatoryFieldIds?: Set<string>
  openValue?: string | null
  preparePhase?: 'extracting' | 'uploading' | null
  preparingFieldId?: string | null
  // AP-style dense label/value grid (click-to-edit) instead of Input cards.
  presentation?: 'default' | 'extracted'
  // Bumped on every submit click — reopens sections that hold errors.
  submitAttempt?: number
  // Field ids the current acting user can see but not edit, from the same
  // Security & Form Access settings (formEditAccess / formEditControls).
  readOnlyFieldIds?: Set<string>
  repoFieldHints?: string[]
  repositoryId?: string
  // Field ids the current stage explicitly lets this user edit (Editable
  // Fields = Custom). They override the form's read-only settings/rules.
  stageEditableFieldIds?: Set<string>
  stages?: {
    id: string
    label: string
    isCondition?: boolean
    isEnd?: boolean
    isSuccess?: boolean
    status?: 'done' | 'current' | 'future'
  }[]
  viewOnly?: boolean
  getPanelValue?: (panel: any, index: number) => string
  onAddAttachments?: (files: File[]) => void
  onFieldChange: (fieldId: string, value: any) => void
  onOcrFieldList?: (
    list: { name?: string; value?: string }[] | undefined,
  ) => void
  onOpenAttachment?: (attachment: any) => void
  onOpenChange?: (value: string | null) => void
  onRequestUpload?: (fieldId: string, file: File) => void | Promise<void>
}

const FILE_FIELD_TYPES = new Set(['FILE_UPLOAD', 'IMAGE_UPLOAD'])

// Renders a workflow's formJson.panels using the app's existing form-control
// components. MVP scope: a single accordion/panel layout regardless of the
// form's configured "layout" (typeform/grid/full) — panel titles,
// descriptions, field sizing, tooltips, required state, and static
// visibility are respected; per-field conditional logic rules are not
// evaluated yet.
const WorkflowFormRenderer = ({
  attachments,
  currentActivityId,
  disableOwnScroll,
  exclusive,
  formModel,
  formRules,
  hasAttemptedSubmit,
  hiddenFieldIds,
  hidePanels,
  instanceId,
  layout = 'CLASSIC',
  missingMandatoryFieldIds,
  openValue,
  panels,
  preparePhase,
  preparingFieldId,
  presentation = 'default',
  readOnlyFieldIds,
  repoFieldHints,
  repositoryId,
  stageEditableFieldIds,
  stages,
  submitAttempt,
  viewOnly,
  getPanelValue,
  onAddAttachments,
  onFieldChange,
  onOcrFieldList,
  onOpenAttachment,
  onOpenChange,
  onRequestUpload,
}: Props) => {
  const { t } = useLingui()

  const firstFileFieldId = useMemo(() => {
    const fileFieldIds = panels.flatMap((panel: any) =>
      (panel.fields || [])
        .filter((field: any) => FILE_FIELD_TYPES.has(resolveRuntimeFieldType(field)))
        .map((field: any) => field.id || field.jsonId),
    )
    return fileFieldIds[0] || null
  }, [panels])

  // fieldId -> attachments uploaded through that field. Unmapped process
  // files (e.g. Gmail) only pin the first one onto the first FILE_UPLOAD
  // field — extra email attachments are not listed under the form field.
  const attachmentsByField = useMemo(() => {
    const grouped: Record<string, any[]> = {}
    if (!attachments?.length) return grouped
    const recorded = getFieldAttachmentMap(instanceId)
    const unmapped: any[] = []

    attachments.forEach((attachment: any) => {
      const key = String(
        attachment.itemId ?? attachment.id ?? attachment.fileId ?? '',
      )
      const fieldId = recorded[key]
      if (fieldId) {
        grouped[fieldId] = [...(grouped[fieldId] || []), attachment]
        return
      }
      if (key) unmapped.push(attachment)
    })

    const firstUnmapped = getFirstReceivedAttachment(unmapped)
    if (
      firstFileFieldId &&
      firstUnmapped &&
      !(grouped[firstFileFieldId] || []).length
    ) {
      grouped[firstFileFieldId] = [firstUnmapped]
    }

    return grouped
  }, [attachments, firstFileFieldId, instanceId])

  const evaluatedFieldStates = useMemo(
    () => evaluateFormRules(panels, formModel, formRules),
    [panels, formModel, formRules],
  )

  // Phase 4: compute rich per-field validation errors when the user has
  // attempted to submit. These cover format, length, numeric bounds, etc. —
  // not just the "required" check that missingMandatoryFieldIds covers.
  const validationErrors = useMemo(() => {
    if (!hasAttemptedSubmit) return {} as Record<string, string>
    return validateFormModel(panels, formModel, { formRules }).errors
  }, [hasAttemptedSubmit, panels, formModel, formRules])

  // field id -> id of the field whose change cleared it
  const [autoFillSuppressed, setAutoFillSuppressed] = useState<
    Record<string, string>
  >({})

  const handleFieldChangeWithCascade = (fieldId: string, value: any) => {
    onFieldChange(fieldId, value)
    const isFilled = (v: any) =>
      v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && !v.length)
    const cleared: string[] = []
    // Children were derived from the parent's previous value. If the parent
    // was empty (e.g. auto-filled when a stage opens it) there is nothing
    // stale to clear, and saved child values must be kept.
    if (isFilled(formModel?.[fieldId])) {
      const dependentChildIds = getDependentChildFieldIds(fieldId, panels)
      for (const childId of dependentChildIds) {
        if (isFilled(formModel?.[childId])) {
          onFieldChange(childId, null)
          // Switching the parent straight to another value must let the
          // children refill from it, same as clearing it and reselecting.
          if (!isFilled(value)) cleared.push(childId)
        }
      }
    }
    // Clear fields this change just hid or locked via conditional rules
    const nextModel = { ...formModel, [fieldId]: value }
    const cleaned = resetRuleDrivenValues(
      panels,
      formModel,
      nextModel,
      formRules,
    )
    const afterStates = stageEditableFieldIds?.size
      ? evaluateFormRules(panels, cleaned, formRules)
      : {}
    for (const key of Object.keys(cleaned)) {
      // A rule lock doesn't clear a field this stage opens for editing;
      // a field the rule hides is still cleared.
      if (
        stageEditableFieldIds?.has(key) &&
        afterStates[key]?.visible !== false
      ) {
        continue
      }
      if (key !== fieldId && cleaned[key] !== nextModel[key]) {
        onFieldChange(key, cleaned[key])
        cleared.push(key)
        // A field cleared by a rule (e.g. Product Code locked by Status =
        // New) also invalidates the values that were filled from it.
        if (isFilled(nextModel[key])) {
          for (const childId of getDependentChildFieldIds(key, panels)) {
            if (childId !== fieldId && isFilled(cleaned[childId])) {
              onFieldChange(childId, null)
              cleared.push(childId)
            }
          }
        }
      }
    }

    // Auto-select / master fill would immediately refill what was just
    // cleared (their source, e.g. the top Existing Product Code, still has a
    // value). Hold them off until the field that triggered the clear changes
    // again, or the user edits the cleared field themselves.
    setAutoFillSuppressed((prev) => {
      const next: Record<string, string> = {}
      for (const [id, trigger] of Object.entries(prev)) {
        if (trigger !== fieldId && id !== fieldId) next[id] = trigger
      }
      for (const id of cleared) next[id] = fieldId
      return next
    })
  }

  // Hidden fields are not rendered, so their master "Fill Value" sync would
  // never run. Mount just the sync (no UI) for hidden fields that fill from
  // a master table or another field, so their values stay current.
  const allFormFields = useMemo(
    () => (panels || []).flatMap((panel: any) => panel?.fields || []),
    [panels],
  )
  const hiddenFillSyncs = allFormFields
    .filter((field: any) => {
      if (!fillsFromElsewhere(field)) return false
      if (
        !['SHORT_TEXT', 'NUMBER', 'DATE', 'DATE_TIME'].includes(
          resolveRuntimeFieldType(field),
        )
      ) {
        return false
      }
      const state = evaluatedFieldStates[field.id]
      const isHiddenByRule = state ? !state.visible : isFieldHidden(field)
      return isHiddenByRule || Boolean(hiddenFieldIds?.has(field.id))
    })
    .map((field: any) => (
      <MasterFillSync
        allFields={allFormFields}
        field={field}
        formModel={formModel || {}}
        key={`fill-sync-${field.id}`}
        readOnly={Boolean(viewOnly) || field.id in autoFillSuppressed}
        value={formModel?.[field.id]}
        onChange={(value) => handleFieldChangeWithCascade(field.id, value)}
      />
    ))

  const resolvePanelValue = (panel: any, index: number) =>
    getPanelValue?.(panel, index) || `panel-${index}`

  const fieldHasError = (field: any) =>
    Boolean(
      missingMandatoryFieldIds?.has(String(field.id)) ||
        (field.jsonId && missingMandatoryFieldIds?.has(String(field.jsonId))) ||
        validationErrors[String(field.id)] ||
        (field.jsonId && validationErrors[String(field.jsonId)]),
    )

  // Non-exclusive accordion: every section starts open (sections that load
  // later open too). Controlled so a submit can reopen closed sections.
  const [openPanels, setOpenPanels] = useState<string[]>(() =>
    panels.map((panel, idx) => resolvePanelValue(panel, idx)),
  )
  const seenPanelsRef = useRef(new Set(openPanels))
  useEffect(() => {
    const added = panels
      .map((panel, idx) => resolvePanelValue(panel, idx))
      .filter((value) => !seenPanelsRef.current.has(value))
    if (added.length === 0) return
    added.forEach((value) => seenPanelsRef.current.add(value))
    setOpenPanels((prev) => [...prev, ...added])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panels])

  const effectiveLayout: FormRuntimeLayout =
    exclusive || presentation === 'extracted' ? 'CLASSIC' : layout

  const getVisiblePanelFields = (panel: any) =>
    (panel.fields || []).filter((field: any) => {
      const state = evaluatedFieldStates[field.id]
      const isHiddenByRule = state ? !state.visible : isFieldHidden(field)
      return !isHiddenByRule && !hiddenFieldIds?.has(field.id)
    })

  // Sections with something to show — the steps of the SINGLE layout.
  const visiblePanels = panels
    .map((panel: any, panelIndex: number) => ({
      panel,
      panelIndex,
      value: resolvePanelValue(panel, panelIndex),
      visibleFields: getVisiblePanelFields(panel),
    }))
    .filter(({ visibleFields }) => visibleFields.length > 0)

  // ACCORDION: one section open at a time, the first one to start with.
  const [accordionOpen, setAccordionOpen] = useState<string | null>(null)
  const accordionInitRef = useRef(false)
  useEffect(() => {
    if (accordionInitRef.current || visiblePanels.length === 0) return
    accordionInitRef.current = true
    setAccordionOpen(visiblePanels[0].value)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visiblePanels.length])

  // SINGLE: index into visiblePanels. Clamped because rules can hide a
  // section while the user is on it.
  const [step, setStep] = useState(0)
  const currentStep = Math.min(step, Math.max(visiblePanels.length - 1, 0))
  const stepTopRef = useRef<HTMLDivElement>(null)
  const goToStep = (next: number) => {
    setStep(next)
    stepTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // A closed section hides its field errors — open every section that has
  // one when the user submits.
  useEffect(() => {
    if (!submitAttempt) return
    const withErrors = panels
      .map((panel, idx) => ({ panel, value: resolvePanelValue(panel, idx) }))
      .filter(({ panel }) => (panel.fields || []).some(fieldHasError))
      .map(({ value }) => value)
    if (withErrors.length === 0) return
    if (exclusive) onOpenChange?.(withErrors[0])
    else if (effectiveLayout === 'ACCORDION') setAccordionOpen(withErrors[0])
    else if (effectiveLayout === 'SINGLE') {
      const errorStep = visiblePanels.findIndex(
        ({ value }) => value === withErrors[0],
      )
      if (errorStep >= 0) goToStep(errorStep)
    } else setOpenPanels((prev) => Array.from(new Set([...prev, ...withErrors])))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitAttempt])

  const resolveEffectiveReadOnly = (field: any) => {
    if (viewOnly) return true
    // Form first, then workflow: the form's settings + rules give the
    // default; a field the stage explicitly opens for editing overrides a
    // form lock (calculated fields always stay read-only).
    if (
      stageEditableFieldIds?.has(String(field.id)) &&
      resolveRuntimeFieldType(field) !== 'CALCULATED'
    ) {
      return false
    }
    const state = evaluatedFieldStates[field.id]
    const isReadOnlyByRule = Boolean(state?.disabled)
    const baseReadOnly = isFieldReadOnly(field) || isReadOnlyByRule

    return baseReadOnly || Boolean(readOnlyFieldIds?.has(String(field.id)))
  }

  const renderVisibleFields = (visibleFields: any[]) => {
    if (presentation === 'extracted') {
      const scalarFields = visibleFields.filter(
        (field) =>
          !EXTRACTED_FALLBACK_TYPES.has(resolveRuntimeFieldType(field)),
      )
      const complexFields = visibleFields.filter((field) =>
        EXTRACTED_FALLBACK_TYPES.has(resolveRuntimeFieldType(field)),
      )

      return (
        <div className='flex max-w-full min-w-0 flex-col gap-6'>
          <div className='grid grid-cols-1 gap-x-4 gap-y-1 md:grid-cols-2'>
            {scalarFields.map((field: any) => {
              const state = evaluatedFieldStates[field.id]
              const isRequiredByRule = state
                ? state.required
                : isFieldRequired(field)
              // Phase 4: prefer richer format/length/numeric error from validationErrors
              // over the legacy "required only" check, falling back to the server-side
              // missingMandatoryFieldIds set for backward compatibility.
              const fieldError: string | undefined = (() => {
                if (!hasAttemptedSubmit) return undefined
                const richErr =
                  validationErrors[String(field.id)] ||
                  (field.jsonId ? validationErrors[String(field.jsonId)] : undefined)
                if (richErr) return richErr
                if (
                  missingMandatoryFieldIds?.has(String(field.id)) ||
                  (field.jsonId && missingMandatoryFieldIds?.has(String(field.jsonId)))
                )
                  return t`This field is required.`
                return undefined
              })()
              const isReadOnly = resolveEffectiveReadOnly(field)

              return (
                <ExtractedFieldCell
                  error={fieldError}
                  field={field}
                  key={field.id}
                  readOnly={isReadOnly}
                  source={
                    formModel[field.id] != null && formModel[field.id] !== ''
                      ? 'ocr'
                      : 'ocr'
                  }
                  value={formModel[field.id] ?? ''}
                  onChange={(value) => handleFieldChangeWithCascade(field.id, value)}
                />
              )
            })}
          </div>
          {complexFields.map((field: any) => {
            const resolvedType = resolveRuntimeFieldType(field)
            const isTableField =
              resolvedType === 'TABLE' || resolvedType === 'DYNAMIC_TABLE'
            const sizeClass = getColumnSizeClass(
              isTableField
                ? field.settings?.general?.size || 'col-12'
                : field.settings?.general?.size,
            )
            const isFieldEffectiveReadOnly = resolveEffectiveReadOnly(field)
            return (
              <div
                className={`${sizeClass} max-w-full min-w-0 px-1 pb-2`}
                data-field-id={field.id}
                key={field.id}
              >
                <FieldRenderer
                  fallbackAttachments={attachmentsByField[field.id]}
                  field={field}
                  formModel={formModel}
                  formViewOnly={Boolean(viewOnly)}
                  panels={panels}
                  preparePhase={preparePhase}
                  repoFieldHints={repoFieldHints}
                  repositoryId={repositoryId}
                  autoFillSuppressed={field.id in autoFillSuppressed}
                  ruleLocked={Boolean(evaluatedFieldStates[field.id]?.disabled)}
                  value={formModel[field.id]}
                  error={(() => {
                    if (!hasAttemptedSubmit) return undefined
                    const richErr =
                      validationErrors[String(field.id)] ||
                      (field.jsonId ? validationErrors[String(field.jsonId)] : undefined)
                    if (richErr) return richErr
                    if (
                      missingMandatoryFieldIds?.has(String(field.id)) ||
                      (field.jsonId && missingMandatoryFieldIds?.has(String(field.jsonId)))
                    )
                      return t`This field is required.`
                    return undefined
                  })()}
                  isPreparing={
                    Boolean(preparePhase) &&
                    preparingFieldId === String(field.id)
                  }
                  syncReadOnly={Boolean(viewOnly)}
                  viewOnly={isFieldEffectiveReadOnly}
                  onAddAttachments={onAddAttachments}
                  onChange={(value) => handleFieldChangeWithCascade(field.id, value)}
                  onOcrFieldList={onOcrFieldList}
                  onOpenAttachment={onOpenAttachment}
                  onRequestUpload={
                    onRequestUpload && !isFieldEffectiveReadOnly
                      ? (file) => onRequestUpload(field.id, file)
                      : undefined
                  }
                />
              </div>
            )
          })}
        </div>
      )
    }

    return (
      <div className='-mx-2 -mb-4 flex max-w-full min-w-0 flex-wrap'>
        {visibleFields.map((field: any) => {
          const resolvedType = resolveRuntimeFieldType(field)
          const isTableField =
            resolvedType === 'TABLE' || resolvedType === 'DYNAMIC_TABLE'
          const isSectionHeading = resolvedType === 'HEADING'
          const sizeClass = isSectionHeading
            ? 'w-full'
            : getColumnSizeClass(
                isTableField
                  ? field.settings?.general?.size || 'col-12'
                  : field.settings?.general?.size,
              )
          const isFieldEffectiveReadOnly = resolveEffectiveReadOnly(field)

          return (
            <div
              data-field-id={field.id}
              key={field.id}
              className={cn(
                sizeClass,
                'max-w-full min-w-0 px-2',
                isTableField ? 'pb-5' : 'pb-4',
              )}
            >
              <FieldRenderer
                fallbackAttachments={attachmentsByField[field.id]}
                field={field}
                formModel={formModel}
                formViewOnly={Boolean(viewOnly)}
                panels={panels}
                preparePhase={preparePhase}
                repoFieldHints={repoFieldHints}
                repositoryId={repositoryId}
                autoFillSuppressed={field.id in autoFillSuppressed}
                ruleLocked={Boolean(evaluatedFieldStates[field.id]?.disabled)}
                value={formModel[field.id]}
                error={(() => {
                  if (!hasAttemptedSubmit) return undefined
                  const richErr =
                    validationErrors[String(field.id)] ||
                    (field.jsonId ? validationErrors[String(field.jsonId)] : undefined)
                  if (richErr) return richErr
                  if (
                    missingMandatoryFieldIds?.has(String(field.id)) ||
                    (field.jsonId && missingMandatoryFieldIds?.has(String(field.jsonId)))
                  )
                    return t`This field is required.`
                  return undefined
                })()}
                isPreparing={
                  Boolean(preparePhase) && preparingFieldId === String(field.id)
                }
                syncReadOnly={Boolean(viewOnly)}
                viewOnly={isFieldEffectiveReadOnly}
                onChange={(value) => handleFieldChangeWithCascade(field.id, value)}
                onMultiFieldChange={(patch) => {
                  Object.entries(patch).forEach(([fId, val]) => {
                    handleFieldChangeWithCascade(fId, val)
                  })
                }}
                onAddAttachments={onAddAttachments}
                onOcrFieldList={onOcrFieldList}
                onOpenAttachment={onOpenAttachment}
                onRequestUpload={
                  onRequestUpload && !isFieldEffectiveReadOnly
                    ? (file) => onRequestUpload(field.id, file)
                    : undefined
                }
              />
            </div>
          )
        })}
      </div>
    )
  }

  const getPanelMeta = (visibleFields: any[]) => {
    const allReadOnly =
      viewOnly ||
      visibleFields.every((field: any) => resolveEffectiveReadOnly(field))
    const requiredFields = visibleFields.filter((field: any) => {
      const state = evaluatedFieldStates[field.id]
      const isReq = state ? state.required : isFieldRequired(field)
      return isReq && !resolveEffectiveReadOnly(field)
    })
    return {
      allReadOnly: Boolean(allReadOnly),
      completedCount: requiredFields.filter((field: any) =>
        isFieldFilled(field, formModel[field.id]),
      ).length,
      errorCount: hasAttemptedSubmit
        ? visibleFields.filter(fieldHasError).length
        : 0,
      requiredCount: requiredFields.length,
    }
  }

  const renderPanelHeader = (
    panel: any,
    panelIndex: number,
    meta: ReturnType<typeof getPanelMeta>,
  ) => (
    <div className='flex items-center justify-between gap-3'>
      <div className='flex items-center gap-3'>
        <div className='flex size-11 shrink-0 items-center justify-center rounded-sm bg-[var(--primary-1)]'>
          <Icon className='size-4 text-[var(--primary-9)]' name='tabler:forms' />
        </div>
        <div className='flex flex-col gap-0.5'>
          <span>{panel.settings?.title || `Section ${panelIndex + 1}`}</span>
          {panel.settings?.description && (
            <span className='text-12 font-normal text-gray-9'>
              {panel.settings.description}
            </span>
          )}
        </div>
      </div>
      {meta.allReadOnly ? (
        <span className='mr-3 shrink-0 self-center text-12 font-medium whitespace-nowrap text-gray-5'>
          {t`Read-Only at this step`}
        </span>
      ) : null}
      {!meta.allReadOnly && !viewOnly && meta.errorCount > 0 ? (
        <span className='mr-3 flex shrink-0 items-center gap-1 self-center text-11 font-semibold whitespace-nowrap text-red-9'>
          <Icon className='size-3.5' name='tabler:alert-circle' />
          {meta.errorCount === 1
            ? t`1 field needs attention`
            : t`${meta.errorCount} fields need attention`}
        </span>
      ) : (
        !meta.allReadOnly &&
        !viewOnly &&
        meta.requiredCount > 0 && (
          <span className='mr-3 flex shrink-0 items-center gap-1 self-center text-11 font-medium whitespace-nowrap text-gray-9'>
            <span
              className={
                meta.completedCount === meta.requiredCount
                  ? 'font-bold text-green-9'
                  : 'font-bold text-primary-9'
              }
            >
              {meta.completedCount}
            </span>{' '}
            of {meta.requiredCount} mandatory fields completed
          </span>
        )
      )}
    </div>
  )

  const stageBar =
    stages && stages.length > 0 ? (
      <WorkflowStageBar
        currentActivityId={currentActivityId}
        stages={stages}
      />
    ) : null

  if (hidePanels) {
    return (
      <WorkflowAttachmentsContext.Provider value={attachments || []}>
        <WorkflowOpenAttachmentContext.Provider value={onOpenAttachment}>
          <div
            className={
            disableOwnScroll
              ? cn(
                  'w-full max-w-full min-w-0 px-4 py-4',
                  presentation === 'extracted' && 'p-4',
                )
              : cn(
                  'w-full max-w-full min-w-0 overflow-x-hidden',
                  presentation === 'extracted' ? 'px-4 pt-2 pb-4' : 'px-4 pt-3 pb-6',
                )
          }
        >
          {stageBar}
          {hiddenFillSyncs}
          <AnimateFadeIn delay={0.1}>
            <div className='flex flex-col gap-6'>
              {panels.map((panel: any, panelIndex: number) => {
                const visibleFields = (panel.fields || []).filter(
                  (field: any) => {
                    const state = evaluatedFieldStates[field.id]
                    const isHiddenByRule = state
                      ? !state.visible
                      : isFieldHidden(field)
                    return (
                      !isHiddenByRule &&
                      !hiddenFieldIds?.has(field.id) &&
                      field.type !== 'DIVIDER'
                    )
                  },
                )
                if (visibleFields.length === 0) return null

                return (
                  <div className='min-w-0' key={panel.id || panelIndex}>
                    {renderVisibleFields(visibleFields)}
                  </div>
                )
              })}
            </div>
          </AnimateFadeIn>
        </div>
      </WorkflowOpenAttachmentContext.Provider>
    </WorkflowAttachmentsContext.Provider>
  )
}

  const content = (
    <div
      className={
        disableOwnScroll
          ? 'w-full max-w-full min-w-0 px-3 py-3'
          : 'w-full max-w-full min-w-0 overflow-x-hidden px-4 py-3'
      }
    >
      {stageBar}
      {hiddenFillSyncs}
      <AnimateFadeIn delay={0.1}>
        <Accordion
          multiple={!exclusive && effectiveLayout !== 'ACCORDION'}
          radius='md'
          value={
            exclusive
              ? openValue || null
              : effectiveLayout === 'ACCORDION'
                ? accordionOpen
                : openPanels
          }
          variant='separated'
          classNames={{
            chevron: 'text-gray-10',
            content: 'p-0',
            control: 'rounded-xl px-3 py-1.5 transition-colors hover:bg-gray-1',
            item: 'mb-2 h-auto min-w-0 overflow-hidden rounded-xl border border-gray-3 bg-gray-0 shadow-2xs transition-shadow hover:shadow-sm',
            label: 'py-0 text-13 font-bold tracking-tight text-gray-13',
            panel: 'h-auto min-w-0 overflow-hidden border-t border-gray-3 px-4 py-3',
          }}
          onChange={(value) => {
            if (!exclusive && effectiveLayout === 'ACCORDION') {
              setAccordionOpen(typeof value === 'string' ? value : null)
              return
            }
            if (!exclusive) {
              setOpenPanels(Array.isArray(value) ? value : [])
              return
            }
            onOpenChange?.(typeof value === 'string' ? value : null)
          }}
        >
          {visiblePanels.map(({ panel, panelIndex, value, visibleFields }) => {
            const meta = getPanelMeta(visibleFields)

            return (
              <Accordion.Item
                className={cn('scroll-mt-3', meta.errorCount > 0 && '!border-red-6')}
                data-portal-section={value}
                key={panel.id || panelIndex}
                value={value}
              >
                <span
                  className='block h-px'
                  data-portal-section={value}
                  id={value}
                  aria-hidden
                />
                <Accordion.Control>
                  {renderPanelHeader(panel, panelIndex, meta)}
                </Accordion.Control>
                <Accordion.Panel>
                  {renderVisibleFields(visibleFields)}
                </Accordion.Panel>
              </Accordion.Item>
            )
          })}
        </Accordion>
      </AnimateFadeIn>
    </div>
  )

  const activeStep = visiblePanels[currentStep]
  const isLastStep = currentStep >= visiblePanels.length - 1
  const stepperContent = activeStep ? (
    <div
      className={
        disableOwnScroll
          ? 'w-full max-w-full min-w-0 px-3 py-3'
          : 'w-full max-w-full min-w-0 overflow-x-hidden px-4 py-3'
      }
    >
      <div className='scroll-mt-3' ref={stepTopRef} />
      {stageBar}
      {hiddenFillSyncs}
      {visiblePanels.length > 1 && (
        <div className='mb-3 flex flex-col gap-2.5'>
          <div className='flex items-center justify-between gap-3'>
            <span className='text-11 font-semibold tracking-wider text-gray-10 uppercase'>
              {t`Step ${currentStep + 1} of ${visiblePanels.length}`}
            </span>
            <span className='text-11 font-medium text-gray-9'>
              {Math.round(((currentStep + 1) / visiblePanels.length) * 100)}%
            </span>
          </div>
          <div className='h-1.5 w-full overflow-hidden rounded-full bg-gray-3'>
            <div
              className='h-full rounded-full bg-primary-9 transition-all duration-500'
              style={{
                width: `${((currentStep + 1) / visiblePanels.length) * 100}%`,
              }}
            />
          </div>
          <div className='custom-scrollbar flex gap-1.5 overflow-x-auto pb-1'>
            {visiblePanels.map(({ panel, panelIndex, visibleFields }, idx) => {
              const meta = getPanelMeta(visibleFields)
              const isActive = idx === currentStep
              const isComplete =
                !isActive &&
                meta.requiredCount > 0 &&
                meta.completedCount === meta.requiredCount
              return (
                <button
                  key={panel.id || panelIndex}
                  type='button'
                  className={cn(
                    'flex shrink-0 cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 text-12 font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary-6 active:scale-[0.98]',
                    isActive
                      ? 'border-primary-6 bg-primary-1 text-primary-11'
                      : meta.errorCount > 0
                        ? 'border-red-6 bg-surface text-red-9 hover:bg-red-1'
                        : 'border-gray-3 bg-surface text-gray-11 hover:border-primary-5 hover:text-gray-13',
                  )}
                  onClick={() => goToStep(idx)}
                >
                  <span
                    className={cn(
                      'flex size-5 items-center justify-center rounded-full text-11 font-bold',
                      isActive
                        ? 'bg-primary-9 text-white'
                        : meta.errorCount > 0
                          ? 'bg-red-9 text-white'
                          : isComplete
                            ? 'bg-green-9 text-white'
                            : 'bg-gray-3 text-gray-11',
                    )}
                  >
                    {meta.errorCount > 0 && !isActive ? (
                      <Icon className='size-3' name='tabler:exclamation-mark' />
                    ) : isComplete ? (
                      <Icon className='size-3' name='tabler:check' />
                    ) : (
                      idx + 1
                    )}
                  </span>
                  <span className='max-w-40 truncate'>
                    {panel.settings?.title || `Section ${panelIndex + 1}`}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
      <AnimateFadeIn delay={0.05} key={activeStep.value}>
        {(() => {
          const meta = getPanelMeta(activeStep.visibleFields)
          return (
            <div
              data-portal-section={activeStep.value}
              id={activeStep.value}
              className={cn(
                'min-w-0 overflow-hidden rounded-xl border border-gray-3 bg-gray-0 shadow-2xs',
                meta.errorCount > 0 && '!border-red-6',
              )}
            >
              <div className='px-3 py-1.5 text-13 font-bold tracking-tight text-gray-13'>
                {renderPanelHeader(activeStep.panel, activeStep.panelIndex, meta)}
              </div>
              <div className='min-w-0 overflow-hidden border-t border-gray-3 px-4 py-3'>
                {renderVisibleFields(activeStep.visibleFields)}
              </div>
            </div>
          )
        })()}
      </AnimateFadeIn>
      {visiblePanels.length > 1 && (
        <div className='mt-3 flex items-center justify-between gap-3'>
          <Button
            color='gray'
            disabled={currentStep === 0}
            icon='tabler:arrow-left'
            label={t`Back`}
            size='sm'
            variant='outline'
            onClick={() => goToStep(currentStep - 1)}
          />
          {isLastStep ? (
            <span className='text-12 font-medium text-gray-9'>
              {t`Last section — review and submit`}
            </span>
          ) : (
            <Button
              label={t`Next`}
              size='sm'
              suffixIcon='tabler:arrow-right'
              onClick={() => goToStep(currentStep + 1)}
            />
          )}
        </div>
      )}
    </div>
  ) : (
    content
  )

  const body = effectiveLayout === 'SINGLE' ? stepperContent : content
  const rendered = disableOwnScroll ? (
    body
  ) : (
    <div className='h-full min-h-0 w-full min-w-0 overflow-hidden'>
      <ScrollArea className='h-full w-full min-w-0' height='100%'>
        {body}
      </ScrollArea>
    </div>
  )

  return (
    <WorkflowAttachmentsContext.Provider value={attachments || []}>
      <WorkflowOpenAttachmentContext.Provider value={onOpenAttachment}>
        {rendered}
      </WorkflowOpenAttachmentContext.Provider>
    </WorkflowAttachmentsContext.Provider>
  )
}

WorkflowFormRenderer.displayName = 'WorkflowFormRenderer'
export default WorkflowFormRenderer
