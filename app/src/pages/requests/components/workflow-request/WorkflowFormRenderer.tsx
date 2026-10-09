import { useLingui } from '@lingui/react/macro'
import { Accordion } from '@mantine/core'
import { useEffect, useMemo, useState } from 'react'
import Icon from '@/components/base/icon/Icon'
import ScrollArea from '@/components/base/scroll-area/ScrollArea'
import Tooltip from '@/components/base/Tooltip'
import AnimateFadeIn from '@/components/common/animations/AnimateFadeIn'
import { evaluateFormRules } from '@/pages/form-builder/helpers/ruleEngine'
import { getFieldAttachmentMap } from '@/pages/requests/utils/fieldAttachmentMap'
import cn from '@/utils/cn'
import ExtractedFieldCell from './components/ExtractedFieldCell'
import FieldRenderer from './components/FieldRenderer'
import {
  getColumnSizeClass,
  getDependentChildFieldIds,
  isFieldFilled,
  isFieldHidden,
  isFieldReadOnly,
  isFieldRequired,
} from './utils/fieldRendering'
import { getFirstReceivedAttachment } from './utils/gmailFormAttachment'

const STAGE_PAGE_SIZE = 8

function stageWindowStart(activeIndex: number, total: number) {
  if (total <= STAGE_PAGE_SIZE || activeIndex < 0) return 0
  const maxStart = total - STAGE_PAGE_SIZE
  const centered = activeIndex - Math.floor((STAGE_PAGE_SIZE - 1) / 2)
  return Math.min(Math.max(0, centered), maxStart)
}

