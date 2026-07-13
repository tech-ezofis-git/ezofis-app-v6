import { useRef, useState } from 'react'
// import MondayLogo from '@/assets/brands/monday.svg'
// import OracleLogo from '@/assets/brands/oracle.svg'
import QuickBooksLogo from '@/assets/brands/quickbooks.svg'
import poMasterUrl from '@/assets/PO Master.xlsx?url'
// import SapLogo from '@/assets/brands/sap.svg'
// import XeroLogo from '@/assets/brands/xero.svg'
import Alert from '@/components/base/Alert'
import Button from '@/components/base/button/Button'
import Icon from '@/components/base/icon/Icon'
import showToast from '@/components/base/toast/showToast'
import {
  AnimateBounce,
  AnimateFadeIn,
  AnimateRotate,
  AnimateScale,
  AnimateSlideUp,
} from '@/components/common/animations'
import Accordion from '@/components/base/accordion/Accordion'
import AccordionItem from '@/components/base/accordion/AccordionItem'
import ColumnMapping from '@/components/common/ColumnMapping'
import setupStore from '@/pages/dashboard/workflows/accounts-payable/stores/useSetupStore'
import { compareHeaderSimilarity } from '@/pages/requests/components/request/components/newrequest/poFlow/utils/headerSimilarity'
import { SYSTEM_TEMPLATE_COLUMNS } from '@/pages/requests/components/request/components/newrequest/poFlow/utils/templateSchema'
import { LINE_ITEM_TEMPLATE_COLUMNS } from '@/pages/requests/components/request/components/newrequest/poFlow/utils/lineItemSchema'
import { detectGroupingColumn } from '@/pages/requests/components/request/components/newrequest/poFlow/utils/lineItemHelpers'
import BrandCard from '../../components/BrandCard'
import SectionHeader from '../../components/SectionHeader'
import { OrDivider } from '../../components/StepLayout'
import { extractHeadersAndData } from '../utils/fileParser'

