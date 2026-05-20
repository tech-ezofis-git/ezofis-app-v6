import { useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import folderApi from '@/api/folders/folders'
import Button from '@/components/base/button/Button'
import Icon from '@/components/base/icon/Icon'
import showToast from '@/components/base/toast/showToast'
import requestStore from '@/pages/requests/stores/useRequestStore'
import cn from '@/utils/cn'
import Step1TemplateUpload from './steps/Step1TemplateUpload'
import Step2ColumnMapping from './steps/Step2ColumnMapping'
import Step3PreviewConfirm from './steps/Step3PreviewConfirm'
import { SYSTEM_TEMPLATE_COLUMNS } from './utils/templateSchema'

export type UploadState = 'idle' | 'uploading' | 'parsing' | 'ready' | 'error'

type Props = {
  // onExit: () => void;
  onClose: () => void
}

export default function PoSetupFlowPage({}: Props) {
  const { closeNewRequest } = requestStore((state) => state)
  const [activeStep, setActiveStep] = useState<0 | 1 | 2>(0)

  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [uploadedColumns, setUploadedColumns] = useState<string[]>([])
  const [rowCount, setRowCount] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const systemColumns = useMemo(() => SYSTEM_TEMPLATE_COLUMNS, [])

  const [mapping, setMapping] = useState<Record<string, string>>({})
  // const [errors, setErrors] = useState<string[]>([]);
  // const [warnings, setWarnings] = useState<string[]>([]);

  const canGoToStep = (step: number) => {
    // Always allow going backwards
    if (step <= activeStep) return true

    // Gate forward navigation:
    // Step 1 -> Step 2 requires columns extracted
    if (step === 1) return uploadedColumns.length > 0

    // Step 2 -> Step 3 requires mapping exists (basic, you can tighten later)
    if (step === 2)
      return uploadedColumns.length > 0 && Object.keys(mapping).length > 0

    return false
  }

  // Function to update the uploaded file with mapped headers
  const updateFileHeaders = async (
    file: File,
    mapping: Record<string, string>,
  ) => {
    const fileName = file.name
    const fileExtension = fileName.split('.').pop()?.toLowerCase()

    return new Promise<File>((resolve, reject) => {
      // Handle CSV files
      if (fileExtension === 'csv') {
        const reader = new FileReader()
        reader.onload = (event) => {
          if (event.target?.result) {
            const csvData = event.target.result as string
            const lines = csvData.split('\n')
            const headers = lines[0].split(',')

            // Update headers based on the mapping
            const updatedHeaders = headers.map(
              (header) => mapping[header.trim()] || header,
            )
            lines[0] = updatedHeaders.join(',')

            // Re-create the updated CSV file
            const updatedCsv = new Blob([lines.join('\n')], {
              type: 'text/csv',
            })
            resolve(new File([updatedCsv], fileName, { type: 'text/csv' }))
          }
        }
        reader.onerror = (error) => reject(error)
        reader.readAsText(file)
      }

      // Handle XLSX files
      else if (fileExtension === 'xlsx') {
        const reader = new FileReader()
        reader.onload = (event) => {
          if (event.target?.result) {
            const data = event.target.result as ArrayBuffer
            const wb = XLSX.read(data, { type: 'array' })
            const sheet = wb.Sheets[wb.SheetNames[0]]
            const rows: any = XLSX.utils.sheet_to_json(sheet, { header: 1 })

            // Update headers based on the mapping
            const updatedHeaders = rows[0].map(
              (header: string) => mapping[header.trim()] || header,
            )
            rows[0] = updatedHeaders

            // Create a new workbook with updated headers
            const updatedSheet = XLSX.utils.aoa_to_sheet(rows)
            const updatedWb = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(updatedWb, updatedSheet, 'Sheet1')

            // Convert the workbook back to a Blob
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
      }
    })
  }
  const sendUpdatedFile = async (file: File) => {
    const payload = {
      file: file,
      formId: 3,
    }

    try {
      const { data, error } = await folderApi.uploadMasterFile(payload)
      if (data) {
        showToast({
          message: 'PO data file uploaded successfully',
          variant: 'success',
        })
      }

      if (error) {
        showToast({ message: 'Error uploading file', variant: 'error' })
      }
    } catch (error) {
      showToast({ message: 'Error uploading file', variant: 'error' })
      console.error(error)
    } finally {
      closeNewRequest()
    }
  }

  const handleConfirmMapping = async () => {
    try {
      // Update the file headers with the mapped master field names
      const updatedFile = await updateFileHeaders(uploadedFile as File, mapping)

      // Send the updated file to the server
      await sendUpdatedFile(updatedFile)
    } catch (error) {
      showToast({ message: 'Error processing file', variant: 'error' })
    }
  }

  const handlePoUpload = async () => {
    setIsSubmitting(true)
    try {
      await handleConfirmMapping()
    } catch (error) {
      showToast({ message: 'Error uploading file', variant: 'error' })
      console.error(error)
    } finally {
      setUploadState('idle')
      setIsSubmitting(false)
    }
  }

  return (
    <div className='flex h-[calc(100vh-110px)] items-center justify-center overflow-hidden bg-surface-secondary p-4 text-gray-13'>
      <div className='flex max-h-full w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-gray-3 bg-surface-primary shadow-2xl'>
        {/* Header Section */}
        <header className='flex shrink-0 items-center gap-4 px-6 pt-6 pb-4'>
          <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-9 shadow-lg shadow-primary-9/20'>
            <Icon className='text-xl text-white' name='tabler:settings' />
          </div>
          <div>
            <h1 className='text-lg font-bold tracking-tight text-gray-13'>
              PO Configuration
            </h1>
            <p className='text-xs font-medium text-gray-11'>
              Configure PO inputs and mappings.
            </p>
          </div>
        </header>

        {/* Horizontal Stepper */}
        <div className='shrink-0 border-y border-gray-3 bg-surface-secondary/50 px-6 py-4'>
          <div className='relative mx-auto max-w-2xl px-4'>
            <div className='absolute top-5 left-0 z-0 h-0.5 w-full bg-gray-3'></div>
            <div
              className='absolute top-5 left-0 z-0 h-0.5 bg-secondary-9 transition-all duration-500'
              style={{ width: `${(activeStep / 2) * 100}%` }}
            />
            <div className='relative z-10 flex justify-between'>
              {[
                { label: 'Upload PO', step: 0 },
                { label: 'Column Mapping', step: 1 },
                { label: 'Review & Confirm', step: 2 },
              ].map((s) => (
                <div className='flex flex-col items-center' key={s.step}>
                  <div
                    className={cn(
                      'flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-sm font-bold ring-4 ring-surface-primary transition-all duration-300',
                      activeStep === s.step
                        ? 'bg-secondary-9 text-white shadow-lg shadow-secondary-9/40'
                        : activeStep > s.step
                          ? 'bg-secondary-9 text-white'
                          : 'border-2 border-gray-3 bg-surface-primary text-gray-10',
                    )}
                    onClick={() => {
                      if (canGoToStep(s.step))
                        setActiveStep(s.step as 0 | 1 | 2)
                    }}
                  >
                    {activeStep > s.step ? (
                      <Icon className='size-5' name='tabler:check' />
                    ) : (
                      s.step + 1
                    )}
                  </div>
                  <span
                    className={cn(
                      'mt-2 text-[10px] font-bold tracking-tight uppercase transition-colors duration-300',
                      activeStep >= s.step
                        ? 'text-secondary-11'
                        : 'text-gray-10',
                    )}
                  >
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <main className='custom-scrollbar flex-1 overflow-y-auto p-6'>
          {activeStep === 0 ? (
            <Step1TemplateUpload
              rowCount={rowCount}
              uploadedColumns={uploadedColumns}
              uploadedFile={uploadedFile}
              uploadState={uploadState}
              setRowCount={setRowCount}
              setUploadedColumns={setUploadedColumns}
              setUploadedFile={setUploadedFile}
              setUploadState={setUploadState}
              onNext={() => setActiveStep(1)}
            />
          ) : null}

          {activeStep === 1 ? (
            <Step2ColumnMapping
              mapping={mapping}
              systemColumns={systemColumns as any}
              uploadedColumns={uploadedColumns}
              setMapping={setMapping}
            />
          ) : null}

          {activeStep === 2 ? (
            <Step3PreviewConfirm
              mapping={mapping}
              systemColumns={systemColumns as any}
            />
          ) : null}
        </main>

        {/* Footer Section */}
        <footer className='flex shrink-0 items-center justify-between border-t border-gray-3 bg-surface-primary px-6 py-4'>
          <Button
            color='gray'
            icon='tabler:chevron-left'
            label='Cancel'
            size='lg'
            variant='outline'
            onClick={() => closeNewRequest()}
          />
          <div className='flex items-center gap-3'>
            {activeStep > 0 && (
              <Button
                color='gray'
                label='Back'
                size='lg'
                variant='outline'
                onClick={() => setActiveStep((prev) => (prev - 1) as any)}
              />
            )}
            <Button
              color='primary'
              loading={isSubmitting}
              size='lg'
              suffixIcon={activeStep < 2 ? 'tabler:arrow-right' : undefined}
              variant='solid'
              disabled={
                (!canGoToStep(activeStep + 1) && activeStep < 2) ||
                (activeStep === 2 && isSubmitting)
              }
              label={
                activeStep === 2
                  ? isSubmitting
                    ? 'Processing...'
                    : 'Confirm & Finish'
                  : 'Continue'
              }
              onClick={() => {
                if (activeStep < 2) {
                  setActiveStep((prev) => (prev + 1) as any)
                } else {
                  handlePoUpload()
                }
              }}
            />
          </div>
        </footer>
      </div>
    </div>
  )
}
