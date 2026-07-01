import { ArrowUpFromLine, CheckCircle2, Copy, FileText } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { uploadForOcr, UploadFiles } from '@/api/v6/folder/folder'
import IconButton from '@/components/base/button/IconButton'
import InputDate from '@/components/base/inputs/InputDate'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputText from '@/components/base/inputs/InputText'
import InputTextarea from '@/components/base/inputs/InputTextarea'
import showToast from '@/components/base/toast/showToast'
import DocumentPreviewViewer from '@/components/common/document-preview/DocumentPreviewViewer'
import type { DynamicRepositoryColumn } from '../../api/folderApi'
import {
  findSelectedOption,
  getSelectOptions,
  normalizeType,
  toTextValue,
} from '../../hooks/useEditMetadataForm'
import {
  IMAGE_ACCEPT,
  isImage,
  isPdf,
  MAX_SIZE,
  PDF_ACCEPT,
} from '../../../requests/components/request/components/newrequest/utils'
import { Button } from '../Ui'
import Icon from './../../../../components/base/icon/Icon'
import {
  AnimateEntrancePop,
  AnimateFadeIn,
  AnimateSlideUp,
  AnimateStagger,
} from './../../../../components/common/animations'

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
  repositoryData: {
    fields?: RepositoryField[]
    id?: string
    name?: string
  } | null
  repositoryId: string | number | null
  onBack: () => void
  onSuccess?: () => void | Promise<void>
}

type OcrStatus = 'idle' | 'analyzing' | 'complete' | 'error'
type ExportStatus = 'idle' | 'exporting' | 'success' | 'error'

const PROCESS_STEPS = ['Received', 'Analysis', 'Fields', 'Done'] as const

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

