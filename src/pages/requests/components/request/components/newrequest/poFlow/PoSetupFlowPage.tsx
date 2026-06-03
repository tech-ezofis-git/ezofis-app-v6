import { useMemo, useState, useRef } from 'react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import folderApi from '@/api/folders/folders'
import Button from '@/components/base/button/Button'
import Icon from '@/components/base/icon/Icon'
import showToast from '@/components/base/toast/showToast'
import requestStore from '@/pages/requests/stores/useRequestStore'
import cn from '@/utils/cn'
import authUserStore from '@/stores/authUserStore'
import { SYSTEM_TEMPLATE_COLUMNS } from './utils/templateSchema'
import { compareHeaderSimilarity } from './utils/headerSimilarity'
import { downloadTemplate, PO_ACCEPT } from '../utils'
import { AnimateFadeIn } from '@/components/common/animations'

export type UploadState = 'idle' | 'parsing' | 'processing' | 'ready' | 'completed' | 'error'
type StepState = 'waiting' | 'active' | 'done'

type Props = {
  onClose: () => void
}

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
  const [openFieldDropdown, setOpenFieldDropdown] = useState<string | null>(null)

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

  const requiredFields = useMemo(() => ['PO Number', 'Vendor Name', 'Vendor Address', 'Ship To Address', 'PO Date', 'PO Amount'], [])
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
    'Payment_Terms'
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
  ): Promise<{ headers: string[]; rowCount: number; previewRows: any[] }> => {
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
          else resolve({ headers: fields, rowCount, previewRows })
        },
        error: (err) => reject(err),
      })
    })
  }

  // Extract Columns and Row Count from uploaded File
  const extractHeadersAndData = async (
    file: File,
  ): Promise<{ headers: string[]; rowCount: number; previewRows: any[] }> => {
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

        return { headers, rowCount, previewRows }
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
  const runTimelineSimulation = (headers: string[], rowsCount: number, file: File) => {
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
            const match = headers.find((u) => compareHeaderSimilarity(u, col.key))
            if (match) {
              initialMapping[col.key] = match
            }
          })

          setMapping(initialMapping)

          // Check if all required fields are mapped
          const missingRequired = requiredFields.filter((f) => !initialMapping[f])

          if (missingRequired.length === 0) {
            // Success: Proceed to Stage 4 Ingestion & Confirmation automatically!
            setStep3State('done')
            setStep4State('active')

            setTimeout(async () => {
              try {
                const updatedFile = await updateFileHeaders(file, initialMapping)
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
            const updatedCsv = new Blob([lines.join('\n')], { type: 'text/csv' })
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
              const updatedHeaders = rows[0].map((h: string) => translateHeader(h))
              rows[0] = updatedHeaders
            }

            const updatedSheet = XLSX.utils.aoa_to_sheet(rows)
            const updatedWb = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(updatedWb, updatedSheet, sheetName || 'Sheet1')

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
  const availableColumnsList = uploadedColumns.length ? uploadedColumns : defaultMockColumns

  return (
    <div className='flex h-full flex-1 w-full flex-col overflow-hidden bg-surface-muted font-inter text-gray-13 animate-in fade-in duration-300'>
      {/* SCREEN 1: UPLOAD SCREEN */}
      {(uploadState === 'idle' || uploadState === 'parsing') && (
        <div className='flex flex-col h-full w-full overflow-hidden'>
          {/* Header */}
          <div className='flex h-13 items-center gap-2 border-b border-border-default px-4 bg-gradient-to-b from-gray-1 to-gray-2 shrink-0'>
            <button 
              onClick={onClose} 
              className='p-1.5 hover:bg-surface-hover rounded-md transition-colors text-gray-9 hover:text-gray-12 cursor-pointer'
            >
              <Icon className='size-4' name='tabler:arrow-left' />
            </button>
            <div className='flex items-center gap-2'>
              <div className='flex size-7 items-center justify-center rounded-lg bg-accent-soft text-primary-9'>
                <Icon className='size-4 text-primary-9' name='tabler:file-import' />
              </div>
              <h1 className='text-[16px] font-medium text-gray-12'>PO Setup</h1>
            </div>
          </div>

          {/* Main Body content */}
          <main className='custom-scrollbar flex-1 overflow-y-auto p-6 flex flex-col items-center min-h-0'>
            <div className='flex flex-col items-center gap-4 max-w-xl w-full py-2 my-auto'>

              {/* Header Section */}
              <div className='space-y-1.5 text-center mb-1 animate-in slide-in-from-top-4 duration-300'>
                <h1 className='text-2xl font-bold tracking-tight text-gray-13'>
                  Intelligent <span className='text-primary-9'>PO Agent</span>
                </h1>
                <p className='mx-auto max-w-xl text-sm font-medium text-gray-10 leading-normal'>
                  Streamline your Purchase Orders. Automatically match columns,
                  extract records, and configure ingestion logic.
                </p>
              </div>

              {/* Download template button centered */}
              <button
                className='self-end flex items-center gap-2 rounded-lg border border-border-default px-4 py-2 text-[12px] font-bold text-gray-11 bg-surface-primary shadow-2xs transition-all duration-300 hover:bg-surface-secondary hover:scale-[1.02] active:scale-[0.98] cursor-pointer mb-2'
                disabled={isDownloading}
                onClick={handleDownload}
              >
                {isDownloading ? (
                  <span className='size-3.5 animate-spin rounded-full border-2 border-gray-10 border-t-transparent' />
                ) : (
                  <Icon className='size-4 text-primary-9' name='tabler:download' />
                )}
                <span>{isDownloading ? 'Preparing...' : 'Download PO template'}</span>
              </button>

              {/* Drop Zone / Selection state */}
              {uploadState === 'idle' ? (
                <div className='group relative overflow-hidden rounded-xl border border-border-default bg-surface-primary p-2 shadow-2xs transition-all duration-500 hover:shadow-xs w-full'>
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
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className='flex size-14 items-center justify-center rounded-full bg-accent-soft transition-all duration-300 group-hover:scale-105'>
                      <Icon className='size-6 text-primary-9' name='tabler:cloud-upload' />
                    </div>
                    <div className='text-center'>
                      <h3 className='text-[14px] font-medium tracking-tight text-gray-12'>
                        Drop your PO file here, or <span className='text-primary-9 font-medium group-hover:underline'>browse</span>
                      </h3>
                      <p className='text-[12px] text-gray-8 mt-1.5'>
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
                <div className='w-full bg-surface-primary rounded-xl border border-border-default p-4 flex flex-col gap-3 shadow-2xs animate-in fade-in duration-300'>
                  <div className='flex items-center gap-3'>
                    <div className='flex size-10 items-center justify-center rounded-lg bg-green-3 text-green-11'>
                      <Icon className='size-5 text-green-11' name='tabler:file-text' />
                    </div>
                    <div className='flex-1 min-w-0'>
                      <h4 className='text-[13px] font-medium text-gray-12 truncate'>{uploadedFile?.name}</h4>
                      <p className='text-[11px] text-gray-8'>
                        {uploadedFile ? `${(uploadedFile.size / 1024).toFixed(1)} KB` : 'Processing...'}
                      </p>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className='w-full bg-gray-2 rounded-full h-1 overflow-hidden'>
                    <div
                      className='bg-primary-9 h-full transition-all duration-150 ease-out'
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Three Context Cards Grid */}
              <div className='grid grid-cols-3 gap-3.5 w-full mt-1.5'>
                {/* Card 1 */}
                <div className='bg-surface-primary border border-border-default rounded-xl p-3 flex flex-col gap-2 shadow-2xs hover:shadow-xs transition-shadow duration-300'>
                  <div className='flex size-8 items-center justify-center rounded-lg bg-accent-soft text-primary-9'>
                    <Icon className='size-4' name='tabler:table-column' />
                  </div>
                  <div>
                    <div className='text-[11px] text-gray-8 font-medium leading-none mb-1'>Auto column mapping</div>
                    <div className='text-[13px] font-bold text-gray-12 leading-tight'>AI-matched fields</div>
                  </div>
                </div>

                {/* Card 2 */}
                <div className='bg-surface-primary border border-border-default rounded-xl p-3 flex flex-col gap-2 shadow-2xs hover:shadow-xs transition-shadow duration-300'>
                  <div className='flex size-8 items-center justify-center rounded-lg bg-accent-soft text-primary-9'>
                    <Icon className='size-4' name='tabler:checks' />
                  </div>
                  <div>
                    <div className='text-[11px] text-gray-8 font-medium leading-none mb-1'>Validation</div>
                    <div className='text-[13px] font-bold text-gray-12 leading-tight'>Required fields checked</div>
                  </div>
                </div>

                {/* Card 3 */}
                <div className='bg-surface-primary border border-border-default rounded-xl p-3 flex flex-col gap-2 shadow-2xs hover:shadow-xs transition-shadow duration-300'>
                  <div className='flex size-8 items-center justify-center rounded-lg bg-accent-soft text-primary-9'>
                    <Icon className='size-4' name='tabler:history' />
                  </div>
                  <div>
                    <div className='text-[11px] text-gray-8 font-medium leading-none mb-1'>Previous templates</div>
                    <div className='text-[13px] font-bold text-gray-12 leading-tight'>3 saved mappings</div>
                  </div>
                </div>
              </div>

            </div>
          </main>
        </div>
      )}

      {/* SCREEN 2: INGESTION TIMELINE SCREEN */}
      {uploadState === 'processing' && (
        <div className='flex flex-col h-full w-full overflow-hidden'>
          {/* Header */}
          <div className='flex h-13 items-center gap-2 border-b border-border-default px-4 bg-gradient-to-b from-gray-1 to-gray-2 shrink-0'>
            <button
              onClick={() => setUploadState('idle')}
              className='p-1.5 hover:bg-surface-hover rounded-md transition-colors text-gray-9 hover:text-gray-12 cursor-pointer'
            >
              <Icon className='size-4' name='tabler:arrow-left' />
            </button>
            <div className='flex items-center gap-2'>
              <div className='flex size-7 items-center justify-center rounded-lg bg-accent-soft text-primary-9'>
                <Icon className='size-4' name='tabler:activity' />
              </div>
              <h1 className='text-[16px] font-medium text-gray-12'>Ingestion timeline</h1>
            </div>
          </div>

          {/* Timeline Layout */}
          <main className='custom-scrollbar flex-1 overflow-y-auto p-6 flex flex-col items-center min-h-0'>
            <div className='relative pl-8 space-y-6 max-w-xl w-full py-4 my-auto'>
              {/* Vertical connector line */}
              <div className='absolute left-3.5 top-3 bottom-3 w-[1.5px] bg-border-default z-0' />

              {/* STEP 1: FILE INGESTION & PARSING */}
              <div className='relative flex flex-col gap-2 z-10'>
                <div className='flex items-start gap-4'>
                  <div
                    className={cn(
                      'absolute -left-8 flex size-7 items-center justify-center rounded-full border-4 border-surface-muted transition-all duration-300',
                      step1State === 'done'
                        ? 'bg-green-3 text-green-11 border-green-3'
                        : step1State === 'active'
                          ? 'bg-accent-soft text-primary-9 border-accent-soft'
                          : 'bg-gray-2 text-gray-8 border-gray-2',
                    )}
                  >
                    {step1State === 'done' ? (
                      <Icon className='size-4 font-bold' name='tabler:check' />
                    ) : step1State === 'active' ? (
                      <Icon className='size-4 animate-spin' name='tabler:loader-2' />
                    ) : (
                      <Icon className='size-3.5' name='tabler:clock' />
                    )}
                  </div>
                  <div className='flex-1'>
                    <div className='flex items-center justify-between'>
                      <h3 className='text-[13px] font-bold text-gray-12'>File Ingestion & Parsing</h3>
                      {step1State === 'done' && (
                        <span className='bg-green-3 text-green-11 px-2 py-0.5 text-[11px] font-medium rounded-full'>
                          Completed in 0.4s
                        </span>
                      )}
                      {step1State === 'active' && (
                        <span className='bg-accent-soft text-primary-9 px-2 py-0.5 text-[11px] font-medium rounded-full animate-pulse'>
                          In progress
                        </span>
                      )}
                    </div>
                    <p className='text-[11px] font-medium text-gray-8 mt-0.5'>
                      Ingesting raw file payload and validating structure.
                    </p>
                  </div>
                </div>

                {/* Step 1 Detail Card */}
                {(step1State === 'active' || step1State === 'done') && (
                  <div className='bg-surface-primary border border-border-default rounded-xl p-4 ml-3 shadow-2xs grid grid-cols-2 gap-x-6 gap-y-2 text-[12px] animate-in fade-in slide-in-from-top-2 duration-300'>
                    <div className='flex justify-between border-b border-border-default/45 pb-1.5'>
                      <span className='text-gray-8'>File size</span>
                      <span className='font-bold text-gray-12'>{uploadedFile ? `${(uploadedFile.size / 1024).toFixed(1)} KB` : '32.4 KB'}</span>
                    </div>
                    <div className='flex justify-between border-b border-border-default/45 pb-1.5'>
                      <span className='text-gray-8'>Format</span>
                      <span className='font-bold text-gray-12'>{uploadedFile?.name.split('.').pop()?.toUpperCase() || 'XLSX'}</span>
                    </div>
                    <div className='flex justify-between border-b border-border-default/45 pb-1.5'>
                      <span className='text-gray-8'>Rows detected</span>
                      <span className='font-bold text-gray-12'>{rowCount || 48} rows</span>
                    </div>
                    <div className='flex justify-between border-b border-border-default/45 pb-1.5'>
                      <span className='text-gray-8'>Sheets used</span>
                      <span className='font-bold text-gray-12'>1 sheet</span>
                    </div>
                  </div>
                )}
              </div>

              {/* STEP 2: COLUMN & ROW EXTRACTION */}
              <div className='relative flex flex-col gap-2 z-10'>
                <div className='flex items-start gap-4'>
                  <div
                    className={cn(
                      'absolute -left-8 flex size-7 items-center justify-center rounded-full border-4 border-surface-muted transition-all duration-300',
                      step2State === 'done'
                        ? 'bg-green-3 text-green-11 border-green-3'
                        : step2State === 'active'
                          ? 'bg-accent-soft text-primary-9 border-accent-soft'
                          : 'bg-gray-2 text-gray-8 border-gray-2',
                    )}
                  >
                    {step2State === 'done' ? (
                      <Icon className='size-4 font-bold' name='tabler:check' />
                    ) : step2State === 'active' ? (
                      <Icon className='size-4 animate-spin' name='tabler:loader-2' />
                    ) : (
                      <Icon className='size-3.5' name='tabler:clock' />
                    )}
                  </div>
                  <div className='flex-1'>
                    <div className='flex items-center justify-between'>
                      <h3 className='text-[13px] font-bold text-gray-12'>Column & Row Extraction</h3>
                      {step2State === 'done' && (
                        <span className='bg-green-3 text-green-11 px-2 py-0.5 text-[11px] font-medium rounded-full'>
                          Completed in 0.9s
                        </span>
                      )}
                      {step2State === 'active' && (
                        <span className='bg-accent-soft text-primary-9 px-2 py-0.5 text-[11px] font-medium rounded-full animate-pulse'>
                          In progress
                        </span>
                      )}
                    </div>
                    <p className='text-[11px] font-medium text-gray-8 mt-0.5'>
                      Extracting grid fields and filtering metadata records.
                    </p>
                  </div>
                </div>

                {/* Step 2 Detail Card */}
                {(step2State === 'active' || step2State === 'done') && (
                  <div className='bg-surface-primary border border-border-default rounded-xl p-4 ml-3 shadow-2xs grid grid-cols-2 gap-x-6 gap-y-2 text-[12px] animate-in fade-in slide-in-from-top-2 duration-300'>
                    <div className='flex justify-between border-b border-border-default/45 pb-1.5'>
                      <span className='text-gray-8'>Columns found</span>
                      <span className='font-bold text-gray-12'>{uploadedColumns.length || 8} columns</span>
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
                      <span className='font-bold text-gray-12'>{rowCount ? rowCount - 1 : 47} rows</span>
                    </div>
                  </div>
                )}
              </div>

              {/* STEP 3: SCHEMA AUTO-MAPPING */}
              <div className='relative flex flex-col gap-2 z-10'>
                <div className='flex items-start gap-4'>
                  <div
                    className={cn(
                      'absolute -left-8 flex size-7 items-center justify-center rounded-full border-4 border-surface-muted transition-all duration-300',
                      step3State === 'done'
                        ? 'bg-green-3 text-green-11 border-green-3'
                        : step3State === 'active'
                          ? 'bg-accent-soft text-primary-9 border-accent-soft'
                          : 'bg-gray-2 text-gray-8 border-gray-2',
                    )}
                  >
                    {step3State === 'done' ? (
                      <Icon className='size-4 font-bold' name='tabler:check' />
                    ) : step3State === 'active' ? (
                      <Icon className='size-4 animate-spin' name='tabler:loader-2' />
                    ) : (
                      <Icon className='size-3.5' name='tabler:clock' />
                    )}
                  </div>
                  <div className='flex-1'>
                    <div className='flex items-center justify-between'>
                      <h3 className='text-[13px] font-bold text-gray-12'>Schema Auto-Mapping</h3>
                      {step3State === 'done' && (
                        <span className='bg-green-3 text-green-11 px-2 py-0.5 text-[11px] font-medium rounded-full'>
                          Completed
                        </span>
                      )}
                      {step3State === 'active' && (
                        <span className='bg-accent-soft text-primary-9 px-2 py-0.5 text-[11px] font-medium rounded-full animate-pulse'>
                          In progress
                        </span>
                      )}
                    </div>
                    <p className='text-[11px] font-medium text-gray-8 mt-0.5'>
                      Aligning CSV/XLSX headers with database mapping schema.
                    </p>
                  </div>
                </div>

                {/* Step 3 Detail Card */}
                {(step3State === 'active' || step3State === 'done') && (
                  <div className='bg-surface-primary border border-border-default rounded-xl p-4 ml-3 shadow-2xs grid grid-cols-2 gap-x-6 gap-y-2 text-[12px] animate-in fade-in slide-in-from-top-2 duration-300'>
                    <div className='flex justify-between border-b border-border-default/45 pb-1.5'>
                      <span className='text-gray-8'>Fields matched</span>
                      <span className='font-bold text-gray-12'>{step3State === 'done' ? '6 / 6 fields' : '2 / 6 fields'}</span>
                    </div>
                    <div className='flex justify-between border-b border-border-default/45 pb-1.5'>
                      <span className='text-gray-8'>Confidence level</span>
                      <span className='font-bold text-gray-12'>91% average</span>
                    </div>
                    <div className='flex justify-between border-b border-border-default/45 pb-1.5'>
                      <span className='text-gray-8'>Fields needing review</span>
                      <span className='font-bold text-gray-12'>{step3State === 'done' ? '0 fields' : '4 fields'}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* STEP 4: INGESTION & CONFIRMATION */}
              <div className='relative flex flex-col gap-2 z-10'>
                <div className='flex items-start gap-4'>
                  <div
                    className={cn(
                      'absolute -left-8 flex size-7 items-center justify-center rounded-full border-4 border-surface-muted transition-all duration-300',
                      step4State === 'done'
                        ? 'bg-green-3 text-green-11 border-green-3'
                        : step4State === 'active'
                          ? 'bg-accent-soft text-primary-9 border-accent-soft'
                          : 'bg-gray-2 text-gray-8 border-gray-2',
                    )}
                  >
                    {step4State === 'done' ? (
                      <Icon className='size-4 font-bold' name='tabler:check' />
                    ) : step4State === 'active' ? (
                      <Icon className='size-4 animate-spin' name='tabler:loader-2' />
                    ) : (
                      <Icon className='size-3.5' name='tabler:clock' />
                    )}
                  </div>
                  <div className='flex-1'>
                    <h3 className='text-[13px] font-bold text-gray-12'>Ingestion & Confirmation</h3>
                    <p className='text-[11px] font-semibold text-gray-8 mt-0.5'>
                      {step4State === 'active'
                        ? 'Finalizing record ingestion...'
                        : step4State === 'done'
                          ? 'Ingestion fully completed.'
                          : 'Waiting for field verification'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      )}

      {/* SCREEN 3: VERIFY FIELDS SCREEN */}
      {uploadState === 'ready' && (
        <div className='flex flex-col h-full w-full overflow-hidden'>
          {/* Header */}
          <div className='flex h-13 items-center gap-2 border-b border-border-default px-4 bg-gradient-to-b from-gray-1 to-gray-2 shrink-0'>
            <button
              onClick={() => setUploadState('processing')}
              className='p-1.5 hover:bg-surface-hover rounded-md transition-colors text-gray-9 hover:text-gray-12 cursor-pointer'
            >
              <Icon className='size-4' name='tabler:arrow-left' />
            </button>
            <div className='flex items-center gap-2'>
              <div className='flex size-7 items-center justify-center rounded-lg bg-accent-soft text-primary-9'>
                <Icon className='size-4 text-primary-9' name='tabler:list-check' />
              </div>
              <h1 className='text-[16px] font-medium text-gray-12'>Verify Fields</h1>
            </div>
          </div>

          {/* Body Content */}
          <main className='custom-scrollbar flex-1 overflow-y-auto p-6 flex flex-col justify-start items-center min-h-0'>
            <div className='max-w-xl w-full space-y-5 py-4 animate-in fade-in duration-300'>

              {/* Progress Indicator */}
              <div className='space-y-2 bg-surface-primary border border-border-default p-4 rounded-xl shadow-2xs'>
                <div className='flex items-center justify-between text-[12px]'>
                  <span className='text-gray-8 font-medium'>Map your file columns to PO fields</span>
                  <span className='font-bold text-primary-9 bg-accent-soft px-2 py-0.5 rounded-full'>
                    {mappedCount}/6 mapped
                  </span>
                </div>
                <div className='w-full bg-gray-2 rounded-full h-1 overflow-hidden'>
                  <div
                    className='bg-primary-9 h-full transition-all duration-300 ease-out'
                    style={{ width: `${(mappedCount / 6) * 100}%` }}
                  />
                </div>
              </div>

              {/* REQUIRED FIELDS SECTION */}
              <div className='space-y-3.5'>
                <div className='text-[11px] font-bold text-gray-8 uppercase tracking-wider pl-1'>
                  Required Fields
                </div>

                {requiredFields.map((fieldKey) => {
                  const selectedCol = mapping[fieldKey]
                  const isMapped = !!selectedCol
                  const isConflict = fieldKey === 'Vendor Address' && !selectedCol
                  const isOpen = openFieldDropdown === fieldKey

                  return (
                    <div
                      key={fieldKey}
                      className={cn(
                        'border transition-all duration-300 rounded-xl p-4 flex flex-col gap-2.5',
                        isMapped
                          ? 'border-green-11/30 bg-green-3/25'
                          : isConflict
                            ? 'border-red-11/30 bg-red-3/25'
                            : 'border-border-default bg-surface-primary'
                      )}
                    >
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-1.5'>
                          {isMapped && <Icon className='size-4 text-green-11' name='tabler:circle-check' />}
                          {isConflict && <Icon className='size-4 text-red-11' name='tabler:alert-triangle' />}
                          <span className={cn(
                            'text-[13px] font-semibold',
                            isMapped ? 'text-green-11' : isConflict ? 'text-red-11' : 'text-gray-12'
                          )}>
                            {fieldKey}
                          </span>
                        </div>
                        <span className={cn(
                          'text-[10px] font-bold px-1.5 py-0.5 rounded uppercase',
                          isMapped ? 'bg-green-3 text-green-11' : isConflict ? 'bg-red-3 text-red-11' : 'bg-gray-2 text-gray-8'
                        )}>
                          Required
                        </span>
                      </div>

                      {/* Dropdown Selector Button */}
                      <div className='relative'>
                        <button
                          onClick={() => setOpenFieldDropdown(isOpen ? null : fieldKey)}
                          className={cn(
                            'w-full flex items-center justify-between px-3 py-2 rounded-lg border text-[12px] font-medium transition-all bg-surface-primary cursor-pointer',
                            isMapped
                              ? 'border-green-11/30 text-green-11 font-medium'
                              : isConflict
                                ? 'border-red-11/30 text-red-11 font-medium'
                                : 'border-border-default text-gray-8'
                          )}
                        >
                          <span>{selectedCol || 'Select matching column...'}</span>
                          <Icon
                            className={cn('size-4 transition-transform duration-200', isMapped ? 'text-green-11' : isConflict ? 'text-red-11' : 'text-gray-9')}
                            name={isOpen ? 'tabler:chevron-up' : 'tabler:chevron-down'}
                          />
                        </button>

                        {/* Inline selector options (Reflowing Page Layout) */}
                        {isOpen && (
                          <div className='bg-surface-primary border border-border-default rounded-lg p-2 mt-1.5 space-y-1 shadow-sm animate-in slide-in-from-top-2 duration-200 z-10 relative'>
                            <div className='text-[10px] font-semibold text-gray-8 px-2 py-1 border-b border-border-default/40'>
                              Select File Column
                            </div>
                            <div className='max-h-36 overflow-y-auto custom-scrollbar'>
                              {availableColumnsList.map((col) => (
                                <button
                                  key={col}
                                  onClick={() => {
                                    setMapping(prev => ({ ...prev, [fieldKey]: col }))
                                    setOpenFieldDropdown(null)
                                  }}
                                  className={cn(
                                    'w-full text-left text-[12px] px-2 py-1.5 rounded hover:bg-accent-soft hover:text-primary-9 transition-colors duration-150 flex items-center justify-between cursor-pointer',
                                    selectedCol === col ? 'bg-accent-soft text-primary-9 font-bold' : 'text-gray-12'
                                  )}
                                >
                                  <span>{col}</span>
                                  {selectedCol === col && <Icon className='size-3.5 text-primary-9 font-bold' name='tabler:check' />}
                                </button>
                              ))}
                            </div>
                            {selectedCol && (
                              <button
                                onClick={() => {
                                  setMapping(prev => {
                                    const next = { ...prev }
                                    delete next[fieldKey]
                                    return next
                                  })
                                  setOpenFieldDropdown(null)
                                }}
                                className='w-full text-center text-[11px] font-bold text-red-11 hover:bg-red-3/50 py-1.5 rounded transition-colors duration-150 mt-1 border-t border-border-default/45 cursor-pointer'
                              >
                                Clear mapping
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Score Indicator or Conflict Message */}
                      {isMapped && (fieldKey === 'PO Number' || fieldKey === 'Vendor Name') && (
                        <div className='flex items-center justify-between text-[11px] mt-1 pl-1'>
                          <div className='flex-1 bg-gray-2 rounded-full h-1 overflow-hidden mr-3 max-w-[80px]'>
                            <div
                              className='bg-green-11 h-full'
                              style={{ width: fieldKey === 'PO Number' ? '94%' : '87%' }}
                            />
                          </div>
                          <span className='font-bold text-green-11 text-[11px]'>
                            {fieldKey === 'PO Number' ? '94% match' : '87% match'}
                          </span>
                        </div>
                      )}

                      {isConflict && (
                        <div className='flex items-center gap-1.5 text-red-11 text-[11px] font-bold mt-1 pl-1 animate-pulse'>
                          <Icon className='size-3.5 shrink-0 text-red-11' name='tabler:alert-triangle' />
                          <span>2 possible matches — select the correct one</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* OPTIONAL FIELDS SECTION */}
              <div className='space-y-3.5 pt-2'>
                <div className='text-[11px] font-bold text-gray-8 uppercase tracking-wider pl-1'>
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
                        'border transition-all duration-300 rounded-xl p-4 flex flex-col gap-2.5 bg-surface-primary',
                        isMapped ? 'border-green-11/30' : 'border-border-default'
                      )}
                    >
                      <div className='flex items-center justify-between'>
                        <span className='text-[13px] font-semibold text-gray-12'>
                          {fieldKey}
                        </span>
                        <span className='text-[10px] font-bold px-1.5 py-0.5 rounded bg-accent-soft text-primary-9 uppercase'>
                          Optional
                        </span>
                      </div>

                      {/* Dropdown Selector Button */}
                      <div className='relative'>
                        <button
                          onClick={() => setOpenFieldDropdown(isOpen ? null : fieldKey)}
                          className={cn(
                            'w-full flex items-center justify-between px-3 py-2 rounded-lg border text-[12px] font-medium transition-all bg-surface-primary cursor-pointer',
                            isMapped ? 'border-green-11/30 text-green-11' : 'border-border-default text-gray-8'
                          )}
                        >
                          <span>{selectedCol || 'Select matching column...'}</span>
                          <Icon
                            className='size-4 text-gray-9'
                            name={isOpen ? 'tabler:chevron-up' : 'tabler:chevron-down'}
                          />
                        </button>

                        {/* Inline Options (Reflowing) */}
                        {isOpen && (
                          <div className='bg-surface-primary border border-border-default rounded-lg p-2 mt-1.5 space-y-1 shadow-sm animate-in slide-in-from-top-2 duration-200 z-10 relative'>
                            <div className='text-[10px] font-semibold text-gray-8 px-2 py-1 border-b border-border-default/40'>
                              Select File Column
                            </div>
                            <div className='max-h-36 overflow-y-auto custom-scrollbar'>
                              {availableColumnsList.map((col) => (
                                <button
                                  key={col}
                                  onClick={() => {
                                    setMapping(prev => ({ ...prev, [fieldKey]: col }))
                                    setOpenFieldDropdown(null)
                                  }}
                                  className={cn(
                                    'w-full text-left text-[12px] px-2 py-1.5 rounded hover:bg-accent-soft hover:text-primary-9 transition-colors duration-150 flex items-center justify-between cursor-pointer',
                                    selectedCol === col ? 'bg-accent-soft text-primary-9 font-bold' : 'text-gray-12'
                                  )}
                                >
                                  <span>{col}</span>
                                  {selectedCol === col && <Icon className='size-3.5 text-primary-9 font-bold' name='tabler:check' />}
                                </button>
                              ))}
                            </div>
                            {selectedCol && (
                              <button
                                onClick={() => {
                                  setMapping(prev => {
                                    const next = { ...prev }
                                    delete next[fieldKey]
                                    return next
                                  })
                                  setOpenFieldDropdown(null)
                                }}
                                className='w-full text-center text-[11px] font-bold text-red-11 hover:bg-red-3/50 py-1.5 rounded transition-colors duration-150 mt-1 border-t border-border-default/45 cursor-pointer'
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
              <div className='pt-4 border-t border-border-default mt-6'>
                <button
                  disabled={mappedCount < 6 || isSubmitting}
                  onClick={handleManualConfirm}
                  className={cn(
                    'w-full py-3 rounded-xl text-[14px] font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs',
                    mappedCount === 6 && !isSubmitting
                      ? 'bg-primary-9 text-white hover:bg-primary-10 hover:shadow-xs active:scale-[0.99]'
                      : 'bg-gray-2 text-gray-8 cursor-not-allowed opacity-40'
                  )}
                >
                  {isSubmitting ? (
                    <span className='size-4 animate-spin rounded-full border-2 border-white border-t-transparent' />
                  ) : (
                    <Icon className='size-4' name='tabler:checks' />
                  )}
                  <span>{isSubmitting ? 'Ingesting records...' : 'Confirm mapping & ingest'}</span>
                </button>
              </div>

            </div>
          </main>
        </div>
      )}

      {/* COMPLETED SUCCESS SCREEN */}
      {uploadState === 'completed' && (
        <div className='flex flex-col h-full w-full overflow-hidden'>
          {/* Header */}
          <div className='flex h-13 items-center gap-2 border-b border-border-default px-4 bg-gradient-to-b from-gray-1 to-gray-2 shrink-0'>
            <div className='flex items-center gap-2 pl-6'>
              <div className='flex size-7 items-center justify-center rounded-lg bg-green-3 text-green-11'>
                <Icon className='size-4' name='tabler:circle-check' />
              </div>
              <h1 className='text-[16px] font-medium text-gray-12'>Ingestion Complete</h1>
            </div>
          </div>

          <main className='custom-scrollbar flex-1 overflow-y-auto p-6 flex flex-col items-center min-h-0'>
            <AnimateFadeIn className='flex flex-col items-center text-center max-w-md mx-auto w-full p-4 gap-6 my-auto'>
              <div className='flex size-20 items-center justify-center rounded-full bg-green-3 text-green-11 border border-green-11/30 relative shadow-md'>
                <div className='absolute inset-0 size-full rounded-full border-4 border-green-11 animate-ping opacity-10' />
                <Icon className='size-10 font-bold' name='tabler:circle-check' />
              </div>

              <div className='space-y-2'>
                <h2 className='text-lg font-bold text-gray-12'>
                  PO Ingestion Successful!
                </h2>
                <p className='text-[12px] text-gray-8 max-w-xs leading-relaxed'>
                  Your PO file headers were successfully mapped, translated, and all purchase orders saved to the master ingestion pipeline.
                </p>
              </div>

              {uploadedFile && (
                <div className='w-full rounded-xl border border-border-default bg-surface-primary p-4 text-left space-y-2.5 shadow-2xs animate-in fade-in duration-500'>
                  <div className='text-[10px] font-extrabold tracking-wider text-gray-8 uppercase border-b border-border-default/40 pb-2'>
                    Ingestion Summary
                  </div>
                  <div className='flex justify-between text-[12px]'>
                    <span className='text-gray-8 font-medium'>Source File:</span>
                    <span className='font-bold text-gray-12 truncate max-w-[200px]'>{uploadedFile.name}</span>
                  </div>
                  <div className='flex justify-between text-[12px]'>
                    <span className='text-gray-8 font-medium'>Total Records:</span>
                    <span className='font-bold text-gray-12'>{rowCount || 48} rows</span>
                  </div>
                  <div className='flex justify-between text-[12px]'>
                    <span className='text-gray-8 font-medium'>Columns Ingested:</span>
                    <span className='font-bold text-gray-12'>{systemColumns.length} fields</span>
                  </div>
                </div>
              )}

              <Button
                color='primary'
                size='lg'
                variant='solid'
                label='Done'
                className='w-full cursor-pointer bg-primary-9 hover:bg-primary-10 hover:scale-[1.01] active:scale-[0.99] transition-all rounded-xl py-3 text-[14px] font-bold text-white shadow-md'
                onClick={() => {
                  closeNewRequest()
                  onClose()
                }}
              />
            </AnimateFadeIn>
          </main>
        </div>
      )}

      {/* COMPLETED ERROR SCREEN */}
      {uploadState === 'error' && (
        <div className='flex flex-col h-full w-full overflow-hidden'>
          {/* Header */}
          <div className='flex h-13 items-center gap-2 border-b border-border-default px-4 bg-gradient-to-b from-gray-1 to-gray-2 shrink-0'>
            <button
              onClick={() => setUploadState('ready')}
              className='p-1.5 hover:bg-surface-hover rounded-md transition-colors text-gray-9 hover:text-gray-12 cursor-pointer'
            >
              <Icon className='size-4' name='tabler:arrow-left' />
            </button>
            <div className='flex items-center gap-2'>
              <div className='flex size-7 items-center justify-center rounded-lg bg-red-3 text-red-11'>
                <Icon className='size-4 text-red-11' name='tabler:alert-triangle' />
              </div>
              <h1 className='text-[16px] font-medium text-gray-12'>Ingestion Error</h1>
            </div>
          </div>

          <main className='custom-scrollbar flex-1 overflow-y-auto p-6 flex flex-col items-center min-h-0'>
            <AnimateFadeIn className='flex flex-col items-center text-center max-w-md mx-auto w-full p-4 gap-6 animate-in fade-in duration-300 my-auto'>
              <div className='flex size-20 items-center justify-center rounded-full bg-red-3 text-red-11 border border-red-11/30 relative shadow-md'>
                <Icon className='size-10 font-bold' name='tabler:alert-triangle' />
              </div>

              <div className='space-y-2'>
                <h2 className='text-lg font-bold text-gray-12'>
                  Ingestion Failed
                </h2>
                <p className='text-[12px] text-gray-8 max-w-xs leading-relaxed'>
                  The server encountered an error while importing the purchase orders. Please try again.
                </p>
              </div>

              <div className='w-full flex flex-col gap-2.5 mt-2'>
                <button
                  onClick={handleManualConfirm}
                  className='w-full cursor-pointer bg-primary-9 hover:bg-primary-10 hover:scale-[1.01] active:scale-[0.99] transition-all rounded-xl py-3 text-[14px] font-bold text-white shadow-md flex items-center justify-center gap-2'
                >
                  <Icon className='size-4' name='tabler:refresh' />
                  <span>Retry Ingestion</span>
                </button>

                <button
                  onClick={() => setUploadState('ready')}
                  className='w-full cursor-pointer bg-surface-primary hover:bg-surface-hover border border-border-default transition-all rounded-xl py-3 text-[14px] font-semibold text-gray-11'
                >
                  <span>Review Column Mapping</span>
                </button>
              </div>
            </AnimateFadeIn>
          </main>
        </div>
      )}
    </div>
  )
}
