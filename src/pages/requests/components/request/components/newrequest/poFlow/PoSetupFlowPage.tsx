import { useMemo, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import formApi from '@/api/form/form'
import Button from '@/components/base/button/Button'
import Icon from '@/components/base/icon/Icon'
import showToast from '@/components/base/toast/showToast'
import { AnimateFadeIn, AnimateSlideUp } from '@/components/common/animations'
import ColumnMapping from '@/components/common/ColumnMapping'
import requestStore from '@/pages/requests/stores/useRequestStore'
import authUserStore from '@/stores/authUserStore'
import cn from '@/utils/cn'
import { downloadTemplate, PO_ACCEPT } from '../utils'
import { findBestHeaderMatch } from './utils/headerSimilarity'
import { SYSTEM_TEMPLATE_COLUMNS } from './utils/templateSchema'
import { LINE_ITEM_TEMPLATE_COLUMNS } from './utils/lineItemSchema'
import {
  mergeLineItemSheets,
  detectGroupingColumn,
  groupLineItems,
  getPreviewGroup,
  transformMappedRows,
} from './utils/lineItemHelpers'

export type UploadState =
  | 'idle'
  | 'parsing'
  | 'processing'
  | 'ready'
  | 'lineItemMapping'
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

  const apAgentBlock = rawWorkflowData?.workflowJson?.blocks?.find(
    (b: any) => b.type === 'AP_AGENT',
  )
  const masterFormId = apAgentBlock?.settings?.apAgent?.formId ?? wFormId

  console.log('Workflow JSON:', rawWorkflowData?.workflowJson)

  // Upload & Pipeline State
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)

  // File details (Header)
  const [uploadedColumns, setUploadedColumns] = useState<string[]>([])
  const [rowCount, setRowCount] = useState<number | null>(null)
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [previewRows, setPreviewRows] = useState<any[]>([])

  // Line item details
  const [lineItemHeaders, setLineItemHeaders] = useState<string[]>([])
  const [lineItemRows, setLineItemRows] = useState<any[]>([])
  const [lineItemMapping, setLineItemMapping] = useState<Record<string, string>>({})
  const [groupingColumn, setGroupingColumn] = useState<string | null>(null)
  const [previewGroupId, setPreviewGroupId] = useState<string | null>(null)
  const [groupedData, setGroupedData] = useState<Record<string, any[]>>({})

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

  // CSV Normalization helper
  const normalizeHeader = (h: unknown) => {
    return String(h ?? '')
      .trim()
      .replace(/\s+/g, ' ')
  }

  // Parse CSV payload (CSV can only have 1 sheet, so we reject it per business rules)
  const parseCsv = async (): Promise<any> => {
    throw new Error('This workbook contains only one worksheet. PO Import requires both Header and Line Item data. Please upload an Excel file containing at least two worksheets.')
  }


  // Extract Columns and Row Count from uploaded File
  const extractHeadersAndData = async (
    file: File,
  ): Promise<{ 
    headers: string[]; 
    previewRows: any[]; 
    rowCount: number;
    lineItemHeaders: string[];
    lineItemRows: any[];
  }> => {
    const name = file.name.toLowerCase()
    if (name.endsWith('.csv')) return parseCsv()
    if (name.endsWith('.xlsx')) {
      const buf = await file.arrayBuffer()
      const u8 = new Uint8Array(buf)
      const looksLikeZip = u8.length >= 2 && u8[0] === 0x50 && u8[1] === 0x4b
      if (!looksLikeZip) {
        return parseCsv()
      }
      try {
        const wb = XLSX.read(u8, { type: 'array' })
        if (wb.SheetNames.length < 2) {
          throw new Error('This workbook contains only one worksheet. PO Import requires both Header and Line Item data. Please upload an Excel file containing at least two worksheets.')
        }

        // Sheet 1: Header
        const firstSheetName = wb.SheetNames[0]
        const headerWs = wb.Sheets[firstSheetName]
        const headerRawRows = XLSX.utils.sheet_to_json(headerWs, {
          blankrows: false,
          header: 1,
        }) as unknown[][]
        const headerRow = headerRawRows?.[0] ?? []
        const headers = headerRow.map(normalizeHeader).filter(Boolean)

        const allHeaderRows = XLSX.utils.sheet_to_json(headerWs) as any[]
        const previewRows = allHeaderRows.slice(0, 15)
        const rowCount = allHeaderRows.length

        // Sheets 2..N: Line Items
        const lineItemSheetsData: { headers: string[], rows: any[] }[] = []
        for (let i = 1; i < wb.SheetNames.length; i++) {
          const liWs = wb.Sheets[wb.SheetNames[i]]
          const liRawRows = XLSX.utils.sheet_to_json(liWs, {
            blankrows: false,
            header: 1,
          }) as unknown[][]
          const liHeaderRow = liRawRows?.[0] ?? []
          const liHeaders = liHeaderRow.map(normalizeHeader).filter(Boolean)
          const liRows = XLSX.utils.sheet_to_json(liWs) as any[]
          lineItemSheetsData.push({ headers: liHeaders, rows: liRows })
        }

        const mergedLineItems = mergeLineItemSheets(lineItemSheetsData)

        return { 
          headers, 
          previewRows, 
          rowCount, 
          lineItemHeaders: mergedLineItems.headers,
          lineItemRows: mergedLineItems.rows
        }
      } catch {
        return parseCsv()
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
      const result: any = await extractHeadersAndData(file)
      setPreviewRows(result.previewRows || [])
      setLineItemHeaders(result.lineItemHeaders || [])
      setLineItemRows(result.lineItemRows || [])

      // Initial Grouping setup
      const detectedGroupCol = detectGroupingColumn(result.lineItemHeaders) || result.lineItemHeaders[0]
      setGroupingColumn(detectedGroupCol)
      const initialGroupedData = groupLineItems(result.lineItemRows, detectedGroupCol)
      setGroupedData(initialGroupedData)
      setPreviewGroupId(Object.keys(initialGroupedData)[0] || null)

      // Simulate upload/parse progress bar smoothly
      let currentProgress = 0
      const timer = setInterval(() => {
        currentProgress += 10
        if (currentProgress >= 100) {
          clearInterval(timer)
          setUploadProgress(100)

          setTimeout(() => {
            setUploadState('processing')
            runTimelineSimulation(result.headers, result.rowCount)
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
  const runTimelineSimulation = (headers: string[], rowsCount: number) => {
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
                const match = findBestHeaderMatch(col.key, headers)
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

  const downloadFile = (file: File) => {
    const url = URL.createObjectURL(file)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Inverted header translator to replace source file headers with master system columns, generating a 2-sheet workbook
  const updateFileHeaders = async (
    file: File,
    headerMapping: Record<string, string>,
    liMapping: Record<string, string>,
  ) => {
    const fileName = file.name

    return new Promise<File>(async (resolve, reject) => {
      try {
        const buf = await file.arrayBuffer()
        const wb = XLSX.read(buf, { type: 'array' })

        // 1. Process Header Sheet (Sheet 1)
        const invertedHeaderMapping: Record<string, string> = {}
        Object.entries(headerMapping).forEach(([sysKey, xlVal]) => {
          if (xlVal && xlVal !== 'Skip to Import') {
            invertedHeaderMapping[xlVal.trim()] = sysKey
          }
        })
        const translateHeader = (header: string) => invertedHeaderMapping[header.trim()] || header.trim()
        
        const firstSheetName = wb.SheetNames[0]
        const headerSheet = wb.Sheets[firstSheetName]
        const headerRows: any = XLSX.utils.sheet_to_json(headerSheet, { header: 1 })
        if (headerRows.length > 0) {
          headerRows[0] = headerRows[0].map(translateHeader)
        }
        const updatedHeaderSheet = XLSX.utils.aoa_to_sheet(headerRows)

        // 2. Process Line Items (Merge into new Sheet 2)
        // transformMappedRows outputs an array of objects where keys are ONLY the mapped system keys.
        const transformedLineItems = transformMappedRows(lineItemRows, liMapping)
        
        // We need to write this back as an AOA to properly form a sheet, ensuring columns are system fields.
        // We'll collect all used system fields.
        const liSystemFields = Object.keys(liMapping).filter(k => liMapping[k] && liMapping[k] !== 'Skip to Import')
        
        const liAoa: any[][] = [liSystemFields]
        transformedLineItems.forEach(row => {
          const rowArr = liSystemFields.map(field => row[field] ?? '')
          liAoa.push(rowArr)
        })
        
        const updatedLiSheet = XLSX.utils.aoa_to_sheet(liAoa)

        // 3. Construct new Workbook with exactly two sheets
        const newWb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(newWb, updatedHeaderSheet, 'PO Header')
        XLSX.utils.book_append_sheet(newWb, updatedLiSheet, 'PO Line Items')

        const updatedBlob = XLSX.write(newWb, {
          bookType: 'xlsx',
          type: 'array',
        })
        const updatedFile = new File([updatedBlob], fileName, {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })
        resolve(updatedFile)
      } catch (error) {
        reject(error)
      }
    })
  }


  // Upload API submission
  const sendUpdatedFile = async (file: File) => {
    const payload = {
      file: file,
      formId: masterFormId ? String(masterFormId) : '',
      instanceId: '',
      workflowId: workflowId ? String(workflowId) : '',
    }

    try {
      const { data, error } = await formApi.uploadMasterFile(payload)
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
      const updatedFile = await updateFileHeaders(uploadedFile, mapping, lineItemMapping)
      // Simulate final saving in Step 4 for 1200ms
      await new Promise((resolve) => setTimeout(resolve, 1200))
      
      // Trigger download so the user can inspect it
      downloadFile(updatedFile)
      
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
      {(uploadState === 'processing' || uploadState === 'ready' || uploadState === 'lineItemMapping') && (
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
            <AnimateSlideUp
              className={cn(
                'relative my-auto w-full max-w-3xl space-y-6 py-4 pl-8 transition-all duration-300',
              )}
            >
              {/* STEP 1: FILE INGESTION & PARSING */}
              <div className='relative z-10 flex flex-col gap-3.5 pl-10'>
                {/* Line segment from Step 1 to Step 2 */}
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
                        ? 'border border-green-9 bg-green-9 text-white'
                        : step1State === 'active'
                          ? 'border-2 border-primary-9 bg-white text-primary-9'
                          : 'border-2 border-gray-3 bg-white text-gray-4',
                    )}
                  >
                    {step1State === 'done' ? (
                      <Icon
                        className='size-4 stroke-[3px]'
                        name='tabler:check'
                      />
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
                    <p className='mt-1.5 text-[11px] font-medium text-gray-8'>
                      Ingesting raw file payload and validating structure.
                    </p>
                  </div>
                </div>

                {/* Step 1 Detail Card */}
                {(step1State === 'active' || step1State === 'done') && (
                  <div className='animate-in fade-in slide-in-from-top-2 grid grid-cols-2 gap-x-6 gap-y-2 rounded-xl border border-border-default bg-surface-primary p-4 text-[12px] shadow-2xs duration-300'>
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
              <div className='relative z-10 flex flex-col gap-3.5 pl-10'>
                {/* Line segment from Step 2 to Step 3 */}
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
                        ? 'border border-green-9 bg-green-9 text-white'
                        : step2State === 'active'
                          ? 'border-2 border-primary-9 bg-white text-primary-9'
                          : 'border-2 border-gray-3 bg-white text-gray-4',
                    )}
                  >
                    {step2State === 'done' ? (
                      <Icon
                        className='size-4 stroke-[3px]'
                        name='tabler:check'
                      />
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
                    <p className='mt-1.5 text-[11px] font-medium text-gray-8'>
                      Extracting grid fields and filtering metadata records.
                    </p>
                  </div>
                </div>

                {/* Step 2 Detail Card */}
                {(step2State === 'active' || step2State === 'done') && (
                  <div className='animate-in fade-in slide-in-from-top-2 grid grid-cols-2 gap-x-6 gap-y-2 rounded-xl border border-border-default bg-surface-primary p-4 text-[12px] shadow-2xs duration-300'>
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
              <div className='relative z-10 flex flex-col gap-3.5 pl-10'>
                {/* Line segment from Step 3 to Step 4 */}
                <div className='absolute top-8 -bottom-[18px] left-[13px] z-0 w-[1.5px] bg-border-default' />
                <div
                  className={cn(
                    'absolute top-8 -bottom-[18px] left-[13px] z-0 w-[1.5px] origin-top bg-green-11 transition-transform duration-700 ease-in-out',
                    step3State === 'done' ? 'scale-y-100' : 'scale-y-0',
                  )}
                />
                <div className='flex items-start gap-4'>
                  <div
                    className={cn(
                      'absolute top-0.5 left-0 z-10 flex size-7 items-center justify-center rounded-full shadow-xs transition-all duration-300',
                      step3State === 'done'
                        ? 'border border-green-9 bg-green-9 text-white'
                        : step3State === 'active'
                          ? 'border-2 border-primary-9 bg-white text-primary-9'
                          : 'border-2 border-gray-3 bg-white text-gray-4',
                    )}
                  >
                    {step3State === 'done' ? (
                      <Icon
                        className='size-4 stroke-[3px]'
                        name='tabler:check'
                      />
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
                    <p className='mt-1.5 text-[11px] font-medium text-gray-8'>
                      Aligning CSV/XLSX headers with database mapping schema.
                    </p>
                  </div>
                </div>

                {/* Step 3 Detail Card */}
                {(step3State === 'active' || step3State === 'done') && (
                  <div className='animate-in fade-in slide-in-from-top-2 grid grid-cols-2 gap-x-6 gap-y-2 rounded-xl border border-border-default bg-surface-primary p-4 text-[12px] shadow-2xs duration-300'>
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
                  <ColumnMapping
                    key="header-mapping"
                    confirmButtonText='Confirm Column Mapping'
                    isConfirmLoading={false}
                    mapping={mapping}
                    previewRows={previewRows}
                    showActionsRow={true}
                    uploadedColumns={uploadedColumns}
                    onCancel={() => {
                      setUploadState('idle')
                      setUploadedFile(null)
                      setMapping({})
                      setPreviewRows([])
                    }}
                    onChangeMapping={setMapping}
                    onConfirm={() => {
                      setUploadState('lineItemMapping')
                    }}
                  />
                )}

                {uploadState === 'lineItemMapping' && (
                  <ColumnMapping
                    key="line-item-mapping"
                    title='Confirm Line Item Mapping'
                    confirmButtonText='Confirm Line Item Mapping'
                    isConfirmLoading={isSubmitting}
                    mapping={lineItemMapping}
                    previewRows={lineItemRows}
                    showActionsRow={true}
                    uploadedColumns={lineItemHeaders}
                    templateSchema={LINE_ITEM_TEMPLATE_COLUMNS}
                    showGrouping={true}
                    groupingColumn={groupingColumn}
                    onGroupingColumnChange={(col) => {
                      setGroupingColumn(col)
                      if (col) {
                        const newGroupedData = groupLineItems(lineItemRows, col)
                        setGroupedData(newGroupedData)
                        setPreviewGroupId(Object.keys(newGroupedData)[0] || null)
                      }
                    }}
                    availableGroupIds={Object.keys(groupedData)}
                    previewGroupId={previewGroupId || ''}
                    onPreviewGroupChange={setPreviewGroupId}
                    groupedPreviewRows={getPreviewGroup(groupedData, previewGroupId || '')}
                    totalGroupsCount={Object.keys(groupedData).length}
                    totalRowsCount={lineItemRows.length}
                    onCancel={() => {
                      setUploadState('ready') // Go back to header mapping
                    }}
                    onChangeMapping={setLineItemMapping}
                    onConfirm={handleManualConfirm}
                  />
                )}
              </div>

              {/* STEP 4: INGESTION & CONFIRMATION */}
              <div className='relative z-10 flex flex-col gap-3.5 pl-10'>
                <div className='flex items-start gap-4'>
                  <div
                    className={cn(
                      'absolute top-0.5 left-0 z-10 flex size-7 items-center justify-center rounded-full shadow-xs transition-all duration-300',
                      step4State === 'done'
                        ? 'border border-green-9 bg-green-9 text-white'
                        : step4State === 'active'
                          ? 'border-2 border-primary-9 bg-white text-primary-9'
                          : 'border-2 border-gray-3 bg-white text-gray-4',
                    )}
                  >
                    {step4State === 'done' ? (
                      <Icon
                        className='size-4 stroke-[3px]'
                        name='tabler:check'
                      />
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
                    <p className='mt-1.5 text-[11px] font-semibold text-gray-8'>
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
