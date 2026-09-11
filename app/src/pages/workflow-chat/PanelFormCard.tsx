import { FileText, Loader2, Upload } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { uploadForOcr } from '@/api/v6/folder/folder'
import FieldRenderer from '@/pages/requests/components/workflow-request/components/FieldRenderer'
import {
  buildFormFieldOcrHints,
  getColumnSizeClass,
  isFieldFilled,
  isFieldHidden,
  isFieldReadOnly,
  isFieldRequired,
  mapOcrFieldsToModel,
  mergeOcrFieldHints,
} from '@/pages/requests/components/workflow-request/utils/fieldRendering'
import {
  type ParsedDoc,
  type ParsedField,
} from '@/services/ai/workflowChatAi'
import cn from '@/utils/cn'

export type PanelFormPayload = {
  docs: ParsedDoc[]
  fields: ParsedField[]
  panelIndex: number
  title: string
  completed?: boolean
}

/** Same shape as request-page FILE_UPLOAD values before staging. */
export type ChatAttachedFile = {
  fileName: string
  fieldId?: string
  fieldName?: string
  fileId?: string
  ocrChecked?: boolean
  ocrFieldList?: { name?: string; type?: string | null; value?: string }[]
  ocrJson?: string
  rawFile?: File
  repositoryId?: string
}

type PanelFormCardProps = {
  answers: Record<string, any>
  attachedFiles?: Record<string, ChatAttachedFile>
  docsMap: Record<string, string>
  /** Workflow stage Security → Visible Fields (same as request page). */
  hiddenFieldIds?: Set<string>
  isExpanded?: boolean
  /** Workflow stage Security → Mandatory Fields (same as request page). */
  mandatoryFieldIds?: Set<string>
  panels: any[]
  payload: PanelFormPayload
  /** Workflow stage Security → Editable Fields (same as request page). */
  readOnlyFieldIds?: Set<string>
  repositoryId?: string | null
  onAnswerChange?: (fieldId: string, value: any) => void
  onContinue: (next: {
    answers: Record<string, any>
    attachedFiles: Record<string, ChatAttachedFile>
    docsMap: Record<string, string>
  }) => void
}

const isEmptyValue = (value: any) =>
  value === undefined || value === null || String(value).trim() === ''

const fieldIsRequired = (
  field: ParsedField,
  mandatoryFieldIds?: Set<string>,
) => {
  if (
    field.required ||
    isFieldRequired(field.rawControl) ||
    field.rawControl?.settings?.validation?.fieldRule === 'REQUIRED'
  ) {
    return true
  }
  if (!mandatoryFieldIds?.size) return false
  if (mandatoryFieldIds.has(String(field.id))) return true
  const raw = field.rawControl
  if (!raw) return false
  return [raw.jsonId, raw.id, raw.name, raw.columnName]
    .filter(Boolean)
    .some((key) => mandatoryFieldIds.has(String(key)))
}

const docIsRequired = (doc: ParsedDoc, mandatoryFieldIds?: Set<string>) => {
  if (doc.required) return true
  if (!mandatoryFieldIds?.size) return false
  if (mandatoryFieldIds.has(String(doc.id))) return true
  const raw = doc.rawControl
  if (!raw) return false
  return [raw.jsonId, raw.id, raw.name, raw.columnName]
    .filter(Boolean)
    .some((key) => mandatoryFieldIds.has(String(key)))
}

/** Match request-page WorkflowFormRenderer: form JSON hide + stage hide sets. */
const isParsedFieldHidden = (
  field: ParsedField,
  hiddenFieldIds?: Set<string>,
) => {
  const formField = field.rawControl || field
  return (
    isFieldHidden(formField) ||
    Boolean(hiddenFieldIds?.has(String(field.id)))
  )
}

const isParsedDocHidden = (
  doc: ParsedDoc,
  hiddenFieldIds?: Set<string>,
) => {
  if (doc.rawControl && isFieldHidden(doc.rawControl)) return true
  return Boolean(hiddenFieldIds?.has(String(doc.id)))
}