const items = [
  // { logo: SapLogo, name: 'SAP', value: 'SAP' },
  // { logo: OracleLogo, name: 'Oracle NetSuite', value: 'Oracle NetSuite' },
  {
    description:
      'Connect your QuickBooks account to sync PO and invoice data automatically.',
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
  const [isParsing, setIsParsing] = useState(false)

  const isFileBasedImportSelected = erpSettings.system === 'FILE_BASED_IMPORT'

  const handleDownloadPredefinedMaster = () => {
    const link = document.createElement('a')
    link.href = poMasterUrl
    link.download = 'PO Master.xlsx'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0]
    if (file) {
      setIsParsing(true)
      try {
        const { headers, previewRows, lineItemHeaders: liHeaders, lineItemRows: liRows } = await extractHeadersAndData(file)

        // Auto-suggest column mappings on upload
        const initialMapping: Record<string, string> = {}
        SYSTEM_TEMPLATE_COLUMNS.forEach((col) => {
          const match = headers.find((u) => compareHeaderSimilarity(u, col.key))
          if (match) {
            initialMapping[col.key] = match
          }
        })

        const hasLineItems = liHeaders && liHeaders.length > 0
        const detectedGroupCol = hasLineItems ? (detectGroupingColumn(liHeaders) || null) : null

        setErpSettings({
          ...erpSettings,
          importMethod: 'upload',
          isConnected: true,
          mapping: initialMapping,
          previewRows: previewRows,
          system: 'FILE_BASED_IMPORT',
          templateUploaded: true,
          uploadedColumns: headers,
          uploadedTemplate: file,
          wantsFileBasedImport: true,
          lineItemHeaders: hasLineItems ? liHeaders : [],
          lineItemRows: hasLineItems && liRows ? liRows : [],
          groupingColumn: detectedGroupCol,
          lineItemMapping: {},
        })

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        console.error(err)
        showToast({
          message:
            err.message ||
            'Failed to parse file. Please upload a valid CSV or Excel file.',
          variant: 'error',
        })
      } finally {
        setIsParsing(false)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }
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
    <div className='space-y-6'>
      {/* PO Master Data Section */}
      <div>
        <AnimateSlideUp delay={0.1}>
          <SectionHeader
            description='Import PO master records to validate invoices against approved purchase orders'
            title='PO Master Data'
          />
        </AnimateSlideUp>

        {/* Master Data Options */}
        <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
          <AnimateSlideUp delay={0.15}>
            <BrandCard
              checked={erpSettings.system === 'PREDEFINED'}
              description='Try the platform with sample invoices and records.'
              icon='tabler:database-search'
              name='Use demo data'
              value='PREDEFINED'
              onClick={() => {
                setErpSettings({
                  ...erpSettings,
                  importMethod: 'upload',
                  isConnected: true,
                  system: 'PREDEFINED',
                  wantsFileBasedImport: false,
                })
              }}
            />
          </AnimateSlideUp>
          <AnimateSlideUp delay={0.2}>
            <BrandCard
              checked={erpSettings.system === 'FILE_BASED_IMPORT'}
              description='Import your records via CSV or Excel.'
              icon='tabler:table-import'
              name='Upload PO master file'
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

        {erpSettings.system === 'PREDEFINED' && (
          <AnimateFadeIn delay={0.2}>
            <div className='mt-4 rounded-xl border border-gray-3 bg-surface p-5 shadow-sm md:p-6'>
              <h3 className='text-15/5 font-semibold text-gray-13'>
                PO Master File
              </h3>

              <p className='mt-1.5 mb-4 text-13/5.5 text-pretty text-gray-11'>
                Download the predefined PO Master Data template file to view
                reference records. Use this file to understand the default
                schema structure and sample values used for matching.
              </p>

              {/* Download button */}
              <div className='mb-4 flex justify-start'>
                <Button
                  icon='tabler:download'
                  label='Download PO Master Template'
                  size='sm'
                  onClick={handleDownloadPredefinedMaster}
                />
              </div>
            </div>
          </AnimateFadeIn>
        )}

        {isFileBasedImportSelected && (
          <>
            <AnimateFadeIn delay={0.2}>
              <div className='mt-4 rounded-xl border border-gray-3 bg-surface p-5 shadow-sm md:p-6'>
                <h3 className='text-15/5 font-semibold text-gray-13'>
                  {erpSettings.templateUploaded
                    ? 'PO Master file received'
                    : 'Upload Master Data'}
                </h3>

                <p className='mt-1.5 mb-4 text-13/5.5 text-pretty text-gray-11'>
                  {erpSettings.templateUploaded
                    ? 'Your PO Master records have been successfully uploaded. We will use this data to validate and match incoming invoices.'
                    : 'Upload your PO Master Data spreadsheet here.'}
                </p>

                {/* Uploaded file name */}
                {erpSettings.uploadedTemplate && (
                  <div className='mb-4 flex items-center gap-2 text-13/5 text-gray-12'>
                    <Icon
                      className='size-4 text-green-9'
                      name='tabler:file-check'
                    />
                    <span className='font-medium'>
                      {erpSettings.uploadedTemplate.name}
                    </span>
                  </div>
                )}

                {/* Upload button */}
                <div className='mb-4 flex justify-start'>
                  <Button
                    icon='tabler:upload'
                    size='sm'
                    loading={isParsing}
                    label={
                      erpSettings.templateUploaded
                        ? 'Replace Master Data'
                        : 'Upload Master File'
                    }
                    onClick={handleUploadClick}
                  />
                </div>

                {/* Visual cue for accepted file types */}
                <p className='text-12/4.5 text-gray-9'>
                  <span className='font-medium text-gray-11'>
                    Accepted file types:
                  </span>{' '}
                  Excel (.xlsx, .xls), CSV
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
              </div>
            </AnimateFadeIn>
            {erpSettings.templateUploaded && (
              <div className='flex flex-col gap-4 mt-2'>
                {erpSettings.lineItemHeaders && erpSettings.lineItemHeaders.length > 0 && !erpSettings.groupingColumn && (
                  <div className='flex items-center gap-2 rounded-lg border border-red-5 bg-red-1 px-4 py-3 text-sm text-red-11 shadow-sm'>
                    <Icon className='size-5' name='tabler:alert-triangle' />
                    <span className='font-medium'>
                      Line item missing error: PO Number column could not be matched.
                    </span>
                  </div>
                )}
                <Accordion multiple defaultValue={['header-mapping', 'line-item-mapping']}>
                  <AccordionItem value='header-mapping' label='Header Column Mapping'>
                    <div className="pt-2">
                      <ColumnMapping
                        key="header-mapping"
                        title='Header Mapping'
                        mapping={erpSettings.mapping || {}}
                        previewRows={erpSettings.previewRows || []}
                        showActionsRow={false}
                        uploadedColumns={erpSettings.uploadedColumns || []}
                        onChangeMapping={(m) =>
                          setErpSettings({
                            ...erpSettings,
                            mapping: m,
                          })
                        }
                      />
                    </div>
                  </AccordionItem>

                  {erpSettings.lineItemHeaders && erpSettings.lineItemHeaders.length > 0 && (
                    <AccordionItem value='line-item-mapping' label='Line Item Mapping'>
                      <div className="pt-2">
                        <ColumnMapping
                          key="line-item-mapping"
                          title='Line Item Mapping'
                          mapping={erpSettings.lineItemMapping || {}}
                          previewRows={erpSettings.lineItemRows || []}
                          showActionsRow={false}
                          uploadedColumns={erpSettings.lineItemHeaders || []}
                          templateSchema={LINE_ITEM_TEMPLATE_COLUMNS}
                          showGrouping={false}
                          autoScrollAndHighlight={false}
                          onChangeMapping={(m) =>
                            setErpSettings({
                              ...erpSettings,
                              lineItemMapping: m,
                            })
                          }
                        />
                      </div>
                    </AccordionItem>
                  )}
                </Accordion>
                <div className='flex justify-end gap-3 pt-2'>
                  <Button variant='outline' onClick={() => {
                    setErpSettings({ ...erpSettings, templateUploaded: false, uploadedTemplate: null })
                  }}>
                    Cancel Upload
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <OrDivider />

      {/* ERP Integration Section */}
      <div>
        <AnimateSlideUp delay={0.2}>
          <SectionHeader
            description='Connect your provider to automate data matching.'
            title='Direct Integration'
          />
        </AnimateSlideUp>
        <div className='grid grid-cols-1 gap-3'>
          {items.map((item, index) => {
            const AnimationComponent =
              animationVariants[index % animationVariants.length]
            return (
              <AnimationComponent delay={0.25 + index * 0.08} key={item.value}>
                <BrandCard
                  description={item.description}
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
