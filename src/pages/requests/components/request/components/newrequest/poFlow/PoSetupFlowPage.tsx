import Papa from 'papaparse'
import { useMemo, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { Select } from '@mantine/core'
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
  const { closeNewRequest, rawWorkflowData } = requestStore((state) => state)
  const tenantId = authUserStore.getState()?.session?.tenantId

  const workflowId = rawWorkflowData?.id
  const wFormId =
    rawWorkflowData?.formId ??
    rawWorkflowData?.wFormId ??
    rawWorkflowData?.settings?.general?.initiateUsing?.formId

  // Upload & Pipeline State
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)

  // File details
  const [uploadedColumns, setUploadedColumns] = useState<string[]>([])
  const [rowCount, setRowCount] = useState<number | null>(null)
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [previewRows, setPreviewRows] = useState<any[]>([])

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
      setPreviewRows(result.previewRows || [])

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

    // At 800ms, Step 1 completes, line starts drawing
    setTimeout(() => {
      setStep1State('done')

      // At 1600ms (800ms later), line reaches Step 2, Step 2 starts loading
      setTimeout(() => {
        setStep2State('active')

        // At 2600ms (1000ms later), Step 2 completes, line starts drawing
        setTimeout(() => {
          setStep2State('done')

          // At 3400ms (800ms later), line reaches Step 3, Step 3 starts loading
          setTimeout(() => {
            setStep3State('active')

            // At 4600ms (1200ms later), Step 3 completes, mapping initialized
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
              setStep3State('done')

              // At 5000ms (400ms later), transition to verify mappings UI
              setTimeout(() => {
                setUploadState('ready')
              }, 400)
            }, 1200)
          }, 800)
        }, 1000)
      }, 800)
    }, 800)
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
        if (sourceVal && sourceVal !== 'Skip to Import') {
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
      formId: wFormId ? Number(wFormId) : undefined,
      workflowId: workflowId ? Number(workflowId) : undefined,
    }

    try {
      const { data, error } = await folderApi.uploadMasterFile(payload)
      if (data) {
        showToast({
          message: 'Master fields mapped and saved successfully.',
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
              <AnimateSlideUp className='flex w-full justify-end' delay={0.05}>
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
      {(uploadState === 'processing' || uploadState === 'ready') && (
        <AnimateFadeIn className='flex h-full w-full flex-col overflow-hidden'>
          {/* Header */}
          <div className='flex h-13 shrink-0 items-center gap-2 border-b border-border-default bg-gradient-to-b from-gray-1 to-gray-2 px-4'>
            <button
              className='cursor-pointer rounded-md p-1.5 text-gray-9 transition-colors hover:bg-surface-hover hover:text-gray-12'
              onClick={() => {
                setUploadState('idle')
                setUploadedFile(null)
                setMapping({})
                setPreviewRows([])
              }}
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
            <AnimateSlideUp className={cn(
              'relative my-auto w-full space-y-6 py-4 pl-8 transition-all duration-300',
              uploadState === 'ready' ? 'max-w-3xl' : 'max-w-xl'
            )}>

              {/* STEP 1: FILE INGESTION & PARSING */}
              <div className='relative z-10 flex flex-col gap-2'>
                {/* Line segment from Step 1 to Step 2 */}
                <div className="absolute left-[-18px] top-7 -bottom-9 w-[1.5px] bg-border-default z-0" />
                <div
                  className={cn(
                    'absolute left-[-18px] top-7 -bottom-9 w-[1.5px] bg-green-11 origin-top transition-transform duration-700 ease-in-out z-0',
                    step1State === 'done' ? 'scale-y-100' : 'scale-y-0'
                  )}
                />
                <div className='flex items-start gap-4'>
                  <div
                    className={cn(
                      'absolute -left-8 flex size-7 items-center justify-center rounded-full transition-all duration-300 z-10',
                      step1State === 'done'
                        ? 'border-2 border-green-11 bg-white text-green-11'
                        : step1State === 'active'
                          ? 'border-4 border-accent-soft bg-accent-soft text-primary-9'
                          : 'border-4 border-gray-2 bg-gray-2 text-gray-8',
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
                {/* Line segment from Step 2 to Step 3 */}
                <div className="absolute left-[-18px] top-7 -bottom-9 w-[1.5px] bg-border-default z-0" />
                <div
                  className={cn(
                    'absolute left-[-18px] top-7 -bottom-9 w-[1.5px] bg-green-11 origin-top transition-transform duration-700 ease-in-out z-0',
                    step2State === 'done' ? 'scale-y-100' : 'scale-y-0'
                  )}
                />
                <div className='flex items-start gap-4'>
                  <div
                    className={cn(
                      'absolute -left-8 flex size-7 items-center justify-center rounded-full transition-all duration-300 z-10',
                      step2State === 'done'
                        ? 'border-2 border-green-11 bg-white text-green-11'
                        : step2State === 'active'
                          ? 'border-4 border-accent-soft bg-accent-soft text-primary-9'
                          : 'border-4 border-gray-2 bg-gray-2 text-gray-8',
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
                {/* Line segment from Step 3 to Step 4 */}
                <div className="absolute left-[-18px] top-7 -bottom-9 w-[1.5px] bg-border-default z-0" />
                <div
                  className={cn(
                    'absolute left-[-18px] top-7 -bottom-9 w-[1.5px] bg-green-11 origin-top transition-transform duration-700 ease-in-out z-0',
                    step3State === 'done' ? 'scale-y-100' : 'scale-y-0'
                  )}
                />
                <div className='flex items-start gap-4'>
                  <div
                    className={cn(
                      'absolute -left-8 flex size-7 items-center justify-center rounded-full transition-all duration-300 z-10',
                      step3State === 'done'
                        ? 'border-2 border-green-11 bg-white text-green-11'
                        : step3State === 'active'
                          ? 'border-4 border-accent-soft bg-accent-soft text-primary-9'
                          : 'border-4 border-gray-2 bg-gray-2 text-gray-8',
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

                {uploadState === 'ready' && (
                  <div className='animate-in fade-in slide-in-from-top-2 ml-3 mt-4 space-y-4 rounded-xl border border-border-default bg-surface-primary p-5 shadow-sm duration-300'>
                    <div className='flex items-center justify-between border-b border-border-default pb-3'>
                      <div>
                        <h4 className='text-[14px] font-bold text-gray-12'>Confirm Column Mapping</h4>
                        <p className='text-[11px] text-gray-8 mt-0.5'>Align uploaded columns with master system fields.</p>
                      </div>
                      <button
                        type='button'
                        onClick={() => {
                          const initialMapping: Record<string, string> = {}
                          systemColumns.forEach((col) => {
                            const match = uploadedColumns.find((u) => compareHeaderSimilarity(u, col.key))
                            if (match) initialMapping[col.key] = match
                          })
                          setMapping(initialMapping)
                          showToast({ message: 'Reset to initial suggestions.', variant: 'default' })
                        }}
                        className='flex items-center gap-1 text-[11px] font-bold text-primary-9 hover:underline'
                      >
                        <Icon className='size-3.5' name='tabler:rotate' />
                        <span>Reset</span>
                      </button>
                    </div>

                    {/* Three-column Mapping Table */}
                    <div className='flex flex-col gap-2'>
                      {/* Table Header */}
                      <div className='grid grid-cols-[1fr_1.2fr_1fr] pb-2 text-[10px] font-extrabold tracking-wider text-gray-8 uppercase border-b border-border-default'>
                        <div>System Field</div>
                        <div>Your Field</div>
                        <div>Preview</div>
                      </div>

                      {/* Scrollable Mapping Rows Container */}
                      <div className='max-h-[300px] overflow-y-auto divide-y divide-border-default/60 custom-scrollbar pr-1'>
                        {[...systemColumns]
                          .sort((a, b) => {
                            if (a.required === b.required) return 0
                            return a.required ? -1 : 1
                          })
                          .map((col) => {
                            const selectedVal = mapping[col.key] || ''
                            const isMapped = !!selectedVal
                            const previewVal = (selectedVal && selectedVal !== 'Skip to Import')
                              ? String(previewRows[0]?.[selectedVal] ?? '')
                              : ''

                            return (
                              <div key={col.key} className='grid grid-cols-[1fr_1.2fr_1fr] items-center py-2.5 gap-4 first:pt-1'>
                                {/* Column 1: System Field */}
                                <div className='flex items-center gap-1.5 min-w-0'>
                                  <span className='truncate text-[13px] font-semibold text-gray-12'>{col.key}</span>
                                  {col.required && (
                                    <Icon className='size-2 shrink-0 text-red-11 animate-pulse' name='tabler:asterisk' title='Required Field' />
                                  )}
                                </div>

                                {/* Column 2: Your Field (Dropdown Selector) */}
                                <div>
                                  <Select
                                    data={[
                                      { label: 'Skip to Import', value: 'Skip to Import' },
                                      ...uploadedColumns.map(c => ({ label: c, value: c }))
                                    ]}
                                    placeholder='Select column...'
                                    value={selectedVal || null}
                                    clearable
                                    searchable
                                    onChange={(v) => setMapping({ ...mapping, [col.key]: v ?? '' })}
                                    className='w-full'
                                    size='xs'
                                    radius='md'
                                    styles={{
                                      dropdown: {
                                        border: '1px solid var(--gray-3)',
                                        borderRadius: '12px',
                                        boxShadow: 'var(--shadow-md)',
                                        zIndex: 1000,
                                      },
                                      input: {
                                        fontSize: '12px',
                                        fontWeight: 500,
                                        height: '32px',
                                        border: isMapped ? '1px solid var(--primary-9)' : '1px solid var(--gray-4)',
                                        backgroundColor: isMapped ? 'var(--primary-2)' : 'var(--surface-primary)',
                                        color: isMapped ? 'var(--primary-12)' : 'var(--gray-12)',
                                      }
                                    }}
                                  />
                                </div>

                                {/* Column 3: Preview Value */}
                                <div className='text-[12px] font-medium text-gray-8 truncate' title={previewVal}>
                                  {selectedVal === 'Skip to Import' ? (
                                    <span className='text-gray-5 italic'>Skipped</span>
                                  ) : previewVal ? (
                                    <span className='text-gray-12 font-semibold'>"{previewVal}"</span>
                                  ) : (
                                    <span className='text-gray-5 italic'>No data</span>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                      </div>
                    </div>

                    {/* Actions Row */}
                    <div className='flex items-center justify-between border-t border-border-default pt-4 mt-2'>
                      <span className='text-[11px] font-semibold text-gray-8'>
                        {systemColumns.filter((col) => col.required && !!mapping[col.key]).length} of {systemColumns.filter((col) => col.required).length} required fields mapped
                      </span>
                      <div className='flex gap-2.5'>
                        <Button
                          variant='outline'
                          size='xs'
                          onClick={() => {
                            setUploadState('idle')
                            setUploadedFile(null)
                            setMapping({})
                            setPreviewRows([])
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          disabled={systemColumns.some((col) => col.required && !mapping[col.key])}
                          onClick={handleManualConfirm}
                          size='xs'
                        >
                          Confirm & Ingest
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* STEP 4: INGESTION & CONFIRMATION */}
              <div className='relative z-10 flex flex-col gap-2'>
                <div className='flex items-start gap-4'>
                  <div
                    className={cn(
                      'absolute -left-8 flex size-7 items-center justify-center rounded-full transition-all duration-300 z-10',
                      step4State === 'done'
                        ? 'border-2 border-green-11 bg-white text-green-11'
                        : step4State === 'active'
                          ? 'border-4 border-accent-soft bg-accent-soft text-primary-9'
                          : 'border-4 border-gray-2 bg-gray-2 text-gray-8',
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