function WorkflowStageBar({
  currentActivityId,
  stages,
}: {
  currentActivityId?: string
  stages: { id: string; label: string }[]
}) {
  const { t } = useLingui()
  const activeIndex = stages.findIndex(
    (stage) => String(stage.id) === String(currentActivityId || ''),
  )
  const shown = stages
    .map((stage, index) => ({ index, stage }))
    .slice(0, activeIndex < 0 ? 1 : Math.min(stages.length, activeIndex + 2))
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
    <div className='mb-4 flex items-start gap-1 rounded-xl border border-gray-3 bg-gray-0 px-2 py-3'>
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
      <div className='min-w-0 flex-1 overflow-hidden'>
        <div
          className='flex items-start transition-transform duration-300 ease-in-out'
          style={{
            transform: `translateX(-${shown.length ? (start * 100) / shown.length : 0}%)`,
            width: `${(shown.length / visibleCount) * 100}%`,
          }}
        >
          {shown.map(({ index, stage }) => {
            const done = activeIndex >= 0 && index < activeIndex
            const current = activeIndex === index
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
                        : done || current
                          ? 'bg-green-9'
                          : 'bg-gray-4',
                    )}
                  />
                  <div className='relative shrink-0'>
                    {current ? (
                      <span className='absolute inset-0 animate-ping rounded-full bg-primary-7' />
                    ) : null}
                    <div
                      className={cn(
                        'relative flex size-6 items-center justify-center rounded-full text-11 font-semibold',
                        done && 'bg-green-9 text-green-1',
                        current && 'bg-primary-9 text-primary-1',
                        !done &&
                          !current &&
                          'border border-gray-5 bg-gray-0 text-gray-10',
                      )}
                    >
                      {done ? (
                        <Icon className='size-3.5' name='tabler:check' />
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
                        : index < activeIndex
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
                      current
                        ? 'font-semibold text-primary-11'
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
  'FILE_UPLOAD',
  'IMAGE_UPLOAD',
  'SIGNATURE',
  'CHECKBOX',
  'MULTI_SELECT',
  'MULTIPLE_CHOICE',
  'USER',
  'USERS',
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
  hasAttemptedSubmit?: boolean
  // Field ids hidden from the current acting user by the current stage's
  // Security & Form Access settings (formVisibilityAccess / formSecureControls).
  hiddenFieldIds?: Set<string>
  hidePanels?: boolean
  // Overview only — scopes the local field↔attachment map to this request.
  instanceId?: string | number
  missingMandatoryFieldIds?: Set<string>
  openValue?: string | null
  preparePhase?: 'extracting' | 'uploading' | null
  preparingFieldId?: string | null
  // AP-style dense label/value grid (click-to-edit) instead of Input cards.
  presentation?: 'default' | 'extracted'
  // Field ids the current acting user can see but not edit, from the same
  // Security & Form Access settings (formEditAccess / formEditControls).
  readOnlyFieldIds?: Set<string>
  repoFieldHints?: string[]
  repositoryId?: string
  stages?: { id: string; label: string }[]
  viewOnly?: boolean
  getPanelValue?: (panel: any, index: number) => string
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
  hasAttemptedSubmit,
  hiddenFieldIds,
  hidePanels,
  instanceId,
  missingMandatoryFieldIds,
  openValue,
  panels,
  preparePhase,
  preparingFieldId,
  presentation = 'default',
  readOnlyFieldIds,
  repoFieldHints,
  repositoryId,
  stages,
  viewOnly,
  getPanelValue,
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
        .filter((field: any) => FILE_FIELD_TYPES.has(field.type))
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
    () => evaluateFormRules(panels, formModel),
    [panels, formModel],
  )

  const handleFieldChangeWithCascade = (fieldId: string, value: any) => {
    onFieldChange(fieldId, value)
    const dependentChildIds = getDependentChildFieldIds(fieldId, panels)
    for (const childId of dependentChildIds) {
      if (
        formModel?.[childId] !== undefined &&
        formModel?.[childId] !== null &&
        formModel?.[childId] !== ''
      ) {
        onFieldChange(childId, null)
      }
    }
  }

  const resolvePanelValue = (panel: any, index: number) =>
    getPanelValue?.(panel, index) || `panel-${index}`

  const renderVisibleFields = (visibleFields: any[]) => {
    if (presentation === 'extracted') {
      const scalarFields = visibleFields.filter(
        (field) =>
          !EXTRACTED_FALLBACK_TYPES.has(String(field.type || '').toUpperCase()),
      )
      const complexFields = visibleFields.filter((field) =>
        EXTRACTED_FALLBACK_TYPES.has(String(field.type || '').toUpperCase()),
      )

      return (
        <div className='flex max-w-full min-w-0 flex-col gap-6'>
          <div className='grid grid-cols-1 gap-x-4 gap-y-1 md:grid-cols-2'>
            {scalarFields.map((field: any) => {
              const fieldError =
                hasAttemptedSubmit &&
                (missingMandatoryFieldIds?.has(String(field.id)) ||
                  (field.jsonId &&
                    missingMandatoryFieldIds?.has(String(field.jsonId))))
                  ? t`This field is required.`
                  : undefined
              const isReadOnly =
                viewOnly ||
                Boolean(readOnlyFieldIds?.has(String(field.id))) ||
                isFieldReadOnly(field)

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
            const isTableField =
              field.type === 'TABLE' || field.type === 'DYNAMIC_TABLE'
            const sizeClass = getColumnSizeClass(
              isTableField
                ? field.settings?.general?.size || 'col-12'
                : field.settings?.general?.size,
            )
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
                  panels={panels}
                  preparePhase={preparePhase}
                  repoFieldHints={repoFieldHints}
                  repositoryId={repositoryId}
                  value={formModel[field.id]}
                  error={
                    hasAttemptedSubmit &&
                    (missingMandatoryFieldIds?.has(String(field.id)) ||
                      (field.jsonId &&
                        missingMandatoryFieldIds?.has(String(field.jsonId))))
                      ? t`This field is required.`
                      : undefined
                  }
                  isPreparing={
                    Boolean(preparePhase) &&
                    preparingFieldId === String(field.id)
                  }
                  viewOnly={
                    viewOnly || Boolean(readOnlyFieldIds?.has(String(field.id)))
                  }
                  onChange={(value) => handleFieldChangeWithCascade(field.id, value)}
                  onOcrFieldList={onOcrFieldList}
                  onOpenAttachment={onOpenAttachment}
                  onRequestUpload={
                    onRequestUpload &&
                    !viewOnly &&
                    !readOnlyFieldIds?.has(String(field.id))
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
          const isTableField =
            field.type === 'TABLE' || field.type === 'DYNAMIC_TABLE'
          const isSectionHeading = field.type === 'HEADING'
          const sizeClass = isSectionHeading
            ? 'w-full'
            : getColumnSizeClass(
                isTableField
                  ? field.settings?.general?.size || 'col-12'
                  : field.settings?.general?.size,
              )
          const state = evaluatedFieldStates[field.id]
          const isReadOnlyByRule = Boolean(state?.disabled)
          const isRequiredByRule = state
            ? state.required
            : isFieldRequired(field)

          return (
            <div
              data-field-id={field.id}
              key={field.id}
              className={cn(
                sizeClass,
                'max-w-full min-w-0 px-2',
                isTableField ? 'pb-3' : 'pb-2',
              )}
            >
              <FieldRenderer
                fallbackAttachments={attachmentsByField[field.id]}
                field={field}
                formModel={formModel}
                panels={panels}
                preparePhase={preparePhase}
                repoFieldHints={repoFieldHints}
                repositoryId={repositoryId}
                value={formModel[field.id]}
                error={
                  hasAttemptedSubmit &&
                  ((isRequiredByRule && !formModel[field.id]) ||
                    missingMandatoryFieldIds?.has(String(field.id)) ||
                    (field.jsonId &&
                      missingMandatoryFieldIds?.has(String(field.jsonId))))
                    ? t`This field is required.`
                    : undefined
                }
                isPreparing={
                  Boolean(preparePhase) && preparingFieldId === String(field.id)
                }
                viewOnly={
                  viewOnly ||
                  Boolean(readOnlyFieldIds?.has(String(field.id))) ||
                  isReadOnlyByRule
                }
                onChange={(value) => handleFieldChangeWithCascade(field.id, value)}
                onMultiFieldChange={(patch) => {
                  Object.entries(patch).forEach(([fId, val]) => {
                    handleFieldChangeWithCascade(fId, val)
                  })
                }}
                onOcrFieldList={onOcrFieldList}
                onOpenAttachment={onOpenAttachment}
                onRequestUpload={
                  onRequestUpload &&
                  !viewOnly &&
                  !readOnlyFieldIds?.has(String(field.id)) &&
                  !isReadOnlyByRule
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

  const stageBar =
    stages && stages.length > 0 ? (
      <WorkflowStageBar
        currentActivityId={currentActivityId}
        stages={stages}
      />
    ) : null

  if (hidePanels) {
    return (
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
      <AnimateFadeIn delay={0.1}>
        <Accordion
          multiple={!exclusive}
          radius='md'
          value={exclusive ? openValue || null : undefined}
          variant='separated'
          classNames={{
            chevron: 'text-gray-10',
            content: 'p-0',
            control: 'rounded-xl px-3 py-1.5 transition-colors hover:bg-gray-1',
            item: 'mb-2 h-auto min-w-0 overflow-hidden rounded-xl border border-gray-3 bg-gray-0 shadow-2xs transition-shadow hover:shadow-sm',
            label: 'py-0 text-13 font-bold tracking-tight text-gray-13',
            panel: 'h-auto min-w-0 overflow-hidden border-t border-gray-3 px-4 py-3',
          }}
          defaultValue={
            exclusive
              ? undefined
              : panels.map((panel, idx) => resolvePanelValue(panel, idx))
          }
          onChange={(value) => {
            if (!exclusive) return
            onOpenChange?.(typeof value === 'string' ? value : null)
          }}
        >
          {panels.map((panel: any, panelIndex: number) => {
            const visibleFields = (panel.fields || []).filter((field: any) => {
              const state = evaluatedFieldStates[field.id]
              const isHiddenByRule = state
                ? !state.visible
                : isFieldHidden(field)
              return !isHiddenByRule && !hiddenFieldIds?.has(field.id)
            })
            if (visibleFields.length === 0) return null

            const allReadOnly =
              viewOnly ||
              visibleFields.every((field: any) => {
                const state = evaluatedFieldStates[field.id]
                return (
                  readOnlyFieldIds?.has(String(field.id)) ||
                  isFieldReadOnly(field) ||
                  Boolean(state?.disabled)
                )
              })

            const requiredFields = visibleFields.filter(
              (field: any) =>
                isFieldRequired(field) &&
                !isFieldReadOnly(field) &&
                !readOnlyFieldIds?.has(String(field.id)),
            )
            const completedCount = requiredFields.filter((field: any) =>
              isFieldFilled(field, formModel[field.id]),
            ).length
            const panelValue = resolvePanelValue(panel, panelIndex)

            return (
              <Accordion.Item
                className='scroll-mt-3'
                data-portal-section={panelValue}
                key={panel.id || panelIndex}
                value={panelValue}
              >
                <span
                  className='block h-px'
                  data-portal-section={panelValue}
                  id={panelValue}
                  aria-hidden
                />
                <Accordion.Control>
                  <div className='flex items-center justify-between gap-3'>
                    <div className='flex items-center gap-3'>
                      <div className='flex size-11 shrink-0 items-center justify-center rounded-sm bg-[var(--primary-1)]'>
                        <Icon
                          className='size-4 text-[var(--primary-9)]'
                          name='tabler:forms'
                        />
                      </div>
                      <div className='flex flex-col gap-0.5'>
                        <span>
                          {panel.settings?.title || `Section ${panelIndex + 1}`}
                        </span>
                        {panel.settings?.description && (
                          <span className='text-12 font-normal text-gray-9'>
                            {panel.settings.description}
                          </span>
                        )}
                      </div>
                    </div>
                    {allReadOnly ? (
                      <span className='mr-3 shrink-0 self-center text-12 font-medium whitespace-nowrap text-gray-5'>
                        {t`Read-Only at this step`}
                      </span>
                    ) : null}
                    {!allReadOnly && !viewOnly && requiredFields.length > 0 && (
                      <span className='mr-3 flex shrink-0 items-center gap-1 self-center text-11 font-medium whitespace-nowrap text-gray-9'>
                        <span
                          className={
                            completedCount === requiredFields.length
                              ? 'font-bold text-green-9'
                              : 'font-bold text-primary-9'
                          }
                        >
                          {completedCount}
                        </span>{' '}
                        of {requiredFields.length} mandatory fields completed
                      </span>
                    )}
                  </div>
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

  return disableOwnScroll ? (
    content
  ) : (
    <div className='h-full min-h-0 w-full min-w-0 overflow-hidden'>
      <ScrollArea className='h-full w-full min-w-0' height='100%'>
        {content}
      </ScrollArea>
    </div>
  )
}

WorkflowFormRenderer.displayName = 'WorkflowFormRenderer'
export default WorkflowFormRenderer
