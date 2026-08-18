import { useLingui } from '@lingui/react/macro'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import formApi from '@/api/form/form'
import logoMark from '@/assets/logo/mark.png'
import Button from '@/components/base/button/Button'
import Icon from '@/components/base/icon/Icon'
import InputSelect from '@/components/base/inputs/InputSelect'
import showToast from '@/components/base/toast/showToast'
import Tooltip from '@/components/base/Tooltip'
import {
  AnimateEntrancePop,
  AnimateFadeIn,
  AnimateSlideUp,
} from '@/components/common/animations'
import type { Question } from '@/pages/form-builder/store/formStore'
import cn from '@/utils/cn'
import { findBestHeaderMatch } from '@/pages/requests/components/request/components/newrequest/poFlow/utils/headerSimilarity'

export type GenericUploadState =
  | 'idle'
  | 'parsing'
  | 'timeline'
  | 'ready'
  | 'processing'
  | 'completed'
  | 'error'

export type GenericImportStrategy = 'replace' | 'append'
type TimelineStepState = 'waiting' | 'active' | 'done'

type Props = {
  fields: Question[]
  formId: string
  formName: string
  onClose: () => void
  onComplete: () => void
}

export default function GenericFormImportModal({
  fields,
  formId,
  formName,
  onClose,
  onComplete,
}: Props) {
  const { t } = useLingui()

  // Filter out non-input structural fields and metadata keys from target schema
  const validFields = useMemo(
    () =>
      fields.filter((f) => {
        const type = (f.type || '').toUpperCase()
        const fieldId = (f.id || '').toLowerCase().trim()
        const label = (f.label || '').toLowerCase().trim()

        const isMetadataKey =
          ['id', 'entryid', 'entry #', 'entry_id', 'itemid', 'createdat', 'createdby', 'modifiedat', 'modifiedby', 'isdeleted'].includes(fieldId) ||
          ['entry #', 'entry id', 'id', 'created by', 'created date', 'modified by', 'modified date'].includes(label)

        return (
          !['HEADING', 'DIVIDER', 'LABEL'].includes(type) && !isMetadataKey
        )
      }),
    [fields],
  )

  const [uploadState, setUploadState] = useState<GenericUploadState>('idle')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [importStrategy, setImportStrategy] =
    useState<GenericImportStrategy>('append')
  const [uploadedColumns, setUploadedColumns] = useState<string[]>([])
  const [parsedRows, setParsedRows] = useState<any[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({}) // excelHeader -> fieldId
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false)

  // Step-wise timeline states
  const [step1State, setStep1State] = useState<TimelineStepState>('waiting')
  const [step2State, setStep2State] = useState<TimelineStepState>('waiting')
  const [step3State, setStep3State] = useState<TimelineStepState>('waiting')

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Filter uploaded columns to exclude EntryId and metadata fields from mapping rows
  const displayUploadedColumns = useMemo(() => {
    return uploadedColumns.filter((col) => {
      const norm = col.toLowerCase().replace(/[^a-z0-9]/g, '')
      return ![
        'entryid',
        'id',
        'itemid',
        'createdat',
        'createdby',
        'modifiedat',
        'modifiedby',
        'isdeleted',
      ].includes(norm)
    })
  }, [uploadedColumns])

  // Dynamic sample Excel template generation based on active form fields
  const handleDownloadDynamicTemplate = async () => {
    setIsDownloadingTemplate(true)
    try {
      const headers = validFields.map((f) => f.label || f.id)
      const sampleRow = validFields.map((f) => {
        const type = (f.type || 'SHORT_TEXT').toUpperCase()
        const label = (f.label || '').toLowerCase()
        if (type === 'EMAIL' || label.includes('email')) return 'john@example.com'
        if (type === 'PHONE_NUMBER' || label.includes('phone')) return '+1 555-0199'
        if (type === 'NUMBER' || type === 'COUNTER') return '100'
        if (type === 'CURRENCY_AMOUNT' || label.includes('amount') || label.includes('price')) return '250.00'
        if (type === 'DATE' || label.includes('date')) return '2026-08-18'
        if (type === 'YES_NO_TOGGLE' || type === 'CONSENT') return 'Yes'
        return `Sample ${f.label || 'Value'}`
      })

      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow])
      XLSX.utils.book_append_sheet(wb, ws, 'Form Import Template')

      const sanitizeName = (formName || 'Form').replace(/[^a-zA-Z0-9_-]/g, '_')
      XLSX.writeFile(wb, `${sanitizeName}_Import_Template.xlsx`)

      showToast({
        message: t`Sample template downloaded successfully`,
        variant: 'success',
      })
    } catch (err: any) {
      console.error('Failed to generate template:', err)
      showToast({
        message: t`Failed to generate template`,
        variant: 'error',
      })
    } finally {
      setIsDownloadingTemplate(false)
    }
  }

  // Parse file and trigger Step-Wise Timeline Animation
  const parseUploadedFile = async (file: File) => {
    setUploadedFile(file)
    setUploadProgress(0)
    setUploadState('parsing')

    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const firstSheetName = wb.SheetNames[0]
      if (!firstSheetName) {
        throw new Error(t`The workbook contains no sheets.`)
      }

      const ws = wb.Sheets[firstSheetName]
      const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][]
      if (!rawRows || rawRows.length === 0) {
        throw new Error(t`File appears to be empty.`)
      }

      const headers = (rawRows[0] || [])
        .map((h: any) => String(h ?? '').trim())
        .filter(Boolean)

      const allRows = XLSX.utils.sheet_to_json(ws) as any[]

      // Progress animation
      let currentProgress = 0
      const timer = setInterval(() => {
        currentProgress += 25
        if (currentProgress >= 100) {
          clearInterval(timer)
          setUploadProgress(100)

          setTimeout(() => {
            setUploadedColumns(headers)
            setParsedRows(allRows)
            runTimelineSimulation(headers)
          }, 300)
        } else {
          setUploadProgress(currentProgress)
        }
      }, 50)
    } catch (err: any) {
      console.error(err)
      setUploadState('idle')
      setUploadedFile(null)
      showToast({
        message: err.message || t`Failed to process file`,
        variant: 'error',
      })
    }
  }

  // Step-wise timeline simulation
  const runTimelineSimulation = (headers: string[]) => {
    setUploadState('timeline')
    setStep1State('active')
    setStep2State('waiting')
    setStep3State('waiting')

    // Step 1: File Ingestion & Parsing completes at 600ms
    setTimeout(() => {
      setStep1State('done')
      setStep2State('active')

      // Step 2: Column & Row Extraction completes at 1300ms
      setTimeout(() => {
        setStep2State('done')
        setStep3State('active')

        // Step 3: Schema Auto-Mapping completes at 2100ms
        setTimeout(() => {
          const initialMapping: Record<string, string> = {}
          headers.forEach((col) => {
            const matchedField = validFields.find((f) => {
              const matchedHeader = findBestHeaderMatch(f.label || f.id, headers)
              return matchedHeader === col
            })
            if (matchedField) {
              initialMapping[col] = matchedField.id
            }
          })
          setMapping(initialMapping)
          setStep3State('done')
          setUploadState('ready')
        }, 800)
      }, 700)
    }, 600)
  }

  const handleResetMapping = () => {
    const initialMapping: Record<string, string> = {}
    displayUploadedColumns.forEach((col) => {
      const matchedField = validFields.find((f) => {
        const matchedHeader = findBestHeaderMatch(f.label || f.id, displayUploadedColumns)
        return matchedHeader === col
      })
      if (matchedField) {
        initialMapping[col] = matchedField.id
      }
    })
    setMapping(initialMapping)
    showToast({
      message: t`Reset mappings to matching suggestions.`,
      variant: 'default',
    })
  }

  // Process and ingest records into backend
  const handleConfirmImport = async () => {
    if (!parsedRows || parsedRows.length === 0) return
    setIsSubmitting(true)
    setUploadState('processing')

    try {
      let successCount = 0

      for (const row of parsedRows) {
        const entryValues: Record<string, any> = {}
        Object.entries(mapping).forEach(([excelCol, fieldId]) => {
          if (fieldId && row[excelCol] !== undefined) {
            entryValues[fieldId] = row[excelCol]
          }
        })

        if (Object.keys(entryValues).length > 0) {
          const { error } = await formApi.saveFormEntry(formId, 0, entryValues)
          if (!error) successCount++
        }
      }

      setUploadState('completed')
      showToast({
        message: t`Successfully imported ${successCount} entries!`,
        variant: 'success',
      })
      onComplete()
      onClose()
    } catch (err: any) {
      console.error('Import failed:', err)
      setUploadState('error')
      showToast({
        message: err.message || t`Failed to import entries`,
        variant: 'error',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const onFileChange = (file: File | undefined) => {
    if (!file) return
    const lower = file.name.toLowerCase()
    if (!lower.endsWith('.csv') && !lower.endsWith('.xlsx')) {
      showToast({
        message: t`Please upload only CSV or XLSX files`,
        variant: 'error',
      })
      return
    }
    parseUploadedFile(file)
  }

  // Compute matched fields count
  const matchedCount = useMemo(
    () => Object.values(mapping).filter(Boolean).length,
    [mapping],
  )
  const unmappedCount = useMemo(
    () => displayUploadedColumns.length - matchedCount,
    [displayUploadedColumns, matchedCount],
  )

  return (
    <div className='relative flex h-full w-full flex-col overflow-hidden bg-surface-muted font-inter text-gray-13 duration-300'>
      {/* Header Banner */}
      <div className='flex h-13 shrink-0 items-center justify-between border-b border-border-default bg-gradient-to-b from-gray-1 to-gray-2 px-4'>
        <div className='flex items-center gap-2'>
          <button
            className='cursor-pointer rounded-md p-1.5 text-gray-9 transition-colors hover:bg-surface-hover hover:text-gray-12'
            onClick={onClose}
          >
            <Icon className='size-4' name='tabler:arrow-left' />
          </button>
          <div className='flex items-center gap-2'>
            <div className='flex size-7 items-center justify-center rounded-lg bg-accent-soft text-primary-9'>
              <Icon className='size-4 text-primary-9' name='tabler:file-import' />
            </div>
            <h1 className='text-[16px] font-medium text-gray-12'>
              {t`Bulk Import Entries`}
            </h1>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className='custom-scrollbar flex min-h-0 flex-1 flex-col items-center overflow-y-auto p-6'>
        {/* SCREEN 1: FILE UPLOAD */}
        {(uploadState === 'idle' || uploadState === 'parsing') && (
          <AnimateFadeIn className='my-auto flex w-full max-w-[850px] flex-col items-center gap-6 py-4'>
            <AnimateSlideUp className='space-y-1.5 text-center'>
              <h2 className='text-2xl font-bold tracking-tight text-gray-13'>
                {t`Bulk Import Entries`}
              </h2>
              <p className='mx-auto max-w-lg text-xs leading-relaxed text-gray-9'>
                {t`Map spreadsheet columns to active form fields and import response records in bulk.`}
              </p>
            </AnimateSlideUp>

            {/* Animated Dropzone Container */}
            <AnimateSlideUp className='w-full' delay={0.05}>
              {uploadState === 'idle' ? (
                <div className='group relative w-full overflow-hidden rounded-xl border border-border-default bg-surface-primary p-2 shadow-2xs transition-all duration-500 hover:shadow-xs'>
                  {/* Scan Animation effect */}
                  <div className='pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-xl opacity-0 transition-opacity duration-700 group-hover:opacity-100'>
                    <div className='absolute inset-0 h-1/2 w-full animate-[scan_3s_linear_infinite] bg-gradient-to-b from-transparent via-accent-soft/20 to-transparent' />
                  </div>

                  <div
                    className={cn(
                      'relative z-10 flex min-h-[160px] cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-[1.5px] border-dashed border-border-default px-6 py-8 text-center transition-all duration-500 ease-out',
                      isDragOver
                        ? 'scale-[0.99] border-primary-9 bg-accent-soft/10 shadow-inner'
                        : 'bg-surface-primary hover:border-primary-9 hover:bg-accent-soft/5',
                    )}
                    onClick={() => fileInputRef.current?.click()}
                    onDragLeave={() => setIsDragOver(false)}
                    onDragOver={(e) => {
                      e.preventDefault()
                      setIsDragOver(true)
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      setIsDragOver(false)
                      onFileChange(e.dataTransfer.files?.[0])
                    }}
                  >
                    <div className='flex size-14 items-center justify-center rounded-full bg-accent-soft transition-all duration-300 group-hover:scale-105'>
                      <Icon className='size-6 text-primary-9' name='tabler:cloud-upload' />
                    </div>
                    <div className='text-center'>
                      <h3 className='text-[14px] font-medium tracking-tight text-gray-12'>
                        {t`Drop your file here, or`}{' '}
                        <span className='font-medium text-primary-9 group-hover:underline'>
                          {t`browse`}
                        </span>
                      </h3>
                      <p className='mt-1 text-[12px] text-gray-8'>
                        {t`Supports Excel (.xlsx, .xls) and CSV formats`}
                      </p>
                      <div className='mt-3 flex justify-center'>
                        <button
                          className='inline-flex cursor-pointer items-center gap-1.5 text-[12px] font-medium text-primary-9 hover:text-primary-10 hover:underline'
                          disabled={isDownloadingTemplate}
                          type='button'
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDownloadDynamicTemplate()
                          }}
                        >
                          {isDownloadingTemplate ? (
                            <span className='size-3 animate-spin rounded-full border-2 border-primary-9 border-t-transparent' />
                          ) : (
                            <Icon className='size-3.5' name='tabler:download' />
                          )}
                          <span>
                            {isDownloadingTemplate
                              ? t`Downloading...`
                              : t`Download Sample Template`}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <input
                    accept='.csv, .xlsx'
                    className='hidden'
                    ref={fileInputRef}
                    type='file'
                    onChange={(e) => onFileChange(e.target.files?.[0])}
                  />
                </div>
              ) : (
                /* FILE PREVIEW CARD DURING PARSING */
                <div className='animate-in fade-in flex w-full flex-col gap-3 rounded-xl border border-border-default bg-surface-primary p-4 shadow-2xs duration-300'>
                  <div className='flex items-center gap-3'>
                    <div className='flex size-10 items-center justify-center rounded-lg bg-green-3 text-green-11'>
                      <Icon className='size-5 text-green-11' name='tabler:file-text' />
                    </div>
                    <div className='min-w-0 flex-1'>
                      <h4 className='truncate text-[13px] font-medium text-gray-12'>
                        {uploadedFile?.name}
                      </h4>
                      <p className='text-[11px] text-gray-8'>
                        {uploadedFile
                          ? `${(uploadedFile.size / 1024).toFixed(1)} KB`
                          : t`Processing...`}
                      </p>
                    </div>
                  </div>
                  <div className='h-1 w-full overflow-hidden rounded-full bg-gray-2'>
                    <div
                      className='h-full bg-primary-9 transition-all duration-150 ease-out'
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </AnimateSlideUp>

            {/* Three Context Cards Grid */}
            <AnimateSlideUp className='w-full' delay={0.1}>
              <div className='grid w-full grid-cols-1 gap-4 md:grid-cols-3'>
                {[
                  {
                    color: 'text-[var(--orange-9)] bg-[var(--orange-2)]',
                    icon: 'tabler:table-column',
                    label: t`MAPPING`,
                    sub: t`Automatically links file columns`,
                    title: t`Auto Column Mapping`,
                  },
                  {
                    color: 'text-[var(--indigo-9)] bg-[var(--indigo-2)]',
                    icon: 'tabler:checks',
                    label: t`VALIDATION`,
                    sub: t`Validates required system fields`,
                    title: t`Schema Validation`,
                  },
                  {
                    color: 'text-[var(--green-11)] bg-[var(--green-2)]',
                    icon: 'tabler:database-import',
                    label: t`INGESTION`,
                    sub: t`Updates records in master database`,
                    title: t`Master Data Update`,
                  },
                ].map((item, idx) => (
                  <AnimateEntrancePop
                    delay={0.2 + idx * 0.1}
                    key={item.title}
                  >
                    <div className='group flex h-full flex-col gap-2 rounded-xl border border-[var(--gray-3)] bg-surface p-5 shadow-sm transition-all duration-300 hover:shadow-md'>
                      <span className='truncate text-[9px] font-bold tracking-wider text-[var(--gray-10)] uppercase'>
                        {item.label}
                      </span>
                      <div className='mt-1 flex items-center gap-3.5'>
                        <div
                          className={`flex size-10 items-center justify-center rounded-lg shadow-sm ${item.color} transition-transform duration-300 group-hover:scale-105`}
                        >
                          <Icon
                            className='size-5 transition-transform duration-300 group-hover:rotate-6'
                            name={item.icon}
                          />
                        </div>
                        <div className='min-w-0 flex-1'>
                          <h4 className='truncate text-13/4.5 font-semibold text-[var(--gray-13)] transition-colors group-hover:text-purple-7'>
                            {item.title}
                          </h4>
                          <p className='mt-0.5 truncate text-11/4 text-[var(--gray-10)]'>
                            {item.sub}
                          </p>
                        </div>
                      </div>
                    </div>
                  </AnimateEntrancePop>
                ))}
              </div>
            </AnimateSlideUp>
          </AnimateFadeIn>
        )}

        {/* SCREEN 2: INGESTION TIMELINE & COLUMN MAPPING (Image 1 Exact Design) */}
        {(uploadState === 'timeline' || uploadState === 'ready') && (
          <AnimateSlideUp className='relative my-auto w-full max-w-3xl space-y-6 py-4 pl-8 transition-all duration-300'>
            {/* STEP 1: FILE INGESTION & PARSING */}
            <div className='relative z-10 flex flex-col gap-3.5 pl-10'>
              <div className='absolute top-8 -bottom-[18px] left-[13px] z-0 w-[1.5px] bg-border-default' />
              <div
                className={cn(
                  'absolute top-8 -bottom-[18px] left-[13px] z-0 w-[1.5px] origin-top bg-green-11 transition-transform duration-700 ease-in-out',
                  step1State === 'done' ? 'scale-y-100' : 'scale-y-0',
                )}
              />
              <div className='flex items-start gap-4'>
                <div
                  className={cn(
                    'absolute top-0.5 left-0 z-10 flex size-7 items-center justify-center rounded-full shadow-xs transition-all duration-300',
                    step1State === 'done'
                      ? 'border border-green-9 bg-white text-green-9'
                      : step1State === 'active'
                        ? 'border-2 border-primary-9 bg-white text-primary-9'
                        : 'border-2 border-gray-3 bg-white text-gray-4',
                  )}
                >
                  {step1State === 'done' ? (
                    <Icon className='size-4 stroke-[3px]' name='tabler:check' />
                  ) : step1State === 'active' ? (
                    <Icon className='size-4 animate-spin' name='tabler:loader-2' />
                  ) : (
                    <Icon className='size-3.5' name='tabler:clock' />
                  )}
                </div>
                <div className='flex flex-1 items-center gap-2'>
                  <h3 className='min-w-0 flex-1 text-[13px] font-bold text-gray-12'>
                    {t`File Ingestion & Parsing`}
                  </h3>
                  {step1State === 'done' && (
                    <span className='shrink-0 rounded-full border border-green-9 bg-white px-2 py-0.5 text-[11px] font-medium whitespace-nowrap text-green-9'>
                      {t`Completed in 0.4s`}
                    </span>
                  )}
                  {step1State === 'active' && (
                    <span className='shrink-0 animate-pulse rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium whitespace-nowrap text-primary-9'>
                      {t`In progress`}
                    </span>
                  )}
                </div>
              </div>
              <p className='-mt-2 text-[11px] font-medium text-gray-8'>
                {t`Ingesting raw file payload and validating structure.`}
              </p>

              {(step1State === 'active' || step1State === 'done') && (
                <div className='animate-in fade-in slide-in-from-top-2 grid grid-cols-2 gap-x-6 gap-y-2 rounded-xl border border-border-default bg-surface-primary p-4 text-[12px] shadow-2xs duration-300'>
                  <div className='flex justify-between border-b border-border-default/45 pb-1.5'>
                    <span className='text-gray-11'>{t`File Size`}</span>
                    <span className='font-bold text-gray-12'>
                      {uploadedFile
                        ? `${(uploadedFile.size / 1024).toFixed(1)} KB`
                        : '3.6 KB'}
                    </span>
                  </div>
                  <div className='flex justify-between border-b border-border-default/45 pb-1.5'>
                    <span className='text-gray-11'>{t`Format`}</span>
                    <span className='font-bold text-gray-12'>
                      {uploadedFile?.name.split('.').pop()?.toUpperCase() || 'XLSX'}
                    </span>
                  </div>
                  <div className='flex justify-between border-b border-border-default/45 pb-1.5'>
                    <span className='text-gray-11'>{t`Rows Detected`}</span>
                    <span className='font-bold text-gray-12'>
                      {parsedRows.length + 1} {t`rows`}
                    </span>
                  </div>
                  <div className='flex justify-between border-b border-border-default/45 pb-1.5'>
                    <span className='text-gray-11'>{t`Sheets Used`}</span>
                    <span className='font-bold text-gray-12'>{t`1 sheet`}</span>
                  </div>
                </div>
              )}
            </div>

            {/* STEP 2: COLUMN & ROW EXTRACTION */}
            <div className='relative z-10 flex flex-col gap-3.5 pl-10'>
              <div className='absolute top-8 -bottom-[18px] left-[13px] z-0 w-[1.5px] bg-border-default' />
              <div
                className={cn(
                  'absolute top-8 -bottom-[18px] left-[13px] z-0 w-[1.5px] origin-top bg-green-11 transition-transform duration-700 ease-in-out',
                  step2State === 'done' ? 'scale-y-100' : 'scale-y-0',
                )}
              />
              <div className='flex items-start gap-4'>
                <div
                  className={cn(
                    'absolute top-0.5 left-0 z-10 flex size-7 items-center justify-center rounded-full shadow-xs transition-all duration-300',
                    step2State === 'done'
                      ? 'border border-green-9 bg-white text-green-9'
                      : step2State === 'active'
                        ? 'border-2 border-primary-9 bg-white text-primary-9'
                        : 'border-2 border-gray-3 bg-white text-gray-4',
                  )}
                >
                  {step2State === 'done' ? (
                    <Icon className='size-4 stroke-[3px]' name='tabler:check' />
                  ) : step2State === 'active' ? (
                    <Icon className='size-4 animate-spin' name='tabler:loader-2' />
                  ) : (
                    <Icon className='size-3.5' name='tabler:clock' />
                  )}
                </div>
                <div className='flex flex-1 items-center gap-2'>
                  <h3 className='min-w-0 flex-1 text-[13px] font-bold text-gray-12'>
                    {t`Column & Row Extraction`}
                  </h3>
                  {step2State === 'done' && (
                    <span className='shrink-0 rounded-full border border-green-9 bg-white px-2 py-0.5 text-[11px] font-medium whitespace-nowrap text-green-9'>
                      {t`Completed in 0.9s`}
                    </span>
                  )}
                  {step2State === 'active' && (
                    <span className='shrink-0 animate-pulse rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium whitespace-nowrap text-primary-9'>
                      {t`In progress`}
                    </span>
                  )}
                </div>
              </div>
              <p className='-mt-2 text-[11px] font-medium text-gray-8'>
                {t`Extracting grid fields and filtering metadata records.`}
              </p>

              {(step2State === 'active' || step2State === 'done') && (
                <div className='animate-in fade-in slide-in-from-top-2 grid grid-cols-2 gap-x-6 gap-y-2 rounded-xl border border-border-default bg-surface-primary p-4 text-[12px] shadow-2xs duration-300'>
                  <div className='flex justify-between border-b border-border-default/45 pb-1.5'>
                    <span className='text-gray-11'>{t`Columns Found`}</span>
                    <span className='font-bold text-gray-12'>
                      {displayUploadedColumns.length} {t`columns`}
                    </span>
                  </div>
                  <div className='flex justify-between border-b border-border-default/45 pb-1.5'>
                    <span className='text-gray-11'>{t`Empty Rows Skipped`}</span>
                    <span className='font-bold text-gray-12'>{t`0 skipped`}</span>
                  </div>
                  <div className='flex justify-between border-b border-border-default/45 pb-1.5'>
                    <span className='text-gray-11'>{t`Header Row`}</span>
                    <span className='font-bold text-gray-12'>{t`Row 1`}</span>
                  </div>
                  <div className='flex justify-between border-b border-border-default/45 pb-1.5'>
                    <span className='text-gray-11'>{t`Data Rows`}</span>
                    <span className='font-bold text-gray-12'>
                      {parsedRows.length} {t`rows`}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* STEP 3: SCHEMA AUTO-MAPPING */}
            <div className='relative z-10 flex flex-col gap-3.5 pl-10'>
              <div className='flex items-start gap-4'>
                <div
                  className={cn(
                    'absolute top-0.5 left-0 z-10 flex size-7 items-center justify-center rounded-full shadow-xs transition-all duration-300',
                    step3State === 'done'
                      ? 'border border-green-9 bg-white text-green-9'
                      : step3State === 'active'
                        ? 'border-2 border-primary-9 bg-white text-primary-9'
                        : 'border-2 border-gray-3 bg-white text-gray-4',
                  )}
                >
                  {step3State === 'done' ? (
                    <Icon className='size-4 stroke-[3px]' name='tabler:check' />
                  ) : step3State === 'active' ? (
                    <Icon className='size-4 animate-spin' name='tabler:loader-2' />
                  ) : (
                    <Icon className='size-3.5' name='tabler:clock' />
                  )}
                </div>
                <div className='flex flex-1 items-center gap-2'>
                  <h3 className='min-w-0 flex-1 text-[13px] font-bold text-gray-12'>
                    {t`Schema Auto-Mapping`}
                  </h3>
                  {step3State === 'done' && (
                    <span className='shrink-0 rounded-full border border-green-9 bg-white px-2 py-0.5 text-[11px] font-medium whitespace-nowrap text-green-9'>
                      {t`Completed`}
                    </span>
                  )}
                </div>
              </div>
              <p className='-mt-2 text-[11px] font-medium text-gray-8'>
                {t`Aligning CSV/XLSX headers with database mapping schema.`}
              </p>

              {(step3State === 'active' || step3State === 'done') && (
                <div className='animate-in fade-in slide-in-from-top-2 grid grid-cols-2 gap-x-6 gap-y-2 rounded-xl border border-border-default bg-surface-primary p-4 text-[12px] shadow-2xs duration-300'>
                  <div className='flex justify-between border-b border-border-default/45 pb-1.5'>
                    <span className='text-gray-11'>{t`Fields Matched`}</span>
                    <span className='font-bold text-gray-12'>
                      {matchedCount} / {validFields.length} {t`fields`}
                    </span>
                  </div>
                  <div className='flex justify-between border-b border-border-default/45 pb-1.5'>
                    <span className='text-gray-11'>{t`Confidence Level`}</span>
                    <span className='font-bold text-gray-12'>
                      {matchedCount > 0
                        ? `${Math.round((matchedCount / validFields.length) * 100)}% average`
                        : '0%'}
                    </span>
                  </div>
                  <div className='flex justify-between border-b border-border-default/45 pb-1.5'>
                    <span className='text-gray-11'>{t`Strategy`}</span>
                    <span className='font-bold text-gray-12'>
                      {importStrategy === 'append' ? t`Append` : t`Replace`}
                    </span>
                  </div>
                  <div className='flex justify-between border-b border-border-default/45 pb-1.5'>
                    <span className='text-gray-11'>{t`Fields Needing Review`}</span>
                    <span className='font-bold text-gray-12'>
                      {unmappedCount} {t`fields`}
                    </span>
                  </div>
                </div>
              )}

              {/* INLINE COLUMN MAPPING TABLE (Exact Image 1 Design) */}
              {uploadState === 'ready' && (
                <div className='animate-in fade-in slide-in-from-top-2 mt-4 space-y-3 rounded-xl border border-border-default bg-surface-primary p-4 text-[12px] shadow-2xs duration-300'>
                  <div className='flex items-center justify-between border-b border-border-default pb-3'>
                    <p className='text-[11px] text-gray-11'>
                      {t`Map Excel file headers (source) to EZOFIS database fields (destination).`}
                    </p>
                    <Tooltip content={t`Reset to default suggestions`} position='top'>
                      <button
                        className='flex items-center gap-1 text-[11px] text-primary-9 hover:underline'
                        type='button'
                        onClick={handleResetMapping}
                      >
                        <Icon className='size-3.5' name='tabler:rotate' />
                        <span>{t`Reset`}</span>
                      </button>
                    </Tooltip>
                  </div>

                  {/* Table Column Headers */}
                  <div className='grid grid-cols-[1.2fr_1.2fr_1.6fr] gap-4 border-b border-border-default pb-2 text-[12px] font-semibold text-gray-10 select-none'>
                    <div className='flex items-center gap-1.5'>
                      <Icon className='size-3.5' name='vscode-icons:file-type-excel' />
                      <span>{t`Excel Fields`}</span>
                    </div>
                    <div className='flex items-center gap-1.5 pl-2'>
                      <span>{t`Example`}</span>
                    </div>
                    <div className='flex items-center gap-1.5 pl-2'>
                      <img
                        alt='EZOFIS Logo'
                        className='size-3.5 shrink-0 object-contain'
                        src={logoMark}
                      />
                      <span>{t`EZOFIS Fields`}</span>
                    </div>
                  </div>

                  {/* Table Rows (Filtered displayUploadedColumns - no EntryId row!) */}
                  <div className='divide-y divide-border-default/60'>
                    {displayUploadedColumns.map((excelCol) => {
                      const currentMappedFieldId = mapping[excelCol] || ''
                      const rawPreviewVal = parsedRows?.[0]?.[excelCol]
                      const previewVal =
                        rawPreviewVal !== undefined &&
                        rawPreviewVal !== null &&
                        rawPreviewVal !== ''
                          ? String(rawPreviewVal)
                          : ''

                      const fieldOptions = [
                        { id: '', name: t`Skip this field` },
                        ...validFields.map((f) => ({
                          id: f.id,
                          name: f.label || f.id,
                        })),
                      ]

                      const selectedOpt = fieldOptions.find(
                        (o) => o.id === currentMappedFieldId,
                      ) || { id: '', name: t`Skip this field` }

                      return (
                        <div
                          key={excelCol}
                          className='grid grid-cols-[1.2fr_1.2fr_1.6fr] items-center gap-4 py-2.5 first:pt-1'
                        >
                          <div className='flex min-w-0 items-center'>
                            <span className='truncate font-semibold text-gray-12' title={excelCol}>
                              {excelCol}
                            </span>
                          </div>

                          <div className='truncate pl-2 text-[11px] text-gray-8' title={previewVal}>
                            {previewVal ? (
                              <span>{previewVal}</span>
                            ) : (
                              <span className='text-gray-5 italic'>{t`Empty`}</span>
                            )}
                          </div>

                          <div className='pl-2'>
                            <InputSelect
                              options={fieldOptions}
                              placeholder={t`Skip this field`}
                              value={selectedOpt}
                              onChange={(opt) =>
                                setMapping((prev) => ({
                                  ...prev,
                                  [excelCol]: opt ? String(opt.id) : '',
                                }))
                              }
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Action Bar */}
                  <div className='flex items-center justify-between border-t border-border-default pt-3'>
                    <Button
                      color='gray'
                      label={t`Cancel`}
                      size='sm'
                      variant='outline'
                      onClick={onClose}
                    />
                    <Button
                      color='primary'
                      disabled={isSubmitting}
                      icon='tabler:check'
                      label={t`Confirm & Ingest Entries`}
                      loading={isSubmitting}
                      size='sm'
                      variant='solid'
                      onClick={handleConfirmImport}
                    />
                  </div>
                </div>
              )}
            </div>
          </AnimateSlideUp>
        )}

        {uploadState === 'processing' && (
          <AnimateFadeIn className='my-auto flex flex-col items-center justify-center p-12 text-center'>
            <div className='mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary-1 text-primary-9'>
              <Icon className='size-7 animate-spin' name='tabler:loader-2' />
            </div>
            <h3 className='text-base font-bold text-gray-13'>
              {t`Ingesting entries...`}
            </h3>
            <p className='mt-1 text-xs text-gray-8'>
              {t`Please wait while your spreadsheet rows are parsed and added to the database.`}
            </p>
          </AnimateFadeIn>
        )}
      </main>
    </div>
  )
}
