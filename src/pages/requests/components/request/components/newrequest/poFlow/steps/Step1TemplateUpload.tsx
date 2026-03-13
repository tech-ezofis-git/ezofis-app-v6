import { motion } from 'framer-motion'
import Papa from 'papaparse'
import { useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import Alert from '@/components/base/Alert'
import Icon from '@/components/base/icon/Icon'
import showToast from '@/components/base/toast/showToast'
import {
  AnimateEntrancePop,
  AnimateFadeIn,
  AnimateScale,
  AnimateSlideUp,
  AnimateStagger,
} from '@/components/common/animations'
import type { UploadState } from '../PoSetupFlowPage'
import authUserStore from '../../../../../../../../stores/authUserStore'
import { downloadTemplate, PO_ACCEPT } from '../../utils'

type Props = {
  rowCount: number | null
  uploadedColumns: string[]
  uploadedFile: File | null
  uploadState: UploadState
  onCancel: () => void
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
  onCancel,
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
      <AnimateSlideUp className='rounded-2xl border border-[var(--gray-4)] bg-[var(--gray-0)] p-6 shadow-sm'>
        {/* Header Section */}
        <div className='mb-2 flex items-start justify-between'>
          <AnimateEntrancePop className='p-0'>
            <h3 className='pb-2 text-lg font-semibold text-[var(--gray-13)]'>
              Upload Purchase Order
            </h3>
            <p className='text-12 text-[var(--gray-11)]'>
              Please upload your PO data file (CSV or XLSX) to begin the
              configuration.
            </p>
          </AnimateEntrancePop>

          <button
            className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--gray-4)] bg-transparent px-3 py-1.5 text-xs font-medium text-[var(--gray-11)] transition-all ${isDownloading ? 'cursor-not-allowed opacity-70' : 'hover:bg-[var(--gray-2)] hover:text-[var(--gray-13)]'}`}
            disabled={isDownloading}
            onClick={handleDownload}
          >
            {isDownloading ? (
              <span className='size-3 animate-spin rounded-full border-2 border-[var(--gray-11)] border-t-transparent' />
            ) : (
              <Icon className='size-3.5' name='tabler:download' />
            )}
            {isDownloading ? 'Preparing...' : 'Download Template'}
          </button>
        </div>

        {/* Upload Zone */}
        <AnimateScale>
          <div
            className={[
              'group relative h-[240px] w-full rounded-3xl border-2 border-dashed transition-all duration-300',
              'flex cursor-pointer flex-col items-center justify-center gap-4 p-8',
              isDragOver
                ? 'scale-[1.01] border-[var(--primary-9)] bg-[var(--primary-2)]'
                : 'border-[var(--gray-4)] bg-[var(--gray-1)] hover:border-[var(--primary-7)] hover:bg-[var(--primary-1)]',
            ].join(' ')}
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
            <AnimateStagger className='flex items-center gap-4'>
              <div className='flex size-14 items-center justify-center rounded-2xl bg-[var(--primary-3)] text-[var(--primary-9)] shadow-sm'>
                <Icon className='size-7' name='tabler:file-upload' />
              </div>
            </AnimateStagger>

            <div className='text-center'>
              <div className='text-18 font-medium text-[var(--gray-12)]'>
                Drop your PO file here, or{' '}
                <span className='text-[var(--primary-9)]'>browse</span>
              </div>
              <div className='mt-1 text-13 text-[var(--gray-10)]'>
                Accepted formats:{' '}
                <span className='font-semibold uppercase'>CSV, XLSX</span>
              </div>
            </div>

            {/* File Type Icons */}
            <div className='flex gap-2'>
              <div className='text-10 flex items-center gap-1 rounded-md bg-[var(--green-4)] px-2 py-1 font-bold text-[var(--green-11)]'>
                <Icon
                  className='size-7 text-green-11'
                  name='tabler:file-type-csv'
                />
              </div>
              <div className='text-10 flex items-center gap-1 rounded-md bg-[var(--blue-4)] px-2 py-1 font-bold text-[var(--blue-11)]'>
                <Icon
                  className='size-7 text-blue-11'
                  name='tabler:file-type-xls'
                />
              </div>
            </div>

            <input
              accept={PO_ACCEPT}
              className='hidden'
              ref={fileInputRef}
              type='file'
              onChange={(e) => onFileChange(e.target.files?.[0])}
            />

            {/* Parsing Overlay */}
            {uploadState === 'parsing' && (
              <AnimateFadeIn className='absolute inset-0 z-10 flex items-center justify-center rounded-3xl bg-[var(--gray-0)]/80 backdrop-blur-sm'>
                <div className='flex flex-col items-center gap-3'>
                  <span className='size-10 animate-spin rounded-full border-4 border-[var(--primary-9)] border-t-transparent' />
                  <motion.span
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    className='text-14 font-medium text-[var(--primary-11)]'
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    Analyzing Columns...{' '}
                  </motion.span>
                </div>
              </AnimateFadeIn>
            )}
          </div>
        </AnimateScale>

        {uploadedFile && (
          <AnimateEntrancePop className='mt-6'>
            <Alert
              text={`Selected File: ${uploadedFile.name} (${uploadedColumns.length} columns and ${rowCount} data records are detected)`}
              variant='green'
            />
          </AnimateEntrancePop>
        )}

        <footer className='flex items-center justify-between pt-6'>
          <button
            className='group inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--gray-4)] bg-[var(--gray-0)] px-2 py-2 text-12 font-semibold text-[var(--gray-12)] transition-colors hover:bg-[var(--gray-1)]'
            onClick={onCancel}
          >
            <Icon
              className='size-5 transition-transform group-hover:-translate-x-1'
              name='tabler:chevron-left'
            />
            Cancel
          </button>
          <button
            className={`group flex items-center gap-2 rounded-xl bg-[var(--primary-11)] px-2.5 py-2.5 text-12 font-bold text-white shadow-sm transition-all duration-200 ${uploadState !== 'ready' ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-[var(--primary-10)] hover:shadow-md active:scale-95'} `}
            disabled={uploadState !== 'ready'}
            onClick={onNext}
          >
            {uploadState === 'parsing' ? 'Processing...' : 'Continue'}
            <Icon
              name='tabler:chevron-right'
              className={`size-5 transition-transform duration-300 ${
                uploadState === 'ready'
                  ? 'group-hover:translate-x-1'
                  : 'opacity-50'
              }`}
            />
          </button>
        </footer>
      </AnimateSlideUp>
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
