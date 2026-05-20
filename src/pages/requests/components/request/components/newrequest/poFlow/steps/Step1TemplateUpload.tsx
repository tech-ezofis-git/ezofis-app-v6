import Papa from 'papaparse'
import { useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import Icon from '@/components/base/icon/Icon'
import showToast from '@/components/base/toast/showToast'
import {
  AnimateEntrancePop,
  AnimateFadeIn,
} from '@/components/common/animations'
import cn from '@/utils/cn'
import type { UploadState } from '../PoSetupFlowPage'
import authUserStore from '../../../../../../../../stores/authUserStore'
import { downloadTemplate, PO_ACCEPT } from '../../utils'

type Props = {
  rowCount: number | null
  uploadedColumns: string[]
  uploadedFile: File | null
  uploadState: UploadState
  onNext: () => void
  setRowCount: (n: number | null) => void
  setUploadedColumns: (c: string[]) => void
  setUploadedFile: (f: File | null) => void
  setUploadState: (s: UploadState) => void
}

export default function Step1TemplateUpload({
  rowCount,
  uploadedColumns,
  uploadedFile,
  uploadState,
  setRowCount,
  setUploadedColumns,
  setUploadedFile,
  setUploadState,
  onNext,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false) // New loading state
  const tenantId = authUserStore.getState()?.session?.tenantId

  const onFileChange = async (file: File | undefined) => {
    if (!file) return

    const lower = file.name.toLowerCase()
    const isAllowed = lower.endsWith('.csv') || lower.endsWith('.xlsx')

    if (!isAllowed) {
      showToast({
        message: 'Please upload only CSV or XLSX files',
        variant: 'error',
      })
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    try {
      setUploadState('parsing')
      setUploadedFile(file)

      const response = await extractHeadersAndData(file)
      console.log('Extracted Data:', response)
      setUploadedColumns(response?.headers)

      setRowCount(response?.rowCount)
      showToast({
        message: `Detected ${response?.headers.length} columns and ${response?.rowCount} records`,
        variant: 'success',
      })
      setUploadState('ready')
      onNext()
    } catch (err) {
      setUploadState('error')
      showToast({
        message: err instanceof Error ? err.message : 'Failed to parse file',
        variant: 'error',
      })
    }
  }

  const handleDownload = async (e: React.MouseEvent) => {
    if (isDownloading) return

    setIsDownloading(true)
    try {
      const fileUrl = downloadTemplate(tenantId as string)
      // Programmatic download to allow for the loading state to be visible
      const link = document.createElement('a')
      link.href = fileUrl
      link.setAttribute('download', 'template.xlsx')
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // Simulating a brief delay so the spinner is visible to the user
      await new Promise((resolve) => setTimeout(resolve, 800))
    } catch (error) {
      showToast({ message: 'Failed to download template', variant: 'error' })
      console.error(e)
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <AnimateFadeIn className='flex flex-col gap-4'>
      {/* Step Header */}
      <div className='flex flex-col justify-between gap-4 md:flex-row md:items-center'>
        <div>
          <h2 className='text-xl font-bold text-gray-13'>
            Upload Purchase Order
          </h2>
          <p className='mt-0.5 text-xs font-medium text-gray-11'>
            Please upload your PO data file (CSV or XLSX) to begin the
            configuration.
          </p>
        </div>
        <button
          className='flex items-center gap-2 rounded-full border border-gray-3 px-4 py-2 text-xs font-bold text-gray-11 shadow-sm transition-colors hover:bg-surface-secondary disabled:cursor-not-allowed disabled:opacity-50'
          disabled={isDownloading}
          onClick={handleDownload}
        >
          {isDownloading ? (
            <span className='bg-warning-6 size-3 animate-spin rounded-full border-2 border-gray-10 border-t-transparent' />
          ) : (
            <Icon className='text-base' name='tabler:download' />
          )}
          {isDownloading ? 'Preparing...' : 'Download Template'}
        </button>
      </div>

      {/* Upload Zone */}
      <div
        className={cn(
          'group relative rounded-3xl border-2 border-dashed bg-surface-secondary/30 p-10 text-center transition-all',
          isDragOver
            ? 'border-primary-9 bg-primary-1/10'
            : 'border-gray-3 hover:border-primary-9/50',
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
      >
        <div className='flex flex-col items-center'>
          <div
            className='mb-4 flex h-16 w-16 cursor-pointer items-center justify-center rounded-2xl bg-primary-9/5 transition-transform group-hover:scale-110'
            onClick={() => fileInputRef.current?.click()}
          >
            <Icon
              className='text-3xl text-primary-9'
              name='tabler:file-upload'
            />
          </div>
          <h3 className='mb-1 text-lg font-semibold text-gray-13'>
            Drop your PO file here, or{' '}
            <button
              className='font-bold text-primary-9 hover:underline'
              onClick={() => fileInputRef.current?.click()}
            >
              browse
            </button>
          </h3>
          <p className='mb-6 text-xs font-medium text-gray-10'>
            Accepted formats: CSV, XLSX
          </p>

          <div className='flex gap-3'>
            <div className='flex items-center gap-2 rounded-xl border border-gray-2 bg-green-6 px-3 py-2 shadow-xs'>
              <Icon
                className='text-black-5 text-lg'
                name='tabler:file-type-csv'
              />
              <span className='text-black-5 text-[10px] font-bold tracking-wider'>
                CSV
              </span>
            </div>
            <div className='flex items-center gap-2 rounded-xl border border-gray-2 bg-secondary-5 px-3 py-2 shadow-xs'>
              <Icon
                className='text-black-5 text-lg'
                name='tabler:file-type-xls'
              />
              <span className='text-black-5 text-[10px] font-bold tracking-wider'>
                XLSX
              </span>
            </div>
          </div>
        </div>

        <input
          accept={PO_ACCEPT}
          className='absolute inset-0 h-full w-full cursor-pointer opacity-0'
          ref={fileInputRef}
          type='file'
          onChange={(e) => onFileChange(e.target.files?.[0])}
        />

        {/* Parsing Overlay */}
        {uploadState === 'parsing' && (
          <AnimateFadeIn className='absolute inset-0 z-10 flex items-center justify-center rounded-3xl bg-surface-primary/80 backdrop-blur-sm'>
            <div className='flex flex-col items-center gap-2'>
              <span className='size-8 animate-spin rounded-full border-4 border-primary-9 border-t-transparent' />
              <span className='animate-pulse text-xs font-bold text-primary-11'>
                Analyzing Columns...
              </span>
            </div>
          </AnimateFadeIn>
        )}
      </div>

      {uploadedFile && (
        <AnimateEntrancePop>
          <div className='flex items-center gap-3 rounded-2xl border border-success-subtle bg-success-subtle/40 p-3'>
            <Icon
              className='text-success-main size-5'
              name='tabler:circle-check'
            />
            <div>
              <p className='text-success-main text-xs font-bold'>
                File Selected
              </p>
              <p className='text-success-main/70 text-[10px] font-medium'>
                {uploadedFile.name} • {uploadedColumns.length} columns •{' '}
                {rowCount} records
              </p>
            </div>
          </div>
        </AnimateEntrancePop>
      )}
    </AnimateFadeIn>
  )
}

async function extractHeadersAndData(
  file: File,
): Promise<{ headers: string[]; rowCount: number }> {
  const name = file.name.toLowerCase()

  const parseCsv = async (
    csvFileOrText: File | string,
  ): Promise<{ headers: string[]; rowCount: number }> => {
    return new Promise((resolve, reject) => {
      Papa.parse(csvFileOrText as any, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const fields = (results.meta?.fields ?? [])
            .map(normalizeHeader)
            .filter(Boolean)
          const rowCount = results.data.length // Count rows of data

          if (!fields.length) reject(new Error('No header row found in CSV.'))
          else resolve({ headers: fields, rowCount })
        },
        error: (err) => reject(err),
      })
    })
  }

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
      const rowCount = rows.length - 1 // Subtract 1 to exclude header row

      return { headers, rowCount }
    } catch {
      const text = await file.text()
      return parseCsv(text)
    }
  }
  throw new Error('Unsupported file type.')
}

function normalizeHeader(h: unknown) {
  return String(h ?? '')
    .trim()
    .replace(/\s+/g, ' ')
}