/** Build a FieldRenderer-compatible field from chat ParsedField. */
const toFormField = (
  field: ParsedField,
  mandatoryFieldIds?: Set<string>,
) => {
  // Always key by ParsedField.id (jsonId-first) so draft answers, panels,
  // and startWorkflowJson formData stay aligned with the request page.
  const id = field.id
  const required = fieldIsRequired(field, mandatoryFieldIds)

  if (field.rawControl && field.rawControl.type) {
    return {
      ...field.rawControl,
      id,
      jsonId: field.rawControl.jsonId || id,
      label: field.rawControl.label || field.label,
      settings: {
        ...field.rawControl.settings,
        validation: {
          ...field.rawControl.settings?.validation,
          fieldRule: required ? 'REQUIRED' : field.rawControl.settings?.validation?.fieldRule || 'OPTIONAL',
        },
      },
    }
  }

  const type = String(field.type || 'SHORT_TEXT').toUpperCase()
  const isSelect =
    type.includes('SELECT') ||
    type.includes('CHOICE') ||
    type === 'YES_NO_TOGGLE'

  return {
    id,
    jsonId: id,
    label: field.label,
    type:
      type === 'SELECT' || type === 'DROPDOWN'
        ? 'SINGLE_SELECT'
        : type === 'TEXT' || type === 'STRING'
          ? 'SHORT_TEXT'
          : type === 'TEXTAREA' || type === 'LONG'
            ? 'LONG_TEXT'
            : type === 'TABLE' || type === 'LINEITEM'
              ? 'TABLE'
              : type,
    settings: {
      general: {
        placeholder: field.placeholder || field.tipExample || '',
        size: 'col-4',
      },
      specific: isSelect
        ? {
            customOptions: (field.options || []).join(','),
            optionsType: 'CUSTOM',
            separateOptionsUsing: 'COMMA',
          }
        : {},
      validation: {
        fieldRule: required ? 'REQUIRED' : 'OPTIONAL',
      },
    },
  }
}

