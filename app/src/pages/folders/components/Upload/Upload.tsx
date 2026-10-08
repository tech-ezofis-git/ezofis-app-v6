import { useLingui } from '@lingui/react/macro'
import { useDebouncedCallback, useDebouncedValue } from '@mantine/hooks'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpFromLine, CheckCircle2, Copy, FileText } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  BulkUploadJobStatus,
  IndexStageFileRequest,
  OcrFieldResult,
  StageFileStatus,
  StageFileSummary,
} from '@/api/v6/uploadAndIndex'
import formApi from '@/api/form/form'
import { uploadForOcr } from '@/api/v6/folder/folder'
import {
  bulkUpload,
  deleteStagedFiles,
  fetchStageFileBlob,
  indexStageFile,
  listStagedFiles,
  loadStageFile,
  updateStageFileFields,
  uploadWithOcr,
} from '@/api/v6/uploadAndIndex'
import BaseButton from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import ConfirmDialog from '@/components/base/ConfirmDialog'
import Icon from '@/components/base/icon/Icon'
import InfoCard from '@/components/base/InfoCard'
import InputCheckbox from '@/components/base/inputs/InputCheckbox'
import InputDate from '@/components/base/inputs/InputDate'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputText from '@/components/base/inputs/InputText'
import InputTextarea from '@/components/base/inputs/InputTextarea'
import showToast from '@/components/base/toast/showToast'
import Tooltip from '@/components/base/Tooltip'
import AiBrandIcon from '@/components/common/AiBrandIcon'
import DocumentPreviewViewer from '@/components/common/document-preview/DocumentPreviewViewer'
import cn from '@/utils/cn'
import type { DynamicRepositoryColumn } from '../../api/folderApi'
import type { QueuedFileStatus, QueuedUploadFile } from './uploadQueueTypes'
import {
  DOCUMENT_ACCEPT,
  isImage,
  isPdf,
  isSupportedDocument,
  MAX_SIZE,
} from '../../../requests/components/request/components/newrequest/utils'
import {
  findSelectedOption,
  getSelectOptions,
  normalizeType,
  toTextValue,
} from '../../hooks/useEditMetadataForm'
import { Button } from '../Ui'
// import Icon from './../../../../components/base/icon/Icon'
import {
  AnimateEntrancePop,
  AnimateFadeIn,
  AnimateSlideUp,
  AnimateStagger,
} from './../../../../components/common/animations'
import DraftFilesMediaLibrary from './DraftFilesMediaLibrary'
import TableFieldInput from './TableFieldInput'
import UploadQueueFileCard from './UploadQueueFileCard'
import { useBulkUploadJobPolling } from './useBulkUploadJobPolling'

type ExportStatus = 'idle' | 'exporting' | 'success' | 'error'

interface JsonNodeProps {
  data: unknown
  isLast?: boolean
  level?: number
  name?: string
}

type OcrStatus = 'idle' | 'analyzing' | 'complete' | 'error'

type RepositoryField = {
  dataType: string
  id: string
  includeInFolderStructure?: boolean
  isMandatory?: boolean
  isReadOnly?: boolean
  level?: number
  name: string
  optionsJson?: string | null
  orderId?: number
  sqlColumnName: string
}

type ResultTab = 'fields' | 'json'

type UploadProps = {
  folderId: string | number | null
  initialFiles?: File[]
  initialStagedFileId?: string
  repositoryData: {
    fields?: RepositoryField[]
    id?: string
    name?: string
    storageDrive?: string | null
  } | null
  repositoryId: string | number | null
  onBack: () => void
  onSuccess?: () => void | Promise<void>
}

function JsonNode({ data, isLast = true, name }: JsonNodeProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  if (data === null || data === undefined) {
    return (
      <div className='flex items-center gap-1 font-mono text-xs leading-5'>
        <div className='size-4 shrink-0' />
        {name !== undefined && (
          <span className='text-purple-11 font-semibold'>
            "{name}":{' '}
          </span>
        )}
        <span className='text-gray-9 italic'>null</span>
        {!isLast && <span className='text-gray-8'>,</span>}
      </div>
    )
  }

  if (typeof data === 'boolean') {
    return (
      <div className='flex items-center gap-1 font-mono text-xs leading-5'>
        <div className='size-4 shrink-0' />
        {name !== undefined && (
          <span className='text-purple-11 font-semibold'>
            "{name}":{' '}
          </span>
        )}
        <span className='text-blue-11 font-semibold'>
          {String(data)}
        </span>
        {!isLast && <span className='text-gray-8'>,</span>}
      </div>
    )
  }

  if (typeof data === 'number') {
    return (
      <div className='flex items-center gap-1 font-mono text-xs leading-5'>
        <div className='size-4 shrink-0' />
        {name !== undefined && (
          <span className='text-purple-11 font-semibold'>
            "{name}":{' '}
          </span>
        )}
        <span className='text-yellow-11 font-medium'>
          {data}
        </span>
        {!isLast && <span className='text-gray-8'>,</span>}
      </div>
    )
  }

  if (typeof data === 'string') {
    return (
      <div className='flex items-center gap-1 font-mono text-xs leading-5 break-all'>
        <div className='size-4 shrink-0' />
        {name !== undefined && (
          <span className='text-purple-11 font-semibold'>
            "{name}":{' '}
          </span>
        )}
        <span className='text-green-11'>"{data}"</span>
        {!isLast && <span className='text-gray-8'>,</span>}
      </div>
    )
  }

  const isArray = Array.isArray(data)
  const isObject = typeof data === 'object' && data !== null
  if (!isObject) return null

  const keys = Object.keys(data as Record<string, unknown>)
  const openBracket = isArray ? '[' : '{'
  const closeBracket = isArray ? ']' : '}'
  const itemCount = keys.length

  return (
    <div className='font-mono text-xs leading-5'>
      <div className='flex items-center gap-1'>
        <button
          className='flex size-4 shrink-0 items-center justify-center rounded text-[var(--gray-9)] transition-colors hover:bg-[var(--gray-3)] hover:text-[var(--gray-13)]'
          type='button'
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <Icon
            className={`size-3 transition-transform duration-150 ${isCollapsed ? '' : 'rotate-90'}`}
            name='tabler:chevron-right'
          />
        </button>

        {name !== undefined && (
          <span className='text-purple-11 font-semibold'>
            "{name}":{' '}
          </span>
        )}

        <span className='font-bold text-[var(--gray-12)]'>{openBracket}</span>

        {isCollapsed ? (
          <button
            className='mx-1 rounded bg-[var(--gray-3)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--gray-11)] transition-colors hover:bg-[var(--gray-4)]'
            type='button'
            onClick={() => setIsCollapsed(false)}
          >
            {itemCount} {itemCount === 1 ? 'item' : 'items'} ...
          </button>
        ) : null}

        {isCollapsed ? (
          <span className='font-bold text-[var(--gray-12)]'>
            {closeBracket}
            {!isLast && ','}
          </span>
        ) : null}
      </div>

      {!isCollapsed && (
        <div className='ml-2 border-l border-[var(--gray-4)]/70 pl-2.5'>
          {keys.map((key, index) => {
            const childData = (data as Record<string, any>)[key]
            const isChildLast = index === keys.length - 1
            return (
              <JsonNode
                data={childData}
                isLast={isChildLast}
                key={key}
                name={isArray ? undefined : key}
              />
            )
          })}
        </div>
      )}

      {!isCollapsed && (
        <div className='flex items-center gap-1 font-mono text-xs leading-5'>
          <div className='size-4 shrink-0' />
          <span className='font-bold text-[var(--gray-12)]'>
            {closeBracket}
          </span>
          {!isLast && <span className='text-gray-8'>,</span>}
        </div>
      )}
    </div>
  )
}

const PROCESS_STEP_KEYS = ['Received', 'Analysis', 'Fields', 'Done'] as const
type ProcessStepKey = (typeof PROCESS_STEP_KEYS)[number]

const QUEUE_VERTICAL_THRESHOLD = 6

const getFieldKey = (field: RepositoryField) => field.sqlColumnName || field.id

const isBlankFieldValue = (value: unknown) => {
  const raw = String(value ?? '').trim()
  if (!raw) return true
  const lower = raw.toLowerCase()
  return lower === 'null' || lower === 'undefined'
}

const hasMissingMandatoryFields = (
  fieldValues: Record<string, string>,
  repositoryFields: RepositoryField[],
) =>
  repositoryFields.some((field) => {
    if (!field.isMandatory) return false
    return isBlankFieldValue(fieldValues[getFieldKey(field)])
  })

const getInitialValues = (fields: RepositoryField[]) => {
  return fields.reduce<Record<string, string>>((acc, field) => {
    acc[getFieldKey(field)] = ''
    return acc
  }, {})
}

const formatFileSize = (size?: number) => {
  if (!size) return '0 KB'
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(2)} MB`
}

const formatDraftDate = (value?: string) => {
  if (!value?.trim()) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${day}-${month}-${date.getFullYear()}`
}

const safeJson = (value: unknown) => JSON.stringify(value, null, 2)

const formatOcrFieldDescriptor = (field: RepositoryField) => {
  const fieldName = field.sqlColumnName || field.name
  const fieldType = String(field.dataType || 'text').trim()
  return `${fieldName}, ${fieldType}`
}

const toDynamicColumn = (field: RepositoryField): DynamicRepositoryColumn => {
  const column: DynamicRepositoryColumn & Record<string, unknown> = {
    dataType: field.dataType,
    fieldId: field.id,
    includeInFolderStructure: field.includeInFolderStructure,
    isMandatory: field.isMandatory,
    key: getFieldKey(field),
    label: field.name,
    level: field.level,
  }

  if (field.optionsJson) {
    try {
      column.options = JSON.parse(field.optionsJson)
    } catch {
      // ignore invalid options JSON
    }
  }

  return column
}

const getActiveStepIndex = (
  hasFile: boolean,
  ocrStatus: OcrStatus,
  exportStatus: ExportStatus,
) => {
  if (exportStatus === 'success') return 3
  if (exportStatus === 'exporting') return 3
  if (ocrStatus === 'complete' || ocrStatus === 'error') return 2
  if (ocrStatus === 'analyzing') return 1
  if (hasFile) return 0
  return -1
}

// The queue's own status (kept live by staging/polling) is the source of
// truth for whether OCR is still running - the legacy per-entry ocrStatus
// field is only updated once OCR finishes, so deriving loading state from
// it would never show a loader while staging/OCR is actually in progress.
const deriveOcrStatus = (
  entry: Pick<QueuedUploadFile, 'status'> | null,
): OcrStatus => {
  if (!entry) return 'idle'
  switch (entry.status) {
    case 'queued':
    case 'analyzing':
      return 'analyzing'
    case 'error':
      return 'error'
    case 'ready':
    case 'indexing':
    case 'indexed':
      return 'complete'
    default:
      return 'idle'
  }
}

const isStepComplete = (
  stepIndex: number,
  activeStepIndex: number,
  exportStatus: ExportStatus,
) => {
  if (exportStatus === 'success') return true
  return stepIndex < activeStepIndex
}

type OcrFieldItem = {
  name?: string
  status?: unknown
  value?: unknown
}

type OcrFieldStatusTone = 'green' | 'orange' | 'red'

const getOcrFieldStatusTone = (status: string): OcrFieldStatusTone => {
  const normalized = status.toLowerCase()
  if (
    /(expired|invalid|error|fail|reject|overdue|revoke|denied|dead)/.test(
      normalized,
    )
  ) {
    return 'red'
  }
  if (
    /(valid|active|current|ok|success|complete|pass|good|verified|ready)/.test(
      normalized,
    )
  ) {
    return 'green'
  }
  return 'orange'
}

const OCR_FIELD_STATUS_TONE_CLASS: Record<
  OcrFieldStatusTone,
  { capsule: string; label: string; panel: string }
> = {
  green: {
    capsule:
      'border-[var(--green-4)] bg-[var(--green-2)] text-[var(--green-11)]',
    label: 'text-[var(--green-11)]',
    panel: 'border-[var(--green-4)] bg-[var(--green-1)]',
  },
  orange: {
    capsule:
      'border-[var(--orange-4)] bg-[var(--orange-2)] text-[var(--orange-11)]',
    label: 'text-[var(--orange-11)]',
    panel: 'border-[var(--orange-4)] bg-[var(--orange-1)]',
  },
  red: {
    capsule: 'border-[var(--red-4)] bg-[var(--red-2)] text-[var(--red-11)]',
    label: 'text-[var(--red-11)]',
    panel: 'border-[var(--red-4)] bg-[var(--red-1)]',
  },
}

const normalizeComparableFieldValue = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toLowerCase()

const parseFieldDateValue = (value: unknown): Date | null => {
  const raw = String(value ?? '').trim()
  if (!raw) return null

  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw)
  if (iso) {
    const date = new Date(
      Number(iso[1]),
      Number(iso[2]) - 1,
      Number(iso[3]),
    )
    return Number.isNaN(date.getTime()) ? null : date
  }

  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return null
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())
}

/** True when the field date is strictly after today's local calendar date. */
const isFieldDateAfterToday = (value: unknown) => {
  const date = parseFieldDateValue(value)
  if (!date) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return date.getTime() > today.getTime()
}

/**
 * OCR status shown in the Fields UI:
 * - date/datetime: hide when empty or when selected date is after today
 * - other fields: show only while the value still matches the OCR response
 */
const resolveVisibleOcrFieldStatus = (
  field: Pick<RepositoryField, 'dataType' | 'id' | 'name' | 'sqlColumnName'>,
  entry: Pick<
    QueuedUploadFile,
    'fieldStatuses' | 'fieldValues' | 'ocrExtractedValues'
  >,
) => {
  const fieldKey = getFieldKey(field)
  const original = String(entry.fieldStatuses?.[fieldKey] ?? '').trim()
  if (!original) return ''

  const current = entry.fieldValues?.[fieldKey] ?? ''
  const ocrValue = entry.ocrExtractedValues?.[fieldKey] ?? ''
  const fieldType = normalizeType(field.dataType)

  if (fieldType === 'date' || fieldType === 'datetime') {
    if (isBlankFieldValue(current)) return ''
    if (isFieldDateAfterToday(current)) return ''
    return original
  }

  if (
    normalizeComparableFieldValue(current) ===
    normalizeComparableFieldValue(ocrValue)
  ) {
    return original
  }

  return ''
}

const collectVisibleBadOcrStatuses = (
  entry: Pick<
    QueuedUploadFile,
    'fieldStatuses' | 'fieldValues' | 'ocrExtractedValues'
  >,
  repositoryFields: RepositoryField[],
) => {
  const items: Array<{ fieldName: string; status: string; value: string }> = []
  for (const field of repositoryFields) {
    const status = resolveVisibleOcrFieldStatus(field, entry)
    if (!status || getOcrFieldStatusTone(status) !== 'red') continue
    items.push({
      fieldName: field.name,
      status,
      value: String(entry.fieldValues?.[getFieldKey(field)] ?? '').trim(),
    })
  }
  return items
}

const normalizeFieldKey = (key: string) =>
  key.toLowerCase().replace(/[_\s-]/g, '')

const fieldKeysMatch = (left: string, right: string) => {
  const normalizedLeft = normalizeFieldKey(left)
  const normalizedRight = normalizeFieldKey(right)

  if (!normalizedLeft || !normalizedRight) return false
  if (normalizedLeft === normalizedRight) return true

  const minLength = Math.min(normalizedLeft.length, normalizedRight.length)
  if (minLength < 4) return false

  return (
    normalizedLeft.includes(normalizedRight) ||
    normalizedRight.includes(normalizedLeft)
  )
}

const findOcrValue = (
  ocrFieldMap: Map<string, string>,
  candidates: string[],
) => {
  for (const candidate of candidates) {
    const directValue = ocrFieldMap.get(normalizeFieldKey(candidate))
    if (directValue !== undefined && directValue.trim()) {
      return directValue
    }
  }

  const ocrEntries = Array.from(ocrFieldMap.entries())

  for (const candidate of candidates) {
    for (const [ocrKey, ocrValue] of ocrEntries) {
      if (!ocrValue.trim()) continue
      if (fieldKeysMatch(candidate, ocrKey)) return ocrValue
    }
  }

  return ''
}

const appendOcrFieldItems = (target: Map<string, string>, items: unknown) => {
  if (!Array.isArray(items)) return

  items.forEach((item) => {
    if (!item || typeof item !== 'object') return
    const field = item as OcrFieldItem
    const name = field.name ? String(field.name).trim() : ''
    if (!name) return

    const value =
      field.value === null || field.value === undefined
        ? ''
        : String(field.value)
    const normalized = isBlankFieldValue(value) ? '' : value

    target.set(normalizeFieldKey(name), normalized)
  })
}

const extractOcrFieldMap = (response: unknown) => {
  const fieldMap = new Map<string, string>()
  if (!response || typeof response !== 'object') return fieldMap

  const payload = response as Record<string, unknown>
  const dataObj = payload.data as Record<string, unknown> | undefined

  // load/{fileId} (and some OCR responses) return `fields` as a flat array
  // of {name, value, type} items directly, rather than nested under an
  // ocrFieldList/ocrResult key inside a `fields` object.
  appendOcrFieldItems(fieldMap, payload.fields)
  appendOcrFieldItems(fieldMap, dataObj?.fields)

  const sources = [
    payload,
    payload.data,
    payload.result,
    payload.fields,
    payload.values,
    payload.metadata,
  ].filter(
    (source): source is Record<string, unknown> =>
      Boolean(source) && typeof source === 'object' && !Array.isArray(source),
  )

  sources.forEach((source) => {
    appendOcrFieldItems(fieldMap, source.ocrFieldList)
    appendOcrFieldItems(fieldMap, source.ocrResult)

    const ocrJson = source.ocrJson
    if (typeof ocrJson !== 'string' || !ocrJson.trim()) return

    try {
      const parsed = JSON.parse(ocrJson) as Record<string, unknown>
      appendOcrFieldItems(fieldMap, parsed.ocrResult)
      appendOcrFieldItems(fieldMap, parsed.fields)
    } catch {
      // ignore invalid OCR JSON payload
    }
  })

  return fieldMap
}

