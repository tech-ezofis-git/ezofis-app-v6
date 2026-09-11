import { ArrowUpFromLine, CheckCircle2, Copy, FileText } from 'lucide-react'
import { useLingui } from '@lingui/react/macro'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDebouncedValue } from '@mantine/hooks'
import { UploadFiles, uploadForOcr } from '@/api/v6/folder/folder'
import formApi from '@/api/form/form'
import Icon from '@/components/base/icon/Icon'
import AiBrandIcon from '@/components/common/AiBrandIcon'
import IconButton from '@/components/base/button/IconButton'
import InputDate from '@/components/base/inputs/InputDate'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputText from '@/components/base/inputs/InputText'
import InputTextarea from '@/components/base/inputs/InputTextarea'
import showToast from '@/components/base/toast/showToast'
import Tooltip from '@/components/base/Tooltip'
import DocumentPreviewViewer from '@/components/common/document-preview/DocumentPreviewViewer'
import cn from '@/utils/cn'
import type { DynamicRepositoryColumn } from '../../api/folderApi'
import {
  DOCUMENT_ACCEPT,
  IMAGE_ACCEPT,
  isImage,
  isPdf,
  isSupportedDocument,
  MAX_SIZE,
  PDF_ACCEPT,
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

type ExportStatus = 'idle' | 'exporting' | 'success' | 'error'

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

interface JsonNodeProps {
  data: unknown
  name?: string
  isLast?: boolean
  level?: number
}

function JsonNode({ data, name, isLast = true }: JsonNodeProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  if (data === null || data === undefined) {
    return (
      <div className='flex items-center gap-1 font-mono text-xs leading-5'>
        <div className='size-4 shrink-0' />
        {name !== undefined && (
          <span className='text-purple-700 dark:text-purple-300 font-semibold'>
            "{name}":{' '}
          </span>
        )}
        <span className='text-gray-500 italic'>null</span>
        {!isLast && <span className='text-gray-400'>,</span>}
      </div>
    )
  }

  if (typeof data === 'boolean') {
    return (
      <div className='flex items-center gap-1 font-mono text-xs leading-5'>
        <div className='size-4 shrink-0' />
        {name !== undefined && (
          <span className='text-purple-700 dark:text-purple-300 font-semibold'>
            "{name}":{' '}
          </span>
        )}
        <span className='text-blue-600 dark:text-blue-400 font-semibold'>
          {String(data)}
        </span>
        {!isLast && <span className='text-gray-400'>,</span>}
      </div>
    )
  }

  if (typeof data === 'number') {
    return (
      <div className='flex items-center gap-1 font-mono text-xs leading-5'>
        <div className='size-4 shrink-0' />
        {name !== undefined && (
          <span className='text-purple-700 dark:text-purple-300 font-semibold'>
            "{name}":{' '}
          </span>
        )}
        <span className='text-amber-600 dark:text-amber-400 font-medium'>
          {data}
        </span>
        {!isLast && <span className='text-gray-400'>,</span>}
      </div>
    )
  }

  if (typeof data === 'string') {
    return (
      <div className='flex items-center gap-1 font-mono text-xs leading-5 break-all'>
        <div className='size-4 shrink-0' />
        {name !== undefined && (
          <span className='text-purple-700 dark:text-purple-300 font-semibold'>
            "{name}":{' '}
          </span>
        )}
        <span className='text-emerald-700 dark:text-emerald-400'>"{data}"</span>
        {!isLast && <span className='text-gray-400'>,</span>}
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
          type='button'
          onClick={() => setIsCollapsed(!isCollapsed)}
          className='flex size-4 shrink-0 items-center justify-center rounded text-[var(--gray-9)] transition-colors hover:bg-[var(--gray-3)] hover:text-[var(--gray-13)]'
        >
          <Icon
            name='tabler:chevron-right'
            className={`size-3 transition-transform duration-150 ${isCollapsed ? '' : 'rotate-90'}`}
          />
        </button>

        {name !== undefined && (
          <span className='text-purple-700 dark:text-purple-300 font-semibold'>
            "{name}":{' '}
          </span>
        )}

        <span className='font-bold text-[var(--gray-12)]'>{openBracket}</span>

        {isCollapsed ? (
          <button
            type='button'
            onClick={() => setIsCollapsed(false)}
            className='mx-1 rounded bg-[var(--gray-3)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--gray-11)] transition-colors hover:bg-[var(--gray-4)]'
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
                key={key}
                data={childData}
                name={isArray ? undefined : key}
                isLast={isChildLast}
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
          {!isLast && <span className='text-gray-400'>,</span>}
        </div>
      )}
    </div>
  )
}

type UploadProps = {
  folderId: string | number | null
  initialFile?: File | null
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

const PROCESS_STEP_KEYS = ['Received', 'Analysis', 'Fields', 'Done'] as const
type ProcessStepKey = (typeof PROCESS_STEP_KEYS)[number]

const getFieldKey = (field: RepositoryField) => field.sqlColumnName || field.id

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
  value?: unknown
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

    target.set(normalizeFieldKey(name), value)
  })
}