export default function PanelFormCard({
  answers,
  attachedFiles = {},
  docsMap,
  hiddenFieldIds,
  isExpanded = false,
  mandatoryFieldIds,
  panels,
  payload,
  readOnlyFieldIds,
  repositoryId,
  onAnswerChange,
  onContinue,
}: PanelFormCardProps) {
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const [draftAnswers, setDraftAnswers] = useState<Record<string, any>>(() => {
    const next: Record<string, any> = {}
    for (const field of payload.fields) {
      if (!isEmptyValue(answers[field.id])) next[field.id] = answers[field.id]
    }
    return next
  })
  const [draftDocs, setDraftDocs] = useState<Record<string, string>>(() => {
    const next: Record<string, string> = {}
    for (const doc of payload.docs) {
      if (docsMap[doc.id]) next[doc.id] = docsMap[doc.id]
    }
    return next
  })
  const [draftAttachedFiles, setDraftAttachedFiles] = useState<
    Record<string, ChatAttachedFile>
  >(() => {
    const next: Record<string, ChatAttachedFile> = {}
    for (const doc of payload.docs) {
      if (attachedFiles[doc.id]) next[doc.id] = attachedFiles[doc.id]
    }
    return next
  })
  const [ocrBusyDocId, setOcrBusyDocId] = useState<string | null>(null)
  const [ocrHint, setOcrHint] = useState('')

  useEffect(() => {
    if (payload.completed) return
    setDraftAnswers((prev) => {
      const next = { ...prev }
      for (const field of payload.fields) {
        if (isEmptyValue(next[field.id]) && !isEmptyValue(answers[field.id])) {
          next[field.id] = answers[field.id]
        }
      }
      return next
    })
  }, [answers, payload.completed, payload.fields])

  const visibleDocs = useMemo(
    () =>
      payload.docs.filter((doc) => !isParsedDocHidden(doc, hiddenFieldIds)),
    [hiddenFieldIds, payload.docs],
  )

  const visibleFields = useMemo(
    () =>
      payload.fields.filter(
        (field) => !isParsedFieldHidden(field, hiddenFieldIds),
      ),
    [hiddenFieldIds, payload.fields],
  )

  const orderedFields = useMemo(() => {
    const required = visibleFields.filter((field) =>
      fieldIsRequired(field, mandatoryFieldIds),
    )
    const optional = visibleFields.filter(
      (field) => !fieldIsRequired(field, mandatoryFieldIds),
    )
    return [...required, ...optional]
  }, [mandatoryFieldIds, visibleFields])

  const canContinue = useMemo(() => {
    if (payload.completed) return false
    for (const doc of visibleDocs) {
      if (docIsRequired(doc, mandatoryFieldIds) && !draftDocs[doc.id]) {
        return false
      }
    }
    for (const field of visibleFields) {
      if (!fieldIsRequired(field, mandatoryFieldIds)) continue
      const value = draftAnswers[field.id]
      const formField = toFormField(field, mandatoryFieldIds)
      if (!isFieldFilled(formField, value)) return false
    }
    return true
  }, [
    draftAnswers,
    draftDocs,
    mandatoryFieldIds,
    payload.completed,
    visibleDocs,
    visibleFields,
  ])

  const setFieldValue = (fieldId: string, value: any) => {
    setDraftAnswers((prev) => ({ ...prev, [fieldId]: value }))
    onAnswerChange?.(fieldId, value)
  }

  const runOcrFill = async (doc: ParsedDoc, file: File) => {
    const baseEntry: ChatAttachedFile = {
      fieldId: doc.id,
      fieldName: doc.label,
      fileName: file.name,
      ocrChecked: false,
      rawFile: file,
      repositoryId: repositoryId || undefined,
    }
    setDraftDocs((prev) => ({ ...prev, [doc.id]: file.name }))
    setDraftAttachedFiles((prev) => ({ ...prev, [doc.id]: baseEntry }))

    if (!repositoryId) {
      setDraftAttachedFiles((prev) => ({
        ...prev,
        [doc.id]: { ...baseEntry, ocrChecked: true },
      }))
      setOcrHint(
        'File attached. Repository OCR is unavailable for this workflow.',
      )
      return
    }

    setOcrBusyDocId(doc.id)
    setOcrHint('Extracting data from your document…')
    try {
      const uploadField = doc.rawControl
      const hints = mergeOcrFieldHints(
        buildFormFieldOcrHints(
          panels,
          payload.fields.map((field) => field.id),
        ),
        buildFormFieldOcrHints(
          panels,
          uploadField?.settings?.validation?.assignOtherControls,
        ),
        payload.fields.map(
          (field) =>
            `${field.label},${field.rawControl?.type || field.type || 'SHORT_TEXT'}`,
        ),
      )

      const { data, error } = await uploadForOcr(
        String(repositoryId),
        file,
        hints,
      )
      if (error || !data) {
        setDraftAttachedFiles((prev) => ({
          ...prev,
          [doc.id]: { ...baseEntry, ocrChecked: true },
        }))
        setOcrHint('File attached. Could not extract fields automatically.')
        return
      }

      setDraftAttachedFiles((prev) => ({
        ...prev,
        [doc.id]: {
          ...baseEntry,
          ocrChecked: true,
          ocrFieldList: data.ocrFieldList,
          ocrJson: data.ocrJson,
          repositoryId: String(repositoryId),
        },
      }))

      const patch = mapOcrFieldsToModel(panels, data.ocrFieldList)
      if (Object.keys(patch).length === 0) {
        const byLabel = new Map(
          payload.fields.map((field) => [
            field.label.replace(/\*/g, '').trim().toLowerCase(),
            field.id,
          ]),
        )
        for (const item of data.ocrFieldList || []) {
          const name = String(item?.name || '')
            .split(',')[0]
            .trim()
            .toLowerCase()
          const fieldId = byLabel.get(name)
          if (fieldId && item?.value) patch[fieldId] = item.value
        }
      }

      setDraftAnswers((prev) => {
        const next = { ...prev }
        for (const [key, value] of Object.entries(patch)) {
          if (isEmptyValue(next[key])) next[key] = value
        }
        return next
      })
      for (const [key, value] of Object.entries(patch)) {
        if (isEmptyValue(draftAnswers[key]) && !isEmptyValue(value)) {
          onAnswerChange?.(key, value)
        }
      }
      const filled = Object.keys(patch).length
      setOcrHint(
        filled > 0
          ? `Extracted ${filled} field${filled === 1 ? '' : 's'} from the document.`
          : 'File attached. Review and complete any remaining fields.',
      )
    } catch {
      setDraftAttachedFiles((prev) => ({
        ...prev,
        [doc.id]: { ...baseEntry, ocrChecked: true },
      }))
      setOcrHint('File attached. OCR failed — please fill the fields manually.')
    } finally {
      setOcrBusyDocId(null)
    }
  }

  const fieldColumnClass = (field: ParsedField) => {
    if (!isExpanded) return 'w-full'
    const formField = toFormField(field, mandatoryFieldIds)
    const type = String(formField.type || '').toUpperCase()
    if (
      type === 'TABLE' ||
      type === 'DYNAMIC_TABLE' ||
      type === 'LONG_TEXT' ||
      type === 'TEXT_BUILDER' ||
      type === 'FILE_UPLOAD' ||
      type === 'IMAGE_UPLOAD'
    ) {
      return getColumnSizeClass(
        formField.settings?.general?.size || 'col-12',
      )
    }
    return getColumnSizeClass(formField.settings?.general?.size || 'col-4')
  }

  return (
    <div className='-mt-0.5 ml-[40px] w-[calc(100%_-_40px)] max-w-[720px] rounded-2xl border border-gray-5 bg-surface p-4 shadow-xs'>
      <div className='mb-3 flex items-start justify-between gap-3'>
        <div>
          <div className='text-sm font-bold text-gray-12'>{payload.title}</div>
          <div className='mt-0.5 text-[11px] text-gray-9'>
            {visibleDocs.length > 0
              ? 'Upload documents first, then complete the fields.'
              : 'Fill in the details below, then continue.'}
          </div>
        </div>
        {payload.completed ? (
          <span className='rounded-full bg-green-2 px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-green-11 uppercase'>
            Done
          </span>
        ) : (
          <span className='rounded-full bg-primary-2 px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-primary-11 uppercase'>
            {visibleFields.filter((field) =>
              fieldIsRequired(field, mandatoryFieldIds),
            ).length}{' '}
            required
          </span>
        )}
      </div>

      {visibleDocs.length > 0 ? (
        <div className='mb-3 space-y-2'>
          {visibleDocs.map((doc) => {
            const attachedName = draftDocs[doc.id]
            const busy = ocrBusyDocId === doc.id
            const required = docIsRequired(doc, mandatoryFieldIds)
            return (
              <div
                key={doc.id}
                className='rounded-xl border border-dashed border-gray-6 bg-gray-1 p-3'
              >
                <div className='mb-2 flex items-center justify-between gap-2'>
                  <span className='text-xs font-semibold text-gray-12'>
                    {doc.label}
                    {required ? (
                      <span className='ml-0.5 text-red-9'>*</span>
                    ) : null}
                  </span>
                  <span className='text-[10px] font-bold tracking-wide text-gray-9 uppercase'>
                    {required ? 'Required' : 'Optional'}
                  </span>
                </div>
                {attachedName ? (
                  <div className='flex items-center gap-2 rounded-lg border border-gray-4 bg-surface px-3 py-2 text-xs text-gray-12'>
                    {busy ? (
                      <Loader2 className='h-3.5 w-3.5 animate-spin text-primary-9' />
                    ) : (
                      <FileText className='h-3.5 w-3.5 text-primary-9' />
                    )}
                    <span className='min-w-0 flex-1 truncate font-medium'>
                      {attachedName}
                    </span>
                    {!payload.completed ? (
                      <button
                        className='shrink-0 text-[11px] font-semibold text-primary-9 hover:underline'
                        type='button'
                        onClick={() =>
                          fileInputRefs.current[doc.id]?.click()
                        }
                      >
                        Replace
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <button
                    className='flex w-full cursor-pointer flex-col items-center gap-1.5 rounded-lg border border-dashed border-gray-7 px-3 py-4 text-center transition hover:border-primary-9 hover:bg-primary-1/40 disabled:cursor-not-allowed disabled:opacity-60'
                    disabled={payload.completed || busy}
                    type='button'
                    onClick={() => fileInputRefs.current[doc.id]?.click()}
                  >
                    <Upload className='h-4 w-4 text-primary-9' />
                    <span className='text-xs font-bold text-gray-12'>
                      Upload {doc.label}
                    </span>
                    <span className='text-[11px] text-gray-9'>
                      {doc.accept || '.pdf,.jpg,.png'}
                    </span>
                  </button>
                )}
                <input
                  accept={doc.accept}
                  className='hidden'
                  ref={(node) => {
                    fileInputRefs.current[doc.id] = node
                  }}
                  type='file'
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (!file || payload.completed) return
                    void runOcrFill(doc, file)
                    event.target.value = ''
                  }}
                />
              </div>
            )
          })}
          {ocrHint ? (
            <p className='text-[11px] font-medium text-primary-11'>{ocrHint}</p>
          ) : null}
        </div>
      ) : null}

      <div className='-mx-2 flex max-w-full min-w-0 flex-wrap'>
        {orderedFields.map((field) => {
          const formField = toFormField(field, mandatoryFieldIds)
          const fieldReadOnly =
            Boolean(payload.completed) ||
            isFieldReadOnly(formField) ||
            Boolean(readOnlyFieldIds?.has(String(field.id)))
          return (
            <div
              className={cn(
                fieldColumnClass(field),
                'max-w-full min-w-0 px-2 pb-3',
              )}
              key={field.id}
            >
              <FieldRenderer
                field={formField}
                formModel={draftAnswers}
                panels={panels}
                repositoryId={repositoryId || undefined}
                value={draftAnswers[field.id]}
                viewOnly={fieldReadOnly}
                onChange={(value) => setFieldValue(field.id, value)}
              />
            </div>
          )
        })}
      </div>

      {!payload.completed ? (
        <div className='mt-1 flex items-center justify-between gap-3 border-t border-gray-4 pt-3'>
          <p className='text-[11px] text-gray-9'>
            {canContinue
              ? 'All required fields are complete.'
              : 'Fill all mandatory fields to continue.'}
          </p>
          <button
            className={cn(
              'inline-flex h-9 items-center justify-center rounded-lg px-4 text-xs font-bold transition',
              canContinue
                ? 'bg-primary-9 text-white hover:bg-primary-10 active:scale-[0.98]'
                : 'cursor-not-allowed bg-gray-4 text-gray-8',
            )}
            disabled={!canContinue || Boolean(ocrBusyDocId)}
            type='button'
            onClick={() => {
              // Prefer draft values; never let stale empty parent answers win.
              const merged: Record<string, any> = { ...answers }
              for (const [key, value] of Object.entries(draftAnswers)) {
                if (value !== undefined) merged[key] = value
              }
              onContinue({
                answers: merged,
                attachedFiles: { ...attachedFiles, ...draftAttachedFiles },
                docsMap: { ...docsMap, ...draftDocs },
              })
            }}
          >
            Continue
          </button>
        </div>
      ) : null}
    </div>
  )
}
