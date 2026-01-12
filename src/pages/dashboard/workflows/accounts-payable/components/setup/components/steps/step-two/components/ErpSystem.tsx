import { useRef } from 'react'
// import MondayLogo from '@/assets/brands/monday.svg'
// import OracleLogo from '@/assets/brands/oracle.svg'
import QuickBooksLogo from '@/assets/brands/quickbooks.svg'
// import SapLogo from '@/assets/brands/sap.svg'
// import XeroLogo from '@/assets/brands/xero.svg'
import Alert from '@/components/base/Alert'
import Button from '@/components/base/button/Button'
import Icon from '@/components/base/icon/Icon'
import InputSelect from '@/components/base/inputs/InputSelect'
import type { Option } from '@/types/option'
import {
  AnimateBounce,
  AnimateFadeIn,
  AnimateRotate,
  AnimateScale,
  AnimateSlideUp,
} from '@/components/common/animations'
import setupStore from '@/pages/dashboard/workflows/accounts-payable/stores/useSetupStore'
import BrandCard from '../../components/BrandCard'
import SectionHeader from '../../components/SectionHeader'
const items = [
  // { logo: SapLogo, name: 'SAP', value: 'SAP' },
  // { logo: OracleLogo, name: 'Oracle NetSuite', value: 'Oracle NetSuite' },
  {
    logo: QuickBooksLogo,
    name: 'QuickBooks',
    value: 'QuickBooks',
  },
  // { logo: MondayLogo, name: 'Monday.com', value: 'Monday.com' },
  // { logo: XeroLogo, name: 'Xero', value: 'Xero' },
]

const formOptions: Option[] = [
  { id: 1, name: 'ez-task' },
  { id: 2, name: 'ez-user' },
]

