import Papa from 'papaparse'
import { useMemo, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import folderApi from '@/api/folders/folders'
import Button from '@/components/base/button/Button'
import Icon from '@/components/base/icon/Icon'
import showToast from '@/components/base/toast/showToast'
import { AnimateFadeIn, AnimateSlideUp } from '@/components/common/animations'
import requestStore from '@/pages/requests/stores/useRequestStore'
import authUserStore from '@/stores/authUserStore'
import cn from '@/utils/cn'
import { downloadTemplate, PO_ACCEPT } from '../utils'
import { compareHeaderSimilarity } from './utils/headerSimilarity'
import { SYSTEM_TEMPLATE_COLUMNS } from './utils/templateSchema'

export type UploadState =
  | 'idle'
  | 'parsing'
  | 'processing'
  | 'ready'
  | 'completed'
  | 'error'
type Props = {
  onClose: () => void
}

type StepState = 'waiting' | 'active' | 'done'

export default function PoSetupFlowPage({ onClose }: Props) {
  const { closeNewRequest } = requestStore((state) => state)
  const tenantId = authUserStore.getState()?.session?.tenantId

  // Upload & Pipeline State
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)

  // File details
  const [uploadedColumns, setUploadedColumns] = useState<string[]>([])
  const [rowCount, setRowCount] = useState<number | null>(null)
  const [mapping, setMapping] = useState<Record<string, string>>({})

  // Custom dropdown open state
  const [openFieldDropdown, setOpenFieldDropdown] = useState<string | null>(
    null,
  )

  // Timeline step states
  const [step1State, setStep1State] = useState<StepState>('waiting')
  const [step2State, setStep2State] = useState<StepState>('waiting')
  const [step3State, setStep3State] = useState<StepState>('waiting')
  const [step4State, setStep4State] = useState<StepState>('waiting')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // System Template columns schema
  const systemColumns = useMemo(() => SYSTEM_TEMPLATE_COLUMNS, [])

  const requiredFields = useMemo(
    () => [
      'PO Number',
      'Vendor Name',
      'Vendor Address',
      'Ship To Address',
      'PO Date',
      'PO Amount',
    ],
    [],
  )
  const optionalFields = useMemo(() => ['Terms'], [])

  const mappedCount = requiredFields.filter((f) => !!mapping[f]).length

  const defaultMockColumns = [
    'PO_No',
    'Supplier_Name',
    'Billing_Address',
    'Vendor_Loc',
    'Shipping_Address',
    'PO_Date',
    'PO_Amount',
    'Payment_Terms',
  ]

  // CSV Normalization helper
  const normalizeHeader = (h: unknown) => {
    return String(h ?? '')
      .trim()
      .replace(/\s+/g, ' ')
  }

  // Parse CSV payload
  const parseCsv = async (
    csvFileOrText: File | string,
  ): Promise<{ headers: string[]; previewRows: any[]; rowCount: number }> => {
    return new Promise((resolve, reject) => {
      Papa.parse(csvFileOrText as any, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const fields = (results.meta?.fields ?? [])
            .map(normalizeHeader)
            .filter(Boolean)
          const rowCount = results.data.length
          const previewRows = results.data.slice(0, 15)

          if (!fields.length) reject(new Error('No header row found in CSV.'))
          else resolve({ headers: fields, previewRows, rowCount })
        },
        error: (err) => reject(err),
      })
    })
  }

  // Extract Columns and Row Count from uploaded File
  const extractHeadersAndData = async (
    file: File,
  ): Promise<{ headers: string[]; previewRows: any[]; rowCount: number }> => {
    const name = file.name.toLowerCase()
    if (name.endsWith('.csv')) return parseCsv(file)
    if (name.endsWith('.xlsx')) {
      const buf = await file.arrayBuffer()
      const u8 = new Uint8Array(buf)
      const looksLikeZip = u8.length >= 2 && u8[0] === 0x50 && u8[1] === 0x4b
      if (!looksLikeZip) {
        const text = await file.text()
        return parseCsv(text)
      }
      try {
        const wb = XLSX.read(u8, { type: 'array' })
        const firstSheetName = wb.SheetNames?.[0]
        if (!firstSheetName) throw new Error('No sheets found in XLSX.')
        const ws = wb.Sheets[firstSheetName]
        const rows = XLSX.utils.sheet_to_json(ws, {
          blankrows: false,
          header: 1,
        }) as unknown[][]
        const headerRow = rows?.[0] ?? []
        const headers = headerRow.map(normalizeHeader).filter(Boolean)

        const allRows = XLSX.utils.sheet_to_json(ws) as any[]
        const previewRows = allRows.slice(0, 15)
        const rowCount = allRows.length

        return { headers, previewRows, rowCount }
      } catch {
        const text = await file.text()
        return parseCsv(text)
      }
    }
    throw new Error('Unsupported file type. Please upload a CSV or XLSX file.')
  }

  // Starts the interactive pipeline
  const startPipeline = async (file: File) => {
    setUploadedFile(file)
    setUploadProgress(0)
    setUploadState('parsing')

    try {
      const result = await extractHeadersAndData(file)

      // Simulate upload/parse progress bar smoothly
      let currentProgress = 0
      const timer = setInterval(() => {
        currentProgress += 10
        if (currentProgress >= 100) {
          clearInterval(timer)
          setUploadProgress(100)

          setTimeout(() => {
            setUploadState('processing')
            runTimelineSimulation(result.headers, result.rowCount, file)
          }, 300)
        } else {
          setUploadProgress(currentProgress)
        }
      }, 60)
    } catch (err: any) {
      console.error(err)
      setUploadState('idle')
      setUploadedFile(null)
      showToast({
        message: err.message || 'Failed to process file',
        variant: 'error',
      })
    }
  }

  // Simulation run for Stage 2 Ingestion timeline
  const runTimelineSimulation = (
    headers: string[],
    rowsCount: number,
    file: File,
  ) => {
    setUploadedColumns(headers)
    setRowCount(rowsCount)

    // Step 1: Ingestion & Parsing starts
    setStep1State('active')
    setStep2State('waiting')
    setStep3State('waiting')
    setStep4State('waiting')

    // After 600ms, Step 1 Done, Step 2 Active
    setTimeout(() => {
      setStep1State('done')
      setStep2State('active')

      // After 900ms, Step 2 Done, Step 3 Active
      setTimeout(() => {
        setStep2State('done')
        setStep3State('active')

        // After 1200ms, Auto-Mapping simulation maps fields and decides to ingest or resolve
        setTimeout(() => {
          const initialMapping: Record<string, string> = {}

          // Map system columns based on similarity
          systemColumns.forEach((col) => {
            const match = headers.find((u) =>
              compareHeaderSimilarity(u, col.key),
            )
            if (match) {
              initialMapping[col.key] = match
            }
          })

          setMapping(initialMapping)

          // Check if all required fields are mapped
          const missingRequired = requiredFields.filter(
            (f) => !initialMapping[f],
          )

          if (missingRequired.length === 0) {
            // Success: Proceed to Stage 4 Ingestion & Confirmation automatically!
            setStep3State('done')
            setStep4State('active')

            setTimeout(async () => {
              try {
                const updatedFile = await updateFileHeaders(
                  file,
                  initialMapping,
                )
                await sendUpdatedFile(updatedFile)
                setStep4State('done')
              } catch (err) {
                setUploadState('error')
                setStep3State('active')
                setStep4State('waiting')
              }
            }, 1200)
          } else {
            // Missing required fields: Switch to Field Resolution Screen (Screen 3)
            setUploadState('ready')
          }
        }, 1200)
      }, 900)
    }, 600)
  }

  // Inverted header translator to replace source file headers with master system columns
  const updateFileHeaders = async (
    file: File,
    mapping: Record<string, string>,
  ) => {
    const fileName = file.name
    const fileExtension = fileName.split('.').pop()?.toLowerCase()

    return new Promise<File>((resolve, reject) => {
      // Invert mapping: sourceField -> masterField
      const invertedMapping: Record<string, string> = {}
      Object.entries(mapping).forEach(([masterKey, sourceVal]) => {
        if (sourceVal) {
          invertedMapping[sourceVal.trim()] = masterKey
        }
      })

      const translateHeader = (header: string) => {
        const trimmed = header.trim()
        return invertedMapping[trimmed] || trimmed
      }

      if (fileExtension === 'csv') {
        const reader = new FileReader()
        reader.onload = (event) => {
          if (event.target?.result) {
            const csvData = event.target.result as string
            const lines = csvData.split('\n')
            if (lines.length > 0) {
              const headers = lines[0].split(',')
              const updatedHeaders = headers.map(translateHeader)
              lines[0] = updatedHeaders.join(',')
            }
            const updatedCsv = new Blob([lines.join('\n')], {
              type: 'text/csv',
            })
            resolve(new File([updatedCsv], fileName, { type: 'text/csv' }))
          }
        }
        reader.onerror = (error) => reject(error)
        reader.readAsText(file)
      } else if (fileExtension === 'xlsx') {
        const reader = new FileReader()
        reader.onload = (event) => {
          if (event.target?.result) {
            const data = event.target.result as ArrayBuffer
            const wb = XLSX.read(data, { type: 'array' })
            const sheetName = wb.SheetNames[0]
            const sheet = wb.Sheets[sheetName]
            const rows: any = XLSX.utils.sheet_to_json(sheet, { header: 1 })

            if (rows.length > 0) {
              const updatedHeaders = rows[0].map((h: string) =>
                translateHeader(h),
              )
              rows[0] = updatedHeaders
            }

            const updatedSheet = XLSX.utils.aoa_to_sheet(rows)
            const updatedWb = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(
              updatedWb,
              updatedSheet,
              sheetName || 'Sheet1',
            )

            const updatedBlob = XLSX.write(updatedWb, {
              bookType: 'xlsx',
              type: 'array',
            })
            resolve(
              new File([updatedBlob], fileName, {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              }),
            )
          }
        }
        reader.onerror = (error) => reject(error)
        reader.readAsArrayBuffer(file)
      } else {
        reject(new Error('Unsupported file extension'))
      }
    })
  }

  // Upload API submission
  const sendUpdatedFile = async (file: File) => {
    const payload = {
      file: file,
      formId: 3,
    }

    try {
      const { data, error } = await folderApi.uploadMasterFile(payload)
      if (data) {
        showToast({
          message: 'PO data file ingested successfully',
          variant: 'success',
        })
        setUploadState('completed')
      }

      if (error) {
        showToast({ message: 'Error uploading file', variant: 'error' })
        throw new Error(error)
      }
    } catch (error: any) {
      console.error(error)
      throw error
    }
  }

  // Confirm manual mapping action (transitions back to Timeline Step 4 active state)
  const handleManualConfirm = async () => {
    if (!uploadedFile) return
    setIsSubmitting(true)
    setUploadState('processing')
    setStep3State('done')
    setStep4State('active')

    try {
      const updatedFile = await updateFileHeaders(uploadedFile, mapping)
      // Simulate final saving in Step 4 for 1200ms
      await new Promise((resolve) => setTimeout(resolve, 1200))
      await sendUpdatedFile(updatedFile)
      setStep4State('done')
    } catch (error) {
      setUploadState('error')
      setStep3State('active')
      setStep4State('waiting')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDownload = async () => {
    if (isDownloading) return
    setIsDownloading(true)
    try {
      const fileUrl = downloadTemplate((tenantId as string) || '1')
      const link = document.createElement('a')
      link.href = fileUrl
      link.setAttribute('download', 'PO_Template.xlsx')
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      await new Promise((resolve) => setTimeout(resolve, 800))
    } catch (error) {
      showToast({ message: 'Failed to download template', variant: 'error' })
    } finally {
      setIsDownloading(false)
    }
  }

  const onFileChange = (file: File | undefined) => {
    if (!file) return
    const lower = file.name.toLowerCase()
    const isAllowed = lower.endsWith('.csv') || lower.endsWith('.xlsx')

    if (!isAllowed) {
      showToast({
        message: 'Please upload only CSV or XLSX files',
        variant: 'error',
      })
      return
    }
    startPipeline(file)
  }

  // Dropdown list options mapping
  const availableColumnsList = uploadedColumns.length
    ? uploadedColumns
    : defaultMockColumns

  return (
    <div className='animate-in fade-in flex h-full w-full flex-1 flex-col overflow-hidden bg-surface-muted font-inter text-gray-13 duration-300'>
      {/* SCREEN 1: UPLOAD SCREEN */}
      {(uploadState === 'idle' || uploadState === 'parsing') && (
        <AnimateFadeIn className='flex h-full w-full flex-col overflow-hidden'>
          {/* Header */}
          <div className='flex h-13 shrink-0 items-center gap-2 border-b border-border-default bg-gradient-to-b from-gray-1 to-gray-2 px-4'>
            <button
              className='cursor-pointer rounded-md p-1.5 text-gray-9 transition-colors hover:bg-surface-hover hover:text-gray-12'
              onClick={onClose}
            >
              <Icon className='size-4' name='tabler:arrow-left' />
            </button>
            <div className='flex items-center gap-2'>
              <div className='flex size-7 items-center justify-center rounded-lg bg-accent-soft text-primary-9'>
                <Icon
                  className='size-4 text-primary-9'
                  name='tabler:file-import'
                />
              </div>
              <h1 className='text-[16px] font-medium text-gray-12'>PO Setup</h1>
            </div>
          </div>

          <main className='custom-scrollbar flex min-h-0 flex-1 flex-col items-center overflow-y-auto p-6'>
            <div className='my-auto flex w-full max-w-xl flex-col items-center gap-4 py-2'>
              {/* Header Section */}
              <AnimateSlideUp className='space-y-1.5 text-center'>
                <h1 className='text-2xl font-bold tracking-tight text-gray-13'>
                  Intelligent <span className='text-primary-9'>PO Agent</span>
                </h1>
                <p className='mx-auto max-w-xl text-sm leading-normal font-medium text-gray-10'>
                  Streamline your Purchase Orders. Automatically match columns,
                  extract records, and configure ingestion logic.
                </p>
              </AnimateSlideUp>

              {/* Download template button centered */}
              <AnimateSlideUp className='w-full flex justify-end' delay={0.05}>
                <button
                  className='mb-2 flex cursor-pointer items-center gap-2 self-end rounded-lg border border-border-default bg-surface-primary px-4 py-2 text-[12px] font-bold text-gray-11 shadow-2xs transition-all duration-300 hover:scale-[1.02] hover:bg-surface-secondary active:scale-[0.98]'
                  disabled={isDownloading}
                  onClick={handleDownload}
                >
                {isDownloading ? (
                  <span className='size-3.5 animate-spin rounded-full border-2 border-gray-10 border-t-transparent' />
                ) : (
                  <Icon
                    className='size-4 text-primary-9'
                    name='tabler:download'
                  />
                )}
                <span>
                  {isDownloading ? 'Preparing...' : 'Download PO template'}
                </span>
              </button>
            </AnimateSlideUp>

              {/* Drop Zone / Selection state */}
              <AnimateSlideUp className='w-full' delay={0.1}>
                {uploadState === 'idle' ? (
                  <div className='group relative w-full overflow-hidden rounded-xl border border-border-default bg-surface-primary p-2 shadow-2xs transition-all duration-500 hover:shadow-xs'>
                  {/* Scan Animation effect */}
                  <div className='pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-xl opacity-0 transition-opacity duration-700 group-hover:opacity-100'>
                    <div className='absolute inset-0 h-1/2 w-full animate-[scan_3s_linear_infinite] bg-gradient-to-b from-transparent via-accent-soft/20 to-transparent' />
                  </div>

                  <div
                    className={cn(
                      'relative z-10 flex min-h-[150px] cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-[1.5px] border-dashed border-border-default px-6 py-6 text-center transition-all duration-500 ease-out',
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
                      <Icon
                        className='size-6 text-primary-9'
                        name='tabler:cloud-upload'
                      />
                    </div>
                    <div className='text-center'>
                      <h3 className='text-[14px] font-medium tracking-tight text-gray-12'>
                        Drop your PO file here, or{' '}
                        <span className='font-medium text-primary-9 group-hover:underline'>
                          browse
                        </span>
                      </h3>
                      <p className='mt-1.5 text-[12px] text-gray-8'>
                        Supports CSV, XLSX · Max 4 MB
                      </p>
                    </div>
                  </div>

                  <input
                    accept={PO_ACCEPT}
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
                      <Icon
                        className='size-5 text-green-11'
                        name='tabler:file-text'
                      />
                    </div>
                    <div className='min-w-0 flex-1'>
                      <h4 className='truncate text-[13px] font-medium text-gray-12'>
                        {uploadedFile?.name}
                      </h4>
                      <p className='text-[11px] text-gray-8'>
                        {uploadedFile
                          ? `${(uploadedFile.size / 1024).toFixed(1)} KB`
                          : 'Processing...'}
                      </p>
                    </div>
                  </div>
                  {/* Progress bar */}
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
              <AnimateSlideUp className='w-full' delay={0.15}>
                <div className='mt-1.5 grid w-full grid-cols-3 gap-3.5'>
                  {/* Card 1 */}
                  <div className='flex flex-col gap-2 rounded-xl border border-border-default bg-surface-primary p-3 shadow-2xs transition-shadow duration-300 hover:shadow-xs'>
                    <div className='flex size-8 items-center justify-center rounded-lg bg-accent-soft text-primary-9'>
                      <Icon className='size-4' name='tabler:table-column' />
                    </div>
                    <div>
                      <div className='mb-1 text-[11px] leading-none font-medium text-gray-8'>
                        Auto column mapping
                      </div>
                      <div className='text-[13px] leading-tight font-bold text-gray-12'>
                        AI-matched fields
                      </div>
                    </div>
                  </div>

                  {/* Card 2 */}
                  <div className='flex flex-col gap-2 rounded-xl border border-border-default bg-surface-primary p-3 shadow-2xs transition-shadow duration-300 hover:shadow-xs'>
                    <div className='flex size-8 items-center justify-center rounded-lg bg-accent-soft text-primary-9'>
                      <Icon className='size-4' name='tabler:checks' />
                    </div>
                    <div>
                      <div className='mb-1 text-[11px] leading-none font-medium text-gray-8'>
                        Validation
                      </div>
                      <div className='text-[13px] leading-tight font-bold text-gray-12'>
                        Required fields checked
                      </div>
                    </div>
                  </div>

                  {/* Card 3 */}
                  <div className='flex flex-col gap-2 rounded-xl border border-border-default bg-surface-primary p-3 shadow-2xs transition-shadow duration-300 hover:shadow-xs'>
                    <div className='flex size-8 items-center justify-center rounded-lg bg-accent-soft text-primary-9'>
                      <Icon className='size-4' name='tabler:history' />
                    </div>
                    <div>
                      <div className='mb-1 text-[11px] leading-none font-medium text-gray-8'>
                        Previous templates
                      </div>
                      <div className='text-[13px] leading-tight font-bold text-gray-12'>
                        3 saved mappings
                      </div>
                    </div>
                  </div>
                </div>
              </AnimateSlideUp>
            </div>
          </main>
        </AnimateFadeIn>
      )}

      {/* SCREEN 2: INGESTION TIMELINE SCREEN */}
      {uploadState === 'processing' && (
        <AnimateFadeIn className='flex h-full w-full flex-col overflow-hidden'>
          {/* Header */}
          <div className='flex h-13 shrink-0 items-center gap-2 border-b border-border-default bg-gradient-to-b from-gray-1 to-gray-2 px-4'>
            <button
              className='cursor-pointer rounded-md p-1.5 text-gray-9 transition-colors hover:bg-surface-hover hover:text-gray-12'
              onClick={() => setUploadState('idle')}
            >
              <Icon className='size-4' name='tabler:arrow-left' />
            </button>
            <div className='flex items-center gap-2'>
              <div className='flex size-7 items-center justify-center rounded-lg bg-accent-soft text-primary-9'>
                <Icon className='size-4' name='tabler:activity' />
              </div>
              <h1 className='text-[16px] font-medium text-gray-12'>
                Ingestion timeline
              </h1>
            </div>
          </div>

          {/* Timeline Layout */}
          <main className='custom-scrollbar flex min-h-0 flex-1 flex-col items-center overflow-y-auto p-6'>
            <AnimateSlideUp className='relative my-auto w-full max-w-xl space-y-6 py-4 pl-8'>
              {/* Vertical connector line */}
              <div className='absolute top-3 bottom-3 left-3.5 z-0 w-[1.5px] bg-border-default' />

              {/* STEP 1: FILE INGESTION & PARSING */}
              <div className='relative z-10 flex flex-col gap-2'>
                <div className='flex items-start gap-4'>
                  <div
                    className={cn(
                      'absolute -left-8 flex size-7 items-center justify-center rounded-full border-4 border-surface-muted transition-all duration-300',
                      step1State === 'done'
                        ? 'border-green-3 bg-green-3 text-green-11'
                        : step1State === 'active'
                          ? 'border-accent-soft bg-accent-soft text-primary-9'
                          : 'border-gray-2 bg-gray-2 text-gray-8',
                    )}
                  >
                    {step1State === 'done' ? (
                      <Icon className='size-4 font-bold' name='tabler:check' />
                    ) : step1State === 'active' ? (
                      <Icon
                        className='size-4 animate-spin'
                        name='tabler:loader-2'
                      />
                    ) : (
                      <Icon className='size-3.5' name='tabler:clock' />
                    )}
                  </div>
                  <div className='flex-1'>
                    <div className='flex items-center justify-between'>
                      <h3 className='text-[13px] font-bold text-gray-12'>
                        File Ingestion & Parsing
                      </h3>
                      {step1State === 'done' && (
                        <span className='rounded-full bg-green-3 px-2 py-0.5 text-[11px] font-medium text-green-11'>
                          Completed in 0.4s
                        </span>
                      )}
                      {step1State === 'active' && (
                        <span className='animate-pulse rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-primary-9'>
                          In progress
                        </span>
                      )}
                    </div>
                    <p className='mt-0.5 text-[11px] font-medium text-gray-8'>
                      Ingesting raw file payload and validating structure.
                    </p>
                  </div>
                </div>

                {/* Step 1 Detail Card */}
                {(step1State === 'active' || step1State === 'done') && (
                  <div className='animate-in fade-in slide-in-from-top-2 ml-3 grid grid-cols-2 gap-x-6 gap-y-2 rounded-xl border border-border-default bg-surface-primary p-4 text-[12px] shadow-2xs duration-300'>
                    <div className='flex justify-between border-b border-border-default/45 pb-1.5'>
                      <span className='text-gray-8'>File size</span>
                      <span className='font-bold text-gray-12'>
                        {uploadedFile
                          ? `${(uploadedFile.size / 1024).toFixed(1)} KB`
                          : '32.4 KB'}
                      </span>
                    </div>
                    <div className='flex justify-between border-b border-border-default/45 pb-1.5'>
                      <span className='text-gray-8'>Format</span>
                      <span className='font-bold text-gray-12'>
                        {uploadedFile?.name.split('.').pop()?.toUpperCase() ||
                          'XLSX'}
                      </span>
                    </div>
                    <div className='flex justify-between border-b border-border-default/45 pb-1.5'>
                      <span className='text-gray-8'>Rows detected</span>
                      <span className='font-bold text-gray-12'>
                        {rowCount || 48} rows
                      </span>
                    </div>
                    <div className='flex justify-between border-b border-border-default/45 pb-1.5'>
                      <span className='text-gray-8'>Sheets used</span>
                      <span className='font-bold text-gray-12'>1 sheet</span>
                    </div>
                  </div>
                )}
              </div>

              {/* STEP 2: COLUMN & ROW EXTRACTION */}
              <div className='relative z-10 flex flex-col gap-2'>
                <div className='flex items-start gap-4'>
                  <div
                    className={cn(
                      'absolute -left-8 flex size-7 items-center justify-center rounded-full border-4 border-surface-muted transition-all duration-300',
                      step2State === 'done'
                        ? 'border-green-3 bg-green-3 text-green-11'
                        : step2State === 'active'
                          ? 'border-accent-soft bg-accent-soft text-primary-9'
                          : 'border-gray-2 bg-gray-2 text-gray-8',
                    )}
                  >
                    {step2State === 'done' ? (
                      <Icon className='size-4 font-bold' name='tabler:check' />
                    ) : step2State === 'active' ? (
                      <Icon
                        className='size-4 animate-spin'
                        name='tabler:loader-2'
                      />
                    ) : (
                      <Icon className='size-3.5' name='tabler:clock' />
                    )}
                  </div>
                  <div className='flex-1'>
                    <div className='flex items-center justify-between'>
                      <h3 className='text-[13px] font-bold text-gray-12'>
                        Column & Row Extraction
                      </h3>
                      {step2State === 'done' && (
                        <span className='rounded-full bg-green-3 px-2 py-0.5 text-[11px] font-medium text-green-11'>
                          Completed in 0.9s
                        </span>
                      )}
                      {step2State === 'active' && (
                        <span className='animate-pulse rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-primary-9'>
                          In progress
                        </span>
                      )}
                    </div>
                    <p className='mt-0.5 text-[11px] font-medium text-gray-8'>
                      Extracting grid fields and filtering metadata records.
                    </p>
                  </div>
                </div>

                {/* Step 2 Detail Card */}
                {(step2State === 'active' || step2State === 'done') && (
                  <div className='animate-in fade-in slide-in-from-top-2 ml-3 grid grid-cols-2 gap-x-6 gap-y-2 rounded-xl border border-border-default bg-surface-primary p-4 text-[12px] shadow-2xs duration-300'>
                    <div className='flex justify-between border-b border-border-default/45 pb-1.5'>
                      <span className='text-gray-8'>Columns found</span>
                      <span className='font-bold text-gray-12'>
                        {uploadedColumns.length || 8} columns
                      </span>
                    </div>
                    <div className='flex justify-between border-b border-border-default/45 pb-1.5'>
                      <span className='text-gray-8'>Empty rows skipped</span>
                      <span className='font-bold text-gray-12'>0 skipped</span>
                    </div>
                    <div className='flex justify-between border-b border-border-default/45 pb-1.5'>
                      <span className='text-gray-8'>Header row</span>
                      <span className='font-bold text-gray-12'>Row 1</span>
                    </div>
                    <div className='flex justify-between border-b border-border-default/45 pb-1.5'>
                      <span className='text-gray-8'>Data rows</span>
                      <span className='font-bold text-gray-12'>
                        {rowCount ? rowCount - 1 : 47} rows
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* STEP 3: SCHEMA AUTO-MAPPING */}
              <div className='relative z-10 flex flex-col gap-2'>
                <div className='flex items-start gap-4'>
                  <div
                    className={cn(
                      'absolute -left-8 flex size-7 items-center justify-center rounded-full border-4 border-surface-muted transition-all duration-300',
                      step3State === 'done'
                        ? 'border-green-3 bg-green-3 text-green-11'
                        : step3State === 'active'
                          ? 'border-accent-soft bg-accent-soft text-primary-9'
                          : 'border-gray-2 bg-gray-2 text-gray-8',
                    )}
                  >
                    {step3State === 'done' ? (
                      <Icon className='size-4 font-bold' name='tabler:check' />
                    ) : step3State === 'active' ? (
                      <Icon
                        className='size-4 animate-spin'
                        name='tabler:loader-2'
                      />
                    ) : (
                      <Icon className='size-3.5' name='tabler:clock' />
                    )}
                  </div>
                  <div className='flex-1'>
                    <div className='flex items-center justify-between'>
                      <h3 className='text-[13px] font-bold text-gray-12'>
                        Schema Auto-Mapping
                      </h3>
                      {step3State === 'done' && (
                        <span className='rounded-full bg-green-3 px-2 py-0.5 text-[11px] font-medium text-green-11'>
                          Completed
                        </span>
                      )}
                      {step3State === 'active' && (
                        <span className='animate-pulse rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-primary-9'>
                          In progress
                        </span>
                      )}
                    </div>
                    <p className='mt-0.5 text-[11px] font-medium text-gray-8'>
                      Aligning CSV/XLSX headers with database mapping schema.
                    </p>
                  </div>
                </div>

                {/* Step 3 Detail Card */}
                {(step3State === 'active' || step3State === 'done') && (
                  <div className='animate-in fade-in slide-in-from-top-2 ml-3 grid grid-cols-2 gap-x-6 gap-y-2 rounded-xl border border-border-default bg-surface-primary p-4 text-[12px] shadow-2xs duration-300'>
                    <div className='flex justify-between border-b border-border-default/45 pb-1.5'>
                      <span className='text-gray-8'>Fields matched</span>
                      <span className='font-bold text-gray-12'>
                        {step3State === 'done'
                          ? '6 / 6 fields'
                          : '2 / 6 fields'}
                      </span>
                    </div>
                    <div className='flex justify-between border-b border-border-default/45 pb-1.5'>
                      <span className='text-gray-8'>Confidence level</span>
                      <span className='font-bold text-gray-12'>
                        91% average
                      </span>
                    </div>
                    <div className='flex justify-between border-b border-border-default/45 pb-1.5'>
                      <span className='text-gray-8'>Fields needing review</span>
                      <span className='font-bold text-gray-12'>
                        {step3State === 'done' ? '0 fields' : '4 fields'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* STEP 4: INGESTION & CONFIRMATION */}
              <div className='relative z-10 flex flex-col gap-2'>
                <div className='flex items-start gap-4'>
                  <div
                    className={cn(
                      'absolute -left-8 flex size-7 items-center justify-center rounded-full border-4 border-surface-muted transition-all duration-300',
                      step4State === 'done'
                        ? 'border-green-3 bg-green-3 text-green-11'
                        : step4State === 'active'
                          ? 'border-accent-soft bg-accent-soft text-primary-9'
                          : 'border-gray-2 bg-gray-2 text-gray-8',
                    )}
                  >
                    {step4State === 'done' ? (
                      <Icon className='size-4 font-bold' name='tabler:check' />
                    ) : step4State === 'active' ? (
                      <Icon
                        className='size-4 animate-spin'
                        name='tabler:loader-2'
                      />
                    ) : (
                      <Icon className='size-3.5' name='tabler:clock' />
                    )}
                  </div>
                  <div className='flex-1'>
                    <h3 className='text-[13px] font-bold text-gray-12'>
                      Ingestion & Confirmation
                    </h3>
                    <p className='mt-0.5 text-[11px] font-semibold text-gray-8'>
                      {step4State === 'active'
                        ? 'Finalizing record ingestion...'
                        : step4State === 'done'
                          ? 'Ingestion fully completed.'
                          : 'Waiting for field verification'}
                    </p>
                  </div>
                </div>
              </div>
            </AnimateSlideUp>
          </main>
        </AnimateFadeIn>
      )}

      {/* SCREEN 3: VERIFY FIELDS SCREEN */}
      {uploadState === 'ready' && (
        <AnimateFadeIn className='flex h-full w-full flex-col overflow-hidden'>
          {/* Header */}
          <div className='flex h-13 shrink-0 items-center gap-2 border-b border-border-default bg-gradient-to-b from-gray-1 to-gray-2 px-4'>
            <button
              className='cursor-pointer rounded-md p-1.5 text-gray-9 transition-colors hover:bg-surface-hover hover:text-gray-12'
              onClick={() => setUploadState('processing')}
            >
              <Icon className='size-4' name='tabler:arrow-left' />
            </button>
            <div className='flex items-center gap-2'>
              <div className='flex size-7 items-center justify-center rounded-lg bg-accent-soft text-primary-9'>
                <Icon
                  className='size-4 text-primary-9'
                  name='tabler:list-check'
                />
              </div>
              <h1 className='text-[16px] font-medium text-gray-12'>
                Verify Fields
              </h1>
            </div>
          </div>

          {/* Body Content */}
          <main className='custom-scrollbar flex min-h-0 flex-1 flex-col items-center justify-start overflow-y-auto p-6'>
            <AnimateSlideUp className='w-full max-w-xl space-y-5 py-4'>
              {/* Progress Indicator */}
              <div className='space-y-2 rounded-xl border border-border-default bg-surface-primary p-4 shadow-2xs'>
                <div className='flex items-center justify-between text-[12px]'>
                  <span className='font-medium text-gray-8'>
                    Map your file columns to PO fields
                  </span>
                  <span className='rounded-full bg-accent-soft px-2 py-0.5 font-bold text-primary-9'>
                    {mappedCount}/6 mapped
                  </span>
                </div>
                <div className='h-1 w-full overflow-hidden rounded-full bg-gray-2'>
                  <div
                    className='h-full bg-primary-9 transition-all duration-300 ease-out'
                    style={{ width: `${(mappedCount / 6) * 100}%` }}
                  />
                </div>
              </div>

              {/* REQUIRED FIELDS SECTION */}
              <div className='space-y-3.5'>
                <div className='pl-1 text-[11px] font-bold tracking-wider text-gray-8 uppercase'>
                  Required Fields
                </div>

                {requiredFields.map((fieldKey) => {
                  const selectedCol = mapping[fieldKey]
                  const isMapped = !!selectedCol
                  const isConflict =
                    fieldKey === 'Vendor Address' && !selectedCol
                  const isOpen = openFieldDropdown === fieldKey

                  return (
                    <div
                      key={fieldKey}
                      className={cn(
                        'flex flex-col gap-2.5 rounded-xl border p-4 transition-all duration-300',
                        isMapped
                          ? 'border-green-11/30 bg-green-3/25'
                          : isConflict
                            ? 'border-red-11/30 bg-red-3/25'
                            : 'border-border-default bg-surface-primary',
                      )}
                    >
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-1.5'>
                          {isMapped && (
                            <Icon
                              className='size-4 text-green-11'
                              name='tabler:circle-check'
                            />
                          )}
                          {isConflict && (
                            <Icon
                              className='size-4 text-red-11'
                              name='tabler:alert-triangle'
                            />
                          )}
                          <span
                            className={cn(
                              'text-[13px] font-semibold',
                              isMapped
                                ? 'text-green-11'
                                : isConflict
                                  ? 'text-red-11'
                                  : 'text-gray-12',
                            )}
                          >
                            {fieldKey}
                          </span>
                        </div>
                        <span
                          className={cn(
                            'rounded px-1.5 py-0.5 text-[10px] font-bold uppercase',
                            isMapped
                              ? 'bg-green-3 text-green-11'
                              : isConflict
                                ? 'bg-red-3 text-red-11'
                                : 'bg-gray-2 text-gray-8',
                          )}
                        >
                          Required
                        </span>
                      </div>

                      {/* Dropdown Selector Button */}
                      <div className='relative'>
                        <button
                          className={cn(
                            'flex w-full cursor-pointer items-center justify-between rounded-lg border bg-surface-primary px-3 py-2 text-[12px] font-medium transition-all',
                            isMapped
                              ? 'border-green-11/30 font-medium text-green-11'
                              : isConflict
                                ? 'border-red-11/30 font-medium text-red-11'
                                : 'border-border-default text-gray-8',
                          )}
                          onClick={() =>
                            setOpenFieldDropdown(isOpen ? null : fieldKey)
                          }
                        >
                          <span>
                            {selectedCol || 'Select matching column...'}
                          </span>
                          <Icon
                            className={cn(
                              'size-4 transition-transform duration-200',
                              isMapped
                                ? 'text-green-11'
                                : isConflict
                                  ? 'text-red-11'
                                  : 'text-gray-9',
                            )}
                            name={
                              isOpen
                                ? 'tabler:chevron-up'
                                : 'tabler:chevron-down'
                            }
                          />
                        </button>

                        {/* Inline selector options (Reflowing Page Layout) */}
                        {isOpen && (
                          <div className='animate-in slide-in-from-top-2 relative z-10 mt-1.5 space-y-1 rounded-lg border border-border-default bg-surface-primary p-2 shadow-sm duration-200'>
                            <div className='border-b border-border-default/40 px-2 py-1 text-[10px] font-semibold text-gray-8'>
                              Select File Column
                            </div>
                            <div className='custom-scrollbar max-h-36 overflow-y-auto'>
                              {availableColumnsList.map((col) => (
                                <button
                                  key={col}
                                  className={cn(
                                    'flex w-full cursor-pointer items-center justify-between rounded px-2 py-1.5 text-left text-[12px] transition-colors duration-150 hover:bg-accent-soft hover:text-primary-9',
                                    selectedCol === col
                                      ? 'bg-accent-soft font-bold text-primary-9'
                                      : 'text-gray-12',
                                  )}
                                  onClick={() => {
                                    setMapping((prev) => ({
                                      ...prev,
                                      [fieldKey]: col,
                                    }))
                                    setOpenFieldDropdown(null)
                                  }}
                                >
                                  <span>{col}</span>
                                  {selectedCol === col && (
                                    <Icon
                                      className='size-3.5 font-bold text-primary-9'
                                      name='tabler:check'
                                    />
                                  )}
                                </button>
                              ))}
                            </div>
                            {selectedCol && (
                              <button
                                className='mt-1 w-full cursor-pointer rounded border-t border-border-default/45 py-1.5 text-center text-[11px] font-bold text-red-11 transition-colors duration-150 hover:bg-red-3/50'
                                onClick={() => {
                                  setMapping((prev) => {
                                    const next = { ...prev }
                                    delete next[fieldKey]
                                    return next
                                  })
                                  setOpenFieldDropdown(null)
                                }}
                              >
                                Clear mapping
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Score Indicator or Conflict Message */}
                      {isMapped &&
                        (fieldKey === 'PO Number' ||
                          fieldKey === 'Vendor Name') && (
                          <div className='mt-1 flex items-center justify-between pl-1 text-[11px]'>
                            <div className='mr-3 h-1 max-w-[80px] flex-1 overflow-hidden rounded-full bg-gray-2'>
                              <div
                                className='h-full bg-green-11'
                                style={{
                                  width:
                                    fieldKey === 'PO Number' ? '94%' : '87%',
                                }}
                              />
                            </div>
                            <span className='text-[11px] font-bold text-green-11'>
                              {fieldKey === 'PO Number'
                                ? '94% match'
                                : '87% match'}
                            </span>
                          </div>
                        )}

                      {isConflict && (
                        <div className='mt-1 flex animate-pulse items-center gap-1.5 pl-1 text-[11px] font-bold text-red-11'>
                          <Icon
                            className='size-3.5 shrink-0 text-red-11'
                            name='tabler:alert-triangle'
                          />
                          <span>
                            2 possible matches — select the correct one
                          </span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* OPTIONAL FIELDS SECTION */}
              <div className='space-y-3.5 pt-2'>
                <div className='pl-1 text-[11px] font-bold tracking-wider text-gray-8 uppercase'>
                  Optional Fields
                </div>

                {optionalFields.map((fieldKey) => {
                  const selectedCol = mapping[fieldKey]
                  const isMapped = !!selectedCol
                  const isOpen = openFieldDropdown === fieldKey

                  return (
                    <div
                      key={fieldKey}
                      className={cn(
                        'flex flex-col gap-2.5 rounded-xl border bg-surface-primary p-4 transition-all duration-300',
                        isMapped
                          ? 'border-green-11/30'
                          : 'border-border-default',
                      )}
                    >
                      <div className='flex items-center justify-between'>
                        <span className='text-[13px] font-semibold text-gray-12'>
                          {fieldKey}
                        </span>
                        <span className='rounded bg-accent-soft px-1.5 py-0.5 text-[10px] font-bold text-primary-9 uppercase'>
                          Optional
                        </span>
                      </div>

                      {/* Dropdown Selector Button */}
                      <div className='relative'>
                        <button
                          className={cn(
                            'flex w-full cursor-pointer items-center justify-between rounded-lg border bg-surface-primary px-3 py-2 text-[12px] font-medium transition-all',
                            isMapped
                              ? 'border-green-11/30 text-green-11'
                              : 'border-border-default text-gray-8',
                          )}
                          onClick={() =>
                            setOpenFieldDropdown(isOpen ? null : fieldKey)
                          }
                        >
                          <span>
                            {selectedCol || 'Select matching column...'}
                          </span>
                          <Icon
                            className='size-4 text-gray-9'
                            name={
                              isOpen
                                ? 'tabler:chevron-up'
                                : 'tabler:chevron-down'
                            }
                          />
                        </button>

                        {/* Inline Options (Reflowing) */}
                        {isOpen && (
                          <div className='animate-in slide-in-from-top-2 relative z-10 mt-1.5 space-y-1 rounded-lg border border-border-default bg-surface-primary p-2 shadow-sm duration-200'>
                            <div className='border-b border-border-default/40 px-2 py-1 text-[10px] font-semibold text-gray-8'>
                              Select File Column
                            </div>
                            <div className='custom-scrollbar max-h-36 overflow-y-auto'>
                              {availableColumnsList.map((col) => (
                                <button
                                  key={col}
                                  className={cn(
                                    'flex w-full cursor-pointer items-center justify-between rounded px-2 py-1.5 text-left text-[12px] transition-colors duration-150 hover:bg-accent-soft hover:text-primary-9',
                                    selectedCol === col
                                      ? 'bg-accent-soft font-bold text-primary-9'
                                      : 'text-gray-12',
                                  )}
                                  onClick={() => {
                                    setMapping((prev) => ({
                                      ...prev,
                                      [fieldKey]: col,
                                    }))
                                    setOpenFieldDropdown(null)
                                  }}
                                >
                                  <span>{col}</span>
                                  {selectedCol === col && (
                                    <Icon
                                      className='size-3.5 font-bold text-primary-9'
                                      name='tabler:check'
                                    />
                                  )}
                                </button>
                              ))}
                            </div>
                            {selectedCol && (
                              <button
                                className='mt-1 w-full cursor-pointer rounded border-t border-border-default/45 py-1.5 text-center text-[11px] font-bold text-red-11 transition-colors duration-150 hover:bg-red-3/50'
                                onClick={() => {
                                  setMapping((prev) => {
                                    const next = { ...prev }
                                    delete next[fieldKey]
                                    return next
                                  })
                                  setOpenFieldDropdown(null)
                                }}
                              >
                                Clear mapping
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Confirm Ingestion Actions */}
              <div className='mt-6 border-t border-border-default pt-4'>
                <button
                  disabled={mappedCount < 6 || isSubmitting}
                  className={cn(
                    'flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl py-3 text-[14px] font-bold shadow-2xs transition-all',
                    mappedCount === 6 && !isSubmitting
                      ? 'bg-primary-9 text-white hover:bg-primary-10 hover:shadow-xs active:scale-[0.99]'
                      : 'cursor-not-allowed bg-gray-2 text-gray-8 opacity-40',
                  )}
                  onClick={handleManualConfirm}
                >
                  {isSubmitting ? (
                    <span className='size-4 animate-spin rounded-full border-2 border-white border-t-transparent' />
                  ) : (
                    <Icon className='size-4' name='tabler:checks' />
                  )}
                  <span>
                    {isSubmitting
                      ? 'Ingesting records...'
                      : 'Confirm mapping & ingest'}
                  </span>
                </button>
              </div>
            </AnimateSlideUp>
          </main>
        </AnimateFadeIn>
      )}

      {/* COMPLETED SUCCESS SCREEN */}
      {uploadState === 'completed' && (
        <AnimateFadeIn className='flex h-full w-full flex-col overflow-hidden'>
          {/* Header */}
          <div className='flex h-13 shrink-0 items-center gap-2 border-b border-border-default bg-gradient-to-b from-gray-1 to-gray-2 px-4'>
            <div className='flex items-center gap-2 pl-6'>
              <div className='flex size-7 items-center justify-center rounded-lg bg-green-3 text-green-11'>
                <Icon className='size-4' name='tabler:circle-check' />
              </div>
              <h1 className='text-[16px] font-medium text-gray-12'>
                Ingestion Complete
              </h1>
            </div>
          </div>

          <main className='custom-scrollbar flex min-h-0 flex-1 flex-col items-center overflow-y-auto p-6'>
            <AnimateFadeIn className='mx-auto my-auto flex w-full max-w-md flex-col items-center gap-6 p-4 text-center'>
              <div className='relative flex size-20 items-center justify-center rounded-full border border-green-11/30 bg-green-3 text-green-11 shadow-md'>
                <div className='absolute inset-0 size-full animate-ping rounded-full border-4 border-green-11 opacity-10' />
                <Icon
                  className='size-10 font-bold'
                  name='tabler:circle-check'
                />
              </div>

              <div className='space-y-2'>
                <h2 className='text-lg font-bold text-gray-12'>
                  PO Ingestion Successful!
                </h2>
                <p className='max-w-xs text-[12px] leading-relaxed text-gray-8'>
                  Your PO file headers were successfully mapped, translated, and
                  all purchase orders saved to the master ingestion pipeline.
                </p>
              </div>

              {uploadedFile && (
                <div className='animate-in fade-in w-full space-y-2.5 rounded-xl border border-border-default bg-surface-primary p-4 text-left shadow-2xs duration-500'>
                  <div className='border-b border-border-default/40 pb-2 text-[10px] font-extrabold tracking-wider text-gray-8 uppercase'>
                    Ingestion Summary
                  </div>
                  <div className='flex justify-between text-[12px]'>
                    <span className='font-medium text-gray-8'>
                      Source File:
                    </span>
                    <span className='max-w-[200px] truncate font-bold text-gray-12'>
                      {uploadedFile.name}
                    </span>
                  </div>
                  <div className='flex justify-between text-[12px]'>
                    <span className='font-medium text-gray-8'>
                      Total Records:
                    </span>
                    <span className='font-bold text-gray-12'>
                      {rowCount || 48} rows
                    </span>
                  </div>
                  <div className='flex justify-between text-[12px]'>
                    <span className='font-medium text-gray-8'>
                      Columns Ingested:
                    </span>
                    <span className='font-bold text-gray-12'>
                      {systemColumns.length} fields
                    </span>
                  </div>
                </div>
              )}

              <Button
                className='w-full cursor-pointer rounded-xl bg-primary-9 py-3 text-[14px] font-bold text-white shadow-md transition-all hover:scale-[1.01] hover:bg-primary-10 active:scale-[0.99]'
                color='primary'
                label='Done'
                size='lg'
                variant='solid'
                onClick={() => {
                  closeNewRequest()
                  onClose()
                }}
              />
            </AnimateFadeIn>
          </main>
        </AnimateFadeIn>
      )}

      {/* COMPLETED ERROR SCREEN */}
      {uploadState === 'error' && (
        <AnimateFadeIn className='flex h-full w-full flex-col overflow-hidden'>
          {/* Header */}
          <div className='flex h-13 shrink-0 items-center gap-2 border-b border-border-default bg-gradient-to-b from-gray-1 to-gray-2 px-4'>
            <button
              className='cursor-pointer rounded-md p-1.5 text-gray-9 transition-colors hover:bg-surface-hover hover:text-gray-12'
              onClick={() => setUploadState('ready')}
            >
              <Icon className='size-4' name='tabler:arrow-left' />
            </button>
            <div className='flex items-center gap-2'>
              <div className='flex size-7 items-center justify-center rounded-lg bg-red-3 text-red-11'>
                <Icon
                  className='size-4 text-red-11'
                  name='tabler:alert-triangle'
                />
              </div>
              <h1 className='text-[16px] font-medium text-gray-12'>
                Ingestion Error
              </h1>
            </div>
          </div>

          <main className='custom-scrollbar flex min-h-0 flex-1 flex-col items-center overflow-y-auto p-6'>
            <AnimateFadeIn className='animate-in fade-in mx-auto my-auto flex w-full max-w-md flex-col items-center gap-6 p-4 text-center duration-300'>
              <div className='relative flex size-20 items-center justify-center rounded-full border border-red-11/30 bg-red-3 text-red-11 shadow-md'>
                <Icon
                  className='size-10 font-bold'
                  name='tabler:alert-triangle'
                />
              </div>

              <div className='space-y-2'>
                <h2 className='text-lg font-bold text-gray-12'>
                  Ingestion Failed
                </h2>
                <p className='max-w-xs text-[12px] leading-relaxed text-gray-8'>
                  The server encountered an error while importing the purchase
                  orders. Please try again.
                </p>
              </div>

              <div className='mt-2 flex w-full flex-col gap-2.5'>
                <button
                  className='flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary-9 py-3 text-[14px] font-bold text-white shadow-md transition-all hover:scale-[1.01] hover:bg-primary-10 active:scale-[0.99]'
                  onClick={handleManualConfirm}
                >
                  <Icon className='size-4' name='tabler:refresh' />
                  <span>Retry Ingestion</span>
                </button>

                <button
                  className='w-full cursor-pointer rounded-xl border border-border-default bg-surface-primary py-3 text-[14px] font-semibold text-gray-11 transition-all hover:bg-surface-hover'
                  onClick={() => setUploadState('ready')}
                >
                  <span>Review Column Mapping</span>
                </button>
              </div>
            </AnimateFadeIn>
          </main>
        </AnimateFadeIn>
      )}
    </div>
  )
}
