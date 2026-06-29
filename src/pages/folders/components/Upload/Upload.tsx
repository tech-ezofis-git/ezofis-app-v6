import { SpecialZoomLevel, Viewer, Worker } from '@react-pdf-viewer/core'
import { ArrowUpFromLine, CheckCircle2, Copy, FileText } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { UploadFiles } from '@/api/v6/folder/folder'
import IconButton from '@/components/base/button/IconButton'
import InputText from '@/components/base/inputs/InputText'
import InputTextarea from '@/components/base/inputs/InputTextarea'
import showToast from '@/components/base/toast/showToast'
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
type UploadStatus = 'idle' | 'uploading' | 'success' | 'error'

const PROCESS_STEPS = ['Received', 'Analysis', 'Fields', 'Done'] as const

const getActiveStepIndex = (status: UploadStatus, hasFile: boolean) => {
  if (status === 'success') return 3
  if (status === 'uploading') return 2
  if (hasFile) return 2
  return -1
}

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

const getInputValue = (eventOrValue: any) => {
  if (eventOrValue?.target) return eventOrValue.target.value ?? ''
  return eventOrValue ?? ''
}

const safeJson = (value: unknown) => JSON.stringify(value, null, 2)

export default function Upload({
  folderId,
  repositoryData,
  repositoryId,
  onBack,
  onSuccess,
}: UploadProps) {
  const invoiceInputRef = useRef<HTMLInputElement>(null)

  const [isDragOver, setIsDragOver] = useState(false)
  const [fileData, setFileData] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle')
  const [activeTab, setActiveTab] = useState<ResultTab>('fields')
  const zoom = 100
  const [scale, setScale] = useState(1)

  const viewerRef = useRef<any>(null)

  const toolbarPluginInstance = useMemo(
    () => ({
      install: (pluginFunctions: any) => {
        viewerRef.current = pluginFunctions
      },
      onZoom: (e: any) => {
        setScale(e.scale)
      },
    }),
    [],
  )
  const repositoryFields = useMemo(() => {
    return [...(repositoryData?.fields ?? [])].sort(
      (a, b) => (a.orderId ?? 0) - (b.orderId ?? 0),
    )
  }, [repositoryData?.fields])

  const [fieldValues, setFieldValues] = useState<Record<string, string>>(() =>
    getInitialValues(repositoryFields),
  )

  const isUploading = uploadStatus === 'uploading'

  useEffect(() => {
    setFieldValues(getInitialValues(repositoryFields))
  }, [repositoryFields])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const resetInput = () => {
    if (invoiceInputRef.current) invoiceInputRef.current.value = ''
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

      if (previewUrl) URL.revokeObjectURL(previewUrl)

      setFileData(selectedFile)
      setPreviewUrl(URL.createObjectURL(selectedFile))
      setUploadStatus('idle')
      setActiveTab('fields')
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
      setUploadStatus('uploading')

      const formData = new FormData()
      formData.append('file', fileData, fileData.name)
      formData.append('metadata', JSON.stringify(buildUploadMetadata()))

      const { data, error } = await UploadFiles(
        String(activeRepositoryId),
        formData,
      )

      if (error) {
        setUploadStatus('error')
        showToast({
          message: `Error uploading file: ${error}`,
          variant: 'error',
        })
        return null
      }

      setUploadStatus('success')
      showToast({ message: 'File exported successfully.', variant: 'success' })
      await onSuccess?.()
      onBack()
      return data
    } catch (error: any) {
      setUploadStatus('error')
      showToast({
        message: `Exception uploading file: ${error?.message || error}`,
        variant: 'error',
      })
      return null
    }
  }

  const activeStepIndex = getActiveStepIndex(uploadStatus, Boolean(fileData))

  const renderFieldControl = (field: RepositoryField) => {
    const value = fieldValues[getFieldKey(field)] ?? ''
    const dataType = field.dataType?.toLowerCase()
    const disabled = Boolean(field.isReadOnly || isUploading)

    const commonProps = {
      disabled,
      placeholder: `Enter ${field.name}`,
      value,
      onChange: (eventOrValue: any) =>
        updateFieldValue(field, String(getInputValue(eventOrValue))),
    }

    if (dataType === 'date') return <InputText type='date' {...commonProps} />

    if (
      dataType === 'decimal' ||
      dataType === 'number' ||
      dataType === 'currency'
    ) {
      return <InputText type='number' {...commonProps} />
    }

    if (field.name.toLowerCase().includes('address')) {
      return <InputTextarea rows={3} {...commonProps} />
    }

    return <InputText type='text' {...commonProps} />
  }

  const copyMetadata = async () => {
    await navigator.clipboard.writeText(safeJson(buildMetadata()))
    showToast({ message: 'Metadata copied.', variant: 'success' })
  }

  if (!fileData) {
    return (
      <>
        {' '}
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
            const isComplete =
              uploadStatus === 'success' ? true : index < activeStepIndex
            const isActive =
              uploadStatus !== 'success' && index === activeStepIndex

            return (
              <div
                className='flex min-w-0 flex-1 items-center gap-3 last:flex-none'
                key={step}
              >
                <div className='flex items-center gap-3'>
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
                    ) : (
                      <span className='text-sm font-bold'>{index + 1}</span>
                    )}
                  </div>

                  <span
                    className={[
                      'text-sm font-bold whitespace-nowrap',
                      isComplete || isActive
                        ? 'text-[var(--gray-13)]'
                        : 'text-[var(--gray-9)]',
                    ].join(' ')}
                  >
                    {step}
                  </span>
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
            {' '}
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

              <div className='flex items-center gap-4 text-[var(--gray-11)]'>
                {/* <button
                  className="rounded-lg p-2 hover:bg-[var(--gray-2)]"
                  type="button"
                  onClick={() => setZoom((prev) => Math.max(50, prev - 10))}
                >
                  <ZoomOut size={18} />
                </button>
                <span className="min-w-12 text-center text-sm font-medium">{zoom}%</span>
                <button
                  className="rounded-lg p-2 hover:bg-[var(--gray-2)]"
                  type="button"
                  onClick={() => setZoom((prev) => Math.min(150, prev + 10))}
                >
                  <ZoomIn size={18} />
                </button> */}
                {/* <span className="h-6 w-px bg-[var(--gray-3)]" />
                <button
                  className="rounded-lg p-2 hover:bg-[var(--gray-2)]"
                  type="button"
                  onClick={() => setZoom(100)}
                >
                  <RefreshCw size={18} />
                </button> */}
              </div>
            </div>
            <div
              className={[
                'm-6 min-h-0 flex-1 overflow-x-auto overflow-y-auto rounded-xl border transition-all',
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
              {isPdf(fileData) && previewUrl ? (
                <Worker workerUrl='https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js'>
                  <div className='group relative h-full w-full overflow-hidden'>
                    <Viewer
                      defaultScale={SpecialZoomLevel.PageWidth}
                      fileUrl={previewUrl}
                      plugins={[toolbarPluginInstance]}
                    />
                    <div className='absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-4 rounded-xl border border-[var(--gray-3)] bg-surface/90 px-4 py-2 opacity-0 shadow-2xl backdrop-blur-sm transition-all duration-300 group-hover:opacity-100'>
                      <button
                        className='p-1 hover:text-[var(--primary-9)]'
                        onClick={() => viewerRef.current?.zoom(scale - 0.1)}
                      >
                        <Icon className='size-5' name='lucide:zoom-out' />
                      </button>
                      <span className='min-w-[40px] text-center text-[12px] font-semibold'>
                        {Math.round(scale * 100)}%
                      </span>
                      <button
                        className='p-1 hover:text-[var(--primary-9)]'
                        onClick={() => viewerRef.current?.zoom(scale + 0.1)}
                      >
                        <Icon className='size-5' name='lucide:zoom-in' />
                      </button>
                    </div>
                  </div>
                </Worker>
              ) : isImage(fileData) && previewUrl ? (
                <img
                  alt={fileData.name}
                  className='max-h-full max-w-full object-contain transition-transform'
                  src={previewUrl}
                  style={{
                    transform: `scale(${zoom / 100})`,
                    transformOrigin: 'center center',
                  }}
                />
              ) : (
                <div className='flex flex-col items-center gap-2 text-center'>
                  <FileText className='text-[var(--primary-9)]' size={40} />
                  <p className='text-sm font-semibold text-[var(--gray-13)]'>
                    Preview not available
                  </p>
                </div>
              )}
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
                    {repositoryFields.length} fields ready
                  </p>
                </div>
              </div>

              <div className='flex items-center gap-2'>
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

                <button
                  className='flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold text-[var(--gray-11)] hover:bg-[var(--gray-2)]'
                  type='button'
                  onClick={copyMetadata}
                >
                  <Copy size={15} />
                  Copy
                </button>
              </div>
            </div>

            <div className='min-h-0 flex-1 overflow-hidden p-5'>
              {activeTab === 'fields' ? (
                <div className='h-full max-h-full overflow-y-auto pr-2'>
                  <div className='m-4 grid grid-cols-1 gap-4'>
                    {repositoryFields.map((field) => (
                      <div className='space-y-1.5' key={field.id}>
                        <label className='flex items-center gap-1 text-xs font-semibold text-[var(--gray-12)]'>
                          {field.name}
                          {field.isMandatory ? (
                            <span className='text-red-500'>*</span>
                          ) : null}
                        </label>
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
                <pre className='h-full max-h-full overflow-auto rounded-xl bg-[var(--gray-1)] p-4 text-xs leading-6 text-[var(--gray-12)]'>
                  {safeJson(buildMetadata())}
                </pre>
              )}
            </div>

            <div className='flex shrink-0 items-center justify-between gap-3 border-t border-[var(--gray-3)] bg-surface px-5 py-4'>
              <div className='text-xs font-medium text-[var(--gray-9)]'>
                {isUploading
                  ? 'Exporting document...'
                  : uploadStatus === 'success'
                    ? 'Exported successfully'
                    : 'Ready to export'}
              </div>

              <Button
                className='h-10 px-5 text-sm'
                disabled={isUploading}
                onClick={uploadFile}
              >
                {isUploading ? (
                  <Icon
                    className='size-4 animate-spin'
                    name='tabler:loader-2'
                  />
                ) : (
                  <ArrowUpFromLine size={15} />
                )}
                {isUploading ? 'Exporting...' : 'Export'}
              </Button>
            </div>
          </AnimateSlideUp>
        </div>
      </div>
    </AnimateFadeIn>
  )
}