const ErpSystem = () => {
  // /  const emailSettings = setupStore((state) => state.emailSettings)
  const erpSettings = setupStore((state) => state.erpSettings)
  const setErpSettings = setupStore((state) => state.setErpSettings)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isFileBasedImportSelected = erpSettings.wantsFileBasedImport || erpSettings.system === 'FILE_BASED_IMPORT'
  const selectedOption = erpSettings.importMethod || 'upload' // 'upload' or 'import'

  const handleTemplateDownload = () => {
    // Create a simple CSV template
    const csvContent = 'Purchase Order Number,Vendor,Amount,Date,Status\nPO-001,Example Vendor,1000.00,2024-01-01,Pending'
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'PO_Master_Template.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setErpSettings({
        ...erpSettings,
        uploadedTemplate: file,
        templateUploaded: true,
        isConnected: true,
        wantsFileBasedImport: true,
        system: 'FILE_BASED_IMPORT',
        importMethod: 'upload',
      })
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFormSelect = (option: Option | null) => {
    if (option) {
      setErpSettings({
        ...erpSettings,
        selectedFormName: option.name,
        templateUploaded: false,
        isConnected: true,
        wantsFileBasedImport: true,
        system: 'FILE_BASED_IMPORT',
        importMethod: 'import',
      })
    }
  }

  const animationVariants = [
    AnimateSlideUp,
    AnimateScale,
    AnimateBounce,
    AnimateRotate,
    AnimateFadeIn,
  ]

  return (
    <div className='space-y-4'>
      {/* File-based Import Section */}
      <div>
        <AnimateSlideUp delay={0.1}>
          <SectionHeader
            description='Upload purchase orders (POs) directly from your local device. This file-based import feature is designed specifically for accounts payable agents to quickly import PO data.'
            title='PO Upload for AP Agent'
          />
        </AnimateSlideUp>

        {/* Two options: Upload PO and Import from your form */}
        <div className='mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3'>
          <AnimateSlideUp delay={0.15}>
            <button
              className={`flex w-full items-center gap-3 rounded-lg border-2 p-4 text-left transition-all ${selectedOption === 'upload' && isFileBasedImportSelected
                ? 'border-green-9 bg-green-1'
                : 'border-gray-4 bg-white hover:border-gray-5'
                }`}
              onClick={() => {
                setErpSettings({
                  ...erpSettings,
                  wantsFileBasedImport: true,
                  system: 'FILE_BASED_IMPORT',
                  importMethod: 'upload',
                  isConnected: erpSettings.templateUploaded || false,
                })
              }}
              type='button'
            >
              <div className='flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-2'>
                <Icon className='size-5 text-blue-9' name='tabler:upload' />
              </div>
              <div className='flex flex-1 flex-col'>
                <span className='text-14 font-semibold text-gray-13'>Direct Upload</span>
                <span className='text-12 text-gray-10'>Upload your PO file directly</span>
              </div>
              {selectedOption === 'upload' && isFileBasedImportSelected && (
                <div className='flex shrink-0 items-center justify-center'>
                  <Icon className='size-5 text-green-9' name='tabler:check' />
                </div>
              )}
            </button>
          </AnimateSlideUp>

          <AnimateSlideUp delay={0.18}>
            <button
              className={`flex w-full items-center gap-3 rounded-lg border-2 p-4 text-left transition-all ${selectedOption === 'import' && isFileBasedImportSelected
                ? 'border-green-9 bg-green-1'
                : 'border-gray-4 bg-white hover:border-gray-5'
                }`}
              onClick={() => {
                setErpSettings({
                  ...erpSettings,
                  wantsFileBasedImport: true,
                  system: 'FILE_BASED_IMPORT',
                  importMethod: 'import',
                  isConnected: erpSettings.selectedFormName ? true : false,
                })
              }}
              type='button'
            >
              <div className='flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-2'>
                <Icon className='size-5 text-primary-9' name='tabler:file-import' />
              </div>
              <div className='flex flex-1 flex-col'>
                <span className='text-14 font-semibold text-gray-13'>Import from your form</span>
                <span className='text-12 text-gray-10'>Import data from your existing form</span>
              </div>
              {selectedOption === 'import' && isFileBasedImportSelected && (
                <div className='flex shrink-0 items-center justify-center'>
                  <Icon className='size-5 text-green-9' name='tabler:check' />
                </div>
              )}
            </button>
          </AnimateSlideUp>
        </div>

        {/* Hidden file input */}
        <input
          accept='.csv,.xlsx,.xls'
          className='hidden'
          onChange={handleFileUpload}
          ref={fileInputRef}
          type='file'
          id='fileUploadInput'
        />

        {isFileBasedImportSelected && (
          <AnimateFadeIn delay={0.2}>
            <div className='mt-4 rounded-xl border border-gray-3 bg-surface p-6 shadow-sm'>
              {/* Header with icon and time estimate */}
              <div className='mb-4 flex items-center gap-2'>
                <div className='flex size-8 items-center justify-center rounded-full bg-primary-2'>
                  <Icon className='size-4 text-secondary-9' name={`${erpSettings.templateUploaded ? "tabler:file-description" : selectedOption === 'upload' ? "tabler:upload" : "tabler:file-import"}`} />
                </div>
                <span className='text-13 font-medium text-gray-11'>
                  {erpSettings.templateUploaded
                    ? 'PO uploaded'
                    : selectedOption === 'upload'
                      ? 'Upload your PO'
                      : 'Import from your form'}
                </span>
              </div>

              {/* Heading */}
              <h3 className='mb-3 text-16 font-semibold text-gray-13'>
                {erpSettings.templateUploaded && selectedOption === 'upload'
                  ? 'PO file uploaded successfully'
                  : selectedOption === 'upload'
                    ? 'Upload your file here'
                    : 'Import from your form'}
              </h3>

              {/* Description with inline download link */}
              {selectedOption === 'upload' ? (
                <>
                  <p className='mb-4 text-14 leading-relaxed text-gray-11'>
                    {erpSettings.templateUploaded
                      ? 'Your purchase order file has been uploaded. You can proceed to the next step or upload another file if needed.'
                      : 'If you don\'t have a file, download the PO template to get started. Then upload your completed file to import your purchase orders.'}{' '}
                    {!erpSettings.templateUploaded && (
                      <button
                        className='cursor-pointer text-primary-11 underline hover:text-primary-10 transition-colors'
                        onClick={handleTemplateDownload}
                        type='button'
                      >
                        Download the PO template
                      </button>
                    )}
                  </p>

                  {/* Upload button with file type restriction */}
                  <div className='mb-4 flex justify-start'>
                    <Button
                      icon='tabler:upload'
                      label={erpSettings.templateUploaded ? 'Upload another PO file' : 'Upload your PO'}
                      onClick={handleUploadClick}
                      size='sm'
                    />
                  </div>

                  {/* Visual cue for accepted file types */}
                  <p className='text-12 text-gray-8'>
                    <strong>Accepted file types:</strong> CSV, XLSX
                  </p>
                </>
              ) : (
                <>
                  <p className='mb-4 text-14 leading-relaxed text-gray-11'>
                    {erpSettings.selectedFormName
                      ? `You have selected "${erpSettings.selectedFormName}" form. You can proceed to the next step or select a different form if needed.`
                      : 'Select a form from the dropdown below to import purchase order data from your existing form.'}
                  </p>

                  {/* Form selection dropdown */}
                  <div className='mb-4 flex justify-start'>
                    <div className='w-full max-w-xs'>
                      <InputSelect
                        label='Select Form'
                        options={formOptions}
                        value={erpSettings.selectedFormName ? formOptions.find(f => f.name === erpSettings.selectedFormName) || null : null}
                        onChange={handleFormSelect}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Success message */}
              {selectedOption === 'upload' && erpSettings.templateUploaded && (
                <div className='mt-4'>
                  <Alert
                    text="Upload received — we'll generate your onboarding overview from the data in this file."
                    variant='green'
                  />
                </div>
              )}

              {/* Uploaded file name */}
              {selectedOption === 'upload' && erpSettings.uploadedTemplate && (
                <div className='mt-3 flex items-center gap-2 text-14 text-gray-11'>
                  <Icon className='size-4' name='tabler:file-check' />
                  <span className='font-medium'>{erpSettings.uploadedTemplate.name}</span>
                </div>
              )}

              {/* Selected form name */}
              {selectedOption === 'import' && erpSettings.selectedFormName && (
                <div className='mt-4'>
                  <Alert
                    text={`Form "${erpSettings.selectedFormName}" selected — we'll generate your onboarding overview from the data in this form.`}
                    variant='green'
                  />
                </div>
              )}
            </div>
          </AnimateFadeIn>
        )}

      </div>

      {/* Divider with (OR) */}
      <div className='flex items-center gap-4'>
        <div className='flex-1 border-t border-gray-3'></div>
        <span className='text-13 font-medium text-gray-10'>(OR)</span>
        <div className='flex-1 border-t border-gray-3'></div>
      </div>

      {/* ERP Integration Section */}
      <div>
        <AnimateSlideUp delay={0.2}>
          <SectionHeader
            description='Connect your ERP provider to synchronize invoices and payments seamlessly.'
            title='ERP Integration'
          />
        </AnimateSlideUp>
        <div className='grid grid-cols-1 gap-2.5 sm:grid-cols-1'>
          {items.map((item, index) => {
            const AnimationComponent = animationVariants[index % animationVariants.length]
            return (
              <AnimationComponent
                key={item.value}
                delay={0.25 + index * 0.08}
              >
                <BrandCard
                  checked={erpSettings.system === item.value && !isFileBasedImportSelected}
                  logo={item.logo}
                  name={item.name}
                  value={item.value}
                  onClick={() =>
                    setErpSettings({
                      ...erpSettings,
                      wantsFileBasedImport: false,
                      isConnected: false,
                      system: item.value,
                    })
                  }
                />
              </AnimationComponent>
            )
          })}
        </div>
      </div>
    </div>
  )
}

ErpSystem.displayName = 'ErpSystem'
export default ErpSystem