const appendOcrFieldStatuses = (
  target: Map<string, string>,
  items: unknown,
) => {
  if (!Array.isArray(items)) return

  items.forEach((item) => {
    if (!item || typeof item !== 'object') return
    const field = item as OcrFieldItem
    const name = field.name ? String(field.name).trim() : ''
    if (!name) return

    const status =
      field.status === null || field.status === undefined
        ? ''
        : String(field.status).trim()
    if (!status) return

    target.set(normalizeFieldKey(name), status)
  })
}

/** Pull per-field status from ocrFieldList, ocrResult, or a nested ocrJson string/object. */
const readOcrFieldStatuses = (target: Map<string, string>, value: unknown) => {
  if (value == null) return

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return
    try {
      readOcrFieldStatuses(target, JSON.parse(trimmed))
    } catch {
      // ignore invalid OCR JSON payload
    }
    return
  }

  if (Array.isArray(value)) {
    appendOcrFieldStatuses(target, value)
    return
  }

  if (typeof value !== 'object') return

  const source = value as Record<string, unknown>
  appendOcrFieldStatuses(target, source.ocrFieldList)
  appendOcrFieldStatuses(target, source.ocrResult)
  appendOcrFieldStatuses(target, source.fields)
  if ('ocrJson' in source) readOcrFieldStatuses(target, source.ocrJson)
  if (source.data && source.data !== value) {
    readOcrFieldStatuses(target, source.data)
  }
}

const extractOcrFieldStatusMap = (response: unknown) => {
  const statusMap = new Map<string, string>()
  readOcrFieldStatuses(statusMap, response)
  return statusMap
}

const findOcrStatus = (
  statusMap: Map<string, string>,
  candidates: string[],
) => {
  for (const candidate of candidates) {
    const direct = statusMap.get(normalizeFieldKey(candidate))
    if (direct) return direct
  }

  const entries = Array.from(statusMap.entries())
  for (const candidate of candidates) {
    for (const [ocrKey, status] of entries) {
      if (fieldKeysMatch(candidate, ocrKey)) return status
    }
  }

  return ''
}

const mapOcrResponseToFieldStatuses = (
  response: unknown,
  repositoryFields: RepositoryField[],
) => {
  const result: Record<string, string> = {}
  if (response == null) return result

  const statusMap = extractOcrFieldStatusMap(response)

  repositoryFields.forEach((field) => {
    const fieldKey = getFieldKey(field)
    const candidates = [field.sqlColumnName, field.name, field.id].filter(
      Boolean,
    ) as string[]
    const status = findOcrStatus(statusMap, candidates)
    if (status) result[fieldKey] = status
  })

  return result
}

const extractOcrJsonAndText = (response: unknown) => {
  let ocrJsonVal: any = []
  let ocrTextVal: any = ''

  if (!response || typeof response !== 'object') {
    return { ocrJson: ocrJsonVal, ocrText: ocrTextVal }
  }

  const payload = response as Record<string, unknown>
  const dataObj =
    (payload.data as Record<string, unknown> | undefined) ?? payload

  // 1. Parse ocrJson if it is a JSON string or object
  const rawJson = dataObj.ocrJson ?? payload.ocrJson
  let parsedJsonObj: Record<string, unknown> | null = null

  if (rawJson != null) {
    if (typeof rawJson === 'string') {
      try {
        parsedJsonObj = JSON.parse(rawJson) as Record<string, unknown>
      } catch {
        // invalid JSON string
      }
    } else if (typeof rawJson === 'object' && rawJson !== null) {
      parsedJsonObj = rawJson as Record<string, unknown>
    }
  }

  // 2. Extract ocrText (checks parsed ocrJson first, then root/dataObj level)
  const rawText =
    parsedJsonObj?.ocrText ??
    dataObj.ocrText ??
    payload.ocrText ??
    dataObj.text ??
    payload.text ??
    ''

  if (typeof rawText === 'string') {
    ocrTextVal = rawText
  } else if (rawText && typeof rawText === 'object') {
    ocrTextVal =
      typeof rawText === 'object' && Object.keys(rawText).length === 0
        ? ''
        : rawText
  } else {
    ocrTextVal = String(rawText || '')
  }

  // 3. Extract ocrResult to pass as ocrJson (checks parsed ocrJson first, then root/dataObj level)
  const ocrResult =
    parsedJsonObj?.ocrResult ??
    parsedJsonObj?.fields ??
    dataObj.ocrResult ??
    payload.ocrResult ??
    dataObj.ocrFieldList ??
    payload.ocrFieldList

  if (ocrResult !== undefined && ocrResult !== null) {
    ocrJsonVal = ocrResult
  }

  return { ocrJson: ocrJsonVal, ocrText: ocrTextVal }
}

const getFileNameWithoutExtension = (fileName: string) => {
  if (!fileName) return ''
  const lastDotIndex = fileName.lastIndexOf('.')
  if (lastDotIndex <= 0) return fileName
  return fileName.substring(0, lastDotIndex)
}

const isFilenameField = (field: RepositoryField) => {
  const normName = normalizeFieldKey(field.name || '')
  const normSql = normalizeFieldKey(field.sqlColumnName || '')
  return (
    normName === 'filename' ||
    normSql === 'filename' ||
    normName === 'file' ||
    normSql === 'file' ||
    normName === 'documentname' ||
    normSql === 'documentname'
  )
}

const applyFilenamePreFill = (
  values: Record<string, string>,
  repositoryFields: RepositoryField[],
  fileName?: string,
) => {
  if (!fileName) return values

  const cleanFileName = getFileNameWithoutExtension(fileName)
  const next = { ...values }

  repositoryFields.forEach((field) => {
    if (isFilenameField(field)) {
      const fieldKey = getFieldKey(field)
      if (!next[fieldKey] || !next[fieldKey].trim()) {
        next[fieldKey] = cleanFileName
      }
    }
  })

  return next
}

const mapOcrResponseToFieldValues = (
  response: unknown,
  repositoryFields: RepositoryField[],
  fileName?: string,
) => {
  const result = getInitialValues(repositoryFields)
  if (!response || typeof response !== 'object') {
    return applyFilenamePreFill(result, repositoryFields, fileName)
  }

  const ocrFieldMap = extractOcrFieldMap(response)

  const payload = response as Record<string, unknown>
  const flatData =
    (payload.data as Record<string, unknown> | undefined) ??
    (payload.fields as Record<string, unknown> | undefined) ??
    (payload.values as Record<string, unknown> | undefined) ??
    (payload.metadata as Record<string, unknown> | undefined) ??
    payload

  const readFlatValue = (source: Record<string, unknown>, key: string) => {
    const direct = source[key]
    if (direct !== null && direct !== undefined) {
      if (typeof direct === 'object' && 'value' in direct) {
        return String((direct as { value?: unknown }).value ?? '')
      }
      return String(direct)
    }

    const matchedKey = Object.keys(source).find(
      (sourceKey) => normalizeFieldKey(sourceKey) === normalizeFieldKey(key),
    )
    if (!matchedKey) return ''

    const value = source[matchedKey]
    if (value === null || value === undefined) return ''
    if (typeof value === 'object' && value !== null && 'value' in value) {
      return String((value as { value?: unknown }).value ?? '')
    }
    return String(value)
  }

  repositoryFields.forEach((field) => {
    const fieldKey = getFieldKey(field)
    const candidates = [field.sqlColumnName, field.name, field.id].filter(
      Boolean,
    ) as string[]

    for (const candidate of candidates) {
      const ocrValue = findOcrValue(ocrFieldMap, [candidate])
      if (ocrValue.trim() && !isBlankFieldValue(ocrValue)) {
        result[fieldKey] = ocrValue
        return
      }

      const flatValue = readFlatValue(flatData, candidate)
      if (flatValue.trim() && !isBlankFieldValue(flatValue)) {
        result[fieldKey] = flatValue
        return
      }
    }
  })

  return applyFilenamePreFill(result, repositoryFields, fileName)
}

