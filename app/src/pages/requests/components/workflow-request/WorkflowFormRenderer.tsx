import { useLingui } from '@lingui/react/macro'
import { Accordion } from '@mantine/core'
import { useMemo } from 'react'
import Icon from '@/components/base/icon/Icon'
import ScrollArea from '@/components/base/scroll-area/ScrollArea'
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
                  value={formModel[field.id]}
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
          const sizeClass = getColumnSizeClass(
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
                isTableField ? 'pb-6' : 'pb-4',
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

  if (hidePanels) {
    return (
      <div
        className={
          disableOwnScroll
            ? cn(
                'w-full max-w-full min-w-0',
                presentation === 'extracted' && 'p-2',
              )
            : cn(
                'w-full max-w-full min-w-0 overflow-x-hidden',
                presentation === 'extracted' ? 'px-4 py-4' : 'px-6 py-6',
              )
        }
      >
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
          ? 'w-full max-w-full min-w-0'
          : 'w-full max-w-full min-w-0 overflow-x-hidden px-6 py-6'
      }
    >
      <AnimateFadeIn delay={0.1}>
        <Accordion
          multiple={!exclusive}
          radius='md'
          value={exclusive ? openValue || null : undefined}
          variant='separated'
          classNames={{
            chevron: 'text-gray-10',
            content: 'p-0',
            control: 'rounded-xl px-4 py-2.5 transition-colors hover:bg-gray-1',
            item: 'mb-3 min-w-0 overflow-hidden rounded-xl border border-gray-3 bg-gray-0 shadow-2xs transition-shadow hover:shadow-sm',
            label: 'text-14 font-bold tracking-tight text-gray-13',
            panel: 'min-w-0 overflow-hidden px-6 pt-2 pb-6',
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
                      <div className='flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--primary-1)]'>
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
                    {!viewOnly && requiredFields.length > 0 && (
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
