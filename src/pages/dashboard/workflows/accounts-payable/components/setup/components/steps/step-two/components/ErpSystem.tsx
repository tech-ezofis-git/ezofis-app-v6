import { motion } from 'motion/react'
import { useRef } from 'react'
// import MondayLogo from '@/assets/brands/monday.svg'
// import OracleLogo from '@/assets/brands/oracle.svg'
import QuickBooksLogo from '@/assets/brands/quickbooks.svg'
// import SapLogo from '@/assets/brands/sap.svg'
// import XeroLogo from '@/assets/brands/xero.svg'
import Alert from '@/components/base/Alert'
import Button from '@/components/base/button/Button'
import Icon from '@/components/base/icon/Icon'
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

const ErpSystem = () => {
  // /  const emailSettings = setupStore((state) => state.emailSettings)
  const erpSettings = setupStore((state) => state.erpSettings)
  const setErpSettings = setupStore((state) => state.setErpSettings)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isFileBasedImportSelected =
    erpSettings.wantsFileBasedImport ||
    erpSettings.system === 'FILE_BASED_IMPORT'

  const handleTemplateDownload = () => {
    // Create a simple CSV template
    const csvContent =
      'Purchase Order Number,Vendor,Amount,Date,Status\nPO-001,Example Vendor,1000.00,2024-01-01,Pending'
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
        importMethod: 'upload',
        isConnected: true,
        system: 'FILE_BASED_IMPORT',
        templateUploaded: true,
        uploadedTemplate: file,
        wantsFileBasedImport: true,
      })
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
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
      {/* PO Master Data Section */}
      <div>
        <AnimateSlideUp delay={0.1}>
          <SectionHeader
            description='Import your existing PO Master record to ensure accurate matching during processing. This allows the system to validate invoices against your pre-approved purchase orders.'
            title='PO Master Data'
            action={
              <motion.button
                className='group flex items-center gap-2 rounded-md border border-gray-3 bg-surface px-3 py-1.5 text-12 font-medium text-gray-11 transition-all hover:border-accent-primary hover:bg-accent-soft hover:text-accent-primary'
                title='Download PO Master template'
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleTemplateDownload}
              >
                <Icon
                  className='size-4 text-gray-10 group-hover:text-accent-primary'
                  name='tabler:download'
                />
                Master Template
              </motion.button>
            }
          />
        </AnimateSlideUp>

        {/* Quick Drop option */}
        <div className='mt-4'>
          <AnimateSlideUp delay={0.15}>
            <BrandCard
              checked={isFileBasedImportSelected}
              description='Quickly upload your PO Master Data file (Excel/CSV) from your device.'
              icon='tabler:table-import'
              name='Master Data Import'
              value='FILE_BASED_IMPORT'
              onClick={() => {
                setErpSettings({
                  ...erpSettings,
                  importMethod: 'upload',
                  isConnected: erpSettings.templateUploaded || false,
                  system: 'FILE_BASED_IMPORT',
                  wantsFileBasedImport: true,
                })
              }}
            />
          </AnimateSlideUp>
        </div>

        {/* Hidden file input */}
        <input
          accept='.csv,.xlsx,.xls'
          className='hidden'
          id='fileUploadInput'
          ref={fileInputRef}
          type='file'
          onChange={handleFileUpload}
        />

        {isFileBasedImportSelected && (
          <AnimateFadeIn delay={0.2}>
            <div className='mt-4 rounded-xl border border-gray-3 bg-surface p-6 shadow-sm'>
              {/* Heading */}
              <h3 className='mb-3 text-16 font-semibold text-gray-13'>
                {erpSettings.templateUploaded
                  ? 'PO Master file received'
                  : 'Upload Master Data'}
              </h3>

              {/* Description */}
              <p className='mb-4 text-14 leading-relaxed text-gray-11'>
                {erpSettings.templateUploaded
                  ? 'Your PO Master records have been successfully uploaded. We will use this data to validate and match incoming invoices.'
                  : 'Upload your PO Master Data spreadsheet here. Ensure your columns match the Master Template available in the section header.'}
              </p>

              {/* Upload button */}
              <div className='mb-4 flex justify-start'>
                <Button
                  icon='tabler:upload'
                  size='sm'
                  label={
                    erpSettings.templateUploaded
                      ? 'Replace Master Data'
                      : 'Upload Master File'
                  }
                  onClick={handleUploadClick}
                />
              </div>

              {/* Visual cue for accepted file types */}
              <p className='text-12 text-gray-8'>
                <strong>Accepted file types:</strong> Excel (.xlsx, .xls), CSV
              </p>

              {/* Success message */}
              {erpSettings.templateUploaded && (
                <div className='mt-4'>
                  <Alert
                    text='Master Data received — we are now processing the records to build your validation index.'
                    variant='green'
                  />
                </div>
              )}

              {/* Uploaded file name */}
              {erpSettings.uploadedTemplate && (
                <div className='mt-3 flex items-center gap-2 text-14 text-gray-11'>
                  <Icon className='size-4' name='tabler:file-check' />
                  <span className='font-medium'>
                    {erpSettings.uploadedTemplate.name}
                  </span>
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
            const AnimationComponent =
              animationVariants[index % animationVariants.length]
            return (
              <AnimationComponent delay={0.25 + index * 0.08} key={item.value}>
                <BrandCard
                  logo={item.logo}
                  name={item.name}
                  value={item.value}
                  checked={
                    erpSettings.system === item.value &&
                    !isFileBasedImportSelected
                  }
                  onClick={() =>
                    setErpSettings({
                      ...erpSettings,
                      isConnected: false,
                      system: item.value,
                      wantsFileBasedImport: false,
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