const createQueueEntry = (
  file: File,
  repositoryFields: RepositoryField[],
): QueuedUploadFile => ({
  activeTab: 'fields',
  backendStatus: null,
  createdAt: new Date().toISOString(),
  exportStatus: 'idle',
  fieldStatuses: {},
  fieldValues: applyFilenamePreFill(
    getInitialValues(repositoryFields),
    repositoryFields,
    file.name,
  ),
  file,
  fileName: file.name,
  fileSize: file.size,
  focusedFieldKey: null,
  id: `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  isSyncing: false,
  jobId: null,
  masterSyncedValues: {},
  ocrExtractedValues: {},
  ocrStatus: 'idle',
  previewUrl: URL.createObjectURL(file),
  rawOcrJson: {},
  rawOcrText: '',
  restoredFromServer: false,
  stageFileId: null,
  status: 'queued',
  syncingField: null,
})

const backendStatusToQueueStatus = (
  backendStatus: StageFileStatus | string,
): QueuedFileStatus => {
  switch (String(backendStatus || '').toUpperCase()) {
    case 'OCR':
      return 'ready'
    case 'OCRFAILED':
      return 'error'
    case 'ARCHIVED':
      return 'indexed'
    case 'INDEXING':
    case 'ARCHIVING':
      return 'indexing'
    case 'QUEUED':
    case 'PENDINGOCR':
    default:
      return 'analyzing'
  }
}

const isDraftReadyForExport = (
  entry: Pick<QueuedUploadFile, 'fieldValues' | 'status'>,
  repositoryFields: RepositoryField[],
) =>
  entry.status === 'ready' &&
  !hasMissingMandatoryFields(entry.fieldValues, repositoryFields)

const isDraftStageSummary = (summary: StageFileSummary) =>
  String(summary.status || '').toUpperCase() !== 'ARCHIVED'

const collectDraftStageFiles = async (repositoryId: string) => {
  const pageSize = 50
  const drafts: StageFileSummary[] = []
  let page = 1
  let totalItems = 0

  while (page <= 20) {
    const { data, totalItems: reportedTotal } = await listStagedFiles({
      currentPage: page,
      itemsPerPage: pageSize,
      mode: 'browse',
      repositoryId,
    })
    const items = data ?? []
    if (page === 1) totalItems = reportedTotal || items.length
    drafts.push(...items.filter(isDraftStageSummary))
    if (!items.length || page * pageSize >= totalItems) break
    page += 1
  }

  return drafts
}

const readStageCreatedAt = (record: {
  createdAt?: unknown
  uploadedAt?: unknown
}) => {
  if (typeof record.createdAt === 'string' && record.createdAt.trim()) {
    return record.createdAt
  }
  if (typeof record.uploadedAt === 'string' && record.uploadedAt.trim()) {
    return record.uploadedAt
  }
  return new Date().toISOString()
}

/** Absolute / blob URLs can be used in the viewer; relative `/api/...` need auth fetch. */
const isPlayablePreviewUrl = (url: string | null | undefined) => {
  if (!url) return false
  const value = url.trim()
  return (
    value.startsWith('blob:') ||
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('data:')
  )
}

const isUsableFileBlob = (blob: Blob | null | undefined) => {
  if (!blob || blob.size < 5) return false
  const type = (blob.type || '').toLowerCase()
  // Error payloads from axios often arrive as JSON/HTML blobs.
  if (
    type.includes('json') ||
    type.includes('text/html') ||
    type.includes('text/plain') ||
    type.includes('xml')
  ) {
    return false
  }
  // Empty MIME / octet-stream is common — still usable when size looks real.
  return blob.size >= 32
}

/** Prefer PDF/image MIME from the file name when the API returns octet-stream. */
const typedPreviewBlob = (blob: Blob, fileName: string) => {
  const lower = fileName.toLowerCase()
  const mimeType = lower.endsWith('.pdf')
    ? 'application/pdf'
    : lower.endsWith('.png')
      ? 'image/png'
      : lower.endsWith('.jpg') || lower.endsWith('.jpeg')
        ? 'image/jpeg'
        : lower.endsWith('.webp')
          ? 'image/webp'
          : lower.endsWith('.gif')
            ? 'image/gif'
            : blob.type || 'application/octet-stream'
  if (blob.type === mimeType) return { blob, mimeType }
  return { blob: new Blob([blob], { type: mimeType }), mimeType }
}

const readStageFileUrl = (summary: StageFileSummary): string | null => {
  const raw =
    summary.fileUrl ??
    summary.url ??
    summary.previewUrl ??
    summary.downloadUrl
  if (typeof raw !== 'string' || !raw.trim()) return null
  const value = raw.trim()
  // API returns `/api/uploadAndIndex/files/{id}` — not usable without auth headers.
  return isPlayablePreviewUrl(value) ? value : null
}

const draftSummaryToQueueEntry = (
  summary: StageFileSummary,
  repositoryFields: RepositoryField[],
): QueuedUploadFile => {
  const status = (summary.status || 'OCR') as StageFileStatus
  const fieldValues = mapOcrResponseToFieldValues(
    summary,
    repositoryFields,
    summary.name,
  )
  const fieldStatuses = mapOcrResponseToFieldStatuses(summary, repositoryFields)
  return {
    activeTab: 'fields',
    backendStatus: status,
    createdAt: readStageCreatedAt(summary),
    exportStatus: 'idle',
    fieldStatuses,
    fieldValues,
    file: null,
    fileName: summary.name || 'Untitled',
    fileSize: typeof summary.size === 'number' ? summary.size : 0,
    focusedFieldKey: null,
    id: `staged-${summary.id}`,
    isSyncing: false,
    jobId: null,
    masterSyncedValues: fieldValues,
    ocrExtractedValues: fieldValues,
    ocrStatus: status === 'OCR' ? 'complete' : 'idle',
    previewUrl: readStageFileUrl(summary),
    rawOcrJson: Array.isArray(summary.fields) ? summary.fields : {},
    rawOcrText: '',
    restoredFromServer: true,
    stageFileId: summary.id,
    status: backendStatusToQueueStatus(status),
    syncingField: null,
  }
}

const countDraftGroups = (
  drafts: StageFileSummary[],
  repositoryFields: RepositoryField[] = [],
) => {
  let waiting = 0
  let inProgress = 0
  for (const summary of drafts) {
    const queueStatus = backendStatusToQueueStatus(
      (summary.status || 'OCR') as StageFileStatus,
    )
    if (queueStatus === 'ready') {
      const fieldValues = mapOcrResponseToFieldValues(
        summary,
        repositoryFields,
        summary.name,
      )
      if (hasMissingMandatoryFields(fieldValues, repositoryFields)) {
        inProgress += 1
      } else {
        waiting += 1
      }
    } else if (queueStatus !== 'indexed') {
      inProgress += 1
    }
  }
  return { inProgress, total: waiting + inProgress, waiting }
}

const countQueueDraftGroups = (
  entries: QueuedUploadFile[],
  repositoryFields: RepositoryField[],
) => {
  let waiting = 0
  let inProgress = 0
  for (const entry of entries) {
    if (entry.status === 'indexed') continue
    if (isDraftReadyForExport(entry, repositoryFields)) waiting += 1
    else inProgress += 1
  }
  return { inProgress, total: waiting + inProgress, waiting }
}

// Keep the in-memory upload row's job id and file blob when the draft list
// is reloaded, so OCR polling can continue for files just staged.
const mergeDraftWithLocalUpload = (
  base: QueuedUploadFile,
  local: QueuedUploadFile,
): QueuedUploadFile => {
  const serverSettled =
    base.status === 'ready' ||
    base.status === 'error' ||
    base.status === 'indexed' ||
    base.status === 'indexing'

  return {
    ...base,
    file: local.file ?? base.file,
    previewUrl: local.previewUrl ?? base.previewUrl,
    ...(serverSettled
      ? {}
      : {
        backendStatus: local.backendStatus ?? base.backendStatus,
        jobId: local.jobId ?? base.jobId,
        status: local.jobId ? local.status : base.status,
      }),
  }
}

const fileFingerprint = (file: File) =>
  `${file.name}:${file.size}:${file.lastModified}`

const batchFingerprint = (files: File[]) =>
  files.map(fileFingerprint).sort().join('|')

/** Cycles the three upload highlights in one card. */
function UploadFeatureHighlight() {
  const { t } = useLingui()
  const items = useMemo(
    () => [
      {
        color: 'text-[var(--orange-9)] bg-[var(--orange-2)]',
        icon: 'tabler:bolt',
        sub: t`Process documents faster with our agentic pipeline`,
        title: t`Lightning Fast`,
      },
      {
        color: 'text-[var(--indigo-9)] bg-[var(--indigo-2)]',
        icon: 'tabler:sparkles',
        sub: t`Industry-leading extraction accuracy and field precision`,
        title: t`100% Accuracy`,
      },
      {
        color: 'text-[var(--green-11)] bg-[var(--green-2)]',
        icon: 'tabler:clock',
        sub: t`Support for PDF, images, and scanned documents`,
        title: t`Any Format`,
      },
    ],
    [t],
  )
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % items.length)
    }, 3500)
    return () => window.clearInterval(timer)
  }, [items.length])

  const item = items[index]

  return (
    <AnimateEntrancePop className='h-full' delay={0.3}>
      <div className='group flex h-full w-full flex-col overflow-hidden rounded-xl border border-[var(--gray-3)] bg-surface p-5 text-left shadow-sm transition-shadow duration-300 hover:shadow-md'>
        <AnimatePresence mode='wait'>
          <motion.div
            key={item.icon}
            animate={{ opacity: 1, y: 0 }}
            className='flex flex-1 flex-col items-start'
            exit={{ opacity: 0, y: -8 }}
            initial={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <div className='flex items-center gap-3'>
              <div
                className={cn(
                  'flex size-9 shrink-0 items-center justify-center rounded-lg 2xl:size-10',
                  item.color,
                )}
              >
                {item.icon === 'tabler:sparkles' ? (
                  <AiBrandIcon
                    className='size-5'
                    variant='outline-purple'
                  />
                ) : (
                  <Icon className='size-5' name={item.icon} />
                )}
              </div>
              <h4 className='text-sm font-semibold tracking-tight text-[var(--gray-13)]'>
                {item.title}
              </h4>
            </div>
            <p className='mt-2.5 text-xs leading-relaxed font-medium text-[var(--gray-10)]'>
              {item.sub}
            </p>
          </motion.div>
        </AnimatePresence>

        <div className='mt-auto flex items-center justify-center gap-1.5 pt-4'>
          {items.map((entry, dotIndex) => (
            <button
              key={entry.icon}
              aria-label={entry.title}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                dotIndex === index
                  ? 'w-5 bg-[var(--primary-9)]'
                  : 'w-1.5 bg-[var(--gray-5)] hover:bg-[var(--gray-7)]',
              )}
              type='button'
              onClick={() => setIndex(dotIndex)}
            />
          ))}
        </div>
      </div>
    </AnimateEntrancePop>
  )
}

export default function Upload({
  folderId,
  initialFiles,
  initialStagedFileId,
  repositoryData,
  repositoryId,
  onBack,
  onSuccess,
}: UploadProps) {
  const { t } = useLingui()

  const processStepLabels: Record<ProcessStepKey, string> = {
    Analysis: t`Analysis`,
    Done: t`Done`,
    Fields: t`Fields`,
    Received: t`Received`,
  }
  const invoiceInputRef = useRef<HTMLInputElement>(null)
  const activeSyncCountMapRef = useRef<Map<string, number>>(new Map())
  const lastBatchSelectionRef = useRef<{
    at: number
    fingerprint: string
  } | null>(null)
  const listExportIdsRef = useRef<Set<string>>(new Set())
  const uploadAbortControllersRef = useRef<Map<string, AbortController>>(
    new Map(),
  )

  const [isDragOver, setIsDragOver] = useState(false)
  const [queue, setQueue] = useState<QueuedUploadFile[]>([])
  const [openFileId, setOpenFileId] = useState<string | null>(null)
  const [isQueueCollapsed, setIsQueueCollapsed] = useState(false)
  const [isRestoringQueue, setIsRestoringQueue] = useState(false)
  const [draftCounts, setDraftCounts] = useState({
    inProgress: 0,
    total: 0,
    waiting: 0,
  })
  const [isLoadingDraftCount, setIsLoadingDraftCount] = useState(false)
  const [viewingDrafts, setViewingDrafts] = useState(false)
  const [queueListTab, setQueueListTab] = useState<'uploading' | 'export'>(
    'export',
  )
  const [isDeletingStageFile, setIsDeletingStageFile] = useState(false)
  const [deleteStageConfirmOpen, setDeleteStageConfirmOpen] = useState(false)
  const [backConfirmOpen, setBackConfirmOpen] = useState(false)
  const [selectedDraftIds, setSelectedDraftIds] = useState<string[]>([])
  const [focusedDraftId, setFocusedDraftId] = useState<string | null>(null)
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false)
  const [bulkExportConfirmOpen, setBulkExportConfirmOpen] = useState(false)
  const [expiredExportConfirmOpen, setExpiredExportConfirmOpen] =
    useState(false)
  const [expiredExportDescription, setExpiredExportDescription] = useState('')
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)
  const [isBulkExporting, setIsBulkExporting] = useState(false)
  const pendingExpiredExportRef = useRef<{
    id: string
    options?: { keepList?: boolean; quiet?: boolean }
  } | null>(null)

  const repositoryFields = useMemo(() => {
    return [...(repositoryData?.fields ?? [])].sort((a, b) => {
      const mandatoryDiff =
        Number(Boolean(b.isMandatory)) - Number(Boolean(a.isMandatory))
      if (mandatoryDiff !== 0) return mandatoryDiff
      return (a.orderId ?? 0) - (b.orderId ?? 0)
    })
  }, [repositoryData?.fields])

  const activeRepositoryId = String(repositoryId || repositoryData?.id || '')

  useEffect(() => {
    if (!activeRepositoryId || queue.length > 0) return
    let cancelled = false

    const loadCount = async () => {
      setIsLoadingDraftCount(true)
      try {
        const drafts = await collectDraftStageFiles(activeRepositoryId)
        if (!cancelled) setDraftCounts(countDraftGroups(drafts, repositoryFields))
      } catch {
        if (!cancelled) {
          setDraftCounts({ inProgress: 0, total: 0, waiting: 0 })
        }
      } finally {
        if (!cancelled) setIsLoadingDraftCount(false)
      }
    }

    void loadCount()
    return () => {
      cancelled = true
    }
  }, [activeRepositoryId, queue.length, repositoryFields])

  const activeEntry = useMemo(
    () => queue.find((entry) => entry.id === openFileId) ?? null,
    [queue, openFileId],
  )

  const updateEntry = useCallback(
    (
      id: string,
      patch:
        | Partial<QueuedUploadFile>
        | ((entry: QueuedUploadFile) => Partial<QueuedUploadFile>),
    ) => {
      setQueue((prev) => {
        let changed = false
        const next = prev.map((entry) => {
          if (entry.id !== id) return entry
          const patchValue =
            typeof patch === 'function' ? patch(entry) : patch
          if (!patchValue || Object.keys(patchValue).length === 0) return entry
          changed = true
          return {
            ...entry,
            ...patchValue,
          }
        })
        return changed ? next : prev
      })
    },
    [],
  )

  // Draft `fileUrl` from API is `/api/uploadAndIndex/files/{id}` (auth).
  // Fetch the blob and set a playable previewUrl for grid + Document Preview.
  const draftPreviewLoadIdsRef = useRef<Set<string>>(new Set())
  const draftPreviewInFlightRef = useRef<Set<string>>(new Set())
  const draftPreviewAttemptsRef = useRef<Map<string, number>>(new Map())
  const draftPreviewHydratingLockRef = useRef(false)
  const draftPreviewNeedsRerunRef = useRef(false)
  const queueRef = useRef<QueuedUploadFile[]>(queue)
  queueRef.current = queue
  const focusedDraftIdRef = useRef(focusedDraftId)
  focusedDraftIdRef.current = focusedDraftId
  const openFileIdRef = useRef(openFileId)
  openFileIdRef.current = openFileId
  const viewingDraftsRef = useRef(viewingDrafts)
  viewingDraftsRef.current = viewingDrafts
  const [isHydratingDraftPreviews, setIsHydratingDraftPreviews] =
    useState(false)

  const draftPreviewLoadKey = useMemo(
    () =>
      queue
        .filter(
          (entry) =>
            Boolean(entry.stageFileId) && !isPlayablePreviewUrl(entry.previewUrl),
        )
        .map((entry) => entry.id)
        .sort()
        .join('|'),
    [queue],
  )

  useEffect(() => {
    if (!viewingDrafts && !openFileId) {
      setIsHydratingDraftPreviews(false)
      return
    }

    const loadPreviews = async () => {
      if (draftPreviewHydratingLockRef.current) {
        draftPreviewNeedsRerunRef.current = true
        return
      }

      draftPreviewHydratingLockRef.current = true
      setIsHydratingDraftPreviews(true)

      try {
        do {
          draftPreviewNeedsRerunRef.current = false
          // Avoid tight-retrying the same failed id inside one drain pass.
          const softFailedThisPass = new Set<string>()

          for (;;) {
            if (!viewingDraftsRef.current && !openFileIdRef.current) break

            const focusId = focusedDraftIdRef.current
            const openId = openFileIdRef.current
            const missing = queueRef.current.filter(
              (entry) =>
                Boolean(entry.stageFileId) &&
                !/\.pdf$/i.test(entry.fileName || '') &&
                !/\.docx$/i.test(entry.fileName || '') &&
                !isPlayablePreviewUrl(entry.previewUrl) &&
                !draftPreviewLoadIdsRef.current.has(entry.id) &&
                !draftPreviewInFlightRef.current.has(entry.id) &&
                !softFailedThisPass.has(entry.id),
            )
            if (missing.length === 0) break

            const ordered = [...missing].sort((a, b) => {
              if (a.id === openId) return -1
              if (b.id === openId) return 1
              if (a.id === focusId) return -1
              if (b.id === focusId) return 1
              return 0
            })

            const batchSize = 8
            for (let index = 0; index < ordered.length; index += batchSize) {
              const batch = ordered.slice(index, index + batchSize)
              await Promise.all(
                batch.map(async (entry) => {
                  if (
                    draftPreviewLoadIdsRef.current.has(entry.id) ||
                    draftPreviewInFlightRef.current.has(entry.id) ||
                    softFailedThisPass.has(entry.id)
                  ) {
                    return
                  }

                  const stageId = String(
                    entry.stageFileId || entry.id.replace(/^staged-/, ''),
                  )
                  if (!stageId) {
                    draftPreviewLoadIdsRef.current.add(entry.id)
                    return
                  }

                  const attempts =
                    draftPreviewAttemptsRef.current.get(entry.id) ?? 0
                  if (attempts >= 4) {
                    draftPreviewLoadIdsRef.current.add(entry.id)
                    return
                  }

                  draftPreviewInFlightRef.current.add(entry.id)
                  draftPreviewAttemptsRef.current.set(entry.id, attempts + 1)
                  try {
                    const blob = await fetchStageFileBlob(stageId)
                    if (isUsableFileBlob(blob)) {
                      const fileName = entry.fileName || 'file'
                      const { blob: typedBlob, mimeType } = typedPreviewBlob(
                        blob!,
                        fileName,
                      )
                      const previewUrl = URL.createObjectURL(typedBlob)
                      const latest = queueRef.current.find(
                        (item) => item.id === entry.id,
                      )
                      updateEntry(entry.id, {
                        file:
                          latest?.file ||
                          entry.file ||
                          new File([typedBlob], fileName, { type: mimeType }),
                        previewUrl,
                      })
                      draftPreviewLoadIdsRef.current.add(entry.id)
                    } else if (blob) {
                      draftPreviewLoadIdsRef.current.add(entry.id)
                    } else {
                      softFailedThisPass.add(entry.id)
                    }
                  } catch {
                    softFailedThisPass.add(entry.id)
                  } finally {
                    draftPreviewInFlightRef.current.delete(entry.id)
                  }
                }),
              )
            }

            if (softFailedThisPass.size > 0) {
              softFailedThisPass.clear()
              await new Promise((resolve) => window.setTimeout(resolve, 400))
            }
          }
        } while (draftPreviewNeedsRerunRef.current)
      } finally {
        draftPreviewHydratingLockRef.current = false
        setIsHydratingDraftPreviews(false)
      }
    }

    void loadPreviews()
  }, [
    draftPreviewLoadKey,
    focusedDraftId,
    openFileId,
    updateEntry,
    viewingDrafts,
  ])

  // Re-attempt the focused draft if a prior hydration pass failed.
  useEffect(() => {
    if (!viewingDrafts || !focusedDraftId) return
    draftPreviewLoadIdsRef.current.delete(focusedDraftId)
    draftPreviewAttemptsRef.current.delete(focusedDraftId)
  }, [focusedDraftId, viewingDrafts])

  const masterFormSyncData = useMemo(() => {
    if (
      !repositoryData?.storageDrive ||
      !repositoryData.storageDrive.includes('[')
    )
      return null
    const sd = repositoryData.storageDrive
    const prefix = sd.substring(0, sd.indexOf('[')).trim()
    const mappingStr = sd.substring(sd.indexOf('[') + 1, sd.length - 1)

    const formIds = prefix.split(',').map((id) => id.trim())
    const mapping: Record<string, string> = {}
    const syncFields: Array<{
      formFieldId: string
      formId: string
      repoField: string
    }> = []

    mappingStr.split(',').forEach((pair: string) => {
      const parts = pair.split(':').map((p) => p.trim())
      if (parts.length === 0 || !parts[0]) return

      const repoField = parts[0]
      const isMultiFormFormat =
        parts.length === 4 || (parts.length === 3 && parts[2] !== 'sync')

      if (isMultiFormFormat) {
        // Multi form format: repoField:formIdOrIndex:formFieldId[:sync]
        const formIdOrIndex = parts[1]
        const formFieldId = parts[2]

        let formId = formIdOrIndex
        const idx = parseInt(formIdOrIndex, 10)
        if (!isNaN(idx) && idx >= 0 && idx < formIds.length) {
          formId = formIds[idx]
        }

        const combinedKey = `${formId}:${formFieldId}`
        mapping[combinedKey] = repoField
        if (parts.length === 4 && parts[3] === 'sync') {
          syncFields.push({ formFieldId, formId, repoField })
        }
      } else {
        // Legacy single form format: repoField:formFieldId[:sync]
        const formId = formIds[0] || ''
        const formFieldId = parts[1] || ''
        const combinedKey = `${formId}:${formFieldId}`
        mapping[combinedKey] = repoField
        if (parts.length === 3 && parts[2] === 'sync') {
          syncFields.push({ formFieldId, formId, repoField })
        }
      }
    })

    return { formIds, mapping, syncFields }
  }, [repositoryData?.storageDrive])

  const [masterFormSyncLabels, setMasterFormSyncLabels] = useState<
    Record<string, string>
  >({})

  useEffect(() => {
    if (!masterFormSyncData || !masterFormSyncData.syncFields.length) {
      setMasterFormSyncLabels({})
      return
    }

    let isMounted = true
    const fetchForm = async () => {
      try {
        const uniqueFormIds = Array.from(
          new Set(
            Object.values(masterFormSyncData.mapping)
              .map((_v, idx) => {
                // Find formId from the mapping keys (since keys are formId:formFieldId)
                const keys = Object.keys(masterFormSyncData.mapping)
                return keys[idx]?.split(':')?.[0]
              })
              .filter(Boolean),
          ),
        )

        const formResponses = await Promise.all(
          uniqueFormIds.map((fId) =>
            formApi
              .getFormDataById(fId)
              .then((res) => ({ data: res.data, formId: fId }))
              .catch(() => ({ data: null, formId: fId })),
          ),
        )

        const fieldsByForm: Record<string, any[]> = {}
        formResponses.forEach((res) => {
          if (!res.data) return
          const formJson = res.data.formJson
          const fieldsArray = Array.isArray(formJson?.panels)
            ? formJson.panels.flatMap((panel: any) =>
              Array.isArray(panel?.fields) ? panel.fields : [],
            )
            : Array.isArray(formJson?.fields)
              ? formJson.fields
              : Array.isArray(formJson?.components)
                ? formJson.components
                : []
          fieldsByForm[res.formId] = fieldsArray
        })

        const newLabels: Record<string, string> = {}
        masterFormSyncData.syncFields.forEach((syncField) => {
          const { formFieldId, formId, repoField } = syncField
          const fieldsArray = fieldsByForm[formId] || []
          const fieldDef = fieldsArray.find(
            (f: any) => String(f.id || f.key || f.name) === formFieldId,
          )

          const formRes = formResponses.find((r) => r.formId === formId)
          const formName = formRes?.data?.name || formRes?.data?.title || formId

          newLabels[repoField] = fieldDef
            ? `${formName} - ${String(
              fieldDef.displayLabel ||
              fieldDef.label ||
              fieldDef.name ||
              fieldDef.title ||
              fieldDef.id ||
              fieldDef.key ||
              formFieldId,
            )}`
            : `${formName} - ${formFieldId}`
        })

        if (isMounted) {
          setMasterFormSyncLabels(newLabels)
        }
      } catch (err) {
        console.error('Failed to fetch master form definitions', err)
      }
    }

    void fetchForm()

    return () => {
      isMounted = false
    }
  }, [masterFormSyncData])

  const handleSync = useCallback(
    async (
      fileId: string,
      fieldValue: string,
      repoFieldName: string,
      formId: string,
      currentOcrValues?: Record<string, string>,
    ) => {
      if (!masterFormSyncData || !fieldValue || !formId) return
      const syncCounts = activeSyncCountMapRef.current
      syncCounts.set(fileId, (syncCounts.get(fileId) ?? 0) + 1)
      updateEntry(fileId, { isSyncing: true, syncingField: repoFieldName })
      try {
        const criteriaFieldEntry = Object.entries(
          masterFormSyncData.mapping,
        ).find(
          ([combinedKey, repoName]) =>
            repoName === repoFieldName && combinedKey.startsWith(`${formId}:`),
        )
        if (!criteriaFieldEntry) {
          throw new Error(
            `No mapping entry for field: ${repoFieldName} on form: ${formId}`,
          )
        }
        const criteriaFieldId = criteriaFieldEntry[0].split(':')[1]

        const payload = {
          currentPage: 1,
          filterBy: [
            {
              filters: [
                {
                  condition: 'eq',
                  criteria: criteriaFieldId,
                  value: fieldValue,
                },
              ],
              groupCondition: '',
            },
          ],
          includeFormJson: true,
          itemsPerPage: 10,
          mode: 'live',
          sortBy: { criteria: 'createdAt', order: 'DESC' },
        }

        const { data, error } = await formApi.searchFormEntries(formId, payload)
        if (error) {
          showToast({ message: `Sync failed: ${error}`, variant: 'error' })
          return
        }

        const entries = data?.entries || []

        if (entries.length === 0) {
          showToast({
            message: 'No matching record found.',
            variant: 'error',
          })
          return
        }

        const entry = entries[0]
        const values =
          entry?.values || entry?.data || entry?.formValues || entry

        updateEntry(fileId, (current) => {
          const nextFieldValues = { ...current.fieldValues }
          const nextMasterSyncedValues = { ...current.masterSyncedValues }
          const ocrValues = currentOcrValues || current.ocrExtractedValues

          Object.entries(masterFormSyncData.mapping || {}).forEach(
            ([combinedKey, repoName]) => {
              const [fId, formFieldId] = combinedKey.split(':')
              if (fId !== formId) return
              if (repoName === repoFieldName) return

              const normalizedRepoName = String(repoName).trim().toLowerCase()

              const repoField = repositoryFields.find((field: any) => {
                const fieldName = String(field?.name || '')
                  .trim()
                  .toLowerCase()

                const sqlColumnName = String(field?.sqlColumnName || '')
                  .trim()
                  .toLowerCase()

                return (
                  fieldName === normalizedRepoName ||
                  sqlColumnName === normalizedRepoName
                )
              })

              if (!repoField) {
                console.warn('Repository field not found:', repoName)
                return
              }

              let mappedValue = values?.[formFieldId]

              if (
                typeof mappedValue === 'object' &&
                mappedValue !== null &&
                'value' in mappedValue
              ) {
                mappedValue = mappedValue.value
              }

              const targetKey = getFieldKey(repoField)
              const ocrValue = ocrValues[targetKey]

              if (
                mappedValue !== undefined &&
                mappedValue !== null &&
                String(mappedValue).trim() !== ''
              ) {
                nextFieldValues[targetKey] = mappedValue
                nextMasterSyncedValues[targetKey] = String(mappedValue)
              } else if (
                ocrValue !== undefined &&
                ocrValue !== null &&
                String(ocrValue).trim() !== ''
              ) {
                nextFieldValues[targetKey] = ocrValue
                nextMasterSyncedValues[targetKey] = String(ocrValue)
              } else if (mappedValue !== undefined && mappedValue !== null) {
                nextFieldValues[targetKey] = mappedValue
                nextMasterSyncedValues[targetKey] = String(mappedValue)
              }
            },
          )

          return {
            fieldValues: nextFieldValues,
            masterSyncedValues: nextMasterSyncedValues,
          }
        })
      } catch (e: any) {
        console.log({ message: `Sync error: ${e.message}`, variant: 'error' })
      } finally {
        const remaining = Math.max(0, (syncCounts.get(fileId) ?? 1) - 1)
        syncCounts.set(fileId, remaining)
        if (remaining === 0) {
          updateEntry(fileId, { isSyncing: false, syncingField: null })
        }
      }
    },
    [masterFormSyncData, repositoryFields, updateEntry],
  )

  const isAnalyzing = deriveOcrStatus(activeEntry) === 'analyzing'
  const isExporting = activeEntry?.exportStatus === 'exporting'
  const isFieldsPhase =
    deriveOcrStatus(activeEntry) === 'complete' &&
    activeEntry?.exportStatus === 'idle' &&
    Boolean(activeEntry)

  const activeFieldValues = activeEntry?.fieldValues ?? {}
  const activeOcrExtractedValues = activeEntry?.ocrExtractedValues ?? {}
  const activeMasterSyncedValues = activeEntry?.masterSyncedValues ?? {}
  const activeRawOcrJson = activeEntry?.rawOcrJson
  const activeTab = activeEntry?.activeTab ?? 'fields'
  const focusedFieldKey = activeEntry?.focusedFieldKey ?? null
  const syncingField = activeEntry?.syncingField ?? null

  // Revoke any outstanding preview URLs when the Upload screen unmounts
  // (per-file URLs are already revoked individually on removal/index).
  useEffect(() => {
    return () => {
      queueRef.current.forEach((entry) => {
        if (entry.previewUrl) URL.revokeObjectURL(entry.previewUrl)
      })
    }
  }, [])

  const triggerAutoSync = useCallback(
    (fileId: string, mappedValues: Record<string, string>) => {
      if (!masterFormSyncData || masterFormSyncData.syncFields.length === 0) {
        return
      }

      const activeSyncs: Array<{
        fieldName: string
        fieldValue: string
        formId: string
      }> = []

      masterFormSyncData.syncFields.forEach((syncField) => {
        const { formId, repoField: name } = syncField
        const normalizedName = name.trim().toLowerCase()
        const repoField = repositoryFields.find((f) => {
          const fieldName = String(f.name || '')
            .trim()
            .toLowerCase()
          const sqlColumnName = String(f.sqlColumnName || '')
            .trim()
            .toLowerCase()
          return (
            fieldName === normalizedName || sqlColumnName === normalizedName
          )
        })

        if (repoField) {
          const targetKey = getFieldKey(repoField)
          const val = mappedValues[targetKey]
          if (val?.trim()) {
            activeSyncs.push({ fieldName: name, fieldValue: val, formId })
          }
        }
      })

      const uniqueSyncsToTrigger: typeof activeSyncs = []
      const triggeredFormIds = new Set<string>()

      activeSyncs.forEach((sync) => {
        if (!triggeredFormIds.has(sync.formId)) {
          triggeredFormIds.add(sync.formId)
          uniqueSyncsToTrigger.push(sync)
        }
      })

      uniqueSyncsToTrigger.forEach((sync) => {
        // We use setTimeout to allow state to settle before firing the sync
        setTimeout(() => {
          void handleSync(
            fileId,
            sync.fieldValue,
            sync.fieldName,
            sync.formId,
            mappedValues,
          )
        }, 0)
      })
    },
    [masterFormSyncData, repositoryFields, handleSync],
  )

  const openDraftFilesView = useCallback(
    async (options?: {
      preferredLocal?: QueuedUploadFile[]
      tab?: 'auto' | 'export' | 'uploading'
    }) => {
      const tab = options?.tab ?? 'auto'
      const preferredLocal = options?.preferredLocal ?? []

      if (!activeRepositoryId) {
        showToast({
          message: t`Repository ID is missing. Cannot run OCR.`,
          variant: 'error',
        })
        return
      }

      if (tab === 'uploading' || tab === 'export') {
        setQueueListTab(tab)
        setViewingDrafts(true)
        setOpenFileId(null)
      }

      setIsRestoringQueue(true)
      try {
        const drafts = await collectDraftStageFiles(activeRepositoryId)
        const preferredByStageId = new Map(
          preferredLocal
            .filter((entry) => entry.stageFileId)
            .map((entry) => [entry.stageFileId as string, entry]),
        )
        const listedStageIds = new Set<string>()
        const entries = drafts.map((summary) => {
          const base = draftSummaryToQueueEntry(summary, repositoryFields)
          listedStageIds.add(summary.id)
          const local = preferredByStageId.get(summary.id)
          return local ? mergeDraftWithLocalUpload(base, local) : base
        })

        for (const local of preferredLocal) {
          if (local.status === 'indexed') continue
          if (local.stageFileId && listedStageIds.has(local.stageFileId)) {
            continue
          }
          entries.push(local)
        }

        if (!entries.length) {
          if (preferredLocal.length > 0) {
            const uploadedId = preferredLocal[0]?.id ?? null
            setDraftCounts(
              countQueueDraftGroups(preferredLocal, repositoryFields),
            )
            setQueueListTab(tab === 'auto' ? 'uploading' : tab)
            setViewingDrafts(true)
            setOpenFileId(null)
            draftPreviewLoadIdsRef.current.clear()
            draftPreviewAttemptsRef.current.clear()
            draftPreviewInFlightRef.current.clear()
            setQueue(preferredLocal)
            setFocusedDraftId(uploadedId)
            setSelectedDraftIds(uploadedId ? [uploadedId] : [])
            return
          }
          showToast({
            message: t`No draft files to review.`,
            variant: 'info',
          })
          return
        }

        const hasReady = entries.some((entry) =>
          isDraftReadyForExport(entry, repositoryFields),
        )
        setDraftCounts(countQueueDraftGroups(entries, repositoryFields))
        setQueueListTab(
          tab === 'auto' ? (hasReady ? 'export' : 'uploading') : tab,
        )
        setViewingDrafts(true)
        setOpenFileId(null)
        // Fresh draft list — allow preview hydration to run again.
        draftPreviewLoadIdsRef.current.clear()
        draftPreviewAttemptsRef.current.clear()
        draftPreviewInFlightRef.current.clear()
        setQueue(entries)
        const uploadedEntry = preferredLocal
          .map(
            (local) =>
              entries.find(
                (entry) =>
                  entry.id === local.id ||
                  (local.stageFileId && entry.stageFileId === local.stageFileId),
              ) ?? null,
          )
          .find((entry): entry is QueuedUploadFile => Boolean(entry))
        if (uploadedEntry) {
          setFocusedDraftId(uploadedEntry.id)
          setSelectedDraftIds([uploadedEntry.id])
        } else {
          setFocusedDraftId((current) => {
            if (current && entries.some((entry) => entry.id === current)) {
              return current
            }
            return entries[0]?.id ?? null
          })
          setSelectedDraftIds((current) => {
            const stillThere = current.filter((id) =>
              entries.some((entry) => entry.id === id),
            )
            if (stillThere.length > 0) return stillThere
            return entries[0]?.id ? [entries[0].id] : []
          })
        }
      } catch {
        if (preferredLocal.length && tab === 'uploading') {
          setDraftCounts(
            countQueueDraftGroups(preferredLocal, repositoryFields),
          )
          setQueueListTab('uploading')
          setViewingDrafts(true)
          setOpenFileId(null)
          setQueue(preferredLocal)
          setFocusedDraftId(preferredLocal[0]?.id ?? null)
          setSelectedDraftIds(
            preferredLocal[0]?.id ? [preferredLocal[0].id] : [],
          )
          return
        }
        showToast({
          message: t`Unable to load draft files.`,
          variant: 'error',
        })
      } finally {
        setIsRestoringQueue(false)
      }
    },
    [activeRepositoryId, repositoryFields, t],
  )

  // Batches every newly-added 'queued' entry into a single bulkUpload call
  // (one network call per drop/selection, not one per file) and stores the
  // returned stageFileId/jobId on each entry so the poller (below) can pick
  // up OCR progress for the whole batch.
  const stageFilesForOcr = useCallback(
    async (
      entries: QueuedUploadFile[],
      activeRepositoryId: string,
      options?: { openDraftsOnSuccess?: boolean },
    ) => {
      const filesToStage = entries.filter(
        (entry): entry is QueuedUploadFile & { file: File } =>
          Boolean(entry.file),
      )
      if (!filesToStage.length || !activeRepositoryId) return

      const ocrFields = repositoryFields
        .map((field) => formatOcrFieldDescriptor(field))
        .filter(Boolean)

      if (filesToStage.length === 1) {
        const singleEntry = filesToStage[0]
        const controller = new AbortController()
        uploadAbortControllersRef.current.set(singleEntry.id, controller)

        try {
          const { data, error } = await uploadForOcr(
            activeRepositoryId,
            singleEntry.file,
            ocrFields,
            controller.signal,
          )

          if (controller.signal.aborted) {
            uploadAbortControllersRef.current.delete(singleEntry.id)
            if (data?.fileId) {
              void deleteStagedFiles({
                fileIds: [data.fileId],
                repositoryId: activeRepositoryId,
              })
            }
            return
          }

          if (error || !data) {
            console.warn(
              '[uploadForOcr] OCR extraction failed or returned empty data, proceeding with uploadWithOcr to obtain fileId:',
              error || 'No data',
            )
          }

          const ocrExtractedValues: Record<string, string> = {}
          const fieldValues: Record<string, string> = {}
          if (data?.ocrFieldList && Array.isArray(data.ocrFieldList)) {
            data.ocrFieldList.forEach((field: OcrFieldResult) => {
              const matchedRepoField = repositoryFields.find(
                (f) =>
                  f.name === field.name ||
                  f.sqlColumnName === field.name ||
                  f.name?.toLowerCase() === field.name?.toLowerCase(),
              )
              if (matchedRepoField) {
                const key = getFieldKey(matchedRepoField)
                const nextValue = isBlankFieldValue(field.value)
                  ? ''
                  : String(field.value ?? '')
                ocrExtractedValues[key] = nextValue
                fieldValues[key] = nextValue
              }
            })
          }

          // Stage the file using uploadWithOcr carrying forward any extracted OCR data,
          // or the raw field hints if OCR extraction was empty / failed.
          const { data: stageData, error: stageError } = await uploadWithOcr({
            fields: ocrFields,
            file: singleEntry.file,
            filename: singleEntry.file.name,
            ocrFieldList: data?.ocrFieldList,
            ocrJson:
              typeof data?.ocrJson === 'string'
                ? data.ocrJson
                : data?.ocrJson
                  ? JSON.stringify(data.ocrJson || {})
                  : undefined,
            ocrText: data?.ocrText || '',
            repositoryId: activeRepositoryId,
            signal: controller.signal,
          })

          if (controller.signal.aborted) {
            uploadAbortControllersRef.current.delete(singleEntry.id)
            const orphanStageId = stageData?.fileId || data?.fileId || data?.id
            if (orphanStageId) {
              void deleteStagedFiles({
                fileIds: [orphanStageId],
                repositoryId: activeRepositoryId,
              })
            }
            return
          }

          const effectiveStageFileId =
            stageData?.fileId || data?.fileId || data?.id

          if (stageError || !effectiveStageFileId) {
            console.warn('[uploadWithOcr] Staging failed:', stageError)
            updateEntry(singleEntry.id, {
              errorMessage: String(stageError || error || 'Upload failed'),
              status: 'error',
            })
            showToast({
              message: t`Failed to stage file for upload.`,
              variant: 'error',
            })
            return
          }

          const fieldStatuses = mapOcrResponseToFieldStatuses(
            data,
            repositoryFields,
          )

          const stagedEntry: QueuedUploadFile = {
            ...singleEntry,
            backendStatus: 'OCR',
            errorMessage: undefined,
            fieldStatuses,
            fieldValues,
            masterSyncedValues: fieldValues,
            ocrExtractedValues,
            ocrStatus: error || !data ? 'idle' : 'complete',
            rawOcrJson: data?.ocrJson || data?.ocrResult || null,
            rawOcrText: data?.ocrText || '',
            stageFileId: effectiveStageFileId,
            status: 'ready',
          }

          updateEntry(singleEntry.id, stagedEntry)
          lastSavedValuesRef.current.set(
            singleEntry.id,
            JSON.stringify(fieldValues),
          )

          if (!options?.openDraftsOnSuccess) {
            setOpenFileId(singleEntry.id)
          } else {
            showToast({
              message: t`Files uploaded successfully.`,
              variant: 'success',
            })
            if (onSuccess) await onSuccess()
            await openDraftFilesView({
              preferredLocal: [stagedEntry],
              tab: 'uploading',
            })
          }
          return
        } finally {
          uploadAbortControllersRef.current.delete(singleEntry.id)
        }
      }

      const { data, error } = await bulkUpload({
        fields: ocrFields,
        files: filesToStage.map((entry) => entry.file),
        repositoryId: activeRepositoryId,
      })

      if (error || !data) {
        filesToStage.forEach((entry) => {
          updateEntry(entry.id, {
            errorMessage: String(error || 'Upload failed'),
            status: 'error',
          })
        })
        showToast({
          message: t`Failed to stage files for upload.`,
          variant: 'error',
        })
        return
      }

      let hasSuccess = false
      const preferredLocal: QueuedUploadFile[] = []
      data.files.forEach((result, index) => {
        const entry = filesToStage[index]
        if (!entry) return

        if (!result.succeeded) {
          const failedEntry: QueuedUploadFile = {
            ...entry,
            errorMessage: result.error || t`Staging failed.`,
            status: 'error',
          }
          preferredLocal.push(failedEntry)
          updateEntry(entry.id, {
            errorMessage: failedEntry.errorMessage,
            status: 'error',
          })
          return
        }

        hasSuccess = true
        const uploadedEntry: QueuedUploadFile = {
          ...entry,
          backendStatus: 'Queued',
          errorMessage: undefined,
          jobId: data.jobId,
          stageFileId: result.fileId,
          status: 'analyzing',
        }
        preferredLocal.push(uploadedEntry)
        updateEntry(entry.id, {
          backendStatus: 'Queued',
          errorMessage: undefined,
          jobId: data.jobId,
          stageFileId: result.fileId,
          status: 'analyzing',
        })
      })

      if (hasSuccess) {
        showToast({
          message: t`Files uploaded successfully.`,
          variant: 'success',
        })
        // Bulk uploads always stay on the Draft Files media library.
        const stayOnDrafts =
          Boolean(options?.openDraftsOnSuccess) || preferredLocal.length > 1
        if (stayOnDrafts) {
          await openDraftFilesView({
            preferredLocal,
            tab: 'uploading',
          })
          // Refresh folder data in the background; do not leave this page.
          void onSuccess?.()
        } else {
          if (onSuccess) await onSuccess()
          onBack()
        }
      }
    },
    [
      onBack,
      onSuccess,
      openDraftFilesView,
      repositoryFields,
      setOpenFileId,
      t,
      updateEntry,
    ],
  )

  // Tracks which entries already had loadStageFile called for their current
  // stage, so a repeated 'OCR' status in later polls doesn't re-fetch.
  const loadedStageFileIdsRef = useRef<Set<string>>(new Set())

  const loadAndPopulateFields = useCallback(
    async (entry: QueuedUploadFile) => {
      if (!entry.stageFileId) return
      const { data, error } = await loadStageFile(entry.stageFileId)

      if (error || !data) {
        updateEntry(entry.id, { status: 'ready' })
        return
      }

      const { ocrJson, ocrText } = extractOcrJsonAndText(data)
      const mappedValues = mapOcrResponseToFieldValues(
        data,
        repositoryFields,
        entry.fileName,
      )
      const fieldStatuses = {
        ...(entry.fieldStatuses ?? {}),
        ...mapOcrResponseToFieldStatuses(entry.rawOcrJson, repositoryFields),
        ...mapOcrResponseToFieldStatuses(data, repositoryFields),
      }

      let previewUrl = isPlayablePreviewUrl(entry.previewUrl)
        ? entry.previewUrl
        : null
      let fileObj = entry.file
      if (!previewUrl && entry.stageFileId) {
        const blob = await fetchStageFileBlob(entry.stageFileId)
        if (isUsableFileBlob(blob)) {
          fileObj = new File([blob!], data.name || entry.fileName, {
            type: blob!.type || 'application/pdf',
          })
          previewUrl = URL.createObjectURL(blob!)
        }
      }

      updateEntry(entry.id, {
        fieldStatuses,
        fieldValues: mappedValues,
        file: fileObj,
        fileName: data.name || entry.fileName,
        fileSize: typeof data.size === 'number' ? data.size : entry.fileSize,
        ocrExtractedValues: mappedValues,
        ocrStatus: 'complete',
        previewUrl,
        // load/{fileId} returns `fields` as the flat OCR result array
        // directly - show that in the JSON tab when the generic extractor
        // didn't find a nested ocrJson/ocrResult payload.
        rawOcrJson:
          Array.isArray(ocrJson) && ocrJson.length === 0 && data.fields
            ? data.fields
            : ocrJson,
        rawOcrText: ocrText,
        status: 'ready',
      })

      lastSavedValuesRef.current.set(entry.id, JSON.stringify(mappedValues))
      triggerAutoSync(entry.id, mappedValues)
    },
    [repositoryFields, triggerAutoSync, updateEntry],
  )

  const handleBulkUploadJobUpdate = useCallback(
    (_jobId: string, jobStatus: BulkUploadJobStatus) => {
      jobStatus.files.forEach((fileEntry) => {
        const entry = queueRef.current.find(
          (item) => item.stageFileId === fileEntry.fileId,
        )
        if (!entry) return

        if (fileEntry.status === 'OCRFailed') {
          if (entry.status !== 'error') {
            updateEntry(entry.id, {
              backendStatus: fileEntry.status,
              errorMessage: fileEntry.error || t`OCR failed for this file.`,
              status: 'error',
            })
          }
          return
        }

        if (fileEntry.status === 'OCR') {
          if (
            entry.status !== 'indexed' &&
            entry.status !== 'indexing' &&
            !loadedStageFileIdsRef.current.has(entry.stageFileId as string)
          ) {
            loadedStageFileIdsRef.current.add(entry.stageFileId as string)
            updateEntry(entry.id, { backendStatus: fileEntry.status })
            void loadAndPopulateFields(entry)
          }
          return
        }

        if (entry.backendStatus !== fileEntry.status) {
          updateEntry(entry.id, {
            backendStatus: fileEntry.status,
            status: backendStatusToQueueStatus(fileEntry.status),
          })
        }
      })
    },
    [loadAndPopulateFields, t, updateEntry],
  )

  const activeJobIds = useMemo(
    () =>
      Array.from(
        new Set(
          queue
            .filter((entry) => entry.status === 'analyzing' && entry.jobId)
            .map((entry) => entry.jobId as string),
        ),
      ),
    [queue],
  )

  useBulkUploadJobPolling(activeJobIds, handleBulkUploadJobUpdate)

  const resetInput = () => {
    if (invoiceInputRef.current) invoiceInputRef.current.value = ''
  }

  const handleDeleteStageFile = async (id: string) => {
    const entry = queue.find((item) => item.id === id)
    if (!entry || entry.status === 'indexing') return

    // Immediately abort any active in-flight upload request for this file
    const inFlightController = uploadAbortControllersRef.current.get(id)
    if (inFlightController) {
      inFlightController.abort()
      uploadAbortControllersRef.current.delete(id)
    }

    setIsDeletingStageFile(true)
    try {
      const activeRepositoryId = String(
        repositoryId || repositoryData?.id || '',
      )
      if (entry.stageFileId && activeRepositoryId) {
        const { error } = await deleteStagedFiles({
          fileIds: [entry.stageFileId],
          repositoryId: activeRepositoryId,
        })
        if (error) {
          showToast({
            message: String(error),
            variant: 'error',
          })
          return
        }
      }

      showToast({
        message: t`Staged file deleted.`,
        variant: 'success',
      })

      if (entry.previewUrl) URL.revokeObjectURL(entry.previewUrl)

      const remaining = queue.filter((item) => item.id !== id)
      setQueue(remaining)
      if (viewingDrafts) {
        setDraftCounts(countQueueDraftGroups(remaining, repositoryFields))
      }

      if (openFileId === id) {
        if (viewingDrafts) {
          setOpenFileId(null)
        } else {
          const nextOpen =
            remaining.find((item) => item.status !== 'indexed') ??
            remaining[0] ??
            null
          setOpenFileId(nextOpen ? nextOpen.id : null)
        }
      }
      setDeleteStageConfirmOpen(false)

      if (onSuccess) {
        void onSuccess()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsDeletingStageFile(false)
    }
  }

  const handleRemoveFromQueue = (id: string) => {
    void handleDeleteStageFile(id)
  }

  const handleRetryOcr = (id: string) => {
    const entry = queue.find((item) => item.id === id)
    if (!entry) return

    if (!entry.file) {
      showToast({
        message: t`This file can't be retried automatically — remove it and add it again.`,
        variant: 'info',
      })
      return
    }

    loadedStageFileIdsRef.current.delete(entry.stageFileId ?? '')
    updateEntry(id, {
      backendStatus: null,
      errorMessage: undefined,
      jobId: null,
      ocrStatus: 'idle',
      stageFileId: null,
      status: 'analyzing',
    })

    const activeRepositoryId = String(repositoryId || repositoryData?.id || '')
    void stageFilesForOcr([{ ...entry }], activeRepositoryId)
  }

  const updateFieldValue = (field: RepositoryField, value: string) => {
    if (!activeEntry) return
    updateEntry(activeEntry.id, (entry) => ({
      fieldValues: { ...entry.fieldValues, [getFieldKey(field)]: value },
    }))
  }

  const handleInvoiceFiles = (fileList: FileList | File[] | null) => {
    const files = Array.from(fileList ?? [])
    const validFiles = files.filter(
      (file) => isSupportedDocument(file) && file.size <= MAX_SIZE,
    )

    if (!validFiles.length && files.length > 0) {
      const tooLarge = files.some((file) => file.size > MAX_SIZE)
      const invalidType = files.some((file) => !isSupportedDocument(file))

      showToast({
        message: tooLarge
          ? t`File is too large. Max size is 50MB.`
          : invalidType
            ? t`Invalid file type. Please upload a supported document.`
            : t`No valid files selected.`,
        variant: 'info',
      })
      resetInput()
      return
    }

    if (validFiles.length) {
      const fingerprint = batchFingerprint(validFiles)
      const now = Date.now()
      const lastSelection = lastBatchSelectionRef.current

      if (
        lastSelection?.fingerprint === fingerprint &&
        now - lastSelection.at < 800
      ) {
        resetInput()
        return
      }

      lastBatchSelectionRef.current = { at: now, fingerprint }

      const activeRepositoryId = String(
        repositoryId || repositoryData?.id || '',
      )

      if (!activeRepositoryId) {
        showToast({
          message: t`Repository ID is missing. Cannot run OCR.`,
          variant: 'error',
        })
        resetInput()
        return
      }

      const existingFingerprints = new Set(
        queue
          .filter((entry): entry is QueuedUploadFile & { file: File } =>
            Boolean(entry.file),
          )
          .map((entry) => fileFingerprint(entry.file)),
      )
      const newFiles = validFiles.filter(
        (file) => !existingFingerprints.has(fileFingerprint(file)),
      )

      if (newFiles.length) {
        const newEntries = newFiles.map((file) =>
          createQueueEntry(file, repositoryFields),
        )

        setQueue((prev) => {
          const next = [...prev, ...newEntries]
          return next
        })

        const isBulkUpload = newEntries.length > 1
        const reviewSingleFile = newEntries.length === 1 && queue.length === 0
        if (reviewSingleFile) {
          setOpenFileId(newEntries[0].id)
          setViewingDrafts(false)
        } else if (isBulkUpload) {
          // Multi-file: go straight to Draft Files media library (same as drafts).
          setQueueListTab('uploading')
          setOpenFileId(null)
          setViewingDrafts(true)
          setFocusedDraftId(newEntries[0]?.id ?? null)
          setSelectedDraftIds(
            newEntries[0]?.id ? [newEntries[0].id] : [],
          )
        }

        if (newFiles.length < validFiles.length) {
          showToast({
            message: t`Some files were already in the queue and were skipped.`,
            variant: 'info',
          })
        }

        void stageFilesForOcr(newEntries, activeRepositoryId, {
          openDraftsOnSuccess: isBulkUpload,
        })
      }
    }

    resetInput()
  }

  const initialFilesAppliedRef = useRef(false)
  useEffect(() => {
    if (initialFilesAppliedRef.current) return
    initialFilesAppliedRef.current = true
    if (!initialFiles?.length) return
    handleInvoiceFiles(initialFiles)
    // Apply once when Upload mounts with preselected files from the empty-state dropzone.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const initialStagedAppliedRef = useRef(false)
  useEffect(() => {
    if (initialStagedAppliedRef.current) return
    if (!initialStagedFileId) return
    initialStagedAppliedRef.current = true

    const loadSingleStaged = async () => {
      setIsRestoringQueue(true)
      try {
        const stageId = initialStagedFileId.replace(/^staged-/, '')
        const { data } = await loadStageFile(stageId)
        if (!data) return

        const { ocrJson, ocrText } = extractOcrJsonAndText(data)
        const mappedValues = mapOcrResponseToFieldValues(
          data,
          repositoryFields,
          data.name,
        )
        const fieldStatuses = mapOcrResponseToFieldStatuses(
          data,
          repositoryFields,
        )

        const blob = await fetchStageFileBlob(stageId)
        let previewUrl: string | null = null
        let fileObj: File | null = null
        if (blob) {
          fileObj = new File([blob], data.name || 'file', { type: blob.type })
          previewUrl = URL.createObjectURL(blob)
        }

        const entry: QueuedUploadFile = {
          activeTab: 'fields',
          backendStatus: data.status || 'OCR',
          createdAt: readStageCreatedAt(data),
          exportStatus: 'idle',
          fieldStatuses,
          fieldValues: mappedValues,
          file: fileObj,
          fileName: data.name,
          fileSize: typeof data.size === 'number' ? data.size : 0,
          focusedFieldKey: null,
          id: `staged-${data.id || stageId}`,
          isSyncing: false,
          jobId: null,
          masterSyncedValues: {},
          ocrExtractedValues: mappedValues,
          ocrStatus: 'complete',
          previewUrl,
          rawOcrJson: ocrJson,
          rawOcrText: ocrText,
          restoredFromServer: true,
          stageFileId: data.id || stageId,
          status: backendStatusToQueueStatus(data.status || 'OCR'),
          syncingField: null,
        }

        setQueue([entry])
        setOpenFileId(entry.id)
        lastSavedValuesRef.current.set(entry.id, JSON.stringify(mappedValues))
        triggerAutoSync(entry.id, mappedValues)
      } finally {
        setIsRestoringQueue(false)
      }
    }

    void loadSingleStaged()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialStagedFileId, repositoryFields])

  const buildMetadataFor = (entry: QueuedUploadFile) => {
    const fields = repositoryFields.map((field) => {
      const value = entry.fieldValues[getFieldKey(field)] ?? ''

      return {
        dataType: field.dataType,
        id: field.id,
        name: field.name,
        sqlColumnName: field.sqlColumnName,
        value,
      }
    })

    const values = fields.reduce<Record<string, any>>((acc, field) => {
      acc[field.sqlColumnName || field.id] = field.value
      return acc
    }, {})

    values.ocrJson = entry.rawOcrJson ?? []
    values.ocrText = entry.rawOcrText ?? ''

    return {
      fields,
      folderId: folderId ? String(folderId) : null,
      repositoryId: repositoryId || repositoryData?.id || null,
      values,
    }
  }

  // Mirrors the {name, value, type} field shape the confirmed
  // load/{fileId} response uses, for the PUT index/{fileId} body.
  const buildIndexPayload = (
    entry: QueuedUploadFile,
  ): IndexStageFileRequest => ({
    fields: repositoryFields.map((field) => {
      const rawVal = entry.fieldValues[getFieldKey(field)]
      const strVal =
        rawVal === undefined || rawVal === null
          ? ''
          : typeof rawVal === 'object'
            ? JSON.stringify(rawVal)
            : String(rawVal)
      return {
        name: field.name,
        type: String(field.dataType || 'text').trim(),
        value: strVal,
      }
    }),
    itemId: null,
    ocrResult: null,
    repositoryId: String(repositoryId || repositoryData?.id || ''),
    status: 'Indexing',
  })

  // Auto-save to /uploadAndIndex/index/{id}/fields 3 seconds after user stops typing
  const ENABLE_INDEXING_AUTOSAVE = true

  const [autoSaveStatus, setAutoSaveStatus] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle')
  const lastSavedValuesRef = useRef<Map<string, string>>(new Map())
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)

  const debouncedAutoSave = useDebouncedCallback(
    async (targetEntryId: string) => {
      if (!ENABLE_INDEXING_AUTOSAVE) return
      const entry = queueRef.current.find((item) => item.id === targetEntryId)
      if (!entry) return

      const stageId =
        entry.stageFileId ||
        (entry.id.startsWith('staged-')
          ? entry.id.replace(/^staged-/, '')
          : null)

      if (!stageId) return

      if (
        entry.exportStatus === 'exporting' ||
        entry.status === 'indexing' ||
        entry.status === 'indexed'
      ) {
        return
      }

      const currentSerialized = JSON.stringify(entry.fieldValues)
      if (lastSavedValuesRef.current.get(entry.id) === currentSerialized) {
        return
      }

      try {
        setAutoSaveStatus('saving')
        const payload = buildIndexPayload(entry)
        const { error } = await updateStageFileFields(stageId, payload)

        if (error) {
          console.warn('[AutoSave] Error auto-saving stage file fields:', error)
          setAutoSaveStatus('error')
        } else {
          lastSavedValuesRef.current.set(entry.id, currentSerialized)
          setAutoSaveStatus('saved')
          if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
          autoSaveTimerRef.current = setTimeout(() => {
            setAutoSaveStatus('idle')
          }, 3000)
        }
      } catch (err) {
        console.warn('[AutoSave] Exception auto-saving stage file fields:', err)
        setAutoSaveStatus('error')
      }
    },
    3000,
  )

  useEffect(() => {
    if (!ENABLE_INDEXING_AUTOSAVE || !activeEntry) return

    const stageId =
      activeEntry.stageFileId ||
      (activeEntry.id.startsWith('staged-')
        ? activeEntry.id.replace(/^staged-/, '')
        : null)

    if (!stageId) return

    const serialized = JSON.stringify(activeEntry.fieldValues)

    if (!lastSavedValuesRef.current.has(activeEntry.id)) {
      lastSavedValuesRef.current.set(activeEntry.id, serialized)
      return
    }

    if (lastSavedValuesRef.current.get(activeEntry.id) !== serialized) {
      debouncedAutoSave(activeEntry.id)
    }
  }, [
    activeEntry?.id,
    activeEntry?.stageFileId,
    activeEntry?.fieldValues,
    debouncedAutoSave,
  ])

  const validateMandatoryFieldsFor = (entry: QueuedUploadFile) => {
    const missingField = repositoryFields.find((field) => {
      if (!field.isMandatory) return false
      return isBlankFieldValue(entry.fieldValues[getFieldKey(field)])
    })

    if (missingField) {
      const fieldName = missingField.name
      showToast({
        message: t`Please enter ${fieldName}.`,
        variant: 'info',
      })
      return false
    }

    return true
  }

  const filledFieldsCount = useMemo(() => {
    if (!activeEntry) return 0
    return repositoryFields.filter((field) => {
      const value = activeEntry.fieldValues[getFieldKey(field)]
      return !isBlankFieldValue(value)
    }).length
  }, [repositoryFields, activeEntry])

  const indexEntry = useCallback(
    async (
      id: string,
      options?: { keepList?: boolean; quiet?: boolean },
    ): Promise<any | null> => {
      const entry = queue.find((item) => item.id === id)
      if (!entry) {
        showToast({
          message: t`Please select a file to upload.`,
          variant: 'info',
        })
        return null
      }

      const activeRepositoryId = repositoryId || repositoryData?.id

      if (!activeRepositoryId) {
        showToast({
          message: t`We couldn't upload your file. Please try again.`,
          variant: 'error',
        })
        return null
      }

      if (!validateMandatoryFieldsFor(entry)) return null

      if (!entry.stageFileId) {
        showToast({
          message: t`This file hasn't finished staging yet. Please wait a moment and try again.`,
          variant: 'info',
        })
        return null
      }

      try {
        if (options?.keepList) {
          setOpenFileId((current) => (current === id ? null : current))
        }
        updateEntry(id, { exportStatus: 'exporting', status: 'indexing' })

        const { data, error } = await indexStageFile(
          entry.stageFileId,
          buildIndexPayload(entry),
        )

        if (error) {
          updateEntry(id, {
            errorMessage: String(error),
            exportStatus: 'error',
            status: 'error',
          })
          showToast({
            message: t`Error uploading file: ${error}`,
            variant: 'error',
          })
          return null
        }

        updateEntry(id, { exportStatus: 'success', status: 'indexed' })
        lastSavedValuesRef.current.set(id, JSON.stringify(entry.fieldValues))
        setAutoSaveStatus('saved')
        if (!options?.quiet) {
          showToast({
            message: t`File exported successfully.`,
            variant: 'success',
          })
        }
        await onSuccess?.()

        if (viewingDrafts || options?.keepList) {
          setQueue((prev) => {
            const remaining = prev.filter((item) => item.id !== id)
            setDraftCounts(countQueueDraftGroups(remaining, repositoryFields))
            return remaining
          })
          setOpenFileId((current) => (current === id ? null : current))
        } else {
          onBack?.()
        }

        return data
      } catch (error: any) {
        const detail = error?.message || error
        updateEntry(id, {
          errorMessage: String(detail),
          exportStatus: 'error',
          status: 'error',
        })
        showToast({
          message: t`Exception uploading file: ${detail}`,
          variant: 'error',
        })
        return null
      }
    },
    [
      queue,
      repositoryId,
      repositoryData?.id,
      t,
      updateEntry,
      onSuccess,
      onBack,
      viewingDrafts,
    ],
  )

  const requestIndexEntry = useCallback(
    (id: string, options?: { keepList?: boolean; quiet?: boolean }) => {
      const entry = queue.find((item) => item.id === id)
      if (!entry) {
        void indexEntry(id, options)
        return
      }

      if (!validateMandatoryFieldsFor(entry)) return

      const badStatuses = collectVisibleBadOcrStatuses(entry, repositoryFields)
      if (badStatuses.length === 0) {
        void indexEntry(id, options)
        return
      }

      const primary = badStatuses[0]
      const dateLabel = primary.value || primary.status
      const description =
        badStatuses.length === 1
          ? t`This file has expired with date ${dateLabel}. Do you want to export?`
          : t`This file still has expired or invalid fields (${badStatuses
              .map((item) => `${item.fieldName}: ${item.status}`)
              .join(', ')}). Do you want to export?`

      pendingExpiredExportRef.current = { id, options }
      setExpiredExportDescription(description)
      setExpiredExportConfirmOpen(true)
    },
    [indexEntry, queue, repositoryFields, t, validateMandatoryFieldsFor],
  )

  const indexedCount = queue.filter(
    (entry) => entry.status === 'indexed',
  ).length
  const allIndexed = queue.length > 0 && indexedCount === queue.length

  const displayQueueRank: Record<QueuedFileStatus, number> = {
    analyzing: 1,
    error: 0,
    indexed: 3,
    indexing: 2,
    queued: 1,
    ready: 2,
  }
  const sortedQueueForDisplay = useMemo(
    () =>
      [...queue].sort(
        (a, b) => displayQueueRank[a.status] - displayQueueRank[b.status],
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queue],
  )
  const uploadingQueue = useMemo(
    () =>
      sortedQueueForDisplay.filter(
        (entry) =>
          entry.status !== 'indexed' &&
          !isDraftReadyForExport(entry, repositoryFields),
      ),
    [repositoryFields, sortedQueueForDisplay],
  )
  const exportQueue = useMemo(
    () =>
      sortedQueueForDisplay.filter((entry) =>
        isDraftReadyForExport(entry, repositoryFields),
      ),
    [repositoryFields, sortedQueueForDisplay],
  )
  const visibleQueue =
    queueListTab === 'uploading' ? uploadingQueue : exportQueue
  /** Draft media library shows every non-indexed file (no Ready/In-progress tabs). */
  const draftQueue = useMemo(
    () => queue.filter((entry) => entry.status !== 'indexed'),
    [queue],
  )

  const isVerticalQueueLayout = true

  const activeStepIndex = getActiveStepIndex(
    Boolean(activeEntry),
    deriveOcrStatus(activeEntry),
    activeEntry?.exportStatus ?? 'idle',
  )

  const [debouncedFocusedValue] = useDebouncedValue(
    focusedFieldKey ? activeFieldValues[focusedFieldKey] : '',
    400,
  )

  const highlightTerms = useMemo(() => {
    if (!focusedFieldKey) return []
    return debouncedFocusedValue ? [debouncedFocusedValue] : []
  }, [focusedFieldKey, debouncedFocusedValue])

  const handleFieldFocus = useCallback(
    (field: RepositoryField) => {
      if (!activeEntry) return
      updateEntry(activeEntry.id, { focusedFieldKey: getFieldKey(field) })
    },
    [activeEntry, updateEntry],
  )

  const renderFieldControl = (
    field: RepositoryField,
    isSyncField: boolean = false,
  ) => {
    const column = toDynamicColumn(field)
    const fieldKey = getFieldKey(field)
    const fieldType = normalizeType(field.dataType)
    const value = isAnalyzing ? '' : (activeFieldValues[fieldKey] ?? '')
    const disabled = Boolean(field.isReadOnly || isExporting || isAnalyzing)
    const label = field.name
    const required = Boolean(field.isMandatory)
    const options = getSelectOptions(column)
    const fieldStatus = activeEntry
      ? resolveVisibleOcrFieldStatus(field, activeEntry)
      : ''
    const statusTone = fieldStatus
      ? getOcrFieldStatusTone(fieldStatus)
      : null
    const statusToneClass = statusTone
      ? OCR_FIELD_STATUS_TONE_CLASS[statusTone]
      : null
    const inputLabel = fieldStatus ? undefined : label
    const inputRequired = fieldStatus ? false : required

    const focusProps = {
      onFocus: () => handleFieldFocus(field),
    }

    const normalizedFieldName = String(field.name).trim().toLowerCase()
    const normalizedColName = String(field.sqlColumnName || '')
      .trim()
      .toLowerCase()
    const matchingSyncFields = masterFormSyncData?.syncFields?.filter((sf) => {
      const norm = sf.repoField.trim().toLowerCase()
      return norm === normalizedFieldName || norm === normalizedColName
    })

    const renderRightSection = () => {
      const elements = []

      const ocrValue = activeOcrExtractedValues[fieldKey]
      const syncValue = activeMasterSyncedValues[fieldKey]
      const currentValue = activeFieldValues[fieldKey]

      // Icon if value is from OCR or Master Sync
      if (currentValue) {
        if (currentValue === syncValue) {
          elements.push(
            <Tooltip
              content={t`Master Sync Data`}
              key='master-icon'
              position='top'
            >
              <div className='flex items-center justify-center text-[var(--indigo-11)] transition-colors hover:text-[var(--indigo-9)]'>
                <Icon className='size-4' name='lucide:database' />
              </div>
            </Tooltip>,
          )
        } else if (currentValue === ocrValue) {
          elements.push(
            <Tooltip
              content={t`OCR Extracted Data`}
              key='ocr-icon'
              position='top'
            >
              <div className='flex items-center justify-center text-[var(--primary-11)] transition-colors hover:text-[var(--primary-9)]'>
                <Icon className='size-4' name='tabler:scan' />
              </div>
            </Tooltip>,
          )
        }
      }

      if (matchingSyncFields && matchingSyncFields.length > 0) {
        const isThisFieldSyncing =
          syncingField === matchingSyncFields[0].repoField
        elements.push(
          <Tooltip
            content={t`Sync Master Data`}
            disabled={!value}
            key='sync-btn-tooltip'
            position='top'
          >
            <Button
              aria-label={t`Sync`}
              disabled={!value || syncingField !== null}
              key='sync-btn'
              className={cn(
                'flex h-[20px] w-[40px] items-center justify-center gap-1',
                'rounded-[4px] px-1.5',
                'text-[10px] font-medium tracking-[0.04em] uppercase',
                'transition-colors',
                isThisFieldSyncing
                  ? 'cursor-not-allowed bg-[var(--primary-4)] text-[var(--primary-11)]'
                  : value
                    ? 'border border-[var(--primary-5)] bg-[var(--surface)] text-[var(--primary-9)] shadow-sm hover:bg-[var(--gray-2)]'
                    : 'cursor-not-allowed bg-transparent text-[var(--gray-8)]',
              )}
              onClick={() => {
                if (!activeEntry) return
                const uniqueFormIds = new Set<string>()
                matchingSyncFields.forEach((sf) => {
                  if (!uniqueFormIds.has(sf.formId)) {
                    uniqueFormIds.add(sf.formId)
                    void handleSync(
                      activeEntry.id,
                      toTextValue(value),
                      sf.repoField,
                      sf.formId,
                    )
                  }
                })
              }}
            >
              {isThisFieldSyncing && (
                <Icon className='size-2.5 animate-spin' name='tabler:loader' />
              )}
              <span className='text-[9px]'> {t`SYNC`}</span>
            </Button>
          </Tooltip>,
        )
      }

      if (elements.length === 0) return undefined

      return (
        <div className='flex w-full items-center justify-end gap-1.5 pr-2.5'>
          {elements}
        </div>
      )
    }

    const fieldClassName = cn(
      'w-full',
      isSyncField &&
        '[&_button]:bg-[var(--surface)] [&_input]:border-[var(--gray-4)] [&_input]:bg-[var(--gray-1)] [&_textarea]:border-[var(--gray-4)] [&_textarea]:bg-[var(--gray-1)]',
    )

    const renderSuggestionCapsule = () => {
      const ocrValue = activeOcrExtractedValues[fieldKey]
      const syncValue = activeMasterSyncedValues[fieldKey]
      const currentValue = activeFieldValues[fieldKey]

      if (
        ocrValue &&
        ocrValue !== currentValue &&
        (!syncValue || syncValue === currentValue)
      ) {
        return (
          <button
            className='mt-1 flex w-fit max-w-full items-center gap-1 rounded-full border border-[var(--primary-4)] bg-[var(--primary-1)] px-2 py-0.5 text-[10px] font-medium text-[var(--primary-11)] transition-colors hover:bg-[var(--primary-2)]'
            type='button'
            onClick={() => updateFieldValue(field, ocrValue)}
          >
            <Icon className='size-3 shrink-0' name='tabler:scan' />
            <span className='ml-2 truncate text-xs'>{ocrValue}</span>
          </button>
        )
      }

      if (syncValue && syncValue !== currentValue) {
        return (
          <button
            className='mt-1 flex w-fit max-w-full items-center gap-1 rounded-full border border-[var(--indigo-4)] bg-[var(--indigo-1)] px-2 py-0.5 text-[10px] font-medium text-[var(--indigo-11)] transition-colors hover:bg-[var(--indigo-2)]'
            type='button'
            onClick={() => updateFieldValue(field, syncValue)}
          >
            <Icon className='size-3 shrink-0' name='lucide:database' />
            <span className='ml-2 truncate text-xs'>{syncValue}</span>
          </button>
        )
      }
      return null
    }

    let InputComponent = null

    if (
      fieldType === 'table' ||
      fieldType === 'dynamic_table' ||
      fieldType.includes('table')
    ) {
      InputComponent = (
        <TableFieldInput
          className={fieldClassName}
          disabled={disabled}
          field={field}
          label={inputLabel ?? ''}
          required={inputRequired}
          value={value}
          onChange={(jsonVal) => updateFieldValue(field, jsonVal)}
        />
      )
    } else if (fieldType === 'date' || fieldType === 'datetime') {
      InputComponent = (
        <InputDate
          className={fieldClassName}
          disabled={disabled}
          label={inputLabel}
          required={inputRequired}
          // @ts-ignore
          rightSection={renderRightSection()}
          rightSectionPointerEvents='auto'
          // @ts-ignore
          rightSectionWidth={90}
          value={value || ''}
          onChange={(nextValue: string | null) =>
            updateFieldValue(field, nextValue || '')
          }
          {...focusProps}
        />
      )
    } else if (
      fieldType === 'select' ||
      fieldType === 'dropdown' ||
      fieldType === 'single_select' ||
      fieldType === 'multi_select' ||
      fieldType === 'single_choice' ||
      fieldType === 'multiple_choice' ||
      options.length > 0
    ) {
      const textVal = toTextValue(value)
      const selectedOption = findSelectedOption(options, textVal)
      const effectiveOptions =
        selectedOption &&
          !options.some(
            (o) =>
              String(o.value ?? '').toLowerCase() ===
              String(selectedOption.value ?? '').toLowerCase() ||
              String(o.name).toLowerCase() ===
              selectedOption.name.toLowerCase() ||
              String(o.id).toLowerCase() ===
              String(selectedOption.id).toLowerCase(),
          )
          ? [...options, selectedOption]
          : options

      InputComponent = (
        <InputSelect
          className={fieldClassName}
          disabled={disabled}
          label={inputLabel}
          options={effectiveOptions}
          required={inputRequired}
          // @ts-ignore
          rightSection={renderRightSection()}
          rightSectionPointerEvents='auto'
          // @ts-ignore
          rightSectionWidth={90}
          value={selectedOption}
          creatable
          searchable
          onChange={(selected) =>
            updateFieldValue(
              field,
              String(selected?.value ?? selected?.name ?? selected?.id ?? ''),
            )
          }
          {...focusProps}
        />
      )
    } else if (
      fieldType === 'long_text' ||
      fieldType === 'textarea' ||
      label.toLowerCase().includes('address')
    ) {
      InputComponent = (
        <InputTextarea
          className={fieldClassName}
          disabled={disabled}
          label={inputLabel}
          placeholder={isAnalyzing ? t`Extracting...` : t`Enter ${label}`}
          required={inputRequired}
          // @ts-ignore
          rightSection={renderRightSection()}
          rightSectionPointerEvents='auto'
          // @ts-ignore
          rightSectionWidth={90}
          rows={3}
          value={toTextValue(value)}
          onChange={(nextValue: string) => updateFieldValue(field, nextValue)}
          {...focusProps}
        />
      )
    } else {
      InputComponent = (
        <InputText
          className={fieldClassName}
          disabled={disabled}
          label={inputLabel}
          placeholder={isAnalyzing ? t`Extracting...` : t`Enter ${label}`}
          required={inputRequired}
          rightSection={renderRightSection()}
          rightSectionPointerEvents='auto'
          rightSectionWidth={90}
          value={toTextValue(value)}
          type={
            fieldType === 'decimal' ||
              fieldType === 'number' ||
              fieldType === 'int' ||
              fieldType === 'integer' ||
              fieldType === 'currency'
              ? 'number'
              : 'text'
          }
          onChange={(nextValue: string) => updateFieldValue(field, nextValue)}
          {...focusProps}
        />
      )
    }

    return (
      <div
        className={cn(
          'flex w-full flex-col',
          fieldStatus && statusToneClass
            ? cn('rounded-xl border p-3', statusToneClass.panel)
            : undefined,
        )}
      >
        {fieldStatus && statusToneClass ? (
          <div className='mb-2 flex items-center justify-between gap-2'>
            <div
              className={cn(
                'flex min-w-0 items-center gap-1 text-13 font-medium',
                statusToneClass.label,
              )}
            >
              <span className='truncate'>{label}</span>
              {required ? (
                <span className='text-[var(--red-9)]'>*</span>
              ) : null}
            </div>
            <span
              className={cn(
                'shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-tight',
                statusToneClass.capsule,
              )}
            >
              {fieldStatus}
            </span>
          </div>
        ) : null}
        {InputComponent}
        {renderSuggestionCapsule()}
      </div>
    )
  }

  const parsedJsonData = useMemo(() => {
    if (!activeEntry) return {}
    if (
      activeRawOcrJson &&
      (Array.isArray(activeRawOcrJson)
        ? activeRawOcrJson.length > 0
        : Object.keys(activeRawOcrJson).length > 0)
    ) {
      return activeRawOcrJson
    }
    const meta = buildMetadataFor(activeEntry) as Record<string, any>
    if (meta.ocrJson) {
      try {
        return typeof meta.ocrJson === 'string'
          ? JSON.parse(meta.ocrJson)
          : meta.ocrJson
      } catch {
        return meta.ocrJson
      }
    }
    return meta
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRawOcrJson, activeEntry, repositoryFields])

  const displayJsonContent = useMemo(() => {
    return safeJson(parsedJsonData)
  }, [parsedJsonData])

  const copyMetadata = async () => {
    await navigator.clipboard.writeText(displayJsonContent)
    showToast({ message: t`JSON copied to clipboard.`, variant: 'success' })
  }

  const setActiveTabForActiveEntry = (tab: ResultTab) => {
    if (!activeEntry) return
    updateEntry(activeEntry.id, { activeTab: tab })
  }

  const handleOpenDraftFiles = () => {
    void openDraftFilesView()
  }

  const ensureDraftFieldsLoaded = useCallback(
    (id: string) => {
      const entry = queueRef.current.find((item) => item.id === id)
      if (!entry?.stageFileId) return

      if (!isPlayablePreviewUrl(entry.previewUrl)) {
        draftPreviewLoadIdsRef.current.delete(entry.id)
      }

      if (!entry.restoredFromServer) return
      if (loadedStageFileIdsRef.current.has(entry.stageFileId)) {
        if (!isPlayablePreviewUrl(entry.previewUrl)) {
          void (async () => {
            const blob = await fetchStageFileBlob(entry.stageFileId as string)
            if (!isUsableFileBlob(blob)) return
            const fileName = entry.fileName || 'file'
            const { blob: typedBlob, mimeType } = typedPreviewBlob(
              blob!,
              fileName,
            )
            updateEntry(entry.id, {
              file:
                entry.file ||
                new File([typedBlob], fileName, { type: mimeType }),
              previewUrl: URL.createObjectURL(typedBlob),
            })
          })()
        }
        return
      }
      loadedStageFileIdsRef.current.add(entry.stageFileId)
      void loadAndPopulateFields(entry)
    },
    [loadAndPopulateFields, updateEntry],
  )

  const handleOpenQueuedFile = (id: string) => {
    if (listExportIdsRef.current.has(id)) return
    setOpenFileId(id)
    ensureDraftFieldsLoaded(id)
  }

  // When bulk upload lands on Draft Files, load OCR fields for the focused card.
  useEffect(() => {
    if (!viewingDrafts || !focusedDraftId) return
    ensureDraftFieldsLoaded(focusedDraftId)
  }, [ensureDraftFieldsLoaded, focusedDraftId, viewingDrafts])

  const handleExportQueuedFile = async (id: string) => {
    requestIndexEntry(id, { keepList: true })
  }

  const draftListForSelection = viewingDrafts ? draftQueue : visibleQueue
  const selectedVisibleEntries = draftListForSelection.filter((entry) =>
    selectedDraftIds.includes(entry.id),
  )
  const selectedVisibleCount = selectedVisibleEntries.length
  const allVisibleSelected =
    draftListForSelection.length > 0 &&
    selectedVisibleCount === draftListForSelection.length
  const someVisibleSelected =
    selectedVisibleCount > 0 && !allVisibleSelected
  const selectedExportableCount = selectedVisibleEntries.filter((entry) =>
    isDraftReadyForExport(entry, repositoryFields),
  ).length

  const toggleDraftSelection = (id: string, checked: boolean) => {
    setSelectedDraftIds((prev) =>
      checked
        ? prev.includes(id)
          ? prev
          : [...prev, id]
        : prev.filter((item) => item !== id),
    )
  }

  const handleBulkDeleteDrafts = async () => {
    const entries = selectedVisibleEntries.filter(
      (entry) => entry.status !== 'indexing',
    )
    if (!entries.length) return

    setIsBulkDeleting(true)
    try {
      const repoId = String(repositoryId || repositoryData?.id || '')
      const stageIds = entries
        .map((entry) => entry.stageFileId)
        .filter((id): id is string => Boolean(id))

      if (stageIds.length && repoId) {
        const { error } = await deleteStagedFiles({
          fileIds: stageIds,
          repositoryId: repoId,
        })
        if (error) {
          showToast({
            message: String(error),
            variant: 'error',
          })
          return
        }
      }

      entries.forEach((entry) => {
        if (entry.previewUrl) URL.revokeObjectURL(entry.previewUrl)
      })

      const removed = new Set(entries.map((entry) => entry.id))
      const remaining = queue.filter((item) => !removed.has(item.id))
      setQueue(remaining)
      if (viewingDrafts) {
        setDraftCounts(countQueueDraftGroups(remaining, repositoryFields))
      }
      setSelectedDraftIds((prev) => prev.filter((id) => !removed.has(id)))
      if (openFileId && removed.has(openFileId)) setOpenFileId(null)
      showToast({
        message:
          entries.length === 1
            ? t`Staged file deleted.`
            : t`${entries.length} staged files deleted.`,
        variant: 'success',
      })
      setBulkDeleteConfirmOpen(false)
      if (onSuccess) void onSuccess()
    } catch (err) {
      console.error(err)
    } finally {
      setIsBulkDeleting(false)
    }
  }

  const handleBulkExportDrafts = async () => {
    const targets = selectedVisibleEntries.filter((entry) =>
      isDraftReadyForExport(entry, repositoryFields),
    )
    if (!targets.length) return

    setIsBulkExporting(true)
    try {
      let successCount = 0
      for (const entry of targets) {
        const result = await indexEntry(entry.id, {
          keepList: true,
          quiet: true,
        })
        if (result) successCount += 1
      }
      setSelectedDraftIds([])
      setBulkExportConfirmOpen(false)
      if (successCount > 0) {
        showToast({
          message:
            successCount === 1
              ? t`File exported successfully.`
              : t`${successCount} files exported successfully.`,
          variant: 'success',
        })
      }
    } finally {
      setIsBulkExporting(false)
    }
  }

  // In vertical mode, opening a file replaces the list with a dedicated
  // review "page" (see the header Back button) rather than showing the
  // list and the review panel stacked together. With no file open, the
  // list itself fills the available screen height with its own scroll.
  const showQueueList = !(isVerticalQueueLayout && activeEntry)
  const isListOnlyPage = isVerticalQueueLayout && !activeEntry
  const isDraftFullPage = viewingDrafts && isListOnlyPage
  const draftFileCount = draftQueue.length
  const draftNavIndex = draftQueue.findIndex((entry) => entry.id === openFileId)
  const previousDraft =
    draftNavIndex > 0 ? draftQueue[draftNavIndex - 1] : null
  const nextDraft =
    draftNavIndex >= 0 && draftNavIndex < draftQueue.length - 1
      ? draftQueue[draftNavIndex + 1]
      : null

  const queueStrip = queue.length > 0 && showQueueList && (
    <div
      className={cn(
        'flex flex-col bg-surface',
        isDraftFullPage
          ? 'min-h-0 flex-1 gap-0'
          : 'gap-2 rounded-2xl border border-[var(--gray-3)] p-3 shadow-sm sm:p-4',
        isListOnlyPage && !isDraftFullPage && 'min-h-0 flex-1',
      )}
    >
      {!isDraftFullPage ? (
        <div className='relative flex items-center justify-between gap-4 border-b border-[var(--gray-3)] px-1 pt-1'>
          <div className='flex min-w-0 flex-1 items-center gap-6 sm:gap-8'>
            {(
              [
                {
                  count: exportQueue.length,
                  id: 'export' as const,
                  label: t`Ready to export`,
                },
                {
                  count: uploadingQueue.length,
                  id: 'uploading' as const,
                  label: t`In progress`,
                },
              ] as const
            ).map((tab) => {
              const isSelected = queueListTab === tab.id
              return (
                <button
                  key={tab.id}
                  className={cn(
                    'relative flex shrink-0 items-center pb-3 text-sm font-semibold whitespace-nowrap transition-colors',
                    isSelected
                      ? 'text-[var(--gray-13)]'
                      : 'text-[var(--gray-10)] hover:text-[var(--gray-12)]',
                  )}
                  type='button'
                  onClick={() => {
                    setQueueListTab(tab.id)
                    setSelectedDraftIds([])
                    setFocusedDraftId(null)
                  }}
                >
                  {tab.label} ({tab.count})
                  {isSelected ? (
                    <span className='absolute right-0 bottom-0 left-0 h-0.5 rounded-full bg-[var(--primary-9)]' />
                  ) : null}
                </button>
              )
            })}
          </div>

          <div className='mb-2 flex shrink-0 items-center'>
            <Tooltip
              content={isQueueCollapsed ? t`Show file list` : t`Hide file list`}
              position='top'
            >
              <IconButton
                color='gray'
                size='xs'
                variant='ghost'
                ariaLabel={
                  isQueueCollapsed ? t`Show file list` : t`Hide file list`
                }
                icon={
                  isQueueCollapsed ? 'lucide:chevron-down' : 'lucide:chevron-up'
                }
                onClick={() => setIsQueueCollapsed((prev) => !prev)}
              />
            </Tooltip>
          </div>
        </div>
      ) : null}

      {(!isQueueCollapsed || isDraftFullPage) && viewingDrafts ? (
        <DraftFilesMediaLibrary
          allSelected={allVisibleSelected}
          entries={draftQueue}
          exportableSelectedCount={selectedExportableCount}
          focusedId={focusedDraftId}
          fullPage={isDraftFullPage}
          isBulkDeleting={isBulkDeleting}
          isBulkExporting={isBulkExporting}
          repositoryFields={repositoryFields}
          selectedIds={selectedDraftIds}
          someSelected={someVisibleSelected}
          title={`${t`Draft Files`} (${draftFileCount})`}
          missingMandatoryById={Object.fromEntries(
            draftQueue.map((entry) => [
              entry.id,
              entry.status === 'ready'
                ? hasMissingMandatoryFields(
                    entry.fieldValues,
                    repositoryFields,
                  )
                : entry.status !== 'indexed',
            ]),
          )}
          onBack={() => {
            setViewingDrafts(false)
            setOpenFileId(null)
            setFocusedDraftId(null)
            setSelectedDraftIds([])
            setQueue([])
          }}
          onBulkDelete={() => setBulkDeleteConfirmOpen(true)}
          onBulkExport={() => setBulkExportConfirmOpen(true)}
          onExport={handleExportQueuedFile}
          onFieldChange={(entryId, fieldKey, value) => {
            updateEntry(entryId, (entry) => {
              if (String(entry.fieldValues?.[fieldKey] ?? '') === value) {
                return {}
              }
              return {
                fieldValues: { ...entry.fieldValues, [fieldKey]: value },
              }
            })
          }}
          onFocus={(id) => {
            setFocusedDraftId(id)
            if (id) ensureDraftFieldsLoaded(id)
          }}
          onOpen={handleOpenQueuedFile}
          onRegenerate={handleRetryOcr}
          onRemove={handleRemoveFromQueue}
          onToggleSelect={toggleDraftSelection}
          onSelectAll={(checked) => {
            const visibleIds = draftQueue.map((entry) => entry.id)
            setSelectedDraftIds((prev) =>
              checked
                ? Array.from(new Set([...prev, ...visibleIds]))
                : prev.filter((id) => !visibleIds.includes(id)),
            )
          }}
        />
      ) : null}

      {!isQueueCollapsed && !viewingDrafts ? (
        <div
          className={cn(
            'ez-scrollbar flex flex-col gap-1.5 overflow-y-auto pr-1',
            isListOnlyPage ? 'min-h-0 flex-1' : 'max-h-[320px]',
          )}
        >
          {visibleQueue.length === 0 ? (
            <p className='px-3 py-6 text-center text-xs font-medium text-[var(--gray-10)]'>
              {queueListTab === 'uploading'
                ? t`No files are processing, and none are missing required fields.`
                : t`No files are ready to export yet. Files missing required fields are listed under In progress.`}
            </p>
          ) : (
            visibleQueue.map((entry) => (
              <UploadQueueFileCard
                className='w-full'
                entry={entry}
                isOpen={entry.id === openFileId}
                key={entry.id}
                missingMandatoryFields={hasMissingMandatoryFields(
                  entry.fieldValues,
                  repositoryFields,
                )}
                selected={selectedDraftIds.includes(entry.id)}
                showCheckbox={false}
                showExport={false}
                onExport={handleExportQueuedFile}
                onOpen={handleOpenQueuedFile}
                onRemove={handleRemoveFromQueue}
                onRetryOcr={handleRetryOcr}
                onToggleSelect={toggleDraftSelection}
              />
            ))
          )}
        </div>
      ) : null}
    </div>
  )

  if (queue.length === 0 && isRestoringQueue) {
    return (
      <div className='flex h-full flex-col items-center justify-center gap-3 bg-surface-muted'>
        <Icon
          className='size-8 animate-spin text-[var(--primary-9)]'
          name='tabler:loader-2'
        />
        <p className='text-sm font-medium text-[var(--gray-10)]'>
          {t`Checking for previously staged files...`}
        </p>
      </div>
    )
  }

  if (queue.length === 0) {
    return (
      <>
        <div className='flex items-center justify-between border-b border-gray-3 bg-surface px-4 py-4'>
          <div className='flex items-start gap-3'>
            <IconButton
              ariaLabel={t`Back`}
              color='gray'
              icon='lucide:arrow-left'
              size='sm'
              variant='ghost'
              onClick={onBack}
            />
            <div>
              <h1 className='text-18/6 font-semibold tracking-tight text-gray-13'>
                {t`Upload Files`}
              </h1>

              <p className='text-13/5 text-gray-11'>
                {t`Upload documents securely, assign metadata, and organize files within your repository for efficient search and management.`}
              </p>
            </div>
          </div>
        </div>
        <AnimateFadeIn className='relative flex h-full flex-col items-stretch overflow-y-auto bg-surface-muted px-4 py-6 sm:px-6 lg:px-8'>
          <div className='mx-auto flex w-full max-w-5xl flex-col gap-6'>
            <AnimateSlideUp className='space-y-1 text-center'>
              <h1 className='text-2xl font-bold tracking-tight text-[var(--gray-13)]'>
                {t`Upload`}{' '}
                <span className='text-[var(--primary-9)]'>{t`Files`}</span>
              </h1>
              <p className='mx-auto max-w-xl text-sm font-medium text-[var(--gray-10)]'>
                {t`Upload documents securely, assign metadata, and organize files within your repository for efficient search and management.`}
              </p>
            </AnimateSlideUp>

            <AnimateSlideUp className='relative z-10 w-full' delay={0.1}>
              <div className='group relative overflow-hidden rounded-xl border border-[var(--gray-3)] bg-surface p-2 shadow-sm transition-all duration-500 hover:shadow-md'>
                <div className='pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-xl opacity-0 transition-opacity duration-700 group-hover:opacity-100'>
                  <div className='absolute inset-0 h-1/2 w-full animate-[scan_3s_linear_infinite] bg-gradient-to-b from-transparent via-[var(--primary-2)]/20 to-transparent' />
                </div>

                <div
                  className={[
                    'relative z-10 flex min-h-[140px] cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-[var(--primary-4)] px-8 py-6 text-center transition-all duration-500 ease-out',
                    isDragOver
                      ? 'scale-[0.99] border-[var(--primary-6)] bg-[var(--primary-1)]'
                      : 'bg-surface hover:border-[var(--primary-5)] hover:bg-[var(--primary-1)]/30',
                  ].join(' ')}
                  onClick={() => invoiceInputRef.current?.click()}
                  onDragLeave={() => setIsDragOver(false)}
                  onDragOver={(event) => {
                    event.preventDefault()
                    setIsDragOver(true)
                  }}
                  onDrop={(event) => {
                    event.preventDefault()
                    setIsDragOver(false)
                    handleInvoiceFiles(event.dataTransfer.files)
                  }}
                >
                  <AnimateStagger className='flex flex-col items-center gap-3'>
                    <div className='flex size-14 items-center justify-center rounded-2xl bg-[var(--primary-1)] shadow-sm transition-all duration-500 group-hover:scale-105'>
                      <Icon
                        className='size-7 text-[var(--primary-9)]'
                        name='tabler:cloud-upload'
                      />
                    </div>
                    <div className='text-center'>
                      <h2 className='text-base font-medium tracking-tight text-[var(--gray-13)]'>
                        {t`Drop your files here, or`}{' '}
                        <span className='text-[var(--primary-9)]'>{t`browse`}</span>
                      </h2>
                      <p className='text-xs font-medium text-[var(--gray-9)]'>
                        {t`Supports PDF, Word, Excel, PowerPoint, Images & Documents · Max 50 MB each`}
                      </p>
                    </div>
                  </AnimateStagger>

                  <input
                    accept={DOCUMENT_ACCEPT}
                    className='hidden'
                    ref={invoiceInputRef}
                    type='file'
                    multiple
                    onChange={(event) =>
                      handleInvoiceFiles(event.target.files)
                    }
                  />
                </div>
              </div>
            </AnimateSlideUp>

            <div className='mx-auto grid w-full max-w-3xl grid-cols-1 items-stretch gap-6 sm:grid-cols-2'>
              <UploadFeatureHighlight />

              <AnimateEntrancePop className='h-full' delay={0.15}>
                <button
                  className='group flex h-full w-full flex-col items-start rounded-xl border border-[var(--orange-4)] bg-[var(--orange-1)] p-5 text-left shadow-sm transition-all duration-300 hover:border-[var(--orange-6)] hover:shadow-md active:scale-[0.99]'
                  type='button'
                  onClick={() => {
                    void handleOpenDraftFiles()
                  }}
                >
                  <div className='flex w-full items-center gap-3'>
                    <div className='flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--orange-3)] text-[var(--orange-11)] transition-transform duration-300 group-hover:scale-110 2xl:size-10'>
                      <Icon
                        className='size-5 transition-transform duration-300 group-hover:rotate-6'
                        name='tabler:file-pencil'
                      />
                    </div>
                    <h4 className='text-sm font-semibold tracking-tight text-[var(--gray-13)]'>
                      {t`Draft Files`}
                    </h4>
                    <span className='ml-auto rounded-full bg-[var(--orange-3)] px-2.5 py-0.5 text-xs font-semibold text-[var(--orange-11)]'>
                      {isLoadingDraftCount ? '…' : draftCounts.total}
                    </span>
                  </div>
                  <p className='mt-2.5 text-xs leading-relaxed font-medium text-[var(--gray-10)]'>
                    {t`Open a saved file to review it and finish it.`}
                  </p>
                  <div className='mt-3 flex w-full flex-col gap-1.5'>
                    <div className='flex w-full items-center justify-between gap-3 text-xs text-[var(--gray-12)]'>
                      <span className='flex min-w-0 items-center gap-1.5'>
                        <span className='size-1 shrink-0 rounded-full bg-[var(--orange-9)]' />
                        {t`Ready to export`}
                      </span>
                      <span className='font-semibold'>
                        {isLoadingDraftCount ? '…' : draftCounts.waiting}
                      </span>
                    </div>
                    <div className='flex w-full items-center justify-between gap-3 text-xs text-[var(--gray-12)]'>
                      <span className='flex min-w-0 items-center gap-1.5'>
                        <span className='size-1 shrink-0 rounded-full bg-[var(--primary-9)]' />
                        {t`In progress`}
                      </span>
                      <span className='font-semibold'>
                        {isLoadingDraftCount ? '…' : draftCounts.inProgress}
                      </span>
                    </div>
                  </div>
                </button>
              </AnimateEntrancePop>
            </div>
            <style>{`
            @keyframes scan {
              0% { transform: translateY(-100%); }
              100% { transform: translateY(200%); }
            }
          `}</style>
          </div>
        </AnimateFadeIn>
      </>
    )
  }

  return (
    <AnimateFadeIn
      className={cn(
        'relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden',
        isDraftFullPage
          ? 'bg-surface'
          : 'bg-surface-muted px-4 pt-2 pb-3',
      )}
    >
      <div
        className={cn(
          'flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden',
          isDraftFullPage
            ? 'gap-0'
            : 'mx-auto max-w-7xl gap-3',
        )}
      >
        <input
          accept={DOCUMENT_ACCEPT}
          className='hidden'
          ref={invoiceInputRef}
          type='file'
          multiple
          onChange={(event) => handleInvoiceFiles(event.target.files)}
        />

        {viewingDrafts && isListOnlyPage && !isDraftFullPage ? (
          <div className='flex shrink-0 items-center gap-3 rounded-xl border border-[var(--gray-3)] bg-surface px-4 py-2.5 shadow-xs'>
            <button
              className='flex items-center gap-1.5 text-xs font-semibold text-[var(--gray-11)] transition-colors hover:text-[var(--primary-11)] active:scale-95'
              type='button'
              onClick={() => {
                setViewingDrafts(false)
                setOpenFileId(null)
                setFocusedDraftId(null)
                setSelectedDraftIds([])
                setQueue([])
              }}
            >
              <Icon
                className='size-4 text-[var(--gray-10)]'
                name='lucide:arrow-left'
              />
              <span>{t`Back`}</span>
            </button>
            <div className='min-w-0 border-l border-[var(--gray-4)] pl-3'>
              <p className='text-sm font-semibold text-[var(--gray-13)]'>
                {t`Draft Files`}
                <span className='ml-1 font-semibold text-[var(--gray-13)]'>
                  ({draftFileCount})
                </span>
              </p>
            </div>
          </div>
        ) : null}

        {queueStrip}

        {!activeEntry ? (
          allIndexed && (
            <div className='flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[var(--gray-4)] bg-surface p-12 text-center'>
              <Icon
                className='size-8 text-[var(--green-9)]'
                name='lucide:check-circle-2'
              />
              <p className='text-sm font-semibold text-[var(--gray-13)]'>
                {t`All files indexed`}
              </p>
              <Button className='!h-9 !px-4 !text-xs' onClick={onBack}>
                {t`Back to folder`}
              </Button>
            </div>
          )
        ) : (
          <>
            <div className='flex shrink-0 items-center justify-between gap-4 rounded-xl border border-[var(--gray-3)] bg-surface px-4 py-2.5 shadow-xs'>
              <div className='flex shrink-0 items-center border-r border-[var(--gray-4)] pr-4'>
                <button
                  className='flex items-center gap-1.5 text-xs font-semibold text-[var(--gray-11)] transition-colors hover:text-[var(--primary-11)] active:scale-95'
                  type='button'
                  onClick={() => {
                    if (activeEntry && !allIndexed) {
                      setBackConfirmOpen(true)
                    } else if (viewingDrafts) {
                      setOpenFileId(null)
                    } else {
                      onBack()
                    }
                  }}
                >
                  <Icon
                    className='size-4 text-[var(--gray-10)]'
                    name='lucide:arrow-left'
                  />
                  <span>{t`Back`}</span>
                </button>
              </div>

              <div className='flex min-w-0 flex-1 items-center gap-4'>
                {PROCESS_STEP_KEYS.map((step, index, list) => {
                  const isComplete = isStepComplete(
                    index,
                    activeStepIndex,
                    activeEntry?.exportStatus ?? 'idle',
                  )
                  const isActive = index === activeStepIndex && !isComplete
                  const isAnalysisStep = step === 'Analysis'
                  const isFieldsStep = step === 'Fields'
                  const isDoneStep = step === 'Done'
                  const showStepSpinner =
                    (isAnalysisStep && isAnalyzing) ||
                    (isDoneStep && isExporting)

                  return (
                    <div
                      className='flex min-w-0 flex-1 items-center gap-3 last:flex-none'
                      key={step}
                    >
                      <div className='flex min-w-0 items-center gap-3'>
                        <div
                          className={[
                            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm transition-colors',
                            isComplete
                              ? 'bg-green-9'
                              : isActive
                                ? 'bg-[var(--primary-9)]'
                                : 'bg-[var(--gray-4)] text-[var(--gray-9)]',
                          ].join(' ')}
                        >
                          {isComplete ? (
                            <CheckCircle2 size={18} strokeWidth={2.5} />
                          ) : showStepSpinner ? (
                            <Icon
                              className='size-4 animate-spin text-white'
                              name='tabler:loader-2'
                            />
                          ) : (
                            <span className='text-sm font-bold'>
                              {index + 1}
                            </span>
                          )}
                        </div>

                        <div className='min-w-0'>
                          <span
                            className={[
                              'block text-sm font-bold whitespace-nowrap',
                              isComplete || isActive
                                ? 'text-[var(--gray-13)]'
                                : 'text-[var(--gray-9)]',
                            ].join(' ')}
                          >
                            {processStepLabels[step]}
                          </span>

                          {isAnalysisStep && isAnalyzing ? (
                            <span className='mt-1 block text-[11px] font-medium text-[var(--gray-10)]'>
                              {t`Analyzing document...`}
                            </span>
                          ) : null}

                          {isFieldsStep && isFieldsPhase ? (
                            <span className='mt-1 block text-[11px] font-medium text-[var(--gray-10)]'>
                              {t`Review fields before export...`}
                            </span>
                          ) : null}

                          {isDoneStep && isExporting ? (
                            <span className='mt-1 block text-[11px] font-medium text-[var(--gray-10)]'>
                              {t`Exporting...`}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {index < list.length - 1 ? (
                        <div
                          className={[
                            'h-[2px] min-w-[60px] flex-1 rounded-full transition-colors',
                            isComplete ? 'bg-green-9' : 'bg-[var(--gray-4)]',
                          ].join(' ')}
                        />
                      ) : null}
                    </div>
                  )
                })}
              </div>
              {viewingDrafts ? (
                <div className='flex shrink-0 items-center gap-1 border-l border-[var(--gray-4)] pl-3'>
                  <Tooltip content={t`Previous file`} position='top'>
                    <button
                      aria-label={t`Previous file`}
                      className='flex size-8 items-center justify-center rounded-lg text-[var(--gray-11)] transition-colors hover:bg-[var(--gray-3)] hover:text-[var(--gray-13)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40'
                      disabled={!previousDraft}
                      type='button'
                      onClick={() => {
                        if (previousDraft) handleOpenQueuedFile(previousDraft.id)
                      }}
                    >
                      <Icon className='size-4' name='lucide:chevron-left' />
                    </button>
                  </Tooltip>
                  <Tooltip content={t`Next file`} position='top'>
                    <button
                      aria-label={t`Next file`}
                      className='flex size-8 items-center justify-center rounded-lg text-[var(--gray-11)] transition-colors hover:bg-[var(--gray-3)] hover:text-[var(--gray-13)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40'
                      disabled={!nextDraft}
                      type='button'
                      onClick={() => {
                        if (nextDraft) handleOpenQueuedFile(nextDraft.id)
                      }}
                    >
                      <Icon className='size-4' name='lucide:chevron-right' />
                    </button>
                  </Tooltip>
                </div>
              ) : null}
            </div>

            <div className='grid h-full min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden lg:grid-cols-[minmax(0,1fr)_minmax(470px,0.95fr)]'>
              <AnimateSlideUp className='flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--gray-3)] bg-surface shadow-sm'>
                <div className='flex h-[60px] shrink-0 items-center justify-between border-b border-[var(--gray-3)] px-5'>
                  <div className='flex min-w-0 items-center gap-3'>
                    <div className='flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-1)] text-[var(--primary-9)]'>
                      <FileText size={18} />
                    </div>
                    <div className='min-w-0'>
                      <Tooltip content={activeEntry.fileName} position='bottom-start'>
                        <h2 className='truncate text-base font-bold text-[var(--gray-13)]'>
                          {activeEntry.fileName}
                        </h2>
                      </Tooltip>
                      <p className='mt-0.5 text-xs font-medium text-[var(--gray-9)]'>
                        {formatFileSize(activeEntry.fileSize)}
                        {formatDraftDate(activeEntry.createdAt)
                          ? ` ${formatDraftDate(activeEntry.createdAt)}`
                          : ''}
                      </p>
                    </div>
                  </div>
                  {isFieldsPhase && !isExporting && (
                    <span className='shrink-0 rounded-full border border-[var(--orange-7)] bg-[var(--orange-2)] px-2 py-0.5 text-[10px] font-semibold tracking-wider text-[var(--orange-7)] uppercase'>
                      {t`Ready to export`}
                    </span>
                  )}
                </div>

                <div
                  className={[
                    'm-4 min-h-0 flex-1 overflow-hidden rounded-xl border transition-all',
                    isDragOver
                      ? 'border-[var(--primary-6)] bg-[var(--primary-1)]'
                      : 'border-[var(--gray-4)] bg-[var(--gray-1)]',
                  ].join(' ')}
                  onDragLeave={() => setIsDragOver(false)}
                  onDragOver={(event) => {
                    event.preventDefault()
                    setIsDragOver(true)
                  }}
                  onDrop={(event) => {
                    event.preventDefault()
                    setIsDragOver(false)
                    handleInvoiceFiles(event.dataTransfer.files)
                  }}
                >
                  <DocumentPreviewViewer
                    fileBlob={activeEntry.file}
                    fileName={activeEntry.fileName}
                    fileUrl={
                      isPlayablePreviewUrl(activeEntry.previewUrl)
                        ? activeEntry.previewUrl
                        : null
                    }
                    highlightTerms={highlightTerms}
                    isPdf={
                      activeEntry.file
                        ? isPdf(activeEntry.file)
                        : /\.pdf$/i.test(activeEntry.fileName || '')
                    }
                    showScanOverlay={isAnalyzing}
                    enableHighlight
                    isImage={
                      activeEntry.file
                        ? isImage(activeEntry.file)
                        : /\.(bmp|jpeg|jpg|png|svg|tif|tiff|webp)$/i.test(
                            activeEntry.fileName || '',
                          )
                    }
                    isLoading={
                      !isPlayablePreviewUrl(activeEntry.previewUrl) &&
                      Boolean(activeEntry.stageFileId)
                    }
                  />
                </div>
              </AnimateSlideUp>

              <AnimateSlideUp
                className='flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--gray-3)] bg-surface shadow-sm'
                delay={0.08}
              >
                <div className='flex h-[60px] shrink-0 items-center justify-between border-b border-[var(--gray-3)] px-5'>
                  <div className='flex min-w-0 items-center gap-3'>
                    <Tooltip
                      position='top'
                      content={
                        activeTab === 'fields'
                          ? t`Switch to JSON view`
                          : t`Switch to Fields view`
                      }
                    >
                      <button
                        className='flex size-9 shrink-0 items-center justify-center rounded-xl border border-[var(--gray-4)] bg-[var(--gray-2)] text-[var(--gray-12)] shadow-xs transition-all hover:bg-[var(--gray-3)] active:scale-95'
                        type='button'
                        aria-label={
                          activeTab === 'fields'
                            ? t`Switch to JSON view`
                            : t`Switch to Fields view`
                        }
                        onClick={() =>
                          setActiveTabForActiveEntry(
                            activeTab === 'fields' ? 'json' : 'fields',
                          )
                        }
                      >
                        <Icon
                          className='size-5 text-[var(--primary-9)]'
                          name={
                            activeTab === 'fields'
                              ? 'tabler:code'
                              : 'tabler:list-details'
                          }
                        />
                      </button>
                    </Tooltip>
                    <div>
                      <div className='flex items-center gap-2'>
                        <h2 className='text-base font-bold text-[var(--gray-13)]'>{t`Extracted Data`}</h2>
                        {ENABLE_INDEXING_AUTOSAVE &&
                          (autoSaveStatus === 'saving' ? (
                            <span className='inline-flex animate-pulse items-center gap-1 rounded-full border border-primary-7 bg-primary-2 px-2.5 py-0.5 text-[11px] font-medium text-primary-11'>
                              <Icon className='size-3 animate-spin text-primary-9' name='tabler:loader-2' />
                              <span>{t`Saving...`}</span>
                            </span>
                          ) : autoSaveStatus === 'saved' ? (
                            <span className='inline-flex items-center gap-1 rounded-full border border-green-6 bg-green-2 px-2.5 py-0.5 text-[11px] font-medium text-green-11'>
                              <Icon className='size-3 text-green-9' name='lucide:check' />
                              <span>{t`Saved`}</span>
                            </span>
                          ) : autoSaveStatus === 'error' ? (
                            <span className='inline-flex items-center gap-1 rounded-full border border-red-6 bg-red-2 px-2.5 py-0.5 text-[11px] font-medium text-red-11'>
                              <Icon className='size-3 text-red-9' name='lucide:alert-circle' />
                              <span>{t`Save failed`}</span>
                            </span>
                          ) : null)}
                      </div>
                      <p className='text-xs font-medium text-[var(--gray-9)]'>
                        {isAnalyzing
                          ? t`Extracting fields...`
                          : t`${filledFieldsCount} of ${repositoryFields.length} fields ready`}
                      </p>
                    </div>
                  </div>

                  <div className='flex items-center gap-3'>
                    {!isExporting ? (
                      <Tooltip content={t`Regenerate`} position='top'>
                        <button
                          aria-label={t`Regenerate`}
                          className='flex size-8 items-center justify-center rounded-lg bg-secondary-3 text-secondary-11 transition-all hover:bg-secondary-4 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40'
                          disabled={isAnalyzing || isDeletingStageFile}
                          type='button'
                          onClick={() => handleRetryOcr(activeEntry.id)}
                        >
                          <Icon className='size-4' name='tabler:scan' />
                        </button>
                      </Tooltip>
                    ) : null}
                    {!isExporting ? (
                      <Tooltip content={t`Delete staged file`} position='top'>
                        <button
                          aria-label={t`Delete staged file`}
                          className='flex h-8 w-8 items-center justify-center rounded-lg text-red-9 transition-all hover:bg-red-2 hover:text-red-10 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40'
                          disabled={isExporting || isDeletingStageFile}
                          type='button'
                          onClick={() => setDeleteStageConfirmOpen(true)}
                        >
                          <Icon className='size-4' name='lucide:trash-2' />
                        </button>
                      </Tooltip>
                    ) : null}

                    <Button
                      className='!h-9 shrink-0 !border-[var(--gray-3)] !bg-[var(--primary-10)] !px-4 !text-xs !text-[var(--surface)] hover:!bg-[var(--primary-9)] disabled:!opacity-50'
                      disabled={isExporting || isAnalyzing}
                      onClick={() => requestIndexEntry(activeEntry.id)}
                    >
                      {isExporting ? (
                        <Icon
                          className='size-4 animate-spin'
                          name='tabler:loader-2'
                        />
                      ) : (
                        <ArrowUpFromLine size={14} />
                      )}
                      {isExporting ? t`Exporting...` : t`Export`}
                    </Button>
                  </div>
                </div>

                <div className='relative flex min-h-0 flex-1 flex-col overflow-hidden p-4'>
                  {isAnalyzing ? (
                    <div className='absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-surface/80 backdrop-blur-[1px]'>
                      <Icon
                        className='size-8 animate-spin text-[var(--primary-9)]'
                        name='tabler:loader-2'
                      />
                      <p className='text-sm font-medium text-[var(--gray-11)]'>
                        {t`Extracting fields from document...`}
                      </p>
                    </div>
                  ) : null}

                  {activeTab === 'fields' ? (
                    (() => {
                      const syncRepoFields = repositoryFields.filter(
                        (field) => {
                          const normalizedFieldName = String(field.name)
                            .trim()
                            .toLowerCase()
                          const normalizedColName = String(
                            field.sqlColumnName || '',
                          )
                            .trim()
                            .toLowerCase()
                          return masterFormSyncData?.syncFields?.some((sf) => {
                            const norm = sf.repoField.trim().toLowerCase()
                            return (
                              norm === normalizedFieldName ||
                              norm === normalizedColName
                            )
                          })
                        },
                      )

                      const otherRepoFields = repositoryFields.filter(
                        (f) => !syncRepoFields.includes(f),
                      )

                      return (
                        <div className='flex h-full flex-col'>
                          {(() => {
                            if (!activeEntry) return null
                            const grouped = new Map<
                              'danger' | 'info' | 'success',
                              Array<{ name: string; status: string }>
                            >()
                            for (const field of repositoryFields) {
                              const status = resolveVisibleOcrFieldStatus(
                                field,
                                activeEntry,
                              )
                              if (!status) continue
                              const tone = getOcrFieldStatusTone(status)
                              const variant =
                                tone === 'red'
                                  ? 'danger'
                                  : tone === 'green'
                                    ? 'success'
                                    : 'info'
                              const list = grouped.get(variant) ?? []
                              list.push({ name: field.name, status })
                              grouped.set(variant, list)
                            }
                            const joinNames = (names: string[]) => {
                              if (names.length <= 1) return names[0] ?? ''
                              if (names.length === 2) {
                                return `${names[0]} and ${names[1]}`
                              }
                              return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`
                            }
                            const cards = (
                              ['danger', 'info', 'success'] as const
                            ).flatMap((variant) => {
                              const items = grouped.get(variant)
                              if (!items?.length) return []
                              const sameStatus = items.every(
                                (item) => item.status === items[0].status,
                              )
                              return [
                                {
                                  description: sameStatus
                                    ? joinNames(items.map((item) => item.name))
                                    : items
                                        .map(
                                          (item) =>
                                            `${item.name}: ${item.status}`,
                                        )
                                        .join('. '),
                                  title: sameStatus
                                    ? items[0].status
                                    : t`Review these fields`,
                                  variant,
                                },
                              ]
                            })
                            if (!cards.length) return null
                            return (
                              <div className='mb-3 flex shrink-0 flex-col gap-2'>
                                {cards.map((card) => (
                                  <InfoCard
                                    description={card.description}
                                    key={card.variant}
                                    title={card.title}
                                    variant={card.variant}
                                  />
                                ))}
                              </div>
                            )
                          })()}
                          {syncRepoFields.length > 0 && (
                            <div className='shrink-0 pb-3'>
                              <div className='grid grid-cols-1 gap-4'>
                                {syncRepoFields.map((field) => (
                                  <div
                                    className='space-y-1.5 rounded-[5px] border border-gray-4 bg-[var(--gray-2)] p-[5px]'
                                    key={field.id}
                                  >
                                    {renderFieldControl(field, true)}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className='ez-scrollbar min-h-0 flex-1 overflow-y-auto pr-1.5'>
                            <div className='grid grid-cols-1 gap-4'>
                              {otherRepoFields.map((field) => (
                                <div className='space-y-1.5' key={field.id}>
                                  {renderFieldControl(field, false)}
                                </div>
                              ))}

                              {!repositoryFields.length ? (
                                <div className='rounded-xl border border-dashed border-[var(--gray-4)] p-8 text-center text-sm font-medium text-[var(--gray-9)]'>
                                  {t`No repository fields configured.`}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      )
                    })()
                  ) : (
                    <div className='relative flex h-full min-h-0 flex-1 flex-col'>
                      <div className='absolute top-2.5 right-3.5 z-20'>
                        <Tooltip content={t`Copy JSON`} position='top'>
                          <button
                            aria-label={t`Copy JSON`}
                            className='flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--gray-4)] bg-surface/90 text-[var(--gray-11)] shadow-sm backdrop-blur-md transition-colors hover:bg-[var(--gray-2)] hover:text-[var(--gray-13)]'
                            type='button'
                            onClick={copyMetadata}
                          >
                            <Copy size={14} />
                          </button>
                        </Tooltip>
                      </div>
                      <div className='ez-scrollbar h-full max-h-full min-h-0 flex-1 overflow-auto rounded-xl border border-[var(--gray-3)] bg-[var(--gray-2)] p-3 pt-2.5 pr-14 text-xs leading-5 text-[var(--gray-12)]'>
                        <JsonNode data={parsedJsonData} />
                      </div>
                    </div>
                  )}
                </div>
              </AnimateSlideUp>
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        cancelLabel={t`Cancel`}
        confirmLabel={t`Delete`}
        description={t`Are you sure you want to delete this staged file?`}
        isConfirming={isDeletingStageFile}
        opened={deleteStageConfirmOpen}
        title={t`Delete Staged File`}
        variant='danger'
        onCancel={() => {
          if (!isDeletingStageFile) setDeleteStageConfirmOpen(false)
        }}
        onConfirm={() => {
          if (activeEntry) void handleDeleteStageFile(activeEntry.id)
        }}
      />
      <ConfirmDialog
        cancelLabel={t`Cancel`}
        confirmLabel={t`Export`}
        description={expiredExportDescription}
        isConfirming={isExporting}
        opened={expiredExportConfirmOpen}
        title={t`Export file`}
        variant='danger'
        onCancel={() => {
          if (isExporting) return
          pendingExpiredExportRef.current = null
          setExpiredExportConfirmOpen(false)
        }}
        onConfirm={() => {
          const pending = pendingExpiredExportRef.current
          pendingExpiredExportRef.current = null
          setExpiredExportConfirmOpen(false)
          if (pending) void indexEntry(pending.id, pending.options)
        }}
      />
      <ConfirmDialog
        cancelLabel={t`Cancel`}
        confirmLabel={t`Delete`}
        isConfirming={isBulkDeleting}
        opened={bulkDeleteConfirmOpen}
        title={t`Delete staged files`}
        variant='danger'
        description={
          selectedVisibleCount === 1
            ? t`Are you sure you want to delete 1 selected staged file?`
            : t`Are you sure you want to delete ${selectedVisibleCount} selected staged files?`
        }
        onCancel={() => {
          if (!isBulkDeleting) setBulkDeleteConfirmOpen(false)
        }}
        onConfirm={() => {
          void handleBulkDeleteDrafts()
        }}
      />
      <ConfirmDialog
        cancelLabel={t`Cancel`}
        confirmLabel={t`Export`}
        isConfirming={isBulkExporting}
        opened={bulkExportConfirmOpen}
        title={t`Export staged files`}
        variant='default'
        description={
          selectedVisibleCount === 1
            ? t`Are you sure you want to export 1 selected staged file?`
            : t`Are you sure you want to export ${selectedVisibleCount} selected staged files?`
        }
        onCancel={() => {
          if (!isBulkExporting) setBulkExportConfirmOpen(false)
        }}
        onConfirm={() => {
          void handleBulkExportDrafts()
        }}
      />
      <ConfirmDialog
        cancelLabel={t`Go back`}
        confirmLabel={t`Delete`}
        description={t`Going back keeps this file in Draft Files. Delete removes it.`}
        isConfirming={isDeletingStageFile}
        opened={backConfirmOpen}
        title={t`Go back`}
        variant='danger'
        onCancel={() => {
          setBackConfirmOpen(false)
          if (viewingDrafts) {
            setOpenFileId(null)
          } else {
            onBack()
          }
        }}
        onConfirm={async () => {
          if (activeEntry) {
            await handleDeleteStageFile(activeEntry.id)
          }
          setBackConfirmOpen(false)
          if (viewingDrafts) {
            setOpenFileId(null)
          } else {
            onBack()
          }
        }}
      />
    </AnimateFadeIn>
  )
}
