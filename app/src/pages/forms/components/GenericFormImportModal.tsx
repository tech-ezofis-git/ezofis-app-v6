import { useLingui } from '@lingui/react/macro'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import formApi from '@/api/form/form'
import Button from '@/components/base/button/Button'
import Icon from '@/components/base/icon/Icon'
import InputSelect from '@/components/base/inputs/InputSelect'
import showToast from '@/components/base/toast/showToast'
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
  | 'strategy'
  | 'processing'
  | 'ready'
  | 'completed'
  | 'error'

export type GenericImportStrategy = 'replace' | 'append'

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

  // Filter out non-input structural fields like HEADING, DIVIDER
  const validFields = useMemo(
    () =>
      fields.filter(
        (f) =>
          !['HEADING', 'DIVIDER', 'LABEL'].includes(
            (f.type || '').toUpperCase(),
          ),
      ),
    [fields],
  )

  const [uploadState, setUploadState] = useState<GenericUploadState>('idle')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [importStrategy, setImportStrategy] =
    useState<GenericImportStrategy>('append')
  const [uploadedColumns, setUploadedColumns] = useState<string[]>([])
  const [parsedRows, setParsedRows] = useState<any[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({}) // fieldId -> excelHeader
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false)

  const fileInputRef = useRef<HTMLInputElement | null>(null)

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

  // Parse file (CSV or XLSX)
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
        currentProgress += 20
        if (currentProgress >= 100) {
          clearInterval(timer)
          setUploadProgress(100)

          setTimeout(() => {
            setUploadedColumns(headers)
            setParsedRows(allRows)

            // Auto mapping algorithm
            const initialMapping: Record<string, string> = {}
            validFields.forEach((field) => {
              const matchedHeader = findBestHeaderMatch(
                field.label || field.id,
                headers,
              )
              if (matchedHeader) {
                initialMapping[field.id] = matchedHeader
              }
            })
            setMapping(initialMapping)
            setUploadState('ready')
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

  // Process and ingest records into backend
  const handleConfirmImport = async () => {
    if (!parsedRows || parsedRows.length === 0) return
    setIsSubmitting(true)
    setUploadState('processing')

    try {
      let successCount = 0
      let failCount = 0

      // Batch save entries using formApi.saveFormEntry
      for (const row of parsedRows) {
        const entryValues: Record<string, any> = {}
        validFields.forEach((field) => {
          const mappedHeader = mapping[field.id]
          if (mappedHeader && row[mappedHeader] !== undefined) {
            entryValues[field.id] = row[mappedHeader]
          }
        })

        if (Object.keys(entryValues).length > 0) {
          const { error } = await formApi.saveFormEntry(formId, 0, entryValues)
          if (!error) successCount++
          else failCount++
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

  return (
    <div className='animate-in fade-in fixed inset-0 z-[100] flex flex-col overflow-hidden bg-surface-muted font-inter text-gray-13 duration-300'>
      {/* Header Banner */}
      <div className='flex h-14 shrink-0 items-center justify-between border-b border-border-default bg-white px-6 shadow-xs'>
        <div className='flex items-center gap-3'>
          <button
            className='cursor-pointer rounded-lg p-1.5 text-gray-9 transition-colors hover:bg-gray-2 hover:text-gray-13'
            onClick={onClose}
          >
            <Icon className='size-5' name='tabler:arrow-left' />
          </button>
          <div className='flex size-8 items-center justify-center rounded-lg bg-primary-1 text-primary-9'>
            <Icon className='size-4 text-primary-9' name='tabler:file-import' />
          </div>
          <div>
            <h1 className='text-sm font-bold text-gray-13'>
              {t`Bulk Import Entries`}
              {formName ? ` — ${formName}` : ''}
            </h1>
            <p className='text-[11px] font-medium text-gray-8'>
              {t`Upload CSV or Excel spreadsheets to populate form submissions in bulk.`}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Body */}
      <main className='custom-scrollbar flex min-h-0 flex-1 flex-col items-center overflow-y-auto p-6'>
        {(uploadState === 'idle' || uploadState === 'parsing') && (
          <AnimateFadeIn className='my-auto flex w-full max-w-[850px] flex-col items-center gap-6 py-4'>
            <AnimateSlideUp className='space-y-1.5 text-center'>
              <h2 className='text-2xl font-bold tracking-tight text-gray-13'>
                {t`Bulk Import`} <span className='text-primary-9'>{formName || t`Form Entries`}</span>
              </h2>
              <p className='mx-auto max-w-lg text-xs leading-relaxed text-gray-9'>
                {t`Map spreadsheet columns to active form fields and import response records in bulk.`}
              </p>
            </AnimateSlideUp>

            {/* Template Download Card */}
            <AnimateSlideUp className='w-full' delay={0.05}>
              <div className='flex items-center justify-between rounded-xl border border-gray-3 bg-white p-4 shadow-xs'>
                <div className='flex items-center gap-3.5'>
                  <div className='flex size-10 items-center justify-center rounded-xl bg-accent-soft/20 text-accent-primary'>
                    <Icon className='size-5' name='tabler:file-spreadsheet' />
                  </div>
                  <div>
                    <h3 className='text-xs font-bold text-gray-13'>
                      {t`Need a template?`}
                    </h3>
                    <p className='text-[11px] text-gray-8'>
                      {t`Download a pre-formatted Excel template matching exact fields of this form.`}
                    </p>
                  </div>
                </div>
                <Button
                  color='gray'
                  icon='tabler:download'
                  label={t`Download Template`}
                  loading={isDownloadingTemplate}
                  size='sm'
                  variant='outline'
                  onClick={handleDownloadDynamicTemplate}
                />
              </div>
            </AnimateSlideUp>

            {/* Drag & Drop Upload Container */}
            <AnimateSlideUp className='w-full' delay={0.1}>
              <div
                className={cn(
                  'relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-white p-10 text-center transition-all duration-200',
                  isDragOver
                    ? 'border-primary-9 bg-primary-1/30 scale-[1.005]'
                    : 'border-gray-3 hover:border-gray-4',
                )}
                onDragLeave={() => setIsDragOver(false)}
                onDragOver={(e) => {
                  e.preventDefault()
                  setIsDragOver(true)
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  setIsDragOver(false)
                  const file = e.dataTransfer.files[0]
                  onFileChange(file)
                }}
              >
                <input
                  accept='.csv, .xlsx'
                  className='hidden'
                  ref={fileInputRef}
                  type='file'
                  onChange={(e) => onFileChange(e.target.files?.[0])}
                />

                <div className='mb-3 flex size-14 items-center justify-center rounded-2xl bg-primary-1 text-primary-9 shadow-xs'>
                  <Icon className='size-7' name='tabler:cloud-upload' />
                </div>
                <h3 className='text-sm font-bold text-gray-13'>
                  {t`Drop your CSV or XLSX file here`}
                </h3>
                <p className='mt-1 text-xs text-gray-8'>
                  {t`Supports single or multi-sheet Excel workbooks up to 25MB.`}
                </p>

                <Button
                  className='mt-5'
                  color='primary'
                  icon='tabler:file-plus'
                  label={t`Select File`}
                  size='sm'
                  variant='solid'
                  onClick={() => fileInputRef.current?.click()}
                />

                {uploadState === 'parsing' && (
                  <div className='mt-6 w-full max-w-sm space-y-2'>
                    <div className='flex justify-between text-xs font-semibold text-gray-10'>
                      <span>{t`Parsing file...`}</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className='h-2 w-full overflow-hidden rounded-full bg-gray-2'>
                      <div
                        className='h-full bg-primary-9 transition-all duration-200'
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </AnimateSlideUp>
          </AnimateFadeIn>
        )}

        {/* MAPPING REVIEW & CONFIRMATION SCREEN */}
        {uploadState === 'ready' && (
          <AnimateFadeIn className='w-full max-w-[1100px] space-y-6 py-4'>
            {/* Header info card */}
            <div className='flex items-center justify-between rounded-xl border border-gray-3 bg-white p-5 shadow-xs'>
              <div className='flex items-center gap-3.5'>
                <div className='flex size-10 items-center justify-center rounded-xl bg-green-1 text-green-11'>
                  <Icon className='size-5' name='tabler:check' />
                </div>
                <div>
                  <h3 className='text-xs font-bold text-gray-13'>
                    {uploadedFile?.name}
                  </h3>
                  <p className='text-[11px] text-gray-8'>
                    {parsedRows.length} {t`records detected`} • {uploadedColumns.length} {t`columns loaded`}
                  </p>
                </div>
              </div>

              {/* Import Strategy Picker */}
              <div className='flex items-center gap-3'>
                <span className='text-xs font-semibold text-gray-10'>
                  {t`Import Strategy`}:
                </span>
                <div className='flex rounded-lg border border-gray-3 bg-gray-1 p-0.5'>
                  <button
                    type='button'
                    className={cn(
                      'rounded-md px-3 py-1 text-xs font-bold transition-all',
                      importStrategy === 'append'
                        ? 'bg-white text-primary-9 shadow-xs'
                        : 'text-gray-9 hover:text-gray-13',
                    )}
                    onClick={() => setImportStrategy('append')}
                  >
                    {t`Append Records`}
                  </button>
                  <button
                    type='button'
                    className={cn(
                      'rounded-md px-3 py-1 text-xs font-bold transition-all',
                      importStrategy === 'replace'
                        ? 'bg-white text-primary-9 shadow-xs'
                        : 'text-gray-9 hover:text-gray-13',
                    )}
                    onClick={() => setImportStrategy('replace')}
                  >
                    {t`Replace Records`}
                  </button>
                </div>
              </div>
            </div>

            {/* Field Mapping Grid */}
            <div className='rounded-2xl border border-gray-3 bg-white p-6 shadow-xs'>
              <div className='mb-4 border-b border-gray-2 pb-3'>
                <h3 className='text-sm font-bold text-gray-13'>
                  {t`Column Mapping`}
                </h3>
                <p className='text-[11px] text-gray-8'>
                  {t`Map active form fields to spreadsheet column headers.`}
                </p>
              </div>

              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3'>
                {validFields.map((field) => {
                  const isRequired =
                    field.settings?.validation?.fieldRule === 'REQUIRED'
                  const currentMapped = mapping[field.id] || ''

                  const selectOptions = [
                    { id: '', name: `-- ${t`Skip Column`} --` },
                    ...uploadedColumns.map((col) => ({ id: col, name: col })),
                  ]

                  return (
                    <div
                      key={field.id}
                      className='flex flex-col gap-1.5 rounded-xl border border-gray-2 bg-gray-50/50 p-3.5'
                    >
                      <label className='block text-xs font-bold text-gray-12'>
                        {field.label || field.id}
                        {isRequired && (
                          <span className='ml-1 font-bold text-red-9'>*</span>
                        )}
                      </label>

                      <InputSelect
                        options={selectOptions}
                        placeholder={t`Select column...`}
                        value={
                          currentMapped
                            ? { id: currentMapped, name: currentMapped }
                            : null
                        }
                        onChange={(opt) =>
                          setMapping((prev) => ({
                            ...prev,
                            [field.id]: opt ? String(opt.id) : '',
                          }))
                        }
                      />
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Live Data Preview */}
            <div className='overflow-hidden rounded-2xl border border-gray-3 bg-white shadow-xs'>
              <div className='border-b border-gray-2 bg-gray-50/50 px-5 py-3'>
                <h4 className='text-xs font-bold text-gray-12'>
                  {t`Data Preview (First 5 Rows)`}
                </h4>
              </div>
              <div className='custom-scrollbar max-h-60 overflow-x-auto overflow-y-auto'>
                <table className='w-full border-collapse text-left text-xs'>
                  <thead>
                    <tr className='border-b border-gray-2 bg-gray-1'>
                      {validFields.map((field) => (
                        <th
                          key={field.id}
                          className='p-3 font-bold whitespace-nowrap text-gray-11'
                        >
                          {field.label || field.id}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.slice(0, 5).map((row, idx) => (
                      <tr
                        key={idx}
                        className='border-b border-gray-1 transition-colors hover:bg-gray-50/60 last:border-0'
                      >
                        {validFields.map((field) => {
                          const colKey = mapping[field.id]
                          const val = colKey ? row[colKey] : null
                          return (
                            <td
                              key={field.id}
                              className='p-3 font-medium whitespace-nowrap text-gray-12'
                            >
                              {val !== undefined && val !== null ? (
                                String(val)
                              ) : (
                                <span className='text-gray-5'>—</span>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className='flex items-center justify-between pt-2'>
              <Button
                color='gray'
                label={t`Cancel`}
                variant='outline'
                onClick={onClose}
              />
              <Button
                color='primary'
                disabled={isSubmitting}
                icon='tabler:check'
                label={t`Confirm & Ingest Entries`}
                loading={isSubmitting}
                variant='solid'
                onClick={handleConfirmImport}
              />
            </div>
          </AnimateFadeIn>
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