const appendOcrFieldItems = (
  target: Map<string, string>,
  items: unknown,
) => {
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

const mapOcrResponseToFieldValues = (
  response: unknown,
  repositoryFields: RepositoryField[],
) => {
  const result = getInitialValues(repositoryFields)
  if (!response || typeof response !== 'object') return result

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

  return result
}

export default function Upload({
  folderId,
  repositoryData,
  repositoryId,
  onBack,
  onSuccess,
}: UploadProps) {
  const invoiceInputRef = useRef<HTMLInputElement>(null)
  const ocrRequestIdRef = useRef(0)
  const lastFileSelectionRef = useRef<{ at: number; fingerprint: string } | null>(
    null,
  )

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
    getInitialValues(repositoryFields),
  )

  const isAnalyzing = ocrStatus === 'analyzing'
  const isExporting = exportStatus === 'exporting'
  const isFieldsPhase =
    ocrStatus === 'complete' &&
    exportStatus === 'idle' &&
    Boolean(fileData)

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const runOcrExtraction = useCallback(
    async (selectedFile: File, activeRepositoryId: string) => {
      const requestId = ++ocrRequestIdRef.current
      setOcrStatus('analyzing')
      setExportStatus('idle')
      setFieldValues(getInitialValues(repositoryFields))
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
          setOcrStatus('error')
          showToast({
            message: `OCR extraction failed: ${error}`,
            variant: 'error',
          })
          return
        }

        setFieldValues(mapOcrResponseToFieldValues(data, repositoryFields))
        setOcrStatus('complete')
      } catch (error: any) {
        if (requestId !== ocrRequestIdRef.current) return
        setOcrStatus('error')
        showToast({
          message: `OCR extraction failed: ${error?.message || error}`,
          variant: 'error',
        })
      }
    },
    [repositoryFields],
  )

  const resetInput = () => {
    if (invoiceInputRef.current) invoiceInputRef.current.value = ''
  }

  const handleCancelUpload = () => {
    if (isExporting) return

    ocrRequestIdRef.current += 1
    lastFileSelectionRef.current = null

    if (previewUrl) URL.revokeObjectURL(previewUrl)

    setFileData(null)
    setPreviewUrl(null)
    setOcrStatus('idle')
    setExportStatus('idle')
    setActiveTab('fields')
    setFocusedFieldKey(null)
    setFieldValues(getInitialValues(repositoryFields))
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
      (file) => (isPdf(file) || isImage(file)) && file.size <= MAX_SIZE,
    )

    if (!validFiles.length && files.length > 0) {
      const tooLarge = files.some((file) => file.size > MAX_SIZE)
      const invalidType = files.some((file) => !isPdf(file) && !isImage(file))

      showToast({
        message: tooLarge
          ? 'File is too large. Max size is 4MB.'
          : invalidType
            ? 'Invalid file type. Please upload a PDF or Image.'
            : 'No valid files selected.',
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
      const activeRepositoryId = String(repositoryId || repositoryData?.id || '')

      if (previewUrl) URL.revokeObjectURL(previewUrl)

      setFileData(selectedFile)
      setPreviewUrl(URL.createObjectURL(selectedFile))
      setActiveTab('fields')
      setExportStatus('idle')

      if (!activeRepositoryId) {
        setOcrStatus('error')
        showToast({
          message: 'Repository ID is missing. Cannot run OCR.',
          variant: 'error',
        })
        resetInput()
        return
      }

      void runOcrExtraction(selectedFile, activeRepositoryId)
    }

    resetInput()
  }

  const buildUploadMetadata = () => {
    return repositoryFields.reduce<Record<string, string>>((acc, field) => {
      const key = field.sqlColumnName || field.name
      acc[key] = fieldValues[getFieldKey(field)] ?? ''
      return acc
    }, {})
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

    const values = fields.reduce<Record<string, string>>((acc, field) => {
      acc[field.sqlColumnName || field.id] = field.value
      return acc
    }, {})

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
      showToast({
        message: `${missingField.name} is mandatory.`,
        variant: 'error',
      })
      return false
    }

    return true
  }

  const uploadFile = async () => {
    if (!fileData) {
      showToast({ message: 'Please select a file first.', variant: 'error' })
      return null
    }

    const activeRepositoryId = repositoryId || repositoryData?.id

    if (!activeRepositoryId) {
      showToast({
        message: 'Repository ID is missing. Cannot upload.',
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

      const { data, error } = await UploadFiles(
        String(activeRepositoryId),
        formData,
      )

      if (error) {
        setExportStatus('error')
        showToast({
          message: `Error uploading file: ${error}`,
          variant: 'error',
        })
        return null
      }

      setExportStatus('success')
      showToast({ message: 'File exported successfully.', variant: 'success' })
      await onSuccess?.()
      onBack()
      return data
    } catch (error: any) {
      setExportStatus('error')
      showToast({
        message: `Exception uploading file: ${error?.message || error}`,
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

  const highlightTerms = useMemo(() => {
    if (!focusedFieldKey) return []
    const value = fieldValues[focusedFieldKey]
    return value ? [value] : []
  }, [focusedFieldKey, fieldValues])

  const handleFieldFocus = useCallback((field: RepositoryField) => {
    setFocusedFieldKey(getFieldKey(field))
  }, [])

  const renderFieldControl = (field: RepositoryField) => {
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

    if (fieldType === 'date' || fieldType === 'datetime') {
      return (
        <InputDate
          className='w-full'
          disabled={disabled}
          label={label}
          required={required}
          value={value || ''}
          onChange={(nextValue: string | null) =>
            updateFieldValue(field, nextValue || '')
          }
          {...focusProps}
        />
      )
    }

    if (
      fieldType === 'select' ||
      fieldType === 'dropdown' ||
      options.length > 0
    ) {
      return (
        <InputSelect
          disabled={disabled}
          label={label}
          options={options}
          required={required}
          value={findSelectedOption(options, toTextValue(value))}
          onChange={(selected) =>
            updateFieldValue(
              field,
              String(
                selected?.value ?? selected?.name ?? selected?.id ?? '',
              ),
            )
          }
          {...focusProps}
        />
      )
    }

    if (fieldType === 'long_text' || fieldType === 'textarea' || label.toLowerCase().includes('address')) {
      return (
        <InputTextarea
          className='w-full'
          disabled={disabled}
          label={label}
          placeholder={isAnalyzing ? 'Extracting...' : `Enter ${label}`}
          required={required}
          rows={3}
          value={toTextValue(value)}
          onChange={(nextValue: string) => updateFieldValue(field, nextValue)}
          {...focusProps}
        />
      )
    }

    return (
      <InputText
        className='w-full'
        disabled={disabled}
        label={label}
        placeholder={isAnalyzing ? 'Extracting...' : `Enter ${label}`}
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
        {...focusProps}
      />
    )
  }

  const copyMetadata = async () => {
    await navigator.clipboard.writeText(safeJson(buildMetadata()))
    showToast({ message: 'Metadata copied.', variant: 'success' })
  }

  if (!fileData) {
    return (
      <>
        <div className='flex items-center justify-between border-b border-gray-3 bg-surface px-6 py-4 md:px-8'>
          <div className='flex items-start gap-3'>
            <IconButton
              ariaLabel='Back'
              color='gray'
              icon='lucide:arrow-left'
              size='sm'
              variant='ghost'
              onClick={onBack}
            />
            <div>
              <h1 className='text-18/6 font-semibold tracking-tight text-gray-13'>
                Upload Files
              </h1>

              <p className='text-13/5 text-gray-11'>
                Upload documents securely, assign metadata, and organize files
                within your repository for efficient search and management.
              </p>
            </div>
          </div>
        </div>
        <AnimateFadeIn className='relative flex h-full flex-col items-center justify-center overflow-y-auto bg-surface-muted px-4 py-4 sm:px-6 lg:px-8'>
          <div className='flex w-full max-w-5xl flex-col items-center gap-5'>
            <div className='flex w-full max-w-5xl flex-col items-center gap-5'>
              <AnimateSlideUp className='space-y-1 text-center'>
                <h1 className='text-2xl font-bold tracking-tight text-[var(--gray-13)]'>
                  Intelligent{' '}
                  <span className='text-[var(--primary-9)]'>AP Agent</span>
                </h1>
                <p className='mx-auto max-w-xl text-sm font-medium text-[var(--gray-10)]'>
                  Streamline your Accounts Payable. Automatically process
                  invoices, match Purchase Orders, and gain complete visibility.
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
                          Drop your file here, or{' '}
                          <span className='text-[var(--primary-9)]'>
                            browse
                          </span>
                        </h2>
                        <p className='text-xs font-medium text-[var(--gray-9)]'>
                          Supports PDF and Images · Max 4 MB
                        </p>
                      </div>
                    </AnimateStagger>

                    <input
                      accept={`${PDF_ACCEPT},${IMAGE_ACCEPT}`}
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
                  sub: 'Process documents faster with our agentic pipeline',
                  title: 'Lightning Fast',
                },
                {
                  color: 'text-[var(--indigo-9)] bg-[var(--indigo-2)]',
                  icon: 'tabler:sparkles',
                  sub: 'Industry-leading extraction accuracy',
                  title: '100% Accuracy',
                },
                {
                  color: 'text-[var(--green-11)] bg-[var(--green-2)]',
                  icon: 'tabler:clock',
                  sub: 'Support for PDF, images, and scanned documents',
                  title: 'Any Format',
                },
              ].map((item, idx) => (
                <AnimateEntrancePop delay={0.4 + idx * 0.1} key={idx}>
                  <div className='group flex h-full flex-col items-start rounded-xl border border-[var(--gray-3)] bg-surface p-6 text-left shadow-sm transition-all duration-300 hover:shadow-md'>
                    <div
                      className={`flex size-9 shrink-0 items-center justify-center rounded-lg 2xl:size-10 ${item.color} mt-1 mb-4 transition-transform duration-300 group-hover:scale-110`}
                    >
                      <Icon
                        className='size-5 transition-transform duration-300 group-hover:rotate-6'
                        name={item.icon}
                      />
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
          {PROCESS_STEPS.map((step, index, list) => {
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
              (isAnalysisStep && isAnalyzing) ||
              (isFieldsStep && isFieldsPhase) ||
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
                      {step}
                    </span>

                    {isAnalysisStep && isAnalyzing ? (
                      <span className='mt-1 block text-[11px] font-medium text-[var(--gray-10)]'>
                        Analyzing document...
                      </span>
                    ) : null}

                    {isFieldsStep && isFieldsPhase ? (
                      <span className='mt-1 block text-[11px] font-medium text-[var(--gray-10)]'>
                        Review fields before export...
                      </span>
                    ) : null}

                    {isDoneStep && isExporting ? (
                      <span className='mt-1 block text-[11px] font-medium text-[var(--gray-10)]'>
                        Exporting...
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
            <div className='flex h-[72px] shrink-0 items-center justify-between border-b border-[var(--gray-3)] px-5'>
              <div className='flex min-w-0 items-center gap-3'>
                <div className='flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-1)] text-[var(--primary-9)]'>
                  <FileText size={20} />
                </div>
                <div className='min-w-0'>
                  <h2 className='text-base font-bold text-[var(--gray-13)]'>
                    Document Preview
                  </h2>
                  <p className='truncate text-xs font-medium text-[var(--gray-9)]'>
                    {fileData.name} ({formatFileSize(fileData.size)})
                  </p>
                </div>
              </div>
            </div>

            <div
              className={[
                'm-6 min-h-0 flex-1 overflow-hidden rounded-xl border transition-all',
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
                enableHighlight
                fileName={fileData.name}
                fileUrl={previewUrl}
                highlightTerms={highlightTerms}
                isImage={isImage(fileData)}
                isPdf={isPdf(fileData)}
                showScanOverlay={isAnalyzing}
              />
            </div>

            <input
              accept={`${PDF_ACCEPT},${IMAGE_ACCEPT}`}
              className='hidden'
              ref={invoiceInputRef}
              type='file'
              onChange={(event) => handleInvoiceFiles(event.target.files)}
            />
          </AnimateSlideUp>

          <AnimateSlideUp
            className='flex h-[560px] max-h-[calc(100vh-100px)] min-h-0 flex-col overflow-hidden rounded-2xl border border-[var(--gray-3)] bg-surface shadow-sm'
            delay={0.08}
          >
            <div className='flex h-[72px] shrink-0 items-center justify-between border-b border-[var(--gray-3)] px-5'>
              <div className='flex min-w-0 items-center gap-3'>
                <div className='flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-1)] text-[var(--primary-9)]'>
                  <Icon className='size-5' name='tabler:code' />
                </div>
                <div>
                  <h2 className='text-base font-bold text-[var(--gray-13)]'>
                    Extracted Data
                  </h2>
                  <p className='text-xs font-medium text-[var(--gray-9)]'>
                    {isAnalyzing
                      ? 'Extracting fields...'
                      : `${repositoryFields.length} fields ready`}
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
                  Fields
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
                  JSON
                </button>
              </div>
            </div>

            <div className='relative min-h-0 flex-1 overflow-hidden p-5'>
              {isAnalyzing ? (
                <div className='absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-surface/80 backdrop-blur-[1px]'>
                  <Icon
                    className='size-8 animate-spin text-[var(--primary-9)]'
                    name='tabler:loader-2'
                  />
                  <p className='text-sm font-medium text-[var(--gray-11)]'>
                    Extracting fields from document...
                  </p>
                </div>
              ) : null}

              {activeTab === 'fields' ? (
                <div className='h-full max-h-full overflow-y-auto pr-2'>
                  <div className='m-4 grid grid-cols-1 gap-4'>
                    {repositoryFields.map((field) => (
                      <div className='space-y-1.5' key={field.id}>
                        {renderFieldControl(field)}
                      </div>
                    ))}

                    {!repositoryFields.length ? (
                      <div className='rounded-xl border border-dashed border-[var(--gray-4)] p-8 text-center text-sm font-medium text-[var(--gray-9)]'>
                        No repository fields configured.
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className='relative h-full max-h-full'>
                  <button
                    aria-label='Copy JSON'
                    className='absolute top-3 right-3 z-10 flex items-center gap-1 rounded-lg border border-[var(--gray-3)] bg-surface/95 px-2.5 py-1.5 text-xs font-semibold text-[var(--gray-11)] shadow-sm backdrop-blur-sm hover:bg-[var(--gray-2)]'
                    type='button'
                    onClick={copyMetadata}
                  >
                    <Copy size={14} />
                    Copy
                  </button>
                  <pre className='h-full max-h-full overflow-auto rounded-xl bg-[var(--gray-1)] p-4 pt-12 text-xs leading-6 text-[var(--gray-12)]'>
                    {safeJson(buildMetadata())}
                  </pre>
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
                    Cancel
                  </button>
                ) : null}
              </div>

              <Button
  className="!h-10 shrink-0 !border-[var(--gray-3)] !bg-[var(--primary-10)] !px-5 !text-sm !text-[var(--surface)] hover:!bg-[var(--primary-9)] disabled:!opacity-50"
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
                {isExporting ? 'Exporting...' : 'Export'}
              </Button>
            </div>
          </AnimateSlideUp>
        </div>
      </div>
    </AnimateFadeIn>
  )
}