const extractOcrFieldMap = (response: unknown) => {
  const fieldMap = new Map<string, string>()
  if (!response || typeof response !== 'object') return fieldMap

  const payload = response as Record<string, unknown>
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
  let ocrResult =
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
      if (ocrValue.trim()) {
        result[fieldKey] = ocrValue
        return
      }

      const flatValue = readFlatValue(flatData, candidate)
      if (flatValue.trim()) {
        result[fieldKey] = flatValue
        return
      }
    }
  })

  return applyFilenamePreFill(result, repositoryFields, fileName)
}

export default function Upload({
  folderId,
  initialFile = null,
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
  const ocrRequestIdRef = useRef(0)
  const lastFileSelectionRef = useRef<{
    at: number
    fingerprint: string
  } | null>(null)

  const [isDragOver, setIsDragOver] = useState(false)
  const [fileData, setFileData] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [ocrStatus, setOcrStatus] = useState<OcrStatus>('idle')
  const [exportStatus, setExportStatus] = useState<ExportStatus>('idle')
  const [activeTab, setActiveTab] = useState<ResultTab>('fields')
  const [focusedFieldKey, setFocusedFieldKey] = useState<string | null>(null)

  const repositoryFields = useMemo(() => {
    return [...(repositoryData?.fields ?? [])].sort((a, b) => {
      const mandatoryDiff =
        Number(Boolean(b.isMandatory)) - Number(Boolean(a.isMandatory))
      if (mandatoryDiff !== 0) return mandatoryDiff
      return (a.orderId ?? 0) - (b.orderId ?? 0)
    })
  }, [repositoryData?.fields])

  const [fieldValues, setFieldValues] = useState<Record<string, string>>(() =>
    applyFilenamePreFill(
      getInitialValues(repositoryFields),
      repositoryFields,
      initialFile?.name,
    ),
  )

  useEffect(() => {
    if (!fileData?.name || !repositoryFields.length) return
    setFieldValues((prev) =>
      applyFilenamePreFill(prev, repositoryFields, fileData.name),
    )
  }, [fileData?.name, repositoryFields])

  const [ocrExtractedValues, setOcrExtractedValues] = useState<
    Record<string, string>
  >({})
  const [masterSyncedValues, setMasterSyncedValues] = useState<
    Record<string, string>
  >({})
  const [rawOcrJson, setRawOcrJson] = useState<any>({})
  const [rawOcrText, setRawOcrText] = useState<string>('')

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
      formId: string
      formFieldId: string
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
          syncFields.push({ formId, formFieldId, repoField })
        }
      } else {
        // Legacy single form format: repoField:formFieldId[:sync]
        const formId = formIds[0] || ''
        const formFieldId = parts[1] || ''
        const combinedKey = `${formId}:${formFieldId}`
        mapping[combinedKey] = repoField
        if (parts.length === 3 && parts[2] === 'sync') {
          syncFields.push({ formId, formFieldId, repoField })
        }
      }
    })

    return { formIds, syncFields, mapping }
  }, [repositoryData?.storageDrive])

  const [isSyncing, setIsSyncing] = useState(false)
  const [syncingField, setSyncingField] = useState<string | null>(null)
  const activeSyncCountRef = useRef(0)
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
              .then((res) => ({ formId: fId, data: res.data }))
              .catch(() => ({ formId: fId, data: null })),
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
          const { formId, formFieldId, repoField } = syncField
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

  const handleSync = async (
    fieldValue: string,
    repoFieldName: string,
    formId: string,
    currentOcrValues?: Record<string, string>,
  ) => {
    if (!masterFormSyncData || !fieldValue || !formId) return
    activeSyncCountRef.current++
    setIsSyncing(true)
    setSyncingField(repoFieldName)
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
        sortBy: { criteria: 'createdAt', order: 'DESC' },
        filterBy: [
          {
            groupCondition: '',
            filters: [
              {
                criteria: criteriaFieldId,
                condition: 'eq',
                value: fieldValue,
              },
            ],
          },
        ],
        currentPage: 1,
        itemsPerPage: 10,
        mode: 'live',
        includeFormJson: true,
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
      const values = entry?.values || entry?.data || entry?.formValues || entry

      setFieldValues((prev) => {
        const next = { ...prev }

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
            const ocrValue = (currentOcrValues || ocrExtractedValues)[targetKey]

            if (
              mappedValue !== undefined &&
              mappedValue !== null &&
              String(mappedValue).trim() !== ''
            ) {
              next[targetKey] = mappedValue
            } else if (
              ocrValue !== undefined &&
              ocrValue !== null &&
              String(ocrValue).trim() !== ''
            ) {
              next[targetKey] = ocrValue
            } else if (mappedValue !== undefined && mappedValue !== null) {
              next[targetKey] = mappedValue
            }
          },
        )

        return next
      })

      setMasterSyncedValues((prev) => {
        const next = { ...prev }
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

            if (!repoField) return

            const sourceFieldId = String(formFieldId)
            let mappedValue = values?.[sourceFieldId]

            if (
              typeof mappedValue === 'object' &&
              mappedValue !== null &&
              'value' in mappedValue
            ) {
              mappedValue = mappedValue.value
            }

            const targetKey = getFieldKey(repoField)
            const ocrValue = (currentOcrValues || ocrExtractedValues)[targetKey]

            if (
              mappedValue !== undefined &&
              mappedValue !== null &&
              String(mappedValue).trim() !== ''
            ) {
              next[targetKey] = String(mappedValue)
            } else if (
              ocrValue !== undefined &&
              ocrValue !== null &&
              String(ocrValue).trim() !== ''
            ) {
              next[targetKey] = String(ocrValue)
            } else if (mappedValue !== undefined && mappedValue !== null) {
              next[targetKey] = String(mappedValue)
            }
          },
        )
        return next
      })

      console.log({
        message: 'Fields synced successfully.',
        variant: 'success',
      })
    } catch (e: any) {
      console.log({ message: `Sync error: ${e.message}`, variant: 'error' })
    } finally {
      activeSyncCountRef.current = Math.max(0, activeSyncCountRef.current - 1)
      if (activeSyncCountRef.current === 0) {
        setIsSyncing(false)
        setSyncingField(null)
      }
    }
  }

  const isAnalyzing = ocrStatus === 'analyzing'
  const isExporting = exportStatus === 'exporting'
  const isFieldsPhase =
    ocrStatus === 'complete' && exportStatus === 'idle' && Boolean(fileData)

  // Revoke only after React has swapped the preview away from this URL,
  // otherwise the viewer loses its source while it is still rendering it.
  useEffect(() => {
    if (!previewUrl) return
    return () => URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  const runOcrExtraction = useCallback(
    async (selectedFile: File, activeRepositoryId: string) => {
      const requestId = ++ocrRequestIdRef.current
      setOcrStatus('analyzing')
      setExportStatus('idle')
      setFieldValues(
        applyFilenamePreFill(
          getInitialValues(repositoryFields),
          repositoryFields,
          selectedFile.name,
        ),
      )
      setFocusedFieldKey(null)

      const ocrFields = repositoryFields
        .map((field) => formatOcrFieldDescriptor(field))
        .filter(Boolean)

      try {
        const { data, error } = await uploadForOcr(
          activeRepositoryId,
          selectedFile,
          ocrFields,
        )

        if (requestId !== ocrRequestIdRef.current) return

        if (error) {
          console.warn(
            '[uploadForOcr] OCR extraction failed/unavailable:',
            error,
          )
          setOcrStatus('idle')
          return
        }

        const { ocrJson, ocrText } = extractOcrJsonAndText(data)
        setRawOcrJson(ocrJson)
        setRawOcrText(ocrText)

        const mappedValues = mapOcrResponseToFieldValues(
          data,
          repositoryFields,
          selectedFile.name,
        )
        setFieldValues(mappedValues)
        setOcrExtractedValues(mappedValues)
        setOcrStatus('complete')

        // Auto-sync trigger
        if (masterFormSyncData && masterFormSyncData.syncFields.length > 0) {
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
                activeSyncs.push({
                  fieldName: name,
                  fieldValue: val,
                  formId: formId,
                })
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
                sync.fieldValue,
                sync.fieldName,
                sync.formId,
                mappedValues,
              )
            }, 0)
          })
        }
      } catch (error: any) {
        if (requestId !== ocrRequestIdRef.current) return
        setOcrStatus('error')
        const detail = error?.message || error
        showToast({
          message: t`OCR extraction failed: ${detail}`,
          variant: 'error',
        })
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [repositoryFields, t, masterFormSyncData],
  )

  const resetInput = () => {
    if (invoiceInputRef.current) invoiceInputRef.current.value = ''
  }

  const handleCancelUpload = () => {
    if (isExporting) return

    ocrRequestIdRef.current += 1
    lastFileSelectionRef.current = null

    setFileData(null)
    setPreviewUrl(null)
    setOcrStatus('idle')
    setExportStatus('idle')
    setActiveTab('fields')
    setFocusedFieldKey(null)
    setFieldValues(getInitialValues(repositoryFields))
    setOcrExtractedValues({})
    setMasterSyncedValues({})
    setRawOcrJson({})
    setRawOcrText('')
    resetInput()
  }

  const updateFieldValue = (field: RepositoryField, value: string) => {
    setFieldValues((prev) => ({
      ...prev,
      [getFieldKey(field)]: value,
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
        variant: 'error',
      })
      resetInput()
      return
    }

    if (validFiles.length) {
      const selectedFile = validFiles[0]
      const fileFingerprint = `${selectedFile.name}:${selectedFile.size}:${selectedFile.lastModified}`
      const now = Date.now()
      const lastSelection = lastFileSelectionRef.current

      if (
        lastSelection?.fingerprint === fileFingerprint &&
        now - lastSelection.at < 800
      ) {
        resetInput()
        return
      }

      lastFileSelectionRef.current = { at: now, fingerprint: fileFingerprint }
      const activeRepositoryId = String(
        repositoryId || repositoryData?.id || '',
      )

      setFileData(selectedFile)
      setPreviewUrl(URL.createObjectURL(selectedFile))
      setActiveTab('fields')
      setExportStatus('idle')
      setFieldValues(
        applyFilenamePreFill(
          getInitialValues(repositoryFields),
          repositoryFields,
          selectedFile.name,
        ),
      )

      if (!activeRepositoryId) {
        setOcrStatus('error')
        showToast({
          message: t`Repository ID is missing. Cannot run OCR.`,
          variant: 'error',
        })
        resetInput()
        return
      }

      void runOcrExtraction(selectedFile, activeRepositoryId)
    }

    resetInput()
  }

  useEffect(() => {
    if (!initialFile) return
    handleInvoiceFiles([initialFile])
    // Apply once when Upload mounts with a preselected file from empty-state dropzone.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const buildUploadMetadata = () => {
    const meta = repositoryFields.reduce<Record<string, any>>((acc, field) => {
      const key = field.sqlColumnName || field.name
      acc[key] = fieldValues[getFieldKey(field)] ?? ''
      return acc
    }, {})

    return meta
  }

  const buildMetadata = () => {
    const fields = repositoryFields.map((field) => {
      const value = fieldValues[getFieldKey(field)] ?? ''

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

    values.ocrJson = rawOcrJson ?? []
    values.ocrText = rawOcrText ?? ''

    return {
      fields,
      folderId: folderId ? String(folderId) : null,
      repositoryId: repositoryId || repositoryData?.id || null,
      values,
    }
  }

  const validateMandatoryFields = () => {
    const missingField = repositoryFields.find((field) => {
      const value = fieldValues[getFieldKey(field)]
      return field.isMandatory && !String(value ?? '').trim()
    })

    if (missingField) {
      const fieldName = missingField.name
      showToast({
        message: t`${fieldName} is mandatory.`,
        variant: 'error',
      })
      return false
    }

    return true
  }

  const filledFieldsCount = useMemo(() => {
    return repositoryFields.filter((field) => {
      const value = fieldValues[getFieldKey(field)]
      return Boolean(String(value ?? '').trim())
    }).length
  }, [repositoryFields, fieldValues])

  const uploadFile = async () => {
    if (!fileData) {
      showToast({ message: t`Please select a file first.`, variant: 'error' })
      return null
    }

    const activeRepositoryId = repositoryId || repositoryData?.id

    if (!activeRepositoryId) {
      showToast({
        message: t`Repository ID is missing. Cannot upload.`,
        variant: 'error',
      })
      return null
    }

    if (!validateMandatoryFields()) return null

    try {
      setExportStatus('exporting')

      const formData = new FormData()
      formData.append('file', fileData, fileData.name)
      formData.append('metadata', JSON.stringify(buildUploadMetadata()))

      const ocrJsonStr =
        typeof rawOcrJson === 'string'
          ? rawOcrJson
          : JSON.stringify(rawOcrJson ?? [])
      formData.append('ocrJson', ocrJsonStr)

      const ocrTextStr =
        typeof rawOcrText === 'string'
          ? rawOcrText
          : typeof rawOcrText === 'object' && rawOcrText !== null
            ? JSON.stringify(rawOcrText)
            : String(rawOcrText ?? '')
      formData.append('ocrText', ocrTextStr)

      const { data, error } = await UploadFiles(
        String(activeRepositoryId),
        formData,
      )

      if (error) {
        setExportStatus('error')
        showToast({
          message: t`Error uploading file: ${error}`,
          variant: 'error',
        })
        return null
      }

      setExportStatus('success')
      showToast({ message: t`File exported successfully.`, variant: 'success' })
      await onSuccess?.()
      onBack()
      return data
    } catch (error: any) {
      setExportStatus('error')
      const detail = error?.message || error
      showToast({
        message: t`Exception uploading file: ${detail}`,
        variant: 'error',
      })
      return null
    }
  }

  const activeStepIndex = getActiveStepIndex(
    Boolean(fileData),
    ocrStatus,
    exportStatus,
  )

  const [debouncedFocusedValue] = useDebouncedValue(
    focusedFieldKey ? fieldValues[focusedFieldKey] : '',
    400,
  )

  const highlightTerms = useMemo(() => {
    if (!focusedFieldKey) return []
    return debouncedFocusedValue ? [debouncedFocusedValue] : []
  }, [focusedFieldKey, debouncedFocusedValue])

  const handleFieldFocus = useCallback((field: RepositoryField) => {
    setFocusedFieldKey(getFieldKey(field))
  }, [])

  const renderFieldControl = (
    field: RepositoryField,
    isSyncField: boolean = false,
  ) => {
    const column = toDynamicColumn(field)
    const fieldKey = getFieldKey(field)
    const fieldType = normalizeType(field.dataType)
    const value = isAnalyzing ? '' : (fieldValues[fieldKey] ?? '')
    const disabled = Boolean(field.isReadOnly || isExporting || isAnalyzing)
    const label = field.name
    const required = Boolean(field.isMandatory)
    const options = getSelectOptions(column)

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

      const ocrValue = ocrExtractedValues[fieldKey]
      const syncValue = masterSyncedValues[fieldKey]
      const currentValue = fieldValues[fieldKey]

      // Icon if value is from OCR or Master Sync
      if (currentValue) {
        if (currentValue === syncValue) {
          elements.push(
            <Tooltip
              key='master-icon'
              content={t`Master Sync Data`}
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
              key='ocr-icon'
              content={t`OCR Extracted Data`}
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
            key='sync-btn-tooltip'
            content={t`Sync Master Data`}
            position='top'
            disabled={!value}
          >
            <Button
              key='sync-btn'
              aria-label={t`Sync`}
              onClick={() => {
                const uniqueFormIds = new Set<string>()
                matchingSyncFields.forEach((sf) => {
                  if (!uniqueFormIds.has(sf.formId)) {
                    uniqueFormIds.add(sf.formId)
                    void handleSync(toTextValue(value), sf.repoField, sf.formId)
                  }
                })
              }}
              disabled={!value || syncingField !== null}
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
      const ocrValue = ocrExtractedValues[fieldKey]
      const syncValue = masterSyncedValues[fieldKey]
      const currentValue = fieldValues[fieldKey]

      if (
        ocrValue &&
        ocrValue !== currentValue &&
        (!syncValue || syncValue === currentValue)
      ) {
        return (
          <button
            type='button'
            onClick={() => updateFieldValue(field, ocrValue)}
            className='mt-1 flex w-fit max-w-full items-center gap-1 rounded-full border border-[var(--primary-4)] bg-[var(--primary-1)] px-2 py-0.5 text-[10px] font-medium text-[var(--primary-11)] transition-colors hover:bg-[var(--primary-2)]'
          >
            <Icon className='size-3 shrink-0' name='tabler:scan' />
            <span className='ml-2 truncate text-xs'>{ocrValue}</span>
          </button>
        )
      }

      if (syncValue && syncValue !== currentValue) {
        return (
          <button
            type='button'
            onClick={() => updateFieldValue(field, syncValue)}
            className='mt-1 flex w-fit max-w-full items-center gap-1 rounded-full border border-[var(--indigo-4)] bg-[var(--indigo-1)] px-2 py-0.5 text-[10px] font-medium text-[var(--indigo-11)] transition-colors hover:bg-[var(--indigo-2)]'
          >
            <Icon className='size-3 shrink-0' name='lucide:database' />
            <span className='ml-2 truncate text-xs'>{syncValue}</span>
          </button>
        )
      }
      return null
    }

    let InputComponent = null

    if (fieldType === 'date' || fieldType === 'datetime') {
      InputComponent = (
        <InputDate
          className={fieldClassName}
          disabled={disabled}
          label={label}
          required={required}
          value={value || ''}
          onChange={(nextValue: string | null) =>
            updateFieldValue(field, nextValue || '')
          }
          // @ts-ignore
          rightSection={renderRightSection()}
          // @ts-ignore
          rightSectionWidth={90}
          rightSectionPointerEvents='auto'
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
          label={label}
          options={effectiveOptions}
          required={required}
          searchable
          creatable
          value={selectedOption}
          onChange={(selected) =>
            updateFieldValue(
              field,
              String(selected?.value ?? selected?.name ?? selected?.id ?? ''),
            )
          }
          // @ts-ignore
          rightSection={renderRightSection()}
          // @ts-ignore
          rightSectionWidth={90}
          rightSectionPointerEvents='auto'
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
          label={label}
          placeholder={isAnalyzing ? t`Extracting...` : t`Enter ${label}`}
          required={required}
          rows={3}
          value={toTextValue(value)}
          onChange={(nextValue: string) => updateFieldValue(field, nextValue)}
          // @ts-ignore
          rightSection={renderRightSection()}
          // @ts-ignore
          rightSectionWidth={90}
          rightSectionPointerEvents='auto'
          {...focusProps}
        />
      )
    } else {
      InputComponent = (
        <InputText
          className={fieldClassName}
          disabled={disabled}
          label={label}
          placeholder={isAnalyzing ? t`Extracting...` : t`Enter ${label}`}
          required={required}
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
          rightSection={renderRightSection()}
          rightSectionWidth={90}
          rightSectionPointerEvents='auto'
          {...focusProps}
        />
      )
    }

    return (
      <div className='flex w-full flex-col'>
        {InputComponent}
        {renderSuggestionCapsule()}
      </div>
    )
  }

  const parsedJsonData = useMemo(() => {
    if (
      rawOcrJson &&
      (Array.isArray(rawOcrJson)
        ? rawOcrJson.length > 0
        : Object.keys(rawOcrJson).length > 0)
    ) {
      return rawOcrJson
    }
    const meta = buildMetadata() as Record<string, any>
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
  }, [rawOcrJson, fieldValues, repositoryFields])

  const displayJsonContent = useMemo(() => {
    return safeJson(parsedJsonData)
  }, [parsedJsonData])

  const copyMetadata = async () => {
    await navigator.clipboard.writeText(displayJsonContent)
    showToast({ message: t`JSON copied to clipboard.`, variant: 'success' })
  }

  if (!fileData) {
    return (
      <>
        <div className='flex items-center justify-between border-b border-gray-3 bg-surface px-6 py-4 md:px-8'>
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
        <AnimateFadeIn className='relative flex h-full flex-col items-center justify-center overflow-y-auto bg-surface-muted px-4 py-4 sm:px-6 lg:px-8'>
          <div className='flex w-full max-w-5xl flex-col items-center gap-5'>
            <div className='flex w-full max-w-5xl flex-col items-center gap-5'>
              <AnimateSlideUp className='space-y-1 text-center'>
                <h1 className='text-2xl font-bold tracking-tight text-[var(--gray-13)]'>
                  {t`Upload`}{' '}
                  <span className='text-[var(--primary-9)]'>{t`Files`}</span>
                </h1>
                <p className='mx-auto max-w-xl text-sm font-medium text-[var(--gray-10)]'>
                  {t`Upload documents securely, assign metadata, and organize files within your repository for efficient search and management.`}
                </p>
              </AnimateSlideUp>

              <AnimateSlideUp
                className='relative z-10 w-full max-w-3xl'
                delay={0.1}
              >
                <div className='group relative overflow-hidden rounded-xl border border-[var(--gray-3)] bg-surface p-2 shadow-sm transition-all duration-500 hover:shadow-md'>
                  <div className='pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-xl opacity-0 transition-opacity duration-700 group-hover:opacity-100'>
                    <div className='absolute inset-0 h-1/2 w-full animate-[scan_3s_linear_infinite] bg-gradient-to-b from-transparent via-[var(--primary-2)]/20 to-transparent' />
                  </div>

                  <div
                    className={[
                      'relative z-10 flex min-h-[140px] cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-[var(--primary-4)] px-8 py-6 text-center transition-all duration-500 ease-out sm:min-h-[128px]',
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
                          {t`Drop your file here, or`}{' '}
                          <span className='text-[var(--primary-9)]'>{t`browse`}</span>
                        </h2>
                        <p className='text-xs font-medium text-[var(--gray-9)]'>
                          {t`Supports PDF, Word, Excel, PowerPoint, Images & Documents · Max 50 MB`}
                        </p>
                      </div>
                    </AnimateStagger>

                    <input
                      accept={DOCUMENT_ACCEPT}
                      className='hidden'
                      ref={invoiceInputRef}
                      type='file'
                      onChange={(event) =>
                        handleInvoiceFiles(event.target.files)
                      }
                    />
                  </div>
                </div>
              </AnimateSlideUp>
            </div>

            <div className='mt-4 grid w-full grid-cols-1 gap-6 md:grid-cols-3'>
              {[
                {
                  color: 'text-[var(--orange-9)] bg-[var(--orange-2)]',
                  icon: 'tabler:bolt',
                  sub: t`Process documents faster with our agentic pipeline`,
                  title: t`Lightning Fast`,
                },
                {
                  color: 'text-[var(--indigo-9)] bg-[var(--indigo-2)]',
                  icon: 'tabler:sparkles',
                  sub: t`Industry-leading extraction accuracy`,
                  title: t`100% Accuracy`,
                },
                {
                  color: 'text-[var(--green-11)] bg-[var(--green-2)]',
                  icon: 'tabler:clock',
                  sub: t`Support for PDF, images, and scanned documents`,
                  title: t`Any Format`,
                },
              ].map((item, idx) => (
                <AnimateEntrancePop delay={0.4 + idx * 0.1} key={idx}>
                  <div className='group flex h-full flex-col items-start rounded-xl border border-[var(--gray-3)] bg-surface p-6 text-left shadow-sm transition-all duration-300 hover:shadow-md'>
                    <div
                      className={`flex size-9 shrink-0 items-center justify-center rounded-lg 2xl:size-10 ${item.color} mt-1 mb-4 transition-transform duration-300 group-hover:scale-110`}
                    >
                      {item.icon === 'tabler:sparkles' ? (
                        <AiBrandIcon
                          className='size-5 transition-transform duration-300 group-hover:rotate-6'
                          variant='outline-purple'
                        />
                      ) : (
                        <Icon
                          className='size-5 transition-transform duration-300 group-hover:rotate-6'
                          name={item.icon}
                        />
                      )}
                    </div>
                    <h4 className='text-sm font-medium tracking-tight text-[var(--gray-13)]'>
                      {item.title}
                    </h4>
                    <p className='mt-2 text-xs leading-relaxed font-medium text-[var(--gray-10)]'>
                      {item.sub}
                    </p>
                  </div>
                </AnimateEntrancePop>
              ))}
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
    <AnimateFadeIn className='relative flex h-full max-h-[calc(100vh-80px)] flex-col overflow-x-hidden overflow-y-auto bg-surface-muted px-6 py-5'>
      <div className='mx-auto flex w-full max-w-7xl flex-col gap-4'>
        <div className='flex items-center justify-between gap-4 rounded-2xl border border-[var(--gray-3)] bg-surface px-5 py-4 shadow-sm'>
          {PROCESS_STEP_KEYS.map((step, index, list) => {
            const isComplete = isStepComplete(
              index,
              activeStepIndex,
              exportStatus,
            )
            const isActive = index === activeStepIndex && !isComplete
            const isAnalysisStep = step === 'Analysis'
            const isFieldsStep = step === 'Fields'
            const isDoneStep = step === 'Done'
            const showStepSpinner =
              (isAnalysisStep && isAnalyzing) || (isDoneStep && isExporting)

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
                        ? 'bg-[#10B981]'
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
                      <span className='text-sm font-bold'>{index + 1}</span>
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
                      isComplete ? 'bg-[#10B981]' : 'bg-[var(--gray-4)]',
                    ].join(' ')}
                  />
                ) : null}
              </div>
            )
          })}
        </div>

        <div className='grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(470px,0.95fr)]'>
          <AnimateSlideUp className='flex h-[560px] max-h-[calc(100vh-100px)] min-h-0 flex-col overflow-hidden rounded-2xl border border-[var(--gray-3)] bg-surface shadow-sm'>
            <div className='flex h-[60px] shrink-0 items-center justify-between border-b border-[var(--gray-3)] px-5'>
              <div className='flex min-w-0 items-center gap-3'>
                <div className='flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-1)] text-[var(--primary-9)]'>
                  <FileText size={18} />
                </div>
                <div className='min-w-0'>
                  <h2 className='text-base font-bold text-[var(--gray-13)]'>
                    {t`Document Preview`}
                  </h2>
                  <p className='truncate text-xs font-medium text-[var(--gray-9)]'>
                    {fileData.name} ({formatFileSize(fileData.size)})
                  </p>
                </div>
              </div>
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
                fileBlob={fileData}
                fileName={fileData.name}
                fileUrl={previewUrl}
                highlightTerms={highlightTerms}
                isImage={isImage(fileData)}
                isPdf={isPdf(fileData)}
                showScanOverlay={isAnalyzing}
                enableHighlight
              />
            </div>

            <input
              accept={DOCUMENT_ACCEPT}
              className='hidden'
              ref={invoiceInputRef}
              type='file'
              onChange={(event) => handleInvoiceFiles(event.target.files)}
            />
          </AnimateSlideUp>

          <AnimateSlideUp
            className='flex h-[900px] max-h-[calc(100vh-100px)] min-h-0 flex-col overflow-hidden rounded-2xl border border-[var(--gray-3)] bg-surface shadow-sm'
            delay={0.08}
          >
            <div className='flex h-[60px] shrink-0 items-center justify-between border-b border-[var(--gray-3)] px-5'>
              <div className='flex min-w-0 items-center gap-3'>
                <div className='flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-1)] text-[var(--primary-9)]'>
                  <Icon className='size-5' name='tabler:code' />
                </div>
                <div>
                  <h2 className='text-base font-bold text-[var(--gray-13)]'>{t`Extracted Data`}</h2>
                  <p className='text-xs font-medium text-[var(--gray-9)]'>
                    {isAnalyzing
                      ? t`Extracting fields...`
                      : t`${filledFieldsCount} of ${repositoryFields.length} fields ready`}
                  </p>
                </div>
              </div>

              <div className='flex rounded-xl bg-[var(--gray-2)] p-1'>
                <button
                  type='button'
                  className={[
                    'rounded-lg px-4 py-2 text-xs font-semibold transition',
                    activeTab === 'fields'
                      ? 'bg-surface text-[var(--gray-13)] shadow-sm'
                      : 'text-[var(--gray-10)] hover:text-[var(--gray-13)]',
                  ].join(' ')}
                  onClick={() => setActiveTab('fields')}
                >
                  {t`Fields`}
                </button>
                <button
                  type='button'
                  className={[
                    'rounded-lg px-4 py-2 text-xs font-semibold transition',
                    activeTab === 'json'
                      ? 'bg-surface text-[var(--gray-13)] shadow-sm'
                      : 'text-[var(--gray-10)] hover:text-[var(--gray-13)]',
                  ].join(' ')}
                  onClick={() => setActiveTab('json')}
                >
                  {t`JSON`}
                </button>
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
                  const syncRepoFields = repositoryFields.filter((field) => {
                    const normalizedFieldName = String(field.name)
                      .trim()
                      .toLowerCase()
                    const normalizedColName = String(field.sqlColumnName || '')
                      .trim()
                      .toLowerCase()
                    return masterFormSyncData?.syncFields?.some((sf) => {
                      const norm = sf.repoField.trim().toLowerCase()
                      return (
                        norm === normalizedFieldName ||
                        norm === normalizedColName
                      )
                    })
                  })

                  const otherRepoFields = repositoryFields.filter(
                    (f) => !syncRepoFields.includes(f),
                  )

                  return (
                    <div className='flex h-full flex-col'>
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

            <div className='flex shrink-0 items-center justify-between gap-3 border-t border-[var(--gray-3)] bg-surface px-5 py-4'>
              <div className='flex min-w-0 flex-1 items-center gap-3'>
                {/* <span className='text-xs font-medium text-[var(--gray-9)]'>
                  {isExporting
                    ? 'Exporting document...'
                    : exportStatus === 'success'
                      ? 'Exported successfully'
                      : isAnalyzing
                        ? 'Analyzing document...'
                        : 'Ready to export'}
                </span> */}

                {!isExporting ? (
                  <button
                    className='text-xs font-semibold text-[var(--gray-9)] transition-colors hover:text-[var(--primary-11)] disabled:cursor-not-allowed disabled:opacity-50'
                    disabled={isExporting}
                    type='button'
                    onClick={handleCancelUpload}
                  >
                    {t`Cancel`}
                  </button>
                ) : null}
              </div>

              <Button
                className='!h-10 shrink-0 !border-[var(--gray-3)] !bg-[var(--primary-10)] !px-5 !text-sm !text-[var(--surface)] hover:!bg-[var(--primary-9)] disabled:!opacity-50'
                disabled={isExporting || isAnalyzing}
                onClick={uploadFile}
              >
                {isExporting ? (
                  <Icon
                    className='size-4 animate-spin'
                    name='tabler:loader-2'
                  />
                ) : (
                  <ArrowUpFromLine size={15} />
                )}
                {isExporting ? t`Exporting...` : t`Export`}
              </Button>
            </div>
          </AnimateSlideUp>
        </div>
      </div>
    </AnimateFadeIn>
  )
}